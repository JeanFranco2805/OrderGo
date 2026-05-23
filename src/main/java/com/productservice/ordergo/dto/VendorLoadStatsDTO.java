package com.productservice.ordergo.dto;

import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VendorLoadStatsDTO {

    private BigDecimal totalLoaded;
    private BigDecimal totalDelivered;
    private BigDecimal totalRemaining;
    private BigDecimal totalRejected;
}
