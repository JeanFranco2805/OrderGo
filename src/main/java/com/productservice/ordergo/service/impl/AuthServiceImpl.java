package com.productservice.ordergo.service.impl;

import com.productservice.ordergo.dto.AuthRequestDTO;
import com.productservice.ordergo.dto.AuthResponseDTO;
import com.productservice.ordergo.entity.User;
import com.productservice.ordergo.exception.BusinessException;
import com.productservice.ordergo.repository.UserRepository;
import com.productservice.ordergo.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;

    @Override
    public AuthResponseDTO login(AuthRequestDTO request) {
        User user = userRepository.findByUsername(request.getUsername())
            .orElseThrow(() -> new BusinessException("Usuario o contraseña incorrectos"));

        if (!user.getPassword().equals(request.getPassword())) {
            throw new BusinessException("Usuario o contraseña incorrectos");
        }

        return AuthResponseDTO.builder()
            .id(user.getId())
            .username(user.getUsername())
            .role(user.getRole())
            .token(UUID.randomUUID().toString())
            .build();
    }
}
