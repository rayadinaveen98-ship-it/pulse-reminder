// Pulse V7.0A — central immutable app configuration.
(()=>{
  if(window.PulseConfig)return;
  const config=Object.freeze({
    appName:'Pulse',
    version:'7.0.0-foundation',
    stage:'V7.0A',
    timezoneFallback:'Asia/Kolkata',
    defaultAlertMinutes:15,
    runtimeCompatibility:'6.0A',
    serviceWorkerUrl:'/sw.js?v=6.10.0'
  });
  Object.defineProperty(window,'PulseConfig',{value:config,writable:false,configurable:false});
  window.PULSE_APP_VERSION=config.version;
})();
