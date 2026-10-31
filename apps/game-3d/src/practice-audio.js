export class PracticeAudio {
  start() {
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      this.context ||= new Audio(); this.context.resume().catch(() => {});
      if (this.noise) return;
      const buffer = this.context.createBuffer(1, this.context.sampleRate, this.context.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      this.noise = this.context.createBufferSource(); this.noise.buffer = buffer; this.noise.loop = true;
      this.noiseGain = this.context.createGain(); this.noiseGain.gain.value = .025;
      this.noise.connect(this.noiseGain).connect(this.context.destination); this.noise.start();
      this.tone = this.context.createOscillator(); this.tone.type = 'sine'; this.tone.frequency.value = 440;
      this.toneGain = this.context.createGain(); this.toneGain.gain.value = 0;
      this.tone.connect(this.toneGain).connect(this.context.destination); this.tone.start();
    } catch { /* 不能播放声音时，信号强度与指针仍提供完整反馈。 */ }
  }
  update(strength, muted) {
    if (!this.noiseGain) return;
    this.noiseGain.gain.setTargetAtTime(muted ? 0 : (1 - strength) * .025, this.context.currentTime, .05);
    this.toneGain.gain.setTargetAtTime(muted ? 0 : strength * .035, this.context.currentTime, .05);
  }
  stop() {
    this.noise?.stop(); this.tone?.stop(); this.noise = this.tone = null;
  }
}
