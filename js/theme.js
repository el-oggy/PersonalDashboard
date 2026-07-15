/* ==========================================================================
   FlowOS — theme.js
   Dark / Light / System theme engine + accent color system.
   Applies data-theme on <html>, persists the chosen mode via State/DB,
   detects OS theme changes live in System mode, and runs a soft
   fade+blur transition (via .theme-transition-veil) on every switch.
   ========================================================================== */

const Theme = (() => {
  const MODES = ['dark', 'light', 'system'];

  const ACCENTS = [
    { id: 'violet', a: '#7c7aff', a2: '#57d9c4', label: 'Violet' },
    { id: 'teal', a: '#57d9c4', a2: '#5aa9ff', label: 'Teal' },
    { id: 'amber', a: '#ffb454', a2: '#ff8a5a', label: 'Amber' },
    { id: 'rose', a: '#ff6b8b', a2: '#d68fff', label: 'Rose' },
    { id: 'blue', a: '#5aa9ff', a2: '#7c7aff', label: 'Blue' },
    { id: 'green', a: '#6fdc8c', a2: '#57d9c4', label: 'Green' },
  ];

  let mediaQuery = null;

  function systemPrefersDark() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function resolveMode(mode) {
    if (mode === 'system') return systemPrefersDark() ? 'dark' : 'light';
    return mode;
  }

  function getSettings() {
    return State.get('settings');
  }

  function currentMode() {
    return getSettings().themeMode || 'dark';
  }

  function currentAccentId() {
    return getSettings().accentId || 'violet';
  }

  function applyResolvedTheme(resolved, { animate = true } = {}) {
    const root = document.documentElement;
    if (!animate) {
      root.setAttribute('data-theme', resolved);
      return;
    }
    const veil = document.getElementById('theme-veil');
    if (veil) {
      veil.classList.add('is-active');
      setTimeout(() => {
        root.setAttribute('data-theme', resolved);
        setTimeout(() => veil.classList.remove('is-active'), 60);
      }, 160);
    } else {
      root.setAttribute('data-theme', resolved);
    }
  }

  function applyAccent(accentId) {
    const preset = ACCENTS.find(a => a.id === accentId) || ACCENTS[0];
    document.documentElement.style.setProperty('--accent', preset.a);
    document.documentElement.style.setProperty('--accent-2', preset.a2);
    document.documentElement.style.setProperty('--accent-dim', hexToRgba(preset.a, 0.2));
  }

  function hexToRgba(hex, alpha) {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function setMode(mode, { animate = true } = {}) {
    if (!MODES.includes(mode)) mode = 'dark';
    getSettings().themeMode = mode;
    State.save('settings');
    applyResolvedTheme(resolveMode(mode), { animate });
    watchSystem(mode);
    updateSwitcherUI();
  }

  function setAccent(accentId) {
    getSettings().accentId = accentId;
    State.save('settings');
    applyAccent(accentId);
    updateAccentUI();
  }

  function watchSystem(mode) {
    if (mediaQuery) {
      mediaQuery.removeEventListener('change', onSystemChange);
      mediaQuery = null;
    }
    if (mode === 'system' && window.matchMedia) {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', onSystemChange);
    }
  }

  function onSystemChange() {
    applyResolvedTheme(resolveMode('system'));
  }

  function updateSwitcherUI() {
    document.querySelectorAll('.theme-switch [data-theme-mode]').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.themeMode === currentMode());
    });
  }

  function updateAccentUI() {
    document.querySelectorAll('.accent-swatch[data-accent-id]').forEach(btn => {
      btn.classList.toggle('is-selected', btn.dataset.accentId === currentAccentId());
    });
  }

  function renderSwitcher() {
    const icons = {
      dark: '<svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>',
      light: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
      system: '<svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="14" rx="2"/><path d="M8 21h8M12 18v3"/></svg>',
    };
    const wrap = document.createElement('div');
    wrap.className = 'theme-switch';
    MODES.forEach(m => {
      const btn = document.createElement('button');
      btn.dataset.themeMode = m;
      btn.title = m.charAt(0).toUpperCase() + m.slice(1) + ' mode';
      btn.innerHTML = icons[m];
      btn.onclick = () => setMode(m);
      wrap.appendChild(btn);
    });
    return wrap;
  }

  function renderAccentPicker() {
    const wrap = document.createElement('div');
    wrap.className = 'accent-swatches';
    ACCENTS.forEach(a => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'accent-swatch';
      btn.dataset.accentId = a.id;
      btn.title = a.label;
      btn.style.background = `linear-gradient(135deg, ${a.a}, ${a.a2})`;
      btn.onclick = () => setAccent(a.id);
      wrap.appendChild(btn);
    });
    return wrap;
  }

  function init() {
    // Ensure a persistent veil element exists for the transition effect.
    if (!document.getElementById('theme-veil')) {
      const veil = document.createElement('div');
      veil.id = 'theme-veil';
      veil.className = 'theme-transition-veil';
      document.body.appendChild(veil);
    }
    const settings = getSettings();
    if (!settings.themeMode) settings.themeMode = 'dark';
    if (!settings.accentId) settings.accentId = 'violet';

    applyResolvedTheme(resolveMode(settings.themeMode), { animate: false });
    applyAccent(settings.accentId);
    watchSystem(settings.themeMode);

    const topbarSlot = document.getElementById('theme-switch-slot');
    if (topbarSlot) {
      topbarSlot.appendChild(renderSwitcher());
      updateSwitcherUI();
    }
  }

  return { init, setMode, setAccent, currentMode, currentAccentId, ACCENTS, renderSwitcher, renderAccentPicker, updateSwitcherUI, updateAccentUI };
})();
