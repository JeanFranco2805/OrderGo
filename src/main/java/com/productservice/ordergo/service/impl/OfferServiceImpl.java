package com.productservice.ordergo.service.impl;

import com.productservice.ordergo.dto.OfferDTO;
import com.productservice.ordergo.dto.OfferItemDTO;
import com.productservice.ordergo.entity.Offer;
import com.productservice.ordergo.entity.OfferItem;
import com.productservice.ordergo.entity.Product;
import com.productservice.ordergo.exception.ResourceNotFoundException;
import com.productservice.ordergo.repository.OfferRepository;
import com.productservice.ordergo.repository.ProductRepository;
import com.productservice.ordergo.service.OfferService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OfferServiceImpl implements OfferService {

    private final OfferRepository offerRepository;
    private final ProductRepository productRepository;
    private final com.productservice.ordergo.repository.OrderItemRepository orderItemRepository;

    @Override
    public List<OfferDTO> findAllActive() {
        return offerRepository.findByActiveTrueAndDeletedFalse().stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    @Override
    public List<OfferDTO> findAll() {
        return offerRepository.findAllNotDeleted().stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    @Override
    public Page<OfferDTO> findAll(Pageable pageable) {
        return offerRepository.findAllNotDeleted(pageable).map(this::toDTO);
    }

    @Override
    public List<OfferDTO> findAllDeleted() {
        return offerRepository.findAllDeleted().stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    @Override
    public OfferDTO findById(Long id) {
        Offer offer = offerRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Oferta no encontrada con id: " + id));
        return toDTO(offer);
    }

    @Override
    @Transactional
    public OfferDTO create(OfferDTO dto) {
        Offer offer = new Offer();
        offer.setName(dto.getName());
        offer.setDescription(dto.getDescription());
        offer.setPrice(dto.getPrice());
        offer.setImageUrl(dto.getImageUrl());
        offer.setActive(dto.getActive() != null ? dto.getActive() : true);

        List<OfferItem> items = dto.getItems().stream()
            .map(itemDTO -> createOfferItem(offer, itemDTO))
            .collect(Collectors.toList());
        offer.setItems(items);

        return toDTO(offerRepository.save(offer));
    }

    @Override
    @Transactional
    public OfferDTO update(Long id, OfferDTO dto) {
        Offer existing = offerRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Oferta no encontrada con id: " + id));

        existing.setName(dto.getName());
        existing.setDescription(dto.getDescription());
        existing.setPrice(dto.getPrice());
        existing.setImageUrl(dto.getImageUrl());
        existing.setActive(dto.getActive());

        existing.getItems().clear();
        List<OfferItem> items = dto.getItems().stream()
            .map(itemDTO -> createOfferItem(existing, itemDTO))
            .collect(Collectors.toList());
        existing.getItems().addAll(items);

        return toDTO(offerRepository.save(existing));
    }

    @Override
    @Transactional
    public OfferDTO updateImage(Long id, String imageUrl) {
        Offer existing = offerRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Oferta no encontrada con id: " + id));
        existing.setImageUrl(imageUrl);
        return toDTO(offerRepository.save(existing));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Offer offer = offerRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Oferta no encontrada con id: " + id));
        offer.setDeleted(true);
        offer.setActive(false);
        offerRepository.save(offer);
    }

    @Override
    @Transactional
    public void forceDelete(Long id) {
        Offer offer = offerRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Oferta no encontrada con id: " + id));
        // Desvincular order_items que usan esta oferta
        orderItemRepository.unlinkByOfferId(id);
        // Los offer_items se borran automáticamente por cascade ALL
        offerRepository.delete(offer);
    }

    @Override
    @Transactional
    public OfferDTO restore(Long id) {
        Offer offer = offerRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Oferta no encontrada con id: " + id));
        offer.setDeleted(false);
        offerRepository.save(offer);
        return toDTO(offer);
    }

    private OfferItem createOfferItem(Offer offer, OfferItemDTO dto) {
        Product product = productRepository.findById(dto.getProductId())
            .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado con id: " + dto.getProductId()));

        BigDecimal subtotal = product.getPrice().multiply(BigDecimal.valueOf(dto.getQuantity()));

        return OfferItem.builder()
            .offer(offer)
            .product(product)
            .quantity(dto.getQuantity())
            .unitPrice(product.getPrice())
            .subtotal(subtotal)
            .build();
    }

    private OfferDTO toDTO(Offer offer) {
        return OfferDTO.builder()
            .id(offer.getId())
            .name(offer.getName())
            .description(offer.getDescription())
            .price(offer.getPrice())
            .imageUrl(offer.getImageUrl())
            .active(offer.getActive())
            .items(offer.getItems().stream().map(this::toItemDTO).collect(Collectors.toList()))
            .build();
    }

    private OfferItemDTO toItemDTO(OfferItem item) {
        return OfferItemDTO.builder()
            .id(item.getId())
            .productId(item.getProduct().getId())
            .productName(item.getProduct().getName())
            .quantity(item.getQuantity())
            .unitPrice(item.getUnitPrice())
            .subtotal(item.getSubtotal())
            .build();
    }
}
