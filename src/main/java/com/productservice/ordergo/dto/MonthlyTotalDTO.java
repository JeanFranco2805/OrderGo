package com.productservice.ordergo.dto;

import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MonthlyTotalDTO {
    private String month;
    private BigDecimal amount;
}
