package com.productservice.ordergo.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryExpenseDTO {

    private Long id;

    @NotNull(message = "El insumo es obligatorio")
    private Long inventoryItemId;

    private String inventoryItemName;

    private Long supplierId;

    private String supplierName;

    @NotNull(message = "La cantidad es obligatoria")
    @DecimalMin(value = "0.01", message = "La cantidad debe ser mayor a 0")
    private Double quantity;

    @NotNull(message = "El costo unitario es obligatorio")
    @DecimalMin(value = "0.0", message = "El costo unitario no puede ser negativo")
    private BigDecimal unitCost;

    private BigDecimal totalCost;

    @NotNull(message = "La fecha es obligatoria")
    private LocalDate expenseDate;

    @Size(max = 500, message = "La descripción no puede exceder 500 caracteres")
    private String description;
}
