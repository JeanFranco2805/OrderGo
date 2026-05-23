package com.productservice.ordergo.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class DbFixConfig {

    @Bean
    CommandLineRunner fixOrderRejectionsConstraint(JdbcTemplate jdbcTemplate) {
        return args -> {
            try {
                // Fix 1: allow null in seller_load_item_id
                jdbcTemplate.execute(
                    "ALTER TABLE order_rejections ALTER COLUMN seller_load_item_id DROP NOT NULL"
                );
                System.out.println("DB FIX APPLIED: order_rejections.seller_load_item_id is now nullable");
            } catch (Exception e) {
                // Already fixed or doesn't exist — ignore
                System.out.println("DB FIX SKIPPED (already applied or not needed): " + e.getMessage());
            }

            try {
                // Fix 2: update orders status check constraint to include RECHAZADO
                jdbcTemplate.execute(
                    "ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check"
                );
                jdbcTemplate.execute(
                    "ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('PENDIENTE', 'EN_PREPARACION', 'ENTREGADO', 'CANCELADO', 'RECHAZADO'))"
                );
                System.out.println("DB FIX APPLIED: orders_status_check now includes RECHAZADO");
            } catch (Exception e) {
                System.out.println("DB FIX SKIPPED (already applied or not needed): " + e.getMessage());
            }
        };
    }
}
