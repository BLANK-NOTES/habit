/* =====================================================
   BYTE — Habit Tracker Mascot & Tutorial System
   
   Byte is a friendly little robot/orb character who
   guides new users through the app with personality.
   Inspired by Duo but with its own distinct vibe.
===================================================== */

const ByteTutorial = (() => {

  const STORAGE_KEY = "habitTutorialState";
  const getTutState = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  const saveTutState = (s) => localStorage.setItem(STORAGE_KEY, JSON.stringify(s));

  /* ── Byte's personality lines ── */
  const BYTE_MOODS = {
    happy:   { face: `<circle cx="38" cy="44" r="5" fill="#1a1a2e"/><circle cx="62" cy="44" r="5" fill="#1a1a2e"/><path d="M33 56 Q50 68 67 56" stroke="#1a1a2e" stroke-width="3.5" fill="none" stroke-linecap="round"/>`, glow: "#4ade80" },
    excited: { face: `<circle cx="38" cy="43" r="6" fill="#1a1a2e"/><circle cx="62" cy="43" r="6" fill="#1a1a2e"/><path d="M30 55 Q50 72 70 55" stroke="#1a1a2e" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="38" cy="41" r="2.5" fill="white" opacity="0.7"/><circle cx="62" cy="41" r="2.5" fill="white" opacity="0.7"/>`, glow: "#facc15" },
    thinking:{ face: `<ellipse cx="38" cy="44" rx="5" ry="4" fill="#1a1a2e"/><ellipse cx="62" cy="44" rx="5" ry="4" fill="#1a1a2e"/><path d="M36 58 Q50 55 64 58" stroke="#1a1a2e" stroke-width="3" fill="none" stroke-linecap="round"/>`, glow: "#a78bfa" },
    cool:    { face: `<rect x="28" y="40" width="20" height="9" rx="4" fill="#1a1a2e"/><rect x="52" y="40" width="20" height="9" rx="4" fill="#1a1a2e"/><path d="M33 56 Q50 67 67 56" stroke="#1a1a2e" stroke-width="3.5" fill="none" stroke-linecap="round"/>`, glow: "#06b6d4" },
    cheer:   { face: `<circle cx="38" cy="42" r="6" fill="#1a1a2e"/><circle cx="62" cy="42" r="6" fill="#1a1a2e"/><circle cx="37" cy="40" r="2.5" fill="white" opacity="0.8"/><circle cx="61" cy="40" r="2.5" fill="white" opacity="0.8"/><path d="M28 56 Q50 74 72 56" stroke="#1a1a2e" stroke-width="4.5" fill="none" stroke-linecap="round"/>`, glow: "#fb923c" },
    wink:    { face: `<circle cx="38" cy="44" r="5" fill="#1a1a2e"/><path d="M55 40 L69 40" stroke="#1a1a2e" stroke-width="4" stroke-linecap="round"/><path d="M33 56 Q50 68 67 56" stroke="#1a1a2e" stroke-width="3.5" fill="none" stroke-linecap="round"/>`, glow: "#4ade80" },
  };

  /* ── Tutorial steps ── */
  const STEPS = [
    {
      id: "welcome",
      mood: "excited",
      title: "Hey! I'm Byte! 👋",
      text: "I'm your habit buddy. I'll be here every step of the way — cheering you on, giving tips, and keeping you honest. Let me show you around!",
      action: "Let's go!",
      highlight: null,
      position: "center",
    },
    {
      id: "grid",
      mood: "happy",
      title: "Your habit grid",
      text: "This is the heart of the app. Each row is a habit, each column is a day of the month. Tap a cell to mark it ✅ done or ❌ missed.",
      action: "Got it →",
      highlight: ".month-grid-wrapper",
      position: "bottom",
    },
    {
      id: "add_habit",
      mood: "thinking",
      title: "Add your first habit",
      text: "Hit '+ Add Habit' to create a new one. Give it a name, pick a schedule — daily, weekly, or every N days — and you're set.",
      action: "Next →",
      highlight: "#addTaskBtn",
      position: "bottom",
    },
    {
      id: "streak",
      mood: "cheer",
      title: "Build your streak 🔥",
      text: "Complete enough habits each day and your streak grows. Miss a day and it resets — unless you spend gems to save it! Streaks are addictive, trust me.",
      action: "Ooh! →",
      highlight: ".streak-stat",
      position: "bottom",
    },
    {
      id: "xp",
      mood: "cool",
      title: "Earn XP & level up ⚡",
      text: "Every habit you tick earns XP. Level up, climb leagues, and unlock achievements. The more consistent you are, the faster you rise.",
      action: "Nice →",
      highlight: ".xp-bar-wrapper",
      position: "bottom",
    },
    {
      id: "gems",
      mood: "wink",
      title: "Collect gems 💎",
      text: "Perfect days earn you gems — 10 per day. Spend them to freeze a streak when life gets in the way. No shame, we all need a lifeline.",
      action: "Smart! →",
      highlight: ".stat[title]",
      position: "bottom",
    },
    {
      id: "mood",
      mood: "happy",
      title: "Log your mood 😊",
      text: "Each morning I'll pop up and ask how you're feeling. It only takes a second and you can track your mood over time in the Journal.",
      action: "Love it →",
      highlight: null,
      position: "center",
    },
    {
      id: "settings",
      mood: "thinking",
      title: "Everything's in Settings ⚙️",
      text: "Change your theme, set reminders, view achievements, find friends, check your analytics — all in one place. It's the control room.",
      action: "Makes sense →",
      highlight: "a[href='settings.html']",
      position: "bottom",
    },
    {
      id: "free_vs_premium",
      mood: "thinking",
      title: "Free plan vs Premium — here's the deal",
      text: "On the <strong>Free plan</strong> you get 5 habits, streak tracking, and dark/light themes. That's honestly solid for starting out. <strong>Premium</strong> unlocks unlimited habits, XP, leagues, streak shields, AI Coach, all 9 themes, friends & challenges, and Byte's full personality. You can try it free for 7 days.",
      action: "Got it →",
      highlight: null,
      position: "center",
    },
    {
      id: "premium_stats",
      mood: "excited",
      title: "⭐ Premium users are 5× more likely to stick to their habits",
      text: "Seriously. Users with XP, leagues, streak shields and daily quests stay consistent 5 times longer than free users. It's the same reason Duolingo works — the game layer makes you come back.",
      action: "Tell me more →",
      highlight: null,
      position: "center",
    },
    {
      id: "premium",
      mood: "wink",
      title: "Try Premium free for 7 days ⭐",
      text: "Unlimited habits · XP & leagues · Streak shields · Friends & challenges · All 9 themes · AI Coach coming soon. Cancel any time. No charge for 7 days.",
      action: "Maybe later →",
      highlight: null,
      position: "center",
      cta: { label: "Start 7-day free trial →", href: "upgrade.html" },
    },
    {
      id: "done",
      mood: "cheer",
      title: "You're all set! 🚀",
      text: "That's everything you need to get started. Remember — small habits, done consistently, change everything. I'll be here rooting for you. Now go build something great!",
      action: "Let's do this! 💪",
      highlight: null,
      position: "center",
    },
  ];

  /* ── State ── */
  let currentStep = 0;
  let overlayEl   = null;
  let byteEl      = null;
  let isOpen      = false;

  /* ── Build Byte SVG ── */
  const buildByteSVG = (mood = "happy", size = 100) => {
    const m = BYTE_MOODS[mood] || BYTE_MOODS.happy;
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="byteBody" cx="45%" cy="35%" r="60%">
            <stop offset="0%" stop-color="#6ee7b7"/>
            <stop offset="60%" stop-color="#10b981"/>
            <stop offset="100%" stop-color="#059669"/>
          </radialGradient>
          <radialGradient id="byteGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${m.glow}" stop-opacity="0.4"/>
            <stop offset="100%" stop-color="${m.glow}" stop-opacity="0"/>
          </radialGradient>
          <filter id="byteShadow">
            <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="${m.glow}" flood-opacity="0.5"/>
          </filter>
        </defs>
        <!-- Glow -->
        <ellipse cx="50" cy="50" rx="48" ry="48" fill="url(#byteGlow)"/>
        <!-- Body -->
        <circle cx="50" cy="50" r="38" fill="url(#byteBody)" filter="url(#byteShadow)"/>
        <!-- Shine -->
        <ellipse cx="37" cy="33" rx="12" ry="8" fill="white" opacity="0.25" transform="rotate(-20 37 33)"/>
        <!-- Antenna -->
        <line x1="50" y1="12" x2="50" y2="26" stroke="#059669" stroke-width="3" stroke-linecap="round"/>
        <circle cx="50" cy="10" r="4" fill="${m.glow}"/>
        <!-- Ears / side bumps -->
        <circle cx="12" cy="50" r="7" fill="#059669"/>
        <circle cx="88" cy="50" r="7" fill="#059669"/>
        <!-- Face -->
        ${m.face}
        <!-- Cheeks -->
        <circle cx="26" cy="54" r="6" fill="${m.glow}" opacity="0.3"/>
        <circle cx="74" cy="54" r="6" fill="${m.glow}" opacity="0.3"/>
      </svg>`;
  };

  /* ── Floating Byte widget (persistent after tutorial) ── */
  const buildFloatingByte = () => {
    const btn = document.createElement("div");
    btn.id = "byteFloat";
    btn.innerHTML = buildByteSVG("happy", 54);
    btn.title = "Chat with Byte";
    btn.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 54px;
      height: 54px;
      cursor: pointer;
      z-index: 9000;
      animation: byteFloat 3s ease-in-out infinite;
      filter: drop-shadow(0 4px 12px rgba(16,185,129,0.4));
      transition: transform 0.2s ease;
    `;
    btn.addEventListener("mouseenter", () => btn.style.transform = "scale(1.15)");
    btn.addEventListener("mouseleave", () => btn.style.transform = "scale(1)");
    btn.addEventListener("click", () => openQuickChat());
    document.body.appendChild(btn);
  };

  /* ── Quick chat tips ── */
  const TIPS = [
    { mood:"happy",   text:"Tip: Right-click any cell to add a personal note to that day! 📝" },
    { mood:"thinking",text:"Did you know? Completing habits in quick succession gives you a combo bonus! ⚡" },
    { mood:"cool",    text:"Seasons give XP bonuses — check the top of the dashboard for active events! 🎃" },
    { mood:"cheer",   text:"You can challenge friends to habit competitions in the Friends tab! ⚔️" },
    { mood:"wink",    text:"Streak freezes cost 30💎 per habit. Save those gems on your toughest habits!" },
    { mood:"happy",   text:"The Journal tracks your mood over time. Try to log it every day! 😊" },
    { mood:"excited", text:"Perfect a full month and you'll unlock rare badges. Can you do it? 🏆" },
    { mood:"thinking",text:"Your Analytics page shows which days of the week you're strongest. Use that info!" },
    // Premium nudge tips — shown only to free users
    { mood:"excited", text:"⭐ Premium users are <strong>5× more likely</strong> to keep their streaks. Byte has seen the data. It's real.", premium: false },
    { mood:"wink",    text:"⭐ There's a <strong>7-day free trial</strong> — no card needed. Byte thinks you should try it. Just saying.", premium: false },
    { mood:"cool",    text:"⭐ XP, leagues, streak shields and daily quests are all waiting for you in Premium. From £3.99/mo.", premium: false },
    { mood:"cheer",   text:"⭐ Byte's favourite Premium feature? Streak shields. Never lose a streak to one bad day again. 🛡️", premium: false },
    { mood:"thinking",text:"⭐ Premium unlocks 7 extra themes, the AI Coach, and unlimited habits. Byte thinks that's a bargain.", premium: false },
  ];
  let lastTipIdx = -1;

  const openQuickChat = () => {
    const isPrem = window.HabitPremium?.isPremium?.() || false;
    // Build eligible tips: always include regular tips; include premium nudges only for free users
    const eligible = TIPS.filter(t => isPrem ? t.premium !== false : true);
    let idx;
    do { idx = Math.floor(Math.random() * eligible.length); } while (eligible[idx] === TIPS[lastTipIdx]);
    lastTipIdx = idx;
    const tip = eligible[idx];
    const title = tip.premium === false ? "⭐ Byte's Suggestion" : "💡 Byte's Tip";
    showBubble(tip.mood, title, tip.text, false);
  };

  /* ── Show a speech bubble ── */
  const showBubble = (mood, title, text, showClose = true) => {
    removeBubble();
    const bubble = document.createElement("div");
    bubble.id = "byteBubble";
    bubble.style.cssText = `
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: min(320px, calc(100vw - 40px));
      background: var(--bg-panel, #111118);
      border: 1px solid rgba(16,185,129,0.3);
      border-radius: 18px 18px 4px 18px;
      padding: 16px;
      z-index: 9001;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(16,185,129,0.1);
      animation: byteBubbleIn 0.3s cubic-bezier(0.34,1.56,0.64,1);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    `;
    bubble.innerHTML = `
      <div style="display:flex;align-items:flex-start;gap:10px">
        <div style="flex-shrink:0;width:36px;height:36px;animation:byteFloat 2s ease-in-out infinite">
          ${buildByteSVG(mood, 36)}
        </div>
        <div style="flex:1">
          <div style="font-size:0.7rem;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#10b981;margin-bottom:3px">${title}</div>
          <div style="font-size:0.84rem;line-height:1.5;color:var(--text,#eeeef5)">${text}</div>
        </div>
        ${showClose ? `<button onclick="document.getElementById('byteBubble')?.remove()" style="background:none;border:none;color:rgba(255,255,255,0.3);font-size:1rem;cursor:pointer;padding:0;line-height:1;flex-shrink:0">✕</button>` : ""}
      </div>`;
    document.body.appendChild(bubble);
    if (!showClose) setTimeout(removeBubble, 5000);
  };

  const removeBubble = () => document.getElementById("byteBubble")?.remove();

  /* ── Main tutorial overlay ── */
  const buildOverlay = () => {
    // Remove existing
    document.getElementById("byteTutorialOverlay")?.remove();

    const step = STEPS[currentStep];
    const mood = step.mood || "happy";
    const m    = BYTE_MOODS[mood];

    overlayEl = document.createElement("div");
    overlayEl.id = "byteTutorialOverlay";
    overlayEl.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 99000;
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    `;

    // Dim backdrop (pointer events on backdrop only if no highlight)
    const backdrop = document.createElement("div");
    backdrop.style.cssText = `
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,0.75);
      backdrop-filter: blur(2px);
      pointer-events: all;
    `;

    // If there's a highlight target, cut a hole
    let highlightRect = null;
    if (step.highlight) {
      const target = document.querySelector(step.highlight);
      if (target) {
        highlightRect = target.getBoundingClientRect();
        const pad = 8;
        // Use clip-path to punch hole in backdrop
        const top    = highlightRect.top    - pad;
        const left   = highlightRect.left   - pad;
        const bottom = highlightRect.bottom + pad;
        const right  = highlightRect.right  + pad;
        backdrop.style.clipPath = `polygon(
          0% 0%, 100% 0%, 100% 100%, 0% 100%,
          0% ${top}px,
          ${left}px ${top}px,
          ${left}px ${bottom}px,
          ${right}px ${bottom}px,
          ${right}px ${top}px,
          0% ${top}px,
          0% 0%
        )`;
        // Highlight ring
        const ring = document.createElement("div");
        ring.style.cssText = `
          position: absolute;
          top: ${top}px;
          left: ${left}px;
          width: ${right - left}px;
          height: ${bottom - top}px;
          border: 2px solid ${m.glow};
          border-radius: 12px;
          box-shadow: 0 0 0 4px ${m.glow}33, 0 0 20px ${m.glow}55;
          pointer-events: none;
          animation: byteRingPulse 1.5s ease-in-out infinite;
        `;
        overlayEl.appendChild(ring);
      }
    }

    overlayEl.appendChild(backdrop);

    // Card
    const card = document.createElement("div");
    card.style.cssText = `
      position: absolute;
      pointer-events: all;
      width: min(380px, calc(100vw - 40px));
      background: var(--bg-panel, #111118);
      border: 1px solid rgba(16,185,129,0.25);
      border-radius: 24px;
      padding: 28px 24px 22px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05);
      /* animation set dynamically below based on position */
    `;

    // Position card
    if (step.position === "center" || !highlightRect) {
      card.style.top  = "50%";
      card.style.left = "50%";
      card.style.transform = "translate(-50%, -50%)";
    } else {
      // Position near highlighted element
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const cardW = Math.min(380, vw - 40);
      const cardH = 250; // approx

      let top  = highlightRect.bottom + 20;
      let left = Math.max(20, highlightRect.left + highlightRect.width/2 - cardW/2);
      left     = Math.min(left, vw - cardW - 20);

      if (top + cardH > vh - 20) top = highlightRect.top - cardH - 20;
      if (top < 20) { top = Math.round(window.innerHeight * 0.5 - 125); }

      card.style.top  = `${top}px`;
      card.style.left = `${left}px`;
    }

    // Progress dots
    const dots = STEPS.map((_, i) => 
      `<div style="width:${i===currentStep?20:7}px;height:7px;border-radius:4px;background:${i===currentStep?m.glow:"rgba(255,255,255,0.15)"};transition:all 0.3s"></div>`
    ).join("");

    // Set the right animation based on position
    if (step.position === "center" || !highlightRect) {
      card.style.animation = "byteCardInCenter 0.4s cubic-bezier(0.34,1.2,0.64,1)";
    } else {
      card.style.animation = "byteCardInSlide 0.4s cubic-bezier(0.34,1.2,0.64,1)";
    }

    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
        <div style="display:flex;gap:4px;align-items:center">${dots}</div>
        <button id="byteTutSkip" style="background:none;border:none;color:rgba(255,255,255,0.25);font-size:0.72rem;cursor:pointer;font-family:inherit;padding:2px 6px;border-radius:6px;transition:color 0.2s" onmouseover="this.style.color='rgba(255,255,255,0.5)'" onmouseout="this.style.color='rgba(255,255,255,0.25)'">Skip tutorial</button>
      </div>

      <div style="display:flex;gap:18px;align-items:flex-start;margin-bottom:20px">
        <div id="byteCharInCard" style="flex-shrink:0;animation:byteFloat 2.5s ease-in-out infinite">
          ${buildByteSVG(mood, 80)}
        </div>
        <div style="flex:1;padding-top:4px">
          <div style="font-size:1.05rem;font-weight:900;color:var(--text,#eeeef5);margin-bottom:8px;line-height:1.3">${step.title}</div>
          <div style="font-size:0.86rem;line-height:1.6;color:var(--text-muted,#9aa4b2)">${step.text}</div>
        </div>
      </div>

      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        ${currentStep > 0 ? `<button id="bytePrevBtn" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.5);border-radius:12px;padding:10px 16px;font-size:0.82rem;font-weight:700;cursor:pointer;font-family:inherit">← Back</button>` : ""}
        <button id="byteNextBtn" style="flex:1;background:${m.glow};color:#000;border:none;border-radius:12px;padding:12px 20px;font-size:0.92rem;font-weight:900;cursor:pointer;font-family:inherit;box-shadow:0 4px 20px ${m.glow}55;transition:all 0.2s"
          onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 28px ${m.glow}77'"
          onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 20px ${m.glow}55'">
          ${step.action}
        </button>
      </div>
      ${step.cta ? `<div style="margin-top:10px;text-align:center"><a href="${step.cta.href}" style="font-size:0.78rem;color:#10b981;font-weight:700;text-decoration:none;opacity:0.85">${step.cta.label} →</a></div>` : ""}`;

    overlayEl.appendChild(card);
    document.body.appendChild(overlayEl);
    isOpen = true;

    // Wire up buttons
    document.getElementById("byteNextBtn")?.addEventListener("click", nextStep);
    document.getElementById("bytePrevBtn")?.addEventListener("click", prevStep);
    document.getElementById("byteTutSkip")?.addEventListener("click", () => {
      if (confirm("Skip the tutorial? You can restart it anytime by tapping Byte in the corner.")) {
        endTutorial(false);
      }
    });
  };

  const nextStep = () => {
    if (currentStep >= STEPS.length - 1) {
      endTutorial(true);
      return;
    }
    currentStep++;
    buildOverlay();
  };

  const prevStep = () => {
    if (currentStep > 0) { currentStep--; buildOverlay(); }
  };

  const endTutorial = (completed) => {
    document.getElementById("byteTutorialOverlay")?.remove();
    isOpen = false;
    const state = getTutState();
    state.done      = true;
    state.completed = completed;
    state.doneAt    = Date.now();
    saveTutState(state);

    if (completed) {
      // Celebration bubble
      setTimeout(() => {
        showBubble("cheer", "Tutorial complete! 🎉", "You're ready to build amazing habits. I'll be right here in the corner whenever you need a tip. Now go crush it! 💪", true);
      }, 300);
    }
  };

  /* ── Inject global CSS ── */
  const injectCSS = () => {
    if (document.getElementById("byteCSS")) return;
    const style = document.createElement("style");
    style.id = "byteCSS";
    style.textContent = `
      @keyframes byteFloat {
        0%, 100% { transform: translateY(0px); }
        50%       { transform: translateY(-8px); }
      }
      @keyframes byteCardInCenter {
        from { opacity: 0; transform: translate(-50%, calc(-50% + 20px)) scale(0.92); }
        to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      }
      @keyframes byteCardInSlide {
        from { opacity: 0; transform: translateY(16px) scale(0.94); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes byteBubbleIn {
        from { opacity: 0; transform: translateY(12px) scale(0.9); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes byteRingPulse {
        0%, 100% { opacity: 1; box-shadow: 0 0 0 4px rgba(74,222,128,0.2), 0 0 20px rgba(74,222,128,0.3); }
        50%       { opacity: 0.7; box-shadow: 0 0 0 8px rgba(74,222,128,0.1), 0 0 30px rgba(74,222,128,0.2); }
      }
      #byteFloat {
        filter: drop-shadow(0 4px 12px rgba(16,185,129,0.4));
      }

    `;
    document.head.appendChild(style);
  };

  /* ── Public API ── */
  const start = (force = false) => {
    const state = getTutState();
    if (state.done && !force) return;
    injectCSS();
    currentStep = 0;
    buildOverlay();
  };

  const restart = () => {
    saveTutState({});
    start(true);
  };

  const init = () => {
    injectCSS();
    // Always show floating Byte
    if (!document.getElementById("byteFloat")) {
      buildFloatingByte();
    }
    // Auto-start for new users
    const state = getTutState();
    if (!state.done) {
      setTimeout(() => start(), 1800); // After mood popup settles
    }
  };

  return { init, start, restart, showBubble, buildByteSVG };
})();

window.ByteTutorial = ByteTutorial;