// Pulse V4.0B reliability hotfix
const pulseIsIOS=/iPad|iPhone|iPod/.test(navigator.userAgent);
const pulseIsStandalone=window.matchMedia?.('(display-mode: standalone)').matches||window.navigator.standalone===true;

// Give clear platform-specific notification guidance. On iOS, Web Push permission
// is available to Home Screen web apps, not a normal Safari tab.
notificationText=function(){
  if(pulseIsIOS&&!pulseIsStandalone)return 'Install Pulse for notifications';
  if(!('Notification' in window))return 'Notifications unavailable';
  return Notification.permission==='granted'?'Notifications enabled':'Enable notifications';
};
requestNotifications=async function(){
  if(pulseIsIOS&&!pulseIsStandalone){
    alert('On iPhone/iPad, add Pulse to your Home Screen first. Open the Share menu → Add to Home Screen, then launch Pulse from its Home Screen icon and enable notifications there.');
    return;
  }
  if(!('Notification' in window)){
    alert('This browser does not expose notification permission for Pulse. Try an installed Pulse app/PWA or a supported browser.');
    return;
  }
  const p=await Notification.requestPermission();
  if(p==='granted'){
    new Notification('Pulse',{body:'Notification permission enabled. Scheduled push delivery is being connected in the next V4 step.'});
    if(pulseUser) pulsePushAll().catch(pulseCloudError);
  } else if(p==='denied') alert('Notifications are blocked for Pulse. You can re-enable them from your device/browser notification settings.');
  render();
};

// Replace the magic-link sender with clearer throttling/account behavior.
pulseSendMagicLink=async function(e){
  e.preventDefault();
  const email=document.getElementById('pulse-auth-email').value.trim();
  const btn=e.submitter;
  const last=Number(localStorage.getItem('pulse.auth.lastRequest')||0);
  const remaining=60-Math.floor((Date.now()-last)/1000);
  if(remaining>0){alert(`A sign-in email was requested recently. Try again in about ${remaining} seconds.`);return;}
  btn.disabled=true;btn.textContent='Sending…';
  const {error}=await pulseCloud.auth.signInWithOtp({email,options:{emailRedirectTo:'https://pulse-reminder.vercel.app'}});
  if(error){
    btn.disabled=false;btn.textContent='Email me a sign-in link';
    if(error.status===429||/rate limit/i.test(error.message||'')){
      alert('Supabase has temporarily rate-limited sign-in emails because several links were requested close together. Multiple email accounts are supported; please try again after the email limit resets.');
    } else alert(error.message);
    return;
  }
  localStorage.setItem('pulse.auth.lastRequest',String(Date.now()));
  document.querySelector('.cloud-auth-card').innerHTML=`<div class="cloud-auth-logo">✉</div><p class="section-kicker">CHECK YOUR EMAIL</p><h1>Sign-in link sent</h1><p>Open the email and tap the secure link. To sync the same reminders across devices, sign in with the same email on each device. A different email creates a separate Pulse account.</p><button class="secondary" onclick="pulseCloseAuth()">Continue locally for now</button>`;
};

// Make account semantics explicit in Settings.
const pulseHotfixPatchSettings=pulsePatchSettingsUI;
pulsePatchSettingsUI=function(){
  pulseHotfixPatchSettings();
  const card=document.getElementById('cloud-account-card');
  if(card&&!card.querySelector('.account-note')){
    const note=document.createElement('p');
    note.className='muted account-note';
    note.style.fontSize='11px';
    note.textContent='Use the same email on every device for one shared Pulse account. Different emails keep separate reminder data.';
    card.appendChild(note);
  }
};
render();
