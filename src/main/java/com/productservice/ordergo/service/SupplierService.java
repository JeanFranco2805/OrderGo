package com.productservice.ordergo.service;

import com.productservice.ordergo.dto.SupplierDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface SupplierService {
    List<SupplierDTO> findAll();
    Page<SupplierDTO> findAll(Pageable pageable);
    SupplierDTO findById(Long id);
    List<SupplierDTO> search(String name);
    Page<SupplierDTO> search(String name, Pageable pageable);
    SupplierDTO create(SupplierDTO dto);
    SupplierDTO update(Long id, SupplierDTO dto);
    void delete(Long id);
}
