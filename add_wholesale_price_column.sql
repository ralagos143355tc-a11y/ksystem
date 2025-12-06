-- Add wholesale_price column to products table
-- Run this script to add wholesale_price column for individual product pricing

USE seoul_surplus;

-- Add wholesale_price column (if it doesn't exist, you may get an error - ignore it)
ALTER TABLE products 
ADD COLUMN wholesale_price DECIMAL(10,2) DEFAULT NULL AFTER original_price;

-- Optional: Set default wholesale price for existing products (70% of retail price)
-- Uncomment the line below if you want to auto-calculate wholesale prices for existing products
-- UPDATE products SET wholesale_price = ROUND(retail_price * 0.7, 2) WHERE wholesale_price IS NULL;

