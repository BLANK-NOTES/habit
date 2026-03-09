const authUser = JSON.parse(localStorage.getItem("auth_user"));
if (!authUser) {
  window.location.href = "auth.html";
}
/* =========================
   MONTHLY HABIT DASHBOARD
========================= */
document.addEventListener("DOMContentLoaded", () => {
  // Security: prevent clickjacking and inject CSP
  if (window.HabitSecurity) {
    window.HabitSecurity.preventClickjacking();
    window.HabitSecurity.injectCSPMeta();
  }

  /* ── AUTO-REGISTER USER IN SHARED REGISTRY ── */
  (() => {
    const au = JSON.parse(localStorage.getItem("auth_user"));
    if (!au?.id) return;
    const users = JSON.parse(localStorage.getItem("habitTracker_users")) || {};
    if (users[au.id]) {
      // Keep avatar/name in sync with latest profile
      const habitData = JSON.parse(localStorage.getItem(`habitTracker_${au.id}`)) || {};
      const profile   = habitData.profile || {};
      let changed = false;
      if (profile.avatar && users[au.id].avatar !== profile.avatar) { users[au.id].avatar = profile.avatar; changed = true; }
      if ((profile.displayName || au.name) && users[au.id].name !== (profile.displayName || au.name)) {
        users[au.id].name = profile.displayName || au.name; changed = true;
      }
      if (changed) localStorage.setItem("habitTracker_users", JSON.stringify(users));
      return;
    }

    const habitData = JSON.parse(localStorage.getItem(`habitTracker_${au.id}`)) || {};
    const profile   = habitData.profile || {};
    let username    = au.username || profile.username;
    if (!username) {
      const base = (au.name || au.email?.split("@")[0] || "user")
        .toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 18) || "user";
      const unames = JSON.parse(localStorage.getItem("habitTracker_usernames")) || {};
      let candidate = base, n = 1;
      while (unames[candidate] && unames[candidate] !== au.id) candidate = base + n++;
      username = candidate;
      au.username = username;
      localStorage.setItem("auth_user", JSON.stringify(au));
    }
    users[au.id] = {
      id: au.id, username: username.toLowerCase(),
      name: profile.displayName || au.name || username,
      email: au.email || "", avatar: au.avatar || profile.avatar || "😊",
      pwHash: null, createdAt: new Date().toISOString(), legacy: true,
    };
    localStorage.setItem("habitTracker_users", JSON.stringify(users));
    const unames = JSON.parse(localStorage.getItem("habitTracker_usernames")) || {};
    unames[username.toLowerCase()] = au.id;
    localStorage.setItem("habitTracker_usernames", JSON.stringify(unames));
    if (au.email) {
      const emails = JSON.parse(localStorage.getItem("habitTracker_emails")) || {};
      emails[au.email.toLowerCase()] = au.id;
      localStorage.setItem("habitTracker_emails", JSON.stringify(emails));
    }
  })();

  /* =========================
   HABIT SCHEDULE CHECK
========================= */
function isHabitActiveOnDay(task, date) {
  // If no schedule → active every day
  if (!task.schedule) return true;

  const day = date.getDay(); // 0 = Sunday ... 6 = Saturday

  // Daily habit
  if (task.schedule.type === "daily") return true;

  // Weekly habit (specific days)
  if (task.schedule.type === "weekly") {
    return task.schedule.days.includes(day);
  }

  // Interval habit (every N days)
  if (task.schedule.type === "interval") {
    const start = new Date(task.startDate);
    const diffDays = Math.floor(
      (date - start) / (1000 * 60 * 60 * 24)
    );
    return diffDays % task.schedule.every === 0;
  }

  // Once a week — one specific day per week (user picks day, or we pick Monday if none)
  if (task.schedule.type === "once_week") {
    const preferredDay = task.schedule.preferredDay ?? 1; // default Monday
    return date.getDay() === preferredDay;
  }

  // Once a month — one specific day per month (user picks day-of-month or defaults to 1st)
  if (task.schedule.type === "once_month") {
    const preferredDate = task.schedule.preferredDate ?? 1;
    return date.getDate() === preferredDate;
  }

  return true;
}


  /* =========================
     CONSTANTS & DOM
  ========================= */
  const MONTHS = [
    "JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE",
    "JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"
  ];

  const authUser = JSON.parse(localStorage.getItem("auth_user"));
  const STORAGE_KEY = `habitTracker_${authUser.id}`;
  const monthLabel = document.getElementById("currentMonth");
  const yearLabel = document.getElementById("currentYear");
  // FIX: HTML uses id="gridWrapper"
  const gridWrapper = document.getElementById("gridWrapper") || document.querySelector(".month-grid-wrapper");
  const addTaskBtn = document.getElementById("addTaskBtn");
  // FIX: HTML now uses id="monthNav" — keep both selectors for safety
  const monthNav = document.getElementById("monthNav") || document.querySelector(".month-nav");
  const habitCount = document.getElementById("habitCount");
  const completedCount = document.getElementById("completedCount");
  const canvas = document.getElementById("progressLine");
  const ctx = canvas.getContext("2d");
  const habitModal = document.getElementById("habitModal");
  const habitNameInput = document.getElementById("habitNameInput");
  const scheduleType = document.getElementById("scheduleType");
  const weeklyPicker = document.getElementById("weeklyPicker");
  const intervalPicker = document.getElementById("intervalPicker");


  const TODAY = new Date();
  const TODAY_YEAR = TODAY.getFullYear();
  const TODAY_MONTH = TODAY.getMonth();
  const TODAY_DAY = TODAY.getDate();

  let currentYear = TODAY_YEAR;
  let currentMonth = TODAY_MONTH;
  const _hs = window.HabitSecurity || {};
  // Secure load: validate + sanitise data on startup
  let data = (() => {
    const raw = (_hs.safeGetStorage || (k => { try { return JSON.parse(localStorage.getItem(k)); } catch(e) { return null; } }))(STORAGE_KEY) || {};
    return (_hs.validateAndCleanData || (d => d))(raw);
  })();

  /* =========================
     UTILITIES
  ========================= */
  const monthKey = (year, month) => `${year}-${String(month + 1).padStart(2, "0")}`;
  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

  const ensureMonth = () => {
  const key = monthKey(currentYear, currentMonth);

  // 1️⃣ If month exists, return it
  if (data[key]) return data[key];

  // 2️⃣ Create new month
  data[key] = { 
  tasks: [],
  monthStarted: true
};


  // 3️⃣ Check previous month for habits to carry over
  const prevMonthDate = new Date(currentYear, currentMonth, 1);
  prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
  const prevKey = monthKey(prevMonthDate.getFullYear(), prevMonthDate.getMonth());

  if (data[prevKey]) {
    data[prevKey].tasks.forEach(prevTask => {
      // Only copy tasks that have a schedule (daily, weekly, interval)
      if (!prevTask.schedule) return;
      // Skip if carry-over explicitly disabled for this habit
      if (prevTask.carryOver === false) return;

      const totalDays = daysInMonth(currentYear, currentMonth);
      const dayStates = Array(totalDays).fill("locked");

      // Start unlocking days from today if this is the current month, otherwise start from 0
      const startIndex =
        currentYear === TODAY_YEAR && currentMonth === TODAY_MONTH
          ? TODAY_DAY - 1
          : 0;

      for (let i = startIndex; i < totalDays; i++) {
        const date = new Date(currentYear, currentMonth, i + 1);
        if (isHabitActiveOnDay(prevTask, date)) {
          dayStates[i] = "unmarked";
        }
      }

      // Push a copy of the task into the new month
      data[key].tasks.push({
        ...prevTask,
        days: dayStates,
        // 🔥 reset grace every new month
        graceUsed: 0
      });

    });
  }

  return data[key];
};


  const saveData = () => {
    if (_hs.safeSetStorage) { _hs.safeSetStorage(STORAGE_KEY, data); }
    else { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch(e) { console.error("Save failed:", e); } }
  };

  const isFutureDay = (dayIndex) => {
    if (currentYear > TODAY_YEAR) return true;
    if (currentYear < TODAY_YEAR) return false;
    if (currentMonth > TODAY_MONTH) return true;
    if (currentMonth < TODAY_MONTH) return false;
    return dayIndex + 1 > TODAY_DAY;
  };

  const isTodayColumn = (dayNumber) => {
    return (
      currentYear === TODAY_YEAR &&
      currentMonth === TODAY_MONTH &&
      dayNumber === TODAY_DAY
    );
  };
  const themeSelect = document.getElementById("theme-select");

  // Load saved theme on mount (inline script in <head> already set it instantly)
  const savedTheme = localStorage.getItem("habitTheme") || "dark";
  document.body.setAttribute("data-theme", savedTheme);
  document.documentElement.setAttribute("data-theme", savedTheme);
  if (themeSelect) themeSelect.value = savedTheme;

  if (themeSelect) {
    themeSelect.addEventListener("change", () => {
      const theme = themeSelect.value;
      document.body.setAttribute("data-theme", theme);
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("habitTheme", theme);
    });
  }

  // Load saved streak threshold
  const thresholdSelect = document.getElementById("streak-threshold");
  const savedThreshold  = localStorage.getItem("streakThreshold") || "80";
  if (thresholdSelect) {
    thresholdSelect.value = savedThreshold;
    thresholdSelect.addEventListener("change", () => {
      localStorage.setItem("streakThreshold", thresholdSelect.value);
      render(); // recalculate streak immediately
    });
  }

  const cancelHabit = document.getElementById("cancelHabit");
  if (cancelHabit) {
    cancelHabit.onclick = () => habitModal.classList.add("hidden");
  }

  scheduleType.onchange = () => {
    const v = scheduleType.value;
    weeklyPicker.classList.toggle("hidden", v !== "weekly");
    intervalPicker.classList.toggle("hidden", v !== "interval");
    document.getElementById("onceWeekPicker")?.classList.toggle("hidden", v !== "once_week");
    document.getElementById("onceMonthPicker")?.classList.toggle("hidden", v !== "once_month");
  };



  const resizeCanvas = () => {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
};


/* =========================
     LOGOUT
  ========================= */
function logout() {
  localStorage.removeItem("auth_user");
  window.location.href = "auth.html";
}

  /* =========================
     AUTO-FAIL PAST DAYS
  ========================= */
  const autoFailPastDays = () => {
    if (currentYear !== TODAY_YEAR || currentMonth !== TODAY_MONTH) return;

    const month = ensureMonth();
    let changed = false;

    month.tasks.forEach(task => {
      // Count how many days have already consumed grace this month
      // Grace is 1 per month — only absorb the FIRST missed day, rest are hard fails
      let graceSpent = task.graceUsed || 0;

      for (let d = task.createdDay; d < TODAY_DAY - 1; d++) {
        if (task.days[d] === "unmarked") {
          if (graceSpent < (task.graceLimit || 1)) {
            // Use grace — day stays as "failed" but streak survives
            task.days[d] = "failed";
            graceSpent++;
            task.graceUsed = graceSpent;
          } else {
            // No grace left — hard fail
            task.days[d] = "failed";
          }
          changed = true;
        }
      }
    });

    if (changed) saveData();
  };


  /* =========================
     TASK LOGIC
  ========================= */
  const addTask = () => {
  const name = prompt("Habit name?");
  if (!name) return;

  const type = prompt(
    "Habit type?\n" +
    "1 = Daily\n" +
    "2 = Weekly (specific days)\n" +
    "3 = Every N days"
  );

  let schedule = { type: "daily" };

  if (type === "2") {
    const days = prompt(
      "Enter days as numbers (0=Sun … 6=Sat)\nExample: 1,3,5"
    );

    schedule = {
      type: "weekly",
      days: days.split(",").map(d => Number(d.trim()))
    };
  }

  if (type === "3") {
    const every = parseInt(prompt("Repeat every how many days?"), 10);
    if (!every || every < 1) return;

    schedule = {
      type: "interval",
      every
    };
  }

  const days = daysInMonth(currentYear, currentMonth);
  const createdIndex =
    currentYear === TODAY_YEAR && currentMonth === TODAY_MONTH
      ? TODAY_DAY - 1
      : 0;

  const dayStates = Array(days).fill("locked");

  for (let i = createdIndex; i < days; i++) {
    dayStates[i] = "unmarked";
  }

  ensureMonth().tasks.push({
    id: Date.now(),
    name,
    createdDay: createdIndex,
    startDate: new Date(currentYear, currentMonth, createdIndex + 1).toISOString(),
    schedule,
    days: dayStates
  });

  saveData();
  render();
};



  const deleteTask = (taskId) => {
    if (!confirm("Delete this habit permanently?")) return;
    const month = ensureMonth();
    month.tasks = month.tasks.filter(t => t.id !== taskId);
    saveData();
    render();
  };

  /* =========================
     XP / LEVEL SYSTEM
  ========================= */

  // XP needed to reach each level — grows progressively
  // Forward-reference stub — creditLeagueXP assigned later once league system loads
  const leagueHooks = { creditXP: () => {} };

  const XP_PER_LEVEL = (level) => Math.floor(100 * Math.pow(1.25, level - 1));

  const ensureXP = () => {
    if (!data.xp) data.xp = { total: 0, level: 1, lifetimeXP: 0 };
    if (data.xp.lifetimeXP === undefined) data.xp.lifetimeXP = 0;
    return data.xp;
  };

  // Compute cumulative XP at start of a given level
  const xpAtLevel = (level) => {
    let total = 0;
    for (let i = 1; i < level; i++) total += XP_PER_LEVEL(i);
    return total;
  };

  const awardXP = (amount, reason) => {
    // Free users don't earn XP
    if (window.HabitPremium && !window.HabitPremium.isPremium()) return;
    const xp         = ensureXP();
    xp.total        += amount;
    xp.lifetimeXP   += amount;
    leagueHooks.creditXP(amount);

    let leveled = false;
    let prevLevel = xp.level;
    while (true) {
      const needed = XP_PER_LEVEL(xp.level);
      if (xp.total >= needed) {
        xp.total -= needed;
        xp.level++;
        leveled = true;
      } else break;
    }

    saveData();
    renderXP(leveled);
    if (leveled) checkLeaguePromotion(prevLevel, xp.level);

    if (leveled) {
      setTimeout(() => {
        pushToast(buildSimpleToast("🌟", `LEVEL ${xp.level} UNLOCKED! Byte is absolutely buzzing right now. Looking sharp! ⚡`, "var(--done,#4ade80)"), 5000);
        playSound("levelup");
        launchConfetti();
      }, 200);
    }
  };

  const renderXP = (justLeveled = false) => {
    const xp     = ensureXP();
    const needed = XP_PER_LEVEL(xp.level);
    const pct    = Math.min(100, Math.round((xp.total / needed) * 100));

    const badge = document.getElementById("xpLevelBadge");
    const fill  = document.getElementById("xpBarFill");
    const label = document.getElementById("xpBarLabel");

    if (!badge || !fill || !label) return;

    badge.textContent = `LV ${xp.level}`;
    fill.style.width  = pct + "%";
    label.textContent = `${xp.total} / ${needed} XP`;

    if (justLeveled) {
      badge.classList.remove("leveling-up");
      void badge.offsetWidth;
      badge.classList.add("leveling-up");
      setTimeout(() => badge.classList.remove("leveling-up"), 600);
    }
  };

  const awardLoginXP = () => {
    const ls    = ensureLoginData();
    const today = todayKey();
    if (ls.lastLoginXP === today) return;
    ls.lastLoginXP = today;
    saveData();
    awardXP(5, "Daily login");
    if ([7, 14, 30, 60, 100].includes(ls.count)) {
      awardXP(15, `${ls.count}-day login streak bonus`);
    }
  };

  /* =========================
     UNDO SYSTEM
  ========================= */
  let undoSnapshot  = null; // deep copy of data before last action
  let undoTimer     = null; // timeout handle
  let undoToastEl   = null; // current undo toast DOM element

  const saveSnapshot = () => {
    undoSnapshot = JSON.parse(JSON.stringify(data)); // deep clone
  };

  const commitUndo = () => {
    // Called when undo toast dismisses — snapshot is no longer valid
    undoSnapshot = null;
  };

  const doUndo = () => {
    if (!undoSnapshot) return;

    // Restore data from snapshot (this also restores xpAwarded state)
    Object.keys(data).forEach(k => delete data[k]);
    Object.assign(data, undoSnapshot);
    undoSnapshot = null;

    clearTimeout(undoTimer);
    undoToastEl?.remove();
    undoToastEl = null;

    saveData();
    render();
    pushToast(buildSimpleToast("↩️", "Action undone", "var(--text-muted)"), 2000);
  };

  const buildSimpleToast = (icon, msg, color) => {
    const t = document.createElement("div");
    t.className = "gem-toast";
    t.innerHTML = `<span class="gem-toast-icon">${icon}</span>
      <div><strong style="color:${color}">${msg}</strong></div>`;
    return t;
  };

  const showUndoToast = (actionLabel) => {
    // Dismiss any existing undo toast immediately
    if (undoToastEl) {
      clearTimeout(undoTimer);
      clearInterval(undoToastEl._tick);
      undoToastEl.remove();
      undoToastEl = null;
    }

    const DURATION = 8000; // 8 seconds
    const toast    = document.createElement("div");
    toast.className = "gem-toast undo-toast";

    toast.innerHTML = `
      <span class="gem-toast-icon">↩️</span>
      <div>
        <strong style="color:var(--text-main)">${actionLabel}</strong>
        <div class="toast-sub">Tap Undo to reverse</div>
      </div>
      <button class="undo-btn">Undo</button>
      <div class="undo-progress-wrap">
        <div class="undo-progress-bar"></div>
      </div>`;

    const bar = toast.querySelector(".undo-progress-bar");
    const btn = toast.querySelector(".undo-btn");
    const startTime = Date.now();

    btn.addEventListener("click", () => {
      // Disable immediately so double-clicks do nothing
      btn.disabled = true;
      btn.textContent = "✓";

      clearTimeout(undoTimer);
      clearInterval(toast._tick);
      undoToastEl = null;

      // Dismiss toast first, then undo so render isn't blocked
      toast.classList.remove("toast-show");
      setTimeout(() => {
        toast.remove();
        doUndo();
      }, 300);
    });

    toast._tick = setInterval(() => {
      if (!toast.isConnected) { clearInterval(toast._tick); return; }
      const elapsed = Date.now() - startTime;
      const pct     = Math.max(0, 100 - (elapsed / DURATION) * 100);
      bar.style.width = pct + "%";
    }, 80);

    undoToastEl = toast;
    const stack = document.getElementById("toastStack");
    if (stack) stack.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("toast-show"));

    undoTimer = setTimeout(() => {
      clearInterval(toast._tick);
      toast.classList.remove("toast-show");
      setTimeout(() => { toast.remove(); commitUndo(); }, 400);
      undoToastEl = null;
    }, DURATION);
  };

  /* =========================
     COMBO / SPEED BONUS SYSTEM
  ========================= */
  const COMBO_WINDOW_MS = 10000; // 10 seconds between marks to keep combo alive
  const COMBO_LABELS    = ["", "", "x2 COMBO!", "x3 COMBO!", "x4 COMBO!", "x5 COMBO!", "🔥 ON FIRE!"];

  let comboCount     = 0;  // how many quick marks in a row
  let comboTimer     = null;
  let lastMarkTime   = 0;

  const resetCombo = () => {
    comboCount   = 0;
    lastMarkTime = 0;
    clearTimeout(comboTimer);
  };

  const triggerCombo = (baseXP) => {
    const now     = Date.now();
    const elapsed = now - lastMarkTime;

    if (lastMarkTime > 0 && elapsed <= COMBO_WINDOW_MS) {
      // Still in combo window — extend it
      comboCount++;
    } else {
      // Too slow or first mark — start fresh
      comboCount   = 1;
    }

    lastMarkTime = now;
    clearTimeout(comboTimer);
    comboTimer = setTimeout(resetCombo, COMBO_WINDOW_MS);

    // Bonus XP: x2 for combo 2, x3 for combo 3, capped at x5
    const multiplier = Math.min(5, comboCount);
    const bonusXP    = multiplier > 1 ? baseXP * (multiplier - 1) : 0;

    if (bonusXP > 0) {
      awardXP(bonusXP, `Combo x${multiplier}`);
      showComboToast(multiplier, bonusXP);
    }

    return bonusXP;
  };

  const showComboToast = (multiplier, bonusXP) => {
    // Remove existing combo toast to replace with fresh one
    document.getElementById("comboToast")?.remove();

    // Track combo easter eggs for achievements
    if (multiplier >= 3 && !data.easterEggs?.combo3) { if (!data.easterEggs) data.easterEggs={}; data.easterEggs.combo3=true; saveData(); }
    if (multiplier >= 5 && !data.easterEggs?.combo5) { if (!data.easterEggs) data.easterEggs={}; data.easterEggs.combo5=true; saveData(); }

    const label = COMBO_LABELS[Math.min(multiplier, COMBO_LABELS.length - 1)]
                  || `x${multiplier} COMBO!`;
    const color = multiplier >= 5 ? "#ef4444"
                : multiplier >= 4 ? "#f59e0b"
                : multiplier >= 3 ? "#facc15"
                : "#4ade80";

    const toast      = document.createElement("div");
    toast.id         = "comboToast";
    toast.className  = "gem-toast combo-toast";
    toast.innerHTML  = `
      <span class="gem-toast-icon" style="font-size:1.8rem">⚡</span>
      <div>
        <strong style="color:${color};font-size:1rem">${label}</strong>
        <div class="toast-sub">+${bonusXP} bonus XP · Mark fast to extend!</div>
      </div>
      <div class="combo-counter" style="color:${color}">${multiplier}x</div>`;

    playSound("combo");
    pushToast(toast, 2500);
  };

  const cycleStatus = (task, index) => {
    const prev = task.days[index];

    // Failed is the end of the line — undo is the only way back
    if (prev === "failed") {
      pushToast(buildSimpleToast("🔒", "Use Undo to change a marked cell", "var(--text-muted)"), 2500);
      return;
    }

    saveSnapshot();

    if (prev === "unmarked") {
      task.days[index] = "done";
      // Category-aware sound
      const _catMap = { fitness:"done_fitness", mindful:"done_mindful", learning:"done_learning", productive:"done_productive", health:"done_health", nutrition:"done_health" };
      playSound(_catMap[task.category] || "done");
      trackTimeAchievements();
      trackFirstMark();
      checkComebackEgg();

      // Base XP: 50 total per day split across active tasks
      const xpKey = `xp_${task.id}_${index}`;
      if (!data.xpAwarded) data.xpAwarded = {};
      if (!data.xpAwarded[xpKey]) {
        data.xpAwarded[xpKey] = true;
        const month       = ensureMonth();
        const activeTasks = month.tasks.filter(t => t.days[index] !== "locked");
        const xpPerTask   = Math.max(1, Math.round(50 / Math.max(1, activeTasks.length)));
        awardXP(Math.round(xpPerTask * getSeasonXPMultiplier()), "Habit completed");
        triggerCombo(xpPerTask);
      }
    } else if (prev === "done") {
      task.days[index] = "failed";
      playSound("fail");
      resetCombo();
      // Screen shake on miss
      shakeGrid();
    }
    const label = {
      done:   "✔ Marked as done",
      failed: "✖ Marked as failed",
    }[task.days[index]] || "Status changed";

    saveData();
    checkAndAwardGems();
    runEasterEggChecks();
    render();
    showUndoToast(label);
  };

  /* =========================
     TIME-BASED ACHIEVEMENT TRACKING
  ========================= */
  const trackTimeAchievements = () => {
    const hour = new Date().getHours();
    if (!data.timeAchievements) data.timeAchievements = {};
    if (!data.questProgress)    data.questProgress    = {};

    if (hour < 8 && !data.timeAchievements.earlyBird) {
      data.timeAchievements.earlyBird = true;
      saveData();
      showAchievementToast("🌅 Early Bird unlocked!");
    }

    if (hour >= 23 && !data.timeAchievements.nightOwl) {
      data.timeAchievements.nightOwl = true;
      saveData();
      showAchievementToast("🦉 Night Owl unlocked!");
    }

    // Quest: Early Riser — complete a habit before noon
    if (hour < 12 && !data.questProgress.earlyDone) {
      data.questProgress.earlyDone = true;
      saveData();
    }
  };


  /* =========================
     BADGE UNLOCK ANIMATION
  ========================= */
  const showBadgeUnlock = ({ icon, name, desc, color }) => {
    document.getElementById("badgeUnlockOverlay")?.remove();
    const overlay = document.createElement("div");
    overlay.id    = "badgeUnlockOverlay";

    // Byte SVG presenter — reads custom colour + hat/accessory from localStorage
    const _bCust = (() => { try { return JSON.parse(localStorage.getItem("byteCustom")||"{}"); } catch(e){return{};} })();
    const _bColKey = _bCust.color || "green";
    const _bCols = { green:{l:"#6ee7b7",m:"#10b981",d:"#059669"}, blue:{l:"#93c5fd",m:"#3b82f6",d:"#1d4ed8"}, purple:{l:"#c4b5fd",m:"#8b5cf6",d:"#6d28d9"}, pink:{l:"#fda4af",m:"#f43f5e",d:"#be123c"}, orange:{l:"#fdba74",m:"#f97316",d:"#c2410c"}, gold:{l:"#fde68a",m:"#fbbf24",d:"#d97706"} };
    const _bc = _bCols[_bColKey] || _bCols.green;
    const _bHats = { party:'<polygon points="50,5 38,32 62,32" fill="#f43f5e" stroke="#fff" stroke-width="1.5"/><rect x="38" y="30" width="24" height="5" rx="2" fill="#fbbf24"/><circle cx="50" cy="5" r="3" fill="#fbbf24"/>', cap:'<path d="M25,28 Q50,14 75,28" fill="#3b82f6" stroke="#1d4ed8" stroke-width="1"/><rect x="22" y="26" width="56" height="10" rx="5" fill="#3b82f6"/><rect x="14" y="33" width="20" height="5" rx="3" fill="#2563eb"/>', tophat:'<rect x="34" y="6" width="32" height="24" rx="3" fill="#1a1a2e" stroke="#374151" stroke-width="1.5"/><rect x="28" y="28" width="44" height="6" rx="3" fill="#1a1a2e"/><rect x="36" y="10" width="28" height="4" rx="2" fill="#ef4444" opacity="0.9"/>', crown:'<path d="M28,30 L28,16 L38,24 L50,10 L62,24 L72,16 L72,30 Z" fill="#fbbf24" stroke="#d97706" stroke-width="1.5"/><circle cx="50" cy="10" r="3" fill="#ef4444"/><circle cx="28" cy="16" r="2.5" fill="#10b981"/><circle cx="72" cy="16" r="2.5" fill="#a78bfa"/>', halo:'<ellipse cx="50" cy="10" rx="20" ry="5" fill="none" stroke="#fbbf24" stroke-width="3.5" opacity="0.9"/>', viking:'<path d="M22,34 Q22,10 50,10 Q78,10 78,34" fill="#6b7280" stroke="#374151" stroke-width="2"/><path d="M22,20 Q18,10 12,8 Q16,20 20,28" fill="#d97706"/><path d="M78,20 Q82,10 88,8 Q84,20 80,28" fill="#d97706"/>', wizard:'<path d="M50,4 L30,34 L70,34 Z" fill="#7c3aed"/><ellipse cx="50" cy="34" rx="20" ry="5" fill="#7c3aed"/><circle cx="50" cy="5" r="3" fill="#fbbf24"/>' };
    const _bAccs = { glasses:'<rect x="26" y="39" width="18" height="11" rx="5" fill="#1a1a2e" opacity="0.9"/><rect x="56" y="39" width="18" height="11" rx="5" fill="#1a1a2e" opacity="0.9"/><line x1="44" y1="44" x2="56" y2="44" stroke="#374151" stroke-width="2"/>', nerd:'<rect x="25" y="40" width="19" height="12" rx="4" fill="none" stroke="#92400e" stroke-width="2.5"/><rect x="56" y="40" width="19" height="12" rx="4" fill="none" stroke="#92400e" stroke-width="2.5"/><line x1="44" y1="46" x2="56" y2="46" stroke="#92400e" stroke-width="2"/>', monocle:'<circle cx="62" cy="44" r="10" fill="none" stroke="#d97706" stroke-width="2.5"/><line x1="72" y1="38" x2="78" y2="32" stroke="#d97706" stroke-width="2"/>', scarf:'<path d="M18,68 Q35,60 50,65 Q65,70 82,62" stroke="#ef4444" stroke-width="7" fill="none" stroke-linecap="round"/>', bow:'<path d="M34,70 L44,76 L34,82 Z" fill="#f43f5e"/><path d="M66,70 L56,76 L66,82 Z" fill="#f43f5e"/><circle cx="50" cy="76" r="5" fill="#e11d48"/>' };
    const _hatSvg = _bHats[_bCust.hat || ""] || "";
    const _accSvg = _bAccs[_bCust.accessory || ""] || "";
    const byteSVG = `<svg width="52" height="52" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bbu" cx="45%" cy="35%" r="60%">
          <stop offset="0%" stop-color="${_bc.l}"/>
          <stop offset="60%" stop-color="${_bc.m}"/>
          <stop offset="100%" stop-color="${_bc.d}"/>
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="38" fill="url(#bbu)" filter="drop-shadow(0 4px 12px ${color}66)"/>
      <ellipse cx="37" cy="33" rx="12" ry="8" fill="white" opacity="0.2" transform="rotate(-20 37 33)"/>
      <line x1="50" y1="12" x2="50" y2="26" stroke="${_bc.d}" stroke-width="3" stroke-linecap="round"/>
      <circle cx="50" cy="10" r="4" fill="${color}"/>
      <circle cx="12" cy="50" r="7" fill="${_bc.d}"/>
      <circle cx="88" cy="50" r="7" fill="${_bc.d}"/>
      <ellipse cx="38" cy="43" rx="6" ry="7" fill="#052e16"/>
      <ellipse cx="62" cy="43" rx="6" ry="7" fill="#052e16"/>
      <circle cx="37" cy="41" r="2.5" fill="white" opacity="0.7"/>
      <circle cx="61" cy="41" r="2.5" fill="white" opacity="0.7"/>
      <path d="M30 57 Q50 74 70 57" stroke="#052e16" stroke-width="4" fill="none" stroke-linecap="round"/>
      <circle cx="26" cy="54" r="6" fill="${color}" opacity="0.25"/>
      <circle cx="74" cy="54" r="6" fill="${color}" opacity="0.25"/>
      ${_accSvg}${_hatSvg}
    </svg>`;

    // Store share text safely — avoids quote-escaping issues in onclick HTML attr
    window._badgeShareText = `I just unlocked the ${name} badge on HabitTracker! ${icon} Building streaks one day at a time. 🔥`;
    window._badgeIcon = icon;   // stored for canvas render
    window._badgeName = name;   // stored for canvas render

    overlay.innerHTML = `
      <div class="badge-unlock-backdrop" onclick="document.getElementById('badgeUnlockOverlay')?.remove()"></div>
      <div class="badge-unlock-card" style="--badge-color:${color}">
        <!-- Byte presenting the badge -->
        <div style="display:flex;align-items:flex-end;justify-content:center;gap:0;margin-bottom:8px;position:relative">
          <div style="animation:byteFloat 2.5s ease-in-out infinite;flex-shrink:0;position:relative;top:6px">${byteSVG}</div>
          <div style="position:relative;margin-left:-6px">
            <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:10px 10px 10px 2px;padding:5px 10px;font-size:0.65rem;color:rgba(255,255,255,0.6);white-space:nowrap;margin-bottom:4px">For you! 🎁</div>
            <div style="font-size:3.2rem;line-height:1;filter:drop-shadow(0 0 20px ${color})">${icon}</div>
          </div>
        </div>
        <div style="font-size:0.62rem;font-weight:800;letter-spacing:0.16em;color:${color};text-transform:uppercase;margin-bottom:5px">Badge Unlocked</div>
        <div style="font-size:1.25rem;font-weight:900;color:#fff;margin-bottom:5px">${name}</div>
        <div style="font-size:0.76rem;color:rgba(255,255,255,0.5);margin-bottom:20px">${desc}</div>
        <div style="display:flex;gap:8px;justify-content:center">
          <button onclick="document.getElementById('badgeUnlockOverlay')?.remove()" style="
            padding:8px 20px;border-radius:20px;border:1px solid ${color};
            background:transparent;color:${color};font-weight:700;cursor:pointer;font-size:0.82rem;font-family:inherit">
            Awesome! ✓
          </button>
          <button onclick="window._shareBadge()" style="
            padding:8px 16px;border-radius:20px;border:none;
            background:${color};color:#000;font-weight:800;cursor:pointer;font-size:0.82rem;font-family:inherit;
            display:flex;align-items:center;gap:5px">
            <span>↗</span> Share
          </button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    playSound("badge");
    launchConfetti();
    setTimeout(() => overlay.remove(), 10000);
  };

  // Share badge as IMAGE — captures the badge card to canvas and downloads/shares it
  window._shareBadge = (text) => {
    const msg  = text || window._badgeShareText || "Check out HabitTracker! 🌱";
    const card = document.querySelector(".badge-unlock-card");
    if (card) {
      _captureBadgeAsImage(card, msg);
    } else {
      _showShareCopyUI(msg + " 👉 https://habittracker.app");
    }
  };

  // Renders badge card to a canvas image then shares or downloads it
  window._captureBadgeAsImage = (cardEl, caption) => {
    // Build a standalone canvas with the badge info
    const bg     = getComputedStyle(cardEl).getPropertyValue("--badge-color") || "#4ade80";
    const canvas = document.createElement("canvas");
    const DPR    = Math.min(window.devicePixelRatio || 2, 3);
    const W = 480, H = 480;
    canvas.width  = W * DPR;
    canvas.height = H * DPR;
    const ctx = canvas.getContext("2d");
    ctx.scale(DPR, DPR);

    // Background
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#0a1a10");
    grad.addColorStop(1, "#0d1520");
    ctx.fillStyle = grad;
    ctx.roundRect?.(0, 0, W, H, 28) || ctx.fillRect(0, 0, W, H);
    ctx.fill();

    // Glow ring
    ctx.beginPath();
    ctx.arc(W/2, H/2 - 20, 110, 0, Math.PI * 2);
    ctx.fillStyle = bg + "18";
    ctx.fill();

    // Outer border
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(4, 4, W-8, H-8, 24);
    else ctx.rect(4, 4, W-8, H-8);
    ctx.strokeStyle = bg + "66";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Badge icon (big emoji)
    const icon = window._badgeIcon || "🏆";
    ctx.font = "bold 96px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(icon, W/2, H/2 - 60);

    // "Badge Unlocked" label
    ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = bg;
    ctx.letterSpacing = "0.14em";
    ctx.fillText("BADGE UNLOCKED", W/2, H/2 + 40);

    // Badge name
    ctx.font = "900 26px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.letterSpacing = "0";
    const name = window._badgeName || "Achievement";
    ctx.fillText(name, W/2, H/2 + 76);

    // Caption / share text
    ctx.font = "500 13px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    const shortCaption = (caption || "").replace(" 🔥", "").slice(0, 60);
    ctx.fillText(shortCaption, W/2, H/2 + 110);

    // App watermark
    ctx.font = "700 11px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillText("HabitTracker · habittracker.app", W/2, H - 28);

    // Convert to blob and share/download
    canvas.toBlob(blob => {
      if (!blob) { _showShareCopyUI(caption); return; }
      const url  = URL.createObjectURL(blob);
      const file = new File([blob], "badge.png", { type: "image/png" });

      // Try native share with image (mobile / Chrome on HTTPS)
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        navigator.share({ files: [file], text: caption })
          .then(() => URL.revokeObjectURL(url))
          .catch(() => _downloadBadgeImage(url, caption));
        return;
      }

      // Fallback: download the image
      _downloadBadgeImage(url, caption);
    }, "image/png");
  };

  window._downloadBadgeImage = (url, caption) => {
    // Show a preview overlay with download + copy buttons
    document.getElementById("badgeShareImageUI")?.remove();
    const el = document.createElement("div");
    el.id = "badgeShareImageUI";
    el.style.cssText = "position:fixed;inset:0;z-index:9999999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.75);backdrop-filter:blur(8px);padding:20px;font-family:inherit;animation:fadeInOverlay 0.2s ease";
    el.innerHTML = `
      <div style="background:#0d1a10;border:1px solid rgba(16,185,129,0.3);border-radius:20px;padding:20px;max-width:380px;width:100%;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,0.6)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
          <div style="font-size:0.8rem;font-weight:800;color:#4ade80;text-transform:uppercase;letter-spacing:0.1em">Share Badge</div>
          <button id="badgeShareClose" style="background:none;border:none;color:rgba(255,255,255,0.35);font-size:1.2rem;cursor:pointer">✕</button>
        </div>
        <img id="badgeShareImg" style="width:100%;border-radius:14px;margin-bottom:14px;box-shadow:0 8px 32px rgba(0,0,0,0.5)" />
        <a id="badgeShareDownload" download="badge.png" style="display:block;background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:12px;border-radius:12px;font-weight:800;font-size:0.9rem;text-decoration:none;margin-bottom:8px;box-shadow:0 4px 16px rgba(16,185,129,0.3)">
          ⬇️ Save Image
        </a>
        <div style="font-size:0.7rem;color:rgba(255,255,255,0.3);margin-top:6px">Long press image on mobile to save</div>
      </div>`;
    document.body.appendChild(el);
    // Wire up elements after they're in the DOM
    document.getElementById("badgeShareImg").src = url;
    document.getElementById("badgeShareDownload").href = url;
    document.getElementById("badgeShareDownload").onclick = () => setTimeout(() => { el.remove(); URL.revokeObjectURL(url); }, 600);
    document.getElementById("badgeShareClose").onclick = () => { el.remove(); URL.revokeObjectURL(url); };
    el.addEventListener("click", e => { if (e.target === el) { el.remove(); URL.revokeObjectURL(url); } });
  };

  // Bulletproof share UI — works everywhere including file:// 
  window._showShareCopyUI = (msg) => {
    document.getElementById("shareCopyUI")?.remove();
    const el = document.createElement("div");
    el.id = "shareCopyUI";
    el.style.cssText = `
      position:fixed;inset:0;z-index:9999999;
      display:flex;align-items:center;justify-content:center;
      background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);
      animation:fadeInOverlay 0.2s ease;padding:20px;`;
    el.innerHTML = `
      <div style="background:#0d1a10;border:1px solid rgba(16,185,129,0.3);border-radius:20px;
                  padding:24px;max-width:400px;width:100%;
                  box-shadow:0 24px 60px rgba(0,0,0,0.6);font-family:inherit">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
          <svg width="28" height="28" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="38" fill="#10b981"/>
            <circle cx="12" cy="50" r="7" fill="#059669"/><circle cx="88" cy="50" r="7" fill="#059669"/>
            <ellipse cx="38" cy="44" rx="5" ry="6" fill="#052e16"/><ellipse cx="62" cy="44" rx="5" ry="6" fill="#052e16"/>
            <circle cx="37" cy="42" r="2" fill="white" opacity="0.8"/><circle cx="61" cy="42" r="2" fill="white" opacity="0.8"/>
            <path d="M34 57 Q50 70 66 57" stroke="#052e16" stroke-width="3" fill="none" stroke-linecap="round"/>
          </svg>
          <div>
            <div style="font-size:0.7rem;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;color:#4ade80">Share</div>
            <div style="font-size:0.85rem;font-weight:700;color:#fff">Copy & share anywhere</div>
          </div>
          <button onclick="document.getElementById('shareCopyUI')?.remove()" style="margin-left:auto;background:none;border:none;color:rgba(255,255,255,0.4);font-size:1.2rem;cursor:pointer;padding:2px 6px;line-height:1">✕</button>
        </div>
        <textarea id="shareCopyText" readonly style="
          width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);
          border-radius:12px;padding:12px;color:#e5e7eb;font-size:0.82rem;line-height:1.5;
          resize:none;height:80px;font-family:inherit;outline:none;
          box-sizing:border-box;">${msg.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</textarea>
        <button id="shareCopyBtn" onclick="
          const ta=document.getElementById('shareCopyText');
          ta.select();ta.setSelectionRange(0,9999);
          try{document.execCommand('copy');
            document.getElementById('shareCopyBtn').textContent='✓ Copied!';
            document.getElementById('shareCopyBtn').style.background='linear-gradient(135deg,#4ade80,#16a34a)';
            setTimeout(()=>document.getElementById('shareCopyUI')?.remove(),1200);
          }catch(e){}" style="
          margin-top:10px;width:100%;background:linear-gradient(135deg,#10b981,#059669);
          color:#fff;border:none;border-radius:12px;padding:11px;
          font-size:0.9rem;font-weight:800;cursor:pointer;font-family:inherit;
          box-shadow:0 4px 16px rgba(16,185,129,0.3);transition:all 0.2s;">
          📋 Copy to clipboard
        </button>
      </div>`;
    document.body.appendChild(el);
    el.addEventListener("click", e => { if (e.target === el) el.remove(); });
    // Auto-select text
    setTimeout(() => { document.getElementById("shareCopyText")?.select(); }, 100);
  };

  const showAchievementToast = (msg, badgeData = null) => {
    const toast     = document.createElement("div");
    toast.className = "gem-toast";
    toast.innerHTML = `<span class="gem-toast-icon">🏅</span>
      <div><strong style="color:var(--done,#4ade80)">${msg}</strong>
      <div class="toast-sub">Badge unlocked!</div></div>`;
    pushToast(toast, 3500);
    if (badgeData) setTimeout(() => showBadgeUnlock(badgeData), 500);
  };

  /* =========================
     EASTER EGG SYSTEM
  ========================= */
  const easterEggs = {
    fired: () => data.easterEggs || (data.easterEggs = {}),
    once:  (id) => {
      if (data.easterEggs?.[id]) return false;
      if (!data.easterEggs) data.easterEggs = {};
      data.easterEggs[id] = true;
      saveData();
      return true;
    }
  };

  const floatEmojis = (emojis, count = 8) => {
    for (let i = 0; i < count; i++) {
      const el = document.createElement("div");
      el.textContent = emojis[i % emojis.length];
      el.style.cssText = `position:fixed;left:${20+Math.random()*60}%;top:${30+Math.random()*40}%;
        font-size:${1.5+Math.random()*1.5}rem;z-index:999990;pointer-events:none;
        animation:floatUp ${0.8+Math.random()*0.8}s ease forwards;animation-delay:${i*80}ms;`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2000);
    }
  };

  const shakeGrid = () => {
    const grid = document.getElementById("gridWrapper");
    if (!grid) return;
    grid.style.animation = "shake 0.5s ease";
    setTimeout(() => grid.style.animation = "", 500);
  };

  const rainbowHeader = (ms = 2000) => {
    const header = document.querySelector("header");
    if (!header) return;
    header.style.animation = `rainbowShift ${ms}ms linear`;
    setTimeout(() => header.style.animation = "", ms);
  };

  const dropMessage = (emoji, text, color = "#fff", duration = 3000) => {
    const el = document.createElement("div");
    el.style.cssText = `position:fixed;top:18%;left:50%;transform:translateX(-50%);
      z-index:999991;pointer-events:none;text-align:center;
      animation:easterEggDrop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards;`;
    el.innerHTML = `
      <div style="font-size:2.8rem;line-height:1;filter:drop-shadow(0 0 16px ${color})">${emoji}</div>
      <div style="font-size:0.9rem;font-weight:800;color:${color};background:rgba(0,0,0,0.7);
                  border-radius:10px;padding:4px 14px;margin-top:6px;white-space:nowrap">${text}</div>`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), duration);
  };

  // 1. Midnight habit
  const checkMidnightEgg = () => {
    const h = new Date().getHours();
    if (h >= 0 && h < 4 && easterEggs.once("midnight_habit")) {
      dropMessage("🦉", "Who habits at midnight?!", "#818cf8");
      floatEmojis(["🌙","⭐","😴","🦉"], 10);
    }
  };

  // 2. Speed Demon — all tasks done within 30s of first mark
  const checkSpeedDemonEgg = () => {
    const month  = ensureMonth();
    const i      = TODAY_DAY - 1;
    const active = month.tasks.filter(t => t.days[i] !== "locked");
    if (!active.length) return;
    const allDone = active.every(t => t.days[i] === "done");
    if (!allDone) return;
    if (!data.easterEggs) data.easterEggs = {};
    const firstKey = "speedfirst_" + todayKey();
    const elapsed  = Date.now() - (data.easterEggs[firstKey] || Date.now());
    if (elapsed < 30000 && elapsed > 0 && easterEggs.once("speed_demon")) {
      dropMessage("⚡", "SPEED DEMON! All done in 30s!", "#facc15");
      floatEmojis(["⚡","🏎️","💨"], 12);
      awardXP(50, "Speed Demon egg");
      setTimeout(() => showBadgeUnlock({ icon:"⚡", name:"Speed Demon",
        desc:"Completed all habits in under 30 seconds", color:"#facc15" }), 600);
    }
  };

  const trackFirstMark = () => {
    if (!data.easterEggs) data.easterEggs = {};
    const key = "speedfirst_" + todayKey();
    if (!data.easterEggs[key]) { data.easterEggs[key] = Date.now(); saveData(); }
  };

  // 3. Comeback Kid
  const checkComebackEgg = () => {
    const ls = ensureLoginData();
    if (!ls.lastLogin) return;
    const diff = Math.floor((new Date() - new Date(ls.lastLogin)) / 86400000);
    if (diff >= 5 && easterEggs.once("comeback_kid")) {
      dropMessage("🦅", "COMEBACK KID! Welcome back!", "#4ade80");
      floatEmojis(["💪","🔥","🦅","❤️"], 10);
      awardXP(30, "Comeback Kid egg");
    }
  };

  // 4. Pi Time — 3:14 AM
  const checkPiTimeEgg = () => {
    const now = new Date();
    if (now.getHours() === 3 && now.getMinutes() === 14 && easterEggs.once("pi_time")) {
      dropMessage("π", "3:14 AM — Pi Time Habit!", "#a78bfa");
      floatEmojis(["π","🥧","🔢","🌀"], 8);
      awardXP(31, "Pi time egg");
    }
  };

  // 5. Centurion — hit 100 gems
  const checkCenturionEgg = () => {
    const g = getGems();
    if (g >= 100 && g < 115 && easterEggs.once("centurion")) {
      dropMessage("💯", "100 GEMS! Centurion!", "#facc15");
      floatEmojis(["💎","💰","👑","✨"], 12);
    }
  };

  // 6. Lucky 7 habits
  const checkAccountantEgg = () => {
    const month = ensureMonth();
    if (month.tasks.length === 7 && easterEggs.once("accountant")) {
      dropMessage("🧮", "Exactly 7 habits — Lucky number!", "#38bdf8");
      floatEmojis(["7️⃣","🍀","🎲","🧮"], 8);
      awardXP(7, "Lucky 7 egg");
    }
  };

  // 7. Holiday eggs
  const checkHolidayEgg = () => {
    const d = new Date();
    const m = d.getMonth(), day = d.getDate();
    if (m===11&&day===25 && easterEggs.once("holiday_xmas"))   { dropMessage("🎄","Habits on Christmas?! Legend!","#4ade80"); floatEmojis(["🎄","🎁","⭐","❄️"],12); awardXP(25,"Holiday egg"); }
    if (m===11&&day===31 && easterEggs.once("holiday_nye"))    { dropMessage("🎆","New Year's Eve grind!","#facc15"); floatEmojis(["🎆","🥂","✨","🎉"],12); awardXP(25,"Holiday egg"); }
    if (m===0 &&day===1  && easterEggs.once("holiday_nyd"))    { dropMessage("🌅","New Year, new habits!","#38bdf8"); floatEmojis(["🌅","🔥","💪","🆕"],10); awardXP(25,"Holiday egg"); }
    if (m===9 &&day===31 && easterEggs.once("holiday_hallow")) { dropMessage("🎃","Spooky habits!","#f97316"); floatEmojis(["🎃","👻","🕷️","🦇"],10); awardXP(13,"Spooky egg"); }
    if (m===1 &&day===14 && easterEggs.once("holiday_vday"))   { dropMessage("💝","Habits > Valentine's Day!","#f43f5e"); floatEmojis(["💝","💖","🌹","😍"],10); awardXP(14,"Valentine egg"); }
  };

  // 8. All-nighter — late night 3 times
  const checkAllNighterEgg = () => {
    const h = new Date().getHours();
    if (h >= 2 && h < 4) {
      if (!data.easterEggs) data.easterEggs = {};
      data.easterEggs.lateNightCount = (data.easterEggs.lateNightCount || 0) + 1;
      saveData();
      if (data.easterEggs.lateNightCount === 3 && easterEggs.once("all_nighter")) {
        dropMessage("☕","3 late-night sessions. Respect.","#94a3b8");
        floatEmojis(["☕","😤","🌙","💀"], 8);
        awardXP(20, "All-nighter egg");
      }
    }
  };

  // 9. Minimalist — 1 habit, 7 days straight
  const checkMinimalistEgg = () => {
    const month = ensureMonth();
    if (month.tasks.length !== 1) return;
    let run = 0;
    for (let d = TODAY_DAY - 1; d >= 0; d--) {
      if (month.tasks[0].days[d] === "done") run++; else break;
    }
    if (run >= 7 && easterEggs.once("minimalist")) {
      dropMessage("🧘","Minimalist Master — 1 habit, 7 days!","#a78bfa");
      floatEmojis(["🧘","☯️","🍃","✅"], 8);
      awardXP(35, "Minimalist egg");
    }
  };

  // 10. Overachiever — 10+ habits all done same day
  const checkOverachieverEgg = () => {
    const month  = ensureMonth();
    const i      = TODAY_DAY - 1;
    const active = month.tasks.filter(t => t.days[i] !== "locked");
    const done   = active.filter(t => t.days[i] === "done");
    if (done.length >= 10 && easterEggs.once("overachiever")) {
      dropMessage("🤯","10 habits done in one day?!","#ef4444");
      floatEmojis(["🤯","💥","🔥","👀"], 14);
      awardXP(100, "Overachiever egg");
      setTimeout(() => showBadgeUnlock({ icon:"🤯", name:"Overachiever",
        desc:"Completed 10+ habits in a single day", color:"#ef4444" }), 600);
    }
  };

  // 11. Konami code
  (() => {
    const KONAMI = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
    let kIdx = 0;
    document.addEventListener("keydown", (e) => {
      if (e.key === KONAMI[kIdx]) { kIdx++;
        if (kIdx === KONAMI.length) {
          kIdx = 0;
          dropMessage("👾","KONAMI CODE! +100 XP!","#4ade80",4000);
          floatEmojis(["👾","🎮","⬆️","⬇️","⬅️","➡️"],16);
          rainbowHeader(3000);
          if (easterEggs.once("konami")) awardXP(100,"Konami Code 🎮");
          launchConfetti();
        }
      } else { kIdx = e.key === KONAMI[0] ? 1 : 0; }
    });
  })();

  // 12. Gem counter tap x5
  (() => {
    let tapCount = 0, tapTimer = null;
    document.addEventListener("click", (e) => {
      if (!e.target.closest?.("[id='gemCount'], .gem-display")) return;
      tapCount++;
      clearTimeout(tapTimer);
      tapTimer = setTimeout(() => { tapCount = 0; }, 1500);
      if (tapCount >= 5) {
        tapCount = 0;
        dropMessage("💎","Gem maniac! +5 bonus 💎","#a78bfa");
        floatEmojis(["💎","✨","💰"],10);
        if (easterEggs.once("gem_tap")) awardGems(5,"Secret gem tap!");
      }
    });
  })();

  const runEasterEggChecks = () => {
    checkMidnightEgg();
    checkPiTimeEgg();
    checkHolidayEgg();
    checkAllNighterEgg();
    checkAccountantEgg();
    checkCenturionEgg();
    checkMinimalistEgg();
    checkOverachieverEgg();
    checkSpeedDemonEgg();
  };
  /* =========================
     GEM SYSTEM
  ========================= */

  // Gems live at data.gems = { total, awardedDays: ["YYYY-MM-DD", ...], awardedMonths: ["YYYY-MM", ...] }
  const ensureGems = () => {
    if (!data.gems) data.gems = { total: 0, awardedDays: [], awardedMonths: [] };
    return data.gems;
  };

  const getGems = () => ensureGems().total;

  const awardGems = (amount, reason) => {
    const gems = ensureGems();
    gems.total += amount;
    saveData();
    showGemToast(amount, reason);
    renderGems();
  };

  const spendGems = (amount) => {
    const gems = ensureGems();
    if (gems.total < amount) return false;
    gems.total -= amount;
    saveData();
    renderGems();
    return true;
  };

  // Called after every cycleStatus — awards 10 gems when today hits 100%
  const checkAndAwardGems = () => {
    if (currentYear !== TODAY_YEAR || currentMonth !== TODAY_MONTH) return;

    const month = ensureMonth();
    if (!month.tasks.length) return;

    const todayIdx   = TODAY_DAY - 1;
    const activeTasks = month.tasks.filter(t => t.days[todayIdx] !== "locked");
    if (!activeTasks.length) return;

    const allDone    = activeTasks.every(t => t.days[todayIdx] === "done");
    const todayKey   = `${TODAY_YEAR}-${String(TODAY_MONTH + 1).padStart(2,"0")}-${String(TODAY_DAY).padStart(2,"0")}`;
    const gems       = ensureGems();

    if (allDone && !gems.awardedDays.includes(todayKey)) {
      gems.awardedDays.push(todayKey);
      saveData();
      awardGems(10, "Perfect day! +10 💎");
      awardXP(25, "Perfect day bonus");
    }

    // If they un-mark a task, revoke today's gem award so they can re-earn it
    if (!allDone && gems.awardedDays.includes(todayKey)) {
      gems.awardedDays = gems.awardedDays.filter(d => d !== todayKey);
      gems.total = Math.max(0, gems.total - 10);
      saveData();
      renderGems();
    }
  };

  // Check month completion bonus — call at render time
  const checkMonthBonus = () => {
    const gems   = ensureGems();
    const mKey   = `${currentYear}-${String(currentMonth + 1).padStart(2,"0")}`;
    if (gems.awardedMonths.includes(mKey)) return;

    // Only award if month is fully in the past
    const isPastMonth =
      currentYear < TODAY_YEAR ||
      (currentYear === TODAY_YEAR && currentMonth < TODAY_MONTH);
    if (!isPastMonth) return;

    const stats = calculateStats();
    if (stats.progress >= 80) {
      gems.awardedMonths.push(mKey);
      saveData();
      awardGems(50, "Month completed at " + stats.progress + "%! +50 💎");
      awardXP(50, "Month completion bonus");
    }
  };

  // Spend 100 gems to save a broken streak today
  const saveStreakWithGems = () => {
    if (window.HabitPremium && !window.HabitPremium.isPremium()) {
      window.HabitPremium.showUpgradeWall("shields");
      return;
    }
    if (getGems() < 100) return;

    const month    = ensureMonth();
    const todayIdx = TODAY_DAY - 1;

    // Flip today's failed tasks back to unmarked so streak recalculates
    let fixed = false;
    month.tasks.forEach(task => {
      if (task.days[todayIdx] === "failed") {
        task.days[todayIdx] = "unmarked";
        fixed = true;
      }
    });

    if (!fixed) {
      showGemToast(0, "No failed tasks today to save!");
      return;
    }

    spendGems(100);
    saveData();
    showGemToast(-100, "Streak saved! -100 💎");
    render();
  };

  /* =========================
     GEM TOAST
  ========================= */
  const showGemToast = (amount, msg) => {
    const toast      = document.createElement("div");
    toast.className  = "gem-toast";
    const isPositive = amount > 0;
    toast.innerHTML  = `
      <span class="gem-toast-icon">💎</span>
      <div>
        <strong style="color:${isPositive ? "var(--done,#4ade80)" : "var(--missed,#f87171)"}">${msg}</strong>
        <div class="toast-sub">Total: ${getGems()} 💎</div>
      </div>`;
    pushToast(toast, 3000);
  };

  /* =========================
     RENDER GEMS IN HEADER
  ========================= */
  const renderGems = () => {
    const gemEl = document.getElementById("gemCount");
    if (!gemEl) return;

    const total = getGems();
    gemEl.textContent = total + " 💎";

    // Show/hide streak-save button
    const saveBtn = document.getElementById("saveStreakBtn");
    if (saveBtn) {
      saveBtn.style.display = total >= 100 ? "inline-flex" : "none";
    }
  };

  

  /* =========================
     STATS
  ========================= */
  const calculateStats = () => {
    const month = ensureMonth();
    const days = daysInMonth(currentYear, currentMonth);
    let done = 0;
    month.tasks.forEach(t => t.days.forEach(d => d === "done" && done++));
    const totalPossible = month.tasks.length * days;
    const progress = totalPossible ? Math.round((done / totalPossible) * 100) : 0;
    return { totalTasks: month.tasks.length, done, progress };
  };

  const calculateTodayCompletion = () => {
    const month = ensureMonth();
    if (currentYear !== TODAY_YEAR || currentMonth !== TODAY_MONTH) return 0;
    if (!month.tasks.length) return 0;
    const i = TODAY_DAY - 1;
    const done = month.tasks.filter(t => t.days[i] === "done").length;
    return Math.round((done / month.tasks.length) * 100);
  };

  const getStreakThreshold = () => {
    const sel = document.getElementById("streak-threshold");
    const saved = localStorage.getItem("streakThreshold");
    if (sel) return parseInt(sel.value, 10);
    if (saved) return parseInt(saved, 10);
    return 80; // default
  };

  const calculateDailyStreak = () => {
    const threshold = getStreakThreshold();
    let streak = 0;

    // Walk backwards from today across months/years
    const cursor = new Date(TODAY_YEAR, TODAY_MONTH, TODAY_DAY);
    let daysChecked = 0;
    const MAX_DAYS = 1095; // cap at 3 years of lookback

    while (daysChecked < MAX_DAYS) {
      const y  = cursor.getFullYear();
      const mo = cursor.getMonth();
      const d  = cursor.getDate() - 1; // 0-indexed day

      const mk  = monthKey(y, mo);
      const monthData = data[mk];

      // If no data for this month, streak is broken (unless it's the first day we check)
      if (!monthData?.tasks?.length) {
        if (daysChecked === 0) { cursor.setDate(cursor.getDate() - 1); daysChecked++; continue; }
        break;
      }

      const active = monthData.tasks.filter(t => t.days[d] !== undefined && t.days[d] !== "locked");
      if (!active.length) {
        // No active tasks this day — skip without breaking (habit hadn't started yet)
        cursor.setDate(cursor.getDate() - 1);
        daysChecked++;
        continue;
      }

      const done = active.filter(t => t.days[d] === "done").length;
      const pct  = Math.round((done / active.length) * 100);

      if (pct >= threshold) {
        streak++;
      } else if (daysChecked === 0) {
        // Today not done yet — skip, don't break streak
      } else {
        break; // past day below threshold — streak ends
      }

      cursor.setDate(cursor.getDate() - 1);
      daysChecked++;
    }

    return streak;
  };


  /* =========================
     MONTHLY INSIGHTS
  ========================= */
  const calculateInsights = () => {
    const month  = ensureMonth();
    const days   = daysInMonth(currentYear, currentMonth);
    const tasks  = month.tasks;
    const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

    if (!tasks.length) return null;

    // ── Per-day completion % ──────────────────────────────────────
    const dayScores = []; // index 0 = day 1
    for (let d = 0; d < days; d++) {
      const active = tasks.filter(t => t.days[d] !== "locked");
      if (!active.length) { dayScores.push(null); continue; }
      const done = active.filter(t => t.days[d] === "done").length;
      dayScores.push(Math.round((done / active.length) * 100));
    }

    // Only count days that have passed (no future nulls distorting)
    const limit = (currentYear === TODAY_YEAR && currentMonth === TODAY_MONTH)
      ? TODAY_DAY - 1   // up to yesterday (today still in progress)
      : days - 1;

    const scored = dayScores
      .slice(0, limit + 1)
      .map((v, i) => ({ day: i + 1, score: v }))
      .filter(x => x.score !== null);

    // ── Best / Worst day of month ─────────────────────────────────
    const bestDay  = scored.length ? scored.reduce((a, b) => b.score > a.score ? b : a) : null;
    const worstDay = scored.length ? scored.reduce((a, b) => b.score < a.score ? b : a) : null;

    // ── Best streak (consecutive fully-done days) ─────────────────
    let bestStreak = 0, curStreak = 0, bestStreakEnd = 0;
    for (let d = 0; d <= limit; d++) {
      const active = tasks.filter(t => t.days[d] !== "locked");
      if (!active.length) continue;
      const allDone = active.every(t => t.days[d] === "done");
      if (allDone) {
        curStreak++;
        if (curStreak > bestStreak) {
          bestStreak    = curStreak;
          bestStreakEnd = d + 1; // 1-indexed day
        }
      } else {
        curStreak = 0;
      }
    }

    // ── Best weekday (Mon–Sun) ────────────────────────────────────
    const weekdayTotals = Array(7).fill(0);
    const weekdayCounts = Array(7).fill(0);
    for (let d = 0; d <= limit; d++) {
      const date    = new Date(currentYear, currentMonth, d + 1);
      const wd      = date.getDay();
      if (dayScores[d] !== null) {
        weekdayTotals[wd] += dayScores[d];
        weekdayCounts[wd]++;
      }
    }
    const weekdayAvgs = weekdayTotals.map((t, i) =>
      weekdayCounts[i] ? Math.round(t / weekdayCounts[i]) : null
    );
    const bestWdIdx  = weekdayAvgs.reduce((best, v, i) =>
      v !== null && (best === -1 || v > weekdayAvgs[best]) ? i : best, -1);
    const worstWdIdx = weekdayAvgs.reduce((best, v, i) =>
      v !== null && (best === -1 || v < weekdayAvgs[best]) ? i : best, -1);

    // ── Most consistent habit (fewest failures) ───────────────────
    const habitScores = tasks.map(task => {
      const activeDays = task.days.slice(0, limit + 1).filter(s => s !== "locked");
      if (!activeDays.length) return { name: task.name, pct: 0 };
      const done = activeDays.filter(s => s === "done").length;
      return { name: task.name, pct: Math.round((done / activeDays.length) * 100) };
    });
    const bestHabit  = habitScores.length ? habitScores.reduce((a, b) => b.pct > a.pct ? b : a) : null;
    const worstHabit = habitScores.length ? habitScores.reduce((a, b) => b.pct < a.pct ? b : a) : null;

    // ── Perfect days (100% completion) ───────────────────────────
    const perfectDays = scored.filter(x => x.score === 100).length;

    // ── Current month average ─────────────────────────────────────
    const avg = scored.length
      ? Math.round(scored.reduce((s, x) => s + x.score, 0) / scored.length)
      : 0;

    return {
      bestDay, worstDay,
      bestStreak, bestStreakEnd,
      bestWdIdx, worstWdIdx,
      bestHabit, worstHabit,
      perfectDays, avg,
      daysTracked: scored.length,
      weekdayAvgs, DAY_NAMES
    };
  };

  /* =========================
     RENDER INSIGHTS
  ========================= */
  const renderInsights = () => {
    const panel = document.getElementById("insightsPanel");
    if (!panel) return;

    const ins = calculateInsights();

    if (!ins || ins.daysTracked === 0) {
      panel.innerHTML = `<p class="insights-empty">📊 Track a few days to see your monthly insights.</p>`;
      return;
    }

    const cards = [];

    // Helper to build a card
    const card = (icon, label, value, sub, accentVar) => `
      <div class="insight-card" style="--card-accent:${accentVar}">
        <span class="insight-icon">${icon}</span>
        <span class="insight-label">${label}</span>
        <span class="insight-value">${value}</span>
        ${sub ? `<span class="insight-sub">${sub}</span>` : ""}
      </div>`;

    // Monthly average
    cards.push(card(
      "📈", "Monthly Average",
      `${ins.avg}%`,
      `across ${ins.daysTracked} tracked day${ins.daysTracked !== 1 ? "s" : ""}`,
      "var(--primary, #4CAF50)"
    ));

    // Best streak
    if (ins.bestStreak > 0) {
      const streakEnd = ins.bestStreakEnd;
      const streakStart = streakEnd - ins.bestStreak + 1;
      cards.push(card(
        "🔥", "Best Streak",
        `${ins.bestStreak} day${ins.bestStreak !== 1 ? "s" : ""}`,
        ins.bestStreak > 1
          ? `Day ${streakStart} → Day ${streakEnd}`
          : `Day ${streakEnd}`,
        "var(--done, #4CAF50)"
      ));
    }

    // Perfect days
    cards.push(card(
      "⭐", "Perfect Days",
      `${ins.perfectDays}`,
      ins.perfectDays === 0
        ? "No 100% days yet"
        : ins.perfectDays === 1
          ? "1 day with all habits done"
          : `${ins.perfectDays} days with all habits done`,
      "var(--done, #4CAF50)"
    ));

    // Best single day
    if (ins.bestDay) {
      const date = new Date(currentYear, currentMonth, ins.bestDay.day);
      const wd   = date.toLocaleDateString("en-US", { weekday: "short" });
      cards.push(card(
        "🏆", "Best Day",
        `Day ${ins.bestDay.day}`,
        `${wd} — ${ins.bestDay.score}% complete`,
        "var(--done, #4CAF50)"
      ));
    }

    // Worst single day
    if (ins.worstDay && ins.worstDay.day !== ins.bestDay?.day) {
      const date = new Date(currentYear, currentMonth, ins.worstDay.day);
      const wd   = date.toLocaleDateString("en-US", { weekday: "short" });
      cards.push(card(
        "📉", "Worst Day",
        `Day ${ins.worstDay.day}`,
        `${wd} — ${ins.worstDay.score}% complete`,
        "var(--missed, #E53935)"
      ));
    }

    // Best weekday
    if (ins.bestWdIdx !== -1) {
      cards.push(card(
        "💪", "Strongest Weekday",
        ins.DAY_NAMES[ins.bestWdIdx],
        `Avg ${ins.weekdayAvgs[ins.bestWdIdx]}% on ${ins.DAY_NAMES[ins.bestWdIdx]}s`,
        "var(--primary, #4CAF50)"
      ));
    }

    // Worst weekday
    if (ins.worstWdIdx !== -1 && ins.worstWdIdx !== ins.bestWdIdx) {
      cards.push(card(
        "😓", "Weakest Weekday",
        ins.DAY_NAMES[ins.worstWdIdx],
        `Avg ${ins.weekdayAvgs[ins.worstWdIdx]}% on ${ins.DAY_NAMES[ins.worstWdIdx]}s`,
        "var(--missed, #E53935)"
      ));
    }

    // Best habit
    if (ins.bestHabit) {
      cards.push(card(
        "🧠", "Most Consistent",
        `${ins.bestHabit.pct}%`,
        ins.bestHabit.name.length > 22
          ? ins.bestHabit.name.slice(0, 22) + "…"
          : ins.bestHabit.name,
        "var(--done, #4CAF50)"
      ));
    }

    // Worst habit
    if (ins.worstHabit && ins.worstHabit.name !== ins.bestHabit?.name) {
      cards.push(card(
        "⚠️", "Needs Attention",
        `${ins.worstHabit.pct}%`,
        ins.worstHabit.name.length > 22
          ? ins.worstHabit.name.slice(0, 22) + "…"
          : ins.worstHabit.name,
        "var(--missed, #E53935)"
      ));
    }

    panel.innerHTML = cards.join("");
  };

  /* =========================
     RENDERING
  ========================= */
  const renderHeader = () => {
    monthLabel.textContent = MONTHS[currentMonth];
    yearLabel.textContent = currentYear;
  };

  /* =========================
     STREAK MILESTONE CELEBRATIONS
  ========================= */
  const STREAK_MILESTONES = [
    { days: 3,   emoji: "🔥", title: "3-Day Streak!",   msg: "Byte here. 3 days! This is where most people give up. NOT YOU. Byte's little antennae are going wild!", color: "#fb923c" },
    { days: 7,   emoji: "⚡", title: "One Week!",        msg: "A full week! Byte just did a victory spin and knocked over everything on the desk. Worth it. You're incredible!", color: "#facc15" },
    { days: 14,  emoji: "💪", title: "Two Weeks!",       msg: "Byte has upgraded your status from 'promising' to 'genuinely unstoppable'. Two whole weeks. This habit is forming for real!", color: "#4ade80" },
    { days: 21,  emoji: "🧠", title: "21 Days!",         msg: "Science says 21 days makes a habit permanent. Byte says you were already a legend. Same thing really.", color: "#38bdf8" },
    { days: 30,  emoji: "🏆", title: "30-Day Streak!",   msg: "ONE MONTH. Byte needs a moment... okay back. Byte has literally never been more proud of anyone ever. You. Are. Different.", color: "#a78bfa" },
    { days: 60,  emoji: "🌟", title: "60 Days!",         msg: "Two months. Byte has officially run out of compliments. You're in uncharted territory now. Top 1% of humans. No question.", color: "#f59e0b" },
    { days: 100, emoji: "👑", title: "100 Days!",        msg: "100 DAYS. Byte is absolutely losing it right now. Byte is in AWE of you. LEGEND STATUS: CONFIRMED. Forever.", color: "#ef4444" },
    { days: 365, emoji: "🌠", title: "365 Days!",        msg: "A FULL YEAR. Byte is shedding a tiny green tear. You didn't just build a habit. You changed your life. Byte loves you.", color: "#fff"    },
  ];

  const showStreakMilestone = (milestone, streak) => {
    document.getElementById("streakMilestoneOverlay")?.remove();

    const overlay = document.createElement("div");
    overlay.id    = "streakMilestoneOverlay";
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:999998;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      background:rgba(0,0,0,0.9);backdrop-filter:blur(10px);
      animation:fadeInOverlay 0.35s ease;`;

    overlay.innerHTML = `
      <div style="text-align:center;padding:20px;max-width:420px;animation:leaguePopIn 0.55s cubic-bezier(0.34,1.56,0.64,1)">
        <div style="font-size:5.5rem;line-height:1;margin-bottom:16px;
                    filter:drop-shadow(0 0 32px ${milestone.color})">${milestone.emoji}</div>
        <div style="display:flex;justify-content:center;margin-bottom:8px;animation:byteFloat 2.5s ease-in-out infinite">
          <svg width="48" height="48" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs><radialGradient id="bMil" cx="45%" cy="35%" r="60%"><stop offset="0%" stop-color="#6ee7b7"/><stop offset="100%" stop-color="#059669"/></radialGradient></defs>
            <circle cx="50" cy="50" r="38" fill="url(#bMil)" filter="drop-shadow(0 4px 12px rgba(16,185,129,0.5))"/>
            <ellipse cx="37" cy="33" rx="10" ry="7" fill="white" opacity="0.2" transform="rotate(-20 37 33)"/>
            <circle cx="12" cy="50" r="7" fill="#059669"/><circle cx="88" cy="50" r="7" fill="#059669"/>
            <ellipse cx="38" cy="44" rx="5" ry="6" fill="#052e16"/><ellipse cx="62" cy="44" rx="5" ry="6" fill="#052e16"/>
            <circle cx="37" cy="42" r="2" fill="white" opacity="0.7"/><circle cx="61" cy="42" r="2" fill="white" opacity="0.7"/>
            <path d="M34 57 Q50 70 66 57" stroke="#052e16" stroke-width="3" fill="none" stroke-linecap="round"/>
            <circle cx="50" cy="10" r="4" fill="#4ade80"/>
            <line x1="50" y1="12" x2="50" y2="26" stroke="#059669" stroke-width="3" stroke-linecap="round"/>
          </svg>
        </div>
        <div style="font-size:0.72rem;font-weight:800;letter-spacing:0.18em;color:${milestone.color};text-transform:uppercase;margin-bottom:10px">Byte's Verdict</div>
        <div style="font-size:2.4rem;font-weight:900;color:#fff;margin-bottom:10px;
                    text-shadow:0 0 40px ${milestone.color}">${milestone.title}</div>
        <div style="font-size:1rem;color:rgba(255,255,255,0.65);margin-bottom:8px">${milestone.msg}</div>
        <div style="font-size:0.8rem;color:${milestone.color};font-weight:700;margin-bottom:28px">
          ${streak} day${streak !== 1 ? "s" : ""} and counting 🔥
        </div>
        <div style="display:inline-flex;align-items:center;gap:10px;
                    background:color-mix(in srgb,${milestone.color} 12%,transparent);
                    border:1px solid color-mix(in srgb,${milestone.color} 50%,transparent);
                    border-radius:16px;padding:10px 24px;margin-bottom:28px">
          <span style="font-size:2rem">🔥</span>
          <span style="font-size:2.2rem;font-weight:900;color:${milestone.color}">${streak}</span>
          <span style="font-size:0.9rem;color:rgba(255,255,255,0.5)">days</span>
        </div>
        <div style="display:flex;gap:12px;justify-content:center">
          <button id="streakMilestoneClose" style="
            padding:11px 28px;border-radius:20px;border:1px solid rgba(255,255,255,0.25);
            background:transparent;color:#fff;font-weight:700;cursor:pointer;font-size:0.9rem">
            Keep Going 💪
          </button>
        </div>
        <div style="margin-top:16px;font-size:0.65rem;color:rgba(255,255,255,0.25)">Tap anywhere to dismiss</div>
      </div>`;

    const close = () => {
      overlay.style.animation = "fadeOutOverlay 0.3s ease forwards";
      setTimeout(() => overlay.remove(), 300);
    };
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay || e.target.id === "streakMilestoneClose") close();
    });
    document.body.appendChild(overlay);
    launchConfetti();
    awardXP(milestone.days, milestone.days + "-day streak milestone");
    setTimeout(close, 12000);
  };

  // Session-level guard — prevents double-fire within same page load
  const _shownMilestonesThisSession = new Set();

  const checkStreakMilestones = (streak) => {
    if (streak <= 0) return;
    if (!data.streakMilestones) data.streakMilestones = [];
    for (const m of STREAK_MILESTONES) {
      const alreadySaved  = data.streakMilestones.includes(m.days);
      const alreadyShown  = _shownMilestonesThisSession.has(m.days);
      if (streak >= m.days && !alreadySaved && !alreadyShown) {
        data.streakMilestones.push(m.days);
        _shownMilestonesThisSession.add(m.days);
        saveData();
        setTimeout(() => showStreakMilestone(m, streak), 800);
        break; // one at a time
      }
    }
  };

  const renderStats = () => {
    const stats  = calculateStats();
    const streak = calculateDailyStreak();
    habitCount.textContent     = stats.totalTasks;
    completedCount.textContent = stats.done;
    document.querySelector(".progress-fill").style.width    = stats.progress + "%";
    document.querySelector(".progress-percent").textContent = stats.progress + "%";

    const month = ensureMonth();
    const graceActive = month.tasks.some(t => (t.graceUsed ?? 0) > 0);
    const streakEl = document.getElementById("dailyStreak");
    // Animated fire that grows with streak length
    const fireSize = streak === 0 ? "1rem" : streak < 3 ? "1.1rem" : streak < 7 ? "1.3rem" : streak < 14 ? "1.5rem" : streak < 30 ? "1.7rem" : "2rem";
    const fireGlow = streak >= 7 ? `0 0 ${Math.min(streak,30)}px rgba(251,146,60,0.6)` : "none";
    const fireAnim = streak >= 3 ? "streakPulse 1.5s ease-in-out infinite" : "none";
    streakEl.innerHTML = `<span class="streak-fire" style="font-size:${fireSize};filter:drop-shadow(${fireGlow});animation:${fireAnim};display:inline-block">${streak >= 30 ? "🌋" : streak >= 14 ? "🔥" : streak >= 7 ? "🔥" : streak >= 3 ? "🔥" : "🔥"}</span> <span class="streak-num">${streak}</span>${graceActive ? " 🛡️" : ""}`;

    checkStreakMilestones(streak);
  };

  /* =========================
     WEEKLY SUMMARY STRIP
  ========================= */
  /* =========================
     DAILY QUEST SYSTEM
  ========================= */

  // All possible quest templates
  const QUEST_TEMPLATES = [
    {
      id: "complete_3",
      icon: "🎯",
      name: "Hat Trick",
      desc: "Complete 3 habits today",
      xp: 30, gems: 15,
      check: () => {
        const month = ensureMonth();
        const i     = TODAY_DAY - 1;
        return month.tasks.filter(t => t.days[i] === "done").length;
      },
      target: 3,
    },
    {
      id: "complete_all",
      icon: "⭐",
      name: "Perfect Day",
      desc: "Complete ALL habits today",
      xp: 50, gems: 25,
      check: () => {
        const month   = ensureMonth();
        const i       = TODAY_DAY - 1;
        const active  = month.tasks.filter(t => t.days[i] !== "locked");
        if (!active.length) return 0;
        const done    = active.filter(t => t.days[i] === "done").length;
        return done === active.length ? active.length : done;
      },
      target: () => {
        const month  = ensureMonth();
        const active = month.tasks.filter(t => t.days[TODAY_DAY - 1] !== "locked");
        return Math.max(1, active.length);
      },
    },
    {
      id: "no_fails",
      icon: "🛡️",
      name: "Clean Slate",
      desc: "End the day with 0 failed habits",
      xp: 25, gems: 10,
      check: () => {
        const month = ensureMonth();
        const i     = TODAY_DAY - 1;
        return month.tasks.filter(t => t.days[i] === "failed").length === 0 ? 1 : 0;
      },
      target: 1,
    },
    {
      id: "early_done",
      icon: "🌅",
      name: "Early Riser",
      desc: "Complete a habit before noon",
      xp: 20, gems: 10,
      check: () => (data.questProgress?.earlyDone ? 1 : 0),
      target: 1,
    },
    {
      id: "login_streak_3",
      icon: "📅",
      name: "Committed",
      desc: "Maintain a 3+ day login streak",
      xp: 20, gems: 10,
      check: () => Math.min(ensureLoginData().count, 3),
      target: 3,
    },
    {
      id: "complete_5",
      icon: "💪",
      name: "Power Hour",
      desc: "Complete 5 habits today",
      xp: 40, gems: 20,
      check: () => {
        const month = ensureMonth();
        const i     = TODAY_DAY - 1;
        return month.tasks.filter(t => t.days[i] === "done").length;
      },
      target: 5,
    },
    {
      id: "gems_50",
      icon: "💎",
      name: "Treasure Hunt",
      desc: "Have at least 50 gems",
      xp: 15, gems: 0,
      check: () => Math.min(getGems(), 50),
      target: 50,
    },
    {
      id: "streak_5",
      icon: "🔥",
      name: "On Fire",
      desc: "Reach a 5-day habit streak",
      xp: 35, gems: 15,
      check: () => Math.min(calculateDailyStreak(), 5),
      target: 5,
    },
  ];

  // Pick 3 quests for today deterministically (same 3 all day, rotate daily)
  const getDailyQuests = () => {
    const seed    = parseInt(todayKey().replace(/-/g, ""), 10) % 1000;
    const shuffled = [...QUEST_TEMPLATES].sort((a, b) => {
      const ha = ((seed * 1664525 + a.id.length * 22695477) >>> 0) % 1000;
      const hb = ((seed * 1664525 + b.id.length * 22695477) >>> 0) % 1000;
      return ha - hb;
    });
    return shuffled.slice(0, 3);
  };

  const ensureQuestData = () => {
    if (!data.quests) data.quests = { state: {}, lastReset: null };
    // Migrate old format
    if (data.quests.completedToday && !data.quests.state) {
      data.quests.state = {};
      Object.keys(data.quests.completedToday).forEach(id => {
        data.quests.state[id] = { awarded: true };
      });
      delete data.quests.completedToday;
    }
    // Reset each new day
    if (data.quests.lastReset !== todayKey()) {
      data.quests.state     = {};
      data.quests.lastReset = todayKey();
      saveData();
    }
    return data.quests;
  };

  const checkQuestCompletions = () => {
    const qData  = ensureQuestData();
    const quests = getDailyQuests();
    let   changed = false;

    quests.forEach(q => {
      const progress   = q.check();
      const target     = typeof q.target === "function" ? q.target() : q.target;
      const isComplete = progress >= target;
      const wasAwarded = !!qData.state[q.id]?.awarded;

      if (isComplete && !wasAwarded) {
        // Quest just completed — award immediately
        qData.state[q.id] = { awarded: true, xp: q.xp, gems: q.gems };
        changed = true;
        saveData();
        awardXP(q.xp, `Quest: ${q.name}`);
        if (q.gems > 0) awardGems(q.gems, `Quest: ${q.name} +${q.gems} 💎`);
        pushToast(buildSimpleToast("🎯", `Quest complete: ${q.name}!`, "var(--done,#4ade80)"), 4000);

      } else if (!isComplete && wasAwarded) {
        // Quest un-completed via undo — revoke rewards
        const prev = qData.state[q.id];
        qData.state[q.id] = { awarded: false };
        changed = true;

        // Claw back XP
        const xp = ensureXP();
        xp.total = Math.max(0, xp.total - prev.xp);
        while (xp.level > 1 && xp.total < 0) {
          xp.level--;
          xp.total += XP_PER_LEVEL(xp.level);
        }
        xp.total = Math.max(0, xp.total);

        // Claw back gems
        if (prev.gems > 0) {
          const gems = ensureGems();
          gems.total = Math.max(0, gems.total - prev.gems);
          renderGems();
        }

        saveData();
        renderXP();
        pushToast(buildSimpleToast("↩️", `Quest revoked: ${q.name}`, "var(--missed,#f87171)"), 3000);
      }
    });

    if (changed) renderQuestsPanel();
  };

  const msUntilMidnight = () => {
    const now  = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 0, 0);
    return next - now;
  };

  const formatCountdown = (ms) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  /* =========================
     LEAGUE SYSTEM
  ========================= */
  // 10 leagues — based on lifetimeXP
  const LEAGUES = [
    { id: "bronze",      name: "Bronze",      emoji: "🥉", color: "#b45309", xpNeeded: 0,     unlockMsg: "Welcome to the arena!" },
    { id: "silver",      name: "Silver",      emoji: "🥈", color: "#94a3b8", xpNeeded: 300,   unlockMsg: "Moving up!" },
    { id: "gold",        name: "Gold",        emoji: "🥇", color: "#facc15", xpNeeded: 800,   unlockMsg: "Now we're talking!" },
    { id: "platinum",    name: "Platinum",    emoji: "💠", color: "#38bdf8", xpNeeded: 1800,  unlockMsg: "Elite territory!" },
    { id: "diamond",     name: "Diamond",     emoji: "💎", color: "#a78bfa", xpNeeded: 3500,  unlockMsg: "Truly dedicated." },
    { id: "obsidian",    name: "Obsidian",    emoji: "🌑", color: "#6366f1", xpNeeded: 6000,  unlockMsg: "Dark and powerful." },
    { id: "emerald",     name: "Emerald",     emoji: "💚", color: "#10b981", xpNeeded: 10000, unlockMsg: "Rare and brilliant." },
    { id: "ruby",        name: "Ruby",        emoji: "❤️‍🔥", color: "#ef4444", xpNeeded: 16000, unlockMsg: "Burning bright!" },
    { id: "mythic",      name: "Mythic",      emoji: "🔱", color: "#f59e0b", xpNeeded: 25000, unlockMsg: "Beyond human limits." },
    { id: "legendary",   name: "Legendary",   emoji: "🌟", color: "#fff",    xpNeeded: 40000, unlockMsg: "You are unstoppable." },
  ];

  // Weekly XP = XP earned in current calendar week (Mon–Sun)
  const getWeekKey = () => {
    const d   = new Date();
    const dow = d.getDay() === 0 ? 6 : d.getDay() - 1; // Mon=0
    const mon = new Date(d);
    mon.setDate(d.getDate() - dow);
    return `${mon.getFullYear()}-${String(mon.getMonth()+1).padStart(2,"0")}-${String(mon.getDate()).padStart(2,"0")}`;
  };

  const ensureLeague = () => {
    if (!data.league) data.league = { weeklyXP: 0, weekKey: null, totalXP: 0 };
    // Reset weekly XP each new week
    if (data.league.weekKey !== getWeekKey()) {
      data.league.weeklyXP = 0;
      data.league.weekKey  = getWeekKey();
      saveData();
    }
    return data.league;
  };

  // Called by awardXP to also credit weekly XP
  const creditLeagueXP = (amount) => {
    const lg     = ensureLeague();
    lg.weeklyXP += amount;
    // Note: league rank now uses xp.lifetimeXP — no separate totalXP needed
    saveData();
  };

  // Wire forward-reference hook now that creditLeagueXP is defined
  leagueHooks.creditXP = creditLeagueXP;

  // Lifetime XP from the XP system (not the separate league counter)
  const getLifetimeXP = () => {
    const xp = ensureXP();
    // lifetimeXP tracks all XP ever earned; if missing, compute from level
    return xp.lifetimeXP || 0;
  };

  const getCurrentLeague = () => {
    const lxp  = getLifetimeXP();
    let league = LEAGUES[0];
    for (const l of LEAGUES) {
      if (lxp >= l.xpNeeded) league = l;
      else break;
    }
    return league;
  };

  const getCurrentLeagueIndex = () => {
    const lxp = getLifetimeXP();
    let idx   = 0;
    LEAGUES.forEach((l, i) => { if (lxp >= l.xpNeeded) idx = i; });
    return idx;
  };

  const getNextLeague = () => {
    const lxp = getLifetimeXP();
    for (const l of LEAGUES) {
      if (lxp < l.xpNeeded) return l;
    }
    return null;
  };

  // Called after level-up to check if we crossed a league threshold
  const checkLeaguePromotion = (prevLevel, newLevel) => {
    const xp   = ensureXP();
    const lxp  = xp.lifetimeXP;
    // Check if we just crossed into a new league
    const prev = (() => {
      // Estimate old lifetime XP (before this award)
      let league = LEAGUES[0];
      for (const l of LEAGUES) {
        if (lxp >= l.xpNeeded) league = l;
        else break;
      }
      return league;
    })();
    // Already handled by renderLeaguePanel — just trigger the animation
    renderLeaguePanel();
  };

  // Track last seen league for promotion toasts
  const checkAndToastLeaguePromotion = () => {
    const lg     = ensureLeague();
    const cur    = getCurrentLeague();
    if (lg.lastLeagueId === cur.id) return;
    if (lg.lastLeagueId !== undefined) {
      // Promoted!
      showLeagueUnlockAnimation(cur);
    }
    lg.lastLeagueId = cur.id;
    saveData();
  };

  // Real leaderboard — pulls actual users from registry, pads with bots only if needed
  const getLeaderboard = () => {
    const lg     = ensureLeague();
    const userXP = lg.weeklyXP;
    const wk     = getWeekKey();
    const seed   = parseInt(wk.replace(/-/g,""), 10);

    // ── Real users ──
    const allUsers  = JSON.parse(localStorage.getItem("habitTracker_users")) || {};
    const realPlayers = [];

    Object.values(allUsers).forEach(u => {
      if (u.id === authUser.id) return; // we add ourselves separately

      const uData   = JSON.parse(localStorage.getItem(`habitTracker_${u.id}`)) || {};
      const uLeague = uData.league || {};
      const profile = uData.profile || {};

      // Only include users in the same league tier (±1 league)
      const uLifetimeXP  = uData.xp?.lifetimeXP || 0;
      const myLifetimeXP = getLifetimeXP();
      const myLeagueIdx  = getCurrentLeagueIndex();
      let   uLeagueIdx   = 0;
      LEAGUES.forEach((l, i) => { if (uLifetimeXP >= l.xpNeeded) uLeagueIdx = i; });

      if (Math.abs(uLeagueIdx - myLeagueIdx) > 1) return; // too far away in league

      // Weekly XP — use their stored weeklyXP if it's the same week, else 0
      const weekXP = uLeague.weekKey === wk ? (uLeague.weeklyXP || 0) : 0;

      realPlayers.push({
        name:   profile.displayName || u.name || u.username || "User",
        avatar: u.avatar || profile.avatar || "😊",
        xp:     weekXP,
        isYou:  false,
        real:   true,
        username: u.username,
      });
    });

    // ── Fill up to 9 opponents with bots only if needed ──
    const botsNeeded = Math.max(0, 9 - realPlayers.length);
    const botNames   = ["Alex","Jordan","Sam","Riley","Casey","Morgan","Quinn","Avery","Blake","Drew","Skyler","River","Wren","Sage","Phoenix"];
    const botAvatars = ["🦊","🐯","🦁","🐺","🦅","🐉","🦋","🌟","⚡","🎯","🔥","💎","🧠","🌊","⚔️"];

    const bots = [];
    for (let i = 0; i < botsNeeded; i++) {
      const h  = ((seed * (i + 7) * 1664525 + 22695477) >>> 0) % 1000;
      const xp = Math.max(0, Math.round(userXP * (0.4 + (h / 1000) * 1.4)));
      bots.push({
        name:   botNames[i % botNames.length],
        avatar: botAvatars[i % botAvatars.length],
        xp,
        isYou:  false,
        real:   false,
      });
    }

    // ── Add self ──
    const myName = authUser.name || authUser.email?.split("@")[0] || "You";
    const myProfile = ensureMonth(); // just to read profile
    const myAvatar  = (JSON.parse(localStorage.getItem(`habitTracker_${authUser.id}`))?.profile?.avatar)
                      || authUser.avatar || "😊";

    const all = [
      ...realPlayers,
      ...bots,
      { name: myName, avatar: myAvatar, xp: userXP, isYou: true, real: true },
    ];

    all.sort((a, b) => b.xp - a.xp);
    return all;
  };

  const msUntilWeekEnd = () => {
    const now = new Date();
    const dow = now.getDay() === 0 ? 6 : now.getDay() - 1; // Mon=0
    const sun = new Date(now);
    sun.setDate(now.getDate() + (6 - dow));
    sun.setHours(23, 59, 59, 999);
    return sun - now;
  };

  const formatTimeLeft = (ms) => {
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    if (d > 0) return `${d}d ${h}h`;
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  /* League unlock full-screen animation */
  const showLeagueUnlockAnimation = (league) => {
    document.getElementById("leagueUnlockOverlay")?.remove();
    const overlay = document.createElement("div");
    overlay.id    = "leagueUnlockOverlay";
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:999999;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      background:rgba(0,0,0,0.88);backdrop-filter:blur(8px);
      animation:fadeInOverlay 0.4s ease;`;
    overlay.innerHTML = `
      <div style="text-align:center;animation:leaguePopIn 0.6s cubic-bezier(0.34,1.56,0.64,1)">
        <div style="font-size:6rem;filter:drop-shadow(0 0 40px ${league.color});margin-bottom:16px">${league.emoji}</div>
        <div style="font-size:0.75rem;font-weight:700;letter-spacing:0.18em;color:${league.color};text-transform:uppercase;margin-bottom:8px">League Unlocked</div>
        <div style="font-size:2.6rem;font-weight:900;color:#fff;margin-bottom:8px">${league.name}</div>
        <div style="font-size:1rem;color:rgba(255,255,255,0.6);margin-bottom:32px">${league.unlockMsg}</div>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
          <button onclick="document.getElementById('leagueUnlockOverlay').remove();document.body.style.overflow=''" style="
            padding:10px 24px;border-radius:20px;border:1px solid rgba(255,255,255,0.3);
            background:transparent;color:#fff;font-weight:700;cursor:pointer;font-size:0.9rem">
            Continue
          </button>
          <button onclick="document.getElementById('leagueUnlockOverlay').remove();document.body.style.overflow='';window.openLeagueDashboard()" style="
            padding:10px 24px;border-radius:20px;border:none;
            background:${league.color};color:#000;font-weight:800;cursor:pointer;font-size:0.9rem">
            Open Dashboard
          </button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";
    launchConfetti();
    setTimeout(() => {
      if (document.getElementById("leagueUnlockOverlay")) {
        overlay.style.animation = "fadeOutOverlay 0.3s ease forwards";
        setTimeout(() => { overlay.remove(); document.body.style.overflow = ""; }, 300);
      }
    }, 10000);
  };

  /* League dashboard modal */
  const buildLeagueDashboardHTML = () => {
    const lg      = ensureLeague();
    const league  = getCurrentLeague();
    const curIdx  = getCurrentLeagueIndex();
    const next    = getNextLeague();
    const lxp     = getLifetimeXP();
    const board   = getLeaderboard();
    const userRank = board.findIndex(p => p.isYou) + 1;

    const progressXP  = lxp - league.xpNeeded;
    const neededXP    = next ? (next.xpNeeded - league.xpNeeded) : 1;
    const progressPct = next ? Math.min(100, Math.round((progressXP / neededXP) * 100)) : 100;

    // Tier track — all 10, unlocked/current/locked/mystery
    const tierHTML = LEAGUES.map((l, i) => {
      const isUnlocked = lxp >= l.xpNeeded;
      const isCurrent  = i === curIdx;
      const isMystery  = !isUnlocked && i > curIdx + 2;
      const cls        = isCurrent  ? "tier-current"
                       : isUnlocked ? "tier-unlocked"
                       : isMystery  ? "tier-mystery"
                       : "tier-locked";
      return `<div class="lm-tier ${cls}" style="--tier-color:${isUnlocked ? l.color : "#555"}" title="${isUnlocked ? l.name : isMystery ? "???" : l.name}">
        ${isCurrent ? `<div class="lm-tier-you">YOU</div>` : ""}
        <div class="lm-tier-emoji">${isUnlocked ? l.emoji : isMystery ? "🔒" : "🔒"}</div>
        <div class="lm-tier-name" style="color:${isUnlocked ? l.color : "var(--text-muted)"}">${isUnlocked ? l.name : isMystery ? "???" : l.name}</div>
        <div class="lm-tier-xp">${isUnlocked ? (l.xpNeeded === 0 ? "Start" : l.xpNeeded.toLocaleString()) : l.xpNeeded.toLocaleString()} XP</div>
      </div>`;
    }).join("");

    // Leaderboard — all 10 players
    const boardHTML = board.map((p, i) => `
      <div class="lm-row ${p.isYou ? "is-you" : ""}">
        <span class="lm-rank">${i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</span>
        <span class="lm-avatar">${p.avatar}</span>
        <div style="flex:1;min-width:0">
          <div class="lm-name">${p.isYou ? "You" : p.name}</div>
          ${!p.isYou && p.real && p.username ? `<div style="font-size:0.62rem;color:rgba(255,255,255,0.35)">@${p.username}</div>` : ""}
          ${!p.real ? `<div style="font-size:0.58rem;color:rgba(255,255,255,0.2);font-style:italic">bot</div>` : ""}
        </div>
        <span class="lm-xp">${p.xp.toLocaleString()} XP</span>
      </div>`).join("");

    return `
      <div class="lm-hero">
        <div class="lm-emblem" style="filter:drop-shadow(0 0 20px ${league.color})">${league.emoji}</div>
        <div class="lm-league-name" style="color:${league.color}">${league.name} League</div>
        <div class="lm-sub">${lxp.toLocaleString()} lifetime XP · Rank #${userRank} this week</div>
        <div class="lm-xp-wrap">
          <div class="lm-xp-track">
            <div class="lm-xp-fill" style="width:${progressPct}%;background:${league.color}"></div>
          </div>
          <div class="lm-xp-label">
            ${next
              ? `${progressXP.toLocaleString()} / ${neededXP.toLocaleString()} XP to ${next.emoji} ${next.name}`
              : "🌟 Max League — You are Legendary!"}
          </div>
        </div>
      </div>

      <div style="font-size:0.72rem;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:10px">
        All Leagues
      </div>
      <div class="lm-tier-track">${tierHTML}</div>

      <div class="lm-board-title">This Week's Leaderboard</div>
      <div class="lm-board">${boardHTML}</div>
      <div class="lm-reset">Leaderboard resets in ${formatTimeLeft(msUntilWeekEnd())}</div>`;
  };

  const renderLeaguePanel = () => {
    // Only updates the badge in the stats bar — panel removed from main layout
    const league = getCurrentLeague();
    checkAndToastLeaguePromotion();
    const badge = document.getElementById("leagueBadge");
    if (badge) {
      badge.textContent = `${league.emoji} ${league.name}`;
      badge.style.color = league.color;
    }
  };

  window.openLeagueDashboard = () => {
    if (window.HabitPremium && !window.HabitPremium.isPremium()) {
      window.HabitPremium.showUpgradeWall("leagues");
      return;
    }
    const modal   = document.getElementById("leagueModal");
    const content = document.getElementById("leagueModalContent");
    if (!modal || !content) return;
    content.innerHTML = buildLeagueDashboardHTML();
    modal.style.display = "block";
    document.body.style.overflow = "hidden";
  };

  window.closeLeagueDashboard = () => {
    const modal = document.getElementById("leagueModal");
    if (modal) modal.style.display = "none";
    document.body.style.overflow = "";
  };

  window._leagueModalBgClick = (e) => {
    if (e.target.id === "leagueModal") window.closeLeagueDashboard();
  };
  const renderQuestsPanel = () => {
    const panel = document.getElementById("questsPanel");
    if (!panel) return;

    // Only show on current month
    if (currentYear !== TODAY_YEAR || currentMonth !== TODAY_MONTH) {
      panel.innerHTML = "";
      return;
    }

    const qData  = ensureQuestData();
    const quests = getDailyQuests();
    const ms     = msUntilMidnight();

    panel.innerHTML = `
      <div class="quests-header">
        <div class="quests-title">🎯 Daily Quests</div>
        <div class="quests-refresh">Resets in ${formatCountdown(ms)}</div>
      </div>
      <div class="quests-grid" id="questsGrid"></div>`;

    const grid = panel.querySelector("#questsGrid");

    quests.forEach(q => {
      const done     = !!qData.state[q.id]?.awarded;
      const progress = done ? (typeof q.target === "function" ? q.target() : q.target) : q.check();
      const target   = typeof q.target === "function" ? q.target() : q.target;
      const pct      = Math.min(100, Math.round((progress / target) * 100));

      const card = document.createElement("div");
      card.className = `quest-card ${done ? "quest-done" : ""}`;
      card.innerHTML = `
        <div class="quest-icon">${q.icon}</div>
        <div class="quest-info">
          <div class="quest-name">${q.name}</div>
          <div class="quest-desc">${q.desc}</div>
          <div class="quest-reward">
            <span>+${q.xp} XP</span>
            ${q.gems > 0 ? `<span>+${q.gems} 💎</span>` : ""}
          </div>
          ${!done ? `
            <div class="quest-progress-wrap">
              <div class="quest-progress-fill" style="width:${pct}%"></div>
            </div>` : ""}
        </div>`;

      grid.appendChild(card);
    });
  };

  const renderWeekStrip = () => {
    const strip = document.getElementById("weekStrip");
    if (!strip) return;

    const month    = ensureMonth();
    const days     = daysInMonth(currentYear, currentMonth);
    const tasks    = month.tasks;
    const DAY_LABELS = ["M","T","W","T","F","S","S"]; // Mon-first display

    if (!tasks.length) {
      strip.innerHTML = `<span class="week-strip-empty">Add habits to see your weekly summary.</span>`;
      return;
    }

    // Build per-day completion % for every day in the month
    // dayScores[0] = day 1, etc.
    const dayScores = [];
    for (let d = 0; d < days; d++) {
      const date    = new Date(currentYear, currentMonth, d + 1);
      const active  = tasks.filter(t => t.days[d] !== "locked");
      const isPast  = currentYear < TODAY_YEAR ||
                      (currentYear === TODAY_YEAR && currentMonth < TODAY_MONTH) ||
                      (currentYear === TODAY_YEAR && currentMonth === TODAY_MONTH && d < TODAY_DAY - 1);
      const isToday = currentYear === TODAY_YEAR &&
                      currentMonth === TODAY_MONTH &&
                      d === TODAY_DAY - 1;

      if (!active.length) {
        dayScores.push({ pct: null, isPast, isToday, date });
        continue;
      }

      const done = active.filter(t => t.days[d] === "done").length;
      dayScores.push({
        pct: Math.round((done / active.length) * 100),
        isPast,
        isToday,
        date
      });
    }

    // Group days into Mon-start weeks
    // Find the Monday on or before day 1
    const firstDay = new Date(currentYear, currentMonth, 1);
    const firstDow = firstDay.getDay(); // 0=Sun
    // Days to go back to reach Monday (Mon=1 → offset=0, Sun=0 → offset=6)
    const offsetToMonday = (firstDow === 0) ? 6 : firstDow - 1;

    const weeks = [];
    let week    = [];

    // Pad start of first week with nulls for days before month starts
    for (let p = 0; p < offsetToMonday; p++) week.push(null);

    for (let d = 0; d < days; d++) {
      week.push(dayScores[d]);
      const dow = new Date(currentYear, currentMonth, d + 1).getDay();
      if (dow === 0 && d < days - 1) { // Sunday — end of week
        weeks.push(week);
        week = [];
      }
    }
    if (week.length) weeks.push(week); // last partial week

    // Colour helper: green→amber→red based on %
    const barColor = (pct) => {
      if (pct === null)  return "var(--border-soft)";
      if (pct >= 80)     return "var(--done, #4CAF50)";
      if (pct >= 50)     return "#f59e0b";
      return "var(--missed, #ef4444)";
    };

    strip.innerHTML = "";

    weeks.forEach((wk, wi) => {
      const weekEl = document.createElement("div");
      weekEl.className = "week-strip-week";

      // Week number label
      const wLabel = document.createElement("div");
      wLabel.className = "week-strip-label";
      wLabel.textContent = `W${wi + 1}`;
      weekEl.appendChild(wLabel);

      const daysEl = document.createElement("div");
      daysEl.className = "week-strip-days";

      // Track valid scores for week average
      const validScores = [];

      wk.forEach((day, di) => {
        const dayEl = document.createElement("div");
        dayEl.className = "week-strip-day";
        if (day?.isToday) dayEl.classList.add("is-today");

        const barWrap = document.createElement("div");
        barWrap.className = "week-strip-bar-wrap";

        const bar = document.createElement("div");
        bar.className = "week-strip-bar";

        if (!day || day.pct === null) {
          // Null = padding day or no active tasks
          bar.style.height = "0%";
          bar.style.background = "transparent";
        } else if (!day.isPast && !day.isToday) {
          // Future day — show faint placeholder
          bar.style.height = "15%";
          bar.style.background = "var(--border-soft)";
          bar.style.opacity = "0.4";
        } else {
          bar.style.height = Math.max(4, day.pct) + "%";
          bar.style.background = barColor(day.pct);
          validScores.push(day.pct);
        }

        barWrap.appendChild(bar);
        dayEl.appendChild(barWrap);

        // Mon-first day label
        // di = position in week array (0=Mon after padding)
        const labelIdx = (di + offsetToMonday) % 7; // align to Mon-Sun
        const dayLabelEl = document.createElement("div");
        dayLabelEl.className = "week-strip-day-label";
        // Use actual date's day of week if we have a real day
        if (day?.date) {
          const dow = day.date.getDay(); // 0=Sun
          const monFirst = ["M","T","W","T","F","S","S"];
          dayLabelEl.textContent = monFirst[dow === 0 ? 6 : dow - 1];
        } else {
          dayLabelEl.textContent = DAY_LABELS[di % 7];
        }

        dayEl.appendChild(dayLabelEl);
        daysEl.appendChild(dayEl);
      });

      weekEl.appendChild(daysEl);

      // Week average
      if (validScores.length) {
        const avg    = Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length);
        const avgEl  = document.createElement("div");
        avgEl.className = "week-strip-avg";
        avgEl.textContent = avg + "%";
        avgEl.style.color = barColor(avg);
        weekEl.appendChild(avgEl);
      }

      strip.appendChild(weekEl);
    });
  };

  const renderGrid = () => {
    gridWrapper.innerHTML = "";
    const month = ensureMonth();
    const days = daysInMonth(currentYear, currentMonth);

    /* HEADER — with perfect-day detection per column */
    const header = document.createElement("div");
    header.className = "grid-row grid-header";
    header.innerHTML = `<div class="grid-cell task-label">Task</div>`;

    for (let d = 1; d <= days; d++) {
      const dayIndex = d - 1;
      const isToday  = isTodayColumn(d);

      // Perfect day: all active tasks on this day are "done"
      const activeTasks = month.tasks.filter(t => t.days[dayIndex] !== "locked");
      const isPerfect   = activeTasks.length > 0 &&
                          activeTasks.every(t => t.days[dayIndex] === "done");
      // Only flag past days or today (not future)
      const isPast = currentYear < TODAY_YEAR ||
        (currentYear === TODAY_YEAR && currentMonth < TODAY_MONTH) ||
        (currentYear === TODAY_YEAR && currentMonth === TODAY_MONTH && d < TODAY_DAY);
      const showPerfect = isPerfect && (isPast || isToday);

      const dayCell = document.createElement("div");
      dayCell.className = [
        "grid-cell day",
        isToday      ? "today"       : "",
        showPerfect  ? "perfect-day" : ""
      ].filter(Boolean).join(" ");
      dayCell.innerHTML = showPerfect
        ? `${d}<span class="perfect-star">⭐</span>`
        : `${d}`;

      header.appendChild(dayCell);
    }

    gridWrapper.appendChild(header);

    /* TASK ROWS */
    month.tasks.forEach(task => {
      const row = document.createElement("div");
      row.className = "grid-row task-row";

      const name = document.createElement("div");
      name.className = "grid-cell task-name";

      const title = document.createElement("span");
      title.textContent = (_hs.sanitizeName ? _hs.sanitizeName(task.name, 80) : task.name);

      // Grace indicator — shows 🛡️ if grace day is still available this month
      const graceLimit = task.graceLimit ?? 1;
      const graceUsed  = task.graceUsed  ?? 0;
      const graceLeft  = graceLimit - graceUsed;
      const graceBadge = document.createElement("span");
      graceBadge.className = "grace-badge";
      graceBadge.title = graceLeft > 0
        ? `Grace day available — 1 missed day won't break your streak`
        : `Grace day used — next miss breaks your streak`;
      graceBadge.textContent = graceLeft > 0 ? "🛡️" : "💀";
      graceBadge.style.opacity = graceLeft > 0 ? "0.7" : "0.4";
      graceBadge.style.fontSize = "0.75rem";
      graceBadge.style.cursor = "help";

      const del = document.createElement("button");
      del.textContent = "🗑️";
      del.className = "delete-task";
      del.onclick = e => { e.stopPropagation(); deleteTask(task.id); };

      // Freeze button — only show on current month/today
      if (currentYear === TODAY_YEAR && currentMonth === TODAY_MONTH) {
        const freezeBtn = document.createElement("button");
        freezeBtn.textContent = "❄️";
        freezeBtn.className   = "freeze-task-btn";
        freezeBtn.title       = isHabitFrozenToday(task) ? "Streak frozen today" : `Freeze streak today (${FREEZE_COST}💎)`;
        freezeBtn.onclick     = e => { e.stopPropagation(); window._buyHabitFreeze(task.id); };
        if (isHabitFrozenToday(task)) freezeBtn.style.opacity = "0.4";
        del.after && del.parentNode ? null : null; // placeholder — appended below
        // Store reference to inject into name.append calls
        task._freezeBtn = freezeBtn;
      }

      // Habit strength badge
      const frozen   = isHabitFrozenToday(task);
      const strength = getHabitStrength(task);
      if (strength) {
        const sb = document.createElement("span");
        sb.className = "strength-badge " + strength.cls;
        sb.textContent = strength.label;
        sb.title = strength.tip;
        if (frozen) {
          const fb = document.createElement("span");
          fb.className = "freeze-badge"; fb.textContent = "❄️";
          fb.title = "Streak frozen today";
          const extraBtns = task._freezeBtn ? [task._freezeBtn] : [];
          name.append(title, sb, fb, graceBadge, ...extraBtns, del);
        } else {
          const extraBtns = task._freezeBtn ? [task._freezeBtn] : [];
          name.append(title, sb, graceBadge, ...extraBtns, del);
        }
      } else {
        if (frozen) {
          const fb = document.createElement("span");
          fb.className = "freeze-badge"; fb.textContent = "❄️";
          fb.title = "Streak frozen today";
          const extraBtns = task._freezeBtn ? [task._freezeBtn] : [];
          name.append(title, fb, graceBadge, ...extraBtns, del);
        } else {
          const extraBtns = task._freezeBtn ? [task._freezeBtn] : [];
          name.append(title, graceBadge, ...extraBtns, del);
        }
      }
      row.appendChild(name);

      task.days.forEach((status, dayIndex) => {

  /* =========================
     HABIT ACTIVE CHECK
  ========================= */
  const date = new Date(currentYear, currentMonth, dayIndex + 1);

if (!isHabitActiveOnDay(task, date)) {
  task.days[dayIndex] = "locked";
} else {
  task.days[dayIndex] ??= "unmarked";
}

const cell = document.createElement("div");

const isToday =
  currentYear === TODAY_YEAR &&
  currentMonth === TODAY_MONTH &&
  dayIndex === TODAY_DAY - 1;

// Warning glow: today's unmarked cells after 23:00
const isWarning =
  isToday &&
  task.days[dayIndex] === "unmarked" &&
  TODAY.getHours() >= 23;

cell.className = `grid-cell status ${task.days[dayIndex]} ${
  isToday   ? "today"   : ""
} ${
  isWarning ? "warning" : ""
}`.trim();

/* 🔹 Only lock future inactive days, leave active days alone */
if (task.days[dayIndex] === "locked") {
  cell.classList.add("locked");
  cell.title = "Habit not scheduled for this day";
} else {
  const status = task.days[dayIndex];
  cell.textContent =
    status === "done"   ? "✔" :
    status === "failed" ? "✖" : "";

  if (status === "unmarked" || status === "done") {
    cell.onclick = () => cycleStatus(task, dayIndex);
    cell.style.cursor = "pointer";
    if (status === "done") cell.title = "Click to mark as failed · Right-click to add note";
  } else {
    cell.style.cursor = "not-allowed";
    cell.title = "Marked failed — use Undo to change";
  }

  // Right-click or long-press to add note on any non-locked cell
  cell.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    openNoteModal(task, dayIndex);
  });
  let longPressTimer = null;
  cell.addEventListener("pointerdown", () => {
    longPressTimer = setTimeout(() => openNoteModal(task, dayIndex), 600);
  });
  cell.addEventListener("pointerup",   () => clearTimeout(longPressTimer));
  cell.addEventListener("pointerleave",() => clearTimeout(longPressTimer));

  // Show note dot if note exists
  const noteKey = getNoteKey(task.id, dayIndex);
  if (getNotes()[noteKey]) {
    const dot = document.createElement("div");
    dot.className = "cell-note-dot";
    cell.appendChild(dot);
  }
}

row.appendChild(cell);
      })


;

      gridWrapper.appendChild(row);
    });
  };

  const renderMonthNav = () => {
    monthNav.innerHTML = "";
    MONTHS.forEach((m, i) => {
      const btn = document.createElement("button");
      btn.textContent = m.slice(0, 3);
      if (i === currentMonth) btn.classList.add("active");
      btn.onclick = () => {
        if (i === currentMonth) return; // already here
        const targetMonth = i;
        slideToMonth(targetMonth);
        currentMonth = targetMonth;
        renderHeader();
        renderWeekStrip();
        renderGrid();
        renderMonthNav();
        renderStats();
        renderInsights();
        updateDailyRing();
      };
      monthNav.appendChild(btn);
    });
  };


  /* =========================
     DAILY RING
  ========================= */
  /* tracks if we already celebrated today so we don't repeat on every render */
  // Persist perfect-day flag per date — prevents re-triggering on navigation back
  const _PERF_KEY = "habitPerfectShown";
  const _todayPerfKey = () => { const t=new Date(); return t.getFullYear()+"-"+String(t.getMonth()+1).padStart(2,"0")+"-"+String(t.getDate()).padStart(2,"0"); };
  let perfectDayCelebrated = (localStorage.getItem(_PERF_KEY) === _todayPerfKey());

  const updateDailyRing = () => {
    const percent = calculateTodayCompletion();
    const circle  = document.querySelector(".ring-progress");
    const text    = document.getElementById("todayPercent");
    const ringEl  = document.querySelector(".daily-ring");
    if (!circle || !text) return;

    const circumference = 314;
    circle.style.strokeDashoffset = circumference - (percent / 100) * circumference;
    text.textContent = percent + "%";

    // Perfect Day — only on current month, only when 100%
    const isCurrentMonth = currentYear === TODAY_YEAR && currentMonth === TODAY_MONTH;
    if (isCurrentMonth && percent === 100) {
      ringEl?.classList.add("perfect-ring");
      if (!perfectDayCelebrated) {
        perfectDayCelebrated = true;
        localStorage.setItem(_PERF_KEY, _todayPerfKey());
        sessionStorage.removeItem("perfectDayUnmarked"); // clear unmark flag
        showPerfectDayToast();
        launchConfetti();
        playSound("perfect");
      }
    } else {
      ringEl?.classList.remove("perfect-ring");
      // If they had a perfect day and then unmarked a habit,
      // allow one more celebration if they re-mark it
      if (perfectDayCelebrated && percent < 100) {
        sessionStorage.setItem("perfectDayUnmarked", "1");
        perfectDayCelebrated = false;
        // Don't clear localStorage — only allow one re-fire per unmark cycle
      }
    }
  };

  /* =========================
     TOAST STACK (shared queue)
  ========================= */
  // Sequential toast queue — no pile-up, no overlap
  const _toastQueue  = [];
  let   _toastActive = false;

  const _nextToast = () => {
    if (_toastActive || !_toastQueue.length) return;
    _toastActive = true;
    const { el, duration } = _toastQueue.shift();
    const stack = document.getElementById("toastStack");
    if (!stack) { _toastActive = false; return; }
    stack.appendChild(el);
    requestAnimationFrame(() => el.classList.add("toast-show"));
    setTimeout(() => {
      el.classList.remove("toast-show");
      setTimeout(() => { el.remove(); _toastActive = false; _nextToast(); }, 380);
    }, Math.max(duration, 3000)); // minimum 3s so user can read it
  };

  const pushToast = (el, duration = 3500) => {
    if (el.id && (_toastQueue.some(t => t.el.id === el.id) || document.getElementById(el.id))) return;
    if (_toastQueue.length >= 5) return; // cap to prevent huge backlog
    _toastQueue.push({ el, duration });
    _nextToast();
  };

  /* =========================
     PERFECT DAY TOAST
  ========================= */
  const showPerfectDayToast = () => {
    document.getElementById("perfectToast")?.remove();
    const toast = document.createElement("div");
    toast.id        = "perfectToast";
    toast.className = "perfect-toast";
    toast.innerHTML = `<span class="toast-icon">⭐</span>
      <div>
        <strong>✨ PERFECT DAY — Byte is absolutely feral right now!</strong>
        <div class="toast-sub">All habits done! Byte is going absolutely feral rn. 🎉</div>
      </div>`;
    pushToast(toast, 5000);
  };

  /* =========================
     CONFETTI BURST
  ========================= */
  const launchConfetti = () => {
    const canvas  = document.createElement("canvas");
    canvas.id     = "confettiCanvas";
    canvas.style.cssText =
      "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:99999;";
    document.body.appendChild(canvas);

    const ctx    = canvas.getContext("2d");
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const COLORS  = ["#4ade80","#facc15","#f87171","#60a5fa","#c084fc","#fb923c"];
    const pieces  = Array.from({ length: 120 }, () => ({
      x:    Math.random() * canvas.width,
      y:    Math.random() * -canvas.height * 0.5,
      vx:   (Math.random() - 0.5) * 4,
      vy:   Math.random() * 3 + 2,
      rot:  Math.random() * 360,
      vr:   (Math.random() - 0.5) * 8,
      w:    Math.random() * 10 + 6,
      h:    Math.random() * 5 + 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: 1
    }));

    let frame;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      pieces.forEach(p => {
        p.x   += p.vx;
        p.y   += p.vy;
        p.vy  += 0.08; // gravity
        p.rot += p.vr;
        if (p.y > canvas.height * 0.8) p.alpha -= 0.025;

        if (p.alpha > 0) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle   = p.color;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot * Math.PI / 180);
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
      });

      if (alive) {
        frame = requestAnimationFrame(draw);
      } else {
        canvas.remove();
      }
    };

    frame = requestAnimationFrame(draw);
    // Safety cleanup after 6s
    setTimeout(() => { cancelAnimationFrame(frame); canvas.remove(); }, 6000);
  };




  /* =========================
   GRAPH (MONTHLY PROGRESS)
========================= */
/* =========================
     GRAPH COLORS (theme-aware)
  ========================= */
  const getGraphColors = () => {
    const s = getComputedStyle(document.body);
    const get = v => s.getPropertyValue(v).trim();
    return {
      done:     get("--done")        || "#4CAF50",
      failed:   get("--missed")      || "#E53935",
      unmarked: get("--unmarked")    || "#9E9E9E",
      primary:  get("--primary")     || "#4CAF50",
      border:   get("--border-soft") || "#333",
      text:     get("--text-muted")  || "#aaa"
    };
  };

  /* =========================
     GRAPH STATE
  ========================= */
  let previousGraphData = null;
  let animationId       = null;
  let slideAnimId       = null;
  let todayLineOpacity  = 1;
  let lastMonth         = currentMonth;

  /* =========================
     MATH HELPERS
  ========================= */
  const lerp = (a, b, t) => a + (b - a) * t;
  const interpolate = (from, to, t) => {
    const len = Math.max(from.length, to.length);
    return Array.from({ length: len }, (_, i) => {
      const a = from[i] ?? from.at(-1) ?? 0;
      const b = to[i]   ?? to.at(-1)   ?? 0;
      return lerp(a, b, t);
    });
  };

  /* =========================
     CALCULATE STATS
  ========================= */
  const calculateDailyStats = () => {
    const month = ensureMonth();
    const days  = daysInMonth(currentYear, currentMonth);
    const total = month.tasks.length;
    const done = [], failed = [], unmarked = [];

    const todayIndex =
      currentYear === TODAY_YEAR && currentMonth === TODAY_MONTH
        ? TODAY_DAY - 1 : -1;

    for (let d = 0; d < days; d++) {
      let dc = 0, fc = 0, uc = 0;
      month.tasks.forEach(task => {
        const s = task.days[d];
        if (s === "done") dc++;
        else if (s === "failed") fc++;
        else uc++;
      });
      done.push(total ? Math.round((dc / total) * 100) : 0);
      failed.push(total ? Math.round((fc / total) * 100) : 0);
      unmarked.push(
        total && (todayIndex === -1 || d <= todayIndex)
          ? Math.round((uc / total) * 100) : 0
      );
    }
    return { done, failed, unmarked };
  };

  /* =========================
     DRAW ONE FRAME
  ========================= */
  const drawGraph = (lines, slideX = 0, todayOpacity = 1) => {
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();
    ctx.translate(slideX, 0);

    const pad = 40;
    const w   = W - pad * 2;
    const h   = H - pad * 2;
    const COLORS = getGraphColors();

    // Axes
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, pad);
    ctx.lineTo(pad, pad + h);
    ctx.lineTo(pad + w, pad + h);
    ctx.stroke();

    // Y-axis grid + labels
    ctx.font = "10px system-ui";
    ctx.textAlign = "right";
    [0, 50, 100].forEach(v => {
      const yp = pad + h - (v / 100) * h;
      ctx.fillStyle = COLORS.text;
      ctx.fillText(v + "%", pad - 6, yp + 3);
      ctx.save();
      ctx.strokeStyle = COLORS.border + "55";
      ctx.lineWidth = 0.5;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(pad, yp);
      ctx.lineTo(pad + w, yp);
      ctx.stroke();
      ctx.restore();
    });

    const xPos = (i, len) => pad + (len <= 1 ? 0 : (i / (len - 1)) * w);
    const yPos = v => pad + h - (v / 100) * h;

    // TODAY LINE — fades when switching months
    if (currentYear === TODAY_YEAR && currentMonth === TODAY_MONTH) {
      const ti = TODAY_DAY - 1;
      if (ti >= 0 && ti < lines.done.length && todayOpacity > 0.01) {
        ctx.save();
        ctx.globalAlpha = todayOpacity;
        ctx.strokeStyle = COLORS.primary;
        ctx.lineWidth   = 1.5;
        ctx.setLineDash([5, 5]);
        const tx = xPos(ti, lines.done.length);
        ctx.beginPath();
        ctx.moveTo(tx, pad);
        ctx.lineTo(tx, pad + h);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font      = "bold 9px system-ui";
        ctx.fillStyle = COLORS.primary;
        ctx.textAlign = "center";
        ctx.fillText("TODAY", tx, pad - 4);
        ctx.restore();
      }
    }

    // Done area fill
    const grad = ctx.createLinearGradient(0, pad, 0, pad + h);
    grad.addColorStop(0, COLORS.done + "44");
    grad.addColorStop(1, COLORS.done + "04");
    ctx.beginPath();
    lines.done.forEach((v, i) =>
      i ? ctx.lineTo(xPos(i, lines.done.length), yPos(v))
        : ctx.moveTo(xPos(i, lines.done.length), yPos(v))
    );
    ctx.lineTo(pad + w, pad + h);
    ctx.lineTo(pad, pad + h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Lines
    const drawLine = (data, color, dash = []) => {
      if (!data.length) return;
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth   = 2.5;
      ctx.lineJoin    = "round";
      ctx.setLineDash(dash);
      data.forEach((v, i) =>
        i ? ctx.lineTo(xPos(i, data.length), yPos(v))
          : ctx.moveTo(xPos(i, data.length), yPos(v))
      );
      ctx.stroke();
      ctx.restore();
    };

    drawLine(lines.done,     COLORS.done);
    drawLine(lines.failed,   COLORS.failed,   [4, 3]);
    drawLine(lines.unmarked, COLORS.unmarked, [2, 4]);

    // ── WEEKLY AVERAGE OVERLAY ──────────────────────────────────
    // Compute avg completion per week, draw as a stepped line + shaded band
    if (lines.done.length > 0) {
      const totalDays = lines.done.length;
      const firstDate = new Date(currentYear, currentMonth, 1);
      const firstDow  = firstDate.getDay(); // 0=Sun
      // offset to Monday-start: Mon=0 … Sun=6
      const startOff  = firstDow === 0 ? 6 : firstDow - 1;

      // Group day indices into Mon-start weeks
      const weeks = [];
      let week    = [];
      for (let d = 0; d < totalDays; d++) {
        week.push(d);
        const dow = new Date(currentYear, currentMonth, d + 1).getDay();
        if (dow === 0) { weeks.push(week); week = []; } // Sunday closes week
      }
      if (week.length) weeks.push(week);

      // Build stepped data: one avg value per day, held flat across the week
      const weekAvgLine = new Array(totalDays).fill(null);

      weeks.forEach(wk => {
        // Only average days that have passed (isPast or isToday)
        const limit = currentYear === TODAY_YEAR && currentMonth === TODAY_MONTH
          ? TODAY_DAY - 1 : totalDays - 1;

        const pastDays = wk.filter(d => d <= limit);
        if (!pastDays.length) return;

        const avg = Math.round(
          pastDays.reduce((sum, d) => sum + lines.done[d], 0) / pastDays.length
        );
        wk.forEach(d => { weekAvgLine[d] = avg; });
      });

      // Draw shaded band between weekly avg and 0
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.fillStyle   = COLORS.primary;
      ctx.beginPath();
      let started = false;
      weekAvgLine.forEach((v, i) => {
        if (v === null) return;
        const x = xPos(i, totalDays);
        const y = yPos(v);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      });
      // close down to baseline
      for (let i = totalDays - 1; i >= 0; i--) {
        if (weekAvgLine[i] === null) continue;
        ctx.lineTo(xPos(i, totalDays), pad + h);
        break;
      }
      ctx.lineTo(xPos(weekAvgLine.findIndex(v => v !== null), totalDays), pad + h);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Draw stepped avg line
      ctx.save();
      ctx.globalAlpha  = 0.75;
      ctx.strokeStyle  = COLORS.primary;
      ctx.lineWidth    = 1.5;
      ctx.setLineDash([6, 3]);
      ctx.lineJoin     = "round";
      ctx.beginPath();

      let prevX = null, prevY = null;
      weekAvgLine.forEach((v, i) => {
        if (v === null) return;
        const x = xPos(i, totalDays);
        const y = yPos(v);
        if (prevX === null) {
          ctx.moveTo(x, y);
        } else if (y !== prevY) {
          // Step: go horizontal first, then vertical
          ctx.lineTo(x, prevY);
          ctx.lineTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        prevX = x; prevY = y;
      });
      // Extend to end of last week
      if (prevX !== null) ctx.lineTo(pad + w, prevY);
      ctx.stroke();
      ctx.restore();

      // Label each week segment with its avg %
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.font        = "bold 9px system-ui";
      ctx.textAlign   = "center";
      weeks.forEach(wk => {
        const midDay = wk[Math.floor(wk.length / 2)];
        const avg    = weekAvgLine[midDay];
        if (avg === null) return;
        const x = xPos(midDay, totalDays);
        const y = yPos(avg) - 8;
        ctx.fillStyle = COLORS.primary;
        ctx.fillText(avg + "%", x, Math.max(pad + 8, y));
      });
      ctx.restore();
    }
    // ── END WEEKLY AVERAGE OVERLAY ──────────────────────────────

    ctx.restore();
  };

  /* =========================
     SMOOTH LINE INTERPOLATION
  ========================= */
  const animateLines = (newData) => {
    if (!previousGraphData) {
      previousGraphData = newData;
      drawGraph(newData, 0, todayLineOpacity);
      return;
    }
    const start    = performance.now();
    const duration = 420;
    cancelAnimationFrame(animationId);
    const from = previousGraphData;

    const frame = (now) => {
      const t    = Math.min((now - start) / duration, 1);
      const ease = t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2;

      drawGraph({
        done:     interpolate(from.done,     newData.done,     ease),
        failed:   interpolate(from.failed,   newData.failed,   ease),
        unmarked: interpolate(from.unmarked, newData.unmarked, ease),
      }, 0, todayLineOpacity);

      if (t < 1) {
        animationId = requestAnimationFrame(frame);
      } else {
        previousGraphData = newData;
      }
    };
    animationId = requestAnimationFrame(frame);
  };

  /* =========================
     SLIDE TRANSITION
  ========================= */
  const slideToMonth = (newMonth) => {
    cancelAnimationFrame(slideAnimId);
    cancelAnimationFrame(animationId);

    const direction = newMonth > lastMonth ? 1 : -1;
    lastMonth = newMonth;

    const W        = canvas.clientWidth;
    const oldData  = previousGraphData || calculateDailyStats();
    const duration = 380;
    const start    = performance.now();

    // Switch state so new data is for the new month
    currentMonth      = newMonth;
    const newData     = calculateDailyStats();
    previousGraphData = newData;

    const frame = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const ease     = 1 - Math.pow(1 - progress, 3); // easeOutCubic

      const outX = direction * W * ease;
      const inX  = -direction * W + direction * W * ease;

      // Today line: fade out → fade in across the transition
      todayLineOpacity = progress < 0.5
        ? 1 - progress * 2
        : (progress - 0.5) * 2;

      // Draw outgoing (old) content
      drawGraph(oldData, outX, 1 - todayLineOpacity);
      // Draw incoming (new) content — rendered on top by same ctx
      drawGraph(newData, inX, todayLineOpacity);

      if (progress < 1) {
        slideAnimId = requestAnimationFrame(frame);
      } else {
        todayLineOpacity = 1;
        drawGraph(newData, 0, 1);
      }
    };
    slideAnimId = requestAnimationFrame(frame);
  };

  /* =========================
     MAIN GRAPH ENTRY POINT
  ========================= */
  const animateGraph = (newData) => animateLines(newData);


  /* =========================
     MAIN RENDER
  ========================= */
  /* =========================
     YEARLY HEAT MAP
  ========================= */
  let heatmapYear = TODAY_YEAR;

  const getHeatmapData = (year) => {
    // Build a map: "YYYY-MM-DD" → { done, total, pct }
    const map = {};
    const months = Object.keys(data).filter(k => k.match(/^\d{4}-\d{2}$/) && k.startsWith(String(year)));

    months.forEach(mk => {
      const [y, m] = mk.split("-").map(Number);
      const month  = data[mk];
      if (!month?.tasks?.length) return;
      const days   = new Date(y, m, 0).getDate();

      for (let d = 1; d <= days; d++) {
        const idx    = d - 1;
        const active = month.tasks.filter(t => t.days[idx] !== "locked");
        if (!active.length) continue;
        const done   = active.filter(t => t.days[idx] === "done").length;
        const key    = `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
        map[key]     = { done, total: active.length, pct: Math.round((done / active.length) * 100) };
      }
    });

    return map;
  };

  const getHeatLevel = (entry, isFuture) => {
    if (isFuture)        return "hm-future";
    if (!entry)          return "hm-level0";
    if (entry.pct === 0) return "hm-level0";
    if (entry.total > 0 && entry.done === entry.total) return "hm-perfect";
    if (entry.pct >= 75) return "hm-level4";
    if (entry.pct >= 50) return "hm-level3";
    if (entry.pct >= 25) return "hm-level2";
    return "hm-level1";
  };

  const renderHeatmap = () => {
    const section = document.getElementById("heatmapSection");
    if (!section) return;

    const year    = heatmapYear;
    const hmap    = getHeatmapData(year);
    const today   = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

    // Compute year stats
    let totalDone = 0, totalPossible = 0, perfectDays = 0, activeDays = 0;
    Object.values(hmap).forEach(e => {
      totalDone      += e.done;
      totalPossible  += e.total;
      activeDays++;
      if (e.done === e.total && e.total > 0) perfectDays++;
    });
    const yearPct = totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0;

    // Build week columns: Jan 1 → Dec 31, Mon-start
    const jan1    = new Date(year, 0, 1);
    const dow1    = jan1.getDay() === 0 ? 6 : jan1.getDay() - 1; // Mon=0
    const dec31   = new Date(year, 11, 31);
    const totalWeeks = Math.ceil((dow1 + 365 + (new Date(year, 1, 29).getMonth() === 1 ? 1 : 0)) / 7);

    const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const DOW_LABELS  = ["Mon","","Wed","","Fri","","Sun"];

    // Generate columns
    const cols = [];
    let cursor = new Date(year, 0, 1);
    cursor.setDate(cursor.getDate() - dow1); // rewind to Monday of first week

    for (let w = 0; w < 54; w++) {
      const col = { monthLabel: "", cells: [] };
      // Show month label when Monday of this week is the first Mon of that month
      const monDate = new Date(cursor);
      if (monDate.getDate() <= 7 && monDate.getFullYear() === year) {
        col.monthLabel = MONTH_NAMES[monDate.getMonth()];
      }

      for (let d = 0; d < 7; d++) {
        const dt   = new Date(cursor);
        dt.setDate(cursor.getDate() + d);
        const inYear  = dt.getFullYear() === year;
        const dateStr = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
        const entry   = hmap[dateStr];
        const isFuture = dateStr > todayStr;
        const isToday  = dateStr === todayStr;
        const level    = inYear ? getHeatLevel(entry, isFuture) : "hm-empty";

        let tip = "";
        if (!inYear)       tip = "";
        else if (isFuture) tip = dt.toLocaleDateString("en", {month:"short",day:"numeric"});
        else if (entry)    tip = `${dt.toLocaleDateString("en",{month:"short",day:"numeric"})} · ${entry.done}/${entry.total} (${entry.pct}%)`;
        else               tip = `${dt.toLocaleDateString("en",{month:"short",day:"numeric"})} · No data`;

        col.cells.push({ dateStr, inYear, level, isToday, tip, isFuture, entry,
          month: dt.getMonth(), day: dt.getDate() });
      }

      cols.push(col);
      cursor.setDate(cursor.getDate() + 7);
      if (cursor.getFullYear() > year && cursor.getMonth() > 0) break;
    }

    // Render
    const dowHTML = DOW_LABELS.map(l =>
      `<div class="heatmap-dow">${l}</div>`).join("");

    const colsHTML = cols.map(col => `
      <div class="heatmap-col">
        <div class="heatmap-month-label">${col.monthLabel}</div>
        ${col.cells.map(c => `
          <div class="heatmap-cell ${c.level} ${c.isToday ? "hm-today" : ""}"
               data-tip="${c.tip}"
               data-month="${c.month}"
               data-year="${year}"
               onclick="window._heatmapClick(${c.month}, ${year}, ${c.inYear && !c.isFuture ? 1 : 0})">
          </div>`).join("")}
      </div>`).join("");

    section.innerHTML = `
      <div class="heatmap-header">
        <div class="heatmap-title">📅 Year in Review</div>
        <div class="heatmap-year-nav">
          <button class="heatmap-year-btn" onclick="window._heatmapPrevYear()">‹</button>
          <span class="heatmap-year-label">${year}</span>
          <button class="heatmap-year-btn" onclick="window._heatmapNextYear()" ${year >= TODAY_YEAR ? 'disabled aria-disabled="true" style="opacity:0.3;cursor:default;pointer-events:none"' : ''}>›</button>
        </div>
      </div>

      <div class="heatmap-stats-row">
        <div class="heatmap-stat">
          <label>Completion</label>
          <strong style="color:var(--done,#4ade80)">${yearPct}%</strong>
        </div>
        <div class="heatmap-stat">
          <label>Active Days</label>
          <strong>${activeDays}</strong>
        </div>
        <div class="heatmap-stat">
          <label>Perfect Days</label>
          <strong style="color:#facc15">${perfectDays} ⭐</strong>
        </div>
        <div class="heatmap-stat">
          <label>Habits Done</label>
          <strong>${totalDone.toLocaleString()}</strong>
        </div>
      </div>

      <div class="heatmap-scroll">
        <div class="heatmap-grid-wrap">
          <div class="heatmap-dow-labels">${dowHTML}</div>
          <div class="heatmap-columns">${colsHTML}</div>
        </div>
      </div>

      <div class="heatmap-legend">
        Less
        <div class="hm-legend-cell heatmap-cell hm-level0"></div>
        <div class="hm-legend-cell heatmap-cell hm-level1"></div>
        <div class="hm-legend-cell heatmap-cell hm-level2"></div>
        <div class="hm-legend-cell heatmap-cell hm-level3"></div>
        <div class="hm-legend-cell heatmap-cell hm-level4"></div>
        <div class="hm-legend-cell heatmap-cell hm-perfect"></div>
        More / Perfect
      </div>`;

    // Wire navigation and click-to-jump
    window._heatmapPrevYear = () => { heatmapYear--; renderHeatmap(); };
    window._heatmapNextYear = () => { if (heatmapYear < TODAY_YEAR) { heatmapYear++; renderHeatmap(); } };
    window._heatmapClick    = (month, yr, navigable) => {
      if (!navigable) return;
      currentYear  = yr;
      currentMonth = month;
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
  };

  /* =========================
     1. HABIT STRENGTH SCORE
  ========================= */
  const getHabitStrength = (task) => {
    // Look at last 7 active days for this task
    const month = ensureMonth();
    const days  = daysInMonth(currentYear, currentMonth);
    const limit = Math.min(TODAY_DAY - 1, days);
    let done = 0, failed = 0, total = 0;

    for (let d = limit - 1; d >= Math.max(0, limit - 7); d--) {
      if (task.days[d] === "locked") continue;
      total++;
      if (task.days[d] === "done")   done++;
      if (task.days[d] === "failed") failed++;
    }

    if (total < 2) return null; // not enough data

    const pct = total > 0 ? done / total : 0;
    if (pct >= 0.8)           return { label: "Strong",  cls: "strength-strong",  tip: `${done}/${total} days done recently` };
    if (pct >= 0.5)           return { label: "Fragile", cls: "strength-fragile", tip: `${done}/${total} days done — keep pushing` };
    return                           { label: "At Risk", cls: "strength-at-risk",  tip: `Only ${done}/${total} days done — needs attention!` };
  };


  /* =========================
     MOOD TRACKER
  ========================= */
  const MOODS = [
    { val:5, emoji:"🤩", label:"Amazing",  color:"#4ade80" },
    { val:4, emoji:"😊", label:"Good",     color:"#a3e635" },
    { val:3, emoji:"😐", label:"Okay",     color:"#facc15" },
    { val:2, emoji:"😔", label:"Low",      color:"#fb923c" },
    { val:1, emoji:"😫", label:"Rough",    color:"#f87171" },
  ];

  const ensureMoodData = () => { if (!data.moods) data.moods = {}; return data.moods; };

  const getTodayMood = () => {
    const tk = todayKey();
    return ensureMoodData()[tk] || null;
  };

  const setTodayMood = (val, note="") => {
    const tk = todayKey();
    ensureMoodData()[tk] = { val, note, ts: Date.now() };
    saveData();
    renderMoodWidget();
  };

  const MOOD_DISMISSED_KEY = "moodDismissed";

  const getMoodDismissedToday = () =>
    localStorage.getItem(MOOD_DISMISSED_KEY) === todayKey();

  const setMoodDismissedToday = () =>
    localStorage.setItem(MOOD_DISMISSED_KEY, todayKey());

  const renderMoodWidget = () => {
    // The inline widget div is no longer used — mood is popup-only.
    // Just hide it if it exists.
    const el = document.getElementById("moodWidget");
    if (el) el.style.display = "none";
  };

  const showMoodPopup = () => {
    // Only show if: on current month, mood not yet logged today, not dismissed today
    if (currentYear !== TODAY_YEAR || currentMonth !== TODAY_MONTH) return;
    if (getTodayMood()) return;
    if (getMoodDismissedToday()) return;

    // Don't stack duplicates
    if (document.getElementById("moodPopupOverlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "moodPopupOverlay";
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:99990;
      display:flex;align-items:flex-end;justify-content:center;
      background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);
      animation:moodFadeIn 0.25s ease;`;

    overlay.innerHTML = `
      <div id="moodPopupCard" style="
        background:var(--bg-panel,#121220);
        border:1px solid rgba(255,255,255,0.1);
        border-radius:22px 22px 0 0;
        padding:22px 20px 30px;
        width:min(480px,100%);
        animation:moodSlideUp 0.35s cubic-bezier(0.34,1.2,0.64,1);">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <div style="font-size:0.78rem;font-weight:800;color:var(--text-muted,#9aa4b2);text-transform:uppercase;letter-spacing:0.08em">How are you feeling today?</div>
          <button onclick="window._dismissMoodPopup()" style="
            background:none;border:none;color:var(--text-muted,#9aa4b2);
            font-size:1rem;cursor:pointer;padding:2px 6px;border-radius:6px;">✕</button>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:4px;" id="moodPopupBtns">
          ${MOODS.map(m => `
            <button onclick="window._pickMoodPopup(${m.val})" title="${m.label}" style="
              flex:1;background:var(--bg-card,#1a1a2e);border:1px solid rgba(255,255,255,0.08);
              border-radius:14px;padding:10px 4px;cursor:pointer;transition:all 0.15s;
              display:flex;flex-direction:column;align-items:center;gap:4px;">
              <span style="font-size:1.6rem">${m.emoji}</span>
              <span style="font-size:0.6rem;color:var(--text-muted,#9aa4b2);font-weight:700">${m.label}</span>
            </button>`).join("")}
        </div>
      </div>`;

    // Tap outside to dismiss
    overlay.addEventListener("click", e => {
      if (e.target === overlay) window._dismissMoodPopup();
    });

    document.body.appendChild(overlay);
  };

  window._dismissMoodPopup = () => {
    setMoodDismissedToday();
    const overlay = document.getElementById("moodPopupOverlay");
    if (overlay) {
      overlay.style.animation = "moodFadeOut 0.2s ease forwards";
      setTimeout(() => overlay.remove(), 200);
    }
  };

  window._pickMoodPopup = (val) => {
    const card = document.getElementById("moodPopupCard");
    if (!card) return;
    const m = MOODS.find(x => x.val === val);
    card.innerHTML = `
      <div style="text-align:center;margin-bottom:14px">
        <div style="font-size:2rem;margin-bottom:4px">${m.emoji}</div>
        <div style="font-size:0.9rem;font-weight:800;color:${m.color}">${m.label}</div>
      </div>
      <input id="moodPopupNote" style="
        width:100%;background:var(--bg-card,#1a1a2e);
        border:1px solid rgba(255,255,255,0.1);border-radius:10px;
        color:var(--text,#f0f0f8);font-size:0.85rem;padding:10px 12px;
        outline:none;font-family:inherit;margin-bottom:12px;"
        placeholder="Add a note… (optional)" maxlength="120"
        onkeydown="if(event.key==='Enter') window._saveMoodPopup(${val})">
      <div style="display:flex;gap:8px">
        <button onclick="window._saveMoodPopup(${val})" style="
          flex:1;background:${m.color};color:#000;border:none;
          border-radius:10px;padding:10px;font-weight:800;font-size:0.88rem;cursor:pointer;">
          Save ✓
        </button>
        <button onclick="window._dismissMoodPopup()" style="
          background:var(--bg-card,#1a1a2e);color:var(--text-muted,#9aa4b2);
          border:1px solid rgba(255,255,255,0.1);border-radius:10px;
          padding:10px 14px;font-weight:600;font-size:0.85rem;cursor:pointer;">
          Skip
        </button>
      </div>`;
    document.getElementById("moodPopupNote")?.focus();
  };

  window._saveMoodPopup = (val) => {
    const note = document.getElementById("moodPopupNote")?.value?.trim() || "";
    setTodayMood(val, note);
    playSound("done");
    // Dismiss popup with a success flash
    const card = document.getElementById("moodPopupCard");
    if (card) {
      const m = MOODS.find(x => x.val === val);
      card.innerHTML = `
        <div style="text-align:center;padding:8px 0">
          <div style="font-size:2.2rem;margin-bottom:6px">${m.emoji}</div>
          <div style="font-size:0.88rem;font-weight:800;color:${m.color}">Mood logged!</div>
        </div>`;
      setTimeout(() => window._dismissMoodPopup(), 900);
    }
    pushToast(buildSimpleToast(MOODS.find(m=>m.val===val).emoji, "Mood logged!", "var(--done,#4ade80)"), 2000);
  };

  window._resetMood = () => {
    delete ensureMoodData()[todayKey()];
    localStorage.removeItem(MOOD_DISMISSED_KEY);
    saveData();
    showMoodPopup();
  };


  /* =========================
     PER-HABIT STREAK FREEZE
  ========================= */
  const FREEZE_COST = 30; // gems per freeze

  const buyHabitFreeze = (taskId) => {
    if (window.HabitPremium && !window.HabitPremium.isPremium()) {
      window.HabitPremium.showUpgradeWall("freezes");
      return;
    }
    if (getGems() < FREEZE_COST) {
      pushToast(buildSimpleToast("❌", `Need ${FREEZE_COST} 💎 to freeze`, "var(--missed,#f87171)"), 2500);
      return;
    }
    const month = ensureMonth();
    const task  = month.tasks.find(t => t.id === taskId);
    if (!task) return;
    if (!task.freezes) task.freezes = [];
    const tk = todayKey();
    if (task.freezes.includes(tk)) {
      pushToast(buildSimpleToast("❄️", "Already frozen today", "var(--text-muted)"), 2000);
      return;
    }
    // Deduct gems
    ensureGems().total -= FREEZE_COST;
    renderGems();
    task.freezes.push(tk);
    saveData();
    renderGrid();
    playSound("gem");
    pushToast(buildSimpleToast("❄️", `${task.name} streak frozen! (-${FREEZE_COST}💎)`, "#7dd3fc"), 3000);
  };

  window._buyHabitFreeze = buyHabitFreeze;

  const isHabitFrozenToday = (task) => {
    if (!task.freezes) return false;
    return task.freezes.includes(todayKey());
  };


  /* =========================
     ADAPTIVE COACH
  ========================= */
  const getCoachInsight = () => {
    const month  = ensureMonth();
    const tasks  = month.tasks;
    if (!tasks.length || TODAY_DAY < 3) return null;

    const insights = [];

    // Per-habit analysis
    tasks.forEach(task => {
      const frozen   = isHabitFrozenToday(task);
      const strength = getHabitStrength(task);
      if (!strength) return;
      const limit  = Math.min(TODAY_DAY - 1, 7);
      const recent = task.days.slice(Math.max(0, TODAY_DAY - 1 - limit), TODAY_DAY - 1);
      const fails  = recent.filter(d => d === "failed").length;
      const done   = recent.filter(d => d === "done").length;

      if (fails >= 4) {
        insights.push({
          icon:"🤔", priority:3,
          msg: `"${task.name}" failed ${fails}x recently. Consider making it easier or splitting it.`,
          action: "💡 Scale back"
        });
      } else if (done === limit && limit >= 5) {
        insights.push({
          icon:"🔥", priority:1,
          msg: `"${task.name}" is on a perfect run! Maybe add a harder version?`,
          action: "⬆️ Level up"
        });
      } else if (strength.label === "At Risk") {
        insights.push({
          icon:"⚠️", priority:2,
          msg: `"${task.name}" is at risk — only ${done}/${limit} days completed recently.`,
          action: "❄️ Freeze streak",
          actionType: "freeze",
          taskId: task.id
        });
      }
    });

    // Overall completion coaching
    let totalDone = 0, totalActive = 0;
    for (let d = 0; d < TODAY_DAY - 1; d++) {
      const active = tasks.filter(t => t.days[d] !== "locked");
      totalActive += active.length;
      totalDone   += active.filter(t => t.days[d] === "done").length;
    }
    const overallPct = totalActive > 0 ? Math.round(totalDone / totalActive * 100) : 0;

    if (overallPct >= 90 && tasks.length < 5) {
      insights.push({ icon:"🚀", priority:1, msg:`${overallPct}% completion — you're ready to add more habits!`, action: null });
    }

    if (!insights.length) {
      if (overallPct >= 70) return { icon:"✅", msg:"Looking great — keep the momentum!", action: null };
      return null;
    }

    // Return highest priority insight
    insights.sort((a,b) => b.priority - a.priority);
    return insights[0];
  };

  const renderCoachPanel = () => {
    const el = document.getElementById("coachPanel");
    if (!el) return;
    const insight = getCoachInsight();
    if (!insight) { el.innerHTML = ""; return; }
    el.innerHTML = `
      <div class="coach-card" id="coachCard">
        <div class="coach-icon">${insight.icon}</div>
        <div class="coach-body">
          <div class="coach-msg">${insight.msg}</div>
          ${insight.action ? `<button class="coach-action" onclick="${
            insight.actionType === 'freeze' && insight.taskId
              ? `window._buyHabitFreeze('${insight.taskId}')`
              : ''
          }">${insight.action}</button>` : ""}
        </div>
        <button class="coach-dismiss" onclick="this.closest('#coachCard').style.display='none'">✕</button>
      </div>`;
  };


  /* =========================
     SEASONAL EVENTS
  ========================= */
  const SEASONS = [
    { id:"new_year",    name:"New Year Sprint",   emoji:"🎆", months:[0],      days:[1,14],  color:"#facc15", bonus:2.0, badge:"🎆 New Year Starter",  xp:100 },
    { id:"valentine",   name:"Love Your Habits",  emoji:"💝", months:[1],      days:[10,16], color:"#f43f5e", bonus:1.5, badge:"💝 Valentine Grinder",  xp:50  },
    { id:"spring",      name:"Spring Reset",      emoji:"🌸", months:[2,3,4],  days:null,    color:"#a3e635", bonus:1.3, badge:"🌸 Spring Cleaner",     xp:75  },
    { id:"summer",      name:"Summer Grind",      emoji:"☀️", months:[5,6,7],  days:null,    color:"#fb923c", bonus:1.5, badge:"☀️ Summer Warrior",     xp:75  },
    { id:"halloween",   name:"Spooky Streak",     emoji:"🎃", months:[9],      days:[24,31], color:"#f97316", bonus:2.0, badge:"🎃 Spooky Grinder",     xp:100 },
    { id:"christmas",   name:"Holiday Hustle",    emoji:"🎄", months:[11],     days:[20,26], color:"#4ade80", bonus:2.0, badge:"🎄 Holiday Hero",        xp:100 },
    { id:"new_year_eve",name:"Year End Push",     emoji:"🥂", months:[11],     days:[28,31], color:"#818cf8", bonus:2.5, badge:"🥂 Year Finisher",       xp:150 },
  ];

  const getActiveSeason = () => {
    const m = TODAY_MONTH, d = TODAY_DAY;
    return SEASONS.find(s => {
      if (!s.months.includes(m)) return false;
      if (!s.days) return true;
      return d >= s.days[0] && d <= s.days[1];
    }) || null;
  };

  const renderSeasonalBanner = () => {
    const el     = document.getElementById("seasonalBanner");
    if (!el) return;
    const season = getActiveSeason();
    if (!season) { el.style.display = "none"; return; }

    const claimed = data.seasonClaims?.[season.id];
    el.style.display = "block";
    el.style.background = `linear-gradient(135deg, ${season.color}22, ${season.color}11)`;
    el.style.borderColor = season.color + "44";
    el.innerHTML = `
      <div class="season-inner">
        <span class="season-emoji">${season.emoji}</span>
        <div class="season-info">
          <div class="season-name">${season.name}</div>
          <div class="season-desc">+${Math.round((season.bonus-1)*100)}% XP bonus active • ${season.badge}</div>
        </div>
        ${!claimed ? `<button class="season-claim-btn" style="border-color:${season.color};color:${season.color}" onclick="window._claimSeason('${season.id}')">Claim ${season.xp}XP</button>` : `<span class="season-claimed">✓ Claimed</span>`}
      </div>`;
  };

  window._claimSeason = (id) => {
    const season = SEASONS.find(s => s.id === id);
    if (!season) return;
    if (!data.seasonClaims) data.seasonClaims = {};
    if (data.seasonClaims[id]) return; // already claimed — guard
    data.seasonClaims[id] = true;
    saveData();
    awardXP(season.xp, `${season.name} seasonal bonus`);
    renderSeasonalBanner();
    showBadgeUnlock({ icon: season.emoji, name: season.badge, desc: `Claimed during ${season.name}!`, color: season.color });
  };

  // Seasonal XP multiplier — applied when awarding XP for habits
  const getSeasonXPMultiplier = () => {
    const s = getActiveSeason();
    return s ? s.bonus : 1.0;
  };

  /* =========================
     2. SOUNDS
  ========================= */
  const updateSoundBtn = () => {}; // sound always on — no toggle

  /* ─── SOUND ENGINE v2 ─── */
  let _audioCtx = null;
  const getCtx = () => {
    if (!_audioCtx || _audioCtx.state === "closed") {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (_audioCtx.state === "suspended") _audioCtx.resume();
    return _audioCtx;
  };

  // Master compressor keeps everything even
  const getMaster = (ctx) => {
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value       = 12;
    comp.ratio.value      = 4;
    comp.attack.value     = 0.003;
    comp.release.value    = 0.15;
    comp.connect(ctx.destination);
    return comp;
  };

  const tone = (ctx, dest, freq, type, vol, startT, dur, fadeT = 0.08) => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type      = type;
    osc.frequency.setValueAtTime(freq, startT);
    gain.gain.setValueAtTime(0, startT);
    gain.gain.linearRampToValueAtTime(vol, startT + 0.01);
    gain.gain.setValueAtTime(vol, startT + dur - fadeT);
    gain.gain.exponentialRampToValueAtTime(0.0001, startT + dur);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(startT);
    osc.stop(startT + dur + 0.01);
  };

  // Noise burst (for snare-like hit)
  const noise = (ctx, dest, vol, startT, dur) => {
    const buf    = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src    = ctx.createBufferSource();
    const gain   = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type  = "bandpass";
    filter.frequency.value = 2400;
    filter.Q.value = 0.8;
    src.buffer = buf;
    gain.gain.setValueAtTime(vol, startT);
    gain.gain.exponentialRampToValueAtTime(0.0001, startT + dur);
    src.connect(filter); filter.connect(gain); gain.connect(dest);
    src.start(startT); src.stop(startT + dur + 0.01);
  };

  const playSound = (type) => {
    try {
      const ctx  = getCtx();
      const dest = getMaster(ctx);
      const now  = ctx.currentTime;

      switch(type) {

        case "done": {
          // Base chime
          tone(ctx, dest, 523.25, "sine", 0.14, now,        0.20);
          tone(ctx, dest, 783.99, "sine", 0.09, now + 0.06, 0.18);
          tone(ctx, dest, 1046.5, "sine", 0.05, now + 0.10, 0.14);
          break;
        }
        case "done_fitness": {
          // Punchy beat — low thud + rising tone
          noise(ctx, dest, 0.10, now, 0.06);
          tone(ctx, dest, 120, "sine",     0.18, now,        0.12);
          tone(ctx, dest, 392, "sawtooth", 0.08, now + 0.08, 0.14);
          tone(ctx, dest, 659, "sine",     0.10, now + 0.16, 0.18);
          break;
        }
        case "done_mindful": {
          // Soft singing bowl — slow attack, long decay
          tone(ctx, dest, 396, "sine", 0.10, now,        0.50);
          tone(ctx, dest, 528, "sine", 0.07, now + 0.08, 0.45);
          tone(ctx, dest, 639, "sine", 0.04, now + 0.14, 0.40);
          break;
        }
        case "done_learning": {
          // Bright ascending arp — knowledge unlocked
          const notes = [523.25, 659.26, 783.99, 1046.5];
          notes.forEach((f, i) => tone(ctx, dest, f, "sine", 0.11, now + i*0.06, 0.16));
          break;
        }
        case "done_productive": {
          // Crisp double-click — task complete
          noise(ctx, dest, 0.06, now,        0.04);
          noise(ctx, dest, 0.06, now + 0.08, 0.04);
          tone(ctx, dest, 880,  "sine", 0.09, now + 0.04, 0.12);
          tone(ctx, dest, 1108, "sine", 0.07, now + 0.10, 0.12);
          break;
        }
        case "done_health": {
          // Warm two-note lift
          tone(ctx, dest, 440, "sine", 0.12, now,        0.18);
          tone(ctx, dest, 660, "sine", 0.10, now + 0.10, 0.20);
          break;
        }

        case "fail": {
          // Low thud + descending tone — feels like a gentle error, not harsh
          tone(ctx, dest, 220, "sawtooth", 0.07, now,        0.18);
          tone(ctx, dest, 180, "sine",     0.10, now + 0.04, 0.22);
          noise(ctx, dest, 0.04, now, 0.12);
          break;
        }

        case "combo": {
          // Ascending sparkle arpeggio
          const notes = [523.25, 659.26, 783.99, 1046.5, 1318.5];
          notes.forEach((f, i) => {
            tone(ctx, dest, f,   "sine",    0.12, now + i * 0.07, 0.18);
            tone(ctx, dest, f*2, "sine",    0.03, now + i * 0.07, 0.12);
          });
          break;
        }

        case "levelup": {
          // Fanfare — major arpeggio + held chord
          const fanfare = [261.6, 329.6, 392, 523.25, 659.26, 783.99, 1046.5];
          fanfare.forEach((f, i) => {
            tone(ctx, dest, f, "sine", 0.13, now + i * 0.09, 0.25);
          });
          // Hold the top note with a shimmer
          tone(ctx, dest, 1046.5, "sine", 0.08, now + fanfare.length * 0.09, 0.6);
          tone(ctx, dest, 1318.5, "sine", 0.04, now + fanfare.length * 0.09, 0.5);
          // Noise hit at peak
          noise(ctx, dest, 0.06, now + 0.55, 0.15);
          break;
        }

        case "gem": {
          // Crystalline high ping
          tone(ctx, dest, 1568,   "sine", 0.10, now,        0.15);
          tone(ctx, dest, 2093.0, "sine", 0.06, now + 0.04, 0.14);
          tone(ctx, dest, 2637.0, "sine", 0.03, now + 0.07, 0.12);
          break;
        }

        case "undo": {
          // Reverse-feel descending notes
          tone(ctx, dest, 659.26, "sine", 0.09, now,        0.14);
          tone(ctx, dest, 523.25, "sine", 0.11, now + 0.08, 0.16);
          tone(ctx, dest, 392,    "sine", 0.07, now + 0.16, 0.14);
          break;
        }

        case "badge": {
          // Triumphant stab + roll
          noise(ctx, dest, 0.08, now, 0.08);
          const badge = [392, 523.25, 659.26, 783.99, 1046.5, 783.99, 1046.5, 1318.5];
          badge.forEach((f, i) => {
            tone(ctx, dest, f, "sine", 0.12, now + i * 0.07, 0.20);
          });
          break;
        }

        case "streak": {
          // Warm pulse — daily streak maintained
          tone(ctx, dest, 440, "sine", 0.10, now,        0.18);
          tone(ctx, dest, 554, "sine", 0.07, now + 0.10, 0.16);
          tone(ctx, dest, 659, "sine", 0.09, now + 0.18, 0.22);
          break;
        }

        case "perfect": {
          // Full chord bloom — perfect day
          const chord = [523.25, 659.26, 783.99, 1046.5];
          chord.forEach((f, i) => {
            tone(ctx, dest, f, "sine", 0.10 - i*0.01, now + i * 0.03, 0.8 - i * 0.1);
          });
          noise(ctx, dest, 0.05, now + 0.05, 0.1);
          // Shimmer fade
          tone(ctx, dest, 2093, "sine", 0.04, now + 0.2, 0.6);
          break;
        }
      }
    } catch(e) { /* AudioContext unavailable */ }
  };

  // Trigger haptic feedback on mobile where supported
  const haptic = (pattern = [10]) => {
    try { navigator.vibrate?.(pattern); } catch(e) {}
  };

  // Wrap playSound to also trigger haptic
  const _playSoundOrig = playSound;
  const playSoundWithHaptic = (type) => {
    _playSoundOrig(type);
    const patterns = {
      done:    [8],
      fail:    [20, 10, 20],
      combo:   [5, 5, 5, 5, 5],
      levelup: [10, 20, 10, 40],
      gem:     [6],
      badge:   [10, 10, 30],
      streak:  [8, 8, 8],
      perfect: [15, 10, 15, 30],
    };
    haptic(patterns[type] || [8]);
  };

  // Override playSound globally to include haptics
  // We redefine it below after this block — keep both names working
  const _playSound = playSoundWithHaptic;
  // Alias so all existing calls work
  Object.defineProperty(window, "_playSoundGlobal", { value: playSoundWithHaptic });
  // All playSound calls now include haptics
  const _soundProxy = playSoundWithHaptic;

  // Hook sounds into existing events
  const _origAwardXP = awardXP;

  /* =========================
     3. HABIT NOTES
  ========================= */
  let _noteContext = null; // { taskId, dayIndex }

  const getNotes = () => data.habitNotes || (data.habitNotes = {});

  const getNoteKey = (taskId, dayIndex) =>
    `${todayKey().slice(0,7)}_${taskId}_${dayIndex}`;

  window._noteClose  = () => document.getElementById("noteModal").classList.add("hidden");

  window._noteSave   = () => {
    if (!_noteContext) return;
    const { taskId, dayIndex } = _noteContext;
    const key  = getNoteKey(taskId, dayIndex);
    const text = document.getElementById("noteTextarea").value.trim();
    if (text) {
      getNotes()[key] = text;
    } else {
      delete getNotes()[key];
    }
    saveData();
    window._noteClose();
    render();
    playSound("gem");
  };

  window._noteDelete = () => {
    if (!_noteContext) return;
    const key = getNoteKey(_noteContext.taskId, _noteContext.dayIndex);
    delete getNotes()[key];
    saveData();
    window._noteClose();
    render();
  };

  const openNoteModal = (task, dayIndex) => {
    const key      = getNoteKey(task.id, dayIndex);
    const existing = getNotes()[key] || "";
    const d        = new Date(currentYear, currentMonth, dayIndex + 1);
    const label    = d.toLocaleDateString("en", { weekday:"short", month:"short", day:"numeric" });

    _noteContext = { taskId: task.id, dayIndex };

    document.getElementById("noteModalTitle").textContent =
      `📝 ${task.name} — ${label}`;
    document.getElementById("noteTextarea").value = existing;
    document.getElementById("noteDeleteBtn").style.display = existing ? "block" : "none";
    document.getElementById("noteModal").classList.remove("hidden");
    setTimeout(() => document.getElementById("noteTextarea").focus(), 50);
  };

  /* =========================
     4. MONTHLY REFLECTION
  ========================= */
  const checkAndPromptReflection = () => {
    // Prompt when viewing a just-finished past month
    const isPastMonth = currentYear < TODAY_YEAR ||
      (currentYear === TODAY_YEAR && currentMonth < TODAY_MONTH);
    if (!isPastMonth) return;

    const mKey = `${currentYear}-${String(currentMonth+1).padStart(2,"0")}`;
    if (data.reflections?.[mKey]) return; // already reflected

    // Only prompt once per month (use a flag)
    const promptKey = `reflPrompted_${mKey}`;
    if (data.easterEggs?.[promptKey]) return;
    if (!data.easterEggs) data.easterEggs = {};
    data.easterEggs[promptKey] = true;
    saveData();

    setTimeout(() => openReflectionModal(mKey), 1200);
  };

  const openReflectionModal = (mKey) => {
    const month    = data[mKey];
    const [y, m]   = mKey.split("-").map(Number);
    const MONTHS_  = ["January","February","March","April","May","June",
                      "July","August","September","October","November","December"];

    // Compute stats for this month
    const tasks    = month?.tasks || [];
    const days     = new Date(y, m, 0).getDate();
    let done = 0, total = 0, perfectDays = 0;
    for (let d = 0; d < days; d++) {
      const active = tasks.filter(t => t.days[d] !== "locked");
      if (!active.length) continue;
      const dayDone = active.filter(t => t.days[d] === "done").length;
      done  += dayDone; total += active.length;
      if (dayDone === active.length) perfectDays++;
    }
    const pct = total > 0 ? Math.round((done/total)*100) : 0;

    document.getElementById("reflectionSubtitle").textContent =
      `${MONTHS_[m-1]} ${y}`;

    document.getElementById("reflectionStats").innerHTML = `
      <div class="refl-stat">
        <div class="refl-stat-val" style="color:var(--done,#4ade80)">${pct}%</div>
        <div class="refl-stat-lbl">Completion</div>
      </div>
      <div class="refl-stat">
        <div class="refl-stat-val" style="color:#facc15">${perfectDays} ⭐</div>
        <div class="refl-stat-lbl">Perfect Days</div>
      </div>
      <div class="refl-stat">
        <div class="refl-stat-val">${done}</div>
        <div class="refl-stat-lbl">Habits Done</div>
      </div>
      <div class="refl-stat">
        <div class="refl-stat-val">${tasks.length}</div>
        <div class="refl-stat-lbl">Habits Tracked</div>
      </div>`;

    // Load existing answers if any
    const existing = data.reflections?.[mKey] || {};
    document.getElementById("reflQ1").value = existing.q1 || "";
    document.getElementById("reflQ2").value = existing.q2 || "";
    document.getElementById("reflQ3").value = existing.q3 || "";

    document.getElementById("reflectionModal").classList.remove("hidden");
  };

  window._reflectionSave = () => {
    const mKey = `${currentYear}-${String(currentMonth+1).padStart(2,"0")}`;
    if (!data.reflections) data.reflections = {};
    data.reflections[mKey] = {
      q1: document.getElementById("reflQ1").value.trim(),
      q2: document.getElementById("reflQ2").value.trim(),
      q3: document.getElementById("reflQ3").value.trim(),
      savedAt: new Date().toISOString(),
    };
    saveData();
    document.getElementById("reflectionModal").classList.add("hidden");
    playSound("badge");
    pushToast(buildSimpleToast("📓", "Reflection saved!", "var(--done,#4ade80)"), 3000);
    awardXP(20, "Monthly reflection");
  };

  /* =========================
     5. SHAREABLE PROFILE CARD
  ========================= */
  window._openShareCard = () => {
    buildShareCard();
    document.getElementById("shareCardModal").classList.remove("hidden");
  };

  window._shareDownload = () => {
    const canvas = document.getElementById("shareCanvas");
    const link   = document.createElement("a");
    link.download = "habit-streak-card.png";
    link.href     = canvas.toDataURL("image/png");
    link.click();
  };

  const buildShareCard = () => {
    const canvas  = document.getElementById("shareCanvas");
    const W = 520, H = 280;
    canvas.width  = W;
    canvas.height = H;
    const ctx     = canvas.getContext("2d");

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0,   "#0f0f1a");
    bg.addColorStop(0.5, "#1a0f2e");
    bg.addColorStop(1,   "#0f1a1a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Subtle grid pattern
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth   = 1;
    for (let x = 0; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y = 0; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

    // Glow orb
    const glow = ctx.createRadialGradient(W*0.15, H*0.35, 0, W*0.15, H*0.35, 160);
    glow.addColorStop(0,   "rgba(76,175,80,0.18)");
    glow.addColorStop(1,   "transparent");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Data
    const xp       = ensureXP();
    const league   = getCurrentLeague();
    const lxp      = getLifetimeXP();
    const streak   = calculateDailyStreak();
    const gems     = getGems();
    const stats    = calculateStats();
    const userName = authUser.name || authUser.email?.split("@")[0] || "Habit Hero";

    // App name
    ctx.font      = "700 11px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillText("HABIT TRACKER", 24, 28);

    // Username
    ctx.font      = "800 28px sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(userName, 24, 68);

    // League badge
    ctx.font      = "700 13px sans-serif";
    ctx.fillStyle = league.color;
    ctx.fillText(`${league.emoji} ${league.name} League`, 24, 92);

    // Divider
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(24, 108); ctx.lineTo(W-24, 108); ctx.stroke();

    // Stats grid  — 4 stats across
    const statsData = [
      { label: "STREAK",    value: `${streak}🔥`,    color: "#fb923c" },
      { label: "LEVEL",     value: `LV ${xp.level}`, color: "#4ade80" },
      { label: "GEMS",      value: `${gems}💎`,       color: "#a78bfa" },
      { label: "DONE",      value: `${stats.done}✔`, color: "#38bdf8" },
    ];

    statsData.forEach((s, i) => {
      const x = 24 + i * (W - 48) / 4;
      ctx.font      = "600 9px sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fillText(s.label, x, 132);
      ctx.font      = `800 22px sans-serif`;
      ctx.fillStyle = s.color;
      ctx.fillText(s.value, x, 158);
    });

    // XP bar
    const barX = 24, barY = 176, barW = W - 48, barH = 8;
    const needed = XP_PER_LEVEL(xp.level);
    const pct    = xp.total / needed;

    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 4);
    ctx.fill();

    const grad = ctx.createLinearGradient(barX, 0, barX + barW * pct, 0);
    grad.addColorStop(0, "#4ade80");
    grad.addColorStop(1, "#22d3ee");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW * pct, barH, 4);
    ctx.fill();

    ctx.font      = "600 10px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillText(`${xp.total} / ${needed} XP to Level ${xp.level + 1}`, barX, barY + 22);

    // Lifetime XP
    ctx.font      = "700 10px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillText(`${lxp.toLocaleString()} lifetime XP`, barX, barY + 38);

    // Bottom branding
    ctx.font      = "600 10px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillText("habittracker.app", W - 24 - ctx.measureText("habittracker.app").width, H - 14);
  };

    // Init notifications on load
    if (typeof HabitNotifications !== "undefined") {
      HabitNotifications.init(authUser.id);
    }

    const render = () => {
    autoFailPastDays();
    renderHeader();
    // Defer non-critical panels so grid paints first
    const _deferred = () => {
      renderQuestsPanel();
      renderLeaguePanel();
      renderCoachPanel();
      renderSeasonalBanner();
      checkAndPromptReflection();
      renderMoodWidget();
    };
    if (window.requestIdleCallback) {
      requestIdleCallback(_deferred, { timeout: 600 });
    } else {
      setTimeout(_deferred, 80);
    }
    // Show mood popup after short delay — once per day, only if not logged yet
    setTimeout(showMoodPopup, 1200);
    // Init Byte mascot (only on first render)
    if (typeof ByteTutorial !== "undefined" && !window._byteInitDone) {
      window._byteInitDone = true;
      ByteTutorial.init();
      // Start Byte's idle animations after a delay (premium only)
      if (window.HabitPremium?.isPremium()) {
        setTimeout(() => {
          if (typeof ByteTutorial._startIdleTimer === "function") {
            ByteTutorial._startIdleTimer();
          }
        }, 5000);
      }
    }

    // ── Show free plan UI elements ──────────────────────────────────────
    const _hp = window.HabitPremium;
    if (_hp) {
      _hp.enforceTheme(); // always enforce, even if premium check changes

      if (!_hp.isPremium()) {
        // Feature gates handle themselves via showUpgradeWall()
        // League stat still clickable — goes to upgrade wall
        const leagueEl = document.querySelector(".league-stat");
        if (leagueEl) {
          leagueEl.style.cursor = "pointer";
          leagueEl.title = "⭐ Leagues — Premium feature";
          leagueEl.onclick = () => _hp.showUpgradeWall("leagues");
        }
      }

      // ── SMART UPGRADE POP-UP (free users only) ─────────────────────
      // Logic: once per day normally, up to twice if user has been active 2+ hours
      if (_hp && !_hp.isPremium()) {
        const _popupKey    = "habitUpgradePopup";
        const _todayStr    = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const _sessionKey  = "habitSessionStart";
        const _popupState  = JSON.parse(localStorage.getItem(_popupKey) || "{}");

        // Track session start time
        if (!sessionStorage.getItem(_sessionKey)) {
          sessionStorage.setItem(_sessionKey, Date.now().toString());
        }

        const _sessionStartMs  = parseInt(sessionStorage.getItem(_sessionKey) || Date.now(), 10);
        const _shownToday      = _popupState.date === _todayStr ? (_popupState.count || 0) : 0;

        const _checkAndShowPopup = () => {
          if (_hp.isPremium()) return; // went premium mid-session
          const _hp2 = window.HabitPremium;
          if (_hp2 && _hp2.isPremium()) return;

          const _nowMs        = Date.now();
          const _sessionMins  = (_nowMs - _sessionStartMs) / 60000;
          const _sessionHours = _sessionMins / 60;
          const _state        = JSON.parse(localStorage.getItem(_popupKey) || "{}");
          const _shown        = _state.date === _todayStr ? (_state.count || 0) : 0;

          // Max 1 normally, max 2 if 2+ hours active
          const _maxShows = _sessionHours >= 2 ? 2 : 1;
          if (_shown >= _maxShows) return;

          // Save state
          localStorage.setItem(_popupKey, JSON.stringify({
            date:  _todayStr,
            count: _shown + 1,
          }));

          _showUpgradeToast(_sessionHours >= 2);
        };

        // First pop-up: after 90 seconds if not shown today
        if (_shownToday === 0) {
          setTimeout(_checkAndShowPopup, 90000);
        }

        // Second pop-up check: at 2 hour mark (if they've already had first)
        const _msUntil2hrs = (_sessionStartMs + 2 * 3600000) - Date.now();
        if (_shownToday < 2 && _msUntil2hrs > 0) {
          setTimeout(_checkAndShowPopup, _msUntil2hrs + 10000);
        }
      }
    }

    const _showUpgradeToast = (isLongSession = false) => {
      // Don't show if upgrade wall or another toast is open
      if (document.getElementById("premiumWall") || document.getElementById("upgradeNudgeBar")) return;

      const bar = document.createElement("div");
      bar.id = "upgradeNudgeBar";

      const msgs = isLongSession ? [
        { icon: "🔥", text: "You've been crushing it for over 2 hours. Premium gives you unlimited habits, shields, and leagues to match that energy." },
        { icon: "⭐", text: "Two hours in — Byte is impressed. Ready to unlock everything? XP, leagues, friends, AI coach. From £3.99/mo." },
        { icon: "🏆", text: "You clearly take this seriously. Premium users get streak shields, XP, leagues, and the AI coach. From £3.99/mo." },
      ] : [
        { icon: "💡", text: "Free plan: 5 habits max. Premium: unlimited habits + XP, leagues, streak shields, and more. From £3.99/mo." },
        { icon: "🛡️", text: "Protect your streaks with shields. Earn gems. Climb leagues. Byte says Premium is worth it — and Byte is never wrong." },
        { icon: "👥", text: "Did you know Premium unlocks friends & challenges? Challenge someone to a habit competition. From £3.99/mo." },
        { icon: "🎯", text: "Daily quests, combo XP, leagues, and an AI coach are all waiting for you in Premium. From £3.99/mo." },
      ];
      const msg = msgs[Math.floor(Math.random() * msgs.length)];

      bar.style.cssText = `
        position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%) translateY(80px);
        z-index: 9998; max-width: 480px; width: calc(100vw - 32px);
        background: linear-gradient(135deg, #0d1a12, #0f1820);
        border: 1px solid rgba(16,185,129,0.3);
        border-radius: 16px; padding: 14px 16px;
        display: flex; align-items: center; gap: 12px;
        box-shadow: 0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(16,185,129,0.1);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        transition: transform 0.4s cubic-bezier(0.34,1.1,0.64,1), opacity 0.3s ease;
        opacity: 0;
      `;
      bar.innerHTML = `
        <span style="font-size:1.4rem;flex-shrink:0">${msg.icon}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:0.78rem;line-height:1.5;color:rgba(255,255,255,0.75)">${msg.text}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
          <button onclick="window.location.href='upgrade.html'" style="background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:10px;padding:7px 12px;font-size:0.75rem;font-weight:800;cursor:pointer;font-family:inherit;white-space:nowrap">
            Upgrade →
          </button>
          <button id="nudgeCloseBtn" style="background:none;border:none;color:rgba(255,255,255,0.2);font-size:0.68rem;cursor:pointer;font-family:inherit;text-align:center">
            Not now
          </button>
        </div>
      `;
      document.body.appendChild(bar);

      // Animate in
      requestAnimationFrame(() => {
        bar.style.opacity = "1";
        bar.style.transform = "translateX(-50%) translateY(0)";
      });

      const close = () => {
        bar.style.opacity = "0";
        bar.style.transform = "translateX(-50%) translateY(20px)";
        setTimeout(() => bar.remove(), 300);
      };

      document.getElementById("nudgeCloseBtn").onclick = close;
      // Auto-dismiss after 12 seconds
      setTimeout(close, 12000);
    };
    renderWeekStrip();
    renderGrid();
    renderMonthNav();
    renderStats();
    renderGems();
    renderLoginStreak();
    renderXP();
    renderInsights();
    checkMonthBonus();
    checkQuestCompletions();
    updateDailyRing();
    resizeCanvas();
    animateGraph(calculateDailyStats());
    renderHeatmap();
  };



 window.addEventListener("resize", () => {
   resizeCanvas();
   animateGraph(calculateDailyStats());
  });

  /* ── Auto-advance at midnight (no page reload) ── */
  (() => {
    const scheduleNewDayRefresh = () => {
      const now  = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
      const ms   = next - now;
      setTimeout(() => {
        render();                  // re-render with the new day's data
        scheduleNewDayRefresh();   // schedule next midnight
      }, ms);
    };
    scheduleNewDayRefresh();
  })();


  /* =========================
     EVENTS
  ========================= */
  /* =========================
   MODAL OPEN
========================= */
addTaskBtn.onclick = () => {
  habitModal.classList.remove("hidden");

  // Reset form
  habitNameInput.value = "";
  scheduleType.value = "daily";
  weeklyPicker.classList.add("hidden");
  intervalPicker.classList.add("hidden");
  document.getElementById("onceWeekPicker")?.classList.add("hidden");
  document.getElementById("onceMonthPicker")?.classList.add("hidden");
  const cot = document.getElementById("carryOverToggle");
  if (cot) cot.checked = true;
  document.getElementById("habitTimeInput").value = "";
  document.getElementById("habitCategorySelect").value = "general";
  habitNameInput.focus();
};

document.getElementById("saveHabit").onclick = () => {
  // ── PREMIUM GATE: max 5 habits on free plan ──
  const _hp = window.HabitPremium;
  if (_hp && !_hp.isPremium()) {
    const month = ensureMonth();
    const currentHabitCount = (month.tasks || []).length;
    if (!_hp.can.addHabit(currentHabitCount)) {
      habitModal.classList.add("hidden");
      _hp.showUpgradeWall("habits");
      return;
    }
  }

  const _rawName = habitNameInput.value.trim();
  const name = _hs.sanitizeName ? _hs.sanitizeName(_rawName, 80) : _rawName.replace(/<[^>]*>/g,'').slice(0,80);
  if (!name) return alert("Habit needs a name");
  if (name !== _rawName) { habitNameInput.value = name; } // show sanitized version

  const type = scheduleType.value;
  let schedule = { type };

  if (type === "weekly") {
    const days = [...weeklyPicker.querySelectorAll("input:checked")]
      .map(i => Number(i.value));
    if (!days.length) return alert("Pick at least one day");
    schedule.days = days;
  }

  if (type === "interval") {
    const intervalValue = Number(document.getElementById("intervalInput").value);
    if (!intervalValue || intervalValue < 1) return alert("Enter a valid interval");
    schedule.interval = intervalValue;
    schedule.every    = intervalValue; // alias used in isHabitActiveOnDay
  }

  if (type === "once_week") {
    const dayPick = document.getElementById("onceWeekDayPicker");
    schedule.preferredDay = dayPick ? Number(dayPick.value) : 1;
  }

  if (type === "once_month") {
    const datePick = document.getElementById("onceMonthDatePicker");
    schedule.preferredDate = datePick ? Number(datePick.value) : 1;
  }

  const month = ensureMonth();
  const days = daysInMonth(currentYear, currentMonth);
  const createdIndex =
    currentYear === TODAY_YEAR && currentMonth === TODAY_MONTH
      ? TODAY_DAY - 1
      : 0;

  const dayStates = Array(days).fill("locked");

  for (let i = createdIndex; i < days; i++) {
    const date = new Date(currentYear, currentMonth, i + 1);
    dayStates[i] = isHabitActiveOnDay({ schedule }, date)
      ? "unmarked"
      : "locked";
  }

  const carryOver = document.getElementById("carryOverToggle")?.checked !== false;

  // Rate limit: max 5 habit creations per minute
  if (_hs.rateLimit && !_hs.rateLimit("addHabit", 5, 60000)) {
    alert("You're adding habits too quickly. Please wait a moment.");
    return;
  }

  const scheduledTime = _hs.sanitizeTime
    ? _hs.sanitizeTime(document.getElementById("habitTimeInput")?.value || "")
    : (document.getElementById("habitTimeInput")?.value || "");
  const habitCategory = _hs.sanitizeCategory
    ? _hs.sanitizeCategory(document.getElementById("habitCategorySelect")?.value || "general")
    : (document.getElementById("habitCategorySelect")?.value || "general");

  month.tasks.push({
    id: Date.now(),
    name,
    category: habitCategory,
    scheduledTime,
    createdDay: createdIndex,
    startDate: new Date(
      currentYear,
      currentMonth,
      createdIndex + 1
    ).toISOString(),
    schedule,
    days: dayStates,

    // Grace system
    graceLimit: 1,
    graceUsed: 0,

    // Carry-over to next month
    carryOver: carryOver !== false,
  });

  saveData();
  habitModal.classList.add("hidden");
  render();
  setTimeout(checkAccountantEgg, 300); // check after render
};




  /* =========================
     23:00 WARNING CLOCK
  ========================= */
  const startWarningClock = () => {
    let lastHour = new Date().getHours();

    const tick = () => {
      const now  = new Date();
      const hour = now.getHours();
      const min  = now.getMinutes();

      // Re-render grid when hour changes (catches 23:00 flip)
      // Also re-render every minute after 23:00 so newly-marked cells lose glow instantly
      if (hour !== lastHour || hour >= 23) {
        lastHour = hour;
        if (currentYear === TODAY_YEAR && currentMonth === TODAY_MONTH) {
          renderGrid();
          renderStats();
        }
      }

      // Schedule next tick at the top of the next minute
      const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
      setTimeout(tick, msToNextMinute);
    };

    // Kick off — aligned to next minute boundary
    const _startNow = new Date();
    const _msToStart = (60 - _startNow.getSeconds()) * 1000 - _startNow.getMilliseconds();
    setTimeout(tick, _msToStart);
  };

  /* =========================
     LOGIN STREAK SYSTEM
  ========================= */
  /* ── STREAK SHIELDS ── */
  const ensureShields = () => {
    if (!data.shields) data.shields = { count: 0, totalEarned: 0 };
    return data.shields;
  };

  const checkAndAwardShield = () => {
    // Award a shield for every perfect week (7 consecutive perfect days)
    const today = new Date(TODAY_YEAR, TODAY_MONTH, TODAY_DAY);
    const mk = monthKey(TODAY_YEAR, TODAY_MONTH);
    const mo = data[mk];
    if (!mo?.tasks?.length) return;

    let consecutive = 0;
    for (let d = TODAY_DAY - 1; d >= 0; d--) {
      const active = mo.tasks.filter(t => t.days[d] !== "locked");
      if (!active.length) break;
      if (active.every(t => t.days[d] === "done")) consecutive++;
      else break;
    }

    const shields = ensureShields();
    const prevBest = shields._lastPerfectRun || 0;
    if (consecutive >= 7 && Math.floor(consecutive / 7) > Math.floor(prevBest / 7)) {
      shields.count++;
      shields.totalEarned++;
      shields._lastPerfectRun = consecutive;
      saveData();
      pushToast(buildSimpleToast("🛡️", `Perfect week! Streak Shield earned! (${shields.count} total)`, "#60a5fa"), 5000);
      playSound("badge");
    }
    if (consecutive < prevBest) shields._lastPerfectRun = consecutive;
  };

  // Shield auto-protects ONE miss: called when a habit is marked missed
  const tryUseShield = (task, dayIdx) => {
    const shields = ensureShields();
    if (shields.count <= 0) return false;
    // Check if task had an active streak before this miss
    let streakBefore = 0;
    for (let i = dayIdx - 1; i >= 0; i--) {
      if (task.days[i] === "done") streakBefore++;
      else break;
    }
    if (streakBefore >= 3) {
      shields.count--;
      saveData();
      pushToast(buildSimpleToast("🛡️", `Shield used! "${task.name}" streak protected. (${shields.count} remaining)`, "#60a5fa"), 4000);
      return true;
    }
    return false;
  };

  const renderShieldBadge = () => {
    const shields = ensureShields();
    let el = document.getElementById("shieldBadge");
    if (!el) {
      el = document.createElement("div");
      el.id = "shieldBadge";
      el.style.cssText = "display:inline-flex;align-items:center;gap:5px;background:rgba(96,165,250,0.12);border:1px solid rgba(96,165,250,0.25);border-radius:8px;padding:4px 9px;font-size:0.75rem;font-weight:800;color:#60a5fa;cursor:pointer;";
      el.title = "Streak Shields — earned by completing perfect weeks. Auto-protect a streak on miss.";
      el.onclick = () => pushToast(buildSimpleToast("🛡️", `You have ${shields.count} Streak Shield${shields.count!==1?"s":""}. Complete a perfect week to earn more. Shields auto-protect your longest streak when you miss a habit.`, "#60a5fa"), 5000);
      const streakEl = document.getElementById("dailyStreak");
      if (streakEl?.parentElement) streakEl.parentElement.appendChild(el);
    }
    el.style.display = shields.count > 0 ? "inline-flex" : "none";
    el.innerHTML = `🛡️ ${shields.count}`;
  };

  const ensureLoginData = () => {
    if (!data.loginStreak) data.loginStreak = {
      count:       0,
      lastLogin:   null,   // "YYYY-MM-DD"
      freezeUsed:  false,  // was today saved by a freeze?
      freezeStock: 0,      // unused freezes banked
    };
    return data.loginStreak;
  };

  const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };

  const yesterdayKey = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };

  /* ── XP PENALTY for missed habits ───────────────────────────────────
     Runs once per day on page load. Checks yesterday's habits.
     Any habit that wasn't completed AND wasn't protected by shield/freeze/gem
     deducts XP equal to what it would have given.
  ─────────────────────────────────────────────────────────────────── */
  const checkMissedHabitXPPenalty = () => {
    const penaltyKey = "habitMissedPenalty";
    const today      = todayKey();
    const yest       = yesterdayKey();

    // Only run once per day
    if (localStorage.getItem(penaltyKey) === today) return;
    localStorage.setItem(penaltyKey, today);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const mk = yesterday.getFullYear() + "-" + String(yesterday.getMonth() + 1).padStart(2, "0");
    const month = data[mk];
    if (!month?.tasks?.length) return;

    const yesterdayIdx = yesterday.getDate() - 1;
    let totalPenalty = 0;
    const penalisedHabits = [];

    month.tasks.forEach(t => {
      // Skip archived/locked habits
      if (!t.days || t.days[yesterdayIdx] === "locked") return;
      // Skip if not a day this habit is supposed to run
      const hasSchedule = t.days && t.days.length > yesterdayIdx;
      if (!hasSchedule) return;

      const status = t.days[yesterdayIdx];
      // Only penalise if missed (not done, not grace-covered, not frozen)
      if (status === "done" || status === "grace" || status === "frozen") return;

      // Check if protected by a streak shield (shields cover the whole day)
      const graceUsed = (t.graceUsed ?? 0) > 0;
      if (graceUsed) return; // shield used — no penalty

      // Calculate XP this habit would have given (base 20, same as completion XP)
      const xpLost = 20;
      totalPenalty += xpLost;
      penalisedHabits.push(_hs.escapeHTML ? _hs.escapeHTML(t.name || "habit") : (t.name || "habit"));
    });

    if (totalPenalty <= 0) return;

    // Deduct XP (but don't go below 0 in current level)
    if (!data.xp) data.xp = { level: 1, currentXP: 0, lifetimeXP: 0, xpToNext: 100 };
    const lost = Math.min(totalPenalty, data.xp.currentXP || 0);
    data.xp.currentXP   = Math.max(0, (data.xp.currentXP || 0) - lost);
    data.xp.lifetimeXP  = Math.max(0, (data.xp.lifetimeXP || 0) - lost);
    saveData();

    // Show penalty toast
    if (lost > 0) {
      setTimeout(() => {
        const missed = penalisedHabits.length;
        pushToast(buildSimpleToast(
          "📉",
          `Yesterday: ${missed} habit${missed > 1 ? "s" : ""} missed → -${lost} XP`,
          "#f87171"
        ), 5000);
      }, 2000);
    }
  };

  const processLoginStreak = () => {
    const ls     = ensureLoginData();
    const today  = todayKey();
    const yest   = yesterdayKey();

    // Already logged in today — nothing to do
    if (ls.lastLogin === today) {
      renderLoginStreak();
      return;
    }

    const wasYesterday = ls.lastLogin === yest;
    const isFirstEver  = ls.lastLogin === null;
    const daysMissed   = (() => {
      if (!ls.lastLogin) return 0;
      const last = new Date(ls.lastLogin);
      const now  = new Date(today);
      return Math.round((now - last) / 86400000) - 1;
    })();

    if (isFirstEver) {
      // First ever login
      ls.count     = 1;
      ls.lastLogin = today;
      saveData();
      pushToast(buildSimpleToast("👋", "Welcome! Login streak started!", "var(--done,#4ade80)"), 3500);

    } else if (wasYesterday) {
      // Perfect — consecutive day
      ls.count++;
      ls.lastLogin = today;
      saveData();

      // Milestone toasts
      if ([3,7,14,30,60,100].includes(ls.count)) {
        setTimeout(() => {
          pushToast(buildSimpleToast("🔥", `${ls.count}-day login streak! Keep going!`, "var(--done,#4ade80)"), 4000);
          launchConfetti();
        }, 600);
      } else {
        pushToast(buildSimpleToast("📅", `${ls.count}-day login streak!`, "var(--done,#4ade80)"), 3000);
      }

    } else if (daysMissed === 1 && ls.freezeStock > 0) {
      // Missed exactly 1 day — auto-use a freeze
      ls.freezeStock--;
      ls.count++;
      ls.lastLogin  = today;
      ls.freezeUsed = true;
      saveData();
      pushToast(buildSimpleToast("🧊", `Freeze used! Login streak saved at ${ls.count} days`, "#38bdf8"), 4000);

    } else {
      // Streak broken
      const old    = ls.count;
      ls.count     = 1;
      ls.lastLogin = today;
      ls.freezeUsed = false;
      saveData();

      if (old >= 3) {
        pushToast(buildSimpleToast("💔", `Login streak lost (was ${old} days). Starting fresh!`, "var(--missed,#f87171)"), 4000);
      } else {
        // Comeback reward — bonus gems
        awardGems(20, "Comeback bonus! +20 💎");
      }
    }

    renderLoginStreak();
  };

  const renderLoginStreak = () => {
    const ls  = ensureLoginData();
    const el  = document.getElementById("loginStreak");
    const btn = document.getElementById("freezeLoginBtn");
    if (!el) return;

    const frozen = ls.freezeUsed && ls.lastLogin === todayKey();
    el.textContent = ls.count + (frozen ? " 🧊" : " 📅");
    el.className   = ls.count >= 7 ? "hot" : frozen ? "frozen" : ls.count === 1 ? "broken" : "";

    // Show freeze button if they have gems and ≥3 streak and no freeze banked
    if (btn) {
      const gems = getGems();
      btn.style.display = (gems >= 50 && ls.count >= 3 && ls.freezeStock < 2) ? "inline-flex" : "none";
    }
  };

  const freezeLoginStreak = () => {
    if (window.HabitPremium && !window.HabitPremium.isPremium()) {
      window.HabitPremium.showUpgradeWall("freezes");
      return;
    }
    const ls = ensureLoginData();
    if (getGems() < 50) return;
    if (ls.freezeStock >= 2) {
      pushToast(buildSimpleToast("🧊", "You already have max freezes banked (2)", "#38bdf8"), 3000);
      return;
    }
    spendGems(50);
    ls.freezeStock++;
    saveData();
    renderLoginStreak();
    renderGems();
    pushToast(buildSimpleToast("🧊", `Freeze banked! (${ls.freezeStock}/2 stored)`, "#38bdf8"), 3000);
  };

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("auth_user");
      window.location.href = "auth.html";
    });
  }

  // Expose for header button onclicks
  window.saveStreakWithGems  = saveStreakWithGems;
  window.freezeLoginStreak   = freezeLoginStreak;

  // Process login streak on page load
  processLoginStreak();
  awardLoginXP();
  checkMissedHabitXPPenalty();

  render();
  renderShieldBadge();
  setTimeout(checkAndAwardShield, 800);
  // Signal page is ready to show - grid is painted, deferred panels load after
  requestAnimationFrame(function(){ requestAnimationFrame(function(){
    if (window._pageReady) window._pageReady();
  }); });
});