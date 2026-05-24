package com.productservice.ordergo.controller;

import com.productservice.ordergo.dto.CustomerDTO;
import com.productservice.ordergo.dto.CustomerLocationDTO;
import com.productservice.ordergo.service.CustomerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;
    private final com.productservice.ordergo.repository.UserRepository userRepository;

    @GetMapping
    public ResponseEntity<Page<CustomerDTO>> getAll(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        if (search != null && !search.isBlank()) {
            return ResponseEntity.ok(customerService.search(search, pageable));
        }
        return ResponseEntity.ok(customerService.findAll(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CustomerDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(customerService.findById(id));
    }

    @PostMapping
    public ResponseEntity<CustomerDTO> create(@Valid @RequestBody CustomerDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(customerService.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CustomerDTO> update(@PathVariable Long id, @Valid @RequestBody CustomerDTO dto) {
        return ResponseEntity.ok(customerService.update(id, dto));
    }

    @PatchMapping("/{id}/location")
    public ResponseEntity<CustomerDTO> updateLocation(@PathVariable Long id, @RequestBody CustomerLocationDTO dto) {
        return ResponseEntity.ok(customerService.updateLocation(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        customerService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/force")
    public ResponseEntity<Void> forceDelete(@PathVariable Long id) {
        customerService.forceDelete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/my-customers")
    public ResponseEntity<List<CustomerDTO>> getMyCustomers(
            @RequestParam(required = false) String visitDay,
            @RequestParam(required = false) String zone) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return ResponseEntity.status(401).build();
        }
        String username = auth.getName();
        com.productservice.ordergo.entity.User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new com.productservice.ordergo.exception.ResourceNotFoundException("Usuario no encontrado"));
        List<CustomerDTO> customers = customerService.findBySellerId(user.getId());
        if (visitDay != null && !visitDay.isBlank()) {
            customers = customers.stream()
                .filter(c -> visitDay.equalsIgnoreCase(c.getVisitDay()))
                .collect(java.util.stream.Collectors.toList());
        }
        if (zone != null && !zone.isBlank()) {
            customers = customers.stream()
                .filter(c -> zone.equalsIgnoreCase(c.getZone()))
                .collect(java.util.stream.Collectors.toList());
        }
        return ResponseEntity.ok(customers);
    }
}
