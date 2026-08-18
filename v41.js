(()=>{
  const VERSION='4.1.0';
  const FP_KEY=()=>pulseUser?`pulse.sync.fp.${pulseUser.id}`:'pulse.sync.fp.none';
  const readFP=()=>{try{return JSON.parse(localStorage.getItem(FP_KEY())||'{}')}catch{return{}}};
  const writeFP=v=>localStorage.setItem(FP_KEY(),JSON.stringify(v));
  const esc41=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const fp=r=>JSON.stringify({title:r.title,notes:r.notes||'',category:r.category,type:r.type,priority:r.priority,due:r.due,repeat:r.repeat,alertOffset:Number(r.alertOffset||0),enabled:r.enabled!==false,persistent:!!r.persistent,subtasks:r.subtasks||[],completedSubtasks:r.completedSubtasks||[]});

  async function syncReminder(r){
    const row=pulseDbReminder(r);
    const {data:db,error}=await pulseCloud.from('reminders').upsert(row,{onConflict:'user_id,source_local_id'}).select('id').single();
    if(error)throw error;
    const rid=db.id;
    let q=await pulseCloud.from('reminder_subtasks').delete().eq('user_id',pulseUser.id).eq('reminder_id',rid);if(q.error)throw q.error;
    const subs=(r.subtasks||[]).map((title,i)=>({reminder_id:rid,user_id:pulseUser.id,title,is_completed:(r.completedSubtasks||[]).includes(i),position:i,completed_at:(r.completedSubtasks||[]).includes(i)?new Date().toISOString():null}));
    if(subs.length){q=await pulseCloud.from('reminder_subtasks').insert(subs);if(q.error)throw q.error;}
    q=await pulseCloud.from('reminder_alerts').delete().eq('user_id',pulseUser.id).eq('reminder_id',rid).eq('status','pending');if(q.error)throw q.error;
    if(r.due&&r.enabled!==false){
      const off=Number(r.alertOffset||0),alertAt=new Date(new Date(r.due).getTime()-off*60000).toISOString();
      q=await pulseCloud.from('reminder_alerts').insert({reminder_id:rid,user_id:pulseUser.id,alert_at:alertAt,offset_minutes:off,status:'pending'});if(q.error&&q.error.code!=='23505')throw q.error;
    }
    return rid;
  }

  async function incrementalPush(){
    if(!pulseUser||pulseSyncing)return;
    pulseSyncing=true;pulseSetCloudBadge('Syncing…');
    try{
      await pulseEnsureAccount();
      const old=readFP(),next={};
      for(const r of reminders){
        const key=String(r.id),hash=fp(r);next[key]=hash;
        if(old[key]!==hash)await syncReminder(r);
      }
      const {data:remote,error:re}=await pulseCloud.from('reminders').select('id,source_local_id').eq('user_id',pulseUser.id).is('deleted_at',null);if(re)throw re;
      const localIds=new Set(reminders.map(r=>String(r.id)));
      const gone=(remote||[]).filter(x=>x.source_local_id&&!localIds.has(String(x.source_local_id)));
      for(const x of gone){
        let q=await pulseCloud.from('reminders').update({deleted_at:new Date().toISOString(),status:'deleted'}).eq('id',x.id);if(q.error)throw q.error;
        q=await pulseCloud.from('reminder_alerts').update({status:'cancelled',updated_at:new Date().toISOString()}).eq('reminder_id',x.id).eq('status','pending');if(q.error)throw q.error;
      }
      const hRows=history.map(h=>({user_id:pulseUser.id,reminder_id:null,reminder_title:h.title||h.snapshot?.title||'Reminder',action:'completed',occurred_at:h.completedAt||new Date().toISOString(),metadata:{category:h.category||h.snapshot?.category||'Personal',snapshot:h.snapshot||null},source_local_id:String(h.hid||crypto.randomUUID())}));
      if(hRows.length){const {error}=await pulseCloud.from('completion_history').upsert(hRows,{onConflict:'user_id,source_local_id'});if(error)throw error;}
      const {error:se}=await pulseCloud.from('user_settings').upsert({user_id:pulseUser.id,theme:settings.theme||'dark',timezone:settings.timezone||'Asia/Kolkata',default_alert_minutes:Number(settings.defaultAlert??15),notifications_enabled:Notification.permission==='granted',persistent_notifications:!!settings.persistentByDefault,settings:{}},{onConflict:'user_id'});if(se)throw se;
      writeFP(next);localStorage.setItem('pulse.cloud.migrated.'+pulseUser.id,'1');pulseSetCloudBadge('Synced just now');
    }finally{pulseSyncing=false;}
  }
  window.pulsePushAll=incrementalPush;

  const originalPull=window.pulsePullAll;
  if(typeof originalPull==='function')window.pulsePullAll=async function(){await originalPull();if(pulseUser){const map={};reminders.forEach(r=>map[String(r.id)]=fp(r));writeFP(map);}};

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
      if(typeof state!=='undefined'&&state.tab==='settings')render();
    }catch(e){console.error('Pulse V4.1 reliability',e);if(!silent)alert(e.message||'Could not load reliability status');}
  }
  window.pulseV41RefreshReliability=()=>refreshReliability(false);

  async function disableDevice(id){
    if(!pulseUser)return;
    const current=localStorage.getItem('pulse.device.id')===id;
    const {error}=await pulseCloud.from('devices').update({is_active:false,updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',pulseUser.id);if(error){alert(error.message);return;}
    if(current){
      try{const reg=await navigator.serviceWorker.ready;const sub=await reg.pushManager.getSubscription();if(sub)await sub.unsubscribe();}catch(e){console.warn(e)}
      localStorage.removeItem('pulse.device.id');localStorage.setItem('pulse.push.connected','0');
    }
    await refreshReliability(true);if(typeof toast==='function')toast(current?'This device disconnected':'Device disabled');
  }
  window.pulseV41DisableDevice=disableDevice;

  async function retryFailed(){
    if(!pulseUser)return;
    const cutoff=new Date(Date.now()-24*60*60*1000).toISOString();
    const {error}=await pulseCloud.from('reminder_alerts').update({status:'pending',retry_count:0,last_error:null,updated_at:new Date().toISOString()}).eq('user_id',pulseUser.id).eq('status','failed').gte('alert_at',cutoff);
    if(error){alert(error.message);return;}if(typeof toast==='function')toast('Recent failed alerts queued for retry');await refreshReliability(true);
  }
  window.pulseV41RetryFailed=retryFailed;

  function fmtWhen(v){if(!v)return'—';return new Date(v).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'});}
  function reliabilityCards(){
    const active=reliability.devices.filter(d=>d.is_active),failed=reliability.alerts.filter(a=>a.status==='failed'),pending=reliability.alerts.filter(a=>a.status==='pending'),delivered=reliability.alerts.filter(a=>a.status==='delivered');
    const current=localStorage.getItem('pulse.device.id');
    const devices= reliability.devices.length?reliability.devices.map(d=>`<div class="history-item"><div class="history-check">${d.is_active?'✓':'×'}</div><div><h3>${esc41(d.device_name||d.platform||'Device')}${d.id===current?' · This device':''}</h3><p>${esc41(d.platform)} · ${d.is_active?'Active':'Disabled'} · Last seen ${fmtWhen(d.last_seen_at)}</p></div>${d.is_active?`<button class="secondary compact" onclick="pulseV41DisableDevice('${d.id}')">Disconnect</button>`:''}</div>`).join(''):'<p class="muted">No registered devices yet.</p>';
    const logs=reliability.deliveries.length?reliability.deliveries.slice(0,6).map(x=>`<div class="history-item"><div class="history-check">${x.status==='failed'?'!':'✓'}</div><div><h3>${x.status==='failed'?'Delivery failed':'Notification sent'}</h3><p>${fmtWhen(x.attempted_at)}${x.error_message?' · '+esc41(x.error_message):''}</p></div></div>`).join(''):'<p class="muted">No delivery records yet. New scheduled notifications will appear here.</p>';
    return `<article class="settings-card" id="v41-devices"><h2>Connected devices</h2><p class="muted">${active.length} active device${active.length===1?'':'s'} registered for push.</p>${devices}<button class="secondary" onclick="pulseV41RefreshReliability()">Refresh device status</button></article><article class="settings-card" id="v41-health"><h2>Delivery health</h2><div class="automation-summary"><div><span>Delivered</span><strong>${delivered.length}</strong></div><div><span>Pending</span><strong>${pending.length}</strong></div><div><span>Failed</span><strong>${failed.length}</strong></div></div>${logs}${failed.length?'<button class="secondary" onclick="pulseV41RetryFailed()">Retry recent failed alerts</button>':''}<small>Pulse retries partial device failures and keeps delivery logs per device.</small></article>`;
  }

  function inject(){
    document.querySelectorAll('.brand small').forEach(el=>el.textContent='V'+VERSION);
    document.querySelectorAll('.version-box b').forEach(el=>el.textContent='Pulse '+VERSION);
    document.querySelectorAll('.version-box p').forEach(el=>el.textContent='Multi-device reliability, delivery health and incremental cloud sync.');
    if(typeof state==='undefined'||state.tab!=='settings')return;
    const grid=document.querySelector('.settings-grid');if(!grid||document.getElementById('v41-devices'))return;
    grid.insertAdjacentHTML('beforeend',reliabilityCards());
    if(pulseUser&&!reliability.devices.length&&!reliability.alerts.length)setTimeout(()=>refreshReliability(true),0);
  }
  const oldRender=window.render;
  if(typeof oldRender==='function')window.render=function(){oldRender();inject();};
  window.PULSE_VERSION=VERSION;
  setTimeout(inject,0);
  if(pulseUser)setTimeout(()=>refreshReliability(true),300);
})();