(()=>{
  const VERSION='4.0.2';

  function pushStatusText(){
    if(!('Notification' in window)) return 'Notifications unavailable';
    if(Notification.permission==='denied') return 'Notifications blocked';
    const connected=localStorage.getItem('pulse.device.id');
    if(Notification.permission==='granted'&&connected) return 'Push connected';
    if(Notification.permission==='granted') return 'Permission granted';
    return 'Enable notifications';
  }

  async function v4EnablePush(){
    try{
      if(typeof pulseRegisterPush!=='function') throw new Error('Pulse push module failed to initialize. Please reload once; if this persists, Pulse will report it as a V4 module error.');
      await pulseRegisterPush();
      if(typeof toast==='function') toast('Push connected on this device ✓');
      render();
    }catch(e){
      console.error('Pulse V4 push enable',e);
      alert(e.message||'Could not connect push notifications');
    }
  }

  window.requestNotifications=v4EnablePush;
  window.notificationText=pushStatusText;

  const originalSettingsView=window.settingsView;
  if(typeof originalSettingsView==='function'){
    window.settingsView=function(){
      let html=originalSettingsView();
      const iosNeedsInstall=typeof pulseIsIOS==='function'&&pulseIsIOS()&&typeof pulseIsStandalone==='function'&&!pulseIsStandalone();
      const status=pushStatusText();
      const pushCard=`<article class="settings-card" id="push-delivery-core"><h2>Push delivery</h2><div class="status-line"><span class="status-dot"></span><div><b>${status}</b><p>${iosNeedsInstall?'On iPhone, add Pulse to Home Screen and open it there before enabling push.':'This registers this browser/device with Pulse for real scheduled server push.'}</p></div></div><button class="secondary" onclick="requestNotifications()">Enable on this device</button><button class="secondary" onclick="pulseTestPush()">Send test push now</button><small>Permission alone is not enough. “Push connected” means Supabase has a real subscription for this device.</small></article>`;
      if(html.includes('<section class="settings-grid">')) html=html.replace('<section class="settings-grid">','<section class="settings-grid">'+pushCard);
      return html;
    };
  }

  const patch=()=>{
    document.querySelectorAll('.brand small').forEach(el=>el.textContent='V'+VERSION);
    document.querySelectorAll('.version-box b').forEach(el=>el.textContent='Pulse '+VERSION);
    document.querySelectorAll('.version-box p').forEach(el=>el.textContent='Cloud sync + real Web Push scheduler active.');
    document.querySelectorAll('.sidebar-action').forEach(btn=>{
      if(btn.textContent.includes('Notification')||btn.textContent.includes('Push')||btn.textContent.includes('Permission')) btn.innerHTML='🔔 '+pushStatusText();
    });
  };

  const oldRender=window.render;
  if(typeof oldRender==='function') window.render=function(){oldRender();patch();};
  document.addEventListener('DOMContentLoaded',patch);
  setTimeout(()=>{patch();if(typeof state!=='undefined'&&state.tab==='settings')render();},0);
  window.PULSE_VERSION=VERSION;
})();