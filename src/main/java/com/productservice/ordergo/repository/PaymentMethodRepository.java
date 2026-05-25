package com.productservice.ordergo.repository;

import com.productservice.ordergo.entity.PaymentMethod;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PaymentMethodRepository extends JpaRepository<PaymentMethod, Long> {
    Optional<PaymentMethod> findByNameIgnoreCase(String name);
    boolean existsByNameIgnoreCase(String name);
}
