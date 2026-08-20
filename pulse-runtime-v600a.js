// Pulse 6.0A — centralized render/navigation lifecycle
(()=>{
  if(window.PulseRuntime)return;
  const APP_VERSION='6.0A';
  const CORE_ROUTES=new Set(['today','upcoming','automations','all','history','settings']);
  const before=[],after=[],afterNav=[],views=new Map();
  const currentTab=()=>{try{return typeof state!=='undefined'&&state?.tab?state.tab:'today'}catch{return 'today'}};
  const runtime={
    targetVersion:'6.0',stage:APP_VERSION,currentVersion:APP_VERSION,
    beforeRender(fn){if(typeof fn==='function'&&!before.includes(fn))before.push(fn);return()=>remove(before,fn)},
    afterRender(fn){if(typeof fn==='function'&&!after.includes(fn))after.push(fn);return()=>remove(after,fn)},
    afterNavigate(fn){if(typeof fn==='function'&&!afterNav.includes(fn))afterNav.push(fn);return()=>remove(afterNav,fn)},
    registerView(tab,definition){if(tab&&definition)views.set(tab,definition);return()=>views.delete(tab)},getView(tab){return views.get(tab)},
    run(list,...args){for(const fn of [...list]){try{fn(...args)}catch(e){console.error('Pulse lifecycle hook',e)} }},
    setVersion(v){this.currentVersion=String(v||APP_VERSION);this.paintVersion()},
    paintVersion(){
      document.querySelectorAll('.brand small').forEach(x=>x.textContent='V'+APP_VERSION);
      document.querySelectorAll('.version-box b').forEach(x=>x.textContent='Pulse '+APP_VERSION);
      document.querySelectorAll('.version-box p').forEach(x=>{
        if(/\bV3\b|Update-safe V3/i.test(x.textContent||''))x.textContent='Centralized runtime, cloud sync and notification reliability.';
      });
      document.querySelectorAll('.coming span').forEach(x=>{
        if(/\bV3\b/.test(x.textContent||''))x.textContent=(x.textContent||'').replace(/\bV3\b/g,'Pulse');
      });
    },
    currentTab
  };
  function remove(list,fn){const i=list.indexOf(fn);if(i>=0)list.splice(i,1)}
  function paintViewHeader(view){
    const h=document.querySelector('.topbar h1');
    const s=document.querySelector('.page-subtitle');
    const title=typeof view?.title==='function'?view.title():view?.title;
    const subtitle=typeof view?.subtitle==='function'?view.subtitle():view?.subtitle;
    if(h)h.textContent=title||'Pulse';
    if(s)s.textContent=subtitle||'';
  }
  const baseRender=window.render;if(typeof baseRender!=='function')throw new Error('PulseRuntime requires render()');
  window.render=function(){
    runtime.run(before);
    try{
      const tab=currentTab();
      const view=runtime.getView(tab);
      if(view?.body&&typeof window.layout==='function'){
        window.layout(view.body());
        paintViewHeader(view);
      }else if(CORE_ROUTES.has(tab)){
        baseRender.apply(this,arguments);
      }else{
        console.warn('Pulse route not registered:',tab);
        try{state.tab='today'}catch{}
        baseRender.apply(this,arguments);
      }
    }finally{
      runtime.run(after);
      runtime.paintVersion();
    }
  };
  const baseGo=window.go;
  if(typeof baseGo==='function')window.go=function(tab){
    if(!CORE_ROUTES.has(tab)&&!runtime.getView(tab)){
      console.warn('Pulse navigation blocked for unregistered route:',tab);
      return;
    }
    const out=baseGo.apply(this,arguments);
    runtime.run(afterNav,tab);
    return out;
  };
  window.PulseRuntime=runtime;
  window.PULSE_VERSION=APP_VERSION;
  window.dispatchEvent(new CustomEvent('pulse:runtime-ready',{detail:runtime}));
})();