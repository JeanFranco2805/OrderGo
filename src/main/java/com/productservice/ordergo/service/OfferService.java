package com.productservice.ordergo.service;

import com.productservice.ordergo.dto.OfferDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface OfferService {
    List<OfferDTO> findAllActive();
    List<OfferDTO> findAll();
    Page<OfferDTO> findAll(Pageable pageable);
    List<OfferDTO> findAllDeleted();
    OfferDTO findById(Long id);
    OfferDTO create(OfferDTO dto);
    OfferDTO update(Long id, OfferDTO dto);
    OfferDTO updateImage(Long id, String imageUrl);
    void delete(Long id);
    void forceDelete(Long id);
    OfferDTO restore(Long id);
}
