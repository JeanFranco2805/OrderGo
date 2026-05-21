package com.productservice.ordergo.dto;

import com.productservice.ordergo.entity.InvoiceStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvoiceDTO {

    private Long id;

    private String invoiceNumber;

    private Long customerId;

    private String customerName;

    private String customerPhone;

    private LocalDate invoiceDate;

    private BigDecimal subtotal;

    private BigDecimal taxAmount;

    private BigDecimal amount;

    private BigDecimal paid;

    private BigDecimal balance;

    private InvoiceStatus status;

    private Long orderId;

    private String orderNumber;

    private String paymentMethod;

    private String discountCode;

    private List<PaymentDTO> payments;
}
