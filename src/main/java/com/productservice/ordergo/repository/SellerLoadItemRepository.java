package com.productservice.ordergo.repository;

import com.productservice.ordergo.entity.SellerLoadItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SellerLoadItemRepository extends JpaRepository<SellerLoadItem, Long> {

    List<SellerLoadItem> findBySellerLoadId(Long sellerLoadId);

    Optional<SellerLoadItem> findBySellerLoadIdAndProductId(Long sellerLoadId, Long productId);

    long countByProductId(Long productId);

    @Modifying
    @Query("DELETE FROM SellerLoadItem sli WHERE sli.product.id = :productId")
    void deleteByProductId(Long productId);
}
