# Manual de Usuario - OrderGo SweetFlow

## Tabla de Contenidos
1. [Introducción](#1-introducción)
2. [Requisitos Técnicos](#2-requisitos-técnicos)
3. [Instalación y Configuración](#3-instalación-y-configuración)
4. [Arquitectura del Sistema](#4-arquitectura-del-sistema)
5. [Funcionalidades por Módulo](#5-funcionalidades-por-módulo)
6. [Roles y Permisos](#6-roles-y-permisos)
7. [Flujos de Trabajo por Rol](#7-flujos-de-trabajo-por-rol)
8. [Instrucciones Paso a Paso](#8-instrucciones-paso-a-paso)
9. [Consideraciones Importantes](#9-consideraciones-importantes)
10. [Solución de Problemas](#10-solución-de-problemas)

---

## 1. Introducción

**OrderGo SweetFlow** es un sistema ERP completo diseñado para la gestión de reposterías, distribuidores de productos de panadería y negocios similares. El sistema permite administrar de forma integral el ciclo comercial: desde clientes, productos y ofertas, pasando por pedidos, facturación y cobros, hasta la logística de entregas con control de cargue de domiciliarios, mapas de rutas y reportes administrativos.

### Componentes del Sistema
- **Backend (API REST)**: Spring Boot + PostgreSQL + JWT Security
- **Frontend (Interfaz Web)**: React + TypeScript + Vite
- **WhatsApp Bridge**: Microservicio Node.js para envío automático de mensajes

---

## 2. Requisitos Técnicos

### Backend (Spring Boot)
- **Java**: 21
- **Base de datos**: PostgreSQL 14+
- **Puerto por defecto**: `8080`

### Frontend (React)
- **Node.js**: 18+
- **Puerto por defecto**: `5173`

### WhatsApp Bridge
- **Node.js**: 18+
- **Puerto por defecto**: `3001`
- **Requisito adicional**: Chrome/Chromium (se descarga automáticamente con Puppeteer)

### Base de datos
- PostgreSQL con base de datos llamada `ordergo`
- Usuario: `postgres` / Contraseña: `admin123` (configurable en `application.properties`)

---

## 3. Instalación y Configuración

### 3.1 Clonar o ubicar el proyecto
Asegúrate de tener el proyecto en tu equipo. La estructura principal es:
```
OrderGo/
├── src/                        # Código fuente del backend (Java)
├── frontend/                   # Código fuente del frontend (React)
├── whatsapp-bridge/            # Microservicio de WhatsApp (Node.js)
├── uploads/                    # Carpeta de imágenes subidas
├── scripts/                    # Scripts auxiliares (Python)
├── pom.xml                     # Configuración Maven
└── mvnw / mvnw.cmd             # Wrapper de Maven
```

### 3.2 Configurar la base de datos
1. Crear una base de datos llamada `ordergo` en PostgreSQL.
2. Verificar credenciales en `src/main/resources/application.properties`:
   ```properties
   spring.datasource.url=jdbc:postgresql://localhost:5432/ordergo
   spring.datasource.username=postgres
   spring.datasource.password=admin123
   ```
3. El sistema usa `ddl-auto=update`, por lo que las tablas se crean automáticamente al iniciar el backend.

### 3.3 Levantar el Backend
```bash
# En la raíz del proyecto
./mvnw spring-boot:run
```
O en Windows:
```cmd
mvnw.cmd spring-boot:run
```
El backend quedará disponible en `http://localhost:8080`.

### 3.4 Levantar el Frontend
```bash
cd frontend
npm install
npm run dev
```
El frontend quedará disponible en `http://localhost:5173`.

### 3.5 Levantar el Bridge de WhatsApp (Opcional)
```bash
cd whatsapp-bridge
npm install
npm start
```
El bridge quedará en `http://localhost:3001`.

> **Nota importante**: La primera vez que inicias el bridge, debes escanear el código QR que aparece en la consola. Las siguientes veces la sesión se reutiliza automáticamente.

### 3.6 Acceso inicial
El sistema crea automáticamente un usuario administrador:
- **Usuario**: `admin`
- **Contraseña**: `admin123`

---

## 4. Arquitectura del Sistema

### Modelo de Datos Principal

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Users     │────▶│  Customers  │────▶│   Orders    │
│  (Roles)    │     │  (Clientes) │     │  (Pedidos)  │
└─────────────┘     └─────────────┘     └──────┬──────┘
       │                                         │
       │         ┌─────────────┐                 │
       └────────▶│ SellerLoads │◀────────────────┘
                 │  (Cargue)   │
                 └─────────────┘
       
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Products  │◀───▶│  Inventory  │────▶│  Suppliers  │
│  (Ofertas)  │     │   Items     │     │ (Proveed.)  │
└─────────────┘     └─────────────┘     └─────────────┘
       │
       └────────▶ Invoices ────▶ Payments
                   (Facturas)     (Abonos)
```

### Endpoints Base
- **API REST**: `http://localhost:8080/api/v1`
- **Autenticación**: JWT Bearer Token
- **Archivos estáticos**: `http://localhost:8080/uploads/`

---

## 5. Funcionalidades por Módulo

### 5.1 Autenticación y Usuarios

**Descripción**: Gestión de acceso al sistema y administración de usuarios.

**Funcionalidades**:
- Inicio de sesión con JWT (token de seguridad).
- Registro de nuevos usuarios (rol por defecto: **Vendedor**).
- Recuperación de rol y datos del usuario autenticado.
- CRUD completo de usuarios (solo Administrador).
- Asignación de roles: **Administrador**, **Vendedor**, **Domiciliario**.
- Eliminación de usuarios con desvinculación de entidades asociadas.
- Eliminación forzada (física) de usuarios.

**Endpoints principales**:
- `POST /api/v1/auth/login` - Iniciar sesión
- `POST /api/v1/auth/register` - Registrar usuario
- `GET /api/v1/auth/me` - Usuario actual
- `GET/POST/PUT/DELETE /api/v1/users` - Gestión de usuarios

---

### 5.2 Dashboard (Panel de Control)

**Descripción**: Panel de inicio con métricas clave adaptadas al rol del usuario.

**Funcionalidades**:
- **Administrador**:
  - Ventas del mes y acumuladas.
  - Total de pedidos y clientes.
  - Cuentas por cobrar (total de facturas pendientes/parciales).
  - Gráfico de ventas vs gastos mensuales.
  - Distribución de recaudo por método de pago.
- **Vendedor**:
  - Docenas vendidas en el día.
  - Total de pedidos del día.
  - Clientes visitados/atendidos.
  - Acceso rápido al cargue de productos.
- **Domiciliario**:
  - Pedidos pendientes de entrega.
  - Pedidos en preparación.
  - Acceso rápido al mapa de entregas.

---

### 5.3 Clientes

**Descripción**: Gestión completa de la cartera de clientes.

**Funcionalidades**:
- CRUD de clientes con datos de contacto, dirección, zona y geolocalización.
- Campos especiales:
  - **Zona**: Clasificación territorial del cliente.
  - **Día de visita**: Día específico para la ruta del vendedor.
  - **Frecuencia**: Semanal, quincenal o mensual.
  - **Vendedor asignado**: Relación con un usuario del sistema.
  - **Latitud y Longitud**: Para ubicación en mapa.
- Búsqueda y filtrado por nombre, zona, día de visita.
- Paginación de resultados.
- Actualización de ubicación vía mapa interactivo (geocodificación inversa).
- Exportación de listado a Excel.
- **"Mis clientes"**: Los vendedores solo ven los clientes que tienen asignados.

---

### 5.4 Productos

**Descripción**: Catálogo de productos disponibles para la venta.

**Funcionalidades**:
- CRUD de productos con nombre, descripción, precio, stock y categoría.
- Campo `piecesPerUnit`: Define cuántas piezas componen una unidad de venta (ej. 12 piezas = 1 docena).
- **Vinculación con Inventario**: Un producto puede estar asociado a un item de inventario (materia prima).
- Subida de imágenes para cada producto.
- Visualización tipo grid (tarjetas) o lista.
- Control automático de stock al crear pedidos.
- Exportación a Excel.

---

### 5.5 Ofertas (Combos)

**Descripción**: Creación de combos o promociones con varios productos.

**Funcionalidades**:
- Crear ofertas con nombre, precio especial y lista de productos incluidos.
- Activar/desactivar ofertas.
- Subida de imagen para la oferta.
- **Soft Delete**: Las ofertas eliminadas se archivan y pueden restaurarse.
- Visualización de ofertas activas y archivadas.
- Uso directo en la creación de pedidos.

---

### 5.6 Pedidos

**Descripción**: Corazón del sistema. Gestión del ciclo completo de un pedido.

**Funcionalidades**:
- Crear pedido seleccionando cliente, productos y/o ofertas.
- Generación automática de número de orden único (`ORD-XXXX`).
- **Reserva automática de stock**: Al crear un pedido se descuenta stock de productos e inventario vinculado.
- Estados del pedido:
  - `PENDIENTE`: Recién creado.
  - `EN_PREPARACION`: En preparación para entrega.
  - `ENTREGADO`: Entregado al cliente.
  - `CANCELADO`: Cancelado (se restaura el stock).
  - `RECHAZADO`: Rechazado por el cliente (se restaura el stock).
- Asignación de domiciliario al pedido.
- **Carga automática**: Al asignar un domiciliario, los productos se suman a su cargue diario.
- Registro de rechazos parciales por producto.
- Notas de entrega imprimibles (individual y masiva).
- Exportación a Excel.
- Filtros por estado, fecha, cliente y vendedor.

---

### 5.7 Facturación y Pagos

**Descripción**: Gestión de facturas, abonos y cobranza.

**Funcionalidades**:
- Crear facturas independientes o vinculadas a un pedido.
- Cálculo automático de subtotal, impuesto (configurable) y total.
- **Descuentos**: Aplicación de códigos de descuento (porcentaje o monto fijo).
- Estados de factura:
  - `PENDIENTE`: Sin pagos.
  - `PARCIAL`: Con abonos pero incompleta.
  - `PAGADA`: Totalmente cubierta.
- Registro de pagos/abonos sobre una factura.
- **Envío por WhatsApp**:
  - Envío individual de factura.
  - Envío masivo (batch) de múltiples facturas.
  - Mensaje automático con detalle de compra, subtotal, impuesto, total, saldo pendiente.
  - Fallback a `wa.me` en dispositivos móviles si el bridge no está activo.
- Impresión de facturas (individual y masiva).
- Consulta de estado del bridge de WhatsApp.

---

### 5.8 Inventario y Proveedores

**Descripción**: Control de materia prima, compras y stock de insumos.

**Funcionalidades**:
- CRUD de items de inventario (insumos/materia prima).
- Vinculación de items de inventario con productos terminados.
- Registro de compras/gastos de inventario (`InventoryExpense`).
- Historial de compras filtrable por día, mes o año.
- Gestión de proveedores (`Supplier`).
- Items de inventario "no vinculados" a productos.
- Subida de imágenes para items de inventario.
- Control de cantidades en piezas.

---

### 5.9 Domiciliarios y Cargue

**Descripción**: Control logístico de entregas y cargue de productos para domiciliarios.

**Funcionalidades**:
- **Carga diaria**: Cada domiciliario tiene una carga (`SellerLoad`) por día en estado `ACTIVO`.
- Agregar productos al cargue con unidades de medida:
  - `UNIDAD`
  - `DOCENA`
  - `DISPLAY`
  - `CAJA`
- Seguimiento de cantidades:
  - `Cargado`: Lo que se entregó al domiciliario.
  - `Entregado`: Lo que el domiciliario vendió/entregó.
  - `Rechazado`: Lo que el cliente devolvió.
- Rechazos de productos con registro de motivo.
- Hoja de cargue imprimible.
- Historial de cargues del domiciliario.
- **Control de cargue (Admin)**: Panel administrativo para supervisar cargas de todos los domiciliarios, ver rechazos, y reporte de dinero recolectado.

---

### 5.10 Mapas y Rutas

**Descripción**: Visualización geográfica de clientes y pedidos para optimizar entregas.

**Funcionalidades**:
- **Mapa de entregas** (todos los roles):
  - Visualización de pedidos pendientes en mapa interactivo (Leaflet).
  - Clustering de marcadores para zonas densas.
  - Múltiples capas base: OpenStreetMap, Esri, Carto, Google Maps.
  - Geocodificación de direcciones (MapTiler primario, Google Maps fallback, Nominatim como último recurso).
  - Botón "Mi ubicación" para centrar el mapa en la posición actual.
  - Cálculo de distancias y trazado de rutas.
- **Rutas de vendedor** (solo Vendedor):
  - Agenda semanal organizada por día y zona.
  - Acceso rápido a crear pedido con cliente preseleccionado.
- **Ubicación de clientes**: Modal de mapa para actualizar la ubicación exacta de un cliente.

---

### 5.11 Descuentos

**Descripción**: Sistema de cupones y códigos de descuento.

**Funcionalidades**:
- Crear descuentos con código único.
- Tipos de descuento: **Porcentaje** o **Monto fijo**.
- Configurar fechas de vigencia (inicio y fin).
- Límite de usos máximos y contador de usos actuales.
- Validación automática al aplicar en facturas.

---

### 5.12 Métodos de Pago

**Descripción**: Catálogo de formas de pago aceptadas.

**Funcionalidades**:
- CRUD de métodos de pago (ej. Efectivo, Transferencia, Nequi, etc.).
- Uso en el registro de pagos de facturas.
- Reportes de recaudo por método de pago.

---

### 5.13 Reportes

**Descripción**: Panel de reportes y estadísticas administrativas.

**Funcionalidades**:
- Tarjetas de KPIs (indicadores clave de rendimiento).
- Gráfico tipo Donut de recaudo por método de pago.
- Gráfico de ventas vs gastos.
- Ventas por mes (últimos 12 meses).
- Barras de progreso de ventas y gastos mensuales.
- Filtros por día, mes y año.
- Exportación profesional a Excel con estilos (`xlsx-js-style`).

---

### 5.14 Configuración del Negocio

**Descripción**: Ajustes generales del sistema.

**Funcionalidades**:
- Nombre del negocio.
- Correo electrónico.
- Teléfono de contacto.
- Dirección.
- Moneda (`COP`, `USD`, `EUR`).
- Porcentaje de impuesto (ej. IVA).

---

### 5.15 WhatsApp

**Descripción**: Integración para notificaciones automáticas a clientes.

**Funcionalidades**:
- Envío automático de facturas por WhatsApp.
- Normalización de números a formato colombiano (`57XXXXXXXXXX`).
- Mensaje pregenerado con emojis, detalle de compra, totales y saldo.
- Envío individual y masivo (batch).
- Delay aleatorio entre mensajes masivos (2-5 segundos) para evitar bloqueos.
- Fallback a script Python si el bridge Node.js no está disponible.

---

## 6. Roles y Permisos

El sistema tiene tres roles principales:

### 6.1 Administrador (ADMIN)
**Acceso total al sistema.**

| Módulo | Permisos |
|--------|----------|
| Dashboard | Completo (ventas, gastos, métodos de pago, cuentas por cobrar) |
| Productos | Crear, editar, eliminar, forzar eliminación |
| Clientes | Crear, editar, eliminar, forzar eliminación |
| Pedidos | Crear, editar, eliminar, forzar eliminación, facturar, imprimir |
| Facturación | Completo (facturas, pagos, envío WhatsApp) |
| Inventario | Completo (items, gastos, proveedores) |
| Ofertas | Completo (incluyendo restaurar archivadas) |
| Descuentos | Completo |
| Métodos de Pago | Completo |
| Usuarios | Crear, editar, eliminar usuarios |
| Configuración | Completo |
| Mapa de Entregas | Completo |
| Control de Cargue | Completo (todos los domiciliarios) |
| Reportes | Completo |
| Rechazos | Ver todos |

### 6.2 Vendedor (VENDEDOR)
**Enfocado en la venta y atención al cliente.**

| Módulo | Permisos |
|--------|----------|
| Dashboard | Docenas vendidas, pedidos y clientes del día |
| Productos | Ver catálogo, crear, editar (no eliminar) |
| Clientes | Ver mis clientes, crear, editar (no eliminar) |
| Pedidos | Crear, editar, eliminar (no forzar) |
| Ofertas | Ver y usar ofertas activas |
| Mapa de Entregas | Ver pedidos pendientes |
| Rutas de Vendedor | Agenda semanal de clientes |

### 6.3 Domiciliario (DOMICILIARIO)
**Enfocado en la logística de entregas.**

| Módulo | Permisos |
|--------|----------|
| Dashboard | Pedidos pendientes y en preparación |
| Pedidos | Ver pedidos, actualizar estado a entregado/rechazado |
| Mapa de Entregas | Ver rutas y pedidos pendientes |
| Cargue | Gestionar su propia carga diaria |

---

## 7. Flujos de Trabajo por Rol

### 7.1 Flujo del Administrador

```
1. Configuración del Negocio
   └── Ajustar nombre, impuesto, moneda, teléfono.

2. Gestión de Usuarios
   └── Crear vendedores y domiciliarios.

3. Gestión Comercial
   ├── Proveedores → Inventario → Productos → Ofertas
   └── Clientes → Pedidos → Facturación → Cobros

4. Logística
   ├── Mapa de Entregas (supervisar rutas)
   └── Control de Cargue (revisar cargas y rechazos)

5. Análisis
   └── Reportes → Exportar datos
```

### 7.2 Flujo del Vendedor

```
1. Revisar Dashboard
   └── Ver metas del día y docenas vendidas.

2. Revisar Rutas
   └── Agenda semanal → Seleccionar cliente del día.

3. Atención al Cliente
   ├── Buscar cliente o crear nuevo.
   ├── Tomar Pedido (productos + ofertas).
   └── Asignar domiciliario si aplica.

4. Seguimiento
   └── Mapa de entregas (opcional).
```

### 7.3 Flujo del Domiciliario

```
1. Revisar Dashboard
   └── Ver pedidos pendientes de entrega.

2. Iniciar Cargue del Día
   └── /cargue → Agregar productos cargados.

3. Entregar Pedidos
   ├── /mapa o /pedidos → Ver pendientes.
   ├── Entregar → Estado ENTREGADO.
   └── Si hay rechazo → Registrar rechazo parcial.

4. Cierre
   └── Imprimir hoja de cargue si es necesario.
```

---

## 8. Instrucciones Paso a Paso

### 8.1 Crear un Pedido

1. Ir a **Pedidos** en el menú lateral.
2. Hacer clic en **"Nuevo Pedido"**.
3. Seleccionar el **Cliente** (o crear uno nuevo).
4. La dirección de entrega se carga automáticamente desde el cliente.
5. Agregar **Productos** o **Ofertas** al carrito:
   - Buscar por nombre.
   - Indicar cantidad.
   - El sistema valida stock disponible.
6. Seleccionar **Método de Pago** preferido.
7. Asignar **Domiciliario** (opcional, puede dejarse para después).
8. Guardar. El sistema generará un número de orden (`ORD-XXXX`) y reservará el stock.

### 8.2 Facturar un Pedido

1. Ir a **Facturación**.
2. Hacer clic en **"Nueva Factura"**.
3. Seleccionar el **Cliente**.
4. Vincular a un **Pedido** existente (opcional) o crear factura independiente.
5. Agregar productos y/o ofertas.
6. Aplicar un **código de descuento** si existe (el sistema valida vigencia y usos).
7. El impuesto se calcula automáticamente según la configuración del negocio.
8. Guardar la factura.
9. Para registrar un pago:
   - Abrir la factura.
   - Hacer clic en **"Registrar Pago"**.
   - Indicar monto y método de pago.
   - Guardar. El estado de la factura se actualizará automáticamente.

### 8.3 Enviar Factura por WhatsApp

1. Abrir la **Facturación**.
2. Localizar la factura a enviar.
3. Hacer clic en el botón de **WhatsApp** (icono verde).
4. El sistema genera el mensaje automáticamente.
   - Si estás en PC y el bridge está activo: se envía automáticamente.
   - Si estás en móvil: se abre `wa.me` con el mensaje preescrito.
5. Para envío masivo: seleccionar varias facturas y usar **"Enviar WhatsApp Masivo"**.

### 8.4 Gestionar el Cargue de un Domiciliario

#### Como Domiciliario:
1. Ir a **Cargue** en el menú.
2. Si no hay carga activa, el sistema la crea automáticamente.
3. Hacer clic en **"Agregar Producto"**.
4. Seleccionar el producto e indicar la cantidad y unidad de medida (unidad, docena, display, caja).
5. Guardar. El sistema lleva el conteo de lo cargado.

#### Como Administrador:
1. Ir a **Control de Cargue**.
2. Seleccionar la **fecha** a revisar.
3. Ver resumen por domiciliario:
   - Total cargado.
   - Total entregado.
   - Total rechazado.
4. Revisar detalle de productos con valores monetarios.
5. Ver rechazos del día.
6. Consultar reporte de dinero recolectado por mes.

### 8.5 Registrar un Rechazo

1. Ir a **Pedidos**.
2. Localizar el pedido rechazado.
3. Cambiar estado a **RECHAZADO** o hacer clic en **"Rechazo Parcial"**.
4. Seleccionar los productos rechazados y cantidades.
5. Indicar motivo (opcional).
6. Guardar. El sistema:
   - Restaura el stock.
   - Descuenta del cargue del domiciliario.
   - Registra el rechazo en el historial.

### 8.6 Crear una Oferta (Combo)

1. Ir a **Ofertas**.
2. Hacer clic en **"Nueva Oferta"**.
3. Indicar nombre, precio especial del combo y subir imagen.
4. Agregar productos al combo con sus cantidades.
5. Guardar. La oferta quedará activa y disponible para pedidos.
6. Para archivar: usar el botón de eliminar (soft delete). Para restaurar: ir a la pestaña **Archivadas**.

### 8.7 Actualizar Ubicación de un Cliente

1. Ir a **Clientes**.
2. Localizar el cliente y hacer clic en **"Editar"**.
3. En el campo de dirección, hacer clic en **"Abrir Mapa"**.
4. El mapa se abrirá con la dirección actual (o una predeterminada).
5. Puedes:
   - Mover el marcador manualmente.
   - Usar el botón **"Mi Ubicación"** si estás en el lugar del cliente.
   - Buscar la dirección en la barra de búsqueda.
6. Guardar ubicación. Las coordenadas se guardan en latitud/longitud.

### 8.8 Exportar Datos a Excel

La mayoría de listados (Clientes, Productos, Pedidos, Inventario, Reportes) tienen un botón de **"Exportar Excel"**.

1. Aplicar filtros si es necesario.
2. Hacer clic en **"Exportar Excel"**.
3. El archivo se descarga con formato profesional (encabezados con color, bordes, anchos automáticos).

### 8.9 Imprimir Documentos

- **Notas de entrega**: En Pedidos, seleccionar uno o varios pedidos y hacer clic en **"Imprimir"**.
- **Facturas**: En Facturación, seleccionar facturas y usar **"Imprimir"**.
- **Hoja de Cargue**: En la vista de Cargue del domiciliario, usar **"Imprimir Hoja de Cargue"**.

El sistema genera una vista optimizada para impresión y lanza el diálogo de impresión del navegador.

---

## 9. Consideraciones Importantes

### 9.1 Stock y Reservas
- Cuando se crea un pedido, el stock de los productos se descuenta inmediatamente.
- Si el pedido se cancela o rechaza, el stock se restaura automáticamente.
- Si un producto está vinculado a un item de inventario, también se descuenta del inventario.

### 9.2 Cargue y Estados
- Un domiciliario solo puede tener **una carga activa por día**.
- Al entregar un pedido, el sistema descuenta automáticamente del cargue.
- Al revertir un pedido a `PENDIENTE`, el cargue se revierte.

### 9.3 Facturas y Pedidos
- Una factura puede existir sin pedido (venta directa).
- Un pedido puede facturarse parcial o totalmente.
- Los pagos registrados actualizan automáticamente el estado de la factura.

### 9.4 WhatsApp
- No envíes demasiados mensajes en muy poco tiempo para evitar bloqueos por spam.
- Entre cada mensaje masivo hay un **delay de 2 a 5 segundos**.
- Si cambias de número de WhatsApp, borra la carpeta `.wwebjs_auth/` del bridge y vuelve a escanear el QR.

### 9.5 Soft Delete vs Force Delete
- **Eliminar normal**: Desvincula entidades o marca como archivado (según el módulo).
- **Forzar eliminación**: Elimina físicamente el registro de la base de datos. Solo disponible para Administradores.

### 9.6 Geolocalización
- Las coordenadas se guardan en los campos `latitude` y `longitude`.
- Es importante mantener actualizada la ubicación de los clientes para que el mapa de rutas sea preciso.

---

## 10. Solución de Problemas

### 10.1 No puedo iniciar sesión
- Verifica que el backend esté corriendo en `http://localhost:8080`.
- Verifica usuario y contraseña. El usuario por defecto es `admin` / `admin123`.
- Revisa que PostgreSQL esté activo y accesible.

### 10.2 Las imágenes no se ven
- Verifica que la carpeta `uploads/` exista en la raíz del proyecto.
- El backend sirve archivos estáticos desde `/uploads/**`.

### 10.3 El mapa no carga
- Verifica tu conexión a Internet (se usan servicios externos).
- Revisa que las claves de API (MapTiler, Google Maps) estén configuradas si es necesario.

### 10.4 WhatsApp no envía mensajes
- Verifica que el bridge esté corriendo en `http://localhost:3001`.
- Revisa `/api/v1/invoices/whatsapp/status` para verificar estado.
- Asegúrate de que el número del cliente esté en formato válido.

### 10.5 Error de CORS
- El backend está configurado para aceptar peticiones de `http://localhost:5173`.
- Si accedes desde otro origen, actualiza `CorsConfig.java` o `SecurityConfig.java`.

### 10.6 Problemas de base de datos
- Si hay errores de constraint o columnas faltantes, revisa que `ddl-auto=update` esté activo.
- En producción, se recomienda usar migraciones (Flyway/Liquibase) en lugar de `ddl-auto=update`.

---

## Contacto y Soporte

Para dudas, mejoras o reporte de errores, contacta al equipo de desarrollo de OrderGo SweetFlow.

---

*Manual generado automáticamente para OrderGo SweetFlow.*
*Versión del sistema: 0.0.1-SNAPSHOT*
