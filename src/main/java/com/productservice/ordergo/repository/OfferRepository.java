package com.productservice.ordergo.repository;

import com.productservice.ordergo.entity.Offer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OfferRepository extends JpaRepository<Offer, Long> {
    @Query("SELECT o FROM Offer o WHERE o.deleted = false AND o.active = true")
    List<Offer> findByActiveTrueAndDeletedFalse();

    @Query("SELECT o FROM Offer o WHERE o.deleted = false AND LOWER(o.name) LIKE LOWER(CONCAT('%', :name, '%'))")
    Page<Offer> findByNameContainingIgnoreCaseAndDeletedFalse(String name, Pageable pageable);

    @Query("SELECT o FROM Offer o WHERE o.deleted = false")
    List<Offer> findAllNotDeleted();

    @Query("SELECT o FROM Offer o WHERE o.deleted = false")
    Page<Offer> findAllNotDeleted(Pageable pageable);

    @Query("SELECT o FROM Offer o WHERE o.deleted = true")
    List<Offer> findAllDeleted();

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM OfferItem oi WHERE oi.product.id = :productId")
    void deleteOfferItemsByProductId(Long productId);

    @Query("SELECT o FROM Offer o LEFT JOIN FETCH o.items i LEFT JOIN FETCH i.product WHERE o.id = :id")
    java.util.Optional<Offer> findByIdWithItems(@org.springframework.data.repository.query.Param("id") Long id);
}
