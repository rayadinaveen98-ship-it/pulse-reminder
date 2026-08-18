// Pulse V3.1 mobile-first enhancement layer
(function(){
  const baseLayout = layout;
  const baseGroup = group;

  // Compact empty Today/Upcoming groups while keeping populated groups unchanged.
  group = function(name, items, emptyText){
    if(items.length) return baseGroup(name, items, emptyText);
    return `<section class="time-group empty-time-group"><button class="empty-time-row" type="button" aria-label="${esc(name)} has no reminders"><span><b>${esc(name)}</b><small>${esc(emptyText)}</small></span><span class="clear-mark">✓ Clear</span></button></section>`;
  };

  function drawerMarkup(){
    const granted = ('Notification' in window && Notification.permission === 'granted');
    return `<div id="mobile-drawer-backdrop" class="mobile-drawer-backdrop" onclick="closeMobileDrawer()" aria-hidden="true"></div>
    <aside id="mobile-drawer" class="mobile-drawer" aria-hidden="true">
      <div class="mobile-drawer-head">
        <div class="brand mobile-brand"><div class="brand-mark">⚡</div><div><span>Pulse</span><small>V3.1</small></div></div>
        <button class="mobile-icon-btn" onclick="closeMobileDrawer()" aria-label="Close menu">×</button>
      </div>
      <div class="mobile-drawer-section">
        <p class="drawer-label">Navigate</p>
        <button class="drawer-nav ${state.tab==='today'?'active':''}" onclick="mobileGo('today')"><span>⌂</span><b>Today</b></button>
        <button class="drawer-nav ${state.tab==='upcoming'?'active':''}" onclick="mobileGo('upcoming')"><span>▦</span><b>Upcoming</b></button>
        <button class="drawer-nav ${state.tab==='automations'?'active':''}" onclick="mobileGo('automations')"><span>✦</span><b>Automations</b></button>
        <button class="drawer-nav ${state.tab==='all'?'active':''}" onclick="mobileGo('all')"><span>☷</span><b>All reminders</b></button>
        <button class="drawer-nav ${state.tab==='history'?'active':''}" onclick="mobileGo('history')"><span>↺</span><b>History</b></button>
      </div>
      <div class="mobile-drawer-section">
        <p class="drawer-label">Quick settings</p>
        <button class="drawer-nav" onclick="toggleMobileTheme()"><span>${settings.theme==='dark'?'☀':'☾'}</span><b>${settings.theme==='dark'?'Light mode':'Dark mode'}</b></button>
        <button class="drawer-nav" onclick="requestNotifications();closeMobileDrawer()"><span>🔔</span><b>${granted?'Notifications enabled':'Enable notifications'}</b></button>
        <button class="drawer-nav ${state.tab==='settings'?'active':''}" onclick="mobileGo('settings')"><span>⚙</span><b>Settings</b></button>
      </div>
      <div class="drawer-status"><span class="status-dot"></span><div><b>Local mode</b><small>Cloud sync is the next layer</small></div></div>
    </aside>`;
  }

  layout = function(body){
    baseLayout(body);
    const main = document.querySelector('.main');
    const shell = document.querySelector('.app-shell');
    if(main && !document.querySelector('.mobile-topbar')){
      main.insertAdjacentHTML('afterbegin', `<div class="mobile-topbar"><button class="mobile-menu-btn" onclick="openMobileDrawer()" aria-label="Open menu"><span></span><span></span><span></span></button><div class="mobile-top-title"><div class="brand-mark mini">⚡</div><b>Pulse</b></div><button class="mobile-quick-add" onclick="openCreate()" aria-label="New reminder">＋</button></div>`);
    }
    if(shell && !document.querySelector('#mobile-drawer')) shell.insertAdjacentHTML('beforeend', drawerMarkup());
    const version = document.querySelector('.brand small');
    if(version) version.textContent='V3.1';
    document.querySelectorAll('.version-box b').forEach(el=>el.textContent='Pulse 3.1');
  };

  window.openMobileDrawer = function(){
    document.body.classList.add('drawer-open');
    document.getElementById('mobile-drawer')?.setAttribute('aria-hidden','false');
    document.getElementById('mobile-drawer-backdrop')?.setAttribute('aria-hidden','false');
  };
  window.closeMobileDrawer = function(){
    document.body.classList.remove('drawer-open');
    document.getElementById('mobile-drawer')?.setAttribute('aria-hidden','true');
    document.getElementById('mobile-drawer-backdrop')?.setAttribute('aria-hidden','true');
  };
  window.mobileGo = function(tab){ closeMobileDrawer(); go(tab); };
  window.toggleMobileTheme = function(){
    settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
    save();
    closeMobileDrawer();
    render();
  };

  // Close the drawer when switching to landscape/desktop so it never gets stuck over the UI.
  addEventListener('resize',()=>{ if(innerWidth>820) closeMobileDrawer(); });
  addEventListener('keydown',e=>{ if(e.key==='Escape') closeMobileDrawer(); });

  render();
})();
