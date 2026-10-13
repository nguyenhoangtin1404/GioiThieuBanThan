const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Cursor spotlight and the featured tile's video for the projects section. */
export function initProjectBrowser(root: HTMLElement): void {
  const cards = Array.from(root.querySelectorAll<HTMLElement>('.project-card'));

  if (window.matchMedia('(hover: hover)').matches) {
    cards.forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
  }

  root.querySelectorAll<HTMLVideoElement>('video.card-video').forEach((video) => initCardVideo(root, video));
}

/**
 * Plays a tile's muted loop only while the projects section is on screen: on desktop the
 * fullpage section must be `.active` (inactive sections stay in layout, so intersection
 * alone is not enough); on mobile the tile must intersect the viewport.
 */
function initCardVideo(root: HTMLElement, video: HTMLVideoElement) {
  const save = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  if (reducedMotion() || save || !video.dataset.src) return;

  const section = root.closest<HTMLElement>('.section');
  let intersecting = false;

  const update = () => {
    const sectionOn = !section || !section.closest('#fullpage') || section.classList.contains('active')
      || document.body.classList.contains('mobile-layout');
    const shouldPlay = intersecting && sectionOn && document.visibilityState === 'visible';
    if (shouldPlay) {
      if (!video.src) video.src = video.dataset.src!;
      video.play().then(() => video.classList.add('playing')).catch(() => {});
    } else if (!video.paused) {
      video.pause();
    }
  };

  new IntersectionObserver((entries) => {
    intersecting = entries.some((e) => e.isIntersecting);
    update();
  }, { threshold: 0.25 }).observe(video.parentElement || video);
  if (section) new MutationObserver(update).observe(section, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', update);
}
