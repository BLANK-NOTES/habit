/* ═══════════════════════════════════════════════════════════════
   SECURITY MODULE — habitSecurity.js
   Handles: XSS prevention, input sanitisation, CSP helpers,
            rate limiting, data integrity, prototype pollution guard
═══════════════════════════════════════════════════════════════ */

(function(global) {
  'use strict';

  /* ── 1. FREEZE DANGEROUS GLOBALS ── */
  // Prevent prototype pollution attacks (__proto__, constructor, etc.)
  const _freeze = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    Object.getOwnPropertyNames(obj).forEach(k => {
      try { if (obj[k] && typeof obj[k] === 'object') Object.freeze(obj[k]); } catch(e) {}
    });
  };
  try {
    // Block __proto__ injection
    Object.defineProperty(Object.prototype, '__proto__', {
      get() { return Object.getPrototypeOf(this); },
      set(v) {
        if (this === Object.prototype || this === Array.prototype) {
          console.warn('[Security] Blocked prototype pollution attempt');
          return;
        }
        Object.setPrototypeOf(this, v);
      },
      configurable: false
    });
  } catch(e) { /* already defined */ }

  /* ── 2. HTML ESCAPE — the core defence against XSS ── */
  const ESCAPE_MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  };

  function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"'`=\/]/g, s => ESCAPE_MAP[s] || s);
  }

  /* ── 3. INPUT SANITISATION ── */

  // Strip all HTML tags and dangerous patterns from a string
  function sanitizeText(str, opts = {}) {
    if (str === null || str === undefined) return '';
    str = String(str);
    const { maxLen = 1000, allowNewlines = false } = opts;

    // Remove null bytes
    str = str.replace(/ /g, '');

    // Remove HTML tags
    str = str.replace(/<[^>]*>/g, '');

    // Remove javascript: and data: URIs
    str = str.replace(/javascript\s*:/gi, '');
    str = str.replace(/data\s*:\s*text\/html/gi, '');
    str = str.replace(/vbscript\s*:/gi, '');

    // Remove event handlers (onclick, onerror, etc.)
    str = str.replace(/on\w+\s*=/gi, '');

    // Remove script/style/iframe/object patterns
    str = str.replace(/(script|style|iframe|object|embed|form|input|svg|math)/gi, (m) =>
      m.split('').join('\u200b') // zero-width space to break pattern without losing content
    );

    // Trim and length-limit
    str = str.trim().slice(0, maxLen);

    // Optionally strip newlines (for single-line fields like names)
    if (!allowNewlines) str = str.replace(/[\r\n\t]/g, ' ');

    return str;
  }

  // Validate and sanitise a habit/display name (single line, printable chars)
  function sanitizeName(str, maxLen = 60) {
    if (!str) return '';
    str = sanitizeText(str, { maxLen, allowNewlines: false });
    // Remove control characters
    str = str.replace(/[\x00-\x1F\x7F]/g, '');
    return str.trim();
  }

  // Sanitise journal text (allows newlines, but still strips HTML)
  function sanitizeJournalText(str, maxLen = 1000) {
    return sanitizeText(str, { maxLen, allowNewlines: true });
  }

  // Validate that a string is a safe colour (CSS color or hex)
  function sanitizeColor(str) {
    if (!str) return '#4CAF50';
    if (/^#[0-9a-fA-F]{3,8}$/.test(str)) return str;
    if (/^rgba?\(/.test(str) && !/[;({]/.test(str)) return str;
    return '#4CAF50'; // safe fallback
  }

  // Validate emoji (only allow actual emoji codepoints, not HTML)
  function sanitizeEmoji(str) {
    if (!str) return '😊';
    // Strip anything that looks like HTML or JS
    str = String(str).replace(/<[^>]*>/g, '').replace(/&[#a-z0-9]+;/gi, '').trim();
    // Limit to 2 characters (most emoji are 2 chars in JS due to surrogate pairs, some longer)
    return str.slice(0, 4) || '😊';
  }

  // Safe integer parse
  function sanitizeInt(val, { min = 0, max = 999999, fallback = 0 } = {}) {
    const n = parseInt(val, 10);
    if (isNaN(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  }

  // Validate month key format (YYYY-MM)
  function isValidMonthKey(key) {
    return typeof key === 'string' && /^\d{4}-\d{2}$/.test(key);
  }

  // Validate date key format (YYYY-MM-DD)
  function isValidDateKey(key) {
    return typeof key === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(key);
  }

  /* ── 4. SAFE DOM HELPERS ── */
  // Use these instead of element.innerHTML = userContent

  // Set text content safely (never interprets HTML)
  function safeText(el, text) {
    if (!el) return;
    el.textContent = String(text ?? '');
  }

  // Build an element with safe attributes (no raw HTML from user data)
  function safeEl(tag, { cls = '', text = '', html = '', attrs = {} } = {}) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text) el.textContent = text;
    if (html) el.innerHTML = html; // only use for TRUSTED static strings, never user data
    Object.entries(attrs).forEach(([k, v]) => {
      // Whitelist safe attributes
      const SAFE_ATTRS = ['type','placeholder','value','min','max','step','disabled',
                          'checked','selected','href','src','title','aria-label',
                          'data-val','data-idx','data-id','tabindex','autocomplete'];
      if (SAFE_ATTRS.includes(k)) el.setAttribute(k, String(v));
    });
    return el;
  }

  /* ── 5. DATA VALIDATION — sanitise on READ from localStorage ── */
  // Validate and sanitise a task object from storage
  function sanitizeTask(task) {
    if (!task || typeof task !== 'object') return null;
    return {
      id:           sanitizeInt(task.id, { min: 0, max: 1e15, fallback: Date.now() }),
      name:         sanitizeName(task.name, 80),
      category:     sanitizeCategory(task.category),
      scheduledTime:sanitizeTime(task.scheduledTime),
      createdDay:   sanitizeInt(task.createdDay, { min: 0, max: 366 }),
      startDate:    isValidDateKey((task.startDate || '').slice(0,10)) ? task.startDate : new Date().toISOString(),
      schedule:     sanitizeSchedule(task.schedule),
      days:         sanitizeDays(task.days),
      graceLimit:   sanitizeInt(task.graceLimit, { min: 0, max: 10 }),
      graceUsed:    sanitizeInt(task.graceUsed,  { min: 0, max: 10 }),
      carryOver:    task.carryOver === true,
    };
  }

  function sanitizeCategory(cat) {
    const VALID = ['general','fitness','health','mindful','learning','productive','nutrition','social','balance'];
    return VALID.includes(cat) ? cat : 'general';
  }

  function sanitizeTime(t) {
    if (!t) return '';
    if (/^\d{2}:\d{2}$/.test(t)) return t;
    return '';
  }

  function sanitizeSchedule(s) {
    if (!s || typeof s !== 'object') return { type: 'daily' };
    const TYPES = ['daily','weekly','interval'];
    const type = TYPES.includes(s.type) ? s.type : 'daily';
    const schedule = { type };
    if (type === 'weekly' && Array.isArray(s.days)) {
      schedule.days = s.days.map(d => sanitizeInt(d, { min:0, max:6 })).filter(d => d >= 0 && d <= 6);
    }
    if (type === 'interval') {
      schedule.interval = sanitizeInt(s.interval, { min: 1, max: 90, fallback: 1 });
    }
    return schedule;
  }

  function sanitizeDays(days) {
    if (!Array.isArray(days)) return [];
    const VALID_STATES = ['locked','unmarked','done','failed','missed'];
    return days.slice(0, 366).map(d => VALID_STATES.includes(d) ? d : 'locked');
  }

  /* ── 6. RATE LIMITING ── */
  const _rateLimits = {};
  function rateLimit(key, maxCalls, windowMs) {
    const now = Date.now();
    if (!_rateLimits[key]) _rateLimits[key] = { calls: [], blocked: false };
    const rl = _rateLimits[key];
    // Clear old calls outside window
    rl.calls = rl.calls.filter(t => now - t < windowMs);
    if (rl.calls.length >= maxCalls) {
      console.warn(`[Security] Rate limit hit: ${key} (${maxCalls} per ${windowMs}ms)`);
      return false; // blocked
    }
    rl.calls.push(now);
    return true; // allowed
  }

  /* ── 7. localStorage INTEGRITY ── */
  // Safe wrapper around localStorage.getItem with size validation
  function safeGetStorage(key, fallback = null) {
    try {
      const val = localStorage.getItem(key);
      if (!val) return fallback;
      // Check size sanity (prevent >10MB stored object attacks)
      if (val.length > 10 * 1024 * 1024) {
        console.warn('[Security] localStorage item too large, ignoring:', key);
        return fallback;
      }
      return JSON.parse(val);
    } catch(e) {
      console.warn('[Security] Failed to parse localStorage key:', key, e.message);
      return fallback;
    }
  }

  // Safe wrapper around localStorage.setItem with quota management
  function safeSetStorage(key, data) {
    try {
      const str = JSON.stringify(data);
      if (str.length > 10 * 1024 * 1024) {
        console.warn('[Security] Data too large to store safely:', key);
        return false;
      }
      localStorage.setItem(key, str);
      return true;
    } catch(e) {
      if (e.name === 'QuotaExceededError') {
        console.warn('[Security] localStorage quota exceeded');
      }
      return false;
    }
  }

  /* ── 8. CONTENT SECURITY HEADERS via meta tag ── */
  function injectCSPMeta() {
    // Only inject if not already present
    if (document.querySelector('meta[http-equiv="Content-Security-Policy"]')) return;
    const meta = document.createElement('meta');
    meta.setAttribute('http-equiv', 'Content-Security-Policy');
    // Allow: self, inline styles (needed for theme vars), inline scripts (our app)
    // Block: external scripts except cdnjs, no eval, no object/embed, no external frames
    meta.setAttribute('content', [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",   // inline scripts required for our architecture
      "style-src 'self' 'unsafe-inline'",    // inline styles for theming
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'none'",                  // no external requests (pure offline app)
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '));
    document.head.insertBefore(meta, document.head.firstChild);
  }

  /* ── 9. ANTI-TAMPERING: validate data shape on load ── */
  function validateAndCleanData(data) {
    if (!data || typeof data !== 'object') return {};
    const clean = {};

    Object.keys(data).forEach(key => {
      // Only allow known top-level keys
      const ALLOWED_KEYS = ['xp','gems','moods','journal','loginStreak','shields',
                            'xpAwarded','badges','quests','settings','lastSeason',
                            'leagues','friendRequests','streakMilestones','seasonClaims',
                            'easterEggs','comboState','questsCompleted','profile',
                            'monthStartBonus','snapshotData','partnerData','notifSettings',
                            'trophies'];
      const isMonthKey = isValidMonthKey(key);

      if (isMonthKey) {
        // Sanitise month data
        const month = data[key];
        if (!month || typeof month !== 'object') return;
        clean[key] = {
          tasks: Array.isArray(month.tasks)
            ? month.tasks.map(sanitizeTask).filter(Boolean)
            : []
        };
      } else if (ALLOWED_KEYS.includes(key)) {
        // Keep known structured keys as-is (they don't contain user text in dangerous ways)
        clean[key] = data[key];
      }
      // Silently drop unknown keys
    });

    return clean;
  }

  /* ── 10. CLICKJACKING PROTECTION ── */
  function preventClickjacking() {
    if (window.top !== window.self) {
      // We're inside an iframe — block it
      try {
        window.top.location = window.self.location;
      } catch(e) {
        // Cross-origin iframe — can't redirect, hide the body
        document.body.style.display = 'none';
        console.warn('[Security] Clickjacking attempt detected — page hidden.');
      }
    }
  }

  /* ── EXPORT ── */
  global.HabitSecurity = {
    escapeHTML,
    sanitizeText,
    sanitizeName,
    sanitizeJournalText,
    sanitizeColor,
    sanitizeEmoji,
    sanitizeInt,
    sanitizeTask,
    sanitizeCategory,
    sanitizeTime,
    sanitizeSchedule,
    sanitizeDays,
    isValidMonthKey,
    isValidDateKey,
    safeText,
    safeEl,
    rateLimit,
    safeGetStorage,
    safeSetStorage,
    validateAndCleanData,
    injectCSPMeta,
    preventClickjacking,
  };

})(window);