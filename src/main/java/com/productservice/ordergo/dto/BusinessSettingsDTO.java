package com.productservice.ordergo.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BusinessSettingsDTO {

    private Long id;

    @NotBlank(message = "El nombre del negocio es obligatorio")
    @Size(max = 150, message = "El nombre no puede exceder 150 caracteres")
    private String businessName;

    @Size(max = 150, message = "El correo no puede exceder 150 caracteres")
    private String email;

    @Size(max = 30, message = "El teléfono no puede exceder 30 caracteres")
    private String phone;

    @Size(max = 250, message = "La dirección no puede exceder 250 caracteres")
    private String address;

    @Size(max = 10, message = "La moneda no puede exceder 10 caracteres")
    private String currency;

    @DecimalMin(value = "0.0", message = "El impuesto no puede ser negativo")
    @DecimalMax(value = "100.0", message = "El impuesto no puede superar 100%")
    private BigDecimal tax;
}
