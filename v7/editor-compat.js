// Pulse V7.0D — editor compatibility adapter
// Owns the final Create/Edit submit boundary and routes writes through PulseReminders.
(()=>{
  const domain=window.PulseReminders;
  const recurrence=window.PulseRecurrence;
  if(!domain||!recurrence){console.error('Pulse V7 editor dependencies missing');return}

  const uniqueOffsets=values=>[...new Set(values.map(Number).filter(n=>Number.isFinite(n)&&n>=0))].sort((a,b)=>b-a);

  function recurrenceFromForm(form,existing={}){
    const type=form.querySelector('#fr427')?.value || form.querySelector('#fr')?.value || existing.repeat || 'Never';
    const config={
      type,
      interval:Math.max(1,Number(form.querySelector('#finterval')?.value || existing.recurrenceConfig?.interval || 1)),
      weekdays:[...form.querySelectorAll('[name=fweekday]:checked')].map(x=>Number(x.value)).filter(n=>n>=0&&n<=6).sort(),
      monthDay:Math.min(31,Math.max(1,Number(form.querySelector('#fmonthday')?.value || existing.recurrenceConfig?.monthDay || new Date(form.querySelector('#fd')?.value||Date.now()).getDate() || 1))),
      afterDays:Math.max(1,Number(form.querySelector('#fafter')?.value || existing.recurrenceConfig?.afterDays || 1))
    };
    if(config.type==='Selected days'&&!config.weekdays.length) throw new Error('Choose at least one weekday for Selected days.');
    return recurrence.normalize({...existing,repeat:type,recurrenceConfig:config,due:form.querySelector('#fd')?.value});
  }

  function payloadFromForm(form,existing={}){
    const title=form.querySelector('#ft')?.value.trim();
    if(!title) throw new Error('Add a title for this reminder.');
    const dueValue=form.querySelector('#fd')?.value;
    const due=new Date(dueValue);
    if(!dueValue||Number.isNaN(due.getTime())) throw new Error('Choose a valid date and time.');

    const offsets=uniqueOffsets([...form.querySelectorAll('[name=v42alert]:checked')].map(x=>x.value));
    if(!offsets.length) throw new Error('Choose at least one alert time.');

    const recurrenceConfig=recurrenceFromForm(form,existing);
    const type=form.querySelector('#fy')?.value || existing.type || 'reminder';
    return {
      title,
      category:form.querySelector('#fc')?.value || existing.category || 'Personal',
      type,
      due:due.toISOString(),
      repeat:recurrence.label(recurrenceConfig),
      recurrenceConfig,
      alertOffsets:offsets,
      alertOffset:offsets[0],
      priority:form.querySelector('#fp')?.value || existing.priority || 'normal',
      notes:form.querySelector('#fn')?.value.trim() || '',
      subtasks:(form.querySelector('#fs')?.value||'').split('\n').map(x=>x.trim()).filter(Boolean),
      persistent:!!form.querySelector('#fper')?.checked,
      ...(type==='smart'&&!existing.lastResult?{lastResult:'Waiting for first verified check'}:{})
    };
  }

  window.saveForm=function(event){
    event.preventDefault();
    const form=event.currentTarget;
    const modalState=state.modal?{...state.modal}:null;
    if(!modalState)return;
    try{
      const existing=modalState.mode==='edit'?domain.find(modalState.id):null;
      if(modalState.mode==='edit'&&!existing) throw new Error('This reminder could not be found. Refresh Pulse and try again.');
      const payload=payloadFromForm(form,existing||{});
      if(modalState.mode==='edit') domain.update(modalState.id,payload);
      else domain.create({...payload,enabled:true,completedSubtasks:[]});
      state.modal=null;
      render();
      toast(modalState.mode==='edit'?'Updated':'Saved');
    }catch(error){
      alert(error?.message||'Could not save this reminder.');
    }
  };

  window.PulseEditor=Object.freeze({payloadFromForm,recurrenceFromForm});
})();
