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
public class OrderDTO {

    private Long id;

    private String orderNumber;

    @NotNull(message = "El cliente es obligatorio")
    private Long customerId;

    private String customerName;

    private String customerPhone;

    private Long sellerId;

    private String sellerName;

    private Long deliveryPersonId;

    private String deliveryPersonName;

    private OrderStatus status;

    private BigDecimal totalAmount;

    private String deliveryAddress;

    private String paymentMethod;

    @NotEmpty(message = "El pedido debe tener al menos un item")
    private List<OrderItemDTO> items;
}
