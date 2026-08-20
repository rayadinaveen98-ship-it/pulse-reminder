// Pulse V7.0B — pure recurrence domain engine
// No DOM, storage, cloud, render, or global reminder mutation lives here.
(()=>{
  const TYPES=['Never','Daily','Weekdays','Weekends','Selected days','Every X days','Every X weeks','Monthly','After completion'];
  const DAYS=[['Sun',0],['Mon',1],['Tue',2],['Wed',3],['Thu',4],['Fri',5],['Sat',6]];

  function normalize(reminder={}){
    const raw=reminder.recurrenceConfig||{};
    const due=new Date(reminder.due||Date.now());
    const type=TYPES.includes(raw.type)?raw.type:(TYPES.includes(reminder.repeat)?reminder.repeat:'Never');
    return {
      type,
      interval:Math.max(1,Number(raw.interval||1)),
      weekdays:Array.isArray(raw.weekdays)?[...new Set(raw.weekdays.map(Number).filter(n=>n>=0&&n<=6))].sort():[],
      monthDay:Math.min(31,Math.max(1,Number(raw.monthDay||due.getDate()||1))),
      afterDays:Math.max(1,Number(raw.afterDays||1))
    };
  }

  function label(input={}){
    const c=input.type?input:normalize(input);
    if(c.type==='Selected days') return c.weekdays.length?c.weekdays.map(n=>DAYS.find(x=>x[1]===n)?.[0]).filter(Boolean).join(', '):'Selected days';
    if(c.type==='Every X days') return `Every ${c.interval} day${c.interval===1?'':'s'}`;
    if(c.type==='Every X weeks') return `Every ${c.interval} week${c.interval===1?'':'s'}`;
    if(c.type==='Monthly') return `Monthly · day ${c.monthDay}`;
    if(c.type==='After completion') return `${c.afterDays} day${c.afterDays===1?'':'s'} after completion`;
    return c.type;
  }

  function nextDue(reminder,completedAt=new Date()){
    const c=normalize(reminder);
    let d=new Date(reminder.due);
    const now=new Date(completedAt);
    if(Number.isNaN(d.getTime())||Number.isNaN(now.getTime())) return null;

    const advance=()=>{
      switch(c.type){
        case 'Daily': d.setDate(d.getDate()+1); break;
        case 'Weekdays': do d.setDate(d.getDate()+1); while([0,6].includes(d.getDay())); break;
        case 'Weekends': do d.setDate(d.getDate()+1); while(![0,6].includes(d.getDay())); break;
        case 'Selected days':
          if(!c.weekdays.length) return false;
          do d.setDate(d.getDate()+1); while(!c.weekdays.includes(d.getDay()));
          break;
        case 'Every X days': d.setDate(d.getDate()+c.interval); break;
        case 'Every X weeks': d.setDate(d.getDate()+7*c.interval); break;
        case 'Monthly': {
          const h=d.getHours(),m=d.getMinutes(),y=d.getFullYear(),mo=d.getMonth()+1;
          const last=new Date(y,mo+1,0).getDate();
          d=new Date(y,mo,Math.min(c.monthDay,last),h,m,0,0);
          break;
        }
        case 'After completion': {
          const old=new Date(reminder.due);
          d=new Date(now);
          d.setDate(d.getDate()+c.afterDays);
          d.setHours(old.getHours(),old.getMinutes(),0,0);
          break;
        }
        default: return false;
      }
      return true;
    };

    if(!advance()) return null;
    if(c.type!=='After completion') while(d<=now) if(!advance()) return null;
    return d.toISOString();
  }

  window.PulseRecurrence=Object.freeze({TYPES:Object.freeze([...TYPES]),DAYS:Object.freeze(DAYS.map(x=>Object.freeze([...x]))),normalize,label,nextDue});
})();
