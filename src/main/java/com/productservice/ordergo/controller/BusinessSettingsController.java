package com.productservice.ordergo.controller;

import com.productservice.ordergo.dto.BusinessSettingsDTO;
import com.productservice.ordergo.service.BusinessSettingsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/business-settings")
@RequiredArgsConstructor
public class BusinessSettingsController {

    private final BusinessSettingsService businessSettingsService;

    @GetMapping
    public ResponseEntity<BusinessSettingsDTO> getSettings() {
        return ResponseEntity.ok(businessSettingsService.getSettings());
    }

    @PutMapping
    public ResponseEntity<BusinessSettingsDTO> saveSettings(@Valid @RequestBody BusinessSettingsDTO dto) {
        return ResponseEntity.ok(businessSettingsService.saveSettings(dto));
    }
}
