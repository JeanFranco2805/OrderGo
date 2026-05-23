package com.productservice.ordergo.repository;

import com.productservice.ordergo.entity.OrderRejection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface OrderRejectionRepository extends JpaRepository<OrderRejection, Long> {

    List<OrderRejection> findAllByOrderByRejectedAtDesc();

    boolean existsByOrderId(Long orderId);

    List<OrderRejection> findByOrderId(Long orderId);

    void deleteByOrderId(Long orderId);

    @Query("SELECT COUNT(r) FROM OrderRejection r WHERE CAST(r.rejectedAt AS DATE) = :date AND r.deliveryPerson.id = :dpId")
    Long countByDateAndDeliveryPerson(@Param("date") LocalDate date, @Param("dpId") Long dpId);

    @Query("SELECT COUNT(DISTINCT r.customer.id) FROM OrderRejection r WHERE CAST(r.rejectedAt AS DATE) = :date AND r.deliveryPerson.id = :dpId")
    Long countDistinctCustomersByDateAndDeliveryPerson(@Param("date") LocalDate date, @Param("dpId") Long dpId);
}
