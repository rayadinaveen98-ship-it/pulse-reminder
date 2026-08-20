(()=>{
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
      if(typeof pulseRegisterPush!=='function') throw new Error('Pulse push module failed to initialize. Please reload Pulse and try again.');
      await pulseRegisterPush();
      if(typeof toast==='function') toast('Push connected on this device ✓');
      render();
    }catch(e){
      console.error('Pulse push enable',e);
      alert(e.message||'Could not connect push notifications');
    }
  }

  // Compatibility bridge only. PulseRuntime is the single owner of app version display.
  window.requestNotifications=v4EnablePush;
  window.notificationText=pushStatusText;
})();