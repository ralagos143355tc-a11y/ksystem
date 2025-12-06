-- Remove original_price column from products table
-- Run this script to remove the original_price column from the database

ALTER TABLE products DROP COLUMN original_price;

-- Verify the column has been removed
SELECT COLUMN_NAME, DATA_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'products' 
AND TABLE_SCHEMA = DATABASE()
ORDER BY ORDINAL_POSITION;

