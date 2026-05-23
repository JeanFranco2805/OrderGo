package com.productservice.ordergo.service.impl;

import com.productservice.ordergo.dto.*;
import com.productservice.ordergo.entity.*;
import com.productservice.ordergo.exception.BusinessException;
import com.productservice.ordergo.exception.ResourceNotFoundException;
import com.productservice.ordergo.repository.*;
import com.productservice.ordergo.service.SellerLoadService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SellerLoadServiceImpl implements SellerLoadService {

    private final SellerLoadRepository sellerLoadRepository;
    private final SellerLoadItemRepository sellerLoadItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrderRejectionRepository orderRejectionRepository;
    private final OfferRepository offerRepository;

    @Override
    @Transactional
    public SellerLoadDTO getOrCreateTodayLoad(Long sellerId) {
        User seller = userRepository.findById(sellerId)
            .orElseThrow(() -> new ResourceNotFoundException("Vendedor no encontrado con id: " + sellerId));

        LocalDate today = LocalDate.now();
        return sellerLoadRepository.findActiveBySellerIdAndLoadDate(sellerId, today)
            .map(this::toDTO)
            .orElseGet(() -> {
                SellerLoad load = SellerLoad.builder()
                    .seller(seller)
                    .loadDate(today)
                    .status(SellerLoad.LoadStatus.ACTIVO)
                    .items(new java.util.ArrayList<>())
                    .build();
                return toDTO(sellerLoadRepository.save(load));
            });
    }

    @Override
    @Transactional
    public SellerLoadDTO addItemsToLoad(Long loadId, List<SellerLoadItemCreateDTO> items) {
        SellerLoad load = sellerLoadRepository.findById(loadId)
            .orElseThrow(() -> new ResourceNotFoundException("Carga no encontrada con id: " + loadId));

        for (SellerLoadItemCreateDTO itemDTO : items) {
            Product product = productRepository.findById(itemDTO.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado con id: " + itemDTO.getProductId()));

            SellerLoadItem.UnitOfMeasure uom;
            try {
                uom = SellerLoadItem.UnitOfMeasure.valueOf(itemDTO.getUnitOfMeasure().toUpperCase());
            } catch (Exception e) {
                throw new BusinessException("Unidad de medida inválida: " + itemDTO.getUnitOfMeasure());
            }

            SellerLoadItem existingItem = load.getItems().stream()
                .filter(i -> i.getProduct().getId().equals(product.getId()))
                .findFirst()
                .orElse(null);

            if (existingItem != null) {
                existingItem.setQuantityLoaded(existingItem.getQuantityLoaded().add(itemDTO.getQuantityLoaded()));
            } else {
                SellerLoadItem newItem = SellerLoadItem.builder()
                    .sellerLoad(load)
                    .product(product)
                    .quantityLoaded(itemDTO.getQuantityLoaded())
                    .quantityDelivered(BigDecimal.ZERO)
                    .quantityRejected(BigDecimal.ZERO)
                    .unitOfMeasure(uom)
                    .build();
                load.getItems().add(newItem);
            }
        }

        return toDTO(sellerLoadRepository.save(load));
    }

    private int piecesPerUnit(Product product) {
        return product.getPiecesPerUnit() != null ? product.getPiecesPerUnit() : 1;
    }

    @Override
    @Transactional
    public void deductOnDelivery(Long sellerId, Long orderId) {
        SellerLoad load = getOrCreateLoadEntity(sellerId);

        Order order = orderRepository.findByIdWithItems(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Pedido no encontrado con id: " + orderId));

        for (OrderItem orderItem : order.getItems()) {
            if (orderItem.getProduct() != null) {
                SellerLoadItem loadItem = findLoadItemByProduct(load, orderItem.getProduct().getId());
                int qty = orderItem.getQuantity() * piecesPerUnit(orderItem.getProduct());
                BigDecimal qtyBd = BigDecimal.valueOf(qty);
                if (loadItem != null) {
                    loadItem.setQuantityDelivered(loadItem.getQuantityDelivered().add(qtyBd));
                    loadItem.setQuantityLoaded(loadItem.getQuantityLoaded().subtract(qtyBd).max(BigDecimal.ZERO));
                    sellerLoadItemRepository.save(loadItem);
                } else {
                    SellerLoadItem newItem = SellerLoadItem.builder()
                        .sellerLoad(load)
                        .product(orderItem.getProduct())
                        .quantityLoaded(BigDecimal.ZERO)
                        .quantityDelivered(qtyBd)
                        .quantityRejected(BigDecimal.ZERO)
                        .unitOfMeasure(SellerLoadItem.UnitOfMeasure.UNIDAD)
                        .build();
                    load.getItems().add(newItem);
                    sellerLoadItemRepository.save(newItem);
                }
            } else if (orderItem.getOffer() != null) {
                Offer fullOffer = offerRepository.findByIdWithItems(orderItem.getOffer().getId())
                    .orElse(null);
                if (fullOffer != null) {
                    for (OfferItem offerItem : fullOffer.getItems()) {
                        SellerLoadItem loadItem = findLoadItemByProduct(load, offerItem.getProduct().getId());
                        int totalQty = offerItem.getQuantity() * orderItem.getQuantity() * piecesPerUnit(offerItem.getProduct());
                        BigDecimal qtyBd = BigDecimal.valueOf(totalQty);
                        if (loadItem != null) {
                            loadItem.setQuantityDelivered(loadItem.getQuantityDelivered().add(qtyBd));
                            loadItem.setQuantityLoaded(loadItem.getQuantityLoaded().subtract(qtyBd).max(BigDecimal.ZERO));
                            sellerLoadItemRepository.save(loadItem);
                        } else {
                            SellerLoadItem newItem = SellerLoadItem.builder()
                                .sellerLoad(load)
                                .product(offerItem.getProduct())
                                .quantityLoaded(BigDecimal.ZERO)
                                .quantityDelivered(qtyBd)
                                .quantityRejected(BigDecimal.ZERO)
                                .unitOfMeasure(SellerLoadItem.UnitOfMeasure.UNIDAD)
                                .build();
                            load.getItems().add(newItem);
                            sellerLoadItemRepository.save(newItem);
                        }
                    }
                }
            }
        }
    }

    @Override
    @Transactional
    public void reverseDeliveryToRejection(Long sellerId, Long orderId) {
        SellerLoad load = getOrCreateLoadEntity(sellerId);
        Order order = orderRepository.findByIdWithItems(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Pedido no encontrado con id: " + orderId));
        for (OrderItem orderItem : order.getItems()) {
            if (orderItem.getProduct() != null) {
                SellerLoadItem loadItem = findLoadItemByProduct(load, orderItem.getProduct().getId());
                int qty = orderItem.getQuantity() * piecesPerUnit(orderItem.getProduct());
                BigDecimal qtyBd = BigDecimal.valueOf(qty);
                if (loadItem != null) {
                    loadItem.setQuantityDelivered(loadItem.getQuantityDelivered().subtract(qtyBd).max(BigDecimal.ZERO));
                    loadItem.setQuantityRejected(loadItem.getQuantityRejected().add(qtyBd));
                    sellerLoadItemRepository.save(loadItem);
                } else {
                    SellerLoadItem newItem = SellerLoadItem.builder()
                        .sellerLoad(load)
                        .product(orderItem.getProduct())
                        .quantityLoaded(BigDecimal.ZERO)
                        .quantityDelivered(BigDecimal.ZERO)
                        .quantityRejected(qtyBd)
                        .unitOfMeasure(SellerLoadItem.UnitOfMeasure.UNIDAD)
                        .build();
                    load.getItems().add(newItem);
                    sellerLoadItemRepository.save(newItem);
                }
            } else if (orderItem.getOffer() != null) {
                Offer fullOffer = offerRepository.findByIdWithItems(orderItem.getOffer().getId())
                    .orElse(null);
                if (fullOffer != null) {
                    for (OfferItem offerItem : fullOffer.getItems()) {
                        SellerLoadItem loadItem = findLoadItemByProduct(load, offerItem.getProduct().getId());
                        int totalQty = offerItem.getQuantity() * orderItem.getQuantity() * piecesPerUnit(offerItem.getProduct());
                        BigDecimal qtyBd = BigDecimal.valueOf(totalQty);
                        if (loadItem != null) {
                            loadItem.setQuantityDelivered(loadItem.getQuantityDelivered().subtract(qtyBd).max(BigDecimal.ZERO));
                            loadItem.setQuantityRejected(loadItem.getQuantityRejected().add(qtyBd));
                            sellerLoadItemRepository.save(loadItem);
                        } else {
                            SellerLoadItem newItem = SellerLoadItem.builder()
                                .sellerLoad(load)
                                .product(offerItem.getProduct())
                                .quantityLoaded(BigDecimal.ZERO)
                                .quantityDelivered(BigDecimal.ZERO)
                                .quantityRejected(qtyBd)
                                .unitOfMeasure(SellerLoadItem.UnitOfMeasure.UNIDAD)
                                .build();
                            load.getItems().add(newItem);
                            sellerLoadItemRepository.save(newItem);
                        }
                    }
                }
            }
        }
    }

    @Override
    @Transactional
    public void reverseRejectionToDelivery(Long sellerId, Long orderId) {
        SellerLoad load = getOrCreateLoadEntity(sellerId);
        List<OrderRejection> rejections = orderRejectionRepository.findByOrderId(orderId);
        if (!rejections.isEmpty()) {
            for (OrderRejection rejection : rejections) {
                Product product = rejection.getProduct();
                if (product == null) continue;
                int pieces = rejection.getQuantity().intValue();
                BigDecimal piecesBd = BigDecimal.valueOf(pieces);
                SellerLoadItem loadItem = findLoadItemByProduct(load, product.getId());
                if (loadItem != null) {
                    loadItem.setQuantityRejected(loadItem.getQuantityRejected().subtract(piecesBd).max(BigDecimal.ZERO));
                    loadItem.setQuantityDelivered(loadItem.getQuantityDelivered().add(piecesBd));
                    sellerLoadItemRepository.save(loadItem);
                } else {
                    SellerLoadItem newItem = SellerLoadItem.builder()
                        .sellerLoad(load)
                        .product(product)
                        .quantityLoaded(BigDecimal.ZERO)
                        .quantityDelivered(piecesBd)
                        .quantityRejected(BigDecimal.ZERO)
                        .unitOfMeasure(SellerLoadItem.UnitOfMeasure.UNIDAD)
                        .build();
                    load.getItems().add(newItem);
                    sellerLoadItemRepository.save(newItem);
                }
            }
        } else {
            // Fallback when no rejection records exist
            Order order = orderRepository.findByIdWithItems(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Pedido no encontrado con id: " + orderId));
            for (OrderItem orderItem : order.getItems()) {
                if (orderItem.getProduct() != null) {
                    SellerLoadItem loadItem = findLoadItemByProduct(load, orderItem.getProduct().getId());
                    int qty = orderItem.getQuantity() * piecesPerUnit(orderItem.getProduct());
                    BigDecimal qtyBd = BigDecimal.valueOf(qty);
                    if (loadItem != null) {
                        loadItem.setQuantityRejected(loadItem.getQuantityRejected().subtract(qtyBd).max(BigDecimal.ZERO));
                        loadItem.setQuantityDelivered(loadItem.getQuantityDelivered().add(qtyBd));
                        sellerLoadItemRepository.save(loadItem);
                    } else {
                        SellerLoadItem newItem = SellerLoadItem.builder()
                            .sellerLoad(load)
                            .product(orderItem.getProduct())
                            .quantityLoaded(BigDecimal.ZERO)
                            .quantityDelivered(qtyBd)
                            .quantityRejected(BigDecimal.ZERO)
                            .unitOfMeasure(SellerLoadItem.UnitOfMeasure.UNIDAD)
                            .build();
                        load.getItems().add(newItem);
                        sellerLoadItemRepository.save(newItem);
                    }
                } else if (orderItem.getOffer() != null) {
                    Offer fullOffer = offerRepository.findByIdWithItems(orderItem.getOffer().getId()).orElse(null);
                    if (fullOffer != null) {
                        for (OfferItem offerItem : fullOffer.getItems()) {
                            SellerLoadItem loadItem = findLoadItemByProduct(load, offerItem.getProduct().getId());
                            int totalQty = offerItem.getQuantity() * orderItem.getQuantity() * piecesPerUnit(offerItem.getProduct());
                            BigDecimal qtyBd = BigDecimal.valueOf(totalQty);
                            if (loadItem != null) {
                                loadItem.setQuantityRejected(loadItem.getQuantityRejected().subtract(qtyBd).max(BigDecimal.ZERO));
                                loadItem.setQuantityDelivered(loadItem.getQuantityDelivered().add(qtyBd));
                                sellerLoadItemRepository.save(loadItem);
                            } else {
                                SellerLoadItem newItem = SellerLoadItem.builder()
                                    .sellerLoad(load)
                                    .product(offerItem.getProduct())
                                    .quantityLoaded(BigDecimal.ZERO)
                                    .quantityDelivered(qtyBd)
                                    .quantityRejected(BigDecimal.ZERO)
                                    .unitOfMeasure(SellerLoadItem.UnitOfMeasure.UNIDAD)
                                    .build();
                                load.getItems().add(newItem);
                                sellerLoadItemRepository.save(newItem);
                            }
                        }
                    }
                }
            }
        }
    }

    @Override
    @Transactional
    public void reverseDeliveryToPending(Long sellerId, Long orderId) {
        SellerLoad load = getOrCreateLoadEntity(sellerId);
        Order order = orderRepository.findByIdWithItems(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Pedido no encontrado con id: " + orderId));
        for (OrderItem orderItem : order.getItems()) {
            if (orderItem.getProduct() != null) {
                SellerLoadItem loadItem = findLoadItemByProduct(load, orderItem.getProduct().getId());
                int qty = orderItem.getQuantity() * piecesPerUnit(orderItem.getProduct());
                BigDecimal qtyBd = BigDecimal.valueOf(qty);
                if (loadItem != null) {
                    loadItem.setQuantityDelivered(loadItem.getQuantityDelivered().subtract(qtyBd).max(BigDecimal.ZERO));
                    loadItem.setQuantityLoaded(loadItem.getQuantityLoaded().add(qtyBd));
                    sellerLoadItemRepository.save(loadItem);
                } else {
                    SellerLoadItem newItem = SellerLoadItem.builder()
                        .sellerLoad(load)
                        .product(orderItem.getProduct())
                        .quantityLoaded(qtyBd)
                        .quantityDelivered(BigDecimal.ZERO)
                        .quantityRejected(BigDecimal.ZERO)
                        .unitOfMeasure(SellerLoadItem.UnitOfMeasure.UNIDAD)
                        .build();
                    load.getItems().add(newItem);
                    sellerLoadItemRepository.save(newItem);
                }
            } else if (orderItem.getOffer() != null) {
                Offer fullOffer = offerRepository.findByIdWithItems(orderItem.getOffer().getId()).orElse(null);
                if (fullOffer != null) {
                    for (OfferItem offerItem : fullOffer.getItems()) {
                        SellerLoadItem loadItem = findLoadItemByProduct(load, offerItem.getProduct().getId());
                        int totalQty = offerItem.getQuantity() * orderItem.getQuantity() * piecesPerUnit(offerItem.getProduct());
                        BigDecimal qtyBd = BigDecimal.valueOf(totalQty);
                        if (loadItem != null) {
                            loadItem.setQuantityDelivered(loadItem.getQuantityDelivered().subtract(qtyBd).max(BigDecimal.ZERO));
                            loadItem.setQuantityLoaded(loadItem.getQuantityLoaded().add(qtyBd));
                            sellerLoadItemRepository.save(loadItem);
                        } else {
                            SellerLoadItem newItem = SellerLoadItem.builder()
                                .sellerLoad(load)
                                .product(offerItem.getProduct())
                                .quantityLoaded(qtyBd)
                                .quantityDelivered(BigDecimal.ZERO)
                                .quantityRejected(BigDecimal.ZERO)
                                .unitOfMeasure(SellerLoadItem.UnitOfMeasure.UNIDAD)
                                .build();
                            load.getItems().add(newItem);
                            sellerLoadItemRepository.save(newItem);
                        }
                    }
                }
            }
        }
    }

    @Override
    @Transactional
    public void reverseRejectionToPending(Long sellerId, Long orderId) {
        SellerLoad load = getOrCreateLoadEntity(sellerId);
        List<OrderRejection> rejections = orderRejectionRepository.findByOrderId(orderId);
        if (!rejections.isEmpty()) {
            for (OrderRejection rejection : rejections) {
                Product product = rejection.getProduct();
                if (product == null) continue;
                int pieces = rejection.getQuantity().intValue();
                BigDecimal piecesBd = BigDecimal.valueOf(pieces);
                SellerLoadItem loadItem = findLoadItemByProduct(load, product.getId());
                if (loadItem != null) {
                    loadItem.setQuantityRejected(loadItem.getQuantityRejected().subtract(piecesBd).max(BigDecimal.ZERO));
                    loadItem.setQuantityLoaded(loadItem.getQuantityLoaded().add(piecesBd));
                    sellerLoadItemRepository.save(loadItem);
                } else {
                    SellerLoadItem newItem = SellerLoadItem.builder()
                        .sellerLoad(load)
                        .product(product)
                        .quantityLoaded(piecesBd)
                        .quantityDelivered(BigDecimal.ZERO)
                        .quantityRejected(BigDecimal.ZERO)
                        .unitOfMeasure(SellerLoadItem.UnitOfMeasure.UNIDAD)
                        .build();
                    load.getItems().add(newItem);
                    sellerLoadItemRepository.save(newItem);
                }
            }
        } else {
            // Fallback when no rejection records exist
            Order order = orderRepository.findByIdWithItems(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Pedido no encontrado con id: " + orderId));
            for (OrderItem orderItem : order.getItems()) {
                if (orderItem.getProduct() != null) {
                    SellerLoadItem loadItem = findLoadItemByProduct(load, orderItem.getProduct().getId());
                    int qty = orderItem.getQuantity() * piecesPerUnit(orderItem.getProduct());
                    BigDecimal qtyBd = BigDecimal.valueOf(qty);
                    if (loadItem != null) {
                        loadItem.setQuantityRejected(loadItem.getQuantityRejected().subtract(qtyBd).max(BigDecimal.ZERO));
                        loadItem.setQuantityLoaded(loadItem.getQuantityLoaded().add(qtyBd));
                        sellerLoadItemRepository.save(loadItem);
                    } else {
                        SellerLoadItem newItem = SellerLoadItem.builder()
                            .sellerLoad(load)
                            .product(orderItem.getProduct())
                            .quantityLoaded(qtyBd)
                            .quantityDelivered(BigDecimal.ZERO)
                            .quantityRejected(BigDecimal.ZERO)
                            .unitOfMeasure(SellerLoadItem.UnitOfMeasure.UNIDAD)
                            .build();
                        load.getItems().add(newItem);
                        sellerLoadItemRepository.save(newItem);
                    }
                } else if (orderItem.getOffer() != null) {
                    Offer fullOffer = offerRepository.findByIdWithItems(orderItem.getOffer().getId()).orElse(null);
                    if (fullOffer != null) {
                        for (OfferItem offerItem : fullOffer.getItems()) {
                            SellerLoadItem loadItem = findLoadItemByProduct(load, offerItem.getProduct().getId());
                            int totalQty = offerItem.getQuantity() * orderItem.getQuantity() * piecesPerUnit(offerItem.getProduct());
                            BigDecimal qtyBd = BigDecimal.valueOf(totalQty);
                            if (loadItem != null) {
                                loadItem.setQuantityRejected(loadItem.getQuantityRejected().subtract(qtyBd).max(BigDecimal.ZERO));
                                loadItem.setQuantityLoaded(loadItem.getQuantityLoaded().add(qtyBd));
                                sellerLoadItemRepository.save(loadItem);
                            } else {
                                SellerLoadItem newItem = SellerLoadItem.builder()
                                    .sellerLoad(load)
                                    .product(offerItem.getProduct())
                                    .quantityLoaded(qtyBd)
                                    .quantityDelivered(BigDecimal.ZERO)
                                    .quantityRejected(BigDecimal.ZERO)
                                    .unitOfMeasure(SellerLoadItem.UnitOfMeasure.UNIDAD)
                                    .build();
                                load.getItems().add(newItem);
                                sellerLoadItemRepository.save(newItem);
                            }
                        }
                    }
                }
            }
        }
    }

    @Override
    @Transactional
    public void rejectOrderItems(Long sellerId, Long orderId) {
        SellerLoad load = getOrCreateLoadEntity(sellerId);
        Order order = orderRepository.findByIdWithItems(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Pedido no encontrado con id: " + orderId));
        for (OrderItem orderItem : order.getItems()) {
            if (orderItem.getProduct() != null) {
                SellerLoadItem loadItem = findLoadItemByProduct(load, orderItem.getProduct().getId());
                int qty = orderItem.getQuantity() * piecesPerUnit(orderItem.getProduct());
                BigDecimal qtyBd = BigDecimal.valueOf(qty);
                if (loadItem != null) {
                    loadItem.setQuantityLoaded(loadItem.getQuantityLoaded().subtract(qtyBd).max(BigDecimal.ZERO));
                    loadItem.setQuantityRejected(loadItem.getQuantityRejected().add(qtyBd));
                    sellerLoadItemRepository.save(loadItem);
                } else {
                    // Product not in load yet; create it with zero loaded and full rejected
                    SellerLoadItem newItem = SellerLoadItem.builder()
                        .sellerLoad(load)
                        .product(orderItem.getProduct())
                        .quantityLoaded(BigDecimal.ZERO)
                        .quantityDelivered(BigDecimal.ZERO)
                        .quantityRejected(qtyBd)
                        .unitOfMeasure(SellerLoadItem.UnitOfMeasure.UNIDAD)
                        .build();
                    load.getItems().add(newItem);
                    sellerLoadItemRepository.save(newItem);
                }
            } else if (orderItem.getOffer() != null) {
                Offer fullOffer = offerRepository.findByIdWithItems(orderItem.getOffer().getId()).orElse(null);
                if (fullOffer != null) {
                    for (OfferItem offerItem : fullOffer.getItems()) {
                        SellerLoadItem loadItem = findLoadItemByProduct(load, offerItem.getProduct().getId());
                        int totalQty = offerItem.getQuantity() * orderItem.getQuantity() * piecesPerUnit(offerItem.getProduct());
                        BigDecimal qtyBd = BigDecimal.valueOf(totalQty);
                        if (loadItem != null) {
                            loadItem.setQuantityLoaded(loadItem.getQuantityLoaded().subtract(qtyBd).max(BigDecimal.ZERO));
                            loadItem.setQuantityRejected(loadItem.getQuantityRejected().add(qtyBd));
                            sellerLoadItemRepository.save(loadItem);
                        } else {
                            SellerLoadItem newItem = SellerLoadItem.builder()
                                .sellerLoad(load)
                                .product(offerItem.getProduct())
                                .quantityLoaded(BigDecimal.ZERO)
                                .quantityDelivered(BigDecimal.ZERO)
                                .quantityRejected(qtyBd)
                                .unitOfMeasure(SellerLoadItem.UnitOfMeasure.UNIDAD)
                                .build();
                            load.getItems().add(newItem);
                            sellerLoadItemRepository.save(newItem);
                        }
                    }
                }
            }
        }
    }

    @Override
    @Transactional
    public void addOrderItemsToLoad(Long sellerId, Long orderId) {
        SellerLoad load = getOrCreateLoadEntity(sellerId);

        Order order = orderRepository.findByIdWithItems(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Pedido no encontrado con id: " + orderId));

        for (OrderItem orderItem : order.getItems()) {
            if (orderItem.getProduct() != null) {
                SellerLoadItem loadItem = findLoadItemByProduct(load, orderItem.getProduct().getId());
                int qty = orderItem.getQuantity() * piecesPerUnit(orderItem.getProduct());
                BigDecimal qtyBd = BigDecimal.valueOf(qty);
                if (loadItem != null) {
                    loadItem.setQuantityLoaded(loadItem.getQuantityLoaded().add(qtyBd));
                } else {
                    SellerLoadItem newItem = SellerLoadItem.builder()
                        .sellerLoad(load)
                        .product(orderItem.getProduct())
                        .quantityLoaded(qtyBd)
                        .quantityDelivered(BigDecimal.ZERO)
                        .quantityRejected(BigDecimal.ZERO)
                        .unitOfMeasure(SellerLoadItem.UnitOfMeasure.UNIDAD)
                        .build();
                    load.getItems().add(newItem);
                }
            } else if (orderItem.getOffer() != null) {
                Offer fullOffer = offerRepository.findByIdWithItems(orderItem.getOffer().getId())
                    .orElse(null);
                if (fullOffer != null) {
                    for (OfferItem offerItem : fullOffer.getItems()) {
                        SellerLoadItem loadItem = findLoadItemByProduct(load, offerItem.getProduct().getId());
                        int totalQty = offerItem.getQuantity() * orderItem.getQuantity() * piecesPerUnit(offerItem.getProduct());
                        if (loadItem != null) {
                            loadItem.setQuantityLoaded(loadItem.getQuantityLoaded().add(BigDecimal.valueOf(totalQty)));
                        } else {
                            SellerLoadItem newItem = SellerLoadItem.builder()
                                .sellerLoad(load)
                                .product(offerItem.getProduct())
                                .quantityLoaded(BigDecimal.valueOf(totalQty))
                                .quantityDelivered(BigDecimal.ZERO)
                                .quantityRejected(BigDecimal.ZERO)
                                .unitOfMeasure(SellerLoadItem.UnitOfMeasure.UNIDAD)
                                .build();
                            load.getItems().add(newItem);
                        }
                    }
                }
            }
        }
        sellerLoadRepository.save(load);
    }

    private SellerLoad getOrCreateLoadEntity(Long sellerId) {
        User seller = userRepository.findById(sellerId)
            .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con id: " + sellerId));
        LocalDate today = LocalDate.now();
        return sellerLoadRepository.findActiveBySellerIdAndLoadDate(sellerId, today)
            .orElseGet(() -> {
                SellerLoad load = SellerLoad.builder()
                    .seller(seller)
                    .loadDate(today)
                    .status(SellerLoad.LoadStatus.ACTIVO)
                    .items(new java.util.ArrayList<>())
                    .build();
                return sellerLoadRepository.save(load);
            });
    }

    private SellerLoadItem findLoadItemByProduct(SellerLoad load, Long productId) {
        return load.getItems().stream()
            .filter(i -> i.getProduct().getId().equals(productId))
            .findFirst()
            .orElse(null);
    }

    @Override
    @Transactional
    public void registerRejection(Long sellerId, RejectOrderDTO dto) {
        Order order = orderRepository.findById(dto.getOrderId())
            .orElseThrow(() -> new ResourceNotFoundException("Pedido no encontrado con id: " + dto.getOrderId()));

        Long effectiveSellerId = order.getDeliveryPerson() != null ? order.getDeliveryPerson().getId() : sellerId;
        User deliveryPerson = userRepository.findById(effectiveSellerId).orElse(null);

        String prevStatus = dto.getPreviousStatus();
        boolean fromPending = prevStatus == null || "PENDIENTE".equals(prevStatus) || "EN_PREPARACION".equals(prevStatus);

        if (dto.getProductId() != null) {
            OrderItem orderItem = order.getItems().stream()
                .filter(i -> i.getProduct() != null && i.getProduct().getId().equals(dto.getProductId()))
                .findFirst()
                .orElseThrow(() -> new BusinessException("El producto no está en el pedido"));

            int totalUnits = orderItem.getQuantity();
            int rejectedUnits = dto.getQuantity().intValue();
            int deliveredUnits = totalUnits - rejectedUnits;
            int piecesPer = piecesPerUnit(orderItem.getProduct());
            int rejectedPieces = rejectedUnits * piecesPer;
            int deliveredPieces = deliveredUnits * piecesPer;
            int totalPieces = totalUnits * piecesPer;

            if (fromPending) {
                // From PENDIENTE/EN_PREPARACION: move total from loaded -> delivered + rejected
                applyLoadChange(effectiveSellerId, dto.getProductId(), -totalPieces, deliveredPieces, rejectedPieces);
            } else {
                // From ENTREGADO: move rejected from delivered -> rejected
                applyLoadChange(effectiveSellerId, dto.getProductId(), 0, -rejectedPieces, rejectedPieces);
            }

            OrderRejection rejection = OrderRejection.builder()
                .order(order)
                .product(orderItem.getProduct())
                .seller(order.getSeller())
                .deliveryPerson(deliveryPerson)
                .customer(order.getCustomer())
                .quantity(BigDecimal.valueOf(rejectedPieces))
                .reason(dto.getReason())
                .build();
            orderRejectionRepository.save(rejection);

        } else if (dto.getOfferId() != null) {
            OrderItem orderItem = order.getItems().stream()
                .filter(i -> i.getOffer() != null && i.getOffer().getId().equals(dto.getOfferId()))
                .findFirst()
                .orElseThrow(() -> new BusinessException("El combo no está en el pedido"));

            Offer fullOffer = offerRepository.findByIdWithItems(dto.getOfferId())
                .orElseThrow(() -> new ResourceNotFoundException("Combo no encontrado"));

            int totalComboQty = orderItem.getQuantity();
            int rejectedComboQty = dto.getQuantity().intValue();
            int deliveredComboQty = totalComboQty - rejectedComboQty;

            for (OfferItem offerItem : fullOffer.getItems()) {
                Product product = offerItem.getProduct();
                int piecesPer = piecesPerUnit(product);
                int totalPieces = offerItem.getQuantity() * totalComboQty * piecesPer;
                int rejectedPieces = offerItem.getQuantity() * rejectedComboQty * piecesPer;
                int deliveredPieces = offerItem.getQuantity() * deliveredComboQty * piecesPer;

                if (fromPending) {
                    applyLoadChange(effectiveSellerId, product.getId(), -totalPieces, deliveredPieces, rejectedPieces);
                } else {
                    applyLoadChange(effectiveSellerId, product.getId(), 0, -rejectedPieces, rejectedPieces);
                }

                OrderRejection rejection = OrderRejection.builder()
                    .order(order)
                    .product(product)
                    .seller(order.getSeller())
                    .deliveryPerson(deliveryPerson)
                    .customer(order.getCustomer())
                    .quantity(BigDecimal.valueOf(rejectedPieces))
                    .reason(dto.getReason())
                    .build();
                orderRejectionRepository.save(rejection);
            }
        } else {
            throw new BusinessException("Debe especificar productId u offerId");
        }
    }

    private void applyLoadChange(Long sellerId, Long productId, int loadedDelta, int deliveredDelta, int rejectedDelta) {
        java.util.Optional<SellerLoad> todayLoad = sellerLoadRepository.findActiveBySellerIdAndLoadDate(sellerId, LocalDate.now());
        if (todayLoad.isPresent() && applyToLoad(todayLoad.get(), productId, loadedDelta, deliveredDelta, rejectedDelta)) {
            return;
        }
        // Fallback: search any load for this seller (e.g. delivery from yesterday, rejection today)
        List<SellerLoad> allLoads = sellerLoadRepository.findBySellerId(sellerId);
        for (SellerLoad load : allLoads) {
            if (applyToLoad(load, productId, loadedDelta, deliveredDelta, rejectedDelta)) {
                return;
            }
        }
    }

    private boolean applyToLoad(SellerLoad load, Long productId, int loadedDelta, int deliveredDelta, int rejectedDelta) {
        SellerLoadItem loadItem = findLoadItemByProduct(load, productId);
        if (loadItem == null) {
            return false;
        }
        BigDecimal newLoaded = loadItem.getQuantityLoaded().add(BigDecimal.valueOf(loadedDelta)).max(BigDecimal.ZERO);
        BigDecimal newDelivered = loadItem.getQuantityDelivered().add(BigDecimal.valueOf(deliveredDelta)).max(BigDecimal.ZERO);
        BigDecimal newRejected = loadItem.getQuantityRejected().add(BigDecimal.valueOf(rejectedDelta)).max(BigDecimal.ZERO);
        loadItem.setQuantityLoaded(newLoaded);
        loadItem.setQuantityDelivered(newDelivered);
        loadItem.setQuantityRejected(newRejected);
        sellerLoadItemRepository.save(loadItem);
        return true;
    }

    @Override
    @Transactional
    public void clearRejectionForOrder(Long orderId) {
        Order order = orderRepository.findByIdWithItems(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Pedido no encontrado con id: " + orderId));

        // Delete rejection records even if no delivery person / load
        List<OrderRejection> rejections = orderRejectionRepository.findByOrderId(orderId);
        if (rejections.isEmpty()) {
            return;
        }

        if (order.getDeliveryPerson() != null) {
            Long sellerId = order.getDeliveryPerson().getId();
            List<SellerLoad> allLoads = sellerLoadRepository.findBySellerId(sellerId);
            for (OrderRejection rejection : rejections) {
                Product product = rejection.getProduct();
                if (product == null) continue;
                int pieces = rejection.getQuantity().intValue();
                BigDecimal piecesBd = BigDecimal.valueOf(pieces);
                for (SellerLoad load : allLoads) {
                    SellerLoadItem loadItem = findLoadItemByProduct(load, product.getId());
                    if (loadItem != null) {
                        loadItem.setQuantityRejected(loadItem.getQuantityRejected().subtract(piecesBd).max(BigDecimal.ZERO));
                        // When clearing a rejection, the quantity goes to delivered (not loaded)
                        // because the non-rejected portion of the order is already considered delivered
                        loadItem.setQuantityDelivered(loadItem.getQuantityDelivered().add(piecesBd));
                        sellerLoadItemRepository.save(loadItem);
                    }
                }
            }
        }

        orderRejectionRepository.deleteByOrderId(orderId);
    }

    @Override
    public SellerLoadDTO getTodayLoad(Long sellerId) {
        return sellerLoadRepository.findActiveBySellerIdAndLoadDate(sellerId, LocalDate.now())
            .map(this::toDTO)
            .orElseThrow(() -> new ResourceNotFoundException("No existe una carga activa para hoy"));
    }

    @Override
    public List<SellerLoadDTO> getLoadHistory(Long sellerId) {
        return sellerLoadRepository.findBySellerIdOrderByLoadDateDesc(sellerId).stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    @Override
    public VendorLoadStatsDTO getTodayStats(Long sellerId) {
        java.util.Optional<SellerLoad> loadOpt = sellerLoadRepository.findActiveBySellerIdAndLoadDate(sellerId, LocalDate.now());
        if (loadOpt.isEmpty()) {
            return VendorLoadStatsDTO.builder()
                .totalLoaded(BigDecimal.ZERO)
                .totalDelivered(BigDecimal.ZERO)
                .totalRemaining(BigDecimal.ZERO)
                .totalRejected(BigDecimal.ZERO)
                .build();
        }
        return calculateStats(loadOpt.get());
    }

    @Override
    public List<AdminLoadReportDTO> getAdminReport(LocalDate date) {
        List<User> deliveryPeople = userRepository.findAll().stream()
            .filter(u -> "DOMICILIARIO".equalsIgnoreCase(u.getRole()))
            .collect(Collectors.toList());

        return deliveryPeople.stream().map(dp -> {
            SellerLoadDTO loadDTO = null;
            VendorLoadStatsDTO statsDTO = null;

            java.util.Optional<SellerLoad> loadOpt = sellerLoadRepository.findActiveBySellerIdAndLoadDate(dp.getId(), date);
            if (loadOpt.isPresent()) {
                SellerLoad load = loadOpt.get();
                loadDTO = toDTO(load);
                statsDTO = calculateStats(load);
            } else {
                statsDTO = VendorLoadStatsDTO.builder()
                    .totalLoaded(BigDecimal.ZERO)
                    .totalDelivered(BigDecimal.ZERO)
                    .totalRemaining(BigDecimal.ZERO)
                    .totalRejected(BigDecimal.ZERO)
                    .build();
            }

            Long deliveredCustomers = orderRepository.countDistinctDeliveredCustomersByDateAndDeliveryPerson(date, dp.getId());
            Long rejectedCustomers = orderRejectionRepository.countDistinctCustomersByDateAndDeliveryPerson(date, dp.getId());
            Long deliveredOrders = (long) orderRepository.findDeliveredByDateAndDeliveryPersonId(date, dp.getId()).size();
            Long rejectedOrders = orderRejectionRepository.countByDateAndDeliveryPerson(date, dp.getId());
            Long totalOrders = (long) orderRepository.findByDateAndDeliveryPersonId(date, dp.getId()).size();

            return AdminLoadReportDTO.builder()
                .sellerId(dp.getId())
                .sellerUsername(dp.getUsername())
                .load(loadDTO)
                .stats(statsDTO)
                .deliveredCustomers(deliveredCustomers != null ? deliveredCustomers : 0L)
                .rejectedCustomers(rejectedCustomers != null ? rejectedCustomers : 0L)
                .deliveredOrders(deliveredOrders)
                .rejectedOrders(rejectedOrders)
                .totalOrders(totalOrders)
                .build();
        }).collect(Collectors.toList());
    }

    private VendorLoadStatsDTO calculateStats(SellerLoad load) {
        BigDecimal totalLoaded = BigDecimal.ZERO;
        BigDecimal totalDelivered = BigDecimal.ZERO;
        BigDecimal totalRejected = BigDecimal.ZERO;

        for (SellerLoadItem item : load.getItems()) {
            // quantityLoaded is available stock; original total = available + delivered + rejected
            BigDecimal originalLoaded = item.getQuantityLoaded().add(item.getQuantityDelivered()).add(item.getQuantityRejected());
            totalLoaded = totalLoaded.add(originalLoaded);
            totalDelivered = totalDelivered.add(item.getQuantityDelivered());
            totalRejected = totalRejected.add(item.getQuantityRejected());
        }

        BigDecimal dozen = BigDecimal.valueOf(12);
        BigDecimal loadedDozens = totalLoaded.divide(dozen, 3, RoundingMode.HALF_UP);
        BigDecimal deliveredDozens = totalDelivered.divide(dozen, 3, RoundingMode.HALF_UP);
        BigDecimal rejectedDozens = totalRejected.divide(dozen, 3, RoundingMode.HALF_UP);
        BigDecimal remainingDozens = loadedDozens.subtract(deliveredDozens).subtract(rejectedDozens);

        return VendorLoadStatsDTO.builder()
            .totalLoaded(loadedDozens)
            .totalDelivered(deliveredDozens)
            .totalRemaining(remainingDozens.max(BigDecimal.ZERO))
            .totalRejected(rejectedDozens)
            .build();
    }

    private SellerLoadDTO toDTO(SellerLoad load) {
        return SellerLoadDTO.builder()
            .id(load.getId())
            .sellerId(load.getSeller().getId())
            .sellerName(load.getSeller().getUsername())
            .loadDate(load.getLoadDate().toString())
            .status(load.getStatus())
            .items(load.getItems().stream().map(this::toDTO).collect(Collectors.toList()))
            .build();
    }

    private SellerLoadItemDTO toDTO(SellerLoadItem item) {
        BigDecimal original = item.getQuantityLoaded().add(item.getQuantityDelivered()).add(item.getQuantityRejected());
        return SellerLoadItemDTO.builder()
            .id(item.getId())
            .productId(item.getProduct().getId())
            .productName(item.getProduct().getName())
            .quantityLoaded(item.getQuantityLoaded())
            .quantityDelivered(item.getQuantityDelivered())
            .quantityRejected(item.getQuantityRejected())
            .originalQuantityLoaded(original)
            .unitOfMeasure(item.getUnitOfMeasure().name())
            .build();
    }

    @Override
    @Transactional
    public void removeOrderFromLoad(Long orderId) {
        Order order = orderRepository.findByIdWithItems(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Pedido no encontrado con id: " + orderId));

        if (order.getDeliveryPerson() == null) {
            System.out.println("[DEBUG] removeOrderFromLoad: order " + orderId + " has no delivery person, skipping");
            return;
        }

        Long sellerId = order.getDeliveryPerson().getId();
        System.out.println("[DEBUG] removeOrderFromLoad: order=" + orderId + " seller=" + sellerId + " status=" + order.getStatus());

        // Search ALL loads for this delivery person, not just today's
        List<SellerLoad> allLoads = sellerLoadRepository.findBySellerId(sellerId);
        System.out.println("[DEBUG] removeOrderFromLoad: found " + allLoads.size() + " loads for seller " + sellerId);
        OrderStatus status = order.getStatus();
        for (OrderItem orderItem : order.getItems()) {
            if (orderItem.getProduct() != null) {
                int qty = orderItem.getQuantity() * piecesPerUnit(orderItem.getProduct());
                BigDecimal qtyBd = BigDecimal.valueOf(qty);
                for (SellerLoad load : allLoads) {
                    SellerLoadItem loadItem = findLoadItemByProduct(load, orderItem.getProduct().getId());
                    if (loadItem != null) {
                        System.out.println("[DEBUG] removeOrderFromLoad: BEFORE product=" + orderItem.getProduct().getName() + " loadDate=" + load.getLoadDate() + " loaded=" + loadItem.getQuantityLoaded() + " delivered=" + loadItem.getQuantityDelivered() + " rejected=" + loadItem.getQuantityRejected() + " subtract=" + qtyBd);
                        if (status == OrderStatus.PENDIENTE || status == OrderStatus.EN_PREPARACION) {
                            loadItem.setQuantityLoaded(loadItem.getQuantityLoaded().subtract(qtyBd).max(BigDecimal.ZERO));
                        } else if (status == OrderStatus.ENTREGADO) {
                            loadItem.setQuantityDelivered(loadItem.getQuantityDelivered().subtract(qtyBd).max(BigDecimal.ZERO));
                        } else if (status == OrderStatus.RECHAZADO) {
                            loadItem.setQuantityRejected(loadItem.getQuantityRejected().subtract(qtyBd).max(BigDecimal.ZERO));
                        }
                        System.out.println("[DEBUG] removeOrderFromLoad: AFTER product=" + orderItem.getProduct().getName() + " loaded=" + loadItem.getQuantityLoaded() + " delivered=" + loadItem.getQuantityDelivered() + " rejected=" + loadItem.getQuantityRejected());
                        if (loadItem.getQuantityLoaded().compareTo(BigDecimal.ZERO) == 0
                            && loadItem.getQuantityDelivered().compareTo(BigDecimal.ZERO) == 0
                            && loadItem.getQuantityRejected().compareTo(BigDecimal.ZERO) == 0) {
                            System.out.println("[DEBUG] removeOrderFromLoad: DELETING item " + loadItem.getId());
                            load.getItems().remove(loadItem);
                            sellerLoadItemRepository.delete(loadItem);
                        } else {
                            sellerLoadItemRepository.save(loadItem);
                        }
                    } else {
                        System.out.println("[DEBUG] removeOrderFromLoad: loadItem not found for product=" + orderItem.getProduct().getName() + " in loadDate=" + load.getLoadDate());
                    }
                }
            } else if (orderItem.getOffer() != null) {
                Offer fullOffer = offerRepository.findByIdWithItems(orderItem.getOffer().getId()).orElse(null);
                if (fullOffer != null) {
                    for (OfferItem offerItem : fullOffer.getItems()) {
                        int totalQty = offerItem.getQuantity() * orderItem.getQuantity() * piecesPerUnit(offerItem.getProduct());
                        BigDecimal qtyBd = BigDecimal.valueOf(totalQty);
                        for (SellerLoad load : allLoads) {
                            SellerLoadItem loadItem = findLoadItemByProduct(load, offerItem.getProduct().getId());
                            if (loadItem != null) {
                                if (status == OrderStatus.PENDIENTE || status == OrderStatus.EN_PREPARACION) {
                                    loadItem.setQuantityLoaded(loadItem.getQuantityLoaded().subtract(qtyBd).max(BigDecimal.ZERO));
                                } else if (status == OrderStatus.ENTREGADO) {
                                    loadItem.setQuantityDelivered(loadItem.getQuantityDelivered().subtract(qtyBd).max(BigDecimal.ZERO));
                                } else if (status == OrderStatus.RECHAZADO) {
                                    loadItem.setQuantityRejected(loadItem.getQuantityRejected().subtract(qtyBd).max(BigDecimal.ZERO));
                                }
                                if (loadItem.getQuantityLoaded().compareTo(BigDecimal.ZERO) == 0
                                    && loadItem.getQuantityDelivered().compareTo(BigDecimal.ZERO) == 0
                                    && loadItem.getQuantityRejected().compareTo(BigDecimal.ZERO) == 0) {
                                    load.getItems().remove(loadItem);
                                    sellerLoadItemRepository.delete(loadItem);
                                } else {
                                    sellerLoadItemRepository.save(loadItem);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    @Override
    @Transactional
    public void deleteLoadBySellerAndDate(Long sellerId, LocalDate date) {
        List<SellerLoad> loads = sellerLoadRepository.findBySellerIdAndLoadDate(sellerId, date);
        if (loads.isEmpty()) {
            throw new ResourceNotFoundException("No existe cargue para el domiciliario en la fecha indicada");
        }
        for (SellerLoad load : loads) {
            sellerLoadRepository.delete(load);
        }
    }
}
