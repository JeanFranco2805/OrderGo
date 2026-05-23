package com.productservice.ordergo.repository;

import com.productservice.ordergo.entity.SellerLoadItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SellerLoadItemRepository extends JpaRepository<SellerLoadItem, Long> {

    List<SellerLoadItem> findBySellerLoadId(Long sellerLoadId);

    Optional<SellerLoadItem> findBySellerLoadIdAndProductId(Long sellerLoadId, Long productId);
}
