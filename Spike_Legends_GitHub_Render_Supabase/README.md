# 🏐 SPIKE LEGENDS — GitHub + Render + (optional) Supabase

This is the **same deployment flow as Barricade / POTATO**:
**upload extracted files to GitHub → Render builds and hosts the game → Supabase optionally saves collections online.**

## ✅ NO NODE.JS ON YOUR COMPUTER
Render automatically installs Node dependencies for the server. You don't need to install Node.js or type commands on your computer.

## 1. Upload to GitHub
1. Download `Spike_Legends_GitHub_Render_Supabase.zip` and EXTRACT it.
2. Open https://github.com/new and create a repository `spike-legends`.
3. Click **Add file > Upload files** and drag ALL files **inside** the extracted folder into the repository, preserving the `public/` and `supabase/` folders.
4. Click **Commit changes**.
5. The top level must contain: `server.js`, `package.json`, `render.yaml`, `README.md`, a `public/` folder, and a `supabase/` folder. DO NOT upload a ZIP as a single file; do not put everything inside a second nested folder.

## 2. Deploy on Render (this is how friend duels work)
1. Visit https://dashboard.render.com and click **New > Web Service**.
2. Choose **Git Provider** and connect/select your `spike-legends` GitHub repository.
3. Set **Language** to `Node`, **Build Command** to `npm install`, **Start Command** to `npm start`.
4. Set **Root Directory** to blank (assuming server.js is at repository root).
5. Choose an available plan, such as **Free** if offered, and click **Deploy Web Service**.
6. Render gives you a `https://YOUR-NAME.onrender.com` link. Open it to play.
7. Future commits to the connected GitHub branch can automatically redeploy the game.

In Render logs look for `Spike Legends running at http://localhost:10000` (port value may vary); external players visit the PUBLIC onrender.com URL, not localhost.

## 3. Optional — Supabase online saving (do after step 2 works)
Supabase is **not required** for live duels; Render runs the match server. Supabase adds anonymous accounts and cloud saves attached to the same browser session.
1. Create a Supabase project at https://supabase.com/dashboard.
2. In **SQL Editor**, run `supabase/OPTIONAL_CLOUD_SAVE.sql`.
3. In **Authentication > Providers**, enable **Anonymous Sign-Ins**.
4. From your project settings copy **Project URL** and **Publishable key** (sometimes called anon public key).
5. On Render > your web service > **Environment**, add:
   - `SUPABASE_URL` = your Supabase Project URL
   - `SUPABASE_PUBLISHABLE_KEY` = your public/publishable key
6. Save environment and redeploy if necessary. The top bar changes to `SUPABASE CLOUD SAVE ENABLED` when connected.

**NEVER put a Supabase secret key / service-role key in GitHub, HTML, frontend JS, or screenshots.** This demo only requires the public publishable key and properly configured row-level-security policies.

## Playing with friends
- Both people open the SAME `onrender.com` website.
- In **Duels**, player one clicks **Create Room**, copies the invite link or shares the six-character code.
- Player two opens the invite link or enters the code using **Join A Room**.
- Both click **Ready Up**; the SERVER decides rally scores and broadcasts to both browsers.
- Bot Duels and Career Mode work without a friend online.

## What is real vs what is limited
- ✅ Real WebSocket friend rooms, backend-generated score updates, six-player squads, bot matches, character collection, 108 card variants.
- ✅ Supabase cloud saving if you choose to configure it.
- ⚠️ Supabase anonymous accounts stay linked to that browser session. This is **not** an email/password cross-device account system.
- ⚠️ Coins/rolls/upgrades remain calculated in the browser, so this is a playable prototype, **not cheat-resistant ranked economy**. The lobby server also trusts player-submitted roster stats. Do not use it for paid items or prizes.
- ⚠️ Match rooms are stored in Render instance memory; restarts/idle sleeping end active rooms. Free Render plans can spin down when inactive, causing cold start delays.
- ⚠️ Matches are stylized 2D displays, not a full Roblox 3D simulation.
- ⚠️ Not tested with two separate people on a deployed Render URL yet. Test this after deployment.

## Updating
Modify a file in GitHub or upload replacements to the same path, then commit. Render's Git integration deploys the updated version. Your website URL normally stays the same.
