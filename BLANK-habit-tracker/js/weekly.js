<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Weekly · Habit Tracker</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

/* ── Themes ── */
:root,[data-theme="dark"]{
  --bg:#09090f;--panel:#111118;--card:#161622;--border:rgba(255,255,255,0.07);
  --text:#eeeef5;--muted:#6b7280;
  --primary:#4CAF50;--primary-dim:rgba(76,175,80,0.12);--primary-glow:rgba(76,175,80,0.25);
  --done:#4ade80;--missed:#f87171;--unmarked:#374151;
  --shadow:0 4px 24px rgba(0,0,0,0.5);
}
[data-theme="light"]{--bg:#f5f6fa;--panel:#fff;--card:#f0f1f8;--border:rgba(0,0,0,0.08);--text:#111827;--muted:#6b7280;--primary:#16a34a;--primary-dim:rgba(22,163,74,0.1);--primary-glow:rgba(22,163,74,0.2);--done:#16a34a;--missed:#dc2626;--unmarked:#d1d5db;}
[data-theme="pink"]{--bg:#1a0814;--panel:#220d1a;--card:#2c1020;--border:rgba(244,114,182,0.12);--text:#fce7f3;--muted:#c084a8;--primary:#f472b6;--primary-dim:rgba(244,114,182,0.12);--primary-glow:rgba(244,114,182,0.25);--done:#f472b6;--missed:#fb7185;--unmarked:#6d2f53;}
[data-theme="blue"]{--bg:#060d1a;--panel:#0c1628;--card:#101e34;--border:rgba(96,165,250,0.1);--text:#dbeafe;--muted:#6b96cc;--primary:#60a5fa;--primary-dim:rgba(96,165,250,0.12);--primary-glow:rgba(96,165,250,0.25);--done:#34d399;--missed:#f87171;--unmarked:#1e3a5f;}
[data-theme="yellow"]{--bg:#0f0d00;--panel:#1a1600;--card:#221e00;--border:rgba(251,191,36,0.12);--text:#fef9c3;--muted:#a89020;--primary:#fbbf24;--primary-dim:rgba(251,191,36,0.12);--primary-glow:rgba(251,191,36,0.25);--done:#fbbf24;--missed:#f87171;--unmarked:#3d3600;}
[data-theme="army"]{--bg:#080f08;--panel:#0f1a0f;--card:#152015;--border:rgba(132,204,22,0.1);--text:#d9f0d9;--muted:#6b8a5a;--primary:#84cc16;--primary-dim:rgba(132,204,22,0.12);--primary-glow:rgba(132,204,22,0.25);--done:#84cc16;--missed:#f87171;--unmarked:#243320;}
[data-theme="ferrari"]{--bg:#0f0202;--panel:#1a0404;--card:#220606;--border:rgba(239,68,68,0.12);--text:#fee2e2;--muted:#996060;--primary:#ef4444;--primary-dim:rgba(239,68,68,0.12);--primary-glow:rgba(239,68,68,0.25);--done:#ef4444;--missed:#fb923c;--unmarked:#400e0e;}
[data-theme="midnight"]{--bg:#030308;--panel:#080812;--card:#0d0d1c;--border:rgba(167,139,250,0.1);--text:#ede9fe;--muted:#7c6ba0;--primary:#a78bfa;--primary-dim:rgba(167,139,250,0.12);--primary-glow:rgba(167,139,250,0.28);--done:#a78bfa;--missed:#f87171;--unmarked:#1e1a3a;}
[data-theme="ocean"]{--bg:#020c14;--panel:#051422;--card:#081c30;--border:rgba(6,182,212,0.1);--text:#cffafe;--muted:#4d8fa0;--primary:#06b6d4;--primary-dim:rgba(6,182,212,0.12);--primary-glow:rgba(6,182,212,0.25);--done:#06b6d4;--missed:#f87171;--unmarked:#0c2a40;}

body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:var(--bg);color:var(--text);min-height:100vh;padding-bottom:60px;transition:background 0.3s,color 0.3s;}

/* ─── HEADER ─── */
.header{
  display:flex;flex-wrap:wrap;align-items:center;gap:10px;
  padding:14px 18px 12px;border-bottom:1px solid var(--border);
  position:sticky;top:0;z-index:200;
  background:var(--bg);backdrop-filter:blur(12px);
}
.header-left{display:flex;align-items:center;gap:12px;flex:1;min-width:0;}
.back-btn{background:var(--card);border:1px solid var(--border);color:var(--muted);border-radius:10px;padding:6px 12px;font-size:0.78rem;font-weight:700;text-decoration:none;transition:all 0.2s;white-space:nowrap;flex-shrink:0;}
.back-btn:hover{color:var(--text);border-color:var(--primary);}
.page-title{font-size:1rem;font-weight:900;}
.week-range-label{font-size:0.7rem;color:var(--muted);margin-top:1px;}
.header-actions{display:flex;flex-wrap:wrap;gap:6px;align-items:center;}
.nav-btn{background:var(--primary);color:#fff;padding:5px 11px;border-radius:20px;border:none;font-weight:700;font-size:0.73rem;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:4px;transition:all 0.2s;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.3);}
.nav-btn:hover{transform:translateY(-1px);opacity:0.9;}
[data-theme="yellow"] .nav-btn{color:#0f0d00;}
.theme-sel{background:var(--card);border:1px solid var(--border);color:var(--text);border-radius:8px;padding:5px 7px;font-size:0.72rem;font-family:inherit;outline:none;}

/* ─── BODY ─── */
.body{max-width:900px;margin:0 auto;padding:18px 14px;}

/* ─── WEEK NAV ─── */
.week-nav{display:flex;align-items:center;justify-content:space-between;background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:10px 14px;margin-bottom:14px;}
.wnav-btn{background:var(--card);border:1px solid var(--border);color:var(--text);border-radius:8px;padding:5px 14px;font-size:0.8rem;font-weight:700;cursor:pointer;transition:all 0.15s;}
.wnav-btn:hover{border-color:var(--primary);color:var(--primary);}
.wnav-btn:disabled{opacity:0.28;cursor:default;pointer-events:none;}
.wnav-center{text-align:center;}
.wnav-title{font-size:0.88rem;font-weight:800;}
.wnav-sub{font-size:0.62rem;color:var(--muted);margin-top:2px;}

/* ─── HERO CARDS ─── */
.hero-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px;}
@media(max-width:480px){.hero-row{grid-template-columns:repeat(2,1fr);}}
.hero-card{background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:14px 10px;text-align:center;position:relative;overflow:hidden;}
.hero-card::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 50% -30%,var(--primary-dim),transparent 70%);pointer-events:none;}
.hero-val{font-size:1.5rem;font-weight:900;line-height:1;}
.hero-lbl{font-size:0.58rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);margin-top:4px;}

/* ─── MOOD BAR ─── */
.mood-bar{display:flex;align-items:center;gap:10px;background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:11px 14px;margin-bottom:14px;}
.mood-bar-lbl{font-size:0.7rem;font-weight:700;color:var(--muted);flex-shrink:0;}
.mood-btns-row{display:flex;gap:5px;flex:1;}
.mood-pick-btn{flex:1;background:var(--card);border:1px solid var(--border);border-radius:8px;font-size:1.05rem;padding:4px 2px;cursor:pointer;transition:all 0.15s;display:flex;align-items:center;justify-content:center;}
.mood-pick-btn:hover{transform:scale(1.12);}
.mood-pick-btn.sel{border-color:var(--primary);background:var(--primary-dim);}
.mood-logged{display:flex;align-items:center;gap:8px;flex:1;}
.mood-emoji-big{font-size:1.4rem;}
.mood-logged-lbl{font-size:0.82rem;font-weight:700;}
.mood-change{background:none;border:none;color:var(--muted);font-size:0.75rem;cursor:pointer;margin-left:auto;}

/* ─── 7-DAY GRID ─── */
.week-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;margin-bottom:14px;}
@media(max-width:500px){gap:4px;}
.day-col{background:var(--panel);border:1px solid var(--border);border-radius:14px;overflow:hidden;transition:border-color 0.2s;}
.day-col.today{border-color:var(--primary);box-shadow:0 0 0 1px var(--primary),0 0 16px var(--primary-glow);}
.day-col.future{opacity:0.45;}
.day-head{background:var(--card);border-bottom:1px solid var(--border);padding:7px 4px;text-align:center;}
.day-name{font-size:0.58rem;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:var(--muted);}
.day-num{font-size:1rem;font-weight:900;margin-top:1px;}
.day-col.today .day-num{color:var(--primary);}
.day-pct-label{font-size:0.52rem;color:var(--muted);margin-top:1px;}
.day-cells{padding:5px 4px;display:flex;flex-direction:column;gap:3px;}

/* ─── HABIT CELLS ─── */
.hcell{border-radius:7px;padding:4px 3px;font-size:0.62rem;font-weight:700;text-align:center;cursor:pointer;transition:all 0.14s;border:1px solid transparent;user-select:none;min-height:26px;display:flex;align-items:center;justify-content:center;}
.hcell.done{background:rgba(74,222,128,0.14);border-color:rgba(74,222,128,0.28);color:var(--done);}
.hcell.failed{background:rgba(248,113,113,0.12);border-color:rgba(248,113,113,0.24);color:var(--missed);}
.hcell.unmarked{background:var(--card);border-color:var(--border);color:var(--muted);}
.hcell.locked{background:transparent;border-color:transparent;color:transparent;cursor:default;pointer-events:none;}
.hcell:not(.locked):hover{transform:scale(1.08);filter:brightness(1.2);}
.empty-col{font-size:0.58rem;color:var(--muted);text-align:center;padding:10px 4px;}

/* ─── HABIT LIST TABLE ─── */
.habit-table{background:var(--panel);border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:14px;}
.habit-table-hdr{display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid var(--border);background:var(--card);}
.habit-table-hdr-lbl{font-size:0.62rem;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);}
.habit-row{display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid var(--border);}
.habit-row:last-child{border-bottom:none;}
.habit-row:hover{background:rgba(255,255,255,0.02);}
.hr-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.hr-name{flex:1;font-size:0.82rem;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.hr-pips{display:flex;gap:2px;flex-shrink:0;}
.pip{width:8px;height:8px;border-radius:2px;}
.pip.done{background:var(--done);}
.pip.failed{background:var(--missed);}
.pip.unmarked{background:var(--unmarked);}
.pip.locked{background:transparent;border:1px dashed var(--border);}
.hr-pct{font-size:0.75rem;font-weight:900;width:34px;text-align:right;flex-shrink:0;}
.empty-habits{padding:20px;text-align:center;font-size:0.82rem;color:var(--muted);}

/* ─── ANALYTICS ROW ─── */
.analytics-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;}
@media(max-width:520px){.analytics-row{grid-template-columns:1fr;}}
.a-card{background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:16px;}
.a-title{font-size:0.62rem;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:var(--muted);margin-bottom:12px;}

/* Donut */
.donut-wrap{display:flex;align-items:center;gap:16px;}
.donut-rel{position:relative;flex-shrink:0;width:96px;height:96px;}
#donutCanvas{width:96px;height:96px;}
.donut-overlay{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;}
.donut-pct{font-size:1.2rem;font-weight:900;}
.donut-sub{font-size:0.5rem;text-transform:uppercase;color:var(--muted);}
.legend{display:flex;flex-direction:column;gap:6px;}
.legend-item{display:flex;align-items:center;gap:6px;font-size:0.72rem;}
.leg-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0;}

/* Bars */
.bar-rows{display:flex;flex-direction:column;gap:6px;}
.bar-row{display:flex;align-items:center;gap:8px;}
.bar-day{font-size:0.62rem;font-weight:700;color:var(--muted);width:18px;flex-shrink:0;}
.bar-track{flex:1;height:8px;background:var(--card);border-radius:4px;overflow:hidden;}
.bar-fill{height:100%;border-radius:4px;transition:width 0.6s cubic-bezier(0.34,1.2,0.64,1);}
.bar-pct{font-size:0.62rem;font-weight:700;width:28px;text-align:right;flex-shrink:0;}

/* ─── QUESTS PANEL ─── */
.quests-panel{background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:14px;margin-bottom:14px;}
.quests-panel-title{font-size:0.62rem;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:var(--muted);margin-bottom:10px;}
.quest-chips{display:flex;gap:8px;flex-wrap:wrap;}
.qchip{display:flex;align-items:center;gap:8px;background:var(--card);border:1px solid var(--border);border-radius:10px;padding:8px 12px;flex:1;min-width:140px;transition:border-color 0.2s;}
.qchip.done{border-color:rgba(74,222,128,0.35);background:rgba(74,222,128,0.06);}
.qchip-icon{font-size:1.1rem;flex-shrink:0;}
.qchip-body{flex:1;}
.qchip-name{font-size:0.75rem;font-weight:800;}
.qchip-sub{font-size:0.6rem;color:var(--muted);margin-top:1px;}
.qchip-bar{height:3px;background:var(--border);border-radius:2px;margin-top:5px;overflow:hidden;}
.qchip-fill{height:100%;border-radius:2px;background:var(--primary);transition:width 0.5s ease;}
.qchip.done .qchip-fill{background:#4ade80;}

/* ─── 30-DAY HEATMAP ─── */
.heatmap-card{background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:14px;margin-bottom:14px;}
.heatmap-title{font-size:0.62rem;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:var(--muted);margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;}
.heatmap-dots{display:flex;gap:3px;flex-wrap:wrap;}
.hm-dot{width:16px;height:16px;border-radius:3px;background:var(--card);cursor:default;transition:opacity 0.2s;position:relative;}
.hm-dot:hover{opacity:0.75;}
.hm-dot.hm-today{box-shadow:0 0 0 2px var(--primary);}
.hm-dot.hm1{background:color-mix(in srgb,var(--primary) 22%,transparent);}
.hm-dot.hm2{background:color-mix(in srgb,var(--primary) 50%,transparent);}
.hm-dot.hm3{background:color-mix(in srgb,var(--primary) 78%,transparent);}
.hm-dot.hm4{background:var(--primary);}
.hm-legend{display:flex;align-items:center;gap:4px;font-size:0.56rem;color:var(--muted);margin-top:8px;}
.hm-leg-box{width:10px;height:10px;border-radius:2px;}

/* ─── BYTE MOTIVATIONAL CARD ─── */
.byte-week-card{background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:14px;display:flex;align-items:center;gap:14px;}
.byte-week-card .bwc-svg{flex-shrink:0;animation:byteFloatW 3s ease-in-out infinite;}
@keyframes byteFloatW{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
.byte-week-card .bwc-label{font-size:0.6rem;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:var(--primary);margin-bottom:3px;}
.byte-week-card .bwc-text{font-size:0.84rem;line-height:1.5;color:var(--text);}
.byte-week-card .bwc-text strong{color:var(--primary);}

/* ─── LEVEL + STREAK CARDS ─── */
.extra-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;}
@media(max-width:480px){.extra-row{grid-template-columns:1fr;}}
.extra-card{background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:14px;}
.extra-card-title{font-size:0.58rem;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:var(--muted);margin-bottom:10px;}
.xp-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}
.xp-level{font-size:1.4rem;font-weight:900;color:var(--primary);}
.xp-pts{font-size:0.7rem;color:var(--muted);}
.xp-bar{height:8px;background:var(--card);border-radius:4px;overflow:hidden;margin-bottom:4px;}
.xp-fill{height:100%;border-radius:4px;background:linear-gradient(90deg,var(--primary),color-mix(in srgb,var(--primary) 70%,#fff));transition:width 0.8s cubic-bezier(0.34,1.2,0.64,1);}
.xp-next{font-size:0.62rem;color:var(--muted);}
.streak-big{display:flex;align-items:center;gap:10px;}
.streak-num-big{font-size:2rem;font-weight:900;color:#f97316;line-height:1;}
.streak-detail{flex:1;}
.streak-detail-name{font-size:0.82rem;font-weight:800;}
.streak-detail-sub{font-size:0.65rem;color:var(--muted);margin-top:2px;}
.streak-shields{display:flex;gap:4px;margin-top:6px;}
.shield-pip{font-size:0.85rem;}

/* ─── BEST DAY BANNER ─── */
.best-day-row{display:flex;align-items:center;gap:10px;background:var(--primary-dim);border:1px solid var(--primary-glow);border-radius:10px;padding:9px 12px;margin-top:10px;}
.best-day-emoji{font-size:1.2rem;}
.best-day-text{font-size:0.75rem;color:var(--text);font-weight:700;}
.best-day-sub{font-size:0.62rem;color:var(--muted);}

/* ─── TOAST ─── */
#wkToast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:var(--panel);border:1px solid var(--primary);border-radius:12px;padding:8px 18px;font-size:0.82rem;font-weight:700;color:var(--primary);z-index:9999;opacity:0;transition:opacity 0.2s;pointer-events:none;white-space:nowrap;}
#wkToast.show{opacity:1;}

/* ─── ANIMATIONS ─── */
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.day-col{animation:fadeUp 0.3s ease both;}
.day-col:nth-child(1){animation-delay:0ms}.day-col:nth-child(2){animation-delay:35ms}
.day-col:nth-child(3){animation-delay:70ms}.day-col:nth-child(4){animation-delay:105ms}
.day-col:nth-child(5){animation-delay:140ms}.day-col:nth-child(6){animation-delay:175ms}
.day-col:nth-child(7){animation-delay:210ms}
</style>
</head>
<body>

<!-- HEADER -->
<header class="header">
  <div class="header-left">
    <a href="monthly.html" class="back-btn">← Monthly</a>
    <div>
      <div class="page-title">📅 Weekly View</div>
      <div class="week-range-label" id="weekRangeLabel"></div>
    </div>
  </div>
  <div class="header-actions">
    <a href="journal.html"     class="nav-btn">📓 Journal</a>
    <a href="stats.html"       class="nav-btn">📊 Stats</a>
    <a href="leaderboard.html" class="nav-btn">🏆</a>
    <a href="settings.html"    class="nav-btn">⚙️</a>
    <select class="theme-sel" id="themeSel" onchange="applyTheme(this.value)">
      <option value="dark">🌑 Dark</option>
      <option value="light">☀️ Light</option>
      <option value="pink">🩷 Pink</option>
      <option value="blue">💙 Blue</option>
      <option value="yellow">💛 Solar</option>
      <option value="army">🪖 Army</option>
      <option value="ferrari">🔴 Ferrari</option>
      <option value="midnight">🌌 Midnight</option>
      <option value="ocean">🌊 Ocean</option>
    </select>
  </div>
</header>

<div class="body">

  <!-- WEEK NAVIGATION -->
  <div class="week-nav">
    <button class="wnav-btn" id="prevBtn" onclick="shiftWeek(-1)">← Prev</button>
    <div class="wnav-center">
      <div class="wnav-title" id="wnavTitle">—</div>
      <div class="wnav-sub"   id="wnavSub">—</div>
    </div>
    <button class="wnav-btn" id="nextBtn" onclick="shiftWeek(1)">Next →</button>
  </div>

  <!-- BYTE MOTIVATIONAL CARD -->
  <div class="byte-week-card" id="byteWeekCard"></div>

  <!-- HERO STATS -->
  <div class="hero-row" id="heroRow"></div>

  <!-- LEVEL + STREAK EXTRA CARDS -->
  <div class="extra-row" id="extraRow">
    <div class="extra-card" id="xpCard">
      <div class="extra-card-title">⚡ XP & Level</div>
      <div id="xpCardInner"><div style="font-size:0.75rem;color:var(--muted)">Premium feature ⭐</div></div>
    </div>
    <div class="extra-card" id="streakCard">
      <div class="extra-card-title">🔥 Streak</div>
      <div id="streakCardInner"></div>
    </div>
  </div>

  <!-- MOOD BAR (today only) -->
  <div class="mood-bar" id="moodBar"></div>

  <!-- 7-DAY GRID -->
  <div class="week-grid" id="weekGrid"></div>

  <!-- HABIT TABLE -->
  <div class="habit-table" id="habitTable"></div>

  <!-- DONUT + DAILY BARS -->
  <div class="analytics-row">
    <div class="a-card">
      <div class="a-title">Week Breakdown</div>
      <div class="donut-wrap">
        <div class="donut-rel">
          <canvas id="donutCanvas" width="192" height="192"></canvas>
          <div class="donut-overlay">
            <div class="donut-pct" id="donutPct">—</div>
            <div class="donut-sub">Done</div>
          </div>
        </div>
        <div class="legend">
          <div class="legend-item"><div class="leg-dot" style="background:var(--done)"></div><span id="legDone">0 done</span></div>
          <div class="legend-item"><div class="leg-dot" style="background:var(--missed)"></div><span id="legFailed">0 failed</span></div>
          <div class="legend-item"><div class="leg-dot" style="background:var(--unmarked)"></div><span id="legUnmarked">0 open</span></div>
        </div>
      </div>
    </div>
    <div class="a-card">
      <div class="a-title">Daily Completion</div>
      <div class="bar-rows" id="dailyBars"></div>
    </div>
  </div>

  <!-- DAILY QUESTS -->
  <div class="quests-panel" id="questsPanel"></div>

  <!-- 30-DAY HEATMAP -->
  <div class="heatmap-card">
    <div class="heatmap-title">
      <span>Last 30 Days</span>
      <span id="heatmapStreak" style="font-weight:900;color:var(--primary)"></span>
    </div>
    <div class="heatmap-dots" id="heatmapDots"></div>
    <div class="hm-legend">
      <span>Less</span>
      <div class="hm-leg-box" style="background:var(--card)"></div>
      <div class="hm-leg-box hm1 hm-dot"></div>
      <div class="hm-leg-box hm2 hm-dot"></div>
      <div class="hm-leg-box hm3 hm-dot"></div>
      <div class="hm-leg-box hm4 hm-dot"></div>
      <span>More</span>
    </div>
  </div>

</div>

<div id="wkToast"></div>

<script>
/* ════════════════════════════════
   AUTH + THEME
════════════════════════════════ */
const authUser = JSON.parse(localStorage.getItem("auth_user"));
if (!authUser) { window.location.href = "auth.html"; }

window.applyTheme = (t) => {
  document.body.setAttribute("data-theme", t);
  localStorage.setItem("habitTheme", t);
  const sel = document.getElementById("themeSel");
  if (sel) sel.value = t;
};
const savedTheme = localStorage.getItem("habitTheme") || "dark";
applyTheme(savedTheme);

/* ════════════════════════════════
   DATA LAYER
════════════════════════════════ */
const SK      = `habitTracker_${authUser.id}`;
const getData = () => JSON.parse(localStorage.getItem(SK)) || {};
const setData = (d) => localStorage.setItem(SK, JSON.stringify(d));

/* ════════════════════════════════
   DATE UTILS
════════════════════════════════ */
const TODAY      = new Date();
const TODAY_STR  = fmtDate(TODAY);
const DAY_NAMES  = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const MONTH_NAMES= ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmtDate(d){ return d.toISOString().slice(0,10); }
function monthKey(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; }
function dayIdx(d)  { return d.getDate()-1; }

function getWeekDates(offset){
  const base = new Date(TODAY);
  const dow  = (base.getDay()+6)%7; // Mon=0
  base.setDate(base.getDate() - dow + offset*7);
  return Array.from({length:7},(_,i)=>{ const d=new Date(base); d.setDate(base.getDate()+i); return d; });
}

/* ════════════════════════════════
   HABIT ACCESS
════════════════════════════════ */
function getMonthTasks(d){
  const data  = getData();
  const month = data[monthKey(d)];
  return month?.tasks || [];
}

function getTaskStatus(d, taskId){
  const tasks = getMonthTasks(d);
  const task  = tasks.find(t => String(t.id)===String(taskId));
  if (!task) return "locked";
  return task.days[dayIdx(d)] || "locked";
}

function setTaskStatus(d, taskId, status){
  const data  = getData();
  const mk    = monthKey(d);
  if (!data[mk]?.tasks) return;
  const task  = data[mk].tasks.find(t => String(t.id)===String(taskId));
  if (!task) return;
  task.days[dayIdx(d)] = status;
  setData(data);
}

// All unique tasks active anywhere in the given dates
function getWeekTasks(dates){
  const seen = new Map();
  dates.forEach(d => {
    getMonthTasks(d).forEach(t => {
      if (t.days[dayIdx(d)] !== undefined && !seen.has(String(t.id)))
        seen.set(String(t.id), t.name);
    });
  });
  return [...seen.entries()].map(([id,name])=>({id,name}));
}

// Toggle cycle: unmarked → done → failed → unmarked
function toggleStatus(d, taskId){
  if (d > TODAY && fmtDate(d) !== TODAY_STR) return;
  const cur  = getTaskStatus(d, taskId);
  if (cur === "locked") return;
  const next = cur==="unmarked"?"done": cur==="done"?"failed":"unmarked";
  setTaskStatus(d, taskId, next);
  render();
  toast(next==="done"?"✅ Done!": next==="failed"?"❌ Marked failed":"⬜ Cleared");
}

/* ════════════════════════════════
   WEEK STATS
════════════════════════════════ */
function calcWeekStats(dates, tasks){
  let done=0, failed=0, unmarked=0;
  const byDay = dates.map(d=>{
    let dd=0,ff=0,uu=0;
    tasks.forEach(t=>{
      const s = getTaskStatus(d,t.id);
      if(s==="done")     {done++;dd++;}
      else if(s==="failed") {failed++;ff++;}
      else if(s==="unmarked"){unmarked++;uu++;}
    });
    const total=dd+ff+uu;
    return {done:dd,failed:ff,unmarked:uu,total,pct:total?Math.round(dd/total*100):null};
  });
  const total=done+failed+unmarked;
  return {done,failed,unmarked,total,pct:total?Math.round(done/total*100):0,byDay};
}

function calcHabitWeekPct(dates, taskId){
  let done=0, active=0;
  dates.forEach(d=>{
    const s=getTaskStatus(d,taskId);
    if(s==="locked") return;
    active++;
    if(s==="done") done++;
  });
  return active>0?Math.round(done/active*100):null;
}

/* ════════════════════════════════
   MOOD
════════════════════════════════ */
const MOODS=[
  {val:5,emoji:"🤩",label:"Amazing",color:"#4ade80"},
  {val:4,emoji:"😊",label:"Good",   color:"#a3e635"},
  {val:3,emoji:"😐",label:"Okay",   color:"#facc15"},
  {val:2,emoji:"😔",label:"Low",    color:"#fb923c"},
  {val:1,emoji:"😫",label:"Rough",  color:"#f87171"},
];

window.setMood = (val)=>{
  const data=getData();
  if(!data.moods) data.moods={};
  data.moods[TODAY_STR]={val,ts:Date.now()};
  setData(data); render();
  toast(MOODS.find(m=>m.val===val)?.emoji+" Mood logged!");
};

window.resetMood = ()=>{
  const data=getData();
  if(data.moods) delete data.moods[TODAY_STR];
  setData(data); render();
};

/* ════════════════════════════════
   DONUT CHART
════════════════════════════════ */
function drawDonut(done,failed,unmarked){
  const canvas = document.getElementById("donutCanvas");
  const dpr    = Math.min(window.devicePixelRatio||1, 2);
  const SIZE   = 96;
  canvas.width = canvas.height = SIZE*dpr;
  canvas.style.width = canvas.style.height = SIZE+"px";
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr,dpr);
  ctx.clearRect(0,0,SIZE,SIZE);

  const cs    = getComputedStyle(document.body);
  const doneC = cs.getPropertyValue("--done").trim()    ||"#4ade80";
  const failC = cs.getPropertyValue("--missed").trim()  ||"#f87171";
  const openC = cs.getPropertyValue("--unmarked").trim()||"#374151";
  const bgC   = cs.getPropertyValue("--panel").trim()   ||"#111";
  const brdC  = cs.getPropertyValue("--border").trim()  ||"rgba(255,255,255,0.07)";
  const cx    = SIZE/2, R=40, IR=26;

  const total=done+failed+unmarked;
  if(!total){
    ctx.beginPath();ctx.arc(cx,cx,R,0,Math.PI*2);
    ctx.strokeStyle=brdC;ctx.lineWidth=9;ctx.stroke();
    document.getElementById("donutPct").textContent="—";
    return;
  }

  let start=-Math.PI/2;
  [[done,doneC],[failed,failC],[unmarked,openC]].forEach(([v,c])=>{
    if(!v) return;
    const ang=(v/total)*Math.PI*2;
    ctx.beginPath();ctx.moveTo(cx,cx);
    ctx.arc(cx,cx,R,start,start+ang);
    ctx.fillStyle=c;ctx.fill();
    start+=ang;
  });
  // Inner hole
  ctx.beginPath();ctx.arc(cx,cx,IR,0,Math.PI*2);
  ctx.fillStyle=bgC;ctx.fill();

  const pct=Math.round(done/total*100);
  document.getElementById("donutPct").textContent=pct+"%";
  document.getElementById("legDone").textContent    =`${done} done`;
  document.getElementById("legFailed").textContent  =`${failed} failed`;
  document.getElementById("legUnmarked").textContent=`${unmarked} open`;
}

/* ════════════════════════════════
   WEEK OFFSET STATE
════════════════════════════════ */
let weekOffset=0;
window.shiftWeek=(dir)=>{ weekOffset=Math.min(0,weekOffset+dir); render(); };

/* ════════════════════════════════
   QUESTS
════════════════════════════════ */
function renderQuests(){
  const el  = document.getElementById("questsPanel");
  const data= getData();
  const mk  = monthKey(TODAY);
  const month=data[mk]||{tasks:[]};
  const idx  = dayIdx(TODAY);

  const active = (month.tasks||[]).filter(t=>t.days[idx]!=="locked");
  const done   = active.filter(t=>t.days[idx]==="done").length;
  const failed = active.filter(t=>t.days[idx]==="failed").length;

  const quests=[
    { icon:"🎯", name:"Hat Trick",    desc:`Do 3 habits today`, val:Math.min(done,3),   max:3 },
    { icon:"⭐", name:"Perfect Day",  desc:`All habits done`,    val:done,              max:Math.max(active.length,1), perfect:active.length>0&&done===active.length&&failed===0 },
    { icon:"🛡️", name:"No Fails",     desc:`0 failures today`,   val:failed===0?1:0,    max:1, perfect:failed===0&&active.length>0 },
    { icon:"🔥", name:"Streak Keep",  desc:`${data.loginStreak?.count||0} days`,val:Math.min(data.loginStreak?.count||0,7), max:7 },
  ];

  el.innerHTML=`<div class="quests-panel-title">🎯 Today's Quests</div><div class="quest-chips" id="qchips"></div>`;
  const chips=el.querySelector("#qchips");
  quests.forEach(q=>{
    const pct=Math.min(100,Math.round(q.val/q.max*100));
    const isDone=q.perfect!==undefined?q.perfect:pct>=100;
    const chip=document.createElement("div");
    chip.className=`qchip ${isDone?"done":""}`;
    chip.innerHTML=`
      <div class="qchip-icon">${isDone?"✅":q.icon}</div>
      <div class="qchip-body">
        <div class="qchip-name">${q.name}</div>
        <div class="qchip-sub">${q.desc}</div>
        <div class="qchip-bar"><div class="qchip-fill" style="width:${pct}%"></div></div>
      </div>`;
    chips.appendChild(chip);
  });
}

/* ════════════════════════════════
   30-DAY HEATMAP
════════════════════════════════ */
function renderHeatmap(){
  const el        = document.getElementById("heatmapDots");
  const threshold = parseInt(getData().streakThreshold)||70;
  el.innerHTML="";
  let streak=0, best=0, cur=0;

  const dots=[];
  for(let i=29;i>=0;i--){
    const d   = new Date(TODAY); d.setDate(TODAY.getDate()-i);
    const mk  = monthKey(d);
    const data= getData();
    const mo  = data[mk];
    const idx = dayIdx(d);
    let pct   = null;

    if(mo?.tasks?.length){
      const act=mo.tasks.filter(t=>t.days[idx]!=="locked");
      if(act.length){
        const dn=act.filter(t=>t.days[idx]==="done").length;
        pct=Math.round(dn/act.length*100);
      }
    }
    dots.push({d,pct,isToday:fmtDate(d)===TODAY_STR});

    // Count streak
    if(pct!==null&&pct>=threshold){ cur++; best=Math.max(best,cur); }
    else cur=0;
  }
  streak=cur;

  document.getElementById("heatmapStreak").textContent=streak>0?`🔥 ${streak} day streak`:"";

  dots.forEach(({d,pct,isToday})=>{
    const dot=document.createElement("div");
    dot.className="hm-dot"+(isToday?" hm-today":"");
    if(pct===null){}
    else if(pct>=90)  dot.classList.add("hm4");
    else if(pct>=70)  dot.classList.add("hm3");
    else if(pct>=40)  dot.classList.add("hm2");
    else if(pct>0)    dot.classList.add("hm1");
    dot.title=`${fmtDate(d)}: ${pct!==null?pct+"%":"no data"}`;
    el.appendChild(dot);
  });
}

/* ════════════════════════════════
   MAIN RENDER
════════════════════════════════ */
function render(){
  const dates   = getWeekDates(weekOffset);
  const tasks   = getWeekTasks(dates);
  const stats   = calcWeekStats(dates, tasks);
  const data    = getData();
  const isCurWk = weekOffset===0;

  /* ── Week nav labels ── */
  const fmt=(d)=>`${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
  const wkStr=`${fmt(dates[0])} – ${fmt(dates[6])} ${dates[6].getFullYear()}`;
  document.getElementById("weekRangeLabel").textContent=wkStr;
  document.getElementById("wnavTitle").textContent=wkStr;
  document.getElementById("wnavSub").textContent=
    weekOffset===0?"This week":weekOffset===-1?"Last week":`${Math.abs(weekOffset)} weeks ago`;
  document.getElementById("prevBtn").disabled=false;
  document.getElementById("nextBtn").disabled=weekOffset>=0;

  /* ── Hero row ── */
  const streak=(data.loginStreak?.count)||0;
  const xp=data.xp||{level:1};
  const gems=data.gems?.total||0;
  document.getElementById("heroRow").innerHTML=`
    <div class="hero-card">
      <div class="hero-val" style="color:var(--primary)">${stats.pct}%</div>
      <div class="hero-lbl">This Week</div>
    </div>
    <div class="hero-card">
      <div class="hero-val" style="color:#fb923c">${streak}🔥</div>
      <div class="hero-lbl">Streak</div>
    </div>
    <div class="hero-card">
      <div class="hero-val" style="color:#a78bfa">Lv ${xp.level}</div>
      <div class="hero-lbl">Level</div>
    </div>
    <div class="hero-card">
      <div class="hero-val" style="color:#facc15">${gems}💎</div>
      <div class="hero-lbl">Gems</div>
    </div>`;

  /* ── Mood bar ── */
  const moodEl  = document.getElementById("moodBar");
  const todayMood=(data.moods||{})[TODAY_STR];
  if(!isCurWk){
    moodEl.style.display="none";
  } else {
    moodEl.style.display="flex";
    if(todayMood){
      const m=MOODS.find(x=>x.val===todayMood.val)||MOODS[2];
      moodEl.innerHTML=`
        <div class="mood-bar-lbl">Today</div>
        <div class="mood-emoji-big">${m.emoji}</div>
        <div class="mood-logged-lbl" style="color:${m.color}">${m.label}</div>
        ${todayMood.note?`<div style="font-size:0.7rem;color:var(--muted);margin-left:6px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">"${todayMood.note}"</div>`:""}
        <button class="mood-change" onclick="resetMood()">↺ change</button>`;
    } else {
      moodEl.innerHTML=`
        <div class="mood-bar-lbl">Mood</div>
        <div class="mood-btns-row">
          ${MOODS.map(m=>`<button class="mood-pick-btn" onclick="setMood(${m.val})" title="${m.label}">${m.emoji}</button>`).join("")}
        </div>`;
    }
  }

  /* ── 7-day grid ── */
  const gridEl=document.getElementById("weekGrid");
  gridEl.innerHTML="";
  dates.forEach((d,i)=>{
    const isToday  = fmtDate(d)===TODAY_STR;
    const isFuture = d>TODAY&&!isToday;
    const dayStats = stats.byDay[i];
    const col=document.createElement("div");
    col.className=`day-col${isToday?" today":""}${isFuture?" future":""}`;

    col.innerHTML=`
      <div class="day-head">
        <div class="day-name">${DAY_NAMES[i]}</div>
        <div class="day-num">${d.getDate()}</div>
        <div class="day-pct-label">${dayStats.pct!==null?dayStats.pct+"%":"—"}</div>
      </div>
      <div class="day-cells" id="dcells-${i}"></div>`;
    gridEl.appendChild(col);

    const cellsEl=col.querySelector(`#dcells-${i}`);
    if(!tasks.length){
      cellsEl.innerHTML=`<div class="empty-col">—</div>`;
    } else {
      tasks.forEach(task=>{
        const s=getTaskStatus(d,task.id);
        const cell=document.createElement("div");
        cell.className=`hcell ${s}`;
        cell.title=task.name;
        cell.textContent=s==="done"?"✓":s==="failed"?"✗":s==="locked"?"":"·";
        if(s!=="locked"&&!isFuture){
          cell.onclick=()=>toggleStatus(d,task.id);
        }
        cellsEl.appendChild(cell);
      });
    }
  });

  /* ── Habit table ── */
  const tableEl=document.getElementById("habitTable");
  if(!tasks.length){
    tableEl.innerHTML=`<div class="empty-habits">No habits this week — <a href="monthly.html" style="color:var(--primary)">add some on the monthly view</a>.</div>`;
  } else {
    tableEl.innerHTML=`
      <div class="habit-table-hdr">
        <div style="width:8px"></div>
        <div class="habit-table-hdr-lbl" style="flex:1">Habit</div>
        <div class="habit-table-hdr-lbl">M T W T F S S</div>
        <div class="habit-table-hdr-lbl" style="width:34px;text-align:right">Week</div>
      </div>`;
    tasks.forEach(task=>{
      const pct=calcHabitWeekPct(dates,task.id);
      const dotColor=pct===null?"var(--muted)":pct>=80?"var(--done)":pct>=50?"#facc15":"var(--missed)";
      const pctColor=dotColor;
      const pips=dates.map(d=>`<div class="pip ${getTaskStatus(d,task.id)}"></div>`).join("");
      const row=document.createElement("div");
      row.className="habit-row";
      row.innerHTML=`
        <div class="hr-dot" style="background:${dotColor}"></div>
        <div class="hr-name" title="${task.name}">${task.name}</div>
        <div class="hr-pips">${pips}</div>
        <div class="hr-pct" style="color:${pctColor}">${pct!==null?pct+"%":"—"}</div>`;
      tableEl.appendChild(row);
    });
  }

  /* ── Byte week card ── */
  const weekPct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
  renderByteWeekCard(stats, weekPct);

  /* ── Donut ── */
  drawDonut(stats.done,stats.failed,stats.unmarked);

  /* ── Daily bars ── */
  const barsEl=document.getElementById("dailyBars");
  barsEl.innerHTML="";
  dates.forEach((d,i)=>{
    const {pct}=stats.byDay[i];
    const color=pct===null?"var(--muted)":pct>=80?"var(--done)":pct>=50?"#facc15":"var(--missed)";
    barsEl.innerHTML+=`
      <div class="bar-row">
        <div class="bar-day">${DAY_NAMES[i][0]}</div>
        <div class="bar-track"><div class="bar-fill" style="width:0%;background:${color}" data-w="${pct??0}"></div></div>
        <div class="bar-pct" style="color:${color}">${pct!==null?pct+"%":"—"}</div>
      </div>`;
  });
  requestAnimationFrame(()=>{
    barsEl.querySelectorAll(".bar-fill").forEach(b=>{setTimeout(()=>b.style.width=b.dataset.w+"%",40);});
  });

  /* ── Quests + Heatmap ── */
  renderQuests();
  renderHeatmap();
}

/* ════════════════════════════════
   TOAST
════════════════════════════════ */
let _toastTimer=null;
function toast(msg){
  const el=document.getElementById("wkToast");
  el.textContent=msg; el.classList.add("show");
  clearTimeout(_toastTimer);
  _toastTimer=setTimeout(()=>el.classList.remove("show"),1800);
}

/* ════════════════════════════════
   BYTE WEEK CARD
════════════════════════════════ */
function renderByteWeekCard(stats, weekPct) {
  const el = document.getElementById("byteWeekCard");
  if (!el) return;
  const msgs = [
    { mood:"cheer",  pct:90, text:`<strong>What a week.</strong> ${weekPct}% completion. Byte is genuinely proud of you right now.` },
    { mood:"happy",  pct:70, text:`<strong>Solid week!</strong> ${weekPct}% done. You're building real momentum here. Keep it going.` },
    { mood:"wink",   pct:50, text:`<strong>Halfway there.</strong> ${weekPct}% this week. The back half of the week is where habits are made. Let's go.` },
    { mood:"thinking",pct:0, text:`<strong>Rough week?</strong> ${weekPct}% done. That's okay — every streak starts with one good day. Make today that day.` },
  ];
  const m = msgs.find(m => weekPct >= m.pct) || msgs[msgs.length-1];

  // Simple Byte SVG for widget (no dependency on tutorial.js here)
  const svg = `<svg width="44" height="44" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="bwk" cx="45%" cy="35%" r="60%"><stop offset="0%" stop-color="#6ee7b7"/><stop offset="100%" stop-color="#059669"/></radialGradient></defs>
    <circle cx="50" cy="50" r="38" fill="url(#bwk)" filter="drop-shadow(0 3px 8px rgba(16,185,129,0.4))"/>
    <circle cx="38" cy="44" r="4.5" fill="#052e16"/><circle cx="62" cy="44" r="4.5" fill="#052e16"/>
    <path d="M34 57 Q50 68 66 57" stroke="#052e16" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <circle cx="50" cy="10" r="4" fill="#4ade80"/>
    <line x1="50" y1="12" x2="50" y2="26" stroke="#059669" stroke-width="3" stroke-linecap="round"/>
  </svg>`;

  el.innerHTML = `
    <div class="bwc-svg">${svg}</div>
    <div style="flex:1">
      <div class="bwc-label">Byte's weekly take</div>
      <div class="bwc-text">${m.text}</div>
    </div>`;
}

/* ════════════════════════════════
   XP + STREAK EXTRA CARDS
════════════════════════════════ */
function renderExtraCards() {
  const data = getData();

  // XP card
  const xpEl = document.getElementById("xpCardInner");
  if (xpEl) {
    const isPrem = window.HabitPremium?.isPremium?.() || false;
    if (isPrem && data.xp) {
      const XP_PER_LEVEL = 100;
      const totalXP = data.xp.total || 0;
      const level   = Math.floor(totalXP / XP_PER_LEVEL) + 1;
      const inLevel  = totalXP % XP_PER_LEVEL;
      const pct = Math.round((inLevel / XP_PER_LEVEL) * 100);
      xpEl.innerHTML = `
        <div class="xp-row">
          <div class="xp-level">Lv ${level}</div>
          <div class="xp-pts">${totalXP} XP total</div>
        </div>
        <div class="xp-bar"><div class="xp-fill" id="xpFillBar" style="width:0%"></div></div>
        <div class="xp-next">${inLevel} / ${XP_PER_LEVEL} XP to next level</div>`;
      setTimeout(() => {
        const bar = document.getElementById("xpFillBar");
        if (bar) bar.style.width = pct + "%";
      }, 200);
    } else {
      xpEl.innerHTML = `
        <div style="font-size:0.75rem;color:var(--muted);line-height:1.5">
          XP &amp; levels are Premium features.<br>
          <a href="upgrade.html" style="color:var(--primary);font-weight:800;text-decoration:none">⭐ Try free for 7 days →</a>
        </div>`;
    }
  }

  // Streak card
  const strEl = document.getElementById("streakCardInner");
  if (strEl) {
    const month  = data[`month_${new Date().getFullYear()}_${new Date().getMonth()}`];
    let streak = 0;
    if (month?.tasks?.length) {
      const today = new Date().getDate() - 1;
      for (let d = today; d >= 0; d--) {
        const allDone = month.tasks.every(t => t.days[d] === "done" || t.days[d] === "locked");
        if (allDone) streak++; else break;
      }
    }
    const shields = data.shields?.count || 0;
    const longest = data.longestStreak || streak;
    strEl.innerHTML = `
      <div class="streak-big">
        <div class="streak-num-big">${streak > 0 ? "🔥" : "💤"} ${streak}</div>
        <div class="streak-detail">
          <div class="streak-detail-name">day streak</div>
          <div class="streak-detail-sub">Best: ${longest} days</div>
        </div>
      </div>
      ${shields > 0 ? `<div class="streak-shields">${"🛡️".repeat(Math.min(shields,5))} <span style="font-size:0.65rem;color:var(--muted);margin-left:4px">${shields} shield${shields>1?"s":""} ready</span></div>` : ""}`;

    // Best day of week
    const dayTotals = Array(7).fill(0).map((_,i) => ({ day:i, count:0, total:0 }));
    if (month?.tasks) {
      month.tasks.forEach(task => {
        task.days.forEach((s, d) => {
          const dow = (new Date(new Date().getFullYear(), new Date().getMonth(), d+1).getDay()+6)%7;
          dayTotals[dow].total++;
          if (s === "done") dayTotals[dow].count++;
        });
      });
    }
    const best = dayTotals.filter(d=>d.total>0).sort((a,b)=>(b.count/b.total)-(a.count/a.total))[0];
    const dayNames = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    if (best && best.total > 0) {
      const pct = Math.round((best.count/best.total)*100);
      strEl.innerHTML += `
        <div class="best-day-row">
          <div class="best-day-emoji">📅</div>
          <div>
            <div class="best-day-text">${dayNames[best.day]} is your best day</div>
            <div class="best-day-sub">${pct}% completion rate</div>
          </div>
        </div>`;
    }
  }
}

/* ════════════════════════════════
   INIT
════════════════════════════════ */
render();
renderExtraCards();
window.addEventListener("resize",()=>{ drawDonut(0,0,0); render(); });
</script>
<script src="js/byte-widget.js"></script>
</body>
</html>