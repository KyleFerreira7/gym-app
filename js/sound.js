/*
  SOUND
  A short "ding ding" when a timer ends, made with the browser's Web Audio API
  (no sound files needed). iPhones only allow sound after you've tapped
  something, so unlockSound() is called on your first tap.
  Note: iPhones don't let websites vibrate, so a sound + screen flash is the alert.
  If your phone's silent switch is on, the sound won't play.
*/

let audioContext = null;

function unlockSound() {
  if (audioContext) return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (AudioCtx) audioContext = new AudioCtx();
}

function playDing() {
  // Vibrate where the phone allows it (Android does, iPhone ignores this).
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  if (!audioContext) return;

  // Two short beeps, 0.25 s apart.
  [0, 0.25].forEach((delay) => {
    const start = audioContext.currentTime + delay;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.frequency.value = 880; // pitch in Hz
    gain.gain.setValueAtTime(0.3, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2); // fade out
    osc.connect(gain).connect(audioContext.destination);
    osc.start(start);
    osc.stop(start + 0.2);
  });
}

// Briefly flash the screen so you notice the timer even without sound.
function flashScreen() {
  document.body.classList.remove("flash");
  void document.body.offsetWidth; // restart the animation if it's already running
  document.body.classList.add("flash");
}
