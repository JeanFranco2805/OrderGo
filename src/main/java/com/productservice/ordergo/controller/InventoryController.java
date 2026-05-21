package com.productservice.ordergo.controller;

import com.productservice.ordergo.dto.InventoryItemDTO;
import com.productservice.ordergo.service.FileStorageService;
import com.productservice.ordergo.service.InventoryItemService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryItemService inventoryItemService;
    private final FileStorageService fileStorageService;

    @PostMapping("/{id}/image")
    public ResponseEntity<InventoryItemDTO> uploadImage(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        String imageUrl = fileStorageService.storeImage(file, "inventory");
        return ResponseEntity.ok(inventoryItemService.updateImage(id, imageUrl));
    }

    @GetMapping
    public ResponseEntity<Page<InventoryItemDTO>> getAll(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        if (search != null && !search.isBlank()) {
            return ResponseEntity.ok(inventoryItemService.search(search, pageable));
        }
        return ResponseEntity.ok(inventoryItemService.findAll(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<InventoryItemDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(inventoryItemService.findById(id));
    }

    @PostMapping
    public ResponseEntity<InventoryItemDTO> create(@Valid @RequestBody InventoryItemDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(inventoryItemService.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<InventoryItemDTO> update(@PathVariable Long id, @Valid @RequestBody InventoryItemDTO dto) {
        return ResponseEntity.ok(inventoryItemService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        inventoryItemService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
