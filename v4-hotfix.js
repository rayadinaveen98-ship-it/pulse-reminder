// Pulse auth compatibility: throttling + account guidance only.
// Notification/push behavior lives exclusively in push.js.

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
