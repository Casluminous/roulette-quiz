let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function beep(freq: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function noise(duration: number, volume: number = 0.2) {
  const ctx = getCtx();
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

export const Sounds = {
  cardDeal() {
    noise(0.08, 0.15);
    beep(800, 0.05, 'sine', 0.1);
  },

  cardFlip() {
    beep(1200, 0.06, 'sine', 0.15);
    setTimeout(() => beep(1600, 0.04, 'sine', 0.1), 30);
  },

  cardPlay() {
    beep(600, 0.1, 'triangle', 0.2);
    setTimeout(() => beep(900, 0.08, 'sine', 0.15), 50);
  },

  cardSlam() {
    noise(0.15, 0.4);
    beep(200, 0.1, 'square', 0.3);
    setTimeout(() => beep(150, 0.15, 'sawtooth', 0.2), 50);
  },

  liarCall() {
    beep(880, 0.1, 'square', 0.3);
    setTimeout(() => beep(1100, 0.1, 'square', 0.3), 80);
    setTimeout(() => beep(880, 0.15, 'square', 0.25), 160);
  },

  revealCards() {
    beep(400, 0.08, 'triangle', 0.2);
    setTimeout(() => beep(500, 0.08, 'triangle', 0.2), 60);
    setTimeout(() => beep(600, 0.1, 'triangle', 0.2), 120);
  },

  devilReveal() {
    beep(200, 0.2, 'sawtooth', 0.35);
    setTimeout(() => beep(150, 0.3, 'sawtooth', 0.3), 100);
    setTimeout(() => beep(100, 0.4, 'sawtooth', 0.25), 200);
  },

  acceptPlay() {
    beep(600, 0.08, 'sine', 0.15);
    setTimeout(() => beep(800, 0.1, 'sine', 0.15), 60);
  },

  correct() {
    beep(523, 0.15, 'sine', 0.25);
    setTimeout(() => beep(659, 0.15, 'sine', 0.25), 100);
    setTimeout(() => beep(784, 0.2, 'sine', 0.25), 200);
  },

  wrong() {
    beep(300, 0.2, 'sawtooth', 0.2);
    setTimeout(() => beep(250, 0.3, 'sawtooth', 0.15), 150);
  },

  tick() {
    beep(1000, 0.03, 'sine', 0.1);
  },

  timerWarning() {
    beep(880, 0.1, 'square', 0.15);
  },

  gunClick() {
    noise(0.04, 0.3);
    beep(200, 0.05, 'square', 0.2);
  },

  gunFire() {
    noise(0.3, 0.5);
    beep(100, 0.3, 'sawtooth', 0.4);
    setTimeout(() => beep(60, 0.4, 'sine', 0.3), 50);
  },

  gunSurvive() {
    beep(400, 0.1, 'sine', 0.2);
    setTimeout(() => beep(600, 0.15, 'sine', 0.15), 80);
  },

  victory() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => beep(freq, 0.2, 'sine', 0.25), i * 120);
    });
  },

  newRound() {
    beep(440, 0.1, 'sine', 0.15);
    setTimeout(() => beep(550, 0.1, 'sine', 0.15), 80);
    setTimeout(() => beep(660, 0.15, 'sine', 0.2), 160);
  },

  buttonClick() {
    beep(700, 0.04, 'sine', 0.1);
  },
};
