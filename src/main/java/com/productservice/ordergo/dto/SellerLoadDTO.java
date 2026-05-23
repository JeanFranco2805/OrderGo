package com.productservice.ordergo.dto;

import com.productservice.ordergo.entity.SellerLoad;
import lombok.*;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SellerLoadDTO {

    private Long id;
    private Long sellerId;
    private String sellerName;
    private String loadDate;
    private SellerLoad.LoadStatus status;
    private List<SellerLoadItemDTO> items;
}
