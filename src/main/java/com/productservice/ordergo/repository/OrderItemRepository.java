package com.productservice.ordergo.repository;

import com.productservice.ordergo.entity.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {
    List<OrderItem> findByOrderId(Long orderId);
    long countByProductId(Long productId);
    boolean existsByOfferId(Long offerId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE OrderItem oi SET oi.offer = null WHERE oi.offer.id = :offerId")
    void unlinkByOfferId(Long offerId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE OrderItem oi SET oi.product = null WHERE oi.product.id = :productId")
    void unlinkByProductId(Long productId);
}
