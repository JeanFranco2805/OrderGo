package com.productservice.ordergo.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RejectOrderBatchDTO {

    @NotEmpty(message = "Debe enviar al menos un item de rechazo")
    private List<RejectOrderDTO> items;
}
