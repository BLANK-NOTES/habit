# 🏆 Habit Tracker

## Running the app

### Option A — Without AI Coach (no setup needed)
Just open `monthly.html` directly in your browser. Everything works except the AI Coach.

---

### Option B — With AI Coach

You need Node.js installed. [Download it free here](https://nodejs.org) if you don't have it.

**Step 1 — Add your API key**

Copy `.env.example` and rename it to `.env`:
```
.env.example  →  .env
```

Open `.env` and replace the placeholder with your real key:
```
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
```

Get a key at: https://console.anthropic.com/

**Step 2 — Start the server**

Open a terminal in your habit tracker folder and run:
```
node server.js
```

You'll see:
```
  ✅  Habit Tracker running!
  Open: http://localhost:3000
  🔑  API key found — AI Coach ready
```

**Step 3 — Open the app**

Go to: **http://localhost:3000**

That's it. The AI Coach will now work. All your existing data (habits, streaks, XP) is preserved.

---

## Files
| File | Purpose |
|------|---------|
| `monthly.html` | Main dashboard |
| `monthly.js` | App logic |
| `server.js` | Local server (needed for AI Coach) |
| `.env` | Your API key (create this yourself) |
| `coach.html` | AI Habit Coach |
| `wrapped.html` | Year Wrapped review |
| `stats.html` | Analytics |
| `settings.html` | All settings |
| `journal.html` | Mood journal |
| `social.html` | Friends & challenges |
| `leaderboard.html` | League leaderboard |

---

## Keeping the server running

The server only needs to run while you're using the app. Press `Ctrl+C` to stop it. Your habit data is always saved in your browser's localStorage — nothing is sent to any server except the AI Coach messages.



















maak car terminals reg
find sponsorships vir koster gholdclub en maak 10%
maak plaas grooterr