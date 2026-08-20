(()=>{
  // Pulse V4.1 compatibility module — reliability UI only.
  // Sync ownership now lives in V4.2 + sync-v425; version ownership lives in PulseRuntime.
  const esc41=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  let reliability={devices:[],deliveries:[],alerts:[]};

  async function refreshReliability(silent=false){
    if(!pulseUser)return;
    try{
      const [d,n,a]=await Promise.all([
        pulseCloud.from('devices').select('id,device_name,platform,is_active,last_seen_at,created_at').eq('user_id',pulseUser.id).order('last_seen_at',{ascending:false}),
        pulseCloud.from('notification_deliveries').select('id,reminder_id,alert_id,device_id,status,error_message,attempted_at,delivered_at,metadata').eq('user_id',pulseUser.id).order('attempted_at',{ascending:false}).limit(12),
        pulseCloud.from('reminder_alerts').select('id,reminder_id,status,retry_count,last_error,alert_at,delivered_at').eq('user_id',pulseUser.id).order('updated_at',{ascending:false}).limit(20)
      ]);
      if(d.error||n.error||a.error)throw(d.error||n.error||a.error);
      reliability={devices:d.data||[],deliveries:n.data||[],alerts:a.data||[]};
      if(!silent&&typeof toast==='function')toast('Reliability status refreshed');
      if(typeof state!=='undefined'&&state.tab==='settings'&&!state.modal)render();
    }catch(e){
      console.error('Pulse reliability',e);
      if(!silent)alert(e.message||'Could not load reliability status');
    }
  }
  window.pulseV41RefreshReliability=()=>refreshReliability(false);

  async function disableDevice(id){
    if(!pulseUser)return;
    const current=localStorage.getItem('pulse.device.id')===id;
    const {error}=await pulseCloud.from('devices').update({is_active:false,updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',pulseUser.id);
    if(error){alert(error.message);return;}
    if(current){
      try{const reg=await navigator.serviceWorker.ready;const sub=await reg.pushManager.getSubscription();if(sub)await sub.unsubscribe();}catch(e){console.warn(e)}
      localStorage.removeItem('pulse.device.id');
      localStorage.setItem('pulse.push.connected','0');
    }
    await refreshReliability(true);
    if(typeof toast==='function')toast(current?'This device disconnected':'Device disabled');
  }
  window.pulseV41DisableDevice=disableDevice;

  async function retryFailed(){
    if(!pulseUser)return;
    const cutoff=new Date(Date.now()-24*60*60*1000).toISOString();
    const {error}=await pulseCloud.from('reminder_alerts').update({status:'pending',retry_count:0,last_error:null,updated_at:new Date().toISOString()}).eq('user_id',pulseUser.id).eq('status','failed').gte('alert_at',cutoff);
    if(error){alert(error.message);return;}
    if(typeof toast==='function')toast('Recent failed alerts queued for retry');
    await refreshReliability(true);
  }
  window.pulseV41RetryFailed=retryFailed;

  function fmtWhen(v){
    if(!v)return'—';
    return new Date(v).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'});
  }

  function reliabilityCards(){
    const active=reliability.devices.filter(d=>d.is_active),failed=reliability.alerts.filter(a=>a.status==='failed'),pending=reliability.alerts.filter(a=>a.status==='pending'),delivered=reliability.alerts.filter(a=>a.status==='delivered');
    const current=localStorage.getItem('pulse.device.id');
    const devices=reliability.devices.length?reliability.devices.map(d=>`<div class="history-item"><div class="history-check">${d.is_active?'✓':'×'}</div><div><h3>${esc41(d.device_name||d.platform||'Device')}${d.id===current?' · This device':''}</h3><p>${esc41(d.platform)} · ${d.is_active?'Active':'Disabled'} · Last seen ${fmtWhen(d.last_seen_at)}</p></div>${d.is_active?`<button class="secondary compact" onclick="pulseV41DisableDevice('${d.id}')">Disconnect</button>`:''}</div>`).join(''):'<p class="muted">No registered devices yet.</p>';
    const logs=reliability.deliveries.length?reliability.deliveries.slice(0,6).map(x=>`<div class="history-item"><div class="history-check">${x.status==='failed'?'!':'✓'}</div><div><h3>${x.status==='failed'?'Delivery failed':'Notification sent'}</h3><p>${fmtWhen(x.attempted_at)}${x.error_message?' · '+esc41(x.error_message):''}</p></div></div>`).join(''):'<p class="muted">No delivery records yet. New scheduled notifications will appear here.</p>';
    return `<article class="settings-card" id="v41-devices"><h2>Connected devices</h2><p class="muted">${active.length} active device${active.length===1?'':'s'} registered for push.</p>${devices}<button class="secondary" onclick="pulseV41RefreshReliability()">Refresh device status</button></article><article class="settings-card" id="v41-health"><h2>Delivery health</h2><div class="automation-summary"><div><span>Delivered</span><strong>${delivered.length}</strong></div><div><span>Pending</span><strong>${pending.length}</strong></div><div><span>Failed</span><strong>${failed.length}</strong></div></div>${logs}${failed.length?'<button class="secondary" onclick="pulseV41RetryFailed()">Retry recent failed alerts</button>':''}<small>Pulse retries partial device failures and keeps delivery logs per device.</small></article>`;
  }

  function inject(){
    if(typeof state==='undefined'||state.tab!=='settings')return;
    const grid=document.querySelector('.settings-grid');
    if(!grid||document.getElementById('v41-devices'))return;
    grid.insertAdjacentHTML('beforeend',reliabilityCards());
    if(pulseUser&&!reliability.devices.length&&!reliability.alerts.length)setTimeout(()=>refreshReliability(true),0);
  }

  window.addEventListener('pulse:runtime-ready',e=>e.detail?.afterRender?.(inject),{once:true});
  setTimeout(inject,0);
})();
