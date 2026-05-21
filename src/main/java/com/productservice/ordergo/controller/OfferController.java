package com.productservice.ordergo.controller;

import com.productservice.ordergo.dto.OfferDTO;
import com.productservice.ordergo.service.FileStorageService;
import com.productservice.ordergo.service.OfferService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/offers")
@RequiredArgsConstructor
public class OfferController {

    private final OfferService offerService;
    private final FileStorageService fileStorageService;

    @GetMapping("/active")
    public ResponseEntity<List<OfferDTO>> getActive() {
        return ResponseEntity.ok(offerService.findAllActive());
    }

    @GetMapping("/deleted")
    public ResponseEntity<List<OfferDTO>> getDeleted() {
        return ResponseEntity.ok(offerService.findAllDeleted());
    }

    @GetMapping
    public ResponseEntity<Page<OfferDTO>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(offerService.findAll(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<OfferDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(offerService.findById(id));
    }

    @PostMapping
    public ResponseEntity<OfferDTO> create(@Valid @RequestBody OfferDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(offerService.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<OfferDTO> update(@PathVariable Long id, @Valid @RequestBody OfferDTO dto) {
        return ResponseEntity.ok(offerService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        offerService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/force")
    public ResponseEntity<Void> forceDelete(@PathVariable Long id) {
        offerService.forceDelete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/restore")
    public ResponseEntity<OfferDTO> restore(@PathVariable Long id) {
        return ResponseEntity.ok(offerService.restore(id));
    }

    @PostMapping("/{id}/image")
    public ResponseEntity<OfferDTO> uploadImage(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        String imageUrl = fileStorageService.storeImage(file, "offers");
        return ResponseEntity.ok(offerService.updateImage(id, imageUrl));
    }
}
