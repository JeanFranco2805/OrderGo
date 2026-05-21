package com.productservice.ordergo.dto;

import com.productservice.ordergo.entity.DiscountType;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DiscountDTO {
    private Long id;
    private String code;
    private String description;
    private DiscountType type;
    private BigDecimal value;
    private LocalDate startDate;
    private LocalDate endDate;
    private boolean active;
    private Integer usageLimit;
    private Integer usageCount;
}
