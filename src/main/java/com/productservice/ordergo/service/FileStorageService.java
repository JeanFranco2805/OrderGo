package com.productservice.ordergo.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
public class FileStorageService {

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    private static final int MAX_WIDTH = 1200;
    private static final Set<String> ALLOWED_TYPES = Set.of("image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp");

    public String storeImage(MultipartFile file, String subFolder) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("El archivo está vacío");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType.toLowerCase())) {
            throw new IllegalArgumentException("Formato de imagen no soportado. Use JPG, PNG, WEBP, GIF o BMP.");
        }

        try {
            Path targetDir = Paths.get(uploadDir, subFolder);
            if (!Files.exists(targetDir)) {
                Files.createDirectories(targetDir);
            }

            boolean isWebp = "image/webp".equalsIgnoreCase(contentType);
            String filename = UUID.randomUUID().toString() + (isWebp ? ".webp" : ".jpg");
            Path targetPath = targetDir.resolve(filename);

            if (isWebp) {
                // Java's ImageIO doesn't support WEBP natively; save as-is
                Files.copy(file.getInputStream(), targetPath);
            } else {
                BufferedImage originalImage = ImageIO.read(file.getInputStream());
                if (originalImage == null) {
                    throw new IllegalArgumentException("No se pudo leer la imagen");
                }
                BufferedImage resizedImage = resizeAndConvertToRgb(originalImage, MAX_WIDTH);
                ImageIO.write(resizedImage, "jpg", targetPath.toFile());
            }

            log.info("Imagen guardada: {}", targetPath);
            return "/uploads/" + subFolder + "/" + filename;
        } catch (IOException e) {
            log.error("Error guardando imagen", e);
            throw new RuntimeException("Error al guardar la imagen: " + e.getMessage());
        }
    }

    private BufferedImage resizeAndConvertToRgb(BufferedImage original, int maxWidth) {
        int w = original.getWidth();
        int h = original.getHeight();
        int newW = w;
        int newH = h;

        if (w > maxWidth) {
            newW = maxWidth;
            newH = (int) ((double) h * maxWidth / w);
        }

        // Convert to RGB for JPEG output (strips alpha channel if present)
        BufferedImage out = new BufferedImage(newW, newH, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = out.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

        // Fill white background for images with transparency
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, newW, newH);

        g.drawImage(original, 0, 0, newW, newH, null);
        g.dispose();
        return out;
    }
}
