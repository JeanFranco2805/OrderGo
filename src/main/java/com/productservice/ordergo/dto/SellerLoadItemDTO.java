package com.productservice.ordergo.dto;

import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SellerLoadItemDTO {

    private Long id;
    private Long productId;
    private String productName;
    private BigDecimal quantityLoaded;
    private BigDecimal quantityDelivered;
    private BigDecimal quantityRejected;
    private BigDecimal originalQuantityLoaded;
    private String unitOfMeasure;
}
