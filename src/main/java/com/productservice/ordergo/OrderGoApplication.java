package com.productservice.ordergo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class OrderGoApplication {

    public static void main(String[] args) {
        SpringApplication.run(OrderGoApplication.class, args);
    }

}
