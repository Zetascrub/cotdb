// Small, opt-in Web Audio cues. No audio files or network requests.
window.BunnyAudio = (() => {
  let context = null;
  let on = false;
  let lastKey = 0;
  let drive = null;

  function tone(frequency, duration, volume = 0.022, type = 'sine', delay = 0) {
    if (!on || !context || context.state !== 'running') return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.01);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }

  async function toggle() {
    if (on) {
      stopDrive();
      on = false;
      return false;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return false;
    try {
      context ||= new AudioContextClass();
      await context.resume();
      on = context.state === 'running';
      if (on) connect();
    } catch (_) {
      on = false;
    }
    return on;
  }

  function key() {
    const now = performance.now();
    if (now - lastKey < 65) return;
    lastKey = now;
    tone(520, 0.025, 0.009, 'square');
  }
  function boot() { tone(660, 0.025, 0.007, 'square'); }
  function bootFail() {
    tone(330, 0.1, 0.022, 'square');
    tone(165, 0.17, 0.022, 'sawtooth', 0.11);
  }
  function command() { tone(440, 0.05, 0.013, 'triangle'); }
  function error() { tone(180, 0.12, 0.025, 'sawtooth'); }
  function success() {
    tone(523, 0.11, 0.022);
    tone(659, 0.11, 0.022, 'sine', 0.12);
    tone(784, 0.18, 0.022, 'sine', 0.24);
  }
  function connect() {
    tone(440, 0.08, 0.015, 'sine');
    tone(880, 0.12, 0.015, 'sine', 0.09);
  }
  function powerOff() {
    tone(330, 0.12, 0.018, 'triangle');
    tone(165, 0.17, 0.014, 'triangle', 0.12);
  }

  function startDrive() {
    if (!on || !context || context.state !== 'running' || drive) return;
    const master = context.createGain();
    master.gain.setValueAtTime(0.0001, context.currentTime);
    master.gain.exponentialRampToValueAtTime(1, context.currentTime + 0.12);
    master.connect(context.destination);

    const motor = context.createOscillator();
    const motorGain = context.createGain();
    motor.type = 'triangle';
    motor.frequency.value = 92;
    motorGain.gain.value = 0.006;
    motor.connect(motorGain).connect(master);

    const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    const platter = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const platterGain = context.createGain();
    platter.buffer = buffer;
    platter.loop = true;
    filter.type = 'lowpass';
    filter.frequency.value = 230;
    platterGain.gain.value = 0.009;
    platter.connect(filter).connect(platterGain).connect(master);
    motor.start();
    platter.start();

    const currentDrive = {master, motor, platter, timer: null};
    drive = currentDrive;
    function click() {
      if (drive !== currentDrive) return;
      tone(180 + Math.random() * 110, 0.017, 0.007, 'square');
      currentDrive.timer = window.setTimeout(click, 190 + Math.random() * 340);
    }
    currentDrive.timer = window.setTimeout(click, 170);
  }

  function stopDrive() {
    if (!drive) return;
    const {master, motor, platter, timer} = drive;
    drive = null;
    window.clearTimeout(timer);
    const now = context.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    motor.stop(now + 0.1);
    platter.stop(now + 0.1);
    platter.onended = () => { motor.disconnect(); platter.disconnect(); master.disconnect(); };
  }

  return Object.freeze({toggle, enabled: () => on, key, boot, bootFail, command, error, success, connect, powerOff, startDrive, stopDrive});
})();
