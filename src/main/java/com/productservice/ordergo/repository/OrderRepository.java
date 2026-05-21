package com.productservice.ordergo.repository;

import com.productservice.ordergo.entity.Order;
import com.productservice.ordergo.entity.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByOrderNumberContainingIgnoreCaseOrCustomer_NameContainingIgnoreCase(String orderNumber, String customerName);
    Page<Order> findByOrderNumberContainingIgnoreCaseOrCustomer_NameContainingIgnoreCase(String orderNumber, String customerName, Pageable pageable);
    List<Order> findByStatus(OrderStatus status);
    List<Order> findByStatusInAndDeliveryAddressIsNotNull(List<OrderStatus> statuses);

    @Query("SELECT COUNT(o) FROM Order o WHERE YEAR(o.createdAt) = YEAR(CURRENT_DATE) AND MONTH(o.createdAt) = MONTH(CURRENT_DATE)")
    Long countThisMonth();

    @Query("SELECT o FROM Order o LEFT JOIN FETCH o.items i LEFT JOIN FETCH i.product WHERE o.id = :id")
    java.util.Optional<Order> findByIdWithItems(@org.springframework.data.repository.query.Param("id") Long id);

    long countByCustomerId(Long customerId);
    List<Order> findByCustomerId(Long customerId);

    @Query("SELECT o FROM Order o LEFT JOIN FETCH o.items i LEFT JOIN FETCH i.product p WHERE o.seller.id = :sellerId AND CAST(o.createdAt AS DATE) = CURRENT_DATE")
    List<Order> findTodayBySellerId(@org.springframework.data.repository.query.Param("sellerId") Long sellerId);

    @Query("SELECT COUNT(DISTINCT o.id) FROM Order o WHERE o.seller.id = :sellerId AND CAST(o.createdAt AS DATE) = CURRENT_DATE")
    Long countTodayBySellerId(@org.springframework.data.repository.query.Param("sellerId") Long sellerId);

    @Query("SELECT COUNT(DISTINCT o.customer.id) FROM Order o WHERE o.seller.id = :sellerId AND CAST(o.createdAt AS DATE) = CURRENT_DATE")
    Long countDistinctCustomersTodayBySellerId(@org.springframework.data.repository.query.Param("sellerId") Long sellerId);
}
