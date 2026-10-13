import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { API, generate, listEntries, synthesize } from './generate-voice.mjs';

const json = (body, status = 200) => new Response(JSON.stringify(body), { status });

/** Fake Vbee: each request PROCESSING once, then COMPLETED; audio = text bytes. */
function fakeVbee() {
  const calls = [];
  const jobs = new Map();
  const fetch = async (url, init = {}) => {
    calls.push({ url, init });
    if (url === API) {
      const body = JSON.parse(init.body);
      const id = `req-${jobs.size + 1}`;
      jobs.set(id, { text: body.text, polls: 0 });
      return json({ requestId: id, status: 'PROCESSING' });
    }
    if (url.startsWith(`${API}/requests/`)) {
      const job = jobs.get(url.split('/').pop());
      job.polls += 1;
      return job.polls < 2
        ? json({ requestId: 'x', status: 'PROCESSING' })
        : json({ requestId: 'x', status: 'COMPLETED', audioLink: `https://cdn.test/${encodeURIComponent(job.text)}` });
    }
    if (url.startsWith('https://cdn.test/')) {
      return new Response(decodeURIComponent(url.slice('https://cdn.test/'.length)));
    }
    throw new Error(`unexpected ${url}`);
  };
  return { fetch, calls };
}

const base = { appId: 'app', token: 'tok', sleep: async () => {}, log: () => {} };

test('listEntries flattens sections and languages', () => {
  assert.deepEqual(listEntries({ home: { vi: ' Xin chào ', en: 'Hi' } }), [
    { key: 'home-vi', section: 'home', lang: 'vi', text: 'Xin chào' },
    { key: 'home-en', section: 'home', lang: 'en', text: 'Hi' },
  ]);
});

test('synthesize sends the batch request, polls and downloads', async () => {
  const vbee = fakeVbee();
  const mp3 = await synthesize('Xin chào', { ...base, fetch: vbee.fetch, voice: 'my_voice' });
  assert.equal(mp3.toString(), 'Xin chào');
  const [submit] = vbee.calls;
  assert.equal(submit.init.method, 'POST');
  assert.equal(submit.init.headers.Authorization, 'Bearer tok');
  assert.equal(submit.init.headers['App-Id'], 'app');
  const body = JSON.parse(submit.init.body);
  assert.equal(body.mode, 'async');
  assert.equal(body.voiceCode, 'my_voice');
  assert.equal(body.outputFormat, 'mp3');
  assert.ok(body.webhookUrl, 'webhookUrl is required by the API');
});

test('synthesize surfaces Vbee errors', async () => {
  const fetch = async () => json({ error: { code: 'BAD_REQUEST', message: 'Không đủ credit' } }, 400);
  await assert.rejects(synthesize('x', { ...base, fetch, voice: 'v' }), /400 BAD_REQUEST: Không đủ credit/);
});

test('synthesize times out', async () => {
  const fetch = async (url) => (url === API ? json({ requestId: 'r' }) : json({ status: 'PROCESSING' }));
  await assert.rejects(synthesize('x', { ...base, fetch, voice: 'v', pollMs: 10, timeoutMs: 30 }), /timed out/);
});

test('generate writes files per language voice and skips unchanged entries', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'voice-'));
  const opts = {
    ...base,
    scripts: { home: { vi: 'Xin chào', en: 'Hi' } },
    voices: { vi: 'voice_vi', en: 'voice_en' },
    outDir: join(dir, 'audio'),
    manifestPath: join(dir, 'manifest.json'),
  };
  const first = fakeVbee();
  assert.deepEqual(await generate({ ...opts, fetch: first.fetch }), ['home-vi', 'home-en']);
  assert.equal(await readFile(join(dir, 'audio/home-en.mp3'), 'utf8'), 'Hi');
  const voicesUsed = first.calls.filter((c) => c.url === API).map((c) => JSON.parse(c.init.body).voiceCode);
  assert.deepEqual(voicesUsed, ['voice_vi', 'voice_en']);

  const second = fakeVbee();
  assert.deepEqual(await generate({ ...opts, fetch: second.fetch }), []);
  assert.equal(second.calls.length, 0, 'no credits spent when nothing changed');

  const third = fakeVbee();
  const changed = { ...opts, scripts: { home: { vi: 'Xin chào bạn', en: 'Hi' } } };
  assert.deepEqual(await generate({ ...changed, fetch: third.fetch }), ['home-vi']);

  const forced = fakeVbee();
  assert.deepEqual(await generate({ ...changed, fetch: forced.fetch, force: true, only: ['home-en'] }), ['home-en']);
  await assert.rejects(generate({ ...changed, fetch: forced.fetch, only: ['nope-vi'] }), /Unknown entries: nope-vi/);
});
