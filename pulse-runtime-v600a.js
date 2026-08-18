// Pulse 6.0A — render lifecycle foundation
(()=>{
  if(window.PulseRuntime)return;
  const before=[],after=[];
  const runtime={
    targetVersion:'6.0',
    stage:'6.0A',
    currentVersion:'5.5.1',
    beforeRender(fn){if(typeof fn==='function'&&!before.includes(fn))before.push(fn);return()=>{const i=before.indexOf(fn);if(i>=0)before.splice(i,1)}},
    afterRender(fn){if(typeof fn==='function'&&!after.includes(fn))after.push(fn);return()=>{const i=after.indexOf(fn);if(i>=0)after.splice(i,1)}},
    run(list){for(const fn of [...list]){try{fn()}catch(e){console.error('Pulse render hook',e)}}},
    setVersion(v){this.currentVersion=String(v||this.currentVersion);this.paintVersion()},
    paintVersion(){document.querySelectorAll('.brand small').forEach(x=>x.textContent='V'+this.currentVersion);document.querySelectorAll('.version-box b').forEach(x=>x.textContent='Pulse '+this.currentVersion)}
  };
  const base=window.render;
  if(typeof base!=='function')throw new Error('PulseRuntime requires render()');
  window.render=function(){runtime.run(before);try{return base.apply(this,arguments)}finally{runtime.run(after);runtime.paintVersion()}};
  window.PulseRuntime=runtime;
})();
