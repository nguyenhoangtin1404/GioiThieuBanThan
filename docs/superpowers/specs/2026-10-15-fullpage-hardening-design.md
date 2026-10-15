# Fullpage hardening + dependency upgrade — design

Source: full-project audit of 2026-10-15 (commit 97b02a0). This spec covers the first batch of fixes,
roadmap items 1 and 3. Images, inline-script bundling and i18n routing get their own specs later.

## Problems (confirmed)

1. With the project modal open on desktop, End/Home/PageDown/ArrowDown still change the section behind
   it. `Projects.astro` calls `vanillaFullpage.setAllowScrolling()`, which does not exist. The error is
   swallowed, and the keydown handler never checks `wheelEnabled`.
2. `VanillaFullpage` has no `destroy()`. Crossing the 768px breakpoint and coming back leaves the old
   instance's keydown/wheel/touch/resize/load listeners alive, so two instances drive the same sections.
   `initFullpage()` also re-attaches CTA and sidebar click listeners and starts a fresh, never-cleared
   `setInterval(checkActiveSection, 500)`. The mobile link/sidebar handlers stay attached on desktop.
3. Every section change calls `history.pushState`, so Back steps through sections instead of leaving the
   site. The constructor writes `#home` on init, which overwrites a deep-link hash such as `#lien-he`.
4. Section transitions (800ms), `.fade-in-item` (2s) and the Hero animations (`.chat-bubble`, `.dot`,
   `.online::after`) ignore `prefers-reduced-motion`.
5. The `.fp-nav` dot-navigation code targets an element that does not exist.
6. `astro@6.0.7` carries a critical advisory (XSS in `define:vars`). `fullpage.js` (GPL-3.0) and `tslib`
   are installed but never imported.

## Required behavior

- While `#project-modal` is open, no key, wheel or swipe changes the fullpage section. Closing it restores
  all three.
- `VanillaFullpage#destroy()` removes every listener it added and clears its timers. After any number of
  breakpoint crossings there is exactly one live instance, and one key press moves one section.
- On desktop only the desktop handlers react to CTA and sidebar clicks. On mobile only the mobile ones do.
- Section changes update the hash with `history.replaceState`. Loading `/#<anchor>` opens that section.
- Under `prefers-reduced-motion: reduce`, section changes, `.fade-in-item` and the Hero animations run
  with no transition or animation. The content is visible immediately.
- The `define:vars` advisory is cleared (astro ≥ 6.4.8). `fullpage.js` and `tslib` are removed.
  Amended during execution: `npm audit --omit=dev` still reports 1 critical (astro ≤ 7.2.7, spread-attribute
  XSS) and 1 high (sharp), and both are fixed only in Astro 7. They are deferred to the Astro 7 upgrade plan.
  The site renders only self-authored content.
- Mobile (<768px) behavior and existing screenshot baselines are unchanged.
