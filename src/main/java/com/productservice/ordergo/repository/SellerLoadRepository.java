package com.productservice.ordergo.repository;

import com.productservice.ordergo.entity.SellerLoad;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface SellerLoadRepository extends JpaRepository<SellerLoad, Long> {

    Optional<SellerLoad> findBySellerIdAndLoadDateAndStatus(Long sellerId, LocalDate loadDate, SellerLoad.LoadStatus status);

    List<SellerLoad> findBySellerIdAndLoadDate(Long sellerId, LocalDate loadDate);

    @Query("SELECT sl FROM SellerLoad sl LEFT JOIN FETCH sl.items WHERE sl.seller.id = :sellerId AND sl.loadDate = :loadDate AND sl.status = 'ACTIVO'")
    Optional<SellerLoad> findActiveBySellerIdAndLoadDate(Long sellerId, LocalDate loadDate);

    List<SellerLoad> findBySellerId(Long sellerId);

    List<SellerLoad> findBySellerIdOrderByLoadDateDesc(Long sellerId);

    List<SellerLoad> findByLoadDate(LocalDate loadDate);

    @Query("SELECT sl FROM SellerLoad sl LEFT JOIN FETCH sl.items WHERE sl.loadDate = :loadDate AND sl.status = 'ACTIVO'")
    List<SellerLoad> findActiveByLoadDate(@org.springframework.data.repository.query.Param("loadDate") LocalDate loadDate);

    long countBySellerId(Long sellerId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM SellerLoad sl WHERE sl.seller.id = :sellerId")
    void deleteBySellerId(Long sellerId);
}
