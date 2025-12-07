# Deployment Guide

## Current Issue
Your frontend is deployed on Vercel, but your backend server (Express.js) is not deployed. The frontend is trying to connect to `localhost:3000`, which doesn't work on deployed sites.

## Solution: Deploy Backend to Railway

Since your database is already on Railway, it's easiest to deploy your backend server there too.

### Step 1: Prepare for Railway Deployment

1. **Create `railway.json` or use Railway's auto-detection**
   - Railway will auto-detect Node.js projects
   - Make sure `package.json` has a `start` script (✅ already has it)

2. **Set Environment Variables in Railway**
   - Go to your Railway project
   - Add these environment variables:
     - `DATABASE_URL` = `mysql://root:xYEwMzewiINNKIZAmtnwdavuCBddRawt@nozomi.proxy.rlwy.net:30855/railway`
     - `PORT` = Railway will set this automatically
     - `NODE_ENV` = `production`

### Step 2: Deploy to Railway

1. **Connect GitHub Repository**
   - Go to Railway dashboard
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your `ksystem` repository
   - Railway will auto-detect and deploy

2. **Configure Build Settings**
   - Root Directory: `/` (or leave default)
   - Build Command: `npm install` (auto-detected)
   - Start Command: `npm start` (auto-detected)

3. **Get Your Backend URL**
   - After deployment, Railway will give you a URL like: `https://your-app.railway.app`
   - Copy this URL

### Step 3: Update Frontend Configuration

1. **Update `config.js`** with your Railway backend URL:
   ```javascript
   // In config.js, update the production URL:
   return 'https://your-app.railway.app'; // Replace with your actual Railway URL
   ```

2. **Or set it via HTML** (better for Vercel):
   Add this to your HTML files before loading `config.js`:
   ```html
   <script>
     window.APP_API_BASE_URL = 'https://your-app.railway.app';
   </script>
   <script src="config.js"></script>
   ```

### Step 4: Redeploy Frontend to Vercel

After updating the config, push to GitHub and Vercel will auto-deploy.

## Alternative: Deploy Backend to Render

1. Go to https://render.com
2. Create new "Web Service"
3. Connect your GitHub repo
4. Settings:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment Variables: Add `DATABASE_URL` and `NODE_ENV`
5. Get the URL and update `config.js`

## Testing

1. **Local Development:**
   - Run `npm start` locally
   - Frontend will connect to `http://localhost:3000`

2. **Production:**
   - Backend on Railway/Render
   - Frontend on Vercel
   - Frontend connects to your backend URL

## Quick Fix for Now

If you want to test immediately, you can:
1. Keep `npm start` running on your computer
2. Use a service like ngrok to expose localhost: `ngrok http 3000`
3. Update `config.js` with the ngrok URL temporarily

But for production, you MUST deploy the backend server.

