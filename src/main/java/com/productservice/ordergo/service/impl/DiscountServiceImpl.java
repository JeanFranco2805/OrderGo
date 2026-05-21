package com.productservice.ordergo.service.impl;

import com.productservice.ordergo.dto.DiscountDTO;
import com.productservice.ordergo.entity.Discount;
import com.productservice.ordergo.exception.ResourceNotFoundException;
import com.productservice.ordergo.repository.DiscountRepository;
import com.productservice.ordergo.service.DiscountService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DiscountServiceImpl implements DiscountService {

    private final DiscountRepository discountRepository;

    @Override
    public List<DiscountDTO> findAll() {
        return discountRepository.findAll().stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    @Override
    public Page<DiscountDTO> findAll(Pageable pageable) {
        return discountRepository.findAll(pageable).map(this::toDTO);
    }

    @Override
    public DiscountDTO findById(Long id) {
        Discount discount = discountRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Descuento no encontrado con id: " + id));
        return toDTO(discount);
    }

    @Override
    public DiscountDTO findByCode(String code) {
        Discount discount = discountRepository.findByCodeIgnoreCase(code)
            .orElseThrow(() -> new ResourceNotFoundException("Descuento no encontrado con código: " + code));
        return toDTO(discount);
    }

    @Override
    public Page<DiscountDTO> search(String query, Pageable pageable) {
        if (query == null || query.isBlank()) return findAll(pageable);
        return discountRepository.findByCodeContainingIgnoreCaseOrDescriptionContainingIgnoreCase(query, query, pageable)
            .map(this::toDTO);
    }

    @Override
    @Transactional
    public DiscountDTO create(DiscountDTO dto) {
        Discount discount = toEntity(dto);
        return toDTO(discountRepository.save(discount));
    }

    @Override
    @Transactional
    public DiscountDTO update(Long id, DiscountDTO dto) {
        Discount existing = discountRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Descuento no encontrado con id: " + id));
        existing.setCode(dto.getCode());
        existing.setDescription(dto.getDescription());
        existing.setType(dto.getType());
        existing.setValue(dto.getValue());
        existing.setStartDate(dto.getStartDate());
        existing.setEndDate(dto.getEndDate());
        existing.setActive(dto.isActive());
        existing.setUsageLimit(dto.getUsageLimit());
        return toDTO(discountRepository.save(existing));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!discountRepository.existsById(id)) {
            throw new ResourceNotFoundException("Descuento no encontrado con id: " + id);
        }
        discountRepository.deleteById(id);
    }

    @Override
    @Transactional
    public DiscountDTO applyUsage(Long id) {
        Discount discount = discountRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Descuento no encontrado con id: " + id));
        discount.setUsageCount(discount.getUsageCount() + 1);
        if (discount.getUsageLimit() != null && discount.getUsageCount() >= discount.getUsageLimit()) {
            discount.setActive(false);
        }
        return toDTO(discountRepository.save(discount));
    }

    private DiscountDTO toDTO(Discount d) {
        return DiscountDTO.builder()
            .id(d.getId())
            .code(d.getCode())
            .description(d.getDescription())
            .type(d.getType())
            .value(d.getValue())
            .startDate(d.getStartDate())
            .endDate(d.getEndDate())
            .active(d.isActive())
            .usageLimit(d.getUsageLimit())
            .usageCount(d.getUsageCount())
            .build();
    }

    private Discount toEntity(DiscountDTO dto) {
        return Discount.builder()
            .code(dto.getCode())
            .description(dto.getDescription())
            .type(dto.getType())
            .value(dto.getValue())
            .startDate(dto.getStartDate())
            .endDate(dto.getEndDate())
            .active(dto.isActive())
            .usageLimit(dto.getUsageLimit())
            .usageCount(dto.getUsageCount() != null ? dto.getUsageCount() : 0)
            .build();
    }
}
