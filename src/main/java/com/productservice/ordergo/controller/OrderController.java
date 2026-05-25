package com.productservice.ordergo.controller;

import com.productservice.ordergo.dto.OrderDTO;
import com.productservice.ordergo.dto.OrderUpdateDTO;
import com.productservice.ordergo.dto.DeliveryPersonMoneyReportDTO;
import com.productservice.ordergo.entity.OrderStatus;
import com.productservice.ordergo.entity.User;
import com.productservice.ordergo.repository.OrderRepository;
import com.productservice.ordergo.repository.UserRepository;
import com.productservice.ordergo.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<Page<OrderDTO>> getAll(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        if (search != null && !search.isBlank()) {
            return ResponseEntity.ok(orderService.search(search, pageable));
        }
        return ResponseEntity.ok(orderService.findAll(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrderDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.findById(id));
    }

    @PostMapping
    public ResponseEntity<OrderDTO> create(@Valid @RequestBody OrderDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(orderService.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<OrderDTO> update(@PathVariable Long id, @Valid @RequestBody OrderUpdateDTO dto) {
        return ResponseEntity.ok(orderService.update(id, dto));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<OrderDTO> updateStatus(@PathVariable Long id, @RequestParam String status) {
        return ResponseEntity.ok(orderService.updateStatus(id, status));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        orderService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/force")
    public ResponseEntity<Void> forceDelete(@PathVariable Long id) {
        orderService.forceDelete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/pending-delivery")
    public ResponseEntity<List<OrderDTO>> getPendingDeliveries() {
        return ResponseEntity.ok(orderService.findPendingDeliveries());
    }

    @GetMapping("/money-report")
    public ResponseEntity<List<DeliveryPersonMoneyReportDTO>> getMoneyReport(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        List<User> deliveryPeople = userRepository.findAll().stream()
            .filter(u -> "DOMICILIARIO".equalsIgnoreCase(u.getRole()))
            .toList();

        String periodLabel = (year != null && month != null) ? String.format("%04d-%02d", year, month) : "General";

        List<DeliveryPersonMoneyReportDTO> result = deliveryPeople.stream().map(dp -> {
            java.math.BigDecimal delivered;
            java.math.BigDecimal rejected;
            if (year != null && month != null) {
                delivered = orderRepository.sumTotalAmountByDeliveryPersonIdAndStatusAndMonth(dp.getId(), OrderStatus.ENTREGADO, year, month);
                rejected = orderRepository.sumTotalAmountByDeliveryPersonIdAndStatusAndMonth(dp.getId(), OrderStatus.RECHAZADO, year, month);
            } else {
                delivered = orderRepository.sumTotalAmountByDeliveryPersonIdAndStatus(dp.getId(), OrderStatus.ENTREGADO);
                rejected = orderRepository.sumTotalAmountByDeliveryPersonIdAndStatus(dp.getId(), OrderStatus.RECHAZADO);
            }
            return DeliveryPersonMoneyReportDTO.builder()
                .deliveryPersonId(dp.getId())
                .deliveryPersonName(dp.getUsername())
                .deliveredValue(delivered != null ? delivered : java.math.BigDecimal.ZERO)
                .rejectedValue(rejected != null ? rejected : java.math.BigDecimal.ZERO)
                .totalValue(delivered != null && rejected != null ? delivered.add(rejected) : java.math.BigDecimal.ZERO)
                .periodLabel(periodLabel)
                .build();
        }).toList();

        return ResponseEntity.ok(result);
    }
}
