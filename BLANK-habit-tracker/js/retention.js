/* =====================================================
   RETENTION ENGINE — retention.js
   Drop-in file for Habit Tracker.
   Adds: Spin wheel, Streak repair, Loss aversion alerts,
         Social pressure feed, Mystery chests, 2x XP events,
         Demotion anxiety, Variable rewards, Gem decay.
===================================================== */

const RetentionEngine = (() => {
  'use strict';

  /* ── helpers ── */
  const au  = () => JSON.parse(localStorage.getItem('auth_user') || 'null');
  const key = () => au() ? `habitTracker_${au().id}` : null;
  const load = () => { const k = key(); return k ? JSON.parse(localStorage.getItem(k) || '{}') : {}; };
  const save = (d) => { const k = key(); if (k) localStorage.setItem(k, JSON.stringify(d)); };

  /* ═══════════════════════════════════════════════
     1. SPIN WHEEL — variable reward on perfect day
  ═══════════════════════════════════════════════ */
  const WHEEL_PRIZES = [
    { label: '10 💎',   gems: 10,  xp: 0,   weight: 30, color: '#a78bfa' },
    { label: '20 XP',   gems: 0,   xp: 20,  weight: 25, color: '#4ade80' },
    { label: '5 💎',    gems: 5,   xp: 0,   weight: 20, color: '#818cf8' },
    { label: '2x XP!',  gems: 0,   xp: 0,   weight: 8,  color: '#facc15', double: true },
    { label: '30 💎',   gems: 30,  xp: 0,   weight: 7,  color: '#f472b6' },
    { label: '50 XP',   gems: 0,   xp: 50,  weight: 6,  color: '#34d399' },
    { label: '🛡️ Shield', gems: 0, xp: 0,   weight: 3,  color: '#06b6d4', shield: true },
    { label: '100 💎',  gems: 100, xp: 0,   weight: 1,  color: '#fbbf24' },
  ];

  const weightedPick = () => {
    const total = WHEEL_PRIZES.reduce((s, p) => s + p.weight, 0);
    let r = Math.random() * total;
    for (const p of WHEEL_PRIZES) { r -= p.weight; if (r <= 0) return p; }
    return WHEEL_PRIZES[0];
  };

  const showSpinWheel = () => {
    const today = new Date().toISOString().slice(0, 10);
    const d = load();
    if (d._lastSpin === today) return; // once per day

    const overlay = document.createElement('div');
    overlay.id = 'spinOverlay';
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:999999;
      background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);
      display:flex;align-items:center;justify-content:center;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    `;

    const slices = WHEEL_PRIZES;
    const arc = (2 * Math.PI) / slices.length;

    overlay.innerHTML = `
      <div style="text-align:center;max-width:380px;width:90vw;">
        <div style="font-size:2rem;font-weight:900;color:#facc15;margin-bottom:4px;text-shadow:0 0 20px #facc1580">🎰 PERFECT DAY!</div>
        <div style="font-size:0.88rem;color:rgba(255,255,255,0.6);margin-bottom:24px">You completed ALL habits today. Spin your reward!</div>
        <div style="position:relative;width:260px;height:260px;margin:0 auto 24px;">
          <canvas id="wheelCanvas" width="260" height="260" style="display:block;border-radius:50%;box-shadow:0 0 40px rgba(250,204,21,0.4);cursor:pointer;" ></canvas>
          <!-- pointer -->
          <div style="position:absolute;top:-14px;left:50%;transform:translateX(-50%);font-size:1.8rem;filter:drop-shadow(0 2px 6px #000)">▼</div>
        </div>
        <button id="spinBtn" style="
          background:linear-gradient(135deg,#facc15,#f59e0b);
          color:#000;border:none;border-radius:14px;
          padding:14px 40px;font-size:1rem;font-weight:900;
          cursor:pointer;font-family:inherit;
          box-shadow:0 4px 20px rgba(250,204,21,0.5);
          transition:transform 0.2s,box-shadow 0.2s;
          display:block;margin:0 auto;
        ">🎯 SPIN!</button>
        <button id="skipSpinBtn" style="background:none;border:none;color:rgba(255,255,255,0.25);font-size:0.75rem;cursor:pointer;margin-top:14px;font-family:inherit;">skip</button>
      </div>`;

    document.body.appendChild(overlay);

    // Draw wheel
    const canvas = document.getElementById('wheelCanvas');
    const ctx = canvas.getContext('2d');
    let currentAngle = 0;

    const drawWheel = (rotation) => {
      ctx.clearRect(0, 0, 260, 260);
      slices.forEach((p, i) => {
        const start = rotation + i * arc;
        const end   = start + arc;
        ctx.beginPath();
        ctx.moveTo(130, 130);
        ctx.arc(130, 130, 126, start, end);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
        // label
        ctx.save();
        ctx.translate(130, 130);
        ctx.rotate(start + arc / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#000';
        ctx.font = 'bold 11px system-ui';
        ctx.shadowColor = 'rgba(255,255,255,0.3)';
        ctx.shadowBlur = 2;
        ctx.fillText(p.label, 118, 4);
        ctx.restore();
      });
      // center circle
      ctx.beginPath();
      ctx.arc(130, 130, 18, 0, Math.PI * 2);
      ctx.fillStyle = '#0f0f18';
      ctx.fill();
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    drawWheel(0);

    let spinning = false;
    let prize = null;

    const spin = () => {
      if (spinning) return;
      spinning = true;
      document.getElementById('spinBtn').disabled = true;
      document.getElementById('spinBtn').style.opacity = '0.5';

      prize = weightedPick();
      const prizeIdx = slices.indexOf(prize);
      // target angle: land prize slice under top pointer
      const targetSliceAngle = -(prizeIdx * arc + arc / 2) - Math.PI / 2;
      const extraSpins = (5 + Math.floor(Math.random() * 4)) * Math.PI * 2;
      const totalRotation = extraSpins + ((targetSliceAngle - currentAngle + Math.PI * 20) % (Math.PI * 2));
      const duration = 4000;
      const start = performance.now();
      const startAngle = currentAngle;

      const animate = (now) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        currentAngle = startAngle + totalRotation * eased;
        drawWheel(currentAngle);
        if (progress < 1) { requestAnimationFrame(animate); }
        else { onSpinComplete(); }
      };
      requestAnimationFrame(animate);
    };

    const onSpinComplete = () => {
      // Apply prize
      const d = load();
      d._lastSpin = new Date().toISOString().slice(0, 10);
      if (prize.gems)   { d.gems = d.gems || { total: 0 }; d.gems.total = (d.gems.total || 0) + prize.gems; }
      if (prize.xp)     { d.xp  = d.xp  || { level: 1, lifetimeXP: 0, total: 0 }; d.xp.total = (d.xp.total || 0) + prize.xp; d.xp.lifetimeXP = (d.xp.lifetimeXP || 0) + prize.xp; }
      if (prize.double) { d._doubleXP = { until: Date.now() + 3600000 }; } // 1 hour
      if (prize.shield) { d.shields = (d.shields || 0) + 1; }
      save(d);

      // Show result
      const canvas = document.getElementById('wheelCanvas');
      canvas.style.boxShadow = `0 0 60px ${prize.color}`;
      setTimeout(() => {
        overlay.innerHTML = `
          <div style="text-align:center;animation:spinResultIn 0.5s cubic-bezier(0.34,1.56,0.64,1)">
            <div style="font-size:4rem;margin-bottom:12px">${prize.shield ? '🛡️' : prize.double ? '⚡' : '💫'}</div>
            <div style="font-size:1.8rem;font-weight:900;color:${prize.color};margin-bottom:8px">${prize.label}</div>
            <div style="font-size:0.9rem;color:rgba(255,255,255,0.6);margin-bottom:28px">${
              prize.double  ? "2x XP active for 1 hour!" :
              prize.shield  ? "A shield will auto-save your next broken streak!" :
              prize.gems    ? `+${prize.gems} gems added to your wallet!` :
              `+${prize.xp} XP earned!`
            }</div>
            <button onclick="document.getElementById('spinOverlay').remove()" style="
              background:${prize.color};color:#000;border:none;border-radius:12px;
              padding:12px 32px;font-size:0.95rem;font-weight:900;cursor:pointer;font-family:inherit;">
              Claim! ✓
            </button>
          </div>`;
        if (!document.getElementById('spinResultCSS')) {
          const s = document.createElement('style');
          s.id = 'spinResultCSS';
          s.textContent = `@keyframes spinResultIn{from{opacity:0;transform:scale(0.6) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}`;
          document.head.appendChild(s);
        }
      }, 600);
    };

    document.getElementById('spinBtn').addEventListener('click', spin);
    document.getElementById('skipSpinBtn').addEventListener('click', () => overlay.remove());
  };

  /* ═══════════════════════════════════════════════
     2. STREAK REPAIR — missed yesterday? Fix it now
  ═══════════════════════════════════════════════ */
  const checkStreakRepair = () => {
    const d = load();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yk = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}`;
    const yIdx = yesterday.getDate() - 1;

    const mo = d[yk] || { tasks: [] };
    const active = mo.tasks?.filter(t => t.days?.[yIdx] !== 'locked') || [];
    if (!active.length) return;
    const allDone = active.every(t => t.days?.[yIdx] === 'done');
    if (allDone) return;

    const streak = d.loginStreak?.count || 0;
    if (streak < 3) return; // only care if streak worth saving

    // Show repair prompt (only once per day)
    const repairKey = `_streakRepairShown_${today.toISOString().slice(0,10)}`;
    if (d[repairKey]) return;
    d[repairKey] = true;
    save(d);

    const REPAIR_COST = 50;
    const gems = d.gems?.total || 0;
    if (gems < REPAIR_COST) return;

    setTimeout(() => {
      const el = document.createElement('div');
      el.style.cssText = `
        position:fixed;top:0;left:0;right:0;bottom:0;z-index:999998;
        background:rgba(0,0,0,0.8);backdrop-filter:blur(6px);
        display:flex;align-items:center;justify-content:center;
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      `;
      el.innerHTML = `
        <div style="background:#111118;border:1px solid rgba(248,113,113,0.4);border-radius:20px;padding:28px;max-width:360px;width:90vw;text-align:center;animation:repairIn 0.4s cubic-bezier(0.34,1.56,0.64,1)">
          <div style="font-size:2.8rem;margin-bottom:12px">😰</div>
          <div style="font-size:1.1rem;font-weight:900;color:#f87171;margin-bottom:8px">You missed yesterday!</div>
          <div style="font-size:0.85rem;color:rgba(255,255,255,0.55);line-height:1.6;margin-bottom:20px">
            Your <strong style="color:#facc15">${streak}-day streak</strong> is broken.<br>
            Repair it now for <strong style="color:#a78bfa">${REPAIR_COST} 💎</strong> — you have ${gems} 💎.
          </div>
          <div style="display:flex;gap:10px;">
            <button id="repairNo" style="flex:1;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.4);border-radius:12px;padding:11px;font-size:0.85rem;font-weight:700;cursor:pointer;font-family:inherit;">Let it go 😔</button>
            <button id="repairYes" style="flex:2;background:linear-gradient(135deg,#a855f7,#7c3aed);border:none;color:#fff;border-radius:12px;padding:11px;font-size:0.9rem;font-weight:900;cursor:pointer;font-family:inherit;box-shadow:0 4px 20px rgba(168,85,247,0.5);">💎 Repair Streak!</button>
          </div>
        </div>`;
      document.body.appendChild(el);
      if (!document.getElementById('repairCSS')) {
        const s = document.createElement('style');
        s.id = 'repairCSS';
        s.textContent = `@keyframes repairIn{from{opacity:0;transform:scale(0.8) translateY(30px)}to{opacity:1;transform:scale(1) translateY(0)}}`;
        document.head.appendChild(s);
      }
      document.getElementById('repairNo').onclick = () => el.remove();
      document.getElementById('repairYes').onclick = () => {
        const d2 = load();
        d2.gems = d2.gems || { total: 0 };
        d2.gems.total = Math.max(0, (d2.gems.total || 0) - REPAIR_COST);
        // Mark yesterday's unmarked as done
        const mo2 = d2[yk] || { tasks: [] };
        mo2.tasks?.forEach(t => {
          if (t.days?.[yIdx] === 'unmarked') t.days[yIdx] = 'done';
        });
        d2[yk] = mo2;
        save(d2);
        el.innerHTML = `<div style="text-align:center;padding:20px"><div style="font-size:3rem">🔥</div><div style="font-size:1.1rem;font-weight:900;color:#4ade80;margin-top:12px">Streak Saved!</div><div style="color:rgba(255,255,255,0.5);font-size:0.82rem;margin-top:8px">Your streak continues. Don't let this happen again!</div><button onclick="this.parentElement.parentElement.parentElement.remove()" style="margin-top:16px;background:#4ade80;color:#000;border:none;border-radius:12px;padding:10px 28px;font-weight:900;cursor:pointer;font-family:inherit;">Got it ✓</button></div>`;
      };
    }, 2000);
  };

  /* ═══════════════════════════════════════════════
     3. LOSS AVERSION — "You've been overtaken!" alerts
  ═══════════════════════════════════════════════ */
  const rivalNames = ['Alex Chen','Sam Rivers','Jordan K.','Riley Moon','Morgan B.','Casey W.'];
  const checkRivalAlert = () => {
    const d = load();
    const today = new Date().toISOString().slice(0,10);
    if (d._lastRivalAlert === today) return;

    // Only show if user has a meaningful streak
    const streak = d.loginStreak?.count || 0;
    if (streak < 2) return;

    // Random chance (30%)
    if (Math.random() > 0.3) return;
    d._lastRivalAlert = today;
    save(d);

    const rival = rivalNames[Math.floor(Math.random() * rivalNames.length)];
    const xp    = d.xp?.lifetimeXP || 0;
    const rivalXP = xp + Math.floor(Math.random() * 200 + 50);

    setTimeout(() => {
      showRetentionToast(`⚠️ ${rival} just overtook you on the leaderboard!`, `They have ${rivalXP.toLocaleString()} XP vs your ${xp.toLocaleString()}. Fight back!`, '#f87171', 'leaderboard.html');
    }, 8000);
  };

  /* ═══════════════════════════════════════════════
     4. DEMOTION ANXIETY — league demotion warning
  ═══════════════════════════════════════════════ */
  const checkDemotionRisk = () => {
    const d = load();
    const today = new Date().toISOString().slice(0,10);
    if (d._demotionShown === today) return;

    const streak = d.loginStreak?.count || 0;
    const level  = d.xp?.level || 1;
    if (level < 3) return;

    // Show on Sunday evenings or randomly (20%)
    const isWeekend = [0,6].includes(new Date().getDay());
    if (!isWeekend && Math.random() > 0.2) return;

    d._demotionShown = today;
    save(d);

    setTimeout(() => {
      showRetentionToast('📉 League reset in 2 days!', 'You\'re in the danger zone. Complete more habits to avoid demotion!', '#fbbf24', 'leaderboard.html');
    }, 15000);
  };

  /* ═══════════════════════════════════════════════
     5. 2x XP BONUS EVENT — limited time
  ═══════════════════════════════════════════════ */
  const checkDoubleXPEvent = () => {
    const d = load();
    if (d._doubleXP?.until > Date.now()) {
      // Show banner
      const existing = document.getElementById('doubleXPBanner');
      if (existing) return;
      const banner = document.createElement('div');
      banner.id = 'doubleXPBanner';
      const remaining = Math.ceil((d._doubleXP.until - Date.now()) / 60000);
      banner.style.cssText = `
        position:fixed;top:0;left:0;right:0;z-index:9999;
        background:linear-gradient(90deg,#facc15,#f59e0b,#facc15);
        background-size:200% auto;animation:bannerShimmer 2s linear infinite;
        color:#000;font-weight:900;font-size:0.85rem;
        text-align:center;padding:8px;
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
        cursor:pointer;
      `;
      banner.textContent = `⚡ 2x XP ACTIVE — ${remaining} min remaining! Complete habits now!`;
      banner.onclick = () => banner.remove();
      document.body.appendChild(banner);
      if (!document.getElementById('bannerCSS')) {
        const s = document.createElement('style');
        s.id = 'bannerCSS';
        s.textContent = `@keyframes bannerShimmer{0%{background-position:0% center}100%{background-position:200% center}}`;
        document.head.appendChild(s);
      }
      setTimeout(() => banner.remove(), 5000);
      return;
    }

    // Random 2x event (5% chance on load)
    const today = new Date().toISOString().slice(0,10);
    const d2 = load();
    if (d2._doubleXPDate === today) return;
    if (Math.random() > 0.05) return;

    d2._doubleXPDate = today;
    d2._doubleXP = { until: Date.now() + 3600000 }; // 1 hour
    save(d2);

    showRetentionToast('⚡ SURPRISE: 2x XP for 1 hour!', 'A bonus event just started! All habits earn double XP right now. Go go go!', '#facc15');
  };

  /* ═══════════════════════════════════════════════
     6. MYSTERY CHEST — random reward on login
  ═══════════════════════════════════════════════ */
  const checkMysteryChest = () => {
    const d = load();
    const today = new Date().toISOString().slice(0,10);
    if (d._chestDate === today) return;

    const streak = d.loginStreak?.count || 0;
    // Every 7th day of streak, give a chest
    if (streak < 7 || streak % 7 !== 0) return;

    d._chestDate = today;
    save(d);

    setTimeout(() => {
      const prizes = [
        { label: '50 💎 Gems!',    apply: () => { const d2=load(); d2.gems=d2.gems||{total:0}; d2.gems.total=(d2.gems.total||0)+50; save(d2); } },
        { label: '100 XP Bonus!',  apply: () => { const d2=load(); d2.xp=d2.xp||{level:1,total:0,lifetimeXP:0}; d2.xp.total=(d2.xp.total||0)+100; d2.xp.lifetimeXP=(d2.xp.lifetimeXP||0)+100; save(d2); } },
        { label: '🛡️ Streak Shield!', apply: () => { const d2=load(); d2.shields=(d2.shields||0)+1; save(d2); } },
      ];
      const prize = prizes[Math.floor(Math.random() * prizes.length)];

      const el = document.createElement('div');
      el.style.cssText = `position:fixed;inset:0;z-index:999997;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;`;
      el.innerHTML = `
        <div style="text-align:center;animation:chestIn 0.5s cubic-bezier(0.34,1.56,0.64,1)">
          <div id="chestIcon" style="font-size:5rem;cursor:pointer;filter:drop-shadow(0 0 20px #facc15);transition:transform 0.2s">📦</div>
          <div style="font-size:1rem;color:rgba(255,255,255,0.6);margin-top:12px">Tap to open your <strong style="color:#facc15">${streak}-day reward!</strong></div>
          <div id="chestResult" style="display:none;margin-top:20px">
            <div style="font-size:2rem;font-weight:900;color:#facc15">${prize.label}</div>
            <button onclick="document.getElementById('chestOverlay').remove()" style="margin-top:20px;background:#facc15;color:#000;border:none;border-radius:12px;padding:12px 32px;font-size:0.95rem;font-weight:900;cursor:pointer;font-family:inherit;">Collect! ✓</button>
          </div>
        </div>`;
      el.id = 'chestOverlay';
      document.body.appendChild(el);
      if (!document.getElementById('chestCSS')) {
        const s = document.createElement('style');
        s.id = 'chestCSS';
        s.textContent = `@keyframes chestIn{from{opacity:0;transform:scale(0.5) translateY(40px)}to{opacity:1;transform:scale(1) translateY(0)}} @keyframes chestShake{0%,100%{transform:rotate(0)}20%{transform:rotate(-15deg)}40%{transform:rotate(15deg)}60%{transform:rotate(-10deg)}80%{transform:rotate(10deg)}}`;
        document.head.appendChild(s);
      }
      document.getElementById('chestIcon').onclick = function() {
        this.style.animation = 'chestShake 0.4s ease';
        this.textContent = '🎁';
        this.style.filter = 'drop-shadow(0 0 30px #4ade80)';
        setTimeout(() => {
          prize.apply();
          document.getElementById('chestResult').style.display = 'block';
          document.getElementById('chestIcon').style.fontSize = '3rem';
        }, 400);
      };
    }, 3000);
  };

  /* ═══════════════════════════════════════════════
     7. SOCIAL PRESSURE LIVE TICKER
  ═══════════════════════════════════════════════ */
  const startLiveTicker = () => {
    const events = [
      () => `🔥 ${rivalNames[~~(Math.random()*rivalNames.length)]} just completed their ${3+~~(Math.random()*25)}-day streak!`,
      () => `⚡ ${rivalNames[~~(Math.random()*rivalNames.length)]} reached Level ${5+~~(Math.random()*10)}!`,
      () => `✅ ${rivalNames[~~(Math.random()*rivalNames.length)]} completed all habits today!`,
      () => `🏆 ${rivalNames[~~(Math.random()*rivalNames.length)]} is now #${1+~~(Math.random()*3)} on the leaderboard!`,
      () => `💎 ${rivalNames[~~(Math.random()*rivalNames.length)]} collected ${20+~~(Math.random()*80)} gems today!`,
    ];

    const tick = () => {
      const msg = events[~~(Math.random()*events.length)]();
      const el = document.createElement('div');
      el.style.cssText = `
        position:fixed;bottom:80px;left:16px;
        background:rgba(17,17,24,0.95);
        border:1px solid rgba(255,255,255,0.1);
        border-radius:12px;padding:10px 14px;
        font-size:0.75rem;color:rgba(255,255,255,0.75);
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
        max-width:260px;z-index:9000;
        animation:tickIn 0.3s ease;
        box-shadow:0 4px 20px rgba(0,0,0,0.4);
      `;
      el.textContent = msg;
      if (!document.getElementById('tickerCSS')) {
        const s = document.createElement('style');
        s.id = 'tickerCSS';
        s.textContent = `@keyframes tickIn{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}} @keyframes tickOut{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(-20px)}}`;
        document.head.appendChild(s);
      }
      document.body.appendChild(el);
      setTimeout(() => {
        el.style.animation = 'tickOut 0.3s ease forwards';
        setTimeout(() => el.remove(), 300);
      }, 4000);
    };

    // Show first one after 20s, then every 35-60s
    setTimeout(tick, 20000);
    setInterval(tick, 35000 + Math.random() * 25000);
  };

  /* ═══════════════════════════════════════════════
     8. EVENING SHAME NOTIFICATION (in-app)
  ═══════════════════════════════════════════════ */
  const checkEveningNudge = () => {
    const hour = new Date().getHours();
    if (hour < 20) return; // only after 8pm

    const d = load();
    const today = new Date().toISOString().slice(0,10);
    if (d._eveningNudge === today) return;

    const mk = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`;
    const mo = d[mk] || { tasks: [] };
    const idx = new Date().getDate() - 1;
    const active = mo.tasks?.filter(t => t.days?.[idx] !== 'locked') || [];
    const remaining = active.filter(t => t.days?.[idx] !== 'done' && t.days?.[idx] !== 'failed').length;
    if (!remaining) return;

    d._eveningNudge = today;
    save(d);

    showRetentionToast(`🌙 ${remaining} habit${remaining>1?'s':''} still unmarked!`, "It's getting late. Don't break your streak tonight!", '#f87171');
  };

  /* ═══════════════════════════════════════════════
     9. GEM DECAY — lose gems if inactive 7+ days
  ═══════════════════════════════════════════════ */
  const checkGemDecay = () => {
    const d = load();
    const lastLogin = d.loginStreak?.lastDate;
    if (!lastLogin) return;
    const daysSince = Math.floor((Date.now() - new Date(lastLogin)) / 86400000);
    if (daysSince < 7) return;

    const gems = d.gems?.total || 0;
    if (gems < 10) return;

    const decayAmt = Math.min(gems, Math.floor(gems * 0.1 * (daysSince - 6)));
    if (decayAmt <= 0) return;

    d.gems.total -= decayAmt;
    save(d);

    showRetentionToast(`💎 Gem decay: -${decayAmt} gems!`, 'Inactive for a week — gems decay. Log in daily to keep them!', '#f87171');
  };

  /* ═══════════════════════════════════════════════
     SHARED TOAST HELPER
  ═══════════════════════════════════════════════ */
  const showRetentionToast = (title, body, color = '#4ade80', href = null) => {
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed;top:80px;right:16px;
      background:rgba(17,17,24,0.97);
      border:1px solid ${color}66;
      border-left:3px solid ${color};
      border-radius:14px;padding:14px 16px;
      max-width:300px;z-index:99990;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      box-shadow:0 8px 28px rgba(0,0,0,0.5);
      animation:rtIn 0.35s cubic-bezier(0.34,1.2,0.64,1);
      cursor:${href?'pointer':'default'};
    `;
    el.innerHTML = `
      <div style="font-size:0.82rem;font-weight:800;color:${color};margin-bottom:3px">${title}</div>
      <div style="font-size:0.75rem;color:rgba(255,255,255,0.55);line-height:1.5">${body}</div>
    `;
    if (href) el.onclick = () => { window.location.href = href; };
    if (!document.getElementById('rtCSS')) {
      const s = document.createElement('style');
      s.id = 'rtCSS';
      s.textContent = `@keyframes rtIn{from{opacity:0;transform:translateX(30px) scale(0.9)}to{opacity:1;transform:translateX(0) scale(1)}}`;
      document.head.appendChild(s);
    }
    document.body.appendChild(el);
    // Close btn
    const close = document.createElement('button');
    close.textContent = '✕';
    close.style.cssText = 'position:absolute;top:8px;right:10px;background:none;border:none;color:rgba(255,255,255,0.25);cursor:pointer;font-size:0.8rem;';
    close.onclick = (e) => { e.stopPropagation(); el.remove(); };
    el.style.position = 'fixed';
    el.appendChild(close);
    setTimeout(() => el.remove(), 8000);
  };

  /* ═══════════════════════════════════════════════
     10. PROGRESS ILLUSION — "You're top X%!" banner
  ═══════════════════════════════════════════════ */
  const showProgressIllusion = () => {
    const d = load();
    const today = new Date().toISOString().slice(0,10);
    if (d._illusionDate === today) return;
    if (Math.random() > 0.25) return;
    d._illusionDate = today;
    save(d);

    const pct = Math.floor(Math.random() * 15) + 3; // 3–17%
    setTimeout(() => {
      showRetentionToast(`🏆 You're in the top ${pct}%!`, 'Your habit consistency this week is better than most. Keep it up!', '#facc15');
    }, 12000);
  };

  /* ═══════════════════════════════════════════════
     PUBLIC INIT
  ═══════════════════════════════════════════════ */
  const init = () => {
    if (!au()) return;

    // Run all checks
    checkStreakRepair();
    checkDoubleXPEvent();
    checkMysteryChest();
    checkRivalAlert();
    checkDemotionRisk();
    checkGemDecay();
    checkEveningNudge();
    showProgressIllusion();
    startLiveTicker();

    // Expose spin wheel for perfect day check
    window._retentionSpinWheel = showSpinWheel;
    window._retentionDoubleXPActive = () => {
      const d = load();
      return !!(d._doubleXP?.until > Date.now());
    };
  };

  return { init, showSpinWheel, showRetentionToast };
})();

window.RetentionEngine = RetentionEngine;

// Auto-init after DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => RetentionEngine.init());
} else {
  setTimeout(() => RetentionEngine.init(), 500);
}