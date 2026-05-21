package com.productservice.ordergo.service.impl;

import com.productservice.ordergo.dto.BusinessSettingsDTO;
import com.productservice.ordergo.entity.BusinessSettings;
import com.productservice.ordergo.repository.BusinessSettingsRepository;
import com.productservice.ordergo.service.BusinessSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class BusinessSettingsServiceImpl implements BusinessSettingsService {

    private final BusinessSettingsRepository repository;

    @Override
    @Transactional(readOnly = true)
    public BusinessSettingsDTO getSettings() {
        BusinessSettings settings = repository.findTopByOrderByIdAsc()
            .orElseGet(() -> repository.save(BusinessSettings.builder().businessName("Mi Negocio").currency("COP").build()));
        return toDTO(settings);
    }

    @Override
    @Transactional
    public BusinessSettingsDTO saveSettings(BusinessSettingsDTO dto) {
        BusinessSettings settings = repository.findTopByOrderByIdAsc()
            .orElseGet(BusinessSettings::new);
        settings.setBusinessName(dto.getBusinessName());
        settings.setEmail(dto.getEmail());
        settings.setPhone(dto.getPhone());
        settings.setAddress(dto.getAddress());
        settings.setCurrency(dto.getCurrency());
        settings.setTax(dto.getTax());
        return toDTO(repository.save(settings));
    }

    private BusinessSettingsDTO toDTO(BusinessSettings s) {
        return BusinessSettingsDTO.builder()
            .id(s.getId())
            .businessName(s.getBusinessName())
            .email(s.getEmail())
            .phone(s.getPhone())
            .address(s.getAddress())
            .currency(s.getCurrency())
            .tax(s.getTax())
            .build();
    }
}
