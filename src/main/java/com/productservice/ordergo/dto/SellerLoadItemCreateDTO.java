package com.productservice.ordergo.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SellerLoadItemCreateDTO {

    @NotNull(message = "El producto es obligatorio")
    private Long productId;

    @NotNull(message = "La cantidad cargada es obligatoria")
    @Min(value = 1, message = "La cantidad mínima es 1")
    private BigDecimal quantityLoaded;

    @NotNull(message = "La unidad de medida es obligatoria")
    private String unitOfMeasure;
}
