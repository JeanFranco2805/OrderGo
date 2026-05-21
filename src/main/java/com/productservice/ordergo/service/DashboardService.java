package com.productservice.ordergo.service;

import com.productservice.ordergo.dto.DashboardStatsDTO;
import com.productservice.ordergo.dto.MonthlyTotalDTO;
import com.productservice.ordergo.dto.VendorStatsDTO;

import java.util.List;

public interface DashboardService {
    DashboardStatsDTO getStats();
    List<MonthlyTotalDTO> getMonthlySales();
    List<MonthlyTotalDTO> getMonthlyExpenses();
    List<com.productservice.ordergo.dto.PaymentMethodTotalDTO> getPaymentsByMethod();
    VendorStatsDTO getVendorStats(Long sellerId);
}
