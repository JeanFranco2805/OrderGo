package com.productservice.ordergo.service.impl;

import com.productservice.ordergo.dto.PaymentMethodDTO;
import com.productservice.ordergo.entity.PaymentMethod;
import com.productservice.ordergo.exception.BusinessException;
import com.productservice.ordergo.exception.ResourceNotFoundException;
import com.productservice.ordergo.repository.PaymentMethodRepository;
import com.productservice.ordergo.service.PaymentMethodService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PaymentMethodServiceImpl implements PaymentMethodService {

    private final PaymentMethodRepository paymentMethodRepository;

    @Override
    public List<PaymentMethodDTO> findAll() {
        return paymentMethodRepository.findAll().stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    @Override
    public PaymentMethodDTO findById(Long id) {
        PaymentMethod method = paymentMethodRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Método de pago no encontrado con id: " + id));
        return toDTO(method);
    }

    @Override
    @Transactional
    public PaymentMethodDTO create(PaymentMethodDTO dto) {
        String normalized = dto.getName().trim().toUpperCase();
        if (paymentMethodRepository.existsByNameIgnoreCase(normalized)) {
            throw new BusinessException("El método de pago '" + normalized + "' ya existe");
        }
        PaymentMethod method = PaymentMethod.builder()
            .name(normalized)
            .build();
        return toDTO(paymentMethodRepository.save(method));
    }

    @Override
    @Transactional
    public PaymentMethodDTO update(Long id, PaymentMethodDTO dto) {
        PaymentMethod existing = paymentMethodRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Método de pago no encontrado con id: " + id));
        String normalized = dto.getName().trim().toUpperCase();
        if (!existing.getName().equalsIgnoreCase(normalized) && paymentMethodRepository.existsByNameIgnoreCase(normalized)) {
            throw new BusinessException("El método de pago '" + normalized + "' ya existe");
        }
        existing.setName(normalized);
        return toDTO(paymentMethodRepository.save(existing));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!paymentMethodRepository.existsById(id)) {
            throw new ResourceNotFoundException("Método de pago no encontrado con id: " + id);
        }
        paymentMethodRepository.deleteById(id);
    }

    private PaymentMethodDTO toDTO(PaymentMethod method) {
        return PaymentMethodDTO.builder()
            .id(method.getId())
            .name(method.getName())
            .build();
    }
}
