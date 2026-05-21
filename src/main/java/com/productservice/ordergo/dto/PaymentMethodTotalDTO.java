package com.productservice.ordergo.dto;

import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentMethodTotalDTO {
    private String paymentMethod;
    private BigDecimal total;
}
