# Railway Backend Deployment Guide

## Step-by-Step Instructions

### Step 1: Prepare Your Repository

✅ Your code is already ready! The following files are configured:
- `package.json` has `start` script
- `server.js` uses `process.env.PORT` (Railway will set this)
- `config/database.js` supports `DATABASE_URL` environment variable
- `.env` file is in `.gitignore` (won't be committed)

### Step 2: Deploy to Railway

1. **Go to Railway Dashboard**
   - Visit: https://railway.app
   - Sign in with GitHub (recommended) or email

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Authorize Railway to access your GitHub if needed
   - Select repository: `ralagos143355tc-a11y/ksystem`

3. **Railway Auto-Detection**
   - Railway will automatically detect it's a Node.js project
   - It will use `npm install` for build
   - It will use `npm start` to run the server

4. **Configure Environment Variables**
   - Click on your service
   - Go to "Variables" tab
   - Add the following environment variable:
     ```
     DATABASE_URL=mysql://root:xYEwMzewiINNKIZAmtnwdavuCBddRawt@nozomi.proxy.rlwy.net:30855/railway
     ```
   - Railway will automatically set `PORT` and `NODE_ENV`

5. **Deploy**
   - Railway will automatically start building and deploying
   - Wait for deployment to complete (usually 2-5 minutes)
   - You'll see build logs in real-time

### Step 3: Get Your Backend URL

1. **After deployment completes:**
   - Click on your service
   - Go to "Settings" tab
   - Scroll to "Domains" section
   - Railway will generate a URL like: `https://your-app-name.up.railway.app`
   - **Copy this URL** - this is your backend API URL

2. **Or create a custom domain:**
   - In "Settings" → "Domains"
   - Click "Generate Domain" or add a custom domain

### Step 4: Update Frontend Configuration

1. **Update `login.html`** (and other HTML files):
   - Uncomment and update the meta tag:
   ```html
   <meta name="api-base-url" content="https://your-app-name.up.railway.app">
   ```
   - Replace `your-app-name.up.railway.app` with your actual Railway URL

2. **Or set it globally** by adding this script before `config.js`:
   ```html
   <script>
     window.APP_API_BASE_URL = 'https://your-app-name.up.railway.app';
   </script>
   ```

3. **Files to update:**
   - `login.html`
   - `admin.html`
   - `user.html`
   - `signup.html`

### Step 5: Test the Deployment

1. **Check Backend Health:**
   - Visit: `https://your-app-name.up.railway.app/api/health`
   - Should return: `{"status":"ok","database":"connected"}`

2. **Test Login:**
   - Go to your Vercel frontend: `https://ksystem-steel.vercel.app`
   - Try logging in with:
     - Email: `superadmin@seoulsurplus.com`
     - Password: `SuperAdmin@2024!`

### Step 6: Commit and Push Changes

After updating the frontend files with the Railway URL:

```bash
git add .
git commit -m "Configure frontend to use Railway backend API"
git push origin main
```

Vercel will automatically redeploy with the new configuration.

## Troubleshooting

### Backend not connecting to database
- ✅ Check `DATABASE_URL` environment variable is set correctly in Railway
- ✅ Verify the database is accessible from Railway (should work since it's on Railway too)

### CORS errors
- ✅ Your `server.js` already has CORS enabled with `origin: "*"` which should work

### Port binding errors
- ✅ Server is configured to use `0.0.0.0` which Railway requires

### Build fails
- Check Railway build logs
- Ensure all dependencies are in `package.json`
- Verify Node.js version (Railway auto-detects)

## Quick Reference

**Backend URL Format:**
```
https://your-app-name.up.railway.app
```

**API Endpoints:**
- Health: `https://your-app-name.up.railway.app/api/health`
- Login: `https://your-app-name.up.railway.app/api/auth/login`
- Products: `https://your-app-name.up.railway.app/api/products`

**Environment Variables Needed:**
- `DATABASE_URL` (set in Railway dashboard)
- `PORT` (automatically set by Railway)
- `NODE_ENV` (automatically set to `production`)

## Next Steps After Deployment

1. ✅ Test all API endpoints
2. ✅ Verify database connection
3. ✅ Update frontend with Railway URL
4. ✅ Test login from mobile device
5. ✅ Monitor Railway logs for any errors

