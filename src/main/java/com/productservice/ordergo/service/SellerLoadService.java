package com.productservice.ordergo.service;

import com.productservice.ordergo.dto.*;

import java.util.List;

public interface SellerLoadService {

    SellerLoadDTO getOrCreateTodayLoad(Long sellerId);

    SellerLoadDTO addItemsToLoad(Long loadId, List<SellerLoadItemCreateDTO> items);

    void deductOnDelivery(Long sellerId, Long orderId);

    void registerRejection(Long sellerId, RejectOrderDTO dto);

    SellerLoadDTO getTodayLoad(Long sellerId);

    List<SellerLoadDTO> getLoadHistory(Long sellerId);

    VendorLoadStatsDTO getTodayStats(Long sellerId);

    List<AdminLoadReportDTO> getAdminReport(java.time.LocalDate date);

    void addOrderItemsToLoad(Long sellerId, Long orderId);

    void reverseDeliveryToRejection(Long sellerId, Long orderId);

    void reverseRejectionToDelivery(Long sellerId, Long orderId);

    void reverseDeliveryToPending(Long sellerId, Long orderId);

    void reverseRejectionToPending(Long sellerId, Long orderId);

    void rejectOrderItems(Long sellerId, Long orderId);

    void removeOrderFromLoad(Long orderId);

    void clearRejectionForOrder(Long orderId);

    void deleteLoadBySellerAndDate(Long sellerId, java.time.LocalDate date);
}
