# Troubleshooting Wholesale Price Not Saving

## Step 1: Verify Database Column Exists

Run this SQL query in your database tool (SQLyog, phpMyAdmin, etc.):

```sql
USE seoul_surplus;

-- Check if wholesale_price column exists
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'seoul_surplus' 
AND TABLE_NAME = 'products' 
AND COLUMN_NAME = 'wholesale_price';
```

**If the query returns NO ROWS**, the column doesn't exist. Run this to add it:

```sql
ALTER TABLE products 
ADD COLUMN wholesale_price DECIMAL(10,2) DEFAULT NULL AFTER original_price;
```

## Step 2: Verify Server is Running

1. Open a terminal/PowerShell in the `HAHA` folder
2. Run: `npm run start:clean`
3. You should see: "Server running on port 3000"

## Step 3: Test the Update

1. **Open your browser** and go to the admin panel
2. **Open browser console** (F12 → Console tab)
3. **Edit a product** and set wholesale price to a test value (e.g., 25.50)
4. **Click "Update Product"**
5. **Check the console** for these messages:
   - `"Raw wholesale price input value: 25.50"`
   - `"Parsed wholesale price: 25.5"`
   - `"Setting wholesale_price to: 25.5"`
   - `"Update data: { ... "wholesale_price": 25.5 ... }"`
   - `"Product update successful"`

6. **Check the server terminal** for:
   - `"Update request body wholesale_price: 25.5"`
   - `"Including wholesale_price in update: 25.5"`
   - `"Executing UPDATE query with fields: [...]"`
   - `"Product updated successfully, ID: [id]"`

## Step 4: Verify in Database

After updating, run this SQL to check if the value was saved:

```sql
SELECT id, name, retail_price, wholesale_price 
FROM products 
WHERE id = [YOUR_PRODUCT_ID];
```

Replace `[YOUR_PRODUCT_ID]` with the actual product ID you updated.

## Common Issues

### Issue 1: Column doesn't exist
**Solution:** Run the ALTER TABLE command from Step 1

### Issue 2: Server not running
**Solution:** Start the server with `npm run start:clean`

### Issue 3: Value shows in console but not in database
**Check:**
- Server terminal for any error messages
- Database connection is working
- The UPDATE query is actually executing

### Issue 4: Value saves but doesn't show when editing again
**Check:**
- The GET /api/products endpoint is returning wholesale_price
- The frontend is mapping it correctly (check line 913 in admin.html)

## Quick Test Query

Run this to manually test updating wholesale_price:

```sql
-- Replace 1 with your product ID and 25.50 with your test value
UPDATE products 
SET wholesale_price = 25.50 
WHERE id = 1;

-- Verify it worked
SELECT id, name, wholesale_price 
FROM products 
WHERE id = 1;
```

If this works, the column exists and the issue is in the application code.
If this fails, the column doesn't exist or there's a database issue.

