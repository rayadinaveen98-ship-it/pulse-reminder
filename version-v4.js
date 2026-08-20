(()=>{
  function pushStatusText(){
    if(!('Notification' in window)) return 'Notifications unavailable';
    if(Notification.permission==='denied') return 'Notifications blocked';
    const connected=localStorage.getItem('pulse.device.id');
    if(Notification.permission==='granted'&&connected) return 'Push connected';
    if(Notification.permission==='granted') return 'Permission granted';
    return 'Enable notifications';
  }

  async function enablePush(){
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

  function exportCurrentData(){
    const version=window.PulseRuntime?.stage||window.PULSE_VERSION||'6.0A';
    const b=new Blob([JSON.stringify({version,reminders,history,settings},null,2)],{type:'application/json'}),a=document.createElement('a');
    a.href=URL.createObjectURL(b);
    a.download='pulse-backup.json';
    a.click();
    if(typeof toast==='function')toast('Backup exported');
  }

  // Compatibility bridge only. PulseRuntime owns app version display.
  window.requestNotifications=enablePush;
  window.notificationText=pushStatusText;
  window.exportData=exportCurrentData;
})();