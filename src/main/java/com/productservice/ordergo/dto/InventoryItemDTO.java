package com.productservice.ordergo.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryItemDTO {

    private Long id;

    @NotBlank(message = "El nombre es obligatorio")
    @Size(max = 150, message = "El nombre no puede exceder 150 caracteres")
    private String name;

    @Size(max = 1000, message = "La descripción no puede exceder 1000 caracteres")
    private String description;

    @Size(max = 50, message = "La categoría no puede exceder 50 caracteres")
    private String category;

    @NotNull(message = "La cantidad es obligatoria")
    @DecimalMin(value = "0.0", message = "La cantidad no puede ser negativa")
    private Double quantity;

    @DecimalMin(value = "0.0", message = "El costo no puede ser negativo")
    private BigDecimal costPrice;

    @DecimalMin(value = "0.0", message = "El precio de venta no puede ser negativo")
    private BigDecimal salePrice;

    private Long supplierId;

    private String supplierName;

    @Size(max = 500, message = "La URL de imagen no puede exceder 500 caracteres")
    private String imageUrl;
}
