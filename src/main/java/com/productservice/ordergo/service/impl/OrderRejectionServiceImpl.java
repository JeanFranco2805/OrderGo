package com.productservice.ordergo.service.impl;

import com.productservice.ordergo.dto.OrderRejectionDTO;
import com.productservice.ordergo.entity.OrderRejection;
import com.productservice.ordergo.repository.OrderRejectionRepository;
import com.productservice.ordergo.service.OrderRejectionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderRejectionServiceImpl implements OrderRejectionService {

    private final OrderRejectionRepository orderRejectionRepository;

    @Override
    public List<OrderRejectionDTO> getAllRejections() {
        return orderRejectionRepository.findAllByOrderByRejectedAtDesc().stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    private OrderRejectionDTO toDTO(OrderRejection r) {
        return OrderRejectionDTO.builder()
            .id(r.getId())
            .orderId(r.getOrder() != null ? r.getOrder().getId() : null)
            .orderNumber(r.getOrder() != null ? r.getOrder().getOrderNumber() : null)
            .customerName(r.getCustomer() != null ? r.getCustomer().getName() : null)
            .productName(r.getProduct() != null ? r.getProduct().getName() : (r.getSellerLoadItem() != null && r.getSellerLoadItem().getProduct() != null ? r.getSellerLoadItem().getProduct().getName() : null))
            .sellerUsername(r.getOrder() != null && r.getOrder().getSeller() != null ? r.getOrder().getSeller().getUsername() : null)
            .deliveryPersonUsername(r.getDeliveryPerson() != null ? r.getDeliveryPerson().getUsername() : (r.getOrder() != null && r.getOrder().getDeliveryPerson() != null ? r.getOrder().getDeliveryPerson().getUsername() : null))
            .quantity(r.getQuantity())
            .reason(r.getReason())
            .rejectedAt(r.getRejectedAt())
            .build();
    }
}
