-- Add payment columns to sales_orders table for cashiering system
-- Run this script to add amount_paid and change_amount columns
-- Note: If columns already exist, you'll get an error - that's okay, just ignore it

USE seoul_surplus;

-- Add amount_paid column (if it doesn't exist, you may get an error - ignore it)
ALTER TABLE sales_orders 
ADD COLUMN amount_paid DECIMAL(12,2) DEFAULT 0 AFTER total_amount;

-- Add change_amount column (if it doesn't exist, you may get an error - ignore it)
ALTER TABLE sales_orders 
ADD COLUMN change_amount DECIMAL(12,2) DEFAULT 0 AFTER amount_paid;

-- Update existing records to set amount_paid = total_amount for already paid orders
UPDATE sales_orders 
SET amount_paid = total_amount, change_amount = 0 
WHERE payment_status = 'Paid' AND (amount_paid IS NULL OR amount_paid = 0);

