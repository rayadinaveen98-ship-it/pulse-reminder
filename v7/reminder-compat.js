// Pulse V7.0C — compatibility bridge for existing UI actions
(()=>{
  const domain=window.PulseReminders;
  if(!domain){console.error('PulseReminders domain missing');return}
  window.complete=function(id){const out=domain.complete(id);if(!out)return;state.sheet=null;state.detail=null;render();toast(out.nextDue?`Completed · next ${fmt(out.nextDue)}`:'Completed')};
  window.removeReminder=function(id){if(!confirm('Delete this reminder?'))return;if(domain.remove(id)){state.sheet=null;state.detail=null;render();toast('Deleted')}};
  window.duplicateReminder=function(id){if(domain.duplicate(id)){state.sheet=null;render();toast('Duplicated')}};
  window.toggleEnabled=function(id,v){if(domain.setEnabled(id,v)){state.sheet=null;render();toast(v?'Resumed':'Paused')}};
  window.snooze=function(id,m){if(domain.snooze(id,m)){state.sheet=null;render();toast('Snoozed')}};
  window.tomorrowMorning=function(id){let d=addDays(new Date(),1);d.setHours(9,0,0,0);if(domain.snoozeUntil(id,d)){state.sheet=null;render();toast('Snoozed until tomorrow')}};
  window.toggleSubtask=function(id,i,v){if(domain.setSubtask(id,i,v))render()};
  window.clearHistory=function(){if(confirm('Clear history?')){domain.clearHistory();render()}};
  window.restoreHistory=function(id){if(domain.restoreHistory(id)){render();toast('Restored')}};
})();
