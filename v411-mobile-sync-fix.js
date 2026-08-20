// Pulse V4.1.1 compatibility — iPhone cloud sync + settings/mobile status only
(()=>{
  const notificationGranted=()=>('Notification' in window&&Notification.permission==='granted');

  pulseEnsureAccount=async function(){
    if(!pulseUser)return;
    let q=await pulseCloud.from('profiles').upsert({id:pulseUser.id,display_name:pulseUser.email?.split('@')[0]||'Pulse user',timezone:settings.timezone||'Asia/Kolkata'},{onConflict:'id'});
    if(q.error)throw q.error;
    q=await pulseCloud.from('user_settings').upsert({user_id:pulseUser.id,theme:settings.theme||'dark',timezone:settings.timezone||'Asia/Kolkata',default_alert_minutes:Number(settings.defaultAlert??15),notifications_enabled:notificationGranted(),persistent_notifications:!!settings.persistentByDefault,settings:{}},{onConflict:'user_id'});
    if(q.error)throw q.error;
  };

  if(!('Notification' in window)){
    try{Object.defineProperty(window,'Notification',{value:{permission:'default'},configurable:true});}catch{}
  }

  function patchMobileAndSettings(){
    const ds=document.querySelector('.mobile-drawer .drawer-status');
    if(ds){
      const b=ds.querySelector('b'),s=ds.querySelector('small');
      if(b)b.textContent=pulseUser?'Cloud sync':'Local mode';
      if(s)s.textContent=pulseUser?'Cloud connected':'Sign in to sync';
    }
    document.querySelectorAll('.settings-card').forEach(card=>{
      const h=card.querySelector('h2');
      if(h?.textContent.trim()==='Data & sync'){
        const b=card.querySelector('.status-line b'),p=card.querySelector('.status-line p');
        if(b)b.textContent=pulseUser?'Cloud storage active':'Local storage active';
        if(p)p.textContent=pulseUser?'Supabase is the cloud source of truth; local storage is the offline cache.':'Sign in to Pulse to sync this device.';
      }
    });
  }

  window.addEventListener('pulse:runtime-ready',e=>e.detail?.afterRender?.(patchMobileAndSettings),{once:true});
  setTimeout(patchMobileAndSettings,0);
})();
