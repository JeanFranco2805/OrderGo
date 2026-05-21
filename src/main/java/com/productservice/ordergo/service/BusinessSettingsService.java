package com.productservice.ordergo.service;

import com.productservice.ordergo.dto.BusinessSettingsDTO;

public interface BusinessSettingsService {
    BusinessSettingsDTO getSettings();
    BusinessSettingsDTO saveSettings(BusinessSettingsDTO dto);
}
