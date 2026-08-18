// Pulse 6.0A — centralized render/navigation lifecycle
(()=>{
  if(window.PulseRuntime)return;
  const before=[],after=[],afterNav=[],views=new Map();
  const runtime={
    targetVersion:'6.0',
    stage:'6.0A',
    currentVersion:'6.0A',
    beforeRender(fn){if(typeof fn==='function'&&!before.includes(fn))before.push(fn);return()=>remove(before,fn)},
    afterRender(fn){if(typeof fn==='function'&&!after.includes(fn))after.push(fn);return()=>remove(after,fn)},
    afterNavigate(fn){if(typeof fn==='function'&&!afterNav.includes(fn))afterNav.push(fn);return()=>remove(afterNav,fn)},
    registerView(tab,definition){if(tab&&definition)views.set(tab,definition);return()=>views.delete(tab)},
    getView(tab){return views.get(tab)},
    run(list,...args){for(const fn of [...list]){try{fn(...args)}catch(e){console.error('Pulse lifecycle hook',e)}}},
    setVersion(v){this.currentVersion=String(v||this.currentVersion);this.paintVersion()},
    paintVersion(){document.querySelectorAll('.brand small').forEach(x=>x.textContent='V'+this.currentVersion);document.querySelectorAll('.version-box b').forEach(x=>x.textContent='Pulse '+this.currentVersion)}
  };
  function remove(list,fn){const i=list.indexOf(fn);if(i>=0)list.splice(i,1)}
  const baseRender=window.render;
  if(typeof baseRender!=='function')throw new Error('PulseRuntime requires render()');
  window.render=function(){
    runtime.run(before);
    try{
      const view=runtime.getView(window.state?.tab);
      if(view?.body&&typeof window.layout==='function'){
        window.layout(view.body());
        const h=document.querySelector('.topbar h1');if(h&&view.title)h.textContent=typeof view.title==='function'?view.title():view.title;
        const s=document.querySelector('.page-subtitle');if(s&&view.subtitle)s.textContent=typeof view.subtitle==='function'?view.subtitle():view.subtitle;
      }else baseRender.apply(this,arguments);
    }finally{runtime.run(after);runtime.paintVersion()}
  };
  const baseGo=window.go;
  if(typeof baseGo==='function')window.go=function(tab){const out=baseGo.apply(this,arguments);runtime.run(afterNav,tab);return out};
  window.PulseRuntime=runtime;
})();
