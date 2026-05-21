-- EJECUTAR ESTO EXACTAMENTE EN TU POSTGRESQL (pgAdmin, DBeaver, etc.)
-- Después de ejecutar, reinicia Spring Boot.

-- 1. BORRAR las columnas viejas que causan el error
ALTER TABLE inventory_items DROP COLUMN IF EXISTS min_stock;
ALTER TABLE inventory_items DROP COLUMN IF EXISTS unit;
ALTER TABLE inventory_items DROP COLUMN IF EXISTS status;
ALTER TABLE inventory_items DROP COLUMN IF EXISTS item_type;

-- 2. AGREGAR las columnas nuevas si no existen
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS cost_price NUMERIC(15,2);
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS sale_price NUMERIC(15,2);

-- 3. Vinculación products -> inventory_items
ALTER TABLE products ADD COLUMN IF NOT EXISTS inventory_item_id BIGINT;

-- 4. (Opcional) Si tenés datos basura de pruebas fallidas, borralos:
-- DELETE FROM inventory_items WHERE name IS NULL OR name = '';
