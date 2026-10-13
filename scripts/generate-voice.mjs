#!/usr/bin/env node
// Generates the section narration mp3s in public/audio/ with the Vbee TTS
// Batch API (https://api-docs.vbee.vn/vbee-api/text-to-speech/batch-api).
//
//   VBEE_APP_ID=... VBEE_TOKEN=... node scripts/generate-voice.mjs [--force] [home-vi ...]
//
// Texts live in src/voice/scripts.json. src/voice/manifest.json records a hash
// of (text, voice, speed) per file, so only changed entries spend credits.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const API = 'https://api.vbee.vn/v1/tts';
export const DEFAULT_VOICE = 'c_daklak_male_nguyenhoangtin_education_vc';
// "Cole" (Vbee en-US male): the cloned voice is Vietnamese-only.
export const DEFAULT_VOICE_EN = 'en-US-Standard-D';
// Required by the API; we poll instead, so the callback only needs to exist.
export const DEFAULT_WEBHOOK = 'https://www.nguyenhoangtin.com/';

export function entryHash({ text, voice, speed }) {
  return createHash('sha256').update(JSON.stringify([text, voice, speed])).digest('hex').slice(0, 16);
}

/** Flattens scripts.json into [{ key: 'home-vi', section, lang, text }]. */
export function listEntries(scripts) {
  return Object.entries(scripts).flatMap(([section, langs]) =>
    Object.entries(langs).map(([lang, text]) => ({ key: `${section}-${lang}`, section, lang, text: text.trim() })),
  );
}

async function vbeeError(res) {
  let detail = '';
  try {
    const body = await res.json();
    detail = body?.error ? `${body.error.code}: ${body.error.message}` : JSON.stringify(body);
  } catch {
    detail = res.statusText;
  }
  return new Error(`Vbee HTTP ${res.status} ${detail}`);
}

/** Submits one async TTS request and polls until the audio is ready. Returns mp3 bytes. */
export async function synthesize(text, opts) {
  const { appId, token, voice, speed = 1, bitrate = 64, webhookUrl = DEFAULT_WEBHOOK } = opts;
  const fetchFn = opts.fetch ?? fetch;
  const sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const pollMs = opts.pollMs ?? 2000;
  const timeoutMs = opts.timeoutMs ?? 5 * 60_000;
  const headers = { Authorization: `Bearer ${token}`, 'App-Id': appId, 'Content-Type': 'application/json' };

  const res = await fetchFn(API, {
    method: 'POST',
    headers,
    body: JSON.stringify({ text, mode: 'async', voiceCode: voice, outputFormat: 'mp3', bitrate, speed, webhookUrl }),
  });
  if (!res.ok) throw await vbeeError(res);
  const { requestId } = await res.json();
  if (!requestId) throw new Error('Vbee response has no requestId');

  for (let waited = 0; ; waited += pollMs) {
    if (waited > timeoutMs) throw new Error(`Vbee request ${requestId} timed out`);
    await sleep(pollMs);
    const poll = await fetchFn(`${API}/requests/${requestId}`, { headers });
    if (!poll.ok) throw await vbeeError(poll);
    const body = await poll.json();
    if (body.status === 'COMPLETED' && body.audioLink) {
      // The link expires after 3 minutes, so download right away.
      const audio = await fetchFn(body.audioLink);
      if (!audio.ok) throw new Error(`Download failed: HTTP ${audio.status}`);
      return Buffer.from(await audio.arrayBuffer());
    }
    if (body.status && body.status !== 'PROCESSING') {
      throw new Error(`Vbee request ${requestId} ended with status ${body.status}`);
    }
  }
}

/**
 * Generates every entry whose hash differs from the manifest (or the ones in
 * `only`, or all with `force`). Writes <outDir>/<key>.mp3 and the manifest.
 */
export async function generate(opts) {
  const { scripts, voices, outDir, manifestPath, only = [], force = false, log = console.log } = opts;
  const speed = opts.speed ?? 1;
  let manifest = {};
  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch {
    /* first run */
  }

  const entries = listEntries(scripts).filter((e) => only.length === 0 || only.includes(e.key));
  const unknown = only.filter((k) => !entries.some((e) => e.key === k));
  if (unknown.length) throw new Error(`Unknown entries: ${unknown.join(', ')}`);

  await mkdir(outDir, { recursive: true });
  const generated = [];
  for (const entry of entries) {
    const voice = voices[entry.lang] ?? voices.default;
    const hash = entryHash({ text: entry.text, voice, speed });
    if (!force && manifest[entry.key]?.hash === hash) {
      log(`skip ${entry.key} (unchanged)`);
      continue;
    }
    log(`generate ${entry.key} with ${voice}`);
    const mp3 = await synthesize(entry.text, { ...opts, voice, speed });
    await writeFile(join(outDir, `${entry.key}.mp3`), mp3);
    manifest[entry.key] = { hash, voice, speed, bytes: mp3.length };
    // Save after each file so a later failure keeps the credits already spent.
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    generated.push(entry.key);
  }
  return generated;
}

async function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const { VBEE_APP_ID: appId, VBEE_TOKEN: token } = process.env;
  if (!appId || !token) {
    console.error('Set VBEE_APP_ID and VBEE_TOKEN (GitHub secrets in CI).');
    process.exit(1);
  }
  const args = process.argv.slice(2);
  const scripts = JSON.parse(await readFile(join(root, 'src/voice/scripts.json'), 'utf8'));
  const vi = process.env.VBEE_VOICE_VI || DEFAULT_VOICE;
  const generated = await generate({
    scripts,
    appId,
    token,
    voices: { vi, en: process.env.VBEE_VOICE_EN || DEFAULT_VOICE_EN },
    speed: Number(process.env.VBEE_SPEED) || 1,
    outDir: join(root, 'public/audio'),
    manifestPath: join(root, 'src/voice/manifest.json'),
    force: args.includes('--force'),
    only: args.filter((a) => !a.startsWith('--')),
  });
  console.log(generated.length ? `Generated: ${generated.join(', ')}` : 'Nothing to generate.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
