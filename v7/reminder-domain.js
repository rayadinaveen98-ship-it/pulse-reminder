// Pulse V7.0C — reminder domain/repository
// Owns reminder/history mutations. UI remains outside this layer.
(()=>{
  function persist(){ if(typeof window.save==='function') window.save(); }
  function find(id){ return reminders.find(r=>String(r.id)===String(id))||null; }
  function replaceAll(next){ reminders=next; persist(); return reminders; }
  function update(id,patch){ let found=false; reminders=reminders.map(r=>{if(String(r.id)!==String(id))return r;found=true;return {...r,...patch}}); if(found)persist(); return found?find(id):null; }
  function create(input={}){ const r={id:crypto.randomUUID(),enabled:true,completedSubtasks:[],...input}; reminders.unshift(r); persist(); return r; }
  function remove(id){ const before=reminders.length; reminders=reminders.filter(r=>String(r.id)!==String(id)); if(reminders.length!==before)persist(); return reminders.length!==before; }
  function duplicate(id){ const src=find(id); if(!src)return null; const copy={...src,id:crypto.randomUUID(),title:(src.title||'Reminder')+' copy',completedSubtasks:[]}; reminders.unshift(copy); persist(); return copy; }
  function setEnabled(id,value){ return update(id,{enabled:!!value}); }
  function snooze(id,minutes){ return update(id,{due:new Date(Date.now()+Number(minutes)*60000).toISOString()}); }
  function snoozeUntil(id,date){ const d=new Date(date); if(Number.isNaN(d.getTime()))return null; return update(id,{due:d.toISOString()}); }
  function setSubtask(id,index,checked){ const r=find(id); if(!r)return null; const done=Array.isArray(r.completedSubtasks)?r.completedSubtasks:[]; const next=checked?[...new Set([...done,Number(index)])]:done.filter(x=>Number(x)!==Number(index)); return update(id,{completedSubtasks:next}); }
  function complete(id,completedAt=new Date()){
    const r=find(id); if(!r)return null;
    const at=new Date(completedAt); if(Number.isNaN(at.getTime()))return null;
    const snapshot={...r,subtasks:[...(r.subtasks||[])],completedSubtasks:[...(r.completedSubtasks||[])]};
    history.unshift({hid:crypto.randomUUID(),title:r.title,category:r.category,completedAt:at.toISOString(),snapshot});
    const next=window.PulseRecurrence?.nextDue?window.PulseRecurrence.nextDue(r,at):null;
    reminders=next?reminders.map(x=>String(x.id)===String(id)?{...x,due:next,completedSubtasks:[]}:x):reminders.filter(x=>String(x.id)!==String(id));
    persist();
    return {reminder:r,nextDue:next,completedAt:at.toISOString()};
  }
  function restoreHistory(historyId,due=new Date(Date.now()+3600000)){
    const h=history.find(x=>String(x.hid)===String(historyId)); if(!h?.snapshot)return null;
    const restored={...h.snapshot,id:crypto.randomUUID(),due:new Date(due).toISOString(),enabled:true,completedSubtasks:[]};
    reminders.unshift(restored); persist(); return restored;
  }
  function clearHistory(){ history=[]; persist(); }
  window.PulseReminders=Object.freeze({find,create,update,remove,duplicate,setEnabled,snooze,snoozeUntil,setSubtask,complete,restoreHistory,clearHistory,replaceAll});
})();
