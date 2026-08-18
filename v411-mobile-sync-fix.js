// Pulse V4.1.1 — iPhone cloud-sync compatibility + mobile version/UI consistency
(()=>{
  const VERSION='4.1.1';
  const notificationGranted=()=>('Notification' in window && Notification.permission==='granted');

  // iOS Safari can authenticate/sync even when Notification is not exposed in the tab.
  // Keep cloud account setup independent from Web Push capability.
  pulseEnsureAccount=async function(){
    if(!pulseUser)return;
    let q=await pulseCloud.from('profiles').upsert({id:pulseUser.id,display_name:pulseUser.email?.split('@')[0]||'Pulse user',timezone:settings.timezone||'Asia/Kolkata'},{onConflict:'id'});
    if(q.error)throw q.error;
    q=await pulseCloud.from('user_settings').upsert({user_id:pulseUser.id,theme:settings.theme||'dark',timezone:settings.timezone||'Asia/Kolkata',default_alert_minutes:Number(settings.defaultAlert??15),notifications_enabled:notificationGranted(),persistent_notifications:!!settings.persistentByDefault,settings:{}},{onConflict:'user_id'});
    if(q.error)throw q.error;
  };

  // V4.1 incremental sync also used Notification directly. Make it safe on iOS Safari.
  // The original function reads this global, so provide a harmless compatibility object only
  // on browsers where the Notifications API is absent. Push.js still correctly treats push as unsupported.
  if(!('Notification' in window)){
    try{Object.defineProperty(window,'Notification',{value:{permission:'default'},configurable:true});}catch{}
  }

  function patchMobileAndSettings(){
    document.querySelectorAll('.brand small').forEach(el=>el.textContent='V'+VERSION);
    document.querySelectorAll('.version-box b').forEach(el=>el.textContent='Pulse '+VERSION);
    document.querySelectorAll('.version-box p').forEach(el=>el.textContent='Cloud sync, multi-device reliability and real Web Push delivery.');

    // V3.1 created the mobile drawer and hard-coded its old release/status copy.
    const mobileVersion=document.querySelector('.mobile-drawer .brand small');
    if(mobileVersion)mobileVersion.textContent='V'+VERSION;
    const ds=document.querySelector('.mobile-drawer .drawer-status');
    if(ds){
      const b=ds.querySelector('b'),s=ds.querySelector('small');
      if(b)b.textContent=pulseUser?'Cloud sync':'Local mode';
      if(s)s.textContent=pulseUser?'Cloud connected':'Sign in to sync';
    }

    // Remove stale V3 wording from the base Settings card on every viewport.
    document.querySelectorAll('.settings-card').forEach(card=>{
      const h=card.querySelector('h2');
      if(h?.textContent.trim()==='Data & sync'){
        const b=card.querySelector('.status-line b'),p=card.querySelector('.status-line p');
        if(b)b.textContent=pulseUser?'Cloud storage active':'Local storage active';
        if(p)p.textContent=pulseUser?'Supabase is the cloud source of truth; local storage is the offline cache.':'Sign in to Pulse to sync this device.';
      }
    });
  }

  const priorRender=window.render;
  if(typeof priorRender==='function')window.render=function(){priorRender();patchMobileAndSettings();};
  window.PULSE_VERSION=VERSION;
  setTimeout(()=>{patchMobileAndSettings();if(pulseUser){pulseEnsureAccount().then(()=>pulsePullAll()).catch(pulseCloudError);}},0);
})();
