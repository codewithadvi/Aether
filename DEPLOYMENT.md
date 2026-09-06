# Deployment Guide: Aether

This guide explains how to deploy the Aether platform (React frontend, Node.js/Express backend, and PostgreSQL database) to production completely **for free**.

---

## Architecture & Hosting Plan

To achieve 100% free hosting, we split the application into three specialized hosting providers:

| Component | Technology | Free Hosting Provider | Key Details |
| :--- | :--- | :--- | :--- |
| **Database** | PostgreSQL + `pgvector` | **Neon.tech** or **Supabase** | Permanent free tier, supports vector embeddings. |
| **Backend API** | Node.js / Express | **Render** or **Koyeb** | Free web service. Auto-deploys from GitHub. |
| **Frontend** | React / Vite SPA | **Vercel** or **Netlify** | Free static hosting, CDN-speed performance. |

---

## Prerequisites

1. A [GitHub](https://github.com) account with your Aether repository pushed to a public or private repo.
2. Free accounts on:
   - [Neon](https://neon.tech) or [Supabase](https://supabase.com)
   - [Render](https://render.com)
   - [Vercel](https://vercel.com)

---

## Step 1: Set Up the Database (Neon or Supabase)

Your application requires a PostgreSQL database with the `pgvector` extension enabled for semantic paper searches.

### Option A: Using Neon (Recommended)
1. Sign up at [neon.tech](https://neon.tech).
2. Create a new project named `Aether`.
3. Choose the **PostgreSQL 16** (or newer) engine.
4. Once created, copy the **Connection String** (choose `Transaction` mode or `Pooled` connection for serverless, or standard connection string).
   - The connection string will look like: `postgresql://rpt_user:password@ep-cool-breeze-12345.us-east-2.aws.neon.tech/neondb?sslmode=require`
5. Save this URL for Step 2. Neon enables `pgvector` automatically!

### Option B: Using Supabase
1. Sign up at [supabase.com](https://supabase.com).
2. Create a new project. Set a secure database password.
3. Go to **Project Settings** (gear icon) → **Database**.
4. Scroll down to **Connection String**, click the **URI** tab, and copy the connection string. Replace `[YOUR-PASSWORD]` with your actual database password.
   - It will look like: `postgresql://postgres.[username]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
5. Save this URL for Step 2.

---

## Step 2: Deploy the Backend API on Render

Render will host the Node.js/Express API server. 

1. Sign up at [dashboard.render.com](https://dashboard.render.com) and link your GitHub account.
2. Click **New +** → **Web Service**.
3. Connect your Aether GitHub repository.
4. Configure the Web Service settings:
   - **Name**: `aether-backend` (or a custom name)
   - **Region**: Select the region closest to you or your database.
   - **Branch**: `main` (or your active development branch)
   - **Root Directory**: `backend` *(CRITICAL: This tells Render to run commands inside the `/backend` folder)*
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build && npm run migrate`
     > [!TIP]
     > Running `npm run migrate` during the build step ensures database tables are created or updated before the new backend code goes live. If migrations fail, the build fails and the previous version remains online.
   - **Start Command**: `npm run start` (which runs `node dist/index.js`)
   - **Instance Type**: **Free**
5. Expand the **Advanced** section and add the following **Environment Variables**:

| Key | Value | Notes |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production optimizations. |
| `PORT` | `3001` | Express will listen on this port. |
| `DATABASE_URL` | *Your connection string from Step 1* | Ensure it contains your real password. |
| `JWT_SECRET` | *A long random secret string* | e.g. `g7Hk#L91s*aPqZ!2wE@rT5y` |
| `FRONTEND_URL` | `https://aether-app.vercel.app` | **Temporary placeholder:** Update this once you deploy your frontend in Step 3. |
| `BACKEND_URL` | `https://aether-backend.onrender.com` | Update this with your actual Render service URL (shown at the top of the Render page after creation). |

6. Click **Create Web Service**. Render will start building the backend.

---

## Step 3: Deploy the Frontend on Vercel

Vercel will build and serve your static React frontend.

1. Sign up at [vercel.com](https://vercel.com) and connect your GitHub account.
2. Click **Add New** → **Project**.
3. Import your Aether repository.
4. Configure the project:
   - **Framework Preset**: `Vite` (Vercel will auto-detect this)
   - **Root Directory**: Keep empty `.` (leave as root of the repo, since `package.json` for frontend is in the root directory)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Expand **Environment Variables** and add:

| Key | Value | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://your-backend.onrender.com/api` | The URL of your backend deployed on Render + `/api` |

6. Click **Deploy**. Vercel will build and launch your site.
7. Once deployment succeeds, copy your Vercel URL (e.g., `https://aether-app.vercel.app`).

### Update Backend CORS Config
Now that you have your final frontend URL:
1. Go back to your [Render Dashboard](https://dashboard.render.com).
2. Open your backend web service → **Environment**.
3. Update `FRONTEND_URL` with your exact Vercel URL (no trailing slash, e.g., `https://aether-app.vercel.app`).
4. Save changes. Render will automatically redeploy the backend with the new configuration.

---

## Step 4: Configure OAuth (Optional)

If you plan to use **GitHub** or **Google** single sign-on (SSO):

1. **GitHub OAuth Setup**:
   - Go to [GitHub Developer Settings](https://github.com/settings/developers) → **OAuth Apps** → **New OAuth App**.
   - **Homepage URL**: `https://aether-app.vercel.app` (your frontend)
   - **Authorization callback URL**: `https://your-backend.onrender.com/api/auth/oauth/github/callback`
   - Generate a Client Secret.
   - Add `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` to your **Render** backend environment variables.

2. **Google OAuth Setup**:
   - Go to the [Google Cloud Console](https://console.cloud.google.com).
   - Create a project and set up the OAuth Consent Screen.
   - Create Credentials → **OAuth client ID** (Web application).
   - **Authorized JavaScript origins**: `https://aether-app.vercel.app`
   - **Authorized redirect URIs**: `https://your-backend.onrender.com/api/auth/oauth/google/callback`
   - Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to your **Render** backend environment variables.

---

## Troubleshooting & Tips

### 😴 Render Free Tier "Cold Start" Delay
Render puts free services to sleep after 15 minutes of inactivity. When a user visits your app after a period of quiet, the first request to the backend may take **40–60 seconds** to spin back up. 
- *Solution:* Your frontend will show loading indicators. Alternatively, you can use a free uptime monitor (like [UptimeRobot](https://uptimerobot.com)) to ping your backend's `/health` endpoint every 14 minutes to keep it awake, or upgrade to Render's starter tier ($7/month).

### 🛠 Checking Migrations
If the database doesn't seem to have tables:
1. Check the Render deployment logs. The log should show:
   `Running database migrations...` followed by queries executing successfully.
2. If migrations failed, check that your database URL is correct and that the database user has permission to create tables and extensions.

### 🔒 CORS Errors
If you see CORS errors in the browser console:
- Double check that `FRONTEND_URL` in your Render Environment variables matches your Vercel URL **exactly** (no trailing slash, matching `https://`).
- Check that the backend has successfully redeployed after you updated the variable.
