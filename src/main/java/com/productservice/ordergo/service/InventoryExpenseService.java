package com.productservice.ordergo.service;

import com.productservice.ordergo.dto.InventoryExpenseDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface InventoryExpenseService {
    List<InventoryExpenseDTO> findAll();
    Page<InventoryExpenseDTO> findAll(Pageable pageable);
    InventoryExpenseDTO findById(Long id);
    List<InventoryExpenseDTO> findByInventoryItemId(Long inventoryItemId);
    Page<InventoryExpenseDTO> findByInventoryItemId(Long inventoryItemId, Pageable pageable);
    List<InventoryExpenseDTO> findBySupplierId(Long supplierId);
    Page<InventoryExpenseDTO> findBySupplierId(Long supplierId, Pageable pageable);
    InventoryExpenseDTO create(InventoryExpenseDTO dto);
    InventoryExpenseDTO update(Long id, InventoryExpenseDTO dto);
    void delete(Long id);
}
