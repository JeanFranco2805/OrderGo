package com.productservice.ordergo.service;

import com.productservice.ordergo.dto.InventoryItemDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface InventoryItemService {
    List<InventoryItemDTO> findAll();
    Page<InventoryItemDTO> findAll(Pageable pageable);
    InventoryItemDTO findById(Long id);
    List<InventoryItemDTO> search(String name);
    Page<InventoryItemDTO> search(String name, Pageable pageable);
    List<InventoryItemDTO> findUnlinked();
    InventoryItemDTO create(InventoryItemDTO dto);
    InventoryItemDTO update(Long id, InventoryItemDTO dto);
    InventoryItemDTO updateImage(Long id, String imageUrl);
    void delete(Long id);
}
