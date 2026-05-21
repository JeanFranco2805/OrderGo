package com.productservice.ordergo.service.impl;

import com.productservice.ordergo.dto.DashboardStatsDTO;
import com.productservice.ordergo.dto.MonthlyTotalDTO;
import com.productservice.ordergo.dto.PaymentMethodTotalDTO;
import com.productservice.ordergo.dto.VendorStatsDTO;
import com.productservice.ordergo.entity.Order;
import com.productservice.ordergo.entity.OrderItem;
import com.productservice.ordergo.repository.CustomerRepository;
import com.productservice.ordergo.repository.InventoryExpenseRepository;
import com.productservice.ordergo.repository.InvoiceRepository;
import com.productservice.ordergo.repository.OrderRepository;
import com.productservice.ordergo.repository.PaymentRepository;
import com.productservice.ordergo.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardServiceImpl implements DashboardService {

    private final InvoiceRepository invoiceRepository;
    private final OrderRepository orderRepository;
    private final CustomerRepository customerRepository;
    private final InventoryExpenseRepository inventoryExpenseRepository;
    private final PaymentRepository paymentRepository;
    private final com.productservice.ordergo.repository.ProductRepository productRepository;

    @Override
    public DashboardStatsDTO getStats() {
        // Métricas del mes actual
        BigDecimal totalSalesThisMonth = invoiceRepository.getTotalInvoicedThisMonth();
        Long totalOrdersThisMonth = orderRepository.countThisMonth();

        // Métricas acumuladas
        BigDecimal totalSalesAllTime = invoiceRepository.getTotalInvoiced();
        Long totalOrdersAllTime = orderRepository.count();
        Long totalCustomers = customerRepository.count();

        // Facturación
        BigDecimal totalReceivable = invoiceRepository.getTotalPending();
        Long pendingInvoices = (long) invoiceRepository.findByStatus(com.productservice.ordergo.entity.InvoiceStatus.PENDIENTE).size()
            + invoiceRepository.findByStatus(com.productservice.ordergo.entity.InvoiceStatus.PARCIAL).size();

        // Ticket promedio del mes
        BigDecimal averageTicket = BigDecimal.ZERO;
        if (totalOrdersThisMonth > 0) {
            averageTicket = totalSalesThisMonth.divide(BigDecimal.valueOf(totalOrdersThisMonth), 2, java.math.RoundingMode.HALF_UP);
        }

        return DashboardStatsDTO.builder()
            .totalSales(totalSalesThisMonth)
            .totalOrders(totalOrdersThisMonth)
            .averageTicket(averageTicket)
            .totalSalesAllTime(totalSalesAllTime)
            .totalOrdersAllTime(totalOrdersAllTime)
            .totalCustomers(totalCustomers)
            .totalReceivable(totalReceivable)
            .pendingInvoices(pendingInvoices)
            .build();
    }

    @Override
    public List<MonthlyTotalDTO> getMonthlySales() {
        LocalDate startDate = LocalDate.now().minusMonths(11).withDayOfMonth(1);
        List<Object[]> results = invoiceRepository.findMonthlyTotals(startDate);
        return results.stream().map(r -> MonthlyTotalDTO.builder()
            .month(String.format("%04d-%02d", ((Number) r[0]).intValue(), ((Number) r[1]).intValue()))
            .amount((BigDecimal) r[2])
            .build()).collect(Collectors.toList());
    }

    @Override
    public List<MonthlyTotalDTO> getMonthlyExpenses() {
        LocalDate startDate = LocalDate.now().minusMonths(11).withDayOfMonth(1);
        List<Object[]> results = inventoryExpenseRepository.findMonthlyTotals(startDate);
        return results.stream().map(r -> MonthlyTotalDTO.builder()
            .month(String.format("%04d-%02d", ((Number) r[0]).intValue(), ((Number) r[1]).intValue()))
            .amount((BigDecimal) r[2])
            .build()).collect(Collectors.toList());
    }

    @Override
    public List<PaymentMethodTotalDTO> getPaymentsByMethod() {
        LocalDate startDate = LocalDate.now().minusMonths(11).withDayOfMonth(1);
        List<Object[]> results = paymentRepository.sumByPaymentMethodSince(startDate);
        return results.stream().map(r -> PaymentMethodTotalDTO.builder()
            .paymentMethod((String) r[0])
            .total((BigDecimal) r[1])
            .build()).collect(Collectors.toList());
    }

    @Override
    public VendorStatsDTO getVendorStats(Long sellerId) {
        List<Order> orders = orderRepository.findTodayBySellerId(sellerId);
        BigDecimal totalPieces = BigDecimal.ZERO;
        for (Order order : orders) {
            for (OrderItem item : order.getItems()) {
                if (item.getProduct() != null) {
                    int piecesPerUnit = item.getProduct().getPiecesPerUnit() != null ? item.getProduct().getPiecesPerUnit() : 1;
                    totalPieces = totalPieces.add(BigDecimal.valueOf(item.getQuantity()).multiply(BigDecimal.valueOf(piecesPerUnit)));
                } else if (item.getOffer() != null) {
                    // For offers, treat each offer unit as 1 piece unless we add piecesPerUnit to Offer later
                    totalPieces = totalPieces.add(BigDecimal.valueOf(item.getQuantity()));
                }
            }
        }
        BigDecimal dozens = totalPieces.divide(BigDecimal.valueOf(12), 2, java.math.RoundingMode.HALF_UP);
        Long totalOrders = orderRepository.countTodayBySellerId(sellerId);
        Long totalCustomers = orderRepository.countDistinctCustomersTodayBySellerId(sellerId);
        BigDecimal avgDozens = BigDecimal.ZERO;
        if (totalOrders != null && totalOrders > 0) {
            avgDozens = dozens.divide(BigDecimal.valueOf(totalOrders), 2, java.math.RoundingMode.HALF_UP);
        }
        return VendorStatsDTO.builder()
            .dozensSold(dozens)
            .totalOrders(totalOrders != null ? totalOrders : 0L)
            .totalCustomers(totalCustomers != null ? totalCustomers : 0L)
            .averageDozensPerOrder(avgDozens)
            .build();
    }
}
