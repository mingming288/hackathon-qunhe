// 浏览器可能阻止自动播放；进入雨夜后允许下一次玩家操作重试。
export class RainAmbience {
  constructor(audio) {
    this.audio = audio;
    this.active = false;
    audio.loop = true;
    audio.volume = .28;
  }

  setActive(active) {
    if (this.active === active) return;
    this.active = active;
    if (active) this.retry();
    else { this.audio.pause(); this.audio.currentTime = 0; }
  }

  retry() {
    if (this.active && this.audio.paused) this.audio.play().catch(() => {});
  }
}
