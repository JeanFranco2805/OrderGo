package com.productservice.ordergo.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OfferItemDTO {

    private Long id;

    @NotNull(message = "El producto es obligatorio")
    private Long productId;

    private String productName;

    @NotNull(message = "La cantidad es obligatoria")
    @Min(value = 1, message = "La cantidad debe ser al menos 1")
    private Integer quantity;

    private BigDecimal unitPrice;

    private BigDecimal subtotal;
}
