package com.productservice.ordergo.service;

import com.productservice.ordergo.dto.DiscountDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface DiscountService {
    List<DiscountDTO> findAll();
    Page<DiscountDTO> findAll(Pageable pageable);
    DiscountDTO findById(Long id);
    DiscountDTO findByCode(String code);
    Page<DiscountDTO> search(String query, Pageable pageable);
    DiscountDTO create(DiscountDTO dto);
    DiscountDTO update(Long id, DiscountDTO dto);
    void delete(Long id);
    DiscountDTO applyUsage(Long id);
}
