// Pulse V6.3.1 — contextual recurrence controls. Presentation only; save/calc stay in recurrence-v427.js.
(()=>{
function apply(){const box=document.querySelector('.v427-recur');if(!box)return;const sel=box.querySelector('#fr427');if(!sel)return;const type=sel.value;const interval=box.querySelector('#finterval')?.closest('label');const month=box.querySelector('#fmonthday')?.closest('label');const after=box.querySelector('#fafter')?.closest('label');const days=box.querySelector('.v427-days');const note=box.querySelector(':scope > .muted');
const show=(el,on)=>{if(!el)return;el.hidden=!on;el.classList.toggle('v631-active',!!on)};
show(interval,type==='Every X days'||type==='Every X weeks');show(month,type==='Monthly');show(after,type==='After completion');show(days,type==='Selected days');
if(note){const copy={
'Never':'No repeat. This reminder ends after completion.',
'Daily':'Repeats every day at the same time.',
'Weekdays':'Repeats Monday through Friday.',
'Weekends':'Repeats on Saturday and Sunday.',
'Selected days':'Choose exactly which weekdays this reminder should repeat.',
'Every X days':'Set how many days should pass between occurrences.',
'Every X weeks':'Set how many weeks should pass between occurrences.',
'Monthly':'Choose the day of the month for the next occurrence.',
'After completion':'The next occurrence is scheduled only after you complete this one.'};note.textContent=copy[type]||''}
box.dataset.recurrenceType=type;
}
function decorate(){const sel=document.querySelector('.v427-recur #fr427');if(!sel)return;if(sel.dataset.v631!=='1'){sel.dataset.v631='1';sel.addEventListener('change',apply)}apply()}
if(window.PulseRuntime)PulseRuntime.afterRender(()=>requestAnimationFrame(decorate));
window.addEventListener('pulse:runtime-ready',()=>PulseRuntime.afterRender(()=>requestAnimationFrame(decorate)),{once:true});
new MutationObserver(()=>{if(document.querySelector('.v427-recur #fr427'))requestAnimationFrame(decorate)}).observe(document.documentElement,{childList:true,subtree:true});
setTimeout(decorate,0);
})();
