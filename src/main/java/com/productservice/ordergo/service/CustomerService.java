package com.productservice.ordergo.service;

import com.productservice.ordergo.dto.CustomerDTO;
import com.productservice.ordergo.dto.CustomerLocationDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface CustomerService {
    List<CustomerDTO> findAll();
    Page<CustomerDTO> findAll(Pageable pageable);
    CustomerDTO findById(Long id);
    List<CustomerDTO> search(String name);
    Page<CustomerDTO> search(String name, Pageable pageable);
    CustomerDTO create(CustomerDTO dto);
    CustomerDTO update(Long id, CustomerDTO dto);
    CustomerDTO updateLocation(Long id, CustomerLocationDTO dto);
    void delete(Long id);
    void forceDelete(Long id);
    List<CustomerDTO> findBySellerId(Long sellerId);
}
