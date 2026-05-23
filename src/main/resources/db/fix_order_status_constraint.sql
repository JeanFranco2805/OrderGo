-- Fix the orders_status_check constraint to include RECHAZADO
-- Run this SQL script against your PostgreSQL database

-- First, drop the old check constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Then recreate it with all valid status values
ALTER TABLE orders ADD CONSTRAINT orders_status_check
    CHECK (status IN ('PENDIENTE', 'EN_PREPARACION', 'ENTREGADO', 'CANCELADO', 'RECHAZADO'));
