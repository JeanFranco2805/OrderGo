package com.productservice.ordergo.controller;

import com.productservice.ordergo.dto.DiscountDTO;
import com.productservice.ordergo.service.DiscountService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/discounts")
@RequiredArgsConstructor
public class DiscountController {

    private final DiscountService discountService;

    @GetMapping
    public ResponseEntity<Page<DiscountDTO>> getAll(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        if (search != null && !search.isBlank()) {
            return ResponseEntity.ok(discountService.search(search, pageable));
        }
        return ResponseEntity.ok(discountService.findAll(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DiscountDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(discountService.findById(id));
    }

    @GetMapping("/by-code/{code}")
    public ResponseEntity<DiscountDTO> getByCode(@PathVariable String code) {
        return ResponseEntity.ok(discountService.findByCode(code));
    }

    @PostMapping
    public ResponseEntity<DiscountDTO> create(@Valid @RequestBody DiscountDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(discountService.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<DiscountDTO> update(@PathVariable Long id, @Valid @RequestBody DiscountDTO dto) {
        return ResponseEntity.ok(discountService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        discountService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/apply")
    public ResponseEntity<DiscountDTO> applyUsage(@PathVariable Long id) {
        return ResponseEntity.ok(discountService.applyUsage(id));
    }
}
