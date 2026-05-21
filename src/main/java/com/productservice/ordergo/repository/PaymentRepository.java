package com.productservice.ordergo.repository;

import com.productservice.ordergo.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findByInvoiceId(Long invoiceId);

    @Query("SELECT p.paymentMethod, SUM(p.amount) FROM Payment p WHERE p.paymentDate >= :startDate GROUP BY p.paymentMethod")
    List<Object[]> sumByPaymentMethodSince(@Param("startDate") LocalDate startDate);
}
