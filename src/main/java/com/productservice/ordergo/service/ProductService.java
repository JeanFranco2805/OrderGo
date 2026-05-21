package com.productservice.ordergo.service;

import com.productservice.ordergo.dto.ProductDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface ProductService {
    List<ProductDTO> findAll();
    Page<ProductDTO> findAll(Pageable pageable);
    ProductDTO findById(Long id);
    List<ProductDTO> search(String query);
    Page<ProductDTO> search(String query, Pageable pageable);
    ProductDTO create(ProductDTO dto);
    ProductDTO update(Long id, ProductDTO dto);
    ProductDTO updateImage(Long id, String imageUrl);
    void delete(Long id);
    void forceDelete(Long id);
}
