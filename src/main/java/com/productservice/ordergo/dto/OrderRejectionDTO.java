package com.productservice.ordergo.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderRejectionDTO {
    private Long id;
    private Long orderId;
    private String orderNumber;
    private String customerName;
    private String productName;
    private String sellerUsername;
    private String deliveryPersonUsername;
    private BigDecimal quantity;
    private String reason;
    private LocalDateTime rejectedAt;
}
