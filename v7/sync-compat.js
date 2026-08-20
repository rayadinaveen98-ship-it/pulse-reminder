// Pulse V7.0E — sync compatibility bridge
(()=>{
  const sync=window.PulseSync;if(!sync){console.error('PulseSync repository missing');return}
  window.pulseDbReminder=sync.toDbReminder;
  window.pulseAlertOffsets=sync.offsets;
  window.pulsePushAll=()=>sync.pushAll();
  window.pulsePullAll=()=>sync.pullAll();
})();
