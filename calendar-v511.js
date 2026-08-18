// Pulse Calendar polish — runtime-ready
(()=>{
const catClass=r=>`cat-${(cats[r.category]?.[1]||'blue').replace(/[^a-z0-9-]/gi,'')}`;
const localDue=(d,h=9,m=0)=>{let x=new Date(d);x.setHours(h,m,0,0);return x.toISOString()};
window.pulseCalendarCreateOnDate=function(s){let d=new Date(s+'T12:00:00'),now=new Date(),hour=9,minute=0;if(d.toDateString()===now.toDateString()){let n=new Date(now.getTime()+60*60000);hour=n.getHours();minute=Math.ceil(n.getMinutes()/5)*5;if(minute>=60){hour++;minute=0}}state.modal={mode:'create',preset:'reminder',draft:{due:localDue(d,hour,minute),alertOffsets:[Number(settings.defaultAlert??15)],persistent:!!settings.persistentByDefault}};render()};
window.pulseCalendarDateAction=function(s,hasEvents){if(hasEvents){pulseCalendarPickDate(s);return}pulseCalendarCreateOnDate(s)};
const oldOpen=window.pulseCalendarOpenEvent;window.pulseCalendarOpenEvent=function(id,e){e?.stopPropagation();oldOpen(id,e)};
function decorate(){if(state.tab!=='calendar')return;document.querySelectorAll('.v510-daycell').forEach(cell=>{let date=cell.getAttribute('data-date'),has=cell.getAttribute('data-has-events')==='1';if(date){cell.onclick=()=>pulseCalendarDateAction(date,has);cell.title=has?'Open day':'Create reminder on this date'}});document.querySelectorAll('.v510-event').forEach(el=>{let id=el.getAttribute('data-reminder-id');if(!id)return;let r=reminders.find(x=>String(x.id)===String(id));if(r)el.classList.add(catClass(r))});document.querySelectorAll('.v510-agenda-item').forEach(el=>{let id=el.getAttribute('data-reminder-id');if(!id)return;let r=reminders.find(x=>String(x.id)===String(id));if(r)el.classList.add(catClass(r))})}
if(window.PulseRuntime)PulseRuntime.afterRender(decorate);else{const oldRender=window.render;window.render=function(){oldRender();decorate()}}
render();
})();