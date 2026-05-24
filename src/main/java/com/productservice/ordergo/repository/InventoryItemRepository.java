package com.productservice.ordergo.repository;

import com.productservice.ordergo.entity.InventoryItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

@Repository
public interface InventoryItemRepository extends JpaRepository<InventoryItem, Long> {
    List<InventoryItem> findByNameContainingIgnoreCase(String name);
    Page<InventoryItem> findByNameContainingIgnoreCase(String name, Pageable pageable);

    @Query("SELECT i FROM InventoryItem i WHERE i.id NOT IN (SELECT p.inventoryItem.id FROM Product p WHERE p.inventoryItem IS NOT NULL)")
    List<InventoryItem> findUnlinked();

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE InventoryItem i SET i.supplier = null WHERE i.supplier.id = :supplierId")
    void unlinkBySupplierId(Long supplierId);
}
