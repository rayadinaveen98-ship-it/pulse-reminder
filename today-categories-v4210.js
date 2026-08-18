// Pulse V4.2.10 — restore category filters on Today
(()=>{const baseToday=window.todayView;if(typeof baseToday!=='function')return;window.todayView=function(){return toolbar()+baseToday()};})();