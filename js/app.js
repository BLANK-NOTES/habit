document.addEventListener("DOMContentLoaded", () => {

/* =========================
   DOM ELEMENTS (SAFE)
   ========================= */
const habitForm  = document.getElementById("habit-form");
const habitInput = document.getElementById("habit-input");
const habitList  = document.getElementById("habit-list");
const themeSelect = document.getElementById("theme-select");
// Make addHabit() global for other scripts like monthly.js
window.addHabit = addHabit;


/* =========================
   STORAGE
   ========================= */
const STORAGE_KEY = "habitTrackerHabits";
let habits = [];

/* =========================
   DATE HELPERS
   ========================= */
function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      date: formatDate(d),
      label: d.toLocaleDateString("en-US", { weekday: "short" }).charAt(0),
      status: "none"
    });
  }
  return days;
}

/* =========================
   WEEK ROLLING (CRITICAL FIX)
   ========================= */
function normalizeWeeklyHistory(history) {
  const today = formatDate(new Date());
  const last = history.at(-1)?.date;

  if (last === today) return history;

  const fresh = getLast7Days();
  fresh.forEach(day => {
    const old = history.find(h => h.date === day.date);
    if (old) day.status = old.status;
  });

  return fresh;
}

/* =========================
   LOAD & SAVE
   ========================= */
function saveHabits() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
}

function loadHabits() {
  const data = localStorage.getItem(STORAGE_KEY);
  habits = data ? JSON.parse(data) : [];

  habits.forEach(h => {
    h.weeklyHistory = normalizeWeeklyHistory(h.weeklyHistory);
  });
}

/* =========================
   HABIT LOGIC
   ========================= */
function addHabit(name, schedule = { type: "daily" }) {
  if (!name) return;

  // Initialize weekly history
  let weeklyHistory = getLast7Days();

  // Adjust weeklyHistory based on schedule
  if (schedule.type === "weekly" && Array.isArray(schedule.days)) {
    weeklyHistory = weeklyHistory.map(day => ({
      ...day,
      status: schedule.days.includes(new Date(day.date).getDay()) ? "none" : "locked"
    }));
  }

  if (schedule.type === "interval" && schedule.interval) {
    // Only enable first day, others locked until interval passes
    weeklyHistory = weeklyHistory.map((day, index) => ({
      ...day,
      status: index % schedule.interval === 0 ? "none" : "locked"
    }));
  }

  habits.push({
    id: Date.now(),
    name,
    schedule,       // store schedule object
    weeklyHistory
  });

  saveHabits();
  renderHabits();
}


function cycleStatus(habitId, date) {
  const habit = habits.find(h => h.id === habitId);
  if (!habit) return;

  const day = habit.weeklyHistory.find(d => d.date === date);
  if (!day) return;

  day.status =
    day.status === "none"   ? "done" :
    day.status === "done"   ? "missed" :
                              "none";

  saveHabits();
  renderHabits();
}

/* =========================
   THEME SYSTEM (CRASH-PROOF)
   ========================= */
const savedTheme = localStorage.getItem("habitTheme") || "light";
document.body.setAttribute("data-theme", savedTheme);

if (themeSelect) {
  themeSelect.value = savedTheme;

  themeSelect.addEventListener("change", () => {
    const theme = themeSelect.value;
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("habitTheme", theme);

    requestAnimationFrame(() => {
      renderWeeklyDonut();
      renderWeeklyBars();
    });
  });
}

function getThemeColors() {
  const styles = getComputedStyle(document.body);
  return {
    done: styles.getPropertyValue("--done").trim() || "#4ade80",
    missed: styles.getPropertyValue("--missed").trim() || "#ef4444",
    none: styles.getPropertyValue("--none").trim() || "#9ca3af",
    bg: styles.getPropertyValue("--bg-card").trim() || "#ffffff",
    text: styles.getPropertyValue("--text-main").trim() || "#000000"
  };
}

/* =========================
   CANVAS HELPER (RETINA FIX)
   ========================= */
function prepCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width  = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  return ctx;
}

/* =========================
   DONUT GRAPH
   ========================= */
function renderWeeklyDonut() {
  const canvas = document.getElementById("weeklyDonut");
  if (!canvas) return;

  const ctx = prepCanvas(canvas);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let done = 0, missed = 0, none = 0;

  habits.forEach(h =>
    h.weeklyHistory.forEach(d => {
      if (d.status === "done") done++;
      else if (d.status === "missed") missed++;
      else none++;
    })
  );

  const total = done + missed + none;
  if (!total) return;

  const colors = getThemeColors();
  const center = canvas.clientWidth / 2;
  const radius = 70;
  let start = -Math.PI / 2;

  [[done, colors.done], [missed, colors.missed], [none, colors.none]]
    .forEach(([value, color]) => {
      const angle = (value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, start, start + angle);
      ctx.fillStyle = color;
      ctx.fill();
      start += angle;
    });

  ctx.beginPath();
  ctx.arc(center, center, 40, 0, Math.PI * 2);
  ctx.fillStyle = colors.bg;
  ctx.fill();
}

/* =========================
   BAR GRAPH (ORDER FIXED)
   ========================= */
function renderWeeklyBars() {
  const canvas = document.getElementById("weeklyBars");
  if (!canvas) return;

  const ctx = prepCanvas(canvas);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const colors = getThemeColors();
  const order = ["M","T","W","T","F","S","S"];
  const days = {};

  habits.forEach(h =>
    h.weeklyHistory.forEach(d => {
      days[d.label] ??= { done: 0, missed: 0 };
      if (d.status === "done") days[d.label].done++;
      if (d.status === "missed") days[d.label].missed++;
    })
  );

  const labels = order.filter(l => days[l]);
  if (!labels.length) return;

  const max = Math.max(...labels.map(l => Math.max(days[l].done, days[l].missed)), 1);
  const padding = 30, barW = 14, gap = 28;
  const h = canvas.clientHeight - padding * 2;

  labels.forEach((l, i) => {
    const x = padding + i * gap * 2;

    ctx.fillStyle = colors.done;
    ctx.fillRect(x, canvas.clientHeight - padding - (days[l].done / max) * h, barW, (days[l].done / max) * h);

    ctx.fillStyle = colors.missed;
    ctx.fillRect(x + barW + 6, canvas.clientHeight - padding - (days[l].missed / max) * h, barW, (days[l].missed / max) * h);

    ctx.fillStyle = colors.text;
    ctx.textAlign = "center";
    ctx.fillText(l, x + barW, canvas.clientHeight - 8);
  });
}

/* =========================
   RENDER UI
   ========================= */
function renderHabits() {
  if (!habitList) return;

  habitList.innerHTML = "";

  habits.forEach(habit => {
    const li = document.createElement("li");
    li.className = "habit-item";

    const week = document.createElement("div");
    week.className = "habit-week";

    habit.weeklyHistory.forEach(day => {
      const box = document.createElement("div");
      box.className = `habit-day ${day.status}`;
      box.innerHTML = `<span>${day.label}</span>`;
      box.onclick = () => cycleStatus(habit.id, day.date);
      week.appendChild(box);
    });

    const name = document.createElement("div");
    name.className = "habit-name";
    name.textContent = habit.name;

    const del = document.createElement("button");
    del.className = "delete-btn";
    del.textContent = "🗑";
    del.onclick = () => deleteHabit(habit.id);

    li.append(week, name, del);
    habitList.appendChild(li);
  });

  renderWeeklyDonut();
  renderWeeklyBars();
}

/* =========================
   EVENTS (SAFE)
   ========================= */
habitForm?.addEventListener("submit", e => {
  e.preventDefault();
  addHabit(habitInput.value.trim());
  habitInput.value = "";
});

/* =========================
   INIT
   ========================= */
loadHabits();
renderHabits();

});


