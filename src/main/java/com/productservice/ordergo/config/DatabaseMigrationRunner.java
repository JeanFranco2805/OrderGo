package com.productservice.ordergo.config;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;

@Component
@RequiredArgsConstructor
public class DatabaseMigrationRunner implements CommandLineRunner {

    private final DataSource dataSource;

    @Override
    public void run(String... args) throws Exception {
        try (Connection conn = dataSource.getConnection(); Statement stmt = conn.createStatement()) {
            // Invoices
            makeColumnNullable(stmt, "invoices", "customer_id");
            // Orders
            makeColumnNullable(stmt, "orders", "customer_id");
            // Order rejections
            makeColumnNullable(stmt, "order_rejections", "customer_id");
        }
    }

    private void makeColumnNullable(Statement stmt, String table, String column) throws Exception {
        String checkSql = String.format(
            "SELECT is_nullable FROM information_schema.columns WHERE table_name = '%s' AND column_name = '%s'",
            table, column
        );
        try (ResultSet rs = stmt.executeQuery(checkSql)) {
            if (rs.next()) {
                String isNullable = rs.getString("is_nullable");
                if ("NO".equalsIgnoreCase(isNullable)) {
                    String alterSql = String.format("ALTER TABLE %s ALTER COLUMN %s DROP NOT NULL", table, column);
                    stmt.execute(alterSql);
                    System.out.println("Migrated: " + table + "." + column + " is now nullable.");
                }
            }
        }
    }
}
