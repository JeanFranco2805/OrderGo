package com.productservice.ordergo.controller;

import com.productservice.ordergo.dto.*;
import com.productservice.ordergo.entity.User;
import com.productservice.ordergo.exception.BusinessException;
import com.productservice.ordergo.exception.ResourceNotFoundException;
import com.productservice.ordergo.repository.UserRepository;
import com.productservice.ordergo.service.SellerLoadService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/seller-loads")
@RequiredArgsConstructor
public class SellerLoadController {

    private final SellerLoadService sellerLoadService;
    private final UserRepository userRepository;

    @GetMapping("/today")
    public ResponseEntity<SellerLoadDTO> getTodayLoad() {
        return ResponseEntity.ok(sellerLoadService.getOrCreateTodayLoad(resolveSellerId()));
    }

    @PostMapping("/items")
    public ResponseEntity<SellerLoadDTO> addItems(@Valid @RequestBody SellerLoadCreateDTO dto) {
        Long sellerId = resolveSellerId();
        SellerLoadDTO todayLoad = sellerLoadService.getOrCreateTodayLoad(sellerId);
        return ResponseEntity.status(HttpStatus.CREATED).body(sellerLoadService.addItemsToLoad(todayLoad.getId(), dto.getItems()));
    }

    @GetMapping("/stats")
    public ResponseEntity<VendorLoadStatsDTO> getTodayStats() {
        return ResponseEntity.ok(sellerLoadService.getTodayStats(resolveSellerId()));
    }

    @GetMapping("/history")
    public ResponseEntity<List<SellerLoadDTO>> getLoadHistory() {
        return ResponseEntity.ok(sellerLoadService.getLoadHistory(resolveSellerId()));
    }

    @PostMapping("/reject")
    public ResponseEntity<Void> registerRejection(@Valid @RequestBody RejectOrderDTO dto) {
        sellerLoadService.registerRejection(resolveSellerId(), dto);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/reject/{orderId}")
    public ResponseEntity<Void> clearRejection(@PathVariable Long orderId) {
        sellerLoadService.clearRejectionForOrder(orderId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/admin-report")
    public ResponseEntity<List<AdminLoadReportDTO>> getAdminReport(@RequestParam(required = false) String date) {
        LocalDate reportDate = date != null ? LocalDate.parse(date) : LocalDate.now();
        return ResponseEntity.ok(sellerLoadService.getAdminReport(reportDate));
    }

    @DeleteMapping("/{sellerId}")
    public ResponseEntity<Void> deleteLoad(@PathVariable Long sellerId, @RequestParam(required = false) String date) {
        LocalDate deleteDate = date != null ? LocalDate.parse(date) : LocalDate.now();
        sellerLoadService.deleteLoadBySellerAndDate(sellerId, deleteDate);
        return ResponseEntity.noContent().build();
    }

    private Long resolveSellerId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new BusinessException("Usuario no autenticado");
        }
        String username = auth.getName();
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado: " + username));
        return user.getId();
    }
}
