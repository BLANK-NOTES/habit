/**
 * habitPremium.js — Freemium gate for Habit Tracker
 * Single source of truth. Import before any feature checks.
 *
 * Plan storage: localStorage key "habitPlan"
 *   { plan: "free"|"premium", activatedAt: ISO, expiresAt: ISO|null, method: "stripe"|"promo"|"dev" }
 *
 * FREE limits:
 *   - Max 5 habits
 *   - Dark + Light themes only
 *   - No XP / levels / gems / leagues
 *   - No streak shields or freezes
 *   - No social (friends / challenges)
 *   - No AI coach
 *   - Journal: 5 entries per month max
 *   - No Wrapped / analytics deep dive
 *   - No Byte easter eggs (basic tips only)
 *
 * PREMIUM (£3.99/mo or £29.99/yr):
 *   - Everything unlimited
 */

(function () {
  "use strict";

  const PLAN_KEY    = "habitPlan";
  const PRICES      = { monthly: "£3.99/mo", yearly: "£29.99/yr", yearlyRaw: 29.99, monthlyRaw: 3.99 };

  // Promo codes — value is duration in days (null = permanent)
  // Dev code: re-enterable after each 24h expiry
  const PROMO_CODES = {
    "0307305718081": { days: 1,   label: "Dev 24h Access",    dev: true  },
    "HABITFREE30":   { days: 30,  label: "30-Day Free Trial", dev: false },
    "WELCOME2025":   { days: 7,   label: "Welcome Week",      dev: false },
    "BYTEFAN":       { days: 14,  label: "Byte Fan Bonus",    dev: false },
  };
  const FREE_LIMITS = {
    maxHabits:       5,
    journalPerMonth: 5,
    themes:          ["dark", "light"],
  };

  /* ─── Plan helpers ─────────────────────────────────────────────── */
  const getPlan = () => {
    try {
      const raw = localStorage.getItem(PLAN_KEY);
      if (!raw) return { plan: "free" };
      const p = JSON.parse(raw);
      // Check expiry
      if (p.expiresAt && new Date(p.expiresAt) < new Date()) {
        localStorage.removeItem(PLAN_KEY);
        return { plan: "free" };
      }
      return p;
    } catch { return { plan: "free" }; }
  };

  const isPremium = () => getPlan().plan === "premium";

  const activatePremium = (method = "stripe", durationDays = null) => {
    const now = new Date();
    const expires = durationDays
      ? new Date(now.getTime() + durationDays * 86400000).toISOString()
      : null; // null = lifetime/managed externally
    localStorage.setItem(PLAN_KEY, JSON.stringify({
      plan: "premium",
      activatedAt: now.toISOString(),
      expiresAt: expires,
      method,
    }));
    // Also stamp on auth_user so other pages can read it quickly
    try {
      const au = JSON.parse(localStorage.getItem("auth_user") || "{}");
      au.plan = "premium";
      localStorage.setItem("auth_user", JSON.stringify(au));
    } catch {}
  };

  const deactivatePremium = () => {
    localStorage.removeItem(PLAN_KEY);
    try {
      const au = JSON.parse(localStorage.getItem("auth_user") || "{}");
      au.plan = "free";
      localStorage.setItem("auth_user", JSON.stringify(au));
    } catch {}
  };

  /* ─── Feature gates ────────────────────────────────────────────── */
  const can = {
    addHabit:      (currentCount) => isPremium() || currentCount < FREE_LIMITS.maxHabits,
    useTheme:      (theme)        => isPremium() || FREE_LIMITS.themes.includes(theme),
    useXP:         ()             => isPremium(),
    useGems:       ()             => isPremium(),
    useLeagues:    ()             => isPremium(),
    useShields:    ()             => isPremium(),
    useFreezes:    ()             => isPremium(),
    useSocial:     ()             => isPremium(),
    useCoach:      ()             => isPremium(),
    useJournal:    (entryCount)   => isPremium() || entryCount < FREE_LIMITS.journalPerMonth,
    useWrapped:    ()             => isPremium(),
    useAnalytics:  ()             => isPremium(),
    useByteEggs:   ()             => isPremium(),
  };

  /* ─── Upgrade wall modal ───────────────────────────────────────── */
  const FEATURE_COPY = {
    habits:    { icon:"📋", title:"Unlimited Habits",       desc:"Free plan is limited to 5 habits. Upgrade to add as many as you want." },
    themes:    { icon:"🎨", title:"Premium Themes",         desc:"Unlock Pink, Blue, Yellow, Army, Ferrari, Midnight, and Ocean themes." },
    xp:        { icon:"⚡", title:"XP & Levels",            desc:"Earn XP, level up, and track your lifetime progress on the leaderboard." },
    gems:      { icon:"💎", title:"Gems System",            desc:"Earn gems from habits and spend them to protect your streaks." },
    leagues:   { icon:"🏆", title:"Leagues",                desc:"Compete in Bronze → Legendary leagues based on your lifetime XP." },
    shields:   { icon:"🛡️", title:"Streak Shields",         desc:"Earn shields from perfect weeks to automatically protect your streaks." },
    freezes:   { icon:"❄️", title:"Streak Freezes",         desc:"Spend gems to freeze habits or your login streak for a day." },
    social:    { icon:"👥", title:"Friends & Challenges",   desc:"Add friends, challenge them to habit competitions, and compare progress." },
    coach:     { icon:"🧠", title:"AI Habit Coach",         desc:"Get personalised habit advice powered by AI, based on your real data." },
    journal:   { icon:"📓", title:"Unlimited Journal",      desc:"Free plan limits you to 5 journal entries per month." },
    wrapped:   { icon:"✨", title:"Year Wrapped",           desc:"Your personal Spotify-style annual habit review." },
    analytics: { icon:"📊", title:"Deep Analytics",         desc:"Heatmaps, trend graphs, best days analysis and habit correlations." },
  };

  const showUpgradeWall = (featureKey = "habits", onDismiss = null) => {
    document.getElementById("premiumWall")?.remove();

    const f = FEATURE_COPY[featureKey] || FEATURE_COPY.habits;
    const wall = document.createElement("div");
    wall.id = "premiumWall";
    wall.style.cssText = `
      position:fixed;inset:0;z-index:99999;
      background:rgba(0,0,0,0.75);backdrop-filter:blur(12px);
      overflow-y:auto;
      height:100%;
      animation:wallIn 0.25s cubic-bezier(0.34,1.1,0.64,1);
    `;

    wall.innerHTML = `
      <style>
        @keyframes wallIn { from{opacity:0;transform:scale(0.94)} to{opacity:1;transform:none} }
        .pw-wall-inner {
          min-height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          box-sizing: border-box;
        }
        .pw-card {
          background: linear-gradient(145deg, #0f1a12, #111820);
          border: 1px solid rgba(16,185,129,0.3);
          border-radius: 24px;
          padding: 32px 28px 24px;
          max-width: 400px;
          width: 100%;
          text-align: center;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          box-shadow: 0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(16,185,129,0.1);
          position: relative;
        }
        .pw-close {
          position:absolute;top:16px;right:16px;
          background:rgba(255,255,255,0.06);border:none;
          color:rgba(255,255,255,0.4);border-radius:8px;
          width:28px;height:28px;cursor:pointer;font-size:0.9rem;
          display:flex;align-items:center;justify-content:center;
          transition:all 0.2s;
        }
        .pw-close:hover{background:rgba(255,255,255,0.12);color:#fff;}
        .pw-badge {
          display:inline-block;
          background:linear-gradient(135deg,#f59e0b,#d97706);
          color:#000;font-size:0.62rem;font-weight:900;
          letter-spacing:0.12em;text-transform:uppercase;
          border-radius:20px;padding:3px 10px;margin-bottom:16px;
        }
        .pw-icon { font-size:3rem;margin-bottom:12px;line-height:1; }
        .pw-title { font-size:1.35rem;font-weight:900;color:#fff;margin-bottom:8px; }
        .pw-desc { font-size:0.85rem;color:rgba(255,255,255,0.55);line-height:1.6;margin-bottom:24px; }
        .pw-perks {
          display:flex;flex-direction:column;gap:8px;
          margin-bottom:24px;text-align:left;
        }
        .pw-perk {
          display:flex;align-items:center;gap:10px;
          font-size:0.82rem;color:rgba(255,255,255,0.75);
        }
        .pw-perk-dot {
          width:18px;height:18px;border-radius:50%;
          background:rgba(16,185,129,0.15);
          border:1.5px solid rgba(16,185,129,0.5);
          display:flex;align-items:center;justify-content:center;
          font-size:0.65rem;color:#10b981;flex-shrink:0;
        }
        .pw-plans { display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px; }
        .pw-plan {
          background:rgba(255,255,255,0.04);
          border:1.5px solid rgba(255,255,255,0.1);
          border-radius:14px;padding:14px;cursor:pointer;
          transition:all 0.2s;
        }
        .pw-plan:hover,.pw-plan.sel { border-color:#10b981;background:rgba(16,185,129,0.08); }
        .pw-plan.sel { box-shadow:0 0 0 1px rgba(16,185,129,0.3); }
        .pw-plan-badge {
          font-size:0.55rem;font-weight:900;letter-spacing:0.1em;text-transform:uppercase;
          color:#f59e0b;margin-bottom:4px;
        }
        .pw-plan-price { font-size:1.3rem;font-weight:900;color:#fff;line-height:1; }
        .pw-plan-period { font-size:0.65rem;color:rgba(255,255,255,0.4);margin-top:2px; }
        .pw-plan-save {
          margin-top:5px;font-size:0.6rem;font-weight:800;
          color:#10b981;letter-spacing:0.05em;
        }
        .pw-cta {
          width:100%;padding:15px;
          background:linear-gradient(135deg,#10b981,#059669);
          border:none;border-radius:14px;
          color:#fff;font-size:1rem;font-weight:900;
          cursor:pointer;font-family:inherit;
          transition:all 0.2s;
          box-shadow:0 6px 24px rgba(16,185,129,0.35);
          margin-bottom:12px;
        }
        .pw-cta:hover { transform:translateY(-2px);box-shadow:0 8px 32px rgba(16,185,129,0.45); }
        .pw-dismiss {
          background:none;border:none;color:rgba(255,255,255,0.3);
          font-size:0.78rem;cursor:pointer;font-family:inherit;
          transition:color 0.2s;padding:4px 8px;
        }
        .pw-dismiss:hover { color:rgba(255,255,255,0.55); }
        .pw-secure {
          font-size:0.65rem;color:rgba(255,255,255,0.25);margin-top:8px;
        }
      </style>
      <div class="pw-wall-inner"><div class="pw-card">
        <button class="pw-close" id="pwClose">✕</button>
        <div class="pw-badge">⭐ Premium</div>
        <div class="pw-icon">${f.icon}</div>
        <div class="pw-title">${f.title}</div>
        <div class="pw-desc">${f.desc}</div>

        <div class="pw-perks">
          <div class="pw-perk"><div class="pw-perk-dot">✓</div> Unlimited habits (free = 5 max)</div>
          <div class="pw-perk"><div class="pw-perk-dot">✓</div> XP, levels, gems & leagues</div>
          <div class="pw-perk"><div class="pw-perk-dot">✓</div> Streak shields & freezes</div>
          <div class="pw-perk"><div class="pw-perk-dot">✓</div> Friends, challenges & nudges</div>
          <div class="pw-perk"><div class="pw-perk-dot">✓</div> AI Habit Coach</div>
          <div class="pw-perk"><div class="pw-perk-dot">✓</div> All 9 themes + analytics + Wrapped</div>
        </div>

        <div class="pw-plans">
          <div class="pw-plan" id="pwPlanMonthly" onclick="window._pwSelectPlan('monthly')">
            <div class="pw-plan-price">£3.99</div>
            <div class="pw-plan-period">per month</div>
          </div>
          <div class="pw-plan sel" id="pwPlanYearly" onclick="window._pwSelectPlan('yearly')">
            <div class="pw-plan-badge">🔥 Best value</div>
            <div class="pw-plan-price">£29.99</div>
            <div class="pw-plan-period">per year</div>
            <div class="pw-plan-save">Save 37% vs monthly</div>
          </div>
        </div>

        <button class="pw-cta" id="pwCtaBtn">Unlock Premium →</button>
        <button class="pw-dismiss" id="pwDismiss">Maybe later</button>
        <div class="pw-secure">🔒 Secure payment · Cancel any time</div>
      </div></div>`;

        // Remove any lingering body animation (transform on body breaks position:fixed)
    document.body.style.animation = "none";
    document.body.style.transform = "none";
    document.body.appendChild(wall);
    window.scrollTo(0, 0);

    let selectedPlan = "yearly";
    window._pwSelectPlan = (plan) => {
      selectedPlan = plan;
      document.getElementById("pwPlanMonthly").classList.toggle("sel", plan === "monthly");
      document.getElementById("pwPlanYearly").classList.toggle("sel",  plan === "yearly");
    };

    const close = () => {
      wall.style.opacity = "0";
      wall.style.transition = "opacity 0.2s";
      setTimeout(() => wall.remove(), 200);
      if (onDismiss) onDismiss();
    };

    document.getElementById("pwClose").onclick   = close;
    document.getElementById("pwDismiss").onclick  = close;
    wall.addEventListener("click", e => { if (e.target === wall) close(); });

    document.getElementById("pwCtaBtn").onclick = () => {
      // In production: open Stripe checkout. For now, open upgrade page.
      window.location.href = "upgrade.html?plan=" + selectedPlan;
    };
  };

  /* ─── Free tier limit helpers ──────────────────────────────────── */
  const habitCount = () => {
    try {
      const au   = JSON.parse(localStorage.getItem("auth_user") || "{}");
      const now  = new Date();
      const mk   = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0");
      const data = JSON.parse(localStorage.getItem("habitTracker_" + au.id) || "{}");
      return (data[mk]?.tasks || []).length;
    } catch { return 0; }
  };

  const journalEntryCount = () => {
    try {
      const au   = JSON.parse(localStorage.getItem("auth_user") || "{}");
      const now  = new Date();
      const mk   = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0");
      const data = JSON.parse(localStorage.getItem("habitTracker_" + au.id) || "{}");
      return (data.journal || []).filter(e => e.date?.startsWith(mk)).length;
    } catch { return 0; }
  };

  /* ─── Theme enforcement ────────────────────────────────────────── */
  const enforceTheme = () => {
    if (isPremium()) return;
    const current = localStorage.getItem("habitTheme") || "dark";
    if (!FREE_LIMITS.themes.includes(current)) {
      localStorage.setItem("habitTheme", "dark");
      document.body?.setAttribute("data-theme", "dark");
      document.documentElement?.setAttribute("data-theme", "dark");
    }
  };

  /* ─── Free banner ──────────────────────────────────────────────── */
  const renderFreeBanner = (containerId) => {
    if (isPremium()) return;
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = `
      <div style="
        background:linear-gradient(135deg,rgba(245,158,11,0.1),rgba(16,185,129,0.08));
        border:1px solid rgba(245,158,11,0.25);
        border-radius:12px;padding:10px 14px;
        display:flex;align-items:center;gap:12px;
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
        cursor:pointer;transition:all 0.2s;
      " onclick="window.HabitPremium.showUpgradeWall('habits')">
        <span style="font-size:1rem">⭐</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:0.78rem;font-weight:800;color:#f59e0b">Free Plan</div>
          <div style="font-size:0.68rem;color:rgba(255,255,255,0.45)">
            ${FREE_LIMITS.maxHabits - habitCount()} habit slots left · Upgrade for unlimited
          </div>
        </div>
        <span style="font-size:0.72rem;font-weight:800;color:#10b981;white-space:nowrap">Upgrade →</span>
      </div>`;
  };

  /* ─── Plan badge for profile/settings ─────────────────────────── */
  const getPlanBadgeHTML = () => isPremium()
    ? `<span style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#000;font-size:0.6rem;font-weight:900;letter-spacing:0.1em;border-radius:20px;padding:2px 8px;">⭐ PREMIUM</span>`
    : `<span style="background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.4);font-size:0.6rem;font-weight:700;letter-spacing:0.06em;border-radius:20px;padding:2px 8px;border:1px solid rgba(255,255,255,0.1);">FREE</span>`;

  /* ─── Promo code redemption ───────────────────────────────────── */
  const redeemPromoCode = (rawCode) => {
    const code = (rawCode || "").trim().toUpperCase().replace(/-/g, "");
    // Also check as-is (for numeric codes that are case-neutral)
    const promoKey = PROMO_CODES[code] ? code : rawCode.trim();
    const promo = PROMO_CODES[promoKey];

    if (!promo) {
      return { success: false, msg: "Invalid code. Check for typos and try again." };
    }

    // For dev codes: always allow re-entry (even if currently premium via same method)
    // Check if already active via this exact code and not yet expired
    try {
      const current = getPlan();
      if (current.plan === "premium" && current.promoCode === promoKey && !promo.dev) {
        return { success: false, msg: "This code is already active on your account." };
      }
    } catch {}

    activatePremium("promo", promo.days);

    // Stamp the promo code used for tracking
    try {
      const raw = localStorage.getItem(PLAN_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        p.promoCode = promoKey;
        p.promoLabel = promo.label;
        localStorage.setItem(PLAN_KEY, JSON.stringify(p));
      }
    } catch {}

    const expMsg = promo.days === 1
      ? "24 hours of Premium — enjoy!"
      : promo.days + " days of Premium unlocked!";

    return { success: true, msg: expMsg, label: promo.label, days: promo.days };
  };

  /* ─── Export ────────────────────────────────────────────────────── */
  window.HabitPremium = {
    isPremium,
    getPlan,
    activatePremium,
    deactivatePremium,
    redeemPromoCode,
    can,
    showUpgradeWall,
    enforceTheme,
    renderFreeBanner,
    getPlanBadgeHTML,
    habitCount,
    journalEntryCount,
    FREE_LIMITS,
    PRICES,
  };
})();