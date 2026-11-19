// All sound is synthesized with WebAudio: no audio files, nothing fetched.
// Engine hum, sirens, gunshots, pickups and a quiet synthwave loop for the drive.
export function createAudio() {
  let context = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenTimer = 0;
  let musicTimer = null;
  let muted = false;
  let musicStep = 0;

  // A tiny synthwave loop: Am – F – C – G, one bar a chord, bass under it.
  const CHORDS = [
    [110, 130.8, 164.8], [87.3, 110, 130.8], [130.8, 164.8, 196], [98, 123.5, 146.8],
  ];

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.5;
      master.connect(context.destination);
      engineOsc = context.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = context.createGain();
      engineGain.gain.value = 0;
      const engineFilter = context.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      sirenOsc = context.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 700;
      sirenGain = context.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, when = 0) {
    if (!context) return;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const start = context.currentTime + when;
    gain.gain.setValueAtTime(vol, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  function noise(dur, vol, freq) {
    if (!context) return;
    const length = Math.floor(context.sampleRate * dur);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const gain = context.createGain();
    gain.gain.value = vol;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start();
  }

  return {
    /** Call from a user gesture: browsers keep audio locked until one. */
    unlock() {
      if (ensure() && context.state === 'suspended') context.resume();
    },
    get muted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    /** Engine pitch follows speed; call every frame with the player's speed. */
    engine(speed, maxSpeed) {
      if (!context) return;
      const ratio = Math.min(1, Math.abs(speed) / maxSpeed);
      engineOsc.frequency.value = 50 + ratio * 130;
      engineGain.gain.value = speed === 0 ? 0 : 0.045 + ratio * 0.05;
    },
    engineOff() {
      if (engineGain) engineGain.gain.value = 0;
    },
    /** Two-tone siren while the player is wanted; call every frame. */
    siren(wanted, dt) {
      if (!context) return;
      if (wanted === 0) {
        sirenGain.gain.value = 0;
        return;
      }
      sirenTimer += dt;
      const high = Math.floor(sirenTimer / 0.45) % 2 === 0;
      sirenOsc.frequency.value = high ? 780 : 590;
      sirenGain.gain.value = 0.028;
    },
    gunshot() {
      noise(0.14, 0.5, 2400);
      tone(140, 0.1, 'sine', 0.4);
    },
    enemyShot() {
      noise(0.1, 0.22, 1800);
    },
    pickup() {
      tone(660, 0.09, 'sine', 0.25);
      tone(990, 0.12, 'sine', 0.25, 0.08);
    },
    cash() {
      tone(880, 0.08, 'triangle', 0.22);
      tone(1174, 0.1, 'triangle', 0.22, 0.07);
      tone(1568, 0.16, 'triangle', 0.22, 0.14);
    },
    missionDone() {
      [523, 659, 784, 1046].forEach((freq, i) => tone(freq, 0.22, 'triangle', 0.25, i * 0.11));
    },
    crash() {
      noise(0.3, 0.5, 900);
      tone(70, 0.25, 'sine', 0.4);
    },
    busted() {
      [392, 311, 233].forEach((freq, i) => tone(freq, 0.3, 'sawtooth', 0.18, i * 0.18));
    },
    startMusic() {
      if (!ensure() || musicTimer) return;
      musicTimer = window.setInterval(() => {
        if (muted || !context) return;
        const chord = CHORDS[musicStep % CHORDS.length];
        musicStep += 1;
        chord.forEach((freq) => tone(freq / 2, 0.9, 'triangle', 0.05));
        tone(chord[0] / 4, 0.9, 'sine', 0.09);
      }, 500);
    },
    stopMusic() {
      if (musicTimer) {
        window.clearInterval(musicTimer);
        musicTimer = null;
      }
    },
  };
}
