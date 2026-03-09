/* =========================
   MONTHLY RENDER ENGINE
   ========================= */

function renderMonthView() {
  renderMonthHeader();
  renderTaskGrid();
  renderSummaryTable();
}

/* =========================
   MONTH HEADER
   ========================= */

function renderMonthHeader() {
  const container = document.getElementById("monthHeader");
  container.innerHTML = "";

  const monthName = new Date(
    AppState.year,
    AppState.month
  ).toLocaleString("default", { month: "long" }).toUpperCase();

  const mKey = `${AppState.year}-${String(AppState.month + 1).padStart(2, "0")}`;
  const summary = AppState.data[mKey].summary;

  let done = 0;
  let missed = 0;
  let unmarked = 0;

  Object.values(summary).forEach(day => {
    done += day.done;
    missed += day.missed;
    unmarked += day.unmarked;
  });

  container.innerHTML = `
    <div class="month-title">${monthName}</div>
    <div class="month-stats">
      <span>${AppState.tasks.length} Tasks</span>
      <span class="done">${done} Done</span>
      <span class="missed">${missed} Failed</span>
      <span class="unmarked">${unmarked} Unmarked</span>
    </div>
  `;
}

/* =========================
   TASK GRID
   ========================= */

function renderTaskGrid() {
  const container = document.getElementById("taskGrid");
  container.innerHTML = "";

  const days = daysInMonth(AppState.year, AppState.month);

  // HEADER ROW (DAYS)
  const headerRow = document.createElement("div");
  headerRow.className = "grid-row header";

  const taskHeader = document.createElement("div");
  taskHeader.className = "task-cell header";
  taskHeader.textContent = "MY HABITS";

  headerRow.appendChild(taskHeader);

  for (let d = 1; d <= days; d++) {
    const dayCell = document.createElement("div");
    dayCell.className = "day-cell header";
    dayCell.textContent = d;
    headerRow.appendChild(dayCell);
  }

  container.appendChild(headerRow);

  // TASK ROWS
  AppState.tasks.forEach((task, index) => {
    const row = document.createElement("div");
    row.className = "grid-row";

    // TASK NAME
    const taskCell = document.createElement("div");
    taskCell.className = "task-cell";
    taskCell.innerHTML = `
      <span class="task-index">${index + 1}.</span>
      <span class="task-name">${task.name}</span>
      <button class="delete-task" data-id="${task.id}">×</button>
    `;

    row.appendChild(taskCell);

    // DAY CELLS
    for (let d = 1; d <= days; d++) {
      const status = getTaskStatus(task.id, d);

      const cell = document.createElement("div");
      cell.className = `day-cell ${status}`;
      cell.dataset.task = task.id;
      cell.dataset.day = d;

      row.appendChild(cell);
    }

    container.appendChild(row);
  });
}

/* =========================
   SUMMARY TABLE (EXCEL STYLE)
   ========================= */

function renderSummaryTable() {
  const container = document.getElementById("summaryTable");
  container.innerHTML = "";

  const days = daysInMonth(AppState.year, AppState.month);
  const mKey = `${AppState.year}-${String(AppState.month + 1).padStart(2, "0")}`;
  const summary = AppState.data[mKey].summary;

  const table = document.createElement("table");
  table.className = "summary-table";

  // HEADER
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");

  headRow.innerHTML = `<th>DAY</th>`;
  for (let d = 1; d <= days; d++) {
    headRow.innerHTML += `<th>${d}</th>`;
  }

  thead.appendChild(headRow);
  table.appendChild(thead);

  // BODY
  const tbody = document.createElement("tbody");

  ["done", "missed", "unmarked"].forEach(type => {
    const row = document.createElement("tr");
    row.className = type;

    const label =
      type === "done"
        ? "COMPLETED"
        : type === "missed"
        ? "FAILED"
        : "UNMARKED";

    row.innerHTML = `<td>${label}</td>`;

    for (let d = 1; d <= days; d++) {
      row.innerHTML += `<td>${summary[String(d).padStart(2, "0")][type]}</td>`;
    }

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  container.appendChild(table);
}

/* =========================
   MONTH BUTTONS
   ========================= */

function renderMonthButtons() {
  const container = document.getElementById("monthButtons");
  container.innerHTML = "";

  for (let m = 0; m < 12; m++) {
    const btn = document.createElement("button");
    btn.textContent = new Date(2026, m).toLocaleString("default", {
      month: "short",
    });

    btn.onclick = () => {
      switchMonth(m);
      renderMonthView();
    };

    container.appendChild(btn);
  }
}
