package com.productservice.ordergo.repository;

import com.productservice.ordergo.entity.Discount;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DiscountRepository extends JpaRepository<Discount, Long> {
    Optional<Discount> findByCodeIgnoreCase(String code);
    Page<Discount> findByCodeContainingIgnoreCaseOrDescriptionContainingIgnoreCase(String code, String description, Pageable pageable);
}
