/* =========================
   GLOBAL APP STATE
   ========================= */

const AppState = {
  year: 2026,
  month: null,          // 0–11
  day: null,            // 1–31
  tasks: [],            // task objects
  data: {},             // all habit data
};

/* =========================
   CONSTANTS
   ========================= */

const STATUS = {
  DONE: "done",
  MISSED: "missed",
  UNMARKED: "unmarked",
};

const STORAGE_KEY = "habit_tracker_2026";

/* =========================
   DATE HELPERS
   ========================= */

function getToday() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth(),
    day: now.getDate(),
  };
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function monthKey(year, month) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function dayKey(day) {
  return String(day).padStart(2, "0");
}

/* =========================
   STORAGE
   ========================= */

function loadStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    Object.assign(AppState, parsed);
  } catch (e) {
    console.error("Corrupt storage, resetting.");
    localStorage.removeItem(STORAGE_KEY);
  }
}

function saveStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(AppState));
}

/* =========================
   INIT
   ========================= */

function initState() {
  loadStorage();

  const today = getToday();

  AppState.year = 2026;
  AppState.month ??= today.month;
  AppState.day ??= today.day;

  ensureMonthStructure(AppState.year, AppState.month);
  saveStorage();
}

/* =========================
   MONTH STRUCTURE
   ========================= */

function ensureMonthStructure(year, month) {
  const mKey = monthKey(year, month);

  if (!AppState.data[mKey]) {
    AppState.data[mKey] = {
      tasks: {},
      summary: {},
    };
  }

  const days = daysInMonth(year, month);

  // Ensure each task has daily entries
  AppState.tasks.forEach(task => {
    if (!AppState.data[mKey].tasks[task.id]) {
      AppState.data[mKey].tasks[task.id] = {};
    }

    for (let d = 1; d <= days; d++) {
      const dk = dayKey(d);
      AppState.data[mKey].tasks[task.id][dk] ??= STATUS.UNMARKED;
    }
  });

  calculateMonthSummary(year, month);
}

/* =========================
   TASK MANAGEMENT
   ========================= */

function createTask(name) {
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    createdAt: Date.now(),
  };
}

function addTask(name) {
  if (!name.trim()) return;

  const task = createTask(name);
  AppState.tasks.push(task);

  // Add task to all existing months
  Object.keys(AppState.data).forEach(mKey => {
    AppState.data[mKey].tasks[task.id] = {};
  });

  ensureMonthStructure(AppState.year, AppState.month);
  saveStorage();
}

function deleteTask(taskId) {
  AppState.tasks = AppState.tasks.filter(t => t.id !== taskId);

  Object.keys(AppState.data).forEach(mKey => {
    delete AppState.data[mKey].tasks[taskId];
  });

  saveStorage();
}

/* =========================
   DAILY STATUS
   ========================= */

function setTaskStatus(taskId, day, status) {
  const mKey = monthKey(AppState.year, AppState.month);
  const dk = dayKey(day);

  if (!AppState.data[mKey]) return;
  if (!AppState.data[mKey].tasks[taskId]) return;

  AppState.data[mKey].tasks[taskId][dk] = status;
  calculateMonthSummary(AppState.year, AppState.month);
  saveStorage();
}

function getTaskStatus(taskId, day) {
  const mKey = monthKey(AppState.year, AppState.month);
  const dk = dayKey(day);

  return (
    AppState.data[mKey]?.tasks?.[taskId]?.[dk] ??
    STATUS.UNMARKED
  );
}

/* =========================
   MONTH SUMMARY
   ========================= */

function calculateMonthSummary(year, month) {
  const mKey = monthKey(year, month);
  const days = daysInMonth(year, month);

  const summary = {};

  for (let d = 1; d <= days; d++) {
    summary[dayKey(d)] = {
      done: 0,
      missed: 0,
      unmarked: 0,
      total: AppState.tasks.length,
    };
  }

  AppState.tasks.forEach(task => {
    for (let d = 1; d <= days; d++) {
      const dk = dayKey(d);
      const status =
        AppState.data[mKey].tasks[task.id]?.[dk] ??
        STATUS.UNMARKED;

      summary[dk][status]++;
    }
  });

  AppState.data[mKey].summary = summary;
}

/* =========================
   MONTH SWITCHING
   ========================= */

function switchMonth(monthIndex) {
  AppState.month = monthIndex;
  ensureMonthStructure(AppState.year, monthIndex);
  saveStorage();
}

/* =========================
   PROGRESS CALCULATIONS
   ========================= */

function getMonthProgressPercent() {
  const mKey = monthKey(AppState.year, AppState.month);
  const summary = AppState.data[mKey].summary;

  let done = 0;
  let total = 0;

  Object.values(summary).forEach(day => {
    done += day.done;
    total += day.total;
  });

  return total === 0 ? 0 : Math.round((done / total) * 100);
}

function getTaskProgress(taskId) {
  const mKey = monthKey(AppState.year, AppState.month);
  const days = daysInMonth(AppState.year, AppState.month);

  let done = 0;

  for (let d = 1; d <= days; d++) {
    if (
      AppState.data[mKey].tasks[taskId]?.[dayKey(d)] ===
      STATUS.DONE
    ) {
      done++;
    }
  }

  return Math.round((done / days) * 100);
}

/* =========================
   WEEK CALCULATION (FUTURE)
   ========================= */

function getWeekOfYear(date = new Date()) {
  const firstDay = new Date(date.getFullYear(), 0, 1);
  const pastDays =
    (date - firstDay) / 86400000;
  return Math.ceil((pastDays + firstDay.getDay() + 1) / 7);
}

/* =========================
   DEBUG (REMOVE LATER)
   ========================= */

// window.AppState = AppState;
// window.addTask = addTask;
// window.setTaskStatus = setTaskStatus;
