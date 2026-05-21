package com.productservice.ordergo.service;

import java.util.Map;

public interface WhatsAppService {
    Map<String, Object> sendMessage(String phone, String message);
    Map<String, Object> sendBatch(java.util.List<Map<String, String>> messages);
    boolean isBridgeReady();
}
