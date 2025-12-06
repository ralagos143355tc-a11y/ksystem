# Complete Step-by-Step Guide: SQLyog + Node.js Connection

## Part 1: Setting Up Database in SQLyog

### Step 1: Create the Database
1. **In SQLyog**, you should see the query editor (the right side of the window)
2. **Type or paste this SQL command:**
   ```sql
   CREATE DATABASE IF NOT EXISTS seoul_surplus
     DEFAULT CHARACTER SET utf8mb4
     DEFAULT COLLATE utf8mb4_unicode_ci;
   ```
3. **Click the "Execute" button** (green play button ▶️) or press `F9`
4. **You should see a success message** in the Messages tab below

### Step 2: Import the Database Schema
1. **In SQLyog**, go to **File → Open SQL Script** (or press `Ctrl+O`)
2. **Navigate to your project folder:** `C:\Users\User\Documents\HAHA`
3. **Select the file:** `seoul_surplus.sql`
4. **Click "Open"**
5. **The SQL file will open in the query editor**
6. **Make sure the database dropdown shows "seoul_surplus"** (if not, select it from the dropdown)
7. **Click "Execute" button** (▶️) or press `F9`
8. **Wait for the script to finish** - you'll see messages like "Query OK" for each table created

### Step 3: Verify Database Setup
1. **In the left panel (Object Browser)**, find your connection `root@localhost`
2. **Click the refresh button** (🔄) or right-click and select "Refresh"
3. **You should now see `seoul_surplus` database** in the list
4. **Expand `seoul_surplus`** by clicking the arrow next to it
5. **You should see all the tables:**
   - categories
   - roles
   - permissions
   - users
   - user_profiles
   - products
   - etc.

### Step 4: Test a Query (Optional)
1. **In the query editor**, type:
   ```sql
   USE seoul_surplus;
   SHOW TABLES;
   ```
2. **Click Execute** (▶️)
3. **You should see a list of all tables** in the results area

---

## Part 2: Setting Up Node.js Connection

### Step 1: Verify .env File
1. **Open your project folder** in File Explorer: `"C:\Users\Jude Arjun Tomonas\OneDrive\Desktop\12355\HAHA"`
2. **Check if `.env` file exists** (it might be hidden - enable "Show hidden files" in File Explorer)
3. **If it doesn't exist**, I've created it for you with these settings:
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=seoul_surplus
   PORT=3000
   NODE_ENV=development
   ```
   **Note:** `DB_PASSWORD` is empty because you don't have a password set for MySQL root user.

### Step 2: Install Node.js Dependencies
1. **Open PowerShell or Command Prompt**
2. **Navigate to your project folder:**
   ```powershell
   cd C:\Users\Jude Arjun Tomonas\OneDrive\Desktop\12355\HAHA
   ```
3. **Install all required packages:**
   ```powershell
   npm install
   ```
   **Note:** After installation, npm may show funding information (`npm fund`). This is normal and can be ignored, or you can disable it with `npm config set fund false`.
   
   This will install:
   - express (web server)
   - mysql2 (MySQL database driver)
   - dotenv (reads .env file)
   - cors (cross-origin requests)
   - bcryptjs (password hashing)

### Step 3: Test the Database Connection
1. **Start your Node.js server:**
   ```powershell
   npm start
   ```
   Or:
   ```powershell
   node server.js
   ```

2. **Look for these messages:**
   ```
   ✅ Database connected successfully!
   🚀 Server running on http://localhost:3000
   📊 API endpoints available at http://localhost:3000/api
   ```

3. **If you see "Database connection failed":**
   - Make sure MySQL is running
   - Check that the database `seoul_surplus` exists in SQLyog
   - Verify your `.env` file has the correct settings

### Step 4: Test the API Connection
1. **Open your web browser**
2. **Go to:** `http://localhost:3000/api/health`
3. **You should see:**
   ```json
   {
     "status": "ok",
     "database": "connected"
   }
   ```

---

## Part 3: Understanding Your Configuration

### Your .env File Explained:
```env
DB_HOST=localhost          # MySQL server is on your local computer
DB_USER=root              # MySQL username (root is the default admin)
DB_PASSWORD=              # Empty because you don't have a password set
DB_NAME=seoul_surplus     # The database name you created
PORT=3000                 # Port where your Node.js server runs
NODE_ENV=development      # Environment mode
```

### How Node.js Connects:
1. **`config/database.js`** reads the `.env` file using `dotenv`
2. **Creates a connection pool** to MySQL using `mysql2`
3. **Uses these settings:**
   - Host: `localhost` (your local MySQL)
   - User: `root`
   - Password: empty string `''`
   - Database: `seoul_surplus`

### Your Server Structure:
- **`server.js`** - Main Express server with all API endpoints
- **`config/database.js`** - Database connection configuration
- **`.env`** - Environment variables (database credentials)

---

## Troubleshooting

### Problem: "Cannot connect to database"
**Solutions:**
1. ✅ Make sure MySQL is running (check in SQLyog - if you can connect, MySQL is running)
2. ✅ Verify database `seoul_surplus` exists (check in SQLyog left panel)
3. ✅ Check `.env` file exists and has correct values
4. ✅ Make sure you imported `seoul_surplus.sql` successfully

### Problem: "Access denied for user 'root'@'localhost'"
**Solutions:**
1. ✅ If you don't have a password, make sure `DB_PASSWORD=` is empty (no spaces)
2. ✅ If you set a password later, update `.env` file: `DB_PASSWORD=yourpassword`

### Problem: "Table doesn't exist"
**Solutions:**
1. ✅ Make sure you executed the entire `seoul_surplus.sql` file in SQLyog
2. ✅ Verify tables exist: In SQLyog, expand `seoul_surplus` database and check for tables

### Problem: "Port 3000 already in use"
**Solutions:**
1. ✅ Change PORT in `.env` to another number (e.g., `PORT=3001`)
2. ✅ Or stop the other program using port 3000

---

## Quick Reference Commands

### In SQLyog:
- **Execute Query:** Click ▶️ button or press `F9`
- **Open SQL File:** `Ctrl+O`
- **Refresh Database List:** Click 🔄 button
- **Select Database:** Use dropdown next to database icon

### In PowerShell/Command Prompt:
```powershell
# Navigate to project
cd C:\Users\User\Documents\HAHA

# Install dependencies
npm install

# Start server
npm start

# Or run directly
node server.js
```

---

## Next Steps After Setup

1. **Test API Endpoints:**
   - Products: `http://localhost:3000/api/products`
   - Categories: `http://localhost:3000/api/categories`
   - Health: `http://localhost:3000/api/health`

2. **Add Initial Data:**
   - Use SQLyog to insert test data
   - Or use the API endpoints to create data

3. **Connect Frontend:**
   - Update your HTML/JS files to call the API endpoints
   - Replace `localStorage` with API calls

---

## Summary Checklist

- [ ] Created `seoul_surplus` database in SQLyog
- [ ] Imported `seoul_surplus.sql` file in SQLyog
- [ ] Verified tables exist in SQLyog
- [ ] Created `.env` file with correct settings
- [ ] Installed npm packages (`npm install`)
- [ ] Started Node.js server (`npm start`)
- [ ] Saw "Database connected successfully!" message
- [ ] Tested API health endpoint in browser

---

**You're all set!** Your Node.js application should now be connected to your MySQL database through SQLyog. 🎉

