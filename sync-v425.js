// Pulse V4.2.11 — authoritative cloud pull boundary with durable alert preferences
(()=>{
const VERSION='4.2.11';
const offsets=r=>{const raw=Array.isArray(r.alertOffsets)?r.alertOffsets:[Number(r.alertOffset??settings.defaultAlert??0)],out=[...new Set(raw.map(Number).filter(n=>Number.isFinite(n)&&n>=0))].sort((a,b)=>b-a);return out.length?out:[0]};
const dbOffsets=x=>{const raw=Array.isArray(x.notification_offsets)?x.notification_offsets:[],out=[...new Set(raw.map(Number).filter(n=>Number.isFinite(n)&&n>=0))].sort((a,b)=>b-a);return out.length?out:[0]};
const fingerprint=r=>JSON.stringify({title:r.title,notes:r.notes||'',category:r.category,type:r.type,priority:r.priority,due:r.due,repeat:r.repeat,recurrenceConfig:r.recurrenceConfig||{},alertOffsets:offsets(r),enabled:r.enabled!==false,persistent:!!r.persistent,subtasks:r.subtasks||[],completedSubtasks:r.completedSubtasks||[]});
const writeFingerprints=()=>{if(!pulseUser)return;const map={};reminders.forEach(r=>map[String(r.id)]=fingerprint(r));localStorage.setItem(`pulse.sync.fp.${pulseUser.id}`,JSON.stringify(map))};
window.pulsePullAll=async function(){
  if(!pulseUser||pulsePulling||state?.modal)return;
  pulsePulling=true;
  try{
    const [rrq,ssq,hhq,usq]=await Promise.all([
      pulseCloud.from('reminders').select('*').eq('user_id',pulseUser.id).is('deleted_at',null).is('archived_at',null),
      pulseCloud.from('reminder_subtasks').select('*').eq('user_id',pulseUser.id).order('position'),
      pulseCloud.from('completion_history').select('*').eq('user_id',pulseUser.id).order('occurred_at',{ascending:false}),
      pulseCloud.from('user_settings').select('*').eq('user_id',pulseUser.id).maybeSingle()
    ]);
    const err=rrq.error||ssq.error||hhq.error||usq.error;if(err)throw err;
    if(state?.modal)return;
    const subs=new Map();
    (ssq.data||[]).forEach(x=>{if(!subs.has(x.reminder_id))subs.set(x.reminder_id,[]);subs.get(x.reminder_id).push(x)});
    reminders=(rrq.data||[]).map(x=>{
      const st=subs.get(x.id)||[],ao=dbOffsets(x);
      return{id:x.source_local_id||x.id,title:x.title,category:x.category,type:x.reminder_type==='automation'?'smart':x.reminder_type,priority:x.priority,due:x.due_at,repeat:x.recurrence_label||'Never',recurrenceConfig:x.recurrence_config||{},alertOffsets:ao,alertOffset:ao[0]??0,notes:x.notes||'',enabled:x.status!=='paused',persistent:!!x.persistent,subtasks:st.map(y=>y.title),completedSubtasks:st.map((y,i)=>y.is_completed?i:null).filter(i=>i!==null),lastResult:null}
    });
    history=(hhq.data||[]).map(x=>({hid:x.source_local_id||x.id,title:x.reminder_title,category:x.metadata?.category||'Personal',completedAt:x.occurred_at,snapshot:x.metadata?.snapshot||null}));
    if(usq.data)settings={...settings,theme:usq.data.theme==='system'?'dark':usq.data.theme,timezone:usq.data.timezone,defaultAlert:usq.data.default_alert_minutes,persistentByDefault:usq.data.persistent_notifications};
    pulseLocalSave();writeFingerprints();render();pulseSetCloudBadge('Synced from cloud');
  }finally{pulsePulling=false}
};
window.pulseStartRealtime=async function(){
  if(!pulseUser)return;
  if(pulseRealtime)await pulseCloud.removeChannel(pulseRealtime);
  let timer;
  const refresh=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(Date.now()<Number(window.pulseLocalSyncQuietUntil||0))return;if(!pulseSyncing&&!pulsePulling&&!state?.modal)pulsePullAll().catch(pulseCloudError)},1200)};
  pulseRealtime=pulseCloud.channel('pulse-'+pulseUser.id)
    .on('postgres_changes',{event:'*',schema:'public',table:'reminders',filter:`user_id=eq.${pulseUser.id}`},refresh)
    .on('postgres_changes',{event:'*',schema:'public',table:'reminder_subtasks',filter:`user_id=eq.${pulseUser.id}`},refresh)
    .on('postgres_changes',{event:'*',schema:'public',table:'completion_history',filter:`user_id=eq.${pulseUser.id}`},refresh)
    .subscribe();
};
if(pulseSyncTimer){clearTimeout(pulseSyncTimer);pulseSyncTimer=null}
const apply=()=>{document.querySelectorAll('.brand small').forEach(x=>x.textContent='V'+VERSION);document.querySelectorAll('.version-box b').forEach(x=>x.textContent='Pulse '+VERSION)};
const pr=window.render;window.render=function(){pr();apply()};apply();window.PULSE_VERSION=VERSION;
if(pulseUser)setTimeout(()=>pulseStartRealtime().catch(pulseCloudError),0)
})();