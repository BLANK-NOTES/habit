/* =====================================================
   BYTE WIDGET — Floating Byte on every page
   Drop <script src="js/byte-widget.js"></script> into
   any page and Byte appears in the corner with tips.
===================================================== */

(function() {
  'use strict';

  // Don't double-inject
  if (document.getElementById('byteFloat')) return;

  const isPremium = () => window.HabitPremium?.isPremium?.() || false;

  /* ── Build Byte SVG ── */
  const buildSVG = (mood = 'happy', size = 54) => {
    const faces = {
      happy:    `<circle cx="38" cy="44" r="4.5" fill="#052e16"/><circle cx="62" cy="44" r="4.5" fill="#052e16"/><path d="M34 57 Q50 68 66 57" stroke="#052e16" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
      excited:  `<ellipse cx="38" cy="43" rx="6" ry="7" fill="#052e16"/><ellipse cx="62" cy="43" rx="6" ry="7" fill="#052e16"/><circle cx="37" cy="41" r="2" fill="white" opacity="0.7"/><circle cx="61" cy="41" r="2" fill="white" opacity="0.7"/><path d="M30 56 Q50 72 70 56" stroke="#052e16" stroke-width="4" fill="none" stroke-linecap="round"/>`,
      thinking: `<ellipse cx="38" cy="44" rx="5" ry="4" fill="#052e16"/><ellipse cx="62" cy="44" rx="5" ry="4" fill="#052e16"/><path d="M37 58 Q50 55 63 58" stroke="#052e16" stroke-width="3" fill="none" stroke-linecap="round"/>`,
      wink:     `<circle cx="38" cy="44" r="4.5" fill="#052e16"/><path d="M54 40 L70 40" stroke="#052e16" stroke-width="4" stroke-linecap="round"/><path d="M34 57 Q50 68 66 57" stroke="#052e16" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
      cheer:    `<ellipse cx="38" cy="42" rx="6" ry="7" fill="#052e16"/><ellipse cx="62" cy="42" rx="6" ry="7" fill="#052e16"/><circle cx="37" cy="40" r="2.5" fill="white" opacity="0.8"/><circle cx="61" cy="40" r="2.5" fill="white" opacity="0.8"/><path d="M28 56 Q50 74 72 56" stroke="#052e16" stroke-width="4.5" fill="none" stroke-linecap="round"/>`,
    };
    const face = faces[mood] || faces.happy;
    return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bwg${size}" cx="45%" cy="35%" r="60%">
          <stop offset="0%" stop-color="#6ee7b7"/>
          <stop offset="60%" stop-color="#10b981"/>
          <stop offset="100%" stop-color="#059669"/>
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="50" rx="48" ry="48" fill="rgba(16,185,129,0.12)"/>
      <circle cx="50" cy="50" r="38" fill="url(#bwg${size})" filter="drop-shadow(0 4px 12px rgba(16,185,129,0.45))"/>
      <ellipse cx="37" cy="33" rx="12" ry="8" fill="white" opacity="0.22" transform="rotate(-20 37 33)"/>
      <line x1="50" y1="12" x2="50" y2="26" stroke="#059669" stroke-width="3" stroke-linecap="round"/>
      <circle cx="50" cy="10" r="4" fill="#4ade80"/>
      <circle cx="12" cy="50" r="7" fill="#059669"/>
      <circle cx="88" cy="50" r="7" fill="#059669"/>
      ${face}
      <circle cx="26" cy="54" r="6" fill="#4ade80" opacity="0.25"/>
      <circle cx="74" cy="54" r="6" fill="#4ade80" opacity="0.25"/>
    </svg>`;
  };

  /* ── Tips pool ── */
  const TIPS = [
    { mood:'happy',    text:'Right-click any cell on the monthly grid to add a note for that day! 📝', prem: true },
    { mood:'thinking', text:'Completing habits back-to-back builds a combo — up to 5× XP! ⚡', prem: true },
    { mood:'cool',     text:'Seasonal events give XP bonuses. Check the dashboard for active events! 🎃', prem: true },
    { mood:'cheer',    text:'Perfect a full week to earn a 🛡️ Streak Shield. One bad day won\'t end everything.', prem: true },
    { mood:'wink',     text:'The Journal tracks your mood over time. Log it daily for patterns. 😊', prem: true },
    { mood:'happy',    text:'Your streak resets if you miss a day — unless you spend 💎 gems to freeze it!', prem: true },
    { mood:'excited',  text:'Achievements are hiding everywhere. Keep completing habits and Byte will surprise you. 🏆', prem: true },
    // Premium nudges — only shown to free users (prem: false)
    { mood:'excited',  text:'⭐ Premium users are <strong>5× more likely</strong> to stick to their habits. Byte has seen the data.', prem: false },
    { mood:'wink',     text:'⭐ Try Premium free for <strong>7 days</strong> — no card needed. Byte thinks you deserve it.', prem: false },
    { mood:'cheer',    text:'⭐ Streak shields, XP, leagues & friends are all in Premium. From £3.99/mo.', prem: false },
    { mood:'thinking', text:'⭐ The AI Habit Coach is coming to Premium soon. It\'ll know your real data and give real advice.', prem: false },
    { mood:'cool',     text:'⭐ 7 extra themes, unlimited habits, daily quests. All in Premium. From £2.50/mo yearly.', prem: false },
  ];
  let lastTipIdx = -1;

  /* ── CSS ── */
  const injectCSS = () => {
    if (document.getElementById('byteWidgetCSS')) return;
    const s = document.createElement('style');
    s.id = 'byteWidgetCSS';
    s.textContent = `
      @keyframes byteFloatW { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
      @keyframes byteBubbleInW { from{opacity:0;transform:translateY(10px) scale(0.92)} to{opacity:1;transform:none} }
      @keyframes byteWiggle { 0%,100%{transform:rotate(0deg)} 25%{transform:rotate(-8deg)} 75%{transform:rotate(8deg)} }
      #byteFloat {
        position:fixed; bottom:24px; right:24px;
        width:54px; height:54px;
        cursor:pointer; z-index:9000;
        animation: byteFloatW 3s ease-in-out infinite;
        filter: drop-shadow(0 4px 14px rgba(16,185,129,0.45));
        transition: transform 0.2s ease;
        -webkit-tap-highlight-color: transparent;
      }
      #byteFloat:hover { transform: scale(1.12) !important; animation-play-state: paused; }
      #byteFloat.wiggle { animation: byteWiggle 0.5s ease; }
      #byteBubble {
        position:fixed; bottom:88px; right:16px;
        width: min(300px, calc(100vw - 32px));
        background: var(--panel, #111118);
        border: 1px solid rgba(16,185,129,0.3);
        border-radius: 18px 18px 4px 18px;
        padding: 14px;
        z-index: 9001;
        box-shadow: 0 8px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(16,185,129,0.08);
        animation: byteBubbleInW 0.3s cubic-bezier(0.34,1.4,0.64,1);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      #byteBubble .bb-header { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
      #byteBubble .bb-label  { font-size:0.62rem; font-weight:800; text-transform:uppercase; letter-spacing:0.1em; color:#10b981; flex:1; }
      #byteBubble .bb-close  { background:none; border:none; color:rgba(255,255,255,0.25); font-size:1rem; cursor:pointer; padding:0; line-height:1; }
      #byteBubble .bb-text   { font-size:0.82rem; line-height:1.55; color:var(--text, #eeeef5); }
      #byteBubble .bb-prem   { margin-top:10px; }
      #byteBubble .bb-prem a { display:block; text-align:center; background:linear-gradient(135deg,#10b981,#059669); color:#fff; text-decoration:none; border-radius:10px; padding:7px 12px; font-size:0.75rem; font-weight:800; }
    `;
    document.head.appendChild(s);
  };

  /* ── Show bubble ── */
  const showBubble = (mood, label, text, withPremCTA = false) => {
    document.getElementById('byteBubble')?.remove();
    const el = document.createElement('div');
    el.id = 'byteBubble';
    el.innerHTML = `
      <div class="bb-header">
        <div style="width:28px;height:28px;flex-shrink:0;animation:byteFloatW 2s ease-in-out infinite">${buildSVG(mood, 28)}</div>
        <div class="bb-label">${label}</div>
        <button class="bb-close" onclick="document.getElementById('byteBubble')?.remove()">✕</button>
      </div>
      <div class="bb-text">${text}</div>
      ${withPremCTA ? `<div class="bb-prem"><a href="upgrade.html">⭐ Start 7-day free trial →</a></div>` : ''}
    `;
    document.body.appendChild(el);
    setTimeout(() => {
      if (el.parentNode) el.remove();
    }, withPremCTA ? 12000 : 6000);
  };

  /* ── Float button click ── */
  const onByteClick = () => {
    // Wiggle animation
    const btn = document.getElementById('byteFloat');
    if (btn) {
      btn.classList.add('wiggle');
      setTimeout(() => btn.classList.remove('wiggle'), 500);
    }

    if (document.getElementById('byteBubble')) {
      document.getElementById('byteBubble').remove();
      return;
    }

    const prem = isPremium();
    const eligible = TIPS.filter(t => prem ? t.prem !== false : true);
    let idx;
    let tries = 0;
    do { idx = Math.floor(Math.random() * eligible.length); tries++; }
    while (idx === lastTipIdx && tries < 10);
    lastTipIdx = idx;
    const tip = eligible[idx];
    const isPremTip = tip.prem === false;
    showBubble(tip.mood, isPremTip ? '⭐ Byte says' : '💡 Byte\'s tip', tip.text, isPremTip);
  };

  /* ── Idle nudge — poke Byte after 2 min inactivity ── */
  let idleTimer = null;
  const resetIdle = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      const btn = document.getElementById('byteFloat');
      if (btn && !document.getElementById('byteBubble')) {
        btn.classList.add('wiggle');
        setTimeout(() => btn.classList.remove('wiggle'), 500);
        // After wiggle, show a tip 2s later
        setTimeout(() => {
          if (!document.getElementById('byteBubble')) {
            const prem = isPremium();
            // Idle: prefer premium nudge for free users 50% of time
            const roll = Math.random();
            const premNudges = TIPS.filter(t => t.prem === false);
            if (!prem && roll < 0.5 && premNudges.length) {
              const t = premNudges[Math.floor(Math.random() * premNudges.length)];
              showBubble(t.mood, '⭐ Byte says', t.text, true);
            } else {
              const reg = TIPS.filter(t => t.prem !== false);
              const t = reg[Math.floor(Math.random() * reg.length)];
              showBubble(t.mood, '💡 Byte\'s tip', t.text, false);
            }
          }
        }, 2000);
      }
    }, 120000); // 2 minutes idle
  };

  /* ── Init ── */
  const init = () => {
    injectCSS();

    const btn = document.createElement('div');
    btn.id = 'byteFloat';
    btn.innerHTML = buildSVG('happy', 54);
    btn.title = 'Chat with Byte';
    btn.addEventListener('click', onByteClick);
    document.body.appendChild(btn);

    // Idle tracking
    ['mousemove','keydown','touchstart','scroll','click'].forEach(ev =>
      document.addEventListener(ev, resetIdle, { passive: true })
    );
    resetIdle();

    // Welcome bubble after 4s on pages that aren't monthly (monthly has its own tutorial)
    const isMonthly = window.location.pathname.includes('monthly');
    if (!isMonthly) {
      setTimeout(() => {
        if (!document.getElementById('byteBubble')) {
          const greets = [
            { mood:'happy',   text:'Hey! Byte\'s here if you need a tip. Just tap me! 👋' },
            { mood:'wink',    text:'Psst — tap me whenever you want a hint or tip from Byte. 💡' },
            { mood:'excited', text:'Byte is watching over your habits. In a helpful way, not a creepy way. 👀' },
          ];
          const g = greets[Math.floor(Math.random() * greets.length)];
          showBubble(g.mood, '👋 Hey there!', g.text, false);
        }
      }, 4000);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for other scripts to call
  window.ByteWidget = { showBubble, buildSVG };
})();