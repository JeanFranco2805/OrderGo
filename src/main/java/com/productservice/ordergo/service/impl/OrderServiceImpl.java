package com.productservice.ordergo.service.impl;

import com.productservice.ordergo.dto.OrderDTO;
import com.productservice.ordergo.dto.OrderItemDTO;
import com.productservice.ordergo.dto.OrderUpdateDTO;
import com.productservice.ordergo.entity.*;
import com.productservice.ordergo.exception.BusinessException;
import com.productservice.ordergo.exception.ResourceNotFoundException;
import com.productservice.ordergo.repository.CustomerRepository;
import com.productservice.ordergo.repository.OrderItemRepository;
import com.productservice.ordergo.repository.OrderRepository;
import com.productservice.ordergo.repository.ProductRepository;
import com.productservice.ordergo.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;
    private final OrderItemRepository orderItemRepository;
    private final com.productservice.ordergo.repository.InventoryItemRepository inventoryItemRepository;
    private final com.productservice.ordergo.repository.OfferRepository offerRepository;
    private final com.productservice.ordergo.repository.InvoiceRepository invoiceRepository;
    private final com.productservice.ordergo.repository.UserRepository userRepository;

    @Override
    public List<OrderDTO> findAll() {
        return orderRepository.findAll().stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    @Override
    public OrderDTO findById(Long id) {
        Order order = orderRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Pedido no encontrado con id: " + id));
        return toDTO(order);
    }

    @Override
    public List<OrderDTO> search(String query) {
        if (query == null || query.isBlank()) return findAll();
        return orderRepository.findByOrderNumberContainingIgnoreCaseOrCustomer_NameContainingIgnoreCase(query, query)
            .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public Page<OrderDTO> findAll(Pageable pageable) {
        return orderRepository.findAll(pageable).map(this::toDTO);
    }

    @Override
    public List<OrderDTO> findPendingDeliveries() {
        return orderRepository.findByStatusInAndDeliveryAddressIsNotNull(
            java.util.Arrays.asList(OrderStatus.PENDIENTE, OrderStatus.EN_PREPARACION)
        ).stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public Page<OrderDTO> search(String query, Pageable pageable) {
        if (query == null || query.isBlank()) return findAll(pageable);
        return orderRepository.findByOrderNumberContainingIgnoreCaseOrCustomer_NameContainingIgnoreCase(query, query, pageable)
            .map(this::toDTO);
    }

    @Override
    @Transactional
    public OrderDTO create(OrderDTO dto) {
        Customer customer = customerRepository.findById(dto.getCustomerId())
            .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado con id: " + dto.getCustomerId()));

        User seller = resolveAuthenticatedSeller();

        Order order = Order.builder()
            .orderNumber("ORD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
            .customer(customer)
            .status(OrderStatus.PENDIENTE)
            .totalAmount(BigDecimal.ZERO)
            .deliveryAddress(customer.getAddress())
            .paymentMethod(dto.getPaymentMethod())
            .seller(seller)
            .items(new ArrayList<>())
            .build();

        BigDecimal total = BigDecimal.ZERO;
        for (OrderItemDTO itemDTO : dto.getItems()) {
            if (itemDTO.getProductId() != null) {
                Product product = productRepository.findById(itemDTO.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado con id: " + itemDTO.getProductId()));

                if (product.getStock() < itemDTO.getQuantity()) {
                    throw new BusinessException("Stock insuficiente para el producto: " + product.getName());
                }

                BigDecimal subtotal = product.getPrice().multiply(BigDecimal.valueOf(itemDTO.getQuantity()));
                OrderItem item = OrderItem.builder()
                    .order(order)
                    .product(product)
                    .productName(product.getName())
                    .quantity(itemDTO.getQuantity())
                    .unitPrice(product.getPrice())
                    .subtotal(subtotal)
                    .build();

                order.getItems().add(item);
                total = total.add(subtotal);
            } else if (itemDTO.getOfferId() != null) {
                Offer offer = offerRepository.findById(itemDTO.getOfferId())
                    .orElseThrow(() -> new ResourceNotFoundException("Oferta no encontrada con id: " + itemDTO.getOfferId()));

                if (!Boolean.TRUE.equals(offer.getActive())) {
                    throw new BusinessException("La oferta no está activa: " + offer.getName());
                }

                // Validate stock for all products in the offer
                for (OfferItem oi : offer.getItems()) {
                    Product p = oi.getProduct();
                    int needed = oi.getQuantity() * itemDTO.getQuantity();
                    if (p.getStock() < needed) {
                        throw new BusinessException("Stock insuficiente para el producto '" + p.getName() + "' en la oferta '" + offer.getName() + "' (necesita " + needed + ", disponible " + p.getStock() + ")");
                    }
                }

                BigDecimal subtotal = offer.getPrice().multiply(BigDecimal.valueOf(itemDTO.getQuantity()));
                OrderItem item = OrderItem.builder()
                    .order(order)
                    .offer(offer)
                    .offerName(offer.getName())
                    .quantity(itemDTO.getQuantity())
                    .unitPrice(offer.getPrice())
                    .subtotal(subtotal)
                    .build();

                order.getItems().add(item);
                total = total.add(subtotal);
            } else {
                throw new BusinessException("Cada item debe tener un producto o una oferta");
            }
        }

        order.setTotalAmount(total);
        order = orderRepository.save(order); // cascade saves items too

        // Reserve stock immediately on creation (PENDIENTE)
        deductStock(order);

        return toDTO(order);
    }

    @Override
    @Transactional
    public OrderDTO update(Long id, OrderUpdateDTO dto) {
        Order order = orderRepository.findByIdWithItems(id)
            .orElseThrow(() -> new ResourceNotFoundException("Pedido no encontrado con id: " + id));

        OrderStatus oldStatus = order.getStatus();

        if (dto.getCustomerId() != null) {
            Customer customer = customerRepository.findById(dto.getCustomerId())
                .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado con id: " + dto.getCustomerId()));
            order.setCustomer(customer);
            order.setDeliveryAddress(customer.getAddress());
        }
        if (dto.getStatus() != null) {
            order.setStatus(dto.getStatus());
        }
        if (dto.getPaymentMethod() != null) {
            order.setPaymentMethod(dto.getPaymentMethod());
        }

        OrderStatus newStatus = order.getStatus();
        handleStockOnStatusChange(order, oldStatus, newStatus);

        return toDTO(orderRepository.save(order));
    }

    @Override
    @Transactional
    public OrderDTO updateStatus(Long id, String status) {
        Order order = orderRepository.findByIdWithItems(id)
            .orElseThrow(() -> new ResourceNotFoundException("Pedido no encontrado con id: " + id));
        OrderStatus newStatus = OrderStatus.valueOf(status);
        OrderStatus oldStatus = order.getStatus();

        handleStockOnStatusChange(order, oldStatus, newStatus);

        order.setStatus(newStatus);
        return toDTO(orderRepository.save(order));
    }

    private boolean shouldReserveStock(OrderStatus status) {
        return status == OrderStatus.PENDIENTE || status == OrderStatus.EN_PREPARACION || status == OrderStatus.ENTREGADO;
    }

    private void handleStockOnStatusChange(Order order, OrderStatus oldStatus, OrderStatus newStatus) {
        boolean oldReserves = shouldReserveStock(oldStatus);
        boolean newReserves = shouldReserveStock(newStatus);
        if (!oldReserves && newReserves) {
            deductStock(order);
        } else if (oldReserves && !newReserves) {
            restoreStock(order);
        }
    }

    private void deductStock(Order order) {
        for (OrderItem item : order.getItems()) {
            if (item.getProduct() != null) {
                Product product = item.getProduct();
                product.setStock(product.getStock() - item.getQuantity());
                productRepository.save(product);

                if (product.getInventoryItem() != null) {
                    com.productservice.ordergo.entity.InventoryItem invItem = product.getInventoryItem();
                    double newQty = invItem.getQuantity() - item.getQuantity();
                    invItem.setQuantity(Math.max(newQty, 0));
                    inventoryItemRepository.save(invItem);
                }
            } else if (item.getOffer() != null) {
                for (OfferItem oi : item.getOffer().getItems()) {
                    Product product = oi.getProduct();
                    int qty = oi.getQuantity() * item.getQuantity();
                    product.setStock(product.getStock() - qty);
                    productRepository.save(product);

                    if (product.getInventoryItem() != null) {
                        com.productservice.ordergo.entity.InventoryItem invItem = product.getInventoryItem();
                        double newQty = invItem.getQuantity() - qty;
                        invItem.setQuantity(Math.max(newQty, 0));
                        inventoryItemRepository.save(invItem);
                    }
                }
            }
        }
    }

    private void restoreStock(Order order) {
        for (OrderItem item : order.getItems()) {
            if (item.getProduct() != null) {
                Product product = item.getProduct();
                product.setStock(product.getStock() + item.getQuantity());
                productRepository.save(product);

                if (product.getInventoryItem() != null) {
                    com.productservice.ordergo.entity.InventoryItem invItem = product.getInventoryItem();
                    invItem.setQuantity(invItem.getQuantity() + item.getQuantity());
                    inventoryItemRepository.save(invItem);
                }
            } else if (item.getOffer() != null) {
                for (OfferItem oi : item.getOffer().getItems()) {
                    Product product = oi.getProduct();
                    int qty = oi.getQuantity() * item.getQuantity();
                    product.setStock(product.getStock() + qty);
                    productRepository.save(product);

                    if (product.getInventoryItem() != null) {
                        com.productservice.ordergo.entity.InventoryItem invItem = product.getInventoryItem();
                        invItem.setQuantity(invItem.getQuantity() + qty);
                        inventoryItemRepository.save(invItem);
                    }
                }
            }
        }
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Order order = orderRepository.findByIdWithItems(id)
            .orElseThrow(() -> new ResourceNotFoundException("Pedido no encontrado con id: " + id));
        if (shouldReserveStock(order.getStatus())) {
            restoreStock(order);
        }
        orderRepository.delete(order);
    }

    @Override
    @Transactional
    public void forceDelete(Long id) {
        Order order = orderRepository.findByIdWithItems(id)
            .orElseThrow(() -> new ResourceNotFoundException("Pedido no encontrado con id: " + id));
        if (shouldReserveStock(order.getStatus())) {
            restoreStock(order);
        }
        // Desvincular facturas vinculadas a este pedido
        invoiceRepository.unlinkByOrderId(id);
        // Los order_items se borran automáticamente por cascade ALL
        orderRepository.delete(order);
    }

    private User resolveAuthenticatedSeller() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return null;
        }
        String username = auth.getName();
        return userRepository.findByUsername(username).orElse(null);
    }

    private OrderDTO toDTO(Order order) {
        OrderDTO.OrderDTOBuilder builder = OrderDTO.builder()
            .id(order.getId())
            .orderNumber(order.getOrderNumber())
            .customerId(order.getCustomer().getId())
            .customerName(order.getCustomer().getName())
            .customerPhone(order.getCustomer().getPhone())
            .status(order.getStatus())
            .totalAmount(order.getTotalAmount())
            .deliveryAddress(order.getDeliveryAddress())
            .paymentMethod(order.getPaymentMethod())
            .items(order.getItems().stream().map(item -> {
                OrderItemDTO.OrderItemDTOBuilder itemBuilder = OrderItemDTO.builder()
                    .id(item.getId())
                    .quantity(item.getQuantity())
                    .unitPrice(item.getUnitPrice())
                    .subtotal(item.getSubtotal());
                // Use snapshot names so deleted products/offers still show in historical orders
                if (item.getProduct() != null) {
                    itemBuilder.productId(item.getProduct().getId());
                }
                itemBuilder.productName(item.getProductName());
                if (item.getOffer() != null) {
                    itemBuilder.offerId(item.getOffer().getId());
                }
                itemBuilder.offerName(item.getOfferName());
                return itemBuilder.build();
            }).collect(Collectors.toList()));
        if (order.getSeller() != null) {
            builder.sellerId(order.getSeller().getId());
            builder.sellerName(order.getSeller().getUsername());
        }
        return builder.build();
    }
}
