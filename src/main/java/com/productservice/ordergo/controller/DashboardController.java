package com.productservice.ordergo.controller;

import com.productservice.ordergo.dto.DashboardStatsDTO;
import com.productservice.ordergo.dto.MonthlyTotalDTO;
import com.productservice.ordergo.dto.PaymentMethodTotalDTO;
import com.productservice.ordergo.dto.VendorStatsDTO;
import com.productservice.ordergo.entity.User;
import com.productservice.ordergo.repository.UserRepository;
import com.productservice.ordergo.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;
    private final UserRepository userRepository;

    @GetMapping("/stats")
    public ResponseEntity<DashboardStatsDTO> getStats() {
        return ResponseEntity.ok(dashboardService.getStats());
    }

    @GetMapping("/vendor-stats")
    public ResponseEntity<VendorStatsDTO> getVendorStats() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return ResponseEntity.status(401).build();
        }
        String username = auth.getName();
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new com.productservice.ordergo.exception.ResourceNotFoundException("Usuario no encontrado"));
        return ResponseEntity.ok(dashboardService.getVendorStats(user.getId()));
    }

    @GetMapping("/monthly-sales")
    public ResponseEntity<List<MonthlyTotalDTO>> getMonthlySales() {
        return ResponseEntity.ok(dashboardService.getMonthlySales());
    }

    @GetMapping("/monthly-expenses")
    public ResponseEntity<List<MonthlyTotalDTO>> getMonthlyExpenses() {
        return ResponseEntity.ok(dashboardService.getMonthlyExpenses());
    }

    @GetMapping("/payments-by-method")
    public ResponseEntity<List<PaymentMethodTotalDTO>> getPaymentsByMethod() {
        return ResponseEntity.ok(dashboardService.getPaymentsByMethod());
    }
}
