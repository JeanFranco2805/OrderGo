package com.productservice.ordergo.service;

import com.productservice.ordergo.dto.PaymentMethodDTO;

import java.util.List;

public interface PaymentMethodService {
    List<PaymentMethodDTO> findAll();
    PaymentMethodDTO findById(Long id);
    PaymentMethodDTO create(PaymentMethodDTO dto);
    PaymentMethodDTO update(Long id, PaymentMethodDTO dto);
    void delete(Long id);
}
