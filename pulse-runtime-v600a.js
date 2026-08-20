// Pulse V7 compatibility runtime — registry/lifecycle only
// Render/navigation authority now lives in v7/app-runtime.js.
(()=>{
  if(window.PulseRuntime)return;
  const APP_VERSION=window.PulseConfig?.version||'7.0';
  const before=[],after=[],afterNav=[],views=new Map();
  const currentTab=()=>{try{return typeof state!=='undefined'&&state?.tab?state.tab:'today'}catch{return'today'}};
  function remove(list,fn){const i=list.indexOf(fn);if(i>=0)list.splice(i,1)}
  const runtime={
    targetVersion:'7.0',stage:'V7 migration',currentVersion:APP_VERSION,
    beforeRender(fn){if(typeof fn==='function'&&!before.includes(fn))before.push(fn);return()=>remove(before,fn)},
    afterRender(fn){if(typeof fn==='function'&&!after.includes(fn))after.push(fn);return()=>remove(after,fn)},
    afterNavigate(fn){if(typeof fn==='function'&&!afterNav.includes(fn))afterNav.push(fn);return()=>remove(afterNav,fn)},
    registerView(tab,definition){if(tab&&definition)views.set(tab,definition);return()=>views.delete(tab)},
    getView(tab){return views.get(tab)},
    hasView(tab){return views.has(tab)},
    runBefore(...args){for(const fn of [...before])try{fn(...args)}catch(e){console.error('Pulse beforeRender hook',e)}},
    runAfter(...args){for(const fn of [...after])try{fn(...args)}catch(e){console.error('Pulse afterRender hook',e)}},
    runAfterNavigate(...args){for(const fn of [...afterNav])try{fn(...args)}catch(e){console.error('Pulse afterNavigate hook',e)}},
    setVersion(v){this.currentVersion=String(v||APP_VERSION);this.paintVersion()},
    paintVersion(){
      const shown=window.PulseConfig?.version||this.currentVersion||APP_VERSION;
      document.querySelectorAll('.brand small').forEach(x=>x.textContent='V'+shown);
      document.querySelectorAll('.version-box b').forEach(x=>x.textContent='Pulse '+shown);
      document.querySelectorAll('.version-box p').forEach(x=>{if(/\bV3\b|Update-safe V3/i.test(x.textContent||''))x.textContent='Centralized runtime, cloud sync and notification reliability.'});
      document.querySelectorAll('.coming span').forEach(x=>{if(/\bV3\b/.test(x.textContent||''))x.textContent=(x.textContent||'').replace(/\bV3\b/g,'Pulse')});
    },
    currentTab
  };
  window.PulseRuntime=runtime;
  window.PULSE_VERSION=APP_VERSION;
  window.dispatchEvent(new CustomEvent('pulse:runtime-ready',{detail:runtime}));
})();
