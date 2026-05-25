package com.productservice.ordergo.repository;

import com.productservice.ordergo.entity.Invoice;
import com.productservice.ordergo.entity.InvoiceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    List<Invoice> findByInvoiceNumberContainingIgnoreCaseOrCustomer_NameContainingIgnoreCase(String invoiceNumber, String customerName);
    Page<Invoice> findByInvoiceNumberContainingIgnoreCaseOrCustomer_NameContainingIgnoreCase(String invoiceNumber, String customerName, Pageable pageable);
    List<Invoice> findByStatus(InvoiceStatus status);

    @Query("SELECT COALESCE(SUM(i.amount), 0) FROM Invoice i")
    BigDecimal getTotalInvoiced();

    @Query("SELECT COALESCE(SUM(i.amount), 0) FROM Invoice i WHERE YEAR(i.invoiceDate) = YEAR(CURRENT_DATE) AND MONTH(i.invoiceDate) = MONTH(CURRENT_DATE)")
    BigDecimal getTotalInvoicedThisMonth();

    @Query("SELECT COALESCE(SUM(i.amount - i.paid), 0) FROM Invoice i WHERE i.status <> 'PAGADA'")
    BigDecimal getTotalPending();

    @Query("SELECT COUNT(i) FROM Invoice i WHERE YEAR(i.invoiceDate) = YEAR(CURRENT_DATE) AND MONTH(i.invoiceDate) = MONTH(CURRENT_DATE)")
    Long countThisMonth();

    @Query("SELECT YEAR(i.invoiceDate), MONTH(i.invoiceDate), SUM(i.amount) FROM Invoice i WHERE i.invoiceDate >= :startDate GROUP BY YEAR(i.invoiceDate), MONTH(i.invoiceDate) ORDER BY YEAR(i.invoiceDate) DESC, MONTH(i.invoiceDate) DESC")
    List<Object[]> findMonthlyTotals(@Param("startDate") LocalDate startDate);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE Invoice i SET i.orderId = null, i.orderNumber = null WHERE i.orderId = :orderId")
    void unlinkByOrderId(Long orderId);

    long countByCustomerId(Long customerId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE Invoice i SET i.customer = null WHERE i.customer.id = :customerId")
    void unlinkByCustomerId(Long customerId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM Invoice i WHERE i.customer.id = :customerId")
    void deleteByCustomerId(Long customerId);

    @Query("SELECT COALESCE(SUM(i.amount), 0) FROM Invoice i WHERE i.invoiceDate = :date")
    BigDecimal getTotalInvoicedByDate(@Param("date") LocalDate date);

    @Query("SELECT COUNT(i) FROM Invoice i WHERE i.invoiceDate = :date")
    Long countByInvoiceDate(@Param("date") LocalDate date);
}
