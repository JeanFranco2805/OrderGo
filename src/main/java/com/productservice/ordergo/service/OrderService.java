package com.productservice.ordergo.service;

import com.productservice.ordergo.dto.OrderDTO;
import com.productservice.ordergo.dto.OrderUpdateDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface OrderService {
    List<OrderDTO> findAll();
    Page<OrderDTO> findAll(Pageable pageable);
    OrderDTO findById(Long id);
    List<OrderDTO> search(String query);
    Page<OrderDTO> search(String query, Pageable pageable);
    OrderDTO create(OrderDTO dto);
    OrderDTO update(Long id, OrderUpdateDTO dto);
    OrderDTO updateStatus(Long id, String status);
    void delete(Long id);
    void forceDelete(Long id);
    List<OrderDTO> findPendingDeliveries();
}
