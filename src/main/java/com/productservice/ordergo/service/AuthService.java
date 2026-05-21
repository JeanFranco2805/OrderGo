package com.productservice.ordergo.service;

import com.productservice.ordergo.dto.AuthRequestDTO;
import com.productservice.ordergo.dto.AuthResponseDTO;

public interface AuthService {
    AuthResponseDTO login(AuthRequestDTO request);
}
