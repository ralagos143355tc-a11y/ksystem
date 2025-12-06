-- ============================================
-- DATABASE UPDATE SCRIPT
-- Run this script in your MySQL database to enable all new features
-- ============================================

USE seoul_surplus;

-- ============================================
-- 1. Add wholesale_price column to products table
-- ============================================
-- This allows you to set individual wholesale prices for each product
-- If the column already exists, you'll get an error - that's okay, just ignore it

ALTER TABLE products 
ADD COLUMN wholesale_price DECIMAL(10,2) DEFAULT NULL AFTER original_price;

-- ============================================
-- 2. Add payment columns to sales_orders table
-- ============================================
-- This enables the cashiering system (amount paid, change calculation)
-- If columns already exist, you'll get an error - that's okay, just ignore it

-- Add amount_paid column
ALTER TABLE sales_orders 
ADD COLUMN amount_paid DECIMAL(12,2) DEFAULT 0 AFTER total_amount;

-- Add change_amount column
ALTER TABLE sales_orders 
ADD COLUMN change_amount DECIMAL(12,2) DEFAULT 0 AFTER amount_paid;

-- Update existing 'Paid' orders to reflect amount_paid = total_amount
UPDATE sales_orders 
SET amount_paid = total_amount, change_amount = 0 
WHERE payment_status = 'Paid' AND (amount_paid IS NULL OR amount_paid = 0);

-- ============================================
-- VERIFICATION
-- ============================================
-- Run these queries to verify the columns were added:

-- Check if wholesale_price column exists
-- SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
-- FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_SCHEMA = 'seoul_surplus' 
-- AND TABLE_NAME = 'products' 
-- AND COLUMN_NAME = 'wholesale_price';

-- Check if payment columns exist
-- SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
-- FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_SCHEMA = 'seoul_surplus' 
-- AND TABLE_NAME = 'sales_orders' 
-- AND COLUMN_NAME IN ('amount_paid', 'change_amount');

