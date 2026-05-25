package com.productservice.ordergo.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentMethodDTO {
    private Long id;
    private String name;
}
