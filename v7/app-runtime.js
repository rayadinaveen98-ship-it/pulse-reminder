// Pulse V7.0F — final app state/render boundary
// New V7 code should use PulseApp instead of wrapping render()/go().
(()=>{
  if(window.PulseApp)return;
  const legacyRender=window.render;
  const legacyGo=window.go;
  if(typeof legacyRender!=='function'||typeof legacyGo!=='function')throw new Error('PulseApp requires legacy render/go boundaries');

  const listeners=new Set();
  let rendering=false,pendingRender=false,renderCount=0,lastReason='bootstrap';

  const snapshot=()=>Object.freeze({...state});
  const notify=(kind,detail={})=>{
    const event=Object.freeze({kind,detail,state:snapshot(),renderCount});
    for(const fn of [...listeners]){try{fn(event)}catch(e){console.error('PulseApp subscriber',e)}}
    try{window.dispatchEvent(new CustomEvent(`pulse:app:${kind}`,{detail:event}))}catch{}
  };

  function renderApp(reason='compat'){
    lastReason=reason||'compat';
    if(rendering){pendingRender=true;return}
    rendering=true;
    try{
      const out=legacyRender();
      renderCount++;
      notify('render',{reason:lastReason,tab:state.tab});
      return out;
    }finally{
      rendering=false;
      if(pendingRender){pendingRender=false;queueMicrotask(()=>renderApp('queued'))}
    }
  }

  function navigate(tab,options={}){
    const previous=state.tab;
    const out=legacyGo(tab);
    if(state.tab!==previous||state.tab===tab)notify('navigate',{from:previous,to:state.tab,requested:tab});
    if(options.closeTransient!==false)closeTransient({render:false});
    return out;
  }

  function setState(patch,options={}){
    if(!patch||typeof patch!=='object')return snapshot();
    const before=snapshot();
    Object.assign(state,patch);
    notify('state',{before,patch:{...patch}});
    if(options.render!==false)renderApp(options.reason||'state');
    return snapshot();
  }

  function closeTransient(options={}){
    let changed=false;
    for(const key of ['modal','sheet','detail'])if(state[key]!=null){state[key]=null;changed=true}
    if(changed){notify('state',{patch:{modal:null,sheet:null,detail:null},transient:true});if(options.render!==false)renderApp('close-transient')}
    return changed;
  }

  function subscribe(fn){if(typeof fn!=='function')return()=>{};listeners.add(fn);return()=>listeners.delete(fn)}
  function getRoute(){return state.tab}
  function getView(tab=state.tab){return window.PulseRuntime?.getView?.(tab)||null}
  function isRendering(){return rendering}
  function diagnostics(){return Object.freeze({version:window.PulseConfig?.version||'7.0',route:state.tab,renderCount,isRendering:rendering,pendingRender,lastReason,subscriberCount:listeners.size})}

  const api=Object.freeze({render:renderApp,navigate,setState,snapshot,closeTransient,subscribe,getRoute,getView,isRendering,diagnostics});
  window.PulseApp=api;
  // Compatibility aliases: old UI remains functional, new modules call PulseApp directly.
  window.render=()=>api.render('legacy-alias');
  window.go=tab=>api.navigate(tab);
  window.dispatchEvent(new CustomEvent('pulse:app-ready',{detail:api}));
})();
