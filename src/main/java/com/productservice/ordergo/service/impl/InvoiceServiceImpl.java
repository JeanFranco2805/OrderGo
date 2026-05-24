package com.productservice.ordergo.service.impl;

import com.productservice.ordergo.dto.InvoiceDTO;
import com.productservice.ordergo.dto.PaymentDTO;
import com.productservice.ordergo.entity.*;
import com.productservice.ordergo.exception.BusinessException;
import com.productservice.ordergo.exception.ResourceNotFoundException;
import com.productservice.ordergo.repository.CustomerRepository;
import com.productservice.ordergo.repository.DiscountRepository;
import com.productservice.ordergo.repository.InvoiceRepository;
import com.productservice.ordergo.repository.OrderRepository;
import com.productservice.ordergo.repository.PaymentRepository;
import com.productservice.ordergo.service.InvoiceService;
import com.productservice.ordergo.service.WhatsAppService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InvoiceServiceImpl implements InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final CustomerRepository customerRepository;
    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final DiscountRepository discountRepository;
    private final com.productservice.ordergo.repository.BusinessSettingsRepository businessSettingsRepository;
    private final WhatsAppService whatsAppService;

    @Override
    public List<InvoiceDTO> findAll() {
        return invoiceRepository.findAll().stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    @Override
    public InvoiceDTO findById(Long id) {
        Invoice invoice = invoiceRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Factura no encontrada con id: " + id));
        return toDTO(invoice);
    }

    @Override
    public List<InvoiceDTO> search(String query) {
        if (query == null || query.isBlank()) return findAll();
        return invoiceRepository.findByInvoiceNumberContainingIgnoreCaseOrCustomer_NameContainingIgnoreCase(query, query)
            .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public Page<InvoiceDTO> findAll(Pageable pageable) {
        return invoiceRepository.findAll(pageable).map(this::toDTO);
    }

    @Override
    public Page<InvoiceDTO> search(String query, Pageable pageable) {
        if (query == null || query.isBlank()) return findAll(pageable);
        return invoiceRepository.findByInvoiceNumberContainingIgnoreCaseOrCustomer_NameContainingIgnoreCase(query, query, pageable)
            .map(this::toDTO);
    }

    @Override
    @Transactional
    public InvoiceDTO create(InvoiceDTO dto) {
        Customer customer = customerRepository.findById(dto.getCustomerId())
            .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado con id: " + dto.getCustomerId()));

        BigDecimal amount = dto.getAmount();

        // Si se vincula a un pedido, tomar el monto del pedido automáticamente
        if (dto.getOrderId() != null) {
            Order order = orderRepository.findById(dto.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Pedido no encontrado con id: " + dto.getOrderId()));
            amount = order.getTotalAmount();
        }

        // Aplicar descuento si se proporciona código
        if (dto.getDiscountCode() != null && !dto.getDiscountCode().isBlank()) {
            com.productservice.ordergo.entity.Discount discount = discountRepository.findByCodeIgnoreCase(dto.getDiscountCode())
                .orElseThrow(() -> new BusinessException("Código de descuento no válido: " + dto.getDiscountCode()));
            if (!discount.isActive()) {
                throw new BusinessException("El descuento no está activo");
            }
            if (discount.getUsageLimit() != null && discount.getUsageCount() >= discount.getUsageLimit()) {
                throw new BusinessException("El descuento ha alcanzado el límite de usos");
            }
            if (discount.getEndDate() != null && discount.getEndDate().isBefore(java.time.LocalDate.now())) {
                throw new BusinessException("El descuento ha expirado");
            }
            if (discount.getType() == com.productservice.ordergo.entity.DiscountType.PERCENTAGE) {
                BigDecimal discountValue = amount.multiply(discount.getValue()).divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
                amount = amount.subtract(discountValue);
            } else {
                amount = amount.subtract(discount.getValue());
            }
            if (amount.compareTo(BigDecimal.ZERO) < 0) {
                amount = BigDecimal.ZERO;
            }
            discount.setUsageCount(discount.getUsageCount() + 1);
            if (discount.getUsageLimit() != null && discount.getUsageCount() >= discount.getUsageLimit()) {
                discount.setActive(false);
            }
            discountRepository.save(discount);
        }

        // Aplicar impuesto desde configuración del negocio
        java.math.BigDecimal taxRate = businessSettingsRepository.findTopByOrderByIdAsc()
            .map(com.productservice.ordergo.entity.BusinessSettings::getTax)
            .orElse(java.math.BigDecimal.ZERO);

        java.math.BigDecimal taxAmount = BigDecimal.ZERO;
        if (taxRate != null && taxRate.compareTo(BigDecimal.ZERO) > 0) {
            taxAmount = amount.multiply(taxRate).divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
        }

        Invoice.InvoiceBuilder invoiceBuilder = Invoice.builder()
            .invoiceNumber("FAC-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
            .customer(customer)
            .invoiceDate(dto.getInvoiceDate())
            .subtotal(amount)
            .taxAmount(taxAmount)
            .amount(amount.add(taxAmount))
            .paid(BigDecimal.ZERO)
            .status(InvoiceStatus.PENDIENTE);

        if (dto.getOrderId() != null) {
            Order order = orderRepository.findById(dto.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Pedido no encontrado con id: " + dto.getOrderId()));
            invoiceBuilder.orderId(order.getId());
            invoiceBuilder.orderNumber(order.getOrderNumber());
            invoiceBuilder.paymentMethod(order.getPaymentMethod());
        }

        return toDTO(invoiceRepository.save(invoiceBuilder.build()));
    }

    @Override
    @Transactional
    public InvoiceDTO addPayment(Long invoiceId, PaymentDTO paymentDTO) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
            .orElseThrow(() -> new ResourceNotFoundException("Factura no encontrada con id: " + invoiceId));

        BigDecimal remaining = invoice.getAmount().subtract(invoice.getPaid());
        if (paymentDTO.getAmount().compareTo(remaining) > 0) {
            throw new BusinessException("El abono no puede superar el saldo pendiente de " + remaining);
        }

        Payment payment = Payment.builder()
            .invoice(invoice)
            .paymentDate(paymentDTO.getPaymentDate())
            .amount(paymentDTO.getAmount())
            .paymentMethod(paymentDTO.getPaymentMethod())
            .build();

        paymentRepository.save(payment);

        BigDecimal newPaid = invoice.getPaid().add(paymentDTO.getAmount());
        invoice.setPaid(newPaid);

        if (newPaid.compareTo(invoice.getAmount()) >= 0) {
            invoice.setStatus(InvoiceStatus.PAGADA);
        } else {
            invoice.setStatus(InvoiceStatus.PARCIAL);
        }

        return toDTO(invoiceRepository.save(invoice));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!invoiceRepository.existsById(id)) {
            throw new ResourceNotFoundException("Factura no encontrada con id: " + id);
        }
        invoiceRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public java.util.Map<String, Object> sendWhatsApp(Long invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
            .orElseThrow(() -> new ResourceNotFoundException("Factura no encontrada con id: " + invoiceId));

        if (invoice.getCustomer() == null) {
            throw new BusinessException("El cliente de esta factura ha sido eliminado");
        }
        String phone = invoice.getCustomer().getPhone();
        if (phone == null || phone.isBlank()) {
            throw new BusinessException("El cliente no tiene número de teléfono registrado");
        }

        String message = buildWhatsAppMessage(invoice);
        return whatsAppService.sendMessage(phone, message);
    }

    @Override
    @Transactional(readOnly = true)
    public java.util.Map<String, String> generateWhatsAppMessage(Long invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
            .orElseThrow(() -> new ResourceNotFoundException("Factura no encontrada con id: " + invoiceId));

        if (invoice.getCustomer() == null) {
            throw new BusinessException("El cliente de esta factura ha sido eliminado");
        }
        String phone = invoice.getCustomer().getPhone();
        if (phone == null || phone.isBlank()) {
            throw new BusinessException("El cliente no tiene número de teléfono registrado");
        }

        java.util.Map<String, String> result = new java.util.LinkedHashMap<>();
        result.put("phone", phone.replaceAll("[^0-9]", ""));
        result.put("message", buildWhatsAppMessage(invoice));
        return result;
    }

    private String buildWhatsAppMessage(Invoice invoice) {
        String businessName = businessSettingsRepository.findTopByOrderByIdAsc()
            .map(com.productservice.ordergo.entity.BusinessSettings::getBusinessName)
            .orElse("Mi Negocio");

        java.math.BigDecimal balance = invoice.getAmount().subtract(invoice.getPaid());
        String paymentStatusEmoji = balance.compareTo(java.math.BigDecimal.ZERO) <= 0 ? "\u2705" : "\u23f3";
        String paymentStatusText = balance.compareTo(java.math.BigDecimal.ZERO) <= 0 ? "PAGADA" : "PENDIENTE DE PAGO";

        StringBuilder message = new StringBuilder();
        message.append("\ud83d\udcec *").append(businessName).append("*\n");
        message.append("━━━━━━━━━━━━━━━━━━━━\n\n");
        message.append("\ud83d\udc4b ¡Hola *").append(invoice.getCustomer() != null ? invoice.getCustomer().getName() : "Cliente").append("*!\n\n");
        message.append("Te compartimos los detalles de tu factura:\n\n");
        message.append("\ud83d\udccb *Factura:* ").append(invoice.getInvoiceNumber()).append("\n");
        message.append("\ud83d\udcc5 *Fecha:* ").append(invoice.getInvoiceDate()).append("\n");
        message.append("\ud83d\udcb3 *Método:* ").append(invoice.getPaymentMethod() != null ? invoice.getPaymentMethod() : "No especificado").append("\n\n");
        if (invoice.getOrderId() != null) {
            orderRepository.findById(invoice.getOrderId()).ifPresent(order -> {
                if (order.getItems() != null && !order.getItems().isEmpty()) {
                    message.append("\ud83d\uded2 *Detalle de la compra:*\n");
                    for (OrderItem item : order.getItems()) {
                        String itemName = item.getProduct() != null ? item.getProduct().getName()
                            : (item.getOffer() != null ? item.getOffer().getName() : "Item");
                        String itemEmoji = item.getOffer() != null ? "\ud83c\udf81 " : "\u2022 ";
                        message.append(itemEmoji).append(itemName)
                            .append(" x").append(item.getQuantity())
                            .append(" = *$").append(String.format("%,.0f", item.getSubtotal())).append("*\n");
                    }
                    message.append("\n");
                }
            });
        }

        message.append("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n");
        if (invoice.getTaxAmount() != null && invoice.getTaxAmount().compareTo(java.math.BigDecimal.ZERO) > 0) {
            message.append("\ud83d\udced *Subtotal:* $").append(String.format("%,.0f", invoice.getSubtotal())).append("\n");
            message.append("\ud83d\udccb *Impuesto:* $").append(String.format("%,.0f", invoice.getTaxAmount())).append("\n");
        }
        message.append("\ud83d\udcb0 *Monto total:* $").append(String.format("%,.0f", invoice.getAmount())).append("\n");
        message.append("\ud83d\udcb8 *Pagado:* $").append(String.format("%,.0f", invoice.getPaid())).append("\n");
        message.append("\ud83d\udcb5 *Saldo:* $").append(String.format("%,.0f", balance)).append("\n");
        message.append("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n\n");
        message.append(paymentStatusEmoji).append(" *Estado:* ").append(paymentStatusText).append("\n\n");

        if (balance.compareTo(java.math.BigDecimal.ZERO) > 0) {
            message.append("\u26a0\ufe0f Recuerda que tienes un saldo pendiente de *$").append(String.format("%,.0f", balance)).append("*\n");
            message.append("\ud83d\udcde Si tienes dudas, contáctanos.\n\n");
        } else {
            message.append("\ud83c\udf89 ¡Muchas gracias por tu pago!\n\n");
        }

        message.append("\ud83d\ude4f Gracias por preferirnos.\n");
        message.append("\ud83d\udc9a *").append(businessName).append("* \ud83d\udc9a");

        return message.toString();
    }

    private InvoiceDTO toDTO(Invoice invoice) {
        return InvoiceDTO.builder()
            .id(invoice.getId())
            .invoiceNumber(invoice.getInvoiceNumber())
            .customerId(invoice.getCustomer() != null ? invoice.getCustomer().getId() : null)
            .customerName(invoice.getCustomer() != null ? invoice.getCustomer().getName() : "Cliente eliminado")
            .customerPhone(invoice.getCustomer() != null ? invoice.getCustomer().getPhone() : null)
            .invoiceDate(invoice.getInvoiceDate())
            .subtotal(invoice.getSubtotal())
            .taxAmount(invoice.getTaxAmount())
            .amount(invoice.getAmount())
            .paid(invoice.getPaid())
            .balance(invoice.getAmount().subtract(invoice.getPaid()))
            .status(invoice.getStatus())
            .orderId(invoice.getOrderId())
            .orderNumber(invoice.getOrderNumber())
            .paymentMethod(invoice.getPaymentMethod())
            .payments(invoice.getPayments().stream().map(p -> PaymentDTO.builder()
                .id(p.getId())
                .invoiceId(p.getInvoice().getId())
                .paymentDate(p.getPaymentDate())
                .amount(p.getAmount())
                .paymentMethod(p.getPaymentMethod())
                .build()).collect(Collectors.toList()))
            .build();
    }
}
