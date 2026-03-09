/* =====================================================
   HABIT TRACKER — Smart Notifications
   Handles requesting permission, scheduling reminders,
   and delivering context-aware push messages.
===================================================== */

const HabitNotifications = (() => {
  const STORAGE_KEY_SETTINGS = "habitNotifSettings";
  const STORAGE_KEY_SCHEDULED = "habitNotifScheduled";

  /* ── Default settings ── */
  const DEFAULTS = {
    enabled:      false,
    morningTime:  "08:00",  // daily morning check-in
    eveningTime:  "21:00",  // evening reminder if not done
    streakAlert:  true,     // alert when streak is at risk
    questAlert:   true,     // alert when daily quest available
    socialAlert:  true,     // friend request / challenge alerts
  };

  const getSettings = () =>
    Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(STORAGE_KEY_SETTINGS) || "{}"));

  const saveSettings = (s) =>
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(s));

  /* ── Permission ── */
  const isSupported = () => "Notification" in window && "serviceWorker" in navigator;
  const isGranted   = () => Notification.permission === "granted";

  const requestPermission = async () => {
    if (!isSupported()) return false;
    const result = await Notification.requestPermission();
    return result === "granted";
  };

  /* ── Show a local notification (no server needed) ── */
  const showLocal = async (title, body, options = {}) => {
    if (!isGranted()) return;
    const reg = await navigator.serviceWorker.ready.catch(() => null);
    if (!reg) return;
    reg.showNotification(title, {
      body,
      icon:    options.icon    || "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>✅</text></svg>",
      tag:     options.tag     || "habit-general",
      data:    options.data    || { url: "monthly.html" },
      badge:   options.badge   || "",
      silent:  options.silent  || false,
      requireInteraction: false,
    });
  };

  /* ── Context-aware message generator ── */
  const buildMessage = (authUserId) => {
    const data      = JSON.parse(localStorage.getItem(`habitTracker_${authUserId}`)) || {};
    const today     = new Date();
    const mk        = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}`;
    const month     = data[mk] || { tasks: [] };
    const idx       = today.getDate() - 1;
    const hour      = today.getHours();

    const active    = month.tasks.filter(t => t.days[idx] !== "locked");
    const done      = active.filter(t => t.days[idx] === "done").length;
    const total     = active.length;
    const remaining = total - done;
    const pct       = total > 0 ? Math.round(done / total * 100) : 0;
    const streak    = data.loginStreak?.count || 0;

    // Morning messages
    if (hour < 12) {
      if (streak >= 7)  return { title: "🔥 Keep the streak alive!", body: `Day ${streak} — you're on fire. Open your habits.` };
      if (total === 0)  return { title: "🌅 New day, new habits!", body: "Add some habits and start your streak." };
      return { title: "🌅 Good morning!", body: `${total} habit${total !== 1 ? "s" : ""} waiting for you today. Let's go!` };
    }

    // Afternoon messages
    if (hour < 17) {
      if (pct === 100)  return { title: "🏆 Perfect so far!", body: "All habits done! Keep it up for a perfect day." };
      if (remaining > 0) return { title: "⚡ Halfway through the day", body: `${done}/${total} done — ${remaining} left. You've got this!` };
      return { title: "✅ Nice work!", body: "All habits checked — you're crushing it today." };
    }

    // Evening messages
    if (pct === 100)    return { title: "⭐ Perfect day!", body: "You completed everything today. Amazing!" };
    if (remaining > 0)  return { title: "🌙 Don't break the chain!", body: `${remaining} habit${remaining !== 1 ? "s" : ""} left — end the day strong.` };
    if (streak >= 3)    return { title: "🔥 Streak safe!", body: `${streak}-day streak maintained. See you tomorrow!` };
    return                     { title: "📋 Habit check-in", body: "How are your habits going today?" };
  };

  /* ── Schedule daily alarms using setTimeout ── */
  let _alarmTimers = [];

  const cancelAll = () => {
    _alarmTimers.forEach(t => clearTimeout(t));
    _alarmTimers = [];
  };

  const msUntilTime = (timeStr) => {
    const [h, m]    = timeStr.split(":").map(Number);
    const now       = new Date();
    const target    = new Date(now);
    target.setHours(h, m, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    return target - now;
  };

  const scheduleAlarms = (authUserId) => {
    cancelAll();
    const s = getSettings();
    if (!s.enabled || !isGranted()) return;

    const schedule = (timeStr, tag) => {
      const ms = msUntilTime(timeStr);
      const t  = setTimeout(async () => {
        const msg = buildMessage(authUserId);
        await showLocal(msg.title, msg.body, { tag });
        // Reschedule for next day
        scheduleAlarms(authUserId);
      }, ms);
      _alarmTimers.push(t);
    };

    schedule(s.morningTime, "habit-morning");
    schedule(s.eveningTime, "habit-evening");
  };

  /* ── Streak-at-risk check: call when user opens app ── */
  const checkStreakRisk = async (authUserId) => {
    const s = getSettings();
    if (!s.enabled || !s.streakAlert || !isGranted()) return;

    const data   = JSON.parse(localStorage.getItem(`habitTracker_${authUserId}`)) || {};
    const streak = data.loginStreak?.count || 0;
    const lastDate = data.loginStreak?.lastDate;
    if (!lastDate || streak < 3) return;

    const daysSinceLast = Math.floor((Date.now() - new Date(lastDate)) / 86400000);
    if (daysSinceLast >= 1) {
      // Check if last notification was already sent today
      const sent = localStorage.getItem("habitStreakAlertSent");
      const today = new Date().toISOString().slice(0, 10);
      if (sent === today) return;
      localStorage.setItem("habitStreakAlertSent", today);
      await showLocal(
        `🔥 ${streak}-day streak at risk!`,
        "You haven't checked in today — open the app to keep your streak!",
        { tag: "habit-streak-risk" }
      );
    }
  };

  /* ── Social alert: call when friend request arrives ── */
  const alertFriendRequest = async (fromName) => {
    const s = getSettings();
    if (!s.enabled || !s.socialAlert || !isGranted()) return;
    await showLocal(
      "👥 New friend request!",
      `${fromName} wants to be friends. Open the app to accept.`,
      { tag: "habit-friend-request", data: { url: "social.html" } }
    );
  };

  const alertChallenge = async (fromName, type) => {
    const s = getSettings();
    if (!s.enabled || !s.socialAlert || !isGranted()) return;
    await showLocal(
      "⚔️ You've been challenged!",
      `${fromName} challenges you to a ${type}. Accept it!`,
      { tag: "habit-challenge", data: { url: "social.html" } }
    );
  };

  /* ── Render settings UI ── */
  const renderSettingsUI = (containerId, authUserId) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const s       = getSettings();
    const granted = isGranted();
    const supp    = isSupported();

    container.innerHTML = `
      <div class="notif-settings">
        ${!supp ? `<div class="notif-unsupported">⚠️ Notifications not supported in this browser</div>` : ""}

        <div class="notif-row">
          <div class="notif-label">
            <div class="notif-title">Enable Reminders</div>
            <div class="notif-sub">${granted ? "✓ Permission granted" : "Tap to allow notifications"}</div>
          </div>
          <label class="notif-toggle">
            <input type="checkbox" id="notifEnabled" ${s.enabled ? "checked" : ""} ${!supp ? "disabled" : ""} />
            <span class="notif-slider"></span>
          </label>
        </div>

        <div id="notifDetails" style="${s.enabled ? "" : "opacity:0.4;pointer-events:none"}">
          <div class="notif-row">
            <div class="notif-label">
              <div class="notif-title">🌅 Morning reminder</div>
            </div>
            <input type="time" id="notifMorning" value="${s.morningTime}" class="notif-time" />
          </div>
          <div class="notif-row">
            <div class="notif-label">
              <div class="notif-title">🌙 Evening reminder</div>
            </div>
            <input type="time" id="notifEvening" value="${s.eveningTime}" class="notif-time" />
          </div>
          <div class="notif-row">
            <div class="notif-label">
              <div class="notif-title">🔥 Streak-at-risk alerts</div>
            </div>
            <label class="notif-toggle">
              <input type="checkbox" id="notifStreak" ${s.streakAlert ? "checked" : ""} />
              <span class="notif-slider"></span>
            </label>
          </div>
          <div class="notif-row">
            <div class="notif-label">
              <div class="notif-title">👥 Friend & challenge alerts</div>
            </div>
            <label class="notif-toggle">
              <input type="checkbox" id="notifSocial" ${s.socialAlert ? "checked" : ""} />
              <span class="notif-slider"></span>
            </label>
          </div>
          <button class="notif-test-btn" onclick="HabitNotifications.test('${authUserId}')">
            🔔 Send test notification
          </button>
        </div>

        <button class="notif-save-btn" onclick="HabitNotifications.saveFromUI('${authUserId}')">
          Save ✓
        </button>
      </div>`;

    // Enable toggle handler
    document.getElementById("notifEnabled")?.addEventListener("change", async (e) => {
      if (e.target.checked && !isGranted()) {
        const ok = await requestPermission();
        if (!ok) { e.target.checked = false; return; }
      }
      document.getElementById("notifDetails").style.opacity = e.target.checked ? "1" : "0.4";
      document.getElementById("notifDetails").style.pointerEvents = e.target.checked ? "all" : "none";
    });
  };

  const saveFromUI = (authUserId) => {
    const s = {
      enabled:     !!document.getElementById("notifEnabled")?.checked,
      morningTime: document.getElementById("notifMorning")?.value || "08:00",
      eveningTime: document.getElementById("notifEvening")?.value || "21:00",
      streakAlert: !!document.getElementById("notifStreak")?.checked,
      socialAlert: !!document.getElementById("notifSocial")?.checked,
    };
    saveSettings(s);
    scheduleAlarms(authUserId);
    // Feedback
    const btn = document.querySelector(".notif-save-btn");
    if (btn) { btn.textContent = "✓ Saved!"; setTimeout(() => btn.textContent = "Save ✓", 2000); }
  };

  const test = async (authUserId) => {
    if (!isGranted()) {
      const ok = await requestPermission();
      if (!ok) { alert("Please allow notifications first"); return; }
    }
    const msg = buildMessage(authUserId);
    await showLocal(msg.title, msg.body + " (test)", { tag: "habit-test" });
  };

  /* ── Init: auto-schedule on load ── */
  const init = (authUserId) => {
    if (!authUserId) return;
    scheduleAlarms(authUserId);
    // Check streak risk when opening app
    setTimeout(() => checkStreakRisk(authUserId), 3000);
  };

  return {
    init,
    requestPermission,
    isGranted,
    isSupported,
    scheduleAlarms,
    showLocal,
    alertFriendRequest,
    alertChallenge,
    checkStreakRisk,
    renderSettingsUI,
    saveFromUI,
    test,
    getSettings,
  };
})();

// Auto-expose globally
window.HabitNotifications = HabitNotifications;