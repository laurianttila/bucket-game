'use strict';
// Original, 16-bar lounge loop. Synthesized locally; no audio files or downloads.
class QueueMusic {
  constructor(context) {
    this.context=context;
    this.master=context.createGain();
    this.master.gain.value=0;
    this.master.connect(context.destination);
    this.timer=null;
    this.beat=60/104;
    this.step=0;
    this.next=0;
    this.chords=[
      [48,60,64,67,71],[48,60,64,67,71],
      [45,60,64,67,69],[45,60,64,67,69],
      [50,60,65,69,72],[50,60,65,69,72],
      [43,59,62,65,69],[43,59,62,65,69],
      [52,59,62,67,71],[45,60,64,67,69],
      [50,60,65,69,72],[43,59,62,65,69],
      [53,60,64,69,72],[53,60,64,69,72],
      [43,59,62,65,69],[43,59,62,65,69]
    ];
    this.melody=[
      [76,0,79,0,81,79,76,0],[74,0,71,0,72,0,0,0],
      [76,0,79,81,0,79,76,0],[72,0,71,0,69,0,0,0],
      [77,0,81,0,79,77,76,0],[74,0,72,0,74,0,0,0],
      [74,0,77,0,76,74,71,0],[72,0,74,0,0,0,0,0],
      [79,0,78,0,76,0,74,0],[76,0,72,0,69,0,0,0],
      [77,0,76,0,74,72,74,0],[71,0,74,0,77,0,0,0],
      [76,0,77,0,81,79,76,0],[74,0,72,0,69,0,0,0],
      [71,0,74,0,77,76,74,0],[71,0,69,0,67,0,0,0]
    ];
    this.noise=context.createBuffer(1,Math.ceil(context.sampleRate*.12),context.sampleRate);
    const samples=this.noise.getChannelData(0);
    for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*(1-i/samples.length);
  }
  note(midi,time,duration,volume,kind='keys') {
    const ctx=this.context, envelope=ctx.createGain();
    envelope.gain.setValueAtTime(0,time);
    envelope.gain.linearRampToValueAtTime(volume,time+.015);
    envelope.gain.exponentialRampToValueAtTime(.0001,time+duration);
    envelope.connect(this.master);
    const harmonics=kind==='keys'?[[1,1],[2,.18],[3,.055]]:[[1,1]];
    let remaining=harmonics.length;
    harmonics.forEach(([multiple,level])=>{
      const oscillator=ctx.createOscillator(),gain=ctx.createGain();
      oscillator.type='sine';
      oscillator.frequency.value=440*Math.pow(2,(midi-69)/12)*multiple;
      gain.gain.value=level;
      oscillator.connect(gain);gain.connect(envelope);
      oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();if(--remaining===0)envelope.disconnect()};
      oscillator.start(time);oscillator.stop(time+duration+.03);
    });
  }
  brush(time,strong=false) {
    const ctx=this.context,source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    source.buffer=this.noise;filter.type='highpass';filter.frequency.value=5000;
    gain.gain.setValueAtTime(strong?.034:.016,time);
    gain.gain.exponentialRampToValueAtTime(.0001,time+.1);
    source.connect(filter);filter.connect(gain);gain.connect(this.master);
    source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect()};source.start(time);
  }
  schedule() {
    const ctx=this.context;
    // Skip missed time after sleep or background throttling instead of bursting notes.
    if(this.next<ctx.currentTime)this.next=ctx.currentTime+.035;
    while(this.next<ctx.currentTime+.35) {
      const bar=Math.floor(this.step/8)%16,tick=this.step%8,chord=this.chords[bar],t=this.next;
      if(tick===0||tick===4)this.note(chord[0]+(tick===4?7:0),t,.44,.15,'bass');
      if(tick===0||tick===3||tick===6)chord.slice(1).forEach(n=>this.note(n,t,.46,.035));
      const melody=this.melody[bar][tick];
      if(melody)this.note(melody,t,this.beat*.82,.085);
      if(tick%2===0)this.brush(t,tick===2||tick===6);
      this.step++;this.next+=this.beat/2;
    }
  }
  start() {
    if(this.timer!==null)return;
    this.next=this.context.currentTime+.04;
    this.master.gain.cancelScheduledValues(this.context.currentTime);
    this.master.gain.setTargetAtTime(.55,this.context.currentTime,.12);
    this.schedule();this.timer=setInterval(()=>this.schedule(),100);
  }
  stop() {
    clearInterval(this.timer);this.timer=null;
    this.master.gain.cancelScheduledValues(this.context.currentTime);
    this.master.gain.setTargetAtTime(0,this.context.currentTime,.025);
  }
}
