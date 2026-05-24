package com.productservice.ordergo.repository;

import com.productservice.ordergo.entity.InventoryExpense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface InventoryExpenseRepository extends JpaRepository<InventoryExpense, Long> {
    List<InventoryExpense> findByInventoryItemId(Long inventoryItemId);
    Page<InventoryExpense> findByInventoryItemId(Long inventoryItemId, Pageable pageable);
    void deleteByInventoryItemId(Long inventoryItemId);
    List<InventoryExpense> findBySupplierId(Long supplierId);
    Page<InventoryExpense> findBySupplierId(Long supplierId, Pageable pageable);

    @Query("SELECT YEAR(e.expenseDate), MONTH(e.expenseDate), SUM(e.totalCost) FROM InventoryExpense e WHERE e.expenseDate >= :startDate GROUP BY YEAR(e.expenseDate), MONTH(e.expenseDate) ORDER BY YEAR(e.expenseDate) DESC, MONTH(e.expenseDate) DESC")
    List<Object[]> findMonthlyTotals(@Param("startDate") LocalDate startDate);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE InventoryExpense e SET e.supplier = null WHERE e.supplier.id = :supplierId")
    void unlinkBySupplierId(Long supplierId);
}
