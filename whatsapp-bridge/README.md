# OrderGo WhatsApp Bridge

Microservicio Node.js para enviar mensajes de WhatsApp Web automáticamente desde OrderGo.

## ¿Cómo funciona?

Este bridge usa [`whatsapp-web.js`](https://wppconnect.io/whatsapp-web.js/) con **LocalAuth**, lo que significa que:
- **La primera vez** debes escanear el código QR que aparece en la consola.
- **Las siguientes veces** la sesión se reutiliza automáticamente (no hace falta escanear QR de nuevo).

## Requisitos

- Node.js 18+
- Chrome/Chromium (se descarga automáticamente con Puppeteer)

## Instalación

```bash
cd whatsapp-bridge
npm install
```

## Uso

```bash
npm start
```

El servidor se levanta en `http://localhost:3001`.

## Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/health` | Verifica si el bridge y WhatsApp están listos |
| GET | `/status` | Estado de la conexión de WhatsApp |
| POST | `/send` | Enviar un mensaje a un número |
| POST | `/send-batch` | Enviar múltiples mensajes secuencialmente |

### Ejemplo de envío individual

```json
POST /send
{
  "phone": "573001234567",
  "message": "Hola, este es un mensaje de prueba"
}
```

### Ejemplo de envío masivo

```json
POST /send-batch
{
  "messages": [
    { "phone": "573001234567", "message": "Hola 1" },
    { "phone": "573009876543", "message": "Hola 2" }
  ]
}
```

## Integración con OrderGo

El backend Spring Boot se comunica con este bridge automáticamente. Solo asegúrate de que esté corriendo antes de intentar enviar mensajes.

## Notas importantes

- Entre cada mensaje masivo hay un **delay aleatorio de 2-5 segundos** para evitar que WhatsApp bloquee la cuenta por spam.
- No envíes demasiados mensajes en muy poco tiempo.
- Si cambias de número de WhatsApp, borra la carpeta `.wwebjs_auth/` y vuelve a escanear el QR.
