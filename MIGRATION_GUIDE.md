# Database Migration Guide - Local to Railway

This guide will help you migrate your local database data to Railway.

## Prerequisites

1. Your local database should be running
2. Railway database should be set up (already done ✅)
3. Both databases should have the same table structure

## Step 1: Update .env File

Add your local database connection to `.env`:

### Option A: Using Connection String
```env
# Local Database (source)
LOCAL_DATABASE_URL=mysql://root:your_password@127.0.0.1:3306/seoul_surplus

# Railway Database (destination) - already set
DATABASE_URL=mysql://root:xYEwMzewiINNKIZAmtnwdavuCBddRawt@nozomi.proxy.rlwy.net:30855/railway
```

### Option B: Using Individual Variables
```env
# Local Database
LOCAL_DB_HOST=127.0.0.1
LOCAL_DB_USER=root
LOCAL_DB_PASSWORD=your_password
LOCAL_DB_NAME=seoul_surplus
LOCAL_DB_PORT=3306

# Railway Database (already set)
DATABASE_URL=mysql://root:xYEwMzewiINNKIZAmtnwdavuCBddRawt@nozomi.proxy.rlwy.net:30855/railway
```

## Step 2: Run Migration Script

```bash
node migrate-to-railway.js
```

## What the Script Does

1. ✅ Connects to both local and Railway databases
2. ✅ Migrates data from these tables (in order):
   - categories
   - roles
   - permissions
   - role_permissions
   - users
   - user_profiles
   - products
   - product_images
   - customers
   - reservations
   - sales_orders
   - sales_order_items
   - inventory_movements
   - inventory_alerts
   - activity_log

3. ✅ Skips duplicate entries (uses INSERT IGNORE)
4. ✅ Shows progress for each table
5. ✅ Provides summary at the end

## Important Notes

- **Foreign Key Order**: Tables are migrated in the correct order to respect foreign key constraints
- **Duplicates**: The script uses `INSERT IGNORE` to skip duplicate entries
- **Safety**: The script does NOT delete existing data in Railway (it only adds new data)
- **Backup**: Consider backing up your Railway database before migration

## Troubleshooting

### Error: "Table doesn't exist"
- Make sure both databases have the same table structure
- Run `setup-railway-database.js` first if Railway tables don't exist

### Error: "Connection refused"
- Check if your local MySQL server is running
- Verify database credentials in `.env`

### Error: "Access denied"
- Verify username and password for both databases
- Check database user permissions

### Duplicate Key Errors
- This is normal - the script will skip duplicates automatically
- If you want to overwrite, modify the script to use `REPLACE INTO` instead of `INSERT IGNORE`

## Alternative: Manual Migration

If you prefer to migrate manually:

1. **Export from local database:**
   ```bash
   mysqldump -u root -p seoul_surplus > local_backup.sql
   ```

2. **Import to Railway:**
   ```bash
   mysql -h nozomi.proxy.rlwy.net -P 30855 -u root -p railway < local_backup.sql
   ```

## Verification

After migration, verify the data:

1. Check Railway database directly
2. Test your application - all data should appear
3. Compare record counts between local and Railway

## Need Help?

If you encounter issues:
1. Check the error messages in the console
2. Verify both database connections
3. Ensure table structures match
4. Check foreign key constraints

