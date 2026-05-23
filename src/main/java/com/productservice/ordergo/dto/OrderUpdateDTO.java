package com.productservice.ordergo.dto;

import com.productservice.ordergo.entity.OrderStatus;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderUpdateDTO {

    private Long id;

    private String orderNumber;

    @NotNull(message = "El cliente es obligatorio")
    private Long customerId;

    private String customerName;

    private String customerPhone;

    private Long deliveryPersonId;

    private OrderStatus status;

    private BigDecimal totalAmount;

    private String deliveryAddress;

    private String paymentMethod;

    private List<OrderItemDTO> items;
}
