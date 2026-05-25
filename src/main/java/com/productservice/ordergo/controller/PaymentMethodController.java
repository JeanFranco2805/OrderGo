package com.productservice.ordergo.controller;

import com.productservice.ordergo.dto.PaymentMethodDTO;
import com.productservice.ordergo.service.PaymentMethodService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/payment-methods")
@RequiredArgsConstructor
public class PaymentMethodController {

    private final PaymentMethodService paymentMethodService;

    @GetMapping
    public ResponseEntity<List<PaymentMethodDTO>> getAll() {
        return ResponseEntity.ok(paymentMethodService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<PaymentMethodDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(paymentMethodService.findById(id));
    }

    @PostMapping
    public ResponseEntity<PaymentMethodDTO> create(@RequestBody PaymentMethodDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(paymentMethodService.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PaymentMethodDTO> update(@PathVariable Long id, @RequestBody PaymentMethodDTO dto) {
        return ResponseEntity.ok(paymentMethodService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        paymentMethodService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
