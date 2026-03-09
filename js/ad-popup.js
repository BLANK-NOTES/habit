/* =====================================================
   AD POPUP SYSTEM — ad-popup.js
   - Shows 2 different ads per day (one on load, one on long session)
   - Rotates between 6 ad creatives
   - Free users only (auto-hidden for Premium)
   - Each ad has: exit button, free trial CTA, share button
   - "Premium users never see ads" message in footer
===================================================== */

(function() {
  'use strict';

  const KEY_TODAY   = 'habitAdDate';
  const KEY_COUNT   = 'habitAdCount';
  const KEY_LAST    = 'habitAdLast';

  const todayStr = () => new Date().toISOString().slice(0, 10);

  const getState = () => {
    const d = localStorage.getItem(KEY_TODAY);
    if (d !== todayStr()) {
      // New day — reset
      localStorage.setItem(KEY_TODAY, todayStr());
      localStorage.setItem(KEY_COUNT, '0');
    }
    return { count: parseInt(localStorage.getItem(KEY_COUNT) || '0') };
  };

  const bumpCount = () => {
    const c = getState().count + 1;
    localStorage.setItem(KEY_COUNT, String(c));
  };

  const isPremium = () => window.HabitPremium?.isPremium?.() || false;

  // ── Byte SVG ──────────────────────────────────────
  const byteSVG = (size = 48) => `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="adby" cx="45%" cy="35%" r="60%"><stop offset="0%" stop-color="#6ee7b7"/><stop offset="100%" stop-color="#059669"/></radialGradient></defs>
    <circle cx="50" cy="50" r="38" fill="url(#adby)" filter="drop-shadow(0 4px 10px rgba(16,185,129,0.4))"/>
    <ellipse cx="37" cy="33" rx="10" ry="7" fill="white" opacity="0.2" transform="rotate(-20 37 33)"/>
    <circle cx="12" cy="50" r="7" fill="#059669"/>
    <circle cx="88" cy="50" r="7" fill="#059669"/>
    <ellipse cx="38" cy="44" rx="5" ry="6" fill="#052e16"/>
    <ellipse cx="62" cy="44" rx="5" ry="6" fill="#052e16"/>
    <circle cx="37" cy="42" r="2" fill="white" opacity="0.7"/>
    <circle cx="61" cy="42" r="2" fill="white" opacity="0.7"/>
    <path d="M34 57 Q50 70 66 57" stroke="#052e16" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <circle cx="50" cy="10" r="4" fill="#4ade80"/>
    <line x1="50" y1="12" x2="50" y2="26" stroke="#059669" stroke-width="3" stroke-linecap="round"/>
  </svg>`;

  // ── Share function ────────────────────────────────
  const shareAd = (text) => {
    const msg = text || "I\'m using HabitTracker to build better habits. Try it free! 🌱 #habits #productivity";
    if (navigator.share) {
      navigator.share({ text: msg, url: 'https://habittracker.app' }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(msg + ' https://habittracker.app').then(() => {
        alert('Copied to clipboard! Share it anywhere 📋');
      }).catch(() => {
        prompt('Copy this to share:', msg);
      });
    }
  };

  // ── Common shell ─────────────────────────────────
  const shell = (innerHTML, adIndex) => {
    const shareTexts = [
      "Just discovered HabitTracker — the habit app with XP, leagues and Byte the mascot. It's genuinely addictive. 🔥",
      "Premium users are 5× more likely to keep their habits. HabitTracker Premium has a 1-month free trial right now 👀",
      "Got a 30-day streak going with HabitTracker. The streak shields are a lifesaver 🛡️",
      "The journal + mood tracker in HabitTracker is properly good. Try it free 📓",
      "Byte roasted me for missing 2 habits and now I haven't missed in 3 weeks. HabitTracker hits different 😂",
      "HabitTracker has 9 themes, XP, leagues, Byte the mascot. And it starts free. Why didn't I try this sooner?",
    ];
    return `
    <div id="habitAdOverlay" style="
      position:fixed;inset:0;z-index:99998;
      background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);
      display:flex;align-items:center;justify-content:center;
      animation:adFadeIn 0.3s ease;
      padding:16px;
    ">
      <div id="habitAdCard" style="
        position:relative;max-width:520px;width:100%;
        background:#0f1118;border:1px solid rgba(255,255,255,0.08);
        border-radius:22px;overflow:hidden;
        box-shadow:0 24px 64px rgba(0,0,0,0.7),0 0 0 1px rgba(16,185,129,0.08);
        animation:adSlideUp 0.35s cubic-bezier(0.34,1.4,0.64,1);
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      ">
        <!-- Top bar -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px 0;">
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="width:6px;height:6px;border-radius:50%;background:#10b981;animation:adPulse 2s ease-in-out infinite"></div>
            <span style="font-size:0.6rem;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:rgba(255,255,255,0.3)">HabitTracker</span>
          </div>
          <button onclick="window._closeHabitAd()" style="
            background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);
            color:rgba(255,255,255,0.4);border-radius:8px;
            width:28px;height:28px;cursor:pointer;font-size:0.9rem;
            display:flex;align-items:center;justify-content:center;
            font-family:inherit;transition:all 0.15s;
          " onmouseover="this.style.background='rgba(255,255,255,0.12)'" onmouseout="this.style.background='rgba(255,255,255,0.06)'">✕</button>
        </div>

        <!-- AD CONTENT -->
        <div style="padding:16px 20px 0">${innerHTML}</div>

        <!-- Trial CTA -->
        <div style="padding:14px 20px 0;">
          <button onclick="window.location.href='upgrade.html'" style="
            width:100%;padding:13px;border:none;border-radius:13px;
            background:linear-gradient(135deg,#10b981,#059669);
            color:#fff;font-size:0.95rem;font-weight:800;cursor:pointer;
            font-family:inherit;
            box-shadow:0 4px 20px rgba(16,185,129,0.35);
            transition:all 0.2s;
          " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform=''">
            ⭐ Start 1-Month Free Trial →
          </button>
        </div>

        <!-- Footer -->
        <div style="padding:10px 20px 16px;display:flex;align-items:center;justify-content:space-between;">
          <div style="font-size:0.62rem;color:rgba(255,255,255,0.2)">
            🔒 No card needed · Cancel any time · <span style="color:rgba(16,185,129,0.5)">Premium users never see ads</span>
          </div>
          <button onclick="window._shareHabitAd(${adIndex})" style="
            background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);
            color:#10b981;border-radius:8px;padding:5px 10px;
            font-size:0.68rem;font-weight:800;cursor:pointer;font-family:inherit;
            display:flex;align-items:center;gap:4px;
          ">↗ Share</button>
        </div>
      </div>
    </div>`;
  };

  // ── 6 Ad creatives ────────────────────────────────
  const ADS = [
    // Ad 0: Byte + "5× more likely" stat
    (i) => shell(`
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px;">
        <div style="animation:adByteFloat 2.5s ease-in-out infinite;flex-shrink:0">${byteSVG(52)}</div>
        <div>
          <div style="font-size:0.62rem;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#10b981;margin-bottom:4px">Byte says</div>
          <div style="font-size:1rem;font-weight:700;color:#fff;line-height:1.3">Premium users are <span style="color:#10b981">5× more likely</span> to keep their habits.</div>
        </div>
      </div>
      <div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.15);border-radius:12px;padding:12px;margin-bottom:4px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          ${['Unlimited habits','XP & Levels','Streak Shields','All 9 Themes','Friends & Leagues','Year Wrapped'].map(f => `<div style="display:flex;align-items:center;gap:6px;font-size:0.75rem;color:rgba(255,255,255,0.7)"><span style="color:#10b981">✓</span>${f}</div>`).join('')}
        </div>
        <div style="margin-top:10px;font-size:0.68rem;color:rgba(255,255,255,0.3);text-align:center">AI Habit Coach — coming soon to Premium</div>
      </div>
    `, i),

    // Ad 1: Pricing cards
    (i) => shell(`
      <div style="text-align:center;margin-bottom:14px;">
        <div style="font-size:1.2rem;font-weight:900;color:#fff;margin-bottom:4px">Start free. <span style="color:#10b981;font-style:italic">Unlock everything</span> when ready.</div>
        <div style="font-size:0.78rem;color:rgba(255,255,255,0.4)">Premium from just <strong style="color:#fff">£2.50/month</strong></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:4px;">
        <div style="background:#141820;border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:14px;">
          <div style="font-size:0.58rem;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:rgba(255,255,255,0.3);margin-bottom:8px">Free</div>
          <div style="font-size:1.8rem;font-weight:900;line-height:1;color:#fff">£0</div>
          <div style="font-size:0.62rem;color:rgba(255,255,255,0.35);margin-bottom:10px">forever</div>
          <div style="display:flex;flex-direction:column;gap:5px;">
            ${['5 habits','Streak tracking','2 themes'].map(f=>`<div style="font-size:0.72rem;color:rgba(255,255,255,0.5);display:flex;gap:5px;align-items:center"><span style="color:#10b981;font-size:0.6rem">✓</span>${f}</div>`).join('')}
            ${['XP & leagues','Streak shields','AI Coach (coming soon)'].map(f=>`<div style="font-size:0.72rem;color:rgba(255,255,255,0.2);display:flex;gap:5px;align-items:center"><span style="font-size:0.6rem">✕</span>${f}</div>`).join('')}
          </div>
        </div>
        <div style="background:linear-gradient(145deg,#0f1a14,#111820);border:1px solid rgba(16,185,129,0.35);border-radius:14px;padding:14px;position:relative;">
          <div style="position:absolute;top:-9px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#10b981,#059669);color:#fff;font-size:0.55rem;font-weight:900;letter-spacing:0.08em;border-radius:20px;padding:2px 10px;white-space:nowrap">⭐ Most popular</div>
          <div style="font-size:0.58rem;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:rgba(255,255,255,0.3);margin-bottom:8px">Premium</div>
          <div style="font-size:1.8rem;font-weight:900;line-height:1;color:#fff">£29.99</div>
          <div style="font-size:0.62rem;color:#10b981;font-weight:700;margin-bottom:10px">Just £2.50/mo · Save 37%</div>
          <div style="display:flex;flex-direction:column;gap:5px;">
            ${['Unlimited habits','XP & leagues','Streak shields','All 9 themes','Friends + challenges','AI Coach (coming soon)'].map(f=>`<div style="font-size:0.72rem;color:rgba(255,255,255,0.75);display:flex;gap:5px;align-items:center"><span style="color:#10b981;font-size:0.6rem">✓</span>${f}</div>`).join('')}
          </div>
        </div>
      </div>
    `, i),

    // Ad 2: Streak shields
    (i) => shell(`
      <div style="text-align:center;margin-bottom:16px;">
        <div style="font-size:2.5rem;margin-bottom:8px;filter:drop-shadow(0 0 16px rgba(245,158,11,0.5))">🛡️</div>
        <div style="font-size:1.15rem;font-weight:900;color:#fff;margin-bottom:6px">Never lose a streak to <span style="color:#f59e0b">one bad day</span> again.</div>
        <div style="font-size:0.82rem;color:rgba(255,255,255,0.45);line-height:1.5">Streak shields protect your progress when life gets in the way. Exclusive to Premium.</div>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:4px;">
        ${[{e:'🔥',n:'90-day streak',s:'Protected by shields'},{e:'💎',n:'Gem economy',s:'Earn & spend gems'},{e:'🏆',n:'Leagues',s:'Bronze → Legendary'}].map(({e,n,s})=>`<div style="flex:1;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:10px;text-align:center"><div style="font-size:1.2rem;margin-bottom:4px">${e}</div><div style="font-size:0.7rem;font-weight:800;color:#fff;margin-bottom:2px">${n}</div><div style="font-size:0.6rem;color:rgba(255,255,255,0.35)">${s}</div></div>`).join('')}
      </div>
    `, i),

    // Ad 3: Testimonials
    (i) => shell(`
      <div style="text-align:center;margin-bottom:14px;">
        <div style="font-size:1.1rem;font-weight:900;color:#fff;margin-bottom:4px">Real people. Real streaks.</div>
        <div style="font-size:0.78rem;color:rgba(255,255,255,0.35)">★★★★★ Loved by thousands</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:4px;">
        ${[
          {q:'The first habit app I\'ve used for more than a week. The XP system is stupidly addictive.',a:'Jordan M.',d:'47-day streak 🔥'},
          {q:'Streak shield alone is worth Premium. Kept a 90-day streak while travelling. Life-changing.',a:'Priya R.',d:'90-day streak ✈️'},
          {q:'Byte roasted me for completing 1 of 10 habits. Fair. Now I do 4 consistently. Progress.',a:'Sam K.',d:'Gold League 🏆'},
        ].map(({q,a,d})=>`<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:10px 12px;"><div style="font-size:0.72rem;color:rgba(255,255,255,0.6);line-height:1.5;margin-bottom:6px">"${q}"</div><div style="display:flex;align-items:center;gap:8px;"><div style="font-size:0.7rem;font-weight:700;color:#fff">${a}</div><div style="font-size:0.62rem;color:rgba(255,255,255,0.3)">${d}</div></div></div>`).join('')}
      </div>
    `, i),

    // Ad 4: Comparison table (compact)
    (i) => shell(`
      <div style="margin-bottom:12px;">
        <div style="font-size:1.1rem;font-weight:900;color:#fff;margin-bottom:4px">See every difference. <span style="color:#10b981">At once.</span></div>
        <div style="font-size:0.78rem;color:rgba(255,255,255,0.35)">Free is good. Premium is the full picture.</div>
      </div>
      <div style="background:#0c0f16;border:1px solid rgba(255,255,255,0.07);border-radius:12px;overflow:hidden;margin-bottom:4px;">
        <div style="display:grid;grid-template-columns:1fr auto auto;gap:0;">
          <div style="padding:7px 12px;font-size:0.6rem;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:rgba(255,255,255,0.25);border-bottom:1px solid rgba(255,255,255,0.05)">Feature</div>
          <div style="padding:7px 14px;font-size:0.6rem;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:rgba(255,255,255,0.3);border-bottom:1px solid rgba(255,255,255,0.05);text-align:center">Free</div>
          <div style="padding:7px 14px;font-size:0.6rem;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#10b981;border-bottom:1px solid rgba(255,255,255,0.05);text-align:center">Premium</div>
          ${[
            ['Habits','5 max','Unlimited'],
            ['Themes','2 only','All 9'],
            ['XP & Levels','✕','✓'],
            ['Streak Shields','✕','✓'],
            ['Friends & Challenges','✕','✓'],
            ['AI Coach','Coming soon','Coming soon'],
            ['Ads','Shown','Never'],
          ].map(([f,fr,pr],ri)=>`
            <div style="padding:6px 12px;font-size:0.73rem;color:rgba(255,255,255,0.6);border-bottom:${ri<6?'1px solid rgba(255,255,255,0.04)':'none'}">${f}</div>
            <div style="padding:6px 14px;font-size:0.73rem;color:${fr==='✕'?'rgba(255,255,255,0.18)':fr==='✓'?'#10b981':'#f59e0b'};text-align:center;border-bottom:${ri<6?'1px solid rgba(255,255,255,0.04)':'none'};font-weight:${fr==='✕'||fr==='✓'?'900':'700'}">${fr}</div>
            <div style="padding:6px 14px;font-size:0.73rem;color:${pr==='✕'?'rgba(255,255,255,0.18)':pr==='✓'?'#10b981':'rgba(255,255,255,0.4)'};text-align:center;border-bottom:${ri<6?'1px solid rgba(255,255,255,0.04)':'none'};font-weight:${pr==='✕'||pr==='✓'?'900':'700'}">${pr}</div>
          `).join('')}
        </div>
      </div>
    `, i),

    // Ad 5: Byte hero
    (i) => shell(`
      <div style="display:flex;flex-direction:column;align-items:center;text-align:center;padding:8px 0 12px;">
        <div style="animation:adByteFloat 3s ease-in-out infinite;margin-bottom:12px">${byteSVG(72)}</div>
        <div style="font-size:1.3rem;font-weight:700;color:#fff;line-height:1.2;margin-bottom:8px">Byte is ready.<br>Are <span style="color:#10b981;font-style:italic">you</span>?</div>
        <div style="font-size:0.82rem;color:rgba(255,255,255,0.4);line-height:1.5;max-width:340px">XP, leagues, streak shields, daily quests — and Byte, your little green accountability mascot who will absolutely not let you quit.</div>
        <div style="margin-top:12px;display:flex;gap:16px;font-size:0.72rem;color:rgba(255,255,255,0.3)">
          <span><span style="color:#f59e0b">★★★★★</span></span>
          <span>No credit card</span>
          <span>Cancel any time</span>
        </div>
      </div>
    `, i),
  ];

  const shareTexts = [
    "Premium users are 5× more likely to keep their habits. HabitTracker has a 1-month free trial 👀",
    "HabitTracker: XP, leagues, streak shields & Byte the mascot. Start free. 🌱",
    "Never lose a streak again — HabitTracker Premium streak shields are brilliant 🛡️",
    "Real testimonials, real streaks. HabitTracker is the habit app that actually works 🔥",
    "See every difference between Free & Premium in HabitTracker. Worth it.",
    "Byte the mascot won't let me quit my habits. HabitTracker Premium is a game-changer.",
  ];

  window._closeHabitAd = () => {
    const el = document.getElementById('habitAdOverlay');
    if (el) {
      el.style.animation = 'adFadeOut 0.2s ease forwards';
      setTimeout(() => el.remove(), 200);
    }
  };

  window._shareHabitAd = (idx) => {
    shareAd(shareTexts[idx] || shareTexts[0]);
  };

  // ── CSS animations ────────────────────────────────
  const injectCSS = () => {
    if (document.getElementById('habitAdCSS')) return;
    const s = document.createElement('style');
    s.id = 'habitAdCSS';
    s.textContent = `
      @keyframes adFadeIn { from{opacity:0} to{opacity:1} }
      @keyframes adFadeOut { from{opacity:1} to{opacity:0} }
      @keyframes adSlideUp { from{opacity:0;transform:translateY(24px) scale(0.96)} to{opacity:1;transform:none} }
      @keyframes adByteFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
      @keyframes adPulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
    `;
    document.head.appendChild(s);
  };

  // ── Show ad ───────────────────────────────────────
  const showAd = (adIndex) => {
    if (isPremium()) return;
    if (document.getElementById('habitAdOverlay')) return;
    injectCSS();
    const adFn = ADS[adIndex % ADS.length];
    const html = adFn(adIndex);
    const el = document.createElement('div');
    el.innerHTML = html;
    document.body.appendChild(el.firstElementChild);
    bumpCount();
    // Store last ad shown so next one is different
    localStorage.setItem(KEY_LAST, String(adIndex));
  };

  // ── Get next ad index ─────────────────────────────
  const nextAdIndex = (count) => {
    const last = parseInt(localStorage.getItem(KEY_LAST) ?? '-1');
    // Use date-seeded rotation + count offset to vary daily
    const seed = parseInt(new Date().toISOString().slice(5, 10).replace('-', ''));
    let idx = (seed + count) % ADS.length;
    // Avoid repeating same ad twice in a row
    if (idx === last) idx = (idx + 1) % ADS.length;
    return idx;
  };

  // ── Schedule ──────────────────────────────────────
  const init = () => {
    if (isPremium()) return;
    const { count } = getState();

    if (count < 1) {
      // First ad: 8s after page load
      setTimeout(() => showAd(nextAdIndex(0)), 8000);
    }

    if (count < 2) {
      // Second ad: 20 minutes into session (if user hasn't seen 2 today)
      setTimeout(() => {
        const { count: c2 } = getState();
        if (c2 < 2) showAd(nextAdIndex(1));
      }, 20 * 60 * 1000);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.HabitAdPopup = { show: showAd, close: window._closeHabitAd };
})();