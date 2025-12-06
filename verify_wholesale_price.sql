-- ============================================
-- VERIFY WHOLESALE_PRICE COLUMN
-- Run this to check if the column exists and test updating it
-- ============================================

USE seoul_surplus;

-- 1. Check if wholesale_price column exists
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE, 
    COLUMN_DEFAULT,
    COLUMN_TYPE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'seoul_surplus' 
AND TABLE_NAME = 'products' 
AND COLUMN_NAME = 'wholesale_price';

-- 2. If the above returns no rows, the column doesn't exist - add it:
-- ALTER TABLE products ADD COLUMN wholesale_price DECIMAL(10,2) DEFAULT NULL AFTER original_price;

-- 3. Check current wholesale_price values
SELECT id, name, retail_price, original_price, wholesale_price 
FROM products 
LIMIT 10;

-- 4. Test update (replace 1 with your product ID and 25.50 with your test value)
-- UPDATE products SET wholesale_price = 25.50 WHERE id = 1;

-- 5. Verify the update worked
-- SELECT id, name, wholesale_price FROM products WHERE id = 1;

