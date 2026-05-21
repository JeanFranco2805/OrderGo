package com.productservice.ordergo.config;

import com.productservice.ordergo.entity.User;
import com.productservice.ordergo.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DefaultAdminConfig {

    @Bean
    CommandLineRunner createDefaultAdmin(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            if (userRepository.findByUsername("admin").isEmpty()) {
                User admin = User.builder()
                    .username("admin")
                    .password(passwordEncoder.encode("admin123"))
                    .role("ADMIN")
                    .build();
                userRepository.save(admin);
                System.out.println("✅ Usuario admin creado por defecto (usuario: admin, contraseña: admin123)");
            } else {
                System.out.println("ℹ️ Usuario admin ya existe, omitiendo creación por defecto");
            }
        };
    }
}
