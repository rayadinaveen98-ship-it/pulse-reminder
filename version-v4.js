(()=>{
  const VERSION='4.1.0';

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

  // push.js is the single owner of the Push Delivery settings card.
  window.requestNotifications=v4EnablePush;
  window.notificationText=pushStatusText;

  const patch=()=>{
    document.querySelectorAll('.brand small').forEach(el=>el.textContent='V'+VERSION);
    document.querySelectorAll('.version-box b').forEach(el=>el.textContent='Pulse '+VERSION);
    document.querySelectorAll('.version-box p').forEach(el=>el.textContent='Multi-device reliability, delivery health and incremental cloud sync.');
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