package com.productservice.ordergo.service;

import com.productservice.ordergo.dto.OrderRejectionDTO;

import java.util.List;

public interface OrderRejectionService {

    List<OrderRejectionDTO> getAllRejections();
}
