/* =========================
   STORAGE ENGINE
   =========================
   Handles:
   - Year → Month → Day structure
   - Tasks (habits renamed to tasks)
   - Daily status tracking
   - Monthly & daily summaries
   ========================= */

"use strict";

/* =========================
   CONSTANTS
   ========================= */
const STORAGE_KEY = "taskTrackerData";
const DEFAULT_YEAR = 2026;

/* =========================
   DATE HELPERS
   ========================= */
function getDaysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function getMonthKey(monthIndex) {
  return String(monthIndex + 1).padStart(2, "0"); // "01" - "12"
}

function todayParts() {
  const d = new Date();
  return {
    year: d.getFullYear(),
    month: d.getMonth(),
    day: d.getDate()
  };
}

/* =========================
   BASE STRUCTURE
   ========================= */
function createEmptyMonth(year, monthIndex) {
  const days = getDaysInMonth(year, monthIndex);
  const dayMap = {};

  for (let d = 1; d <= days; d++) {
    dayMap[d] = {
      done: 0,
      failed: 0,
      unmarked: 0
    };
  }

  return {
    tasks: {},
    days: dayMap
  };
}

function createEmptyTask(name, year, monthIndex) {
  const days = getDaysInMonth(year, monthIndex);
  const statusMap = {};

  for (let d = 1; d <= days; d++) {
    statusMap[d] = "unmarked";
  }

  return {
    id: crypto.randomUUID(),
    name,
    status: statusMap
  };
}

/* =========================
   LOAD / SAVE
   ========================= */
function loadStore() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

/* =========================
   ENSURE STRUCTURE
   ========================= */
function ensureMonth(store, year, monthIndex) {
  if (!store[year]) store[year] = {};

  const key = getMonthKey(monthIndex);

  if (!store[year][key]) {
    store[year][key] = createEmptyMonth(year, monthIndex);
  }

  return store[year][key];
}

/* =========================
   TASK OPERATIONS
   ========================= */
function addTask(name, year, monthIndex) {
  const store = loadStore();
  const month = ensureMonth(store, year, monthIndex);

  const task = createEmptyTask(name, year, monthIndex);
  month.tasks[task.id] = task;

  saveStore(store);
  return task;
}

function deleteTask(taskId, year, monthIndex) {
  const store = loadStore();
  const month = ensureMonth(store, year, monthIndex);

  delete month.tasks[taskId];
  recalcMonthStats(month);

  saveStore(store);
}

/* =========================
   STATUS UPDATE
   ========================= */
function setTaskStatus(taskId, year, monthIndex, day, status) {
  const store = loadStore();
  const month = ensureMonth(store, year, monthIndex);
  const task = month.tasks[taskId];

  if (!task) return;

  task.status[day] = status;
  recalcMonthStats(month);

  saveStore(store);
}

/* =========================
   AGGREGATION
   ========================= */
function recalcMonthStats(month) {
  // reset
  Object.values(month.days).forEach(d => {
    d.done = 0;
    d.failed = 0;
    d.unmarked = 0;
  });

  Object.values(month.tasks).forEach(task => {
    Object.entries(task.status).forEach(([day, state]) => {
      month.days[day][state]++;
    });
  });
}

/* =========================
   READ HELPERS
   ========================= */
function getMonthData(year, monthIndex) {
  const store = loadStore();
  return ensureMonth(store, year, monthIndex);
}

function getAllYears() {
  return Object.keys(loadStore()).map(Number);
}

function getTaskCount(year, monthIndex) {
  const month = getMonthData(year, monthIndex);
  return Object.keys(month.tasks).length;
}

/* =========================
   PUBLIC API
   ========================= */
window.storage = {
  addTask,
  deleteTask,
  setTaskStatus,
  getMonthData,
  getTaskCount,
  getAllYears,
  todayParts
};
