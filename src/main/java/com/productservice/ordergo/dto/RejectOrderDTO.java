package com.productservice.ordergo.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RejectOrderDTO {

    @NotNull(message = "El pedido es obligatorio")
    private Long orderId;

    private Long productId;

    private Long offerId;

    @NotNull(message = "La cantidad es obligatoria")
    @Min(value = 1, message = "La cantidad mínima es 1")
    private BigDecimal quantity;

    private String reason;

    private String previousStatus;
}
