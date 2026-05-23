package com.productservice.ordergo.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "seller_load_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SellerLoadItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seller_load_id", nullable = false)
    private SellerLoad sellerLoad;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "quantity_loaded", nullable = false, precision = 15, scale = 2)
    private BigDecimal quantityLoaded;

    @Column(name = "quantity_delivered", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal quantityDelivered = BigDecimal.ZERO;

    @Column(name = "quantity_rejected", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal quantityRejected = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "unit_of_measure", nullable = false, length = 20)
    private UnitOfMeasure unitOfMeasure;

    public enum UnitOfMeasure {
        DOCENA,
        DISPLAY,
        CAJA,
        UNIDAD
    }
}
