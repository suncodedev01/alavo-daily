const BEEP_HZ = 880;
const BEEP_MS = 350;
const BEEP_GAIN = 0.08;

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

export function playBeep(): void {
  try {
    const AudioContextClass = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = BEEP_HZ;
    gain.gain.value = BEEP_GAIN;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
      void context.close();
    }, BEEP_MS);
  } catch {
    return;
  }
}
