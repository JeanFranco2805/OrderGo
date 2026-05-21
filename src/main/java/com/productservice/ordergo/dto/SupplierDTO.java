package com.productservice.ordergo.dto;

import jakarta.validation.constraints.*;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SupplierDTO {

    private Long id;

    @NotBlank(message = "El nombre es obligatorio")
    @Size(max = 150, message = "El nombre no puede exceder 150 caracteres")
    private String name;

    @Size(max = 150, message = "El correo no puede exceder 150 caracteres")
    @Email(message = "El correo no es válido")
    private String email;

    @Size(max = 30, message = "El teléfono no puede exceder 30 caracteres")
    private String phone;

    @Size(max = 250, message = "La dirección no puede exceder 250 caracteres")
    private String address;
}
