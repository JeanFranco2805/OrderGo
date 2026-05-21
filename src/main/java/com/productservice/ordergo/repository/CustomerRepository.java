package com.productservice.ordergo.repository;

import com.productservice.ordergo.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {
    List<Customer> findByNameContainingIgnoreCase(String name);
    Page<Customer> findByNameContainingIgnoreCase(String name, Pageable pageable);
    List<Customer> findBySellerId(Long sellerId);
    List<Customer> findBySellerIdAndVisitDay(Long sellerId, String visitDay);
    List<Customer> findBySellerIdAndZone(Long sellerId, String zone);
}
