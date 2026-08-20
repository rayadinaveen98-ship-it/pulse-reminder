// Pulse V7.0G compatibility — Supabase realtime bridge only
(()=>{
window.pulseStartRealtime=async function(){
  if(!pulseUser||!window.PulseSync)return false;
  if(pulseRealtime)await pulseCloud.removeChannel(pulseRealtime);
  let timer;
  const refresh=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(Date.now()<Number(window.pulseLocalSyncQuietUntil||0))return;if(!pulseSyncing&&!pulsePulling&&!state?.modal)PulseSync.pullAll().catch(pulseCloudError)},1200)};
  pulseRealtime=pulseCloud.channel('pulse-'+pulseUser.id)
    .on('postgres_changes',{event:'*',schema:'public',table:'reminders',filter:`user_id=eq.${pulseUser.id}`},refresh)
    .on('postgres_changes',{event:'*',schema:'public',table:'reminder_subtasks',filter:`user_id=eq.${pulseUser.id}`},refresh)
    .on('postgres_changes',{event:'*',schema:'public',table:'completion_history',filter:`user_id=eq.${pulseUser.id}`},refresh)
    .subscribe();
  return true;
};
if(pulseSyncTimer){clearTimeout(pulseSyncTimer);pulseSyncTimer=null}
if(pulseUser)setTimeout(()=>pulseStartRealtime().catch(pulseCloudError),0);
})();
