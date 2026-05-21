package com.productservice.ordergo.service.impl;

import com.productservice.ordergo.dto.InventoryExpenseDTO;
import com.productservice.ordergo.entity.InventoryExpense;
import com.productservice.ordergo.entity.InventoryItem;
import com.productservice.ordergo.entity.Product;
import com.productservice.ordergo.entity.Supplier;
import com.productservice.ordergo.exception.ResourceNotFoundException;
import com.productservice.ordergo.repository.InventoryExpenseRepository;
import com.productservice.ordergo.repository.InventoryItemRepository;
import com.productservice.ordergo.repository.ProductRepository;
import com.productservice.ordergo.repository.SupplierRepository;
import com.productservice.ordergo.service.InventoryExpenseService;
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
public class InventoryExpenseServiceImpl implements InventoryExpenseService {

    private final InventoryExpenseRepository inventoryExpenseRepository;
    private final InventoryItemRepository inventoryItemRepository;
    private final SupplierRepository supplierRepository;
    private final ProductRepository productRepository;

    @Override
    public List<InventoryExpenseDTO> findAll() {
        return inventoryExpenseRepository.findAll().stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    @Override
    public InventoryExpenseDTO findById(Long id) {
        InventoryExpense expense = inventoryExpenseRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Gasto no encontrado con id: " + id));
        return toDTO(expense);
    }

    @Override
    public List<InventoryExpenseDTO> findByInventoryItemId(Long inventoryItemId) {
        return inventoryExpenseRepository.findByInventoryItemId(inventoryItemId)
            .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public List<InventoryExpenseDTO> findBySupplierId(Long supplierId) {
        return inventoryExpenseRepository.findBySupplierId(supplierId)
            .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public Page<InventoryExpenseDTO> findAll(Pageable pageable) {
        return inventoryExpenseRepository.findAll(pageable).map(this::toDTO);
    }

    @Override
    public Page<InventoryExpenseDTO> findByInventoryItemId(Long inventoryItemId, Pageable pageable) {
        return inventoryExpenseRepository.findByInventoryItemId(inventoryItemId, pageable).map(this::toDTO);
    }

    @Override
    public Page<InventoryExpenseDTO> findBySupplierId(Long supplierId, Pageable pageable) {
        return inventoryExpenseRepository.findBySupplierId(supplierId, pageable).map(this::toDTO);
    }

    @Override
    @Transactional
    public InventoryExpenseDTO create(InventoryExpenseDTO dto) {
        InventoryExpense expense = toEntity(dto);
        expense.setTotalCost(expense.getUnitCost().multiply(java.math.BigDecimal.valueOf(expense.getQuantity())));

        // Actualizar stock y costo del inventario
        InventoryItem item = expense.getInventoryItem();
        item.setQuantity(item.getQuantity() + expense.getQuantity());
        if (expense.getUnitCost() != null) {
            item.setCostPrice(expense.getUnitCost());
        }
        inventoryItemRepository.save(item);

        // Sincronizar stock con producto vinculado
        syncProductStock(item.getId(), expense.getQuantity().intValue());

        return toDTO(inventoryExpenseRepository.save(expense));
    }

    @Override
    @Transactional
    public InventoryExpenseDTO update(Long id, InventoryExpenseDTO dto) {
        InventoryExpense existing = inventoryExpenseRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Gasto no encontrado con id: " + id));

        // Revertir stock anterior del inventario
        InventoryItem oldItem = existing.getInventoryItem();
        oldItem.setQuantity(oldItem.getQuantity() - existing.getQuantity());
        inventoryItemRepository.save(oldItem);
        syncProductStock(oldItem.getId(), -existing.getQuantity().intValue());

        // Actualizar con nuevos valores
        InventoryItem newItem = inventoryItemRepository.findById(dto.getInventoryItemId())
            .orElseThrow(() -> new ResourceNotFoundException("Ítem no encontrado con id: " + dto.getInventoryItemId()));
        existing.setInventoryItem(newItem);
        if (dto.getSupplierId() != null) {
            Supplier supplier = supplierRepository.findById(dto.getSupplierId())
                .orElseThrow(() -> new ResourceNotFoundException("Proveedor no encontrado con id: " + dto.getSupplierId()));
            existing.setSupplier(supplier);
        } else {
            existing.setSupplier(null);
        }
        existing.setQuantity(dto.getQuantity());
        existing.setUnitCost(dto.getUnitCost());
        existing.setTotalCost(dto.getUnitCost().multiply(java.math.BigDecimal.valueOf(dto.getQuantity())));
        existing.setExpenseDate(dto.getExpenseDate());
        existing.setDescription(dto.getDescription());

        // Aplicar nuevo stock
        newItem.setQuantity(newItem.getQuantity() + dto.getQuantity());
        inventoryItemRepository.save(newItem);
        syncProductStock(newItem.getId(), dto.getQuantity().intValue());

        return toDTO(inventoryExpenseRepository.save(existing));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        InventoryExpense expense = inventoryExpenseRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Gasto no encontrado con id: " + id));
        // Revertir stock del inventario
        InventoryItem item = expense.getInventoryItem();
        item.setQuantity(item.getQuantity() - expense.getQuantity());
        inventoryItemRepository.save(item);
        syncProductStock(item.getId(), -expense.getQuantity().intValue());
        inventoryExpenseRepository.deleteById(id);
    }

    private void syncProductStock(Long inventoryItemId, int quantityDelta) {
        List<Product> linkedProducts = productRepository.findByInventoryItemId(inventoryItemId);
        for (Product p : linkedProducts) {
            int newStock = p.getStock() + quantityDelta;
            p.setStock(Math.max(newStock, 0));
            productRepository.save(p);
        }
    }

    private InventoryExpenseDTO toDTO(InventoryExpense e) {
        return InventoryExpenseDTO.builder()
            .id(e.getId())
            .inventoryItemId(e.getInventoryItem().getId())
            .inventoryItemName(e.getInventoryItem().getName())
            .supplierId(e.getSupplier() != null ? e.getSupplier().getId() : null)
            .supplierName(e.getSupplier() != null ? e.getSupplier().getName() : null)
            .quantity(e.getQuantity())
            .unitCost(e.getUnitCost())
            .totalCost(e.getTotalCost())
            .expenseDate(e.getExpenseDate())
            .description(e.getDescription())
            .build();
    }

    private InventoryExpense toEntity(InventoryExpenseDTO dto) {
        InventoryItem item = inventoryItemRepository.findById(dto.getInventoryItemId())
            .orElseThrow(() -> new ResourceNotFoundException("Ítem no encontrado con id: " + dto.getInventoryItemId()));
        Supplier supplier = null;
        if (dto.getSupplierId() != null) {
            supplier = supplierRepository.findById(dto.getSupplierId())
                .orElseThrow(() -> new ResourceNotFoundException("Proveedor no encontrado con id: " + dto.getSupplierId()));
        }
        return InventoryExpense.builder()
            .inventoryItem(item)
            .supplier(supplier)
            .quantity(dto.getQuantity())
            .unitCost(dto.getUnitCost())
            .expenseDate(dto.getExpenseDate())
            .description(dto.getDescription())
            .build();
    }
}
