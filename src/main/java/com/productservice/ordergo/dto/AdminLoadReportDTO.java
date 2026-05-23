package com.productservice.ordergo.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminLoadReportDTO {
    private Long sellerId;
    private String sellerUsername;
    private SellerLoadDTO load;
    private VendorLoadStatsDTO stats;
    private Long deliveredCustomers;
    private Long rejectedCustomers;
    private Long deliveredOrders;
    private Long rejectedOrders;
    private Long totalOrders;
}
