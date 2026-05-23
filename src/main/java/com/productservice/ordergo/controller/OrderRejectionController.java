package com.productservice.ordergo.controller;

import com.productservice.ordergo.dto.OrderRejectionDTO;
import com.productservice.ordergo.service.OrderRejectionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/order-rejections")
@RequiredArgsConstructor
public class OrderRejectionController {

    private final OrderRejectionService orderRejectionService;

    @GetMapping
    public ResponseEntity<List<OrderRejectionDTO>> getAll() {
        return ResponseEntity.ok(orderRejectionService.getAllRejections());
    }
}
