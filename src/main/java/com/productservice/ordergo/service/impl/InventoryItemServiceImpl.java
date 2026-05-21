package com.productservice.ordergo.service.impl;

import com.productservice.ordergo.dto.InventoryItemDTO;
import com.productservice.ordergo.entity.InventoryItem;
import com.productservice.ordergo.entity.Supplier;
import com.productservice.ordergo.exception.ResourceNotFoundException;
import com.productservice.ordergo.repository.InventoryExpenseRepository;
import com.productservice.ordergo.repository.InventoryItemRepository;
import com.productservice.ordergo.repository.SupplierRepository;
import com.productservice.ordergo.service.InventoryItemService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InventoryItemServiceImpl implements InventoryItemService {

    private final InventoryItemRepository inventoryItemRepository;
    private final SupplierRepository supplierRepository;
    private final InventoryExpenseRepository inventoryExpenseRepository;
    private final com.productservice.ordergo.repository.ProductRepository productRepository;

    @Override
    public List<InventoryItemDTO> findAll() {
        return inventoryItemRepository.findAll().stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    @Override
    public InventoryItemDTO findById(Long id) {
        InventoryItem item = inventoryItemRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Ítem no encontrado con id: " + id));
        return toDTO(item);
    }

    @Override
    public List<InventoryItemDTO> search(String name) {
        if (name == null || name.isBlank()) return findAll();
        return inventoryItemRepository.findByNameContainingIgnoreCase(name)
            .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public Page<InventoryItemDTO> findAll(Pageable pageable) {
        return inventoryItemRepository.findAll(pageable).map(this::toDTO);
    }

    @Override
    public Page<InventoryItemDTO> search(String name, Pageable pageable) {
        if (name == null || name.isBlank()) return findAll(pageable);
        return inventoryItemRepository.findByNameContainingIgnoreCase(name, pageable).map(this::toDTO);
    }

    @Override
    @Transactional
    public InventoryItemDTO create(InventoryItemDTO dto) {
        InventoryItem item = toEntity(dto);
        item = inventoryItemRepository.save(item);

        // Si tiene costo y stock inicial, registrar como compra inicial
        if (dto.getCostPrice() != null && dto.getQuantity() != null && dto.getQuantity() > 0) {
            java.math.BigDecimal totalCost = dto.getCostPrice().multiply(java.math.BigDecimal.valueOf(dto.getQuantity()));
            com.productservice.ordergo.entity.InventoryExpense expense = com.productservice.ordergo.entity.InventoryExpense.builder()
                .inventoryItem(item)
                .supplier(item.getSupplier())
                .quantity(dto.getQuantity())
                .unitCost(dto.getCostPrice())
                .totalCost(totalCost)
                .expenseDate(java.time.LocalDate.now())
                .description("Compra inicial")
                .build();
            inventoryExpenseRepository.save(expense);
        }

        return toDTO(item);
    }

    @Override
    @Transactional
    public InventoryItemDTO update(Long id, InventoryItemDTO dto) {
        InventoryItem existing = inventoryItemRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Ítem no encontrado con id: " + id));
        existing.setName(dto.getName());
        existing.setDescription(dto.getDescription());
        existing.setCategory(dto.getCategory());
        existing.setQuantity(dto.getQuantity());
        existing.setCostPrice(dto.getCostPrice());
        existing.setSalePrice(dto.getSalePrice());
        existing.setSupplier(resolveSupplier(dto.getSupplierId()));
        existing.setImageUrl(dto.getImageUrl());
        return toDTO(inventoryItemRepository.save(existing));
    }

    @Override
    @Transactional
    public InventoryItemDTO updateImage(Long id, String imageUrl) {
        InventoryItem existing = inventoryItemRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Ítem no encontrado con id: " + id));
        existing.setImageUrl(imageUrl);
        return toDTO(inventoryItemRepository.save(existing));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!inventoryItemRepository.existsById(id)) {
            throw new ResourceNotFoundException("Ítem no encontrado con id: " + id);
        }
        List<com.productservice.ordergo.entity.Product> linkedProducts = productRepository.findByInventoryItemId(id);
        if (!linkedProducts.isEmpty()) {
            throw new com.productservice.ordergo.exception.BusinessException(
                "No se puede eliminar el ítem porque está vinculado a " + linkedProducts.size() + " producto(s) del catálogo."
            );
        }
        inventoryExpenseRepository.deleteByInventoryItemId(id);
        inventoryItemRepository.deleteById(id);
    }

    private Supplier resolveSupplier(Long supplierId) {
        if (supplierId == null) return null;
        return supplierRepository.findById(supplierId)
            .orElseThrow(() -> new ResourceNotFoundException("Proveedor no encontrado con id: " + supplierId));
    }

    private InventoryItemDTO toDTO(InventoryItem item) {
        return InventoryItemDTO.builder()
            .id(item.getId())
            .name(item.getName())
            .description(item.getDescription())
            .category(item.getCategory())
            .quantity(item.getQuantity())
            .costPrice(item.getCostPrice())
            .salePrice(item.getSalePrice())
            .supplierId(item.getSupplier() != null ? item.getSupplier().getId() : null)
            .supplierName(item.getSupplier() != null ? item.getSupplier().getName() : null)
            .imageUrl(item.getImageUrl())
            .build();
    }

    private InventoryItem toEntity(InventoryItemDTO dto) {
        return InventoryItem.builder()
            .name(dto.getName())
            .description(dto.getDescription())
            .category(dto.getCategory())
            .quantity(dto.getQuantity())
            .costPrice(dto.getCostPrice())
            .salePrice(dto.getSalePrice())
            .supplier(resolveSupplier(dto.getSupplierId()))
            .imageUrl(dto.getImageUrl())
            .build();
    }
}
