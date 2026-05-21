package com.productservice.ordergo.service;

import com.productservice.ordergo.dto.InvoiceDTO;
import com.productservice.ordergo.dto.PaymentDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface InvoiceService {
    List<InvoiceDTO> findAll();
    Page<InvoiceDTO> findAll(Pageable pageable);
    InvoiceDTO findById(Long id);
    List<InvoiceDTO> search(String query);
    Page<InvoiceDTO> search(String query, Pageable pageable);
    InvoiceDTO create(InvoiceDTO dto);
    InvoiceDTO addPayment(Long invoiceId, PaymentDTO paymentDTO);
    void delete(Long id);
    java.util.Map<String, Object> sendWhatsApp(Long invoiceId);
    java.util.Map<String, String> generateWhatsAppMessage(Long invoiceId);
}
