export default class AudioEngine {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.started = false;
    this.oscillators = [];
  }

  start() {
    if (this.started) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.startAmbientDrone();
    this.started = true;
  }

  startAmbientDrone() {
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    filter.connect(this.masterGain);

    const freqs = [
      { f: 55, g: 0.06 },
      { f: 82.5, g: 0.03 },
      { f: 110, g: 0.02 }
    ];

    freqs.forEach(({ f, g }) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      
      const gain = this.ctx.createGain();
      gain.gain.value = g;
      
      osc.connect(gain);
      gain.connect(filter);
      
      osc.start();
      this.oscillators.push(osc);
    });
  }

  playPlaceSound() {
    if (!this.started) return;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.linearRampToValueAtTime(1200, now + 0.15);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.01);
    gain.gain.linearRampToValueAtTime(0, now + 0.3);

    const delay = this.ctx.createDelay();
    delay.delayTime.value = 0.05;
    const feedback = this.ctx.createGain();
    feedback.gain.value = 0.3;

    delay.connect(feedback);
    feedback.connect(delay);

    osc.connect(gain);
    gain.connect(delay);
    gain.connect(this.masterGain);
    delay.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.5);

    setTimeout(() => {
      delay.disconnect();
      feedback.disconnect();
    }, 1000);
  }

  createProximitySound() {
    if (!this.started) return { update: () => {}, dispose: () => {} };

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 220;

    const gain = this.ctx.createGain();
    gain.gain.value = 0;

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();

    return {
      update: (distance) => {
        const targetGain = Math.max(0, 0.05 * (1 - distance / 5));
        gain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.1);
      },
      dispose: () => {
        osc.stop();
        osc.disconnect();
        gain.disconnect();
      }
    };
  }

  playClickSound() {
    if (!this.started) return;

    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2000;

    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.01);
    gain.gain.linearRampToValueAtTime(0, now + 0.05);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
  }

  dispose() {
    this.oscillators.forEach(osc => {
      try { osc.stop(); } catch (e) {}
      osc.disconnect();
    });
    this.oscillators = [];
    if (this.ctx.state !== 'closed') {
      this.ctx.close();
    }
  }
}
