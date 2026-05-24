package com.productservice.ordergo.service.impl;

import com.productservice.ordergo.dto.ProductDTO;
import com.productservice.ordergo.entity.InventoryItem;
import com.productservice.ordergo.entity.Product;
import com.productservice.ordergo.exception.ResourceNotFoundException;
import com.productservice.ordergo.repository.InventoryItemRepository;
import com.productservice.ordergo.repository.ProductRepository;
import com.productservice.ordergo.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
    private final InventoryItemRepository inventoryItemRepository;
    private final com.productservice.ordergo.repository.OrderItemRepository orderItemRepository;
    private final com.productservice.ordergo.repository.OfferRepository offerRepository;
    private final com.productservice.ordergo.repository.SellerLoadItemRepository sellerLoadItemRepository;
    private final com.productservice.ordergo.repository.OrderRejectionRepository orderRejectionRepository;

    @Override
    public List<ProductDTO> findAll() {
        return productRepository.findAll().stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    @Override
    public ProductDTO findById(Long id) {
        Product product = productRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado con id: " + id));
        return toDTO(product);
    }

    @Override
    public List<ProductDTO> search(String query) {
        if (query == null || query.isBlank()) return findAll();
        return productRepository.findByNameContainingIgnoreCaseOrCategoryContainingIgnoreCase(query, query)
            .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public Page<ProductDTO> findAll(Pageable pageable) {
        return productRepository.findAll(pageable).map(this::toDTO);
    }

    @Override
    public Page<ProductDTO> search(String query, Pageable pageable) {
        if (query == null || query.isBlank()) return findAll(pageable);
        return productRepository.findByNameContainingIgnoreCaseOrCategoryContainingIgnoreCase(query, query, pageable)
            .map(this::toDTO);
    }

    @Override
    @Transactional
    public ProductDTO create(ProductDTO dto) {
        InventoryItem item = resolveInventoryItem(dto.getInventoryItemId());
        Product product = Product.builder()
            .name(item != null ? item.getName() : dto.getName())
            .description(dto.getDescription())
            .price(dto.getPrice())
            .stock(item != null ? item.getQuantity().intValue() : dto.getStock())
            .category(dto.getCategory())
            .piecesPerUnit(dto.getPiecesPerUnit() != null ? dto.getPiecesPerUnit() : 1)
            .imageUrl(item != null && item.getImageUrl() != null ? item.getImageUrl() : dto.getImageUrl())
            .inventoryItem(item)
            .build();
        return toDTO(productRepository.save(product));
    }

    @Override
    @Transactional
    public ProductDTO update(Long id, ProductDTO dto) {
        Product existing = productRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado con id: " + id));
        existing.setName(dto.getName());
        existing.setDescription(dto.getDescription());
        existing.setPrice(dto.getPrice());
        existing.setCategory(dto.getCategory());
        existing.setPiecesPerUnit(dto.getPiecesPerUnit() != null ? dto.getPiecesPerUnit() : 1);
        existing.setImageUrl(dto.getImageUrl());

        InventoryItem newItem = resolveInventoryItem(dto.getInventoryItemId());
        if (newItem != null && (existing.getInventoryItem() == null || !newItem.getId().equals(existing.getInventoryItem().getId()))) {
            existing.setInventoryItem(newItem);
            if (dto.getImageUrl() == null || dto.getImageUrl().isBlank()) {
                existing.setImageUrl(newItem.getImageUrl());
            }
        }

        // Always sync stock from inventory if linked; ignore any stock sent from frontend
        if (existing.getInventoryItem() != null) {
            existing.setStock(existing.getInventoryItem().getQuantity().intValue());
        }

        return toDTO(productRepository.save(existing));
    }

    @Override
    @Transactional
    public ProductDTO updateImage(Long id, String imageUrl) {
        Product existing = productRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado con id: " + id));
        existing.setImageUrl(imageUrl);
        return toDTO(productRepository.save(existing));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!productRepository.existsById(id)) {
            throw new ResourceNotFoundException("Producto no encontrado con id: " + id);
        }
        long orderItemCount = orderItemRepository.countByProductId(id);
        if (orderItemCount > 0) {
            throw new com.productservice.ordergo.exception.BusinessException(
                "No se puede eliminar el producto porque está en " + orderItemCount + " pedido(s)."
            );
        }
        long sellerLoadItemCount = sellerLoadItemRepository.countByProductId(id);
        if (sellerLoadItemCount > 0) {
            throw new com.productservice.ordergo.exception.BusinessException(
                "No se puede eliminar el producto porque está en " + sellerLoadItemCount + " carga(s) de vendedor."
            );
        }
        long offerItemCount = offerRepository.countOfferItemsByProductId(id);
        if (offerItemCount > 0) {
            throw new com.productservice.ordergo.exception.BusinessException(
                "No se puede eliminar el producto porque está en " + offerItemCount + " oferta(s)."
            );
        }
        long orderRejectionCount = orderRejectionRepository.countByProductId(id);
        if (orderRejectionCount > 0) {
            throw new com.productservice.ordergo.exception.BusinessException(
                "No se puede eliminar el producto porque está en " + orderRejectionCount + " rechazo(s) de pedido."
            );
        }
        productRepository.deleteById(id);
    }

    @Override
    @Transactional
    public void forceDelete(Long id) {
        Product product = productRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado con id: " + id));
        // Desvincular order_items que usan este producto
        orderItemRepository.unlinkByProductId(id);
        // Borrar offer_items que usan este producto
        offerRepository.deleteOfferItemsByProductId(id);
        // Borrar seller_load_items que usan este producto
        sellerLoadItemRepository.deleteByProductId(id);
        // Desvincular order_rejections que usan este producto
        orderRejectionRepository.unlinkByProductId(id);
        productRepository.delete(product);
    }

    private InventoryItem resolveInventoryItem(Long id) {
        if (id == null) return null;
        return inventoryItemRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Ítem de inventario no encontrado con id: " + id));
    }

    private ProductDTO toDTO(Product p) {
        int stock = p.getStock();
        // If linked to inventory, always reflect the live inventory quantity
        if (p.getInventoryItem() != null) {
            stock = p.getInventoryItem().getQuantity().intValue();
        }
        return ProductDTO.builder()
            .id(p.getId())
            .name(p.getName())
            .description(p.getDescription())
            .price(p.getPrice())
            .stock(stock)
            .category(p.getCategory())
            .piecesPerUnit(p.getPiecesPerUnit() != null ? p.getPiecesPerUnit() : 1)
            .imageUrl(p.getImageUrl())
            .inventoryItemId(p.getInventoryItem() != null ? p.getInventoryItem().getId() : null)
            .build();
    }
}
