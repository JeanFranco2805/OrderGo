package com.productservice.ordergo.dto;

import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardStatsDTO {
    // Métricas del mes actual
    private BigDecimal totalSales;
    private Long totalOrders;
    private BigDecimal averageTicket;

    // Métricas acumuladas
    private BigDecimal totalSalesAllTime;
    private Long totalOrdersAllTime;
    private Long totalCustomers;

    // Facturación
    private BigDecimal totalReceivable;
    private Long pendingInvoices;
}
