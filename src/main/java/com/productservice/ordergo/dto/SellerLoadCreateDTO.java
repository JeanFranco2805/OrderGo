package com.productservice.ordergo.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.*;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SellerLoadCreateDTO {

    @NotEmpty(message = "La carga debe tener al menos un item")
    private List<SellerLoadItemCreateDTO> items;
}
