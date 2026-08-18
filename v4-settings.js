(()=>{
  function ensurePushCard(){
    if(!window.state||state.tab!=='settings') return;
    const grid=document.querySelector('.settings-grid');
    if(!grid||document.getElementById('push-test-card')) return;
    const el=document.createElement('article');
    el.id='push-test-card';
    el.className='settings-card';
    const ios=typeof pulseIsIOS==='function'&&pulseIsIOS();
    const standalone=typeof pulseIsStandalone==='function'&&pulseIsStandalone();
    el.innerHTML=`<h2>Push delivery</h2><p class="muted">Connect this device to Pulse so reminders can arrive while Pulse is minimized or closed.</p><div class="status-line"><span class="status-dot"></span><div><b id="pulse-push-status">Checking device…</b><p>Browser permission alone is not enough; this device also needs a Web Push subscription.</p></div></div><button class="secondary" onclick="requestNotifications()">Enable on this device</button><button class="secondary" onclick="pulseTestPush()">Send test push now</button><small>${ios&&!standalone?'On iPhone, add Pulse to the Home Screen and open it from there first.':'A successful test uses the real Supabase → Web Push → service worker path.'}</small>`;
    grid.prepend(el);
    refreshStatus();
  }
  async function refreshStatus(){
    const out=document.getElementById('pulse-push-status');
    if(!out) return;
    try{
      if(!('Notification' in window)){out.textContent='Notifications unsupported';return;}
      if(Notification.permission!=='granted'){out.textContent=Notification.permission==='denied'?'Permission blocked':'Permission not granted';return;}
      if(!('serviceWorker' in navigator)||!('PushManager' in window)){out.textContent='Web Push unsupported';return;}
      const reg=await navigator.serviceWorker.ready;
      const sub=await reg.pushManager.getSubscription();
      out.textContent=sub?'Push connected ✓':'Permission granted — device not connected';
    }catch(e){out.textContent='Could not verify push state';}
  }
  const previous=window.render;
  if(typeof previous==='function'){
    window.render=function(){previous();queueMicrotask(ensurePushCard);};
  }
  document.addEventListener('DOMContentLoaded',()=>setTimeout(ensurePushCard,0));
  window.pulseRefreshPushStatus=refreshStatus;
})();