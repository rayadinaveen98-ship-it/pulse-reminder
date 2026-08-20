// Pulse 6.0A — sync coordinator
(()=>{
  if(window.PulseSyncCoordinator)return;
  const legacySave=window.save;
  const legacyPush=window.pulsePushAll;
  const legacyPull=window.pulsePullAll;
  if(typeof legacySave!=='function'||typeof legacyPush!=='function'||typeof legacyPull!=='function'){
    console.warn('Pulse sync coordinator skipped: legacy sync functions unavailable');
    return;
  }

  let revision=0;
  // The current local state is a neutral baseline at coordinator boot. This allows
  // the normal authenticated startup path to pull cloud state before any local edit.
  let lastPushedRevision=0;
  let lastPushCompletedAt=0;
  let pushPromise=null;
  let pullPromise=null;
  const DUPLICATE_WINDOW_MS=1500;

  window.save=function(){
    revision+=1;
    return legacySave.apply(this,arguments);
  };

  async function coordinatedPush(options={}){
    if(!pulseUser)return;
    const force=!!options.force;
    const targetRevision=revision;

    if(pushPromise){
      await pushPromise;
      if(revision!==lastPushedRevision)return coordinatedPush(options);
      return;
    }

    if(!force&&targetRevision===lastPushedRevision&&(Date.now()-lastPushCompletedAt)<DUPLICATE_WINDOW_MS)return;

    pushPromise=(async()=>{
      await legacyPush();
      lastPushedRevision=targetRevision;
      lastPushCompletedAt=Date.now();
    })();

    try{return await pushPromise}
    finally{pushPromise=null}
  }

  async function coordinatedPull(){
    if(!pulseUser)return;
    if(pullPromise)return pullPromise;

    // Never let an automatic pull overtake a local mutation that is still waiting to reach cloud.
    if(revision!==lastPushedRevision){
      try{await coordinatedPush({force:true})}catch(e){
        console.warn('Pulse pre-pull push failed; keeping local state authoritative',e);
        throw e;
      }
    }

    pullPromise=Promise.resolve().then(()=>legacyPull());
    try{return await pullPromise}
    finally{pullPromise=null}
  }

  window.pulsePushAll=coordinatedPush;
  window.pulsePullAll=coordinatedPull;
  window.pulseSyncNow=()=>coordinatedPush({force:true});
  window.PulseSyncCoordinator={
    get revision(){return revision},
    get lastPushedRevision(){return lastPushedRevision},
    get pushing(){return !!pushPromise},
    get pulling(){return !!pullPromise},
    syncNow:window.pulseSyncNow
  };
})();