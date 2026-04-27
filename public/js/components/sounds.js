window.Sounds = {
  ctx: null,
  init() { if(!this.ctx) this.ctx = new (window.AudioContext||window.webkitAudioContext)(); },
  play(type) {
    if (!Store.get('enableSounds')) return;
    try {
      this.init();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain); gain.connect(this.ctx.destination);
      gain.gain.value = 0.1;
      if(type==='scan') { osc.frequency.value=1200; osc.type='sine'; gain.gain.setValueAtTime(0.1,this.ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001,this.ctx.currentTime+0.15); osc.start(); osc.stop(this.ctx.currentTime+0.15); }
      else if(type==='success') { osc.frequency.value=800; osc.type='sine'; gain.gain.setValueAtTime(0.1,this.ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001,this.ctx.currentTime+0.3); osc.start(); osc.stop(this.ctx.currentTime+0.3); setTimeout(()=>{if (!Store.get('enableSounds')) return; const o2=this.ctx.createOscillator();const g2=this.ctx.createGain();o2.connect(g2);g2.connect(this.ctx.destination);o2.frequency.value=1200;o2.type='sine';g2.gain.setValueAtTime(0.1,this.ctx.currentTime);g2.gain.exponentialRampToValueAtTime(0.001,this.ctx.currentTime+0.2);o2.start();o2.stop(this.ctx.currentTime+0.2);},150); }
      else if(type==='error') { osc.frequency.value=300; osc.type='square'; gain.gain.setValueAtTime(0.08,this.ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001,this.ctx.currentTime+0.4); osc.start(); osc.stop(this.ctx.currentTime+0.4); }
    } catch(e){}
  }
};
