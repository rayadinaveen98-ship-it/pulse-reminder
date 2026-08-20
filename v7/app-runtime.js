// Pulse V7.0G — sole app state/render/navigation boundary
(()=>{
  if(window.PulseApp)return;
  const legacyRender=window.render;
  const legacyGo=window.go;
  if(typeof legacyRender!=='function'||typeof legacyGo!=='function')throw new Error('PulseApp requires legacy render/go boundaries');

  const CORE_ROUTES=new Set(['today','upcoming','automations','all','history','settings']);
  const listeners=new Set();
  let rendering=false,pendingRender=false,renderCount=0,lastReason='bootstrap';
  const runtime=window.PulseRuntime;

  const snapshot=()=>Object.freeze({...state});
  const notify=(kind,detail={})=>{const event=Object.freeze({kind,detail,state:snapshot(),renderCount});for(const fn of [...listeners])try{fn(event)}catch(e){console.error('PulseApp subscriber',e)}try{window.dispatchEvent(new CustomEvent(`pulse:app:${kind}`,{detail:event}))}catch{}};
  function paintViewHeader(view){const h=document.querySelector('.topbar h1'),s=document.querySelector('.page-subtitle');const title=typeof view?.title==='function'?view.title():view?.title;const subtitle=typeof view?.subtitle==='function'?view.subtitle():view?.subtitle;if(h)h.textContent=title||'Pulse';if(s)s.textContent=subtitle||''}

  function renderApp(reason='compat'){
    lastReason=reason||'compat';
    if(rendering){pendingRender=true;return}
    rendering=true;
    try{
      runtime?.runBefore?.({reason:lastReason,tab:state.tab});
      const view=runtime?.getView?.(state.tab);
      let out;
      if(view?.body&&typeof window.layout==='function'){out=window.layout(view.body());paintViewHeader(view)}
      else if(CORE_ROUTES.has(state.tab))out=legacyRender();
      else{console.warn('Pulse route not registered:',state.tab);state.tab='today';out=legacyRender()}
      renderCount++;
      runtime?.runAfter?.({reason:lastReason,tab:state.tab});
      runtime?.paintVersion?.();
      notify('render',{reason:lastReason,tab:state.tab});
      return out;
    }finally{
      rendering=false;
      if(pendingRender){pendingRender=false;queueMicrotask(()=>renderApp('queued'))}
    }
  }

  function navigate(tab,options={}){
    if(!CORE_ROUTES.has(tab)&&!runtime?.getView?.(tab)){console.warn('Pulse navigation blocked for unregistered route:',tab);return}
    const previous=state.tab;
    if(options.closeTransient!==false)closeTransient({render:false});
    const out=legacyGo(tab); // legacy go updates tab/filter and calls the global render alias below
    runtime?.runAfterNavigate?.({from:previous,to:state.tab,requested:tab});
    notify('navigate',{from:previous,to:state.tab,requested:tab});
    return out;
  }

  function setState(patch,options={}){if(!patch||typeof patch!=='object')return snapshot();const before=snapshot();Object.assign(state,patch);notify('state',{before,patch:{...patch}});if(options.render!==false)renderApp(options.reason||'state');return snapshot()}
  function closeTransient(options={}){let changed=false;for(const key of ['modal','sheet','detail'])if(state[key]!=null){state[key]=null;changed=true}if(changed){notify('state',{patch:{modal:null,sheet:null,detail:null},transient:true});if(options.render!==false)renderApp('close-transient')}return changed}
  function subscribe(fn){if(typeof fn!=='function')return()=>{};listeners.add(fn);return()=>listeners.delete(fn)}
  function getRoute(){return state.tab}
  function getView(tab=state.tab){return runtime?.getView?.(tab)||null}
  function registerView(tab,definition){return runtime?.registerView?.(tab,definition)}
  function isRendering(){return rendering}
  function diagnostics(){return Object.freeze({version:window.PulseConfig?.version||'7.0',route:state.tab,renderCount,isRendering:rendering,pendingRender,lastReason,subscriberCount:listeners.size,registeredView:!!getView()})}

  const api=Object.freeze({render:renderApp,navigate,setState,snapshot,closeTransient,subscribe,getRoute,getView,registerView,isRendering,diagnostics});
  window.PulseApp=api;
  window.render=()=>api.render('legacy-alias');
  window.go=tab=>api.navigate(tab);
  window.dispatchEvent(new CustomEvent('pulse:app-ready',{detail:api}));
})();
