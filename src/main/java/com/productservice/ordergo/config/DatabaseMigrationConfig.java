package com.productservice.ordergo.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class DatabaseMigrationConfig {

    @Bean
    CommandLineRunner fixOrderItemsNullable(JdbcTemplate jdbcTemplate) {
        return args -> {
            try {
                jdbcTemplate.execute("ALTER TABLE order_items ALTER COLUMN product_id DROP NOT NULL");
                System.out.println("✅ Migración aplicada: product_id en order_items ahora permite NULL");
            } catch (Exception e) {
                // Constraint might already be dropped, ignore
                System.out.println("ℹ️ Migración omitida: " + e.getMessage());
            }
        };
    }

    @Bean
    CommandLineRunner addInvoiceTaxColumns(JdbcTemplate jdbcTemplate) {
        return args -> {
            try {
                jdbcTemplate.execute("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS subtotal NUMERIC(15,2) NOT NULL DEFAULT 0");
                jdbcTemplate.execute("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(15,2) NOT NULL DEFAULT 0");
                // Backfill existing rows
                jdbcTemplate.execute("UPDATE invoices SET subtotal = amount WHERE subtotal = 0");
                System.out.println("✅ Migración aplicada: columnas subtotal y tax_amount agregadas a invoices");
            } catch (Exception e) {
                System.out.println("ℹ️ Migración de impuestos omitida: " + e.getMessage());
            }
        };
    }

    @Bean
    CommandLineRunner addOfferDeletedColumn(JdbcTemplate jdbcTemplate) {
        return args -> {
            try {
                jdbcTemplate.execute("ALTER TABLE offers ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT false");
                System.out.println("✅ Migración aplicada: columna deleted agregada a offers");
            } catch (Exception e) {
                System.out.println("ℹ️ Migración de offers omitida: " + e.getMessage());
            }
        };
    }
}
