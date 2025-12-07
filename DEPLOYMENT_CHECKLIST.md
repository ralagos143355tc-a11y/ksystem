# Railway Deployment Checklist

## ✅ Pre-Deployment (Already Done)

- [x] Server configured to use `process.env.PORT`
- [x] Server binds to `0.0.0.0` (for Railway)
- [x] Database connection uses `DATABASE_URL` environment variable
- [x] CORS enabled for all origins
- [x] `.env` file in `.gitignore`
- [x] `package.json` has `start` script
- [x] `railway.json` configuration file created

## 📋 Deployment Steps

### 1. Push Code to GitHub
```bash
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

### 2. Deploy on Railway
- [ ] Go to https://railway.app
- [ ] Sign in with GitHub
- [ ] Click "New Project" → "Deploy from GitHub repo"
- [ ] Select `ralagos143355tc-a11y/ksystem`
- [ ] Wait for auto-detection (Node.js)

### 3. Configure Environment Variables
- [ ] Go to your service → "Variables" tab
- [ ] Add: `DATABASE_URL=mysql://root:xYEwMzewiINNKIZAmtnwdavuCBddRawt@nozomi.proxy.rlwy.net:30855/railway`
- [ ] Railway auto-sets: `PORT` and `NODE_ENV`

### 4. Get Backend URL
- [ ] Go to "Settings" → "Domains"
- [ ] Copy the generated URL (e.g., `https://your-app.up.railway.app`)
- [ ] Test: `https://your-app.up.railway.app/api/health`

### 5. Update Frontend
- [ ] Update `login.html` with Railway URL in meta tag
- [ ] Update `admin.html` with Railway URL
- [ ] Update `user.html` with Railway URL
- [ ] Update `signup.html` with Railway URL
- [ ] Commit and push changes
- [ ] Vercel will auto-deploy

### 6. Test
- [ ] Visit: `https://your-app.up.railway.app/api/health`
- [ ] Should return: `{"status":"ok","database":"connected"}`
- [ ] Test login on Vercel frontend
- [ ] Test on mobile device

## 🔗 Important URLs

**Backend (Railway):**
- Health Check: `https://your-app.up.railway.app/api/health`
- API Base: `https://your-app.up.railway.app`

**Frontend (Vercel):**
- Login: `https://ksystem-steel.vercel.app/login.html`
- Admin: `https://ksystem-steel.vercel.app/admin.html`

## 🐛 Troubleshooting

**Backend not starting:**
- Check Railway logs
- Verify `DATABASE_URL` is set
- Check build logs for errors

**Database connection failed:**
- Verify `DATABASE_URL` format is correct
- Check Railway database is running
- Test connection locally first

**CORS errors:**
- Already configured with `origin: "*"` in server.js
- Should work automatically

**Frontend can't connect:**
- Verify Railway URL is correct in HTML files
- Check browser console for errors
- Verify backend is running (check health endpoint)

