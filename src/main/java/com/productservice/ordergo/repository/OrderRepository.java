package com.productservice.ordergo.repository;

import com.productservice.ordergo.entity.Order;
import com.productservice.ordergo.entity.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByOrderNumberContainingIgnoreCaseOrCustomer_NameContainingIgnoreCase(String orderNumber, String customerName);
    Page<Order> findByOrderNumberContainingIgnoreCaseOrCustomer_NameContainingIgnoreCase(String orderNumber, String customerName, Pageable pageable);
    List<Order> findByStatus(OrderStatus status);
    List<Order> findByStatusInAndDeliveryAddressIsNotNull(List<OrderStatus> statuses);

    @Query("SELECT COUNT(o) FROM Order o WHERE YEAR(o.createdAt) = YEAR(CURRENT_DATE) AND MONTH(o.createdAt) = MONTH(CURRENT_DATE)")
    Long countThisMonth();

    @Query("SELECT o FROM Order o LEFT JOIN FETCH o.items i LEFT JOIN FETCH i.product LEFT JOIN FETCH o.deliveryPerson LEFT JOIN FETCH o.seller WHERE o.id = :id")
    java.util.Optional<Order> findByIdWithItems(@org.springframework.data.repository.query.Param("id") Long id);

    long countByCustomerId(Long customerId);
    List<Order> findByCustomerId(Long customerId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE Order o SET o.customer = null WHERE o.customer.id = :customerId")
    void unlinkByCustomerId(Long customerId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM Order o WHERE o.customer.id = :customerId")
    void deleteByCustomerId(Long customerId);

    long countBySellerId(Long sellerId);
    long countByDeliveryPersonId(Long deliveryPersonId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE Order o SET o.seller = null WHERE o.seller.id = :userId")
    void unlinkSellerByUserId(Long userId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE Order o SET o.deliveryPerson = null WHERE o.deliveryPerson.id = :userId")
    void unlinkDeliveryPersonByUserId(Long userId);

    @Query("SELECT o FROM Order o LEFT JOIN FETCH o.items i LEFT JOIN FETCH i.product p WHERE o.seller.id = :sellerId AND CAST(o.createdAt AS DATE) = CURRENT_DATE")
    List<Order> findTodayBySellerId(@org.springframework.data.repository.query.Param("sellerId") Long sellerId);

    @Query("SELECT COUNT(DISTINCT o.id) FROM Order o WHERE o.seller.id = :sellerId AND CAST(o.createdAt AS DATE) = CURRENT_DATE")
    Long countTodayBySellerId(@org.springframework.data.repository.query.Param("sellerId") Long sellerId);

    @Query("SELECT COUNT(DISTINCT o.customer.id) FROM Order o WHERE o.seller.id = :sellerId AND CAST(o.createdAt AS DATE) = CURRENT_DATE")
    Long countDistinctCustomersTodayBySellerId(@org.springframework.data.repository.query.Param("sellerId") Long sellerId);

    @Query("SELECT o FROM Order o WHERE CAST(o.createdAt AS DATE) = :date AND o.status = :status")
    List<Order> findByDateAndStatus(@Param("date") LocalDate date, @Param("status") OrderStatus status);

    @Query("SELECT o FROM Order o WHERE CAST(o.createdAt AS DATE) = :date AND o.seller.id = :sellerId")
    List<Order> findByDateAndSellerId(@Param("date") LocalDate date, @Param("sellerId") Long sellerId);

    @Query("SELECT COUNT(DISTINCT o.customer.id) FROM Order o WHERE CAST(o.createdAt AS DATE) = :date AND o.status = :status")
    Long countDistinctCustomersByDateAndStatus(@Param("date") LocalDate date, @Param("status") OrderStatus status);

    @Query("SELECT COUNT(DISTINCT o.customer.id) FROM Order o WHERE CAST(o.createdAt AS DATE) = :date AND o.seller.id = :sellerId AND o.status = :status")
    Long countDistinctCustomersByDateAndSellerAndStatus(@Param("date") LocalDate date, @Param("sellerId") Long sellerId, @Param("status") OrderStatus status);

    // Queries by delivery person (domiciliario) using delivery event dates
    @Query("SELECT o FROM Order o WHERE o.deliveryPerson.id = :dpId AND CAST(o.deliveredAt AS DATE) = :date")
    List<Order> findDeliveredByDateAndDeliveryPersonId(@Param("date") LocalDate date, @Param("dpId") Long dpId);

    @Query("SELECT COUNT(DISTINCT o.customer.id) FROM Order o WHERE o.deliveryPerson.id = :dpId AND CAST(o.deliveredAt AS DATE) = :date")
    Long countDistinctDeliveredCustomersByDateAndDeliveryPerson(@Param("date") LocalDate date, @Param("dpId") Long dpId);

    // Fallback: all orders assigned to delivery person on a given creation date
    @Query("SELECT o FROM Order o WHERE CAST(o.createdAt AS DATE) = :date AND o.deliveryPerson.id = :dpId")
    List<Order> findByDateAndDeliveryPersonId(@Param("date") LocalDate date, @Param("dpId") Long dpId);

    @Query("SELECT o FROM Order o WHERE CAST(o.createdAt AS DATE) = :date AND o.deliveryPerson.id = :dpId AND o.status = :status")
    List<Order> findByDateAndDeliveryPersonIdAndStatus(@Param("date") LocalDate date, @Param("dpId") Long dpId, @Param("status") OrderStatus status);

    @Query("SELECT COUNT(DISTINCT o.customer.id) FROM Order o WHERE CAST(o.createdAt AS DATE) = :date AND o.deliveryPerson.id = :dpId AND o.status = :status")
    Long countDistinctCustomersByDateAndDeliveryPersonAndStatus(@Param("date") LocalDate date, @Param("dpId") Long dpId, @Param("status") OrderStatus status);

    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o WHERE o.deliveryPerson.id = :dpId AND o.status = :status")
    java.math.BigDecimal sumTotalAmountByDeliveryPersonIdAndStatus(@Param("dpId") Long dpId, @Param("status") OrderStatus status);

    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o WHERE o.deliveryPerson.id = :dpId AND o.status = :status AND YEAR(o.createdAt) = :year AND MONTH(o.createdAt) = :month")
    java.math.BigDecimal sumTotalAmountByDeliveryPersonIdAndStatusAndMonth(@Param("dpId") Long dpId, @Param("status") OrderStatus status, @Param("year") int year, @Param("month") int month);
}
