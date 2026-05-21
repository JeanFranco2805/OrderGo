package com.productservice.ordergo.service.impl;

import com.productservice.ordergo.service.WhatsAppService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.util.*;

@Service
public class WhatsAppServiceImpl implements WhatsAppService {

    @Value("${whatsapp.bridge.url:http://localhost:3001}")
    private String bridgeUrl;

    @Value("${whatsapp.python.executable:py}")
    private String pythonExecutable;

    @Value("${whatsapp.fallback.script:scripts/whatsapp_sender.py}")
    private String fallbackScript;

    private final RestTemplate restTemplate;

    public WhatsAppServiceImpl() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000);
        factory.setReadTimeout(8000);
        this.restTemplate = new RestTemplate(factory);
    }

    @Override
    public Map<String, Object> sendMessage(String phone, String message) {
        Map<String, Object> result = new LinkedHashMap<>();
        String normalizedPhone = normalizePhone(phone);

        // 1) Try bridge first
        try {
            String url = bridgeUrl + "/send";
            Map<String, String> body = new HashMap<>();
            body.put("phone", normalizedPhone);
            body.put("message", message);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, String>> entity = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            if (response.getStatusCode().is2xxSuccessful()) {
                result.put("success", true);
                result.put("channel", "bridge");
                result.put("phone", normalizedPhone);
                return result;
            }
        } catch (ResourceAccessException ex) {
            // Bridge not reachable, will try fallback
        } catch (Exception ex) {
            // Bridge error, will try fallback
        }

        // 2) Fallback to Python script
        try {
            File script = new File(fallbackScript);
            if (!script.exists()) {
                result.put("success", false);
                result.put("error", "WhatsApp Bridge no está disponible (" + bridgeUrl + ") y no se encontró el script fallback: " + fallbackScript + ". Por favor inicia el bridge con: node whatsapp-bridge/server.js");
                return result;
            }

            ProcessBuilder pb = new ProcessBuilder(pythonExecutable, fallbackScript, normalizedPhone, message);
            pb.redirectErrorStream(true);
            Process process = pb.start();

            boolean finished = process.waitFor(30, java.util.concurrent.TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                result.put("success", false);
                result.put("error", "El script de envío tardó demasiado y fue cancelado.");
                return result;
            }

            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                StringBuilder output = new StringBuilder();
                while ((line = reader.readLine()) != null) {
                    output.append(line).append("\n");
                }
                String out = output.toString().trim();
                String outLower = out.toLowerCase();
                if (process.exitValue() == 0 && (outLower.contains("success") || outLower.contains("[ok]") || outLower.contains("mensaje enviado"))) {
                    result.put("success", true);
                    result.put("channel", "python_script");
                    result.put("phone", normalizedPhone);
                    return result;
                }
                result.put("success", false);
                result.put("error", "Script fallback falló: " + out);
                return result;
            }
        } catch (Exception ex) {
            result.put("success", false);
            result.put("error", "WhatsApp Bridge no disponible y fallback falló: " + ex.getMessage());
            return result;
        }
    }

    @Override
    public Map<String, Object> sendBatch(List<Map<String, String>> messages) {
        Map<String, Object> result = new LinkedHashMap<>();
        int sent = 0;
        int failed = 0;
        List<String> errors = new ArrayList<>();

        for (Map<String, String> msg : messages) {
            Map<String, Object> r = sendMessage(msg.get("phone"), msg.get("message"));
            if (Boolean.TRUE.equals(r.get("success"))) {
                sent++;
            } else {
                failed++;
                errors.add(msg.get("phone") + ": " + r.get("error"));
            }
        }

        result.put("success", failed == 0);
        result.put("sent", sent);
        result.put("failed", failed);
        result.put("total", messages.size());
        if (!errors.isEmpty()) {
            result.put("errors", errors);
        }
        return result;
    }

    @Override
    public boolean isBridgeReady() {
        try {
            String url = bridgeUrl + "/status";
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            return response.getStatusCode().is2xxSuccessful();
        } catch (Exception ex) {
            return false;
        }
    }

    private String normalizePhone(String phone) {
        if (phone == null) return "";
        String p = phone.replaceAll("[^0-9]", "");
        if (!p.startsWith("57") && p.length() == 10) {
            p = "57" + p;
        }
        return p;
    }
}
