package com.productservice.ordergo.controller;

import com.productservice.ordergo.dto.InventoryExpenseDTO;
import com.productservice.ordergo.service.InventoryExpenseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/inventory-expenses")
@RequiredArgsConstructor
public class InventoryExpenseController {

    private final InventoryExpenseService inventoryExpenseService;

    @GetMapping
    public ResponseEntity<Page<InventoryExpenseDTO>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(inventoryExpenseService.findAll(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<InventoryExpenseDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(inventoryExpenseService.findById(id));
    }

    @GetMapping("/item/{inventoryItemId}")
    public ResponseEntity<Page<InventoryExpenseDTO>> getByInventoryItemId(
            @PathVariable Long inventoryItemId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(inventoryExpenseService.findByInventoryItemId(inventoryItemId, pageable));
    }

    @GetMapping("/supplier/{supplierId}")
    public ResponseEntity<Page<InventoryExpenseDTO>> getBySupplierId(
            @PathVariable Long supplierId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(inventoryExpenseService.findBySupplierId(supplierId, pageable));
    }

    @PostMapping
    public ResponseEntity<InventoryExpenseDTO> create(@Valid @RequestBody InventoryExpenseDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(inventoryExpenseService.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<InventoryExpenseDTO> update(@PathVariable Long id, @Valid @RequestBody InventoryExpenseDTO dto) {
        return ResponseEntity.ok(inventoryExpenseService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        inventoryExpenseService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
