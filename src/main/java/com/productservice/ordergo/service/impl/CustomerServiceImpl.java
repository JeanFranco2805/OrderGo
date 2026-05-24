package com.productservice.ordergo.service.impl;

import com.productservice.ordergo.dto.CustomerDTO;
import com.productservice.ordergo.dto.CustomerLocationDTO;
import com.productservice.ordergo.entity.Customer;
import com.productservice.ordergo.exception.ResourceNotFoundException;
import com.productservice.ordergo.repository.CustomerRepository;
import com.productservice.ordergo.service.CustomerService;
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
public class CustomerServiceImpl implements CustomerService {

    private final CustomerRepository customerRepository;
    private final com.productservice.ordergo.repository.OrderRepository orderRepository;
    private final com.productservice.ordergo.repository.UserRepository userRepository;
    private final com.productservice.ordergo.repository.InvoiceRepository invoiceRepository;
    private final com.productservice.ordergo.repository.OrderRejectionRepository orderRejectionRepository;

    @Override
    public List<CustomerDTO> findAll() {
        return customerRepository.findAll().stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    @Override
    public CustomerDTO findById(Long id) {
        Customer customer = customerRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado con id: " + id));
        return toDTO(customer);
    }

    @Override
    public List<CustomerDTO> search(String name) {
        if (name == null || name.isBlank()) return findAll();
        return customerRepository.findByNameContainingIgnoreCase(name)
            .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public Page<CustomerDTO> findAll(Pageable pageable) {
        return customerRepository.findAll(pageable).map(this::toDTO);
    }

    @Override
    public Page<CustomerDTO> search(String name, Pageable pageable) {
        if (name == null || name.isBlank()) return findAll(pageable);
        return customerRepository.findByNameContainingIgnoreCase(name, pageable).map(this::toDTO);
    }

    @Override
    @Transactional
    public CustomerDTO create(CustomerDTO dto) {
        Customer customer = toEntity(dto);
        return toDTO(customerRepository.save(customer));
    }

    @Override
    @Transactional
    public CustomerDTO update(Long id, CustomerDTO dto) {
        Customer existing = customerRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado con id: " + id));
        existing.setName(dto.getName());
        existing.setEmail(dto.getEmail());
        existing.setPhone(dto.getPhone());
        existing.setAddress(dto.getAddress());
        existing.setAddressLabel(dto.getAddressLabel());
        existing.setLatitude(dto.getLatitude());
        existing.setLongitude(dto.getLongitude());
        existing.setVisitDay(dto.getVisitDay());
        existing.setZone(dto.getZone());
        existing.setVisitFrequency(dto.getVisitFrequency());

        if (dto.getSellerId() != null) {
            com.productservice.ordergo.entity.User seller = userRepository.findById(dto.getSellerId())
                .orElseThrow(() -> new ResourceNotFoundException("Vendedor no encontrado con id: " + dto.getSellerId()));
            existing.setSeller(seller);
        } else {
            existing.setSeller(null);
        }

        Customer saved = customerRepository.save(existing);

        // Sync deliveryAddress (addressLabel) on all orders of this customer
        List<com.productservice.ordergo.entity.Order> orders = orderRepository.findByCustomerId(id);
        for (com.productservice.ordergo.entity.Order order : orders) {
            String label = saved.getAddressLabel() != null ? saved.getAddressLabel() : saved.getAddress();
            order.setDeliveryAddress(label);
        }
        if (!orders.isEmpty()) {
            orderRepository.saveAll(orders);
        }

        return toDTO(saved);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!customerRepository.existsById(id)) {
            throw new ResourceNotFoundException("Cliente no encontrado con id: " + id);
        }
        // Desvincular el cliente de pedidos, facturas y rechazos (conserva el historial)
        orderRepository.unlinkByCustomerId(id);
        invoiceRepository.unlinkByCustomerId(id);
        orderRejectionRepository.unlinkByCustomerId(id);
        customerRepository.deleteById(id);
    }

    @Override
    @Transactional
    public void forceDelete(Long id) {
        if (!customerRepository.existsById(id)) {
            throw new ResourceNotFoundException("Cliente no encontrado con id: " + id);
        }
        // Borrar en cascada todas las entidades dependientes
        orderRejectionRepository.deleteByCustomerId(id);
        invoiceRepository.deleteByCustomerId(id);
        orderRepository.deleteByCustomerId(id);
        customerRepository.deleteById(id);
    }

    @Override
    public List<CustomerDTO> findBySellerId(Long sellerId) {
        return customerRepository.findBySellerId(sellerId).stream()
            .map(this::toDTO).collect(Collectors.toList());
    }

    private CustomerDTO toDTO(Customer c) {
        CustomerDTO.CustomerDTOBuilder builder = CustomerDTO.builder()
            .id(c.getId())
            .name(c.getName())
            .email(c.getEmail())
            .phone(c.getPhone())
            .address(c.getAddress())
            .addressLabel(c.getAddressLabel())
            .latitude(c.getLatitude())
            .longitude(c.getLongitude())
            .visitDay(c.getVisitDay())
            .zone(c.getZone())
            .visitFrequency(c.getVisitFrequency());
        if (c.getSeller() != null) {
            builder.sellerId(c.getSeller().getId());
            builder.sellerName(c.getSeller().getUsername());
        }
        return builder.build();
    }

    private Customer toEntity(CustomerDTO dto) {
        Customer.CustomerBuilder builder = Customer.builder()
            .name(dto.getName())
            .email(dto.getEmail())
            .phone(dto.getPhone())
            .address(dto.getAddress())
            .addressLabel(dto.getAddressLabel())
            .latitude(dto.getLatitude())
            .longitude(dto.getLongitude())
            .visitDay(dto.getVisitDay())
            .zone(dto.getZone())
            .visitFrequency(dto.getVisitFrequency());
        if (dto.getSellerId() != null) {
            com.productservice.ordergo.entity.User seller = userRepository.findById(dto.getSellerId()).orElse(null);
            builder.seller(seller);
        }
        return builder.build();
    }

    @Override
    @Transactional
    public CustomerDTO updateLocation(Long id, CustomerLocationDTO dto) {
        Customer existing = customerRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado con id: " + id));
        if (dto.getAddress() != null) {
            existing.setAddress(dto.getAddress());
        }
        if (dto.getLatitude() != null) {
            existing.setLatitude(dto.getLatitude());
        }
        if (dto.getLongitude() != null) {
            existing.setLongitude(dto.getLongitude());
        }
        Customer saved = customerRepository.save(existing);

        // Sync deliveryAddress (addressLabel), latitude, longitude on pending orders of this customer
        List<com.productservice.ordergo.entity.Order> orders = orderRepository.findByCustomerId(id);
        for (com.productservice.ordergo.entity.Order order : orders) {
            if (order.getStatus() == com.productservice.ordergo.entity.OrderStatus.PENDIENTE ||
                order.getStatus() == com.productservice.ordergo.entity.OrderStatus.EN_PREPARACION) {
                if (dto.getAddress() != null) {
                    String label = saved.getAddressLabel() != null ? saved.getAddressLabel() : saved.getAddress();
                    order.setDeliveryAddress(label);
                }
                if (dto.getLatitude() != null) {
                    order.setLatitude(dto.getLatitude());
                }
                if (dto.getLongitude() != null) {
                    order.setLongitude(dto.getLongitude());
                }
            }
        }
        if (!orders.isEmpty()) {
            orderRepository.saveAll(orders);
        }

        return toDTO(saved);
    }
}
