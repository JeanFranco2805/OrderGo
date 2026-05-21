package com.productservice.ordergo.dto;

import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VendorStatsDTO {
    private BigDecimal dozensSold;
    private Long totalOrders;
    private Long totalCustomers;
    private BigDecimal averageDozensPerOrder;
}
