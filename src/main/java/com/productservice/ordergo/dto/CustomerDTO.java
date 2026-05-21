package com.productservice.ordergo.dto;

import jakarta.validation.constraints.*;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerDTO {

    private Long id;

    @NotBlank(message = "El nombre es obligatorio")
    @Size(max = 150, message = "El nombre no puede exceder 150 caracteres")
    private String name;

    @NotBlank(message = "El email es obligatorio")
    @Email(message = "El email no es válido")
    @Size(max = 150, message = "El email no puede exceder 150 caracteres")
    private String email;

    @Size(max = 30, message = "El teléfono no puede exceder 30 caracteres")
    private String phone;

    @Size(max = 250, message = "La dirección no puede exceder 250 caracteres")
    private String address;

    private Long sellerId;

    private String sellerName;

    @Size(max = 20, message = "El día de visita no puede exceder 20 caracteres")
    private String visitDay;

    @Size(max = 60, message = "La zona no puede exceder 60 caracteres")
    private String zone;

    @Size(max = 20, message = "La frecuencia no puede exceder 20 caracteres")
    private String visitFrequency;
}
