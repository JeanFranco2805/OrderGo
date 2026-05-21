package com.productservice.ordergo.service.impl;

import com.productservice.ordergo.dto.SupplierDTO;
import com.productservice.ordergo.entity.Supplier;
import com.productservice.ordergo.exception.ResourceNotFoundException;
import com.productservice.ordergo.repository.SupplierRepository;
import com.productservice.ordergo.service.SupplierService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SupplierServiceImpl implements SupplierService {

    private final SupplierRepository supplierRepository;

    @Override
    public List<SupplierDTO> findAll() {
        return supplierRepository.findAll().stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    @Override
    public SupplierDTO findById(Long id) {
        Supplier supplier = supplierRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Proveedor no encontrado con id: " + id));
        return toDTO(supplier);
    }

    @Override
    public List<SupplierDTO> search(String name) {
        if (name == null || name.isBlank()) return findAll();
        return supplierRepository.findByNameContainingIgnoreCase(name)
            .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public Page<SupplierDTO> findAll(Pageable pageable) {
        return supplierRepository.findAll(pageable).map(this::toDTO);
    }

    @Override
    public Page<SupplierDTO> search(String name, Pageable pageable) {
        if (name == null || name.isBlank()) return findAll(pageable);
        return supplierRepository.findByNameContainingIgnoreCase(name, pageable).map(this::toDTO);
    }

    @Override
    @Transactional
    public SupplierDTO create(SupplierDTO dto) {
        Supplier supplier = toEntity(dto);
        return toDTO(supplierRepository.save(supplier));
    }

    @Override
    @Transactional
    public SupplierDTO update(Long id, SupplierDTO dto) {
        Supplier existing = supplierRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Proveedor no encontrado con id: " + id));
        existing.setName(dto.getName());
        existing.setEmail(dto.getEmail());
        existing.setPhone(dto.getPhone());
        existing.setAddress(dto.getAddress());
        return toDTO(supplierRepository.save(existing));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!supplierRepository.existsById(id)) {
            throw new ResourceNotFoundException("Proveedor no encontrado con id: " + id);
        }
        supplierRepository.deleteById(id);
    }

    private SupplierDTO toDTO(Supplier s) {
        return SupplierDTO.builder()
            .id(s.getId())
            .name(s.getName())
            .email(s.getEmail())
            .phone(s.getPhone())
            .address(s.getAddress())
            .build();
    }

    private Supplier toEntity(SupplierDTO dto) {
        return Supplier.builder()
            .name(dto.getName())
            .email(dto.getEmail())
            .phone(dto.getPhone())
            .address(dto.getAddress())
            .build();
    }
}
