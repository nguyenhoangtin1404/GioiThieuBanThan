export const VOICE_SECTIONS = ['home', 'du-an', 'kinh-nghiem', 'lien-he'] as const;
type Section = (typeof VOICE_SECTIONS)[number];
type Lang = 'vi' | 'en';

const STORAGE_KEY = 'voice';
const MOBILE_THRESHOLD = 0.6;
const LABELS: Record<Lang, { on: string; off: string }> = {
  vi: { on: 'Bật giọng đọc', off: 'Tắt giọng đọc' },
  en: { on: 'Turn voice on', off: 'Turn voice off' }
};

export function voiceUrl(section: string, lang: string): string {
  return `/audio/${section}-${lang}.mp3`;
}

const currentLang = (): Lang => (document.documentElement.lang === 'en' ? 'en' : 'vi');
const isSection = (v: string | undefined): v is Section => !!v && (VOICE_SECTIONS as readonly string[]).includes(v);

function readPref(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === 'on'; } catch { return false; }
}
function writePref(on: boolean) {
  try { localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off'); } catch { /* storage unavailable */ }
}

/** Opt-in narration: plays /audio/<section>-<lang>.mp3 for the section in view. */
export function initVoice(): void {
  const sections = Array.from(document.querySelectorAll<HTMLElement>('#fullpage > .section[data-anchor]'));
  if (sections.length === 0) return;

  const audio = new Audio();
  audio.preload = 'none';
  let enabled = readPref();
  let current: Section | null = null;
  const narrated = new Set<Section>();

  const toggles = () => Array.from(document.querySelectorAll<HTMLButtonElement>('[data-voice-toggle]'));
  function render() {
    const label = LABELS[currentLang()][enabled ? 'off' : 'on'];
    toggles().forEach((btn) => {
      btn.setAttribute('aria-pressed', String(enabled));
      btn.setAttribute('aria-label', label);
      btn.title = label;
      btn.classList.toggle('is-playing', enabled && !audio.paused);
    });
  }

  function stop() {
    audio.pause();
    render();
  }

  // Browsers allow audio only after a click/key/touchend gesture. Until a
  // play() succeeds, the next such gesture (re)tries the section in view.
  const GESTURES = ['click', 'keydown', 'touchend'];
  let unlockArmed = false;
  function onGesture(e: Event) {
    // The toggle's own click is handled by the toggle handler.
    if (e.target instanceof Element && e.target.closest('[data-voice-toggle]')) return;
    if (!enabled) return;
    current = sectionInView();
    narrate(current);
  }
  function armUnlock() {
    if (unlockArmed) return;
    unlockArmed = true;
    GESTURES.forEach((t) => document.addEventListener(t, onGesture, true));
  }
  function disarmUnlock() {
    if (!unlockArmed) return;
    unlockArmed = false;
    GESTURES.forEach((t) => document.removeEventListener(t, onGesture, true));
  }

  function narrate(section: Section | null) {
    if (!enabled || !section || narrated.has(section)) return;
    audio.pause();
    audio.src = voiceUrl(section, currentLang());
    audio.play().then(() => {
      disarmUnlock();
      if (current !== section) { audio.pause(); return; } // a newer section took over
      narrated.add(section);
      render();
    }).catch((err: unknown) => {
      if (err instanceof DOMException && err.name === 'NotAllowedError') armUnlock(); // retry on a gesture
      else if (current === section) narrated.add(section); // missing/broken file: stay silent
      render();
    });
  }

  function setCurrent(section: Section | null) {
    if (section === current) return;
    stop(); // leaving a section always stops its narration
    current = section;
    narrate(section);
  }

  // Desktop fullpage: sections are stacked and the visible one has .active.
  const isMobileLayout = () => document.body.classList.contains('mobile-layout');
  const activeSection = (): Section | null => {
    const el = sections.find((s) => s.classList.contains('active'));
    return isSection(el?.dataset.anchor) ? el!.dataset.anchor as Section : null;
  };
  const mo = new MutationObserver(() => { if (!isMobileLayout()) setCurrent(activeSection()); });
  sections.forEach((s) => mo.observe(s, { attributes: true, attributeFilter: ['class'] }));

  // Mobile: sections scroll normally; "in view" = covers 60% of the viewport
  // (or of itself when shorter than the viewport).
  const ratios = new Map<HTMLElement, number>();
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const viewport = e.rootBounds?.height || window.innerHeight;
      const base = Math.min(e.boundingClientRect.height, viewport) || 1;
      ratios.set(e.target as HTMLElement, e.intersectionRect.height / base);
    });
    if (!isMobileLayout()) return;
    const best = [...ratios.entries()].filter(([, r]) => r >= MOBILE_THRESHOLD).sort((a, b) => b[1] - a[1])[0];
    if (best && isSection(best[0].dataset.anchor)) setCurrent(best[0].dataset.anchor as Section);
  }, { threshold: Array.from({ length: 11 }, (_, i) => i / 10) });
  sections.forEach((s) => io.observe(s));

  function sectionInView(): Section | null {
    if (!isMobileLayout()) return activeSection();
    const best = [...ratios.entries()].sort((a, b) => b[1] - a[1])[0];
    return best && isSection(best[0].dataset.anchor) ? best[0].dataset.anchor as Section : current;
  }

  document.addEventListener('click', (e) => {
    if (!(e.target instanceof Element) || !e.target.closest('[data-voice-toggle]')) return;
    enabled = !enabled;
    writePref(enabled);
    narrated.clear();
    if (enabled) {
      current = sectionInView();
      narrate(current);
    } else {
      disarmUnlock();
      stop();
    }
    render();
  });

  // Saved "on": wait for the first gesture before trying to play.
  if (enabled) armUnlock();

  window.addEventListener('langchange', () => { stop(); setTimeout(render, 0); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  ['playing', 'pause', 'ended', 'error'].forEach((t) => audio.addEventListener(t, render));

  current = sectionInView();
  render();
}
