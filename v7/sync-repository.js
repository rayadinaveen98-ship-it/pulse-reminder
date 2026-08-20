// Pulse V7.0G — cloud sync repository
// Sole owner of cloud/domain mapping and authoritative reminder/history pull/push.
(()=>{
  const offsets=r=>{const raw=Array.isArray(r.alertOffsets)?r.alertOffsets:[Number(r.alertOffset??settings.defaultAlert??0)];const out=[...new Set(raw.map(Number).filter(n=>Number.isFinite(n)&&n>=0))].sort((a,b)=>b-a);return out.length?out:[0]};
  const dbOffsets=x=>{const raw=Array.isArray(x.notification_offsets)?x.notification_offsets:[];const out=[...new Set(raw.map(Number).filter(n=>Number.isFinite(n)&&n>=0))].sort((a,b)=>b-a);return out.length?out:[0]};
  const fingerprint=r=>JSON.stringify({title:r.title,notes:r.notes||'',category:r.category,type:r.type,priority:r.priority,due:r.due,repeat:r.repeat,recurrenceConfig:r.recurrenceConfig||{},alertOffsets:offsets(r),enabled:r.enabled!==false,persistent:!!r.persistent,subtasks:r.subtasks||[],completedSubtasks:r.completedSubtasks||[]});
  const fpKey=()=>`pulse.sync.fp.${pulseUser?.id||'none'}`;
  const readFp=()=>{try{return JSON.parse(localStorage.getItem(fpKey())||'{}')}catch{return{}}};
  const writeFp=map=>localStorage.setItem(fpKey(),JSON.stringify(map));

  function toDbReminder(r){return{user_id:pulseUser.id,title:r.title,notes:r.notes||'',category:r.category||'Personal',reminder_type:r.type||'reminder',priority:r.priority||'normal',status:r.enabled===false?'paused':'active',due_at:r.due||null,timezone:settings.timezone||'Asia/Kolkata',recurrence_rule:null,recurrence_label:r.repeat||'Never',recurrence_config:r.recurrenceConfig||{},notification_offsets:offsets(r),persistent:!!r.persistent,calendar_sync_mode:'off',source_local_id:String(r.id),completed_at:null,archived_at:null,deleted_at:null}}
  function fromDbReminder(x,subtasks=[]){const ao=dbOffsets(x);return{id:x.source_local_id||x.id,title:x.title,category:x.category,type:x.reminder_type==='automation'?'smart':x.reminder_type,priority:x.priority,due:x.due_at,repeat:x.recurrence_label||'Never',recurrenceConfig:x.recurrence_config||{},alertOffsets:ao,alertOffset:ao[0]??0,notes:x.notes||'',enabled:x.status!=='paused',persistent:!!x.persistent,subtasks:subtasks.map(y=>y.title),completedSubtasks:subtasks.map((y,i)=>y.is_completed?i:null).filter(i=>i!==null),lastResult:null}}
  function toDbHistory(h){return{user_id:pulseUser.id,reminder_id:null,reminder_title:h.title||h.snapshot?.title||'Reminder',action:'completed',occurred_at:h.completedAt||new Date().toISOString(),metadata:{category:h.category||h.snapshot?.category||'Personal',snapshot:h.snapshot||null},source_local_id:String(h.hid)}}
  function fromDbHistory(x){return{hid:x.source_local_id||x.id,title:x.reminder_title,category:x.metadata?.category||'Personal',completedAt:x.occurred_at,snapshot:x.metadata?.snapshot||null}}
  function applySettings(x){if(!x)return;settings={...settings,theme:x.theme==='system'?'dark':x.theme,timezone:x.timezone,defaultAlert:x.default_alert_minutes,persistentByDefault:x.persistent_notifications}}

  async function pushOne(r){
    let q=await pulseCloud.from('reminders').upsert(toDbReminder(r),{onConflict:'user_id,source_local_id'}).select('id').single();if(q.error)throw q.error;const rid=q.data.id;
    q=await pulseCloud.from('reminder_subtasks').delete().eq('user_id',pulseUser.id).eq('reminder_id',rid);if(q.error)throw q.error;
    const subs=(r.subtasks||[]).map((title,i)=>({reminder_id:rid,user_id:pulseUser.id,title,is_completed:(r.completedSubtasks||[]).includes(i),position:i,completed_at:(r.completedSubtasks||[]).includes(i)?new Date().toISOString():null}));
    if(subs.length){q=await pulseCloud.from('reminder_subtasks').insert(subs);if(q.error)throw q.error}
    q=await pulseCloud.from('reminder_alerts').update({status:'cancelled',updated_at:new Date().toISOString()}).eq('user_id',pulseUser.id).eq('reminder_id',rid).eq('status','pending');if(q.error)throw q.error;
    if(r.due&&r.enabled!==false)for(const off of offsets(r)){const at=new Date(new Date(r.due).getTime()-off*60000).toISOString();q=await pulseCloud.from('reminder_alerts').insert({reminder_id:rid,user_id:pulseUser.id,alert_at:at,offset_minutes:off,status:'pending',alert_kind:'scheduled',repeat_sequence:0});if(q.error&&q.error.code!=='23505')throw q.error;if(q.error?.code==='23505'){q=await pulseCloud.from('reminder_alerts').update({status:'pending',offset_minutes:off,alert_kind:'scheduled',repeat_sequence:0,retry_count:0,last_error:null,delivered_at:null,updated_at:new Date().toISOString()}).eq('reminder_id',rid).eq('alert_at',at);if(q.error)throw q.error}}
  }

  async function pushHistory(){
    const rows=(history||[]).filter(h=>h?.hid).map(toDbHistory);if(!rows.length)return;
    const q=await pulseCloud.from('completion_history').upsert(rows,{onConflict:'user_id,source_local_id'});if(q.error)throw q.error;
  }

  async function pushAll(){
    if(!pulseUser||pulseSyncing)return;pulseSyncing=true;pulseSetCloudBadge('Syncing…');
    try{await pulseEnsureAccount();const old=readFp(),next={};for(const r of reminders){const k=String(r.id),hash=fingerprint(r);next[k]=hash;if(old[k]!==hash)await pushOne(r)}
      let {data,error}=await pulseCloud.from('reminders').select('id,source_local_id').eq('user_id',pulseUser.id).is('deleted_at',null);if(error)throw error;const ids=new Set(reminders.map(r=>String(r.id)));
      for(const x of(data||[]).filter(x=>x.source_local_id&&!ids.has(String(x.source_local_id)))){let q=await pulseCloud.from('reminders').update({deleted_at:new Date().toISOString(),status:'deleted'}).eq('id',x.id);if(q.error)throw q.error;q=await pulseCloud.from('reminder_alerts').update({status:'cancelled',updated_at:new Date().toISOString()}).eq('reminder_id',x.id).eq('status','pending');if(q.error)throw q.error}
      await pushHistory();writeFp(next);window.pulseLocalSyncQuietUntil=Date.now()+3500;pulseSetCloudBadge('Synced just now');
    }finally{pulseSyncing=false}
  }

  async function pullAll(){
    if(!pulseUser||pulsePulling||state?.modal)return;pulsePulling=true;
    try{const [rrq,ssq,hhq,usq]=await Promise.all([pulseCloud.from('reminders').select('*').eq('user_id',pulseUser.id).is('deleted_at',null).is('archived_at',null),pulseCloud.from('reminder_subtasks').select('*').eq('user_id',pulseUser.id).order('position'),pulseCloud.from('completion_history').select('*').eq('user_id',pulseUser.id).order('occurred_at',{ascending:false}),pulseCloud.from('user_settings').select('*').eq('user_id',pulseUser.id).maybeSingle()]);const err=rrq.error||ssq.error||hhq.error||usq.error;if(err)throw err;if(state?.modal)return;
      const subs=new Map();(ssq.data||[]).forEach(x=>{if(!subs.has(x.reminder_id))subs.set(x.reminder_id,[]);subs.get(x.reminder_id).push(x)});
      const nextReminders=(rrq.data||[]).map(x=>fromDbReminder(x,subs.get(x.id)||[]));const nextHistory=(hhq.data||[]).map(fromDbHistory);
      if(window.PulseReminders?.replaceAll)window.PulseReminders.replaceAll(nextReminders);else reminders=nextReminders;history=nextHistory;applySettings(usq.data);pulseLocalSave();const map={};nextReminders.forEach(r=>map[String(r.id)]=fingerprint(r));writeFp(map);render();pulseSetCloudBadge('Synced from cloud');return nextReminders;
    }finally{pulsePulling=false}
  }

  window.PulseSync=Object.freeze({offsets,fingerprint,toDbReminder,fromDbReminder,toDbHistory,fromDbHistory,pushOne,pushHistory,pushAll,pullAll});
  try{window.dispatchEvent(new CustomEvent('pulse:sync-ready',{detail:window.PulseSync}))}catch{}
})();
