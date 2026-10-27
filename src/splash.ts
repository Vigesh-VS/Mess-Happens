// Fades out the "mess happens" splash from index.html once the app has started.
// It stays at least MIN_VISIBLE_MS from page load so the fade-in can finish; a tap skips it.

const MIN_VISIBLE_MS = 2000; // ~1.2 s fully visible after the fade-in
const FADE_OUT_MS = 600;

export function dismissSplash(): void {
  const splash = document.getElementById('splash');
  if (!splash) return;

  // Already tapped away (index.html handles taps before this script runs).
  let done = false;
  if (splash.classList.contains('hide')) {
    window.setTimeout(() => splash.remove(), FADE_OUT_MS);
    return;
  }
  const hide = () => {
    if (done) return;
    done = true;
    splash.classList.add('hide');
    window.setTimeout(() => splash.remove(), FADE_OUT_MS);
  };

  splash.addEventListener('click', hide, { once: true });
  window.setTimeout(hide, Math.max(0, MIN_VISIBLE_MS - performance.now()));
}
