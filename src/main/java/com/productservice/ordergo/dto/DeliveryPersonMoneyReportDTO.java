package com.productservice.ordergo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliveryPersonMoneyReportDTO {
    private Long deliveryPersonId;
    private String deliveryPersonName;
    private BigDecimal deliveredValue;
    private BigDecimal rejectedValue;
    private BigDecimal totalValue;
    private String periodLabel; // ej: "2026-05" o "General"
}
