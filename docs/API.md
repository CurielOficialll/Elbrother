<![CDATA[# 📡 API Reference — Elbrother POS

> **Base URL:** `http://localhost:3000/api`  
> **Autenticación:** JWT via cookie `token` o header `Authorization: Bearer <token>`  
> **Content-Type:** `application/json`

---

## 🔐 Autenticación (`/api/auth`)

### POST `/auth/login`
Inicia sesión y obtiene un JWT.

**Body:**
```json
{ "email": "admin@elbrother.com", "password": "admin123" }
```
**Respuesta 200:**
```json
{
  "user": { "id": 1, "email": "admin@elbrother.com", "name": "Administrador", "role": "admin" },
  "token": "eyJhbGciOi..."
}
```
**Errores:** `400` campos faltantes | `401` credenciales inválidas

### POST `/auth/logout`
🔒 Cierra la sesión y limpia la cookie.

### GET `/auth/me`
🔒 Retorna el usuario autenticado.

---

## 📦 Productos (`/api/products`)

### GET `/products`
🔒 Lista todos los productos activos.

**Query params:**
| Param | Tipo | Descripción |
|-------|------|-------------|
| search | string | Busca en nombre y barcode |
| category | int | Filtra por categoría |
| low_stock | bool | Solo productos con stock bajo |
| active | bool | Filtra por estado |

### GET `/products/search/:term`
🔒 Búsqueda rápida para POS (máx. 20 resultados).

### GET `/products/:id`
🔒 Detalle de un producto.

### POST `/products`
🔒 Crea un producto.

**Body:**
```json
{
  "name": "Producto X", "barcode": "123456", "category_id": 1,
  "cost_price": 5.00, "sell_price": 10.00, "stock": 50, "min_stock": 5, "unit": "und"
}
```

### PUT `/products/:id`
🔒 Actualiza un producto. Registra cambios de precio y stock automáticamente.

### DELETE `/products/:id`
🔒🛡️ **Admin.** Soft-delete (marca `active=0`).

### GET `/products/:id/price-history`
🔒 Historial de cambios de precio.

### GET `/products/:id/stock-movements`
🔒 Historial de movimientos de stock (últimos 50).

---

## 🏷️ Categorías (`/api/categories`)

### GET `/categories`
🔒 Lista categorías con conteo de productos.

### POST `/categories`
🔒 Crea una categoría. Body: `{ "name", "icon", "color" }`

### PUT `/categories/:id`
🔒 Actualiza una categoría.

### DELETE `/categories/:id`
🔒 Soft-delete.

---

## 💰 Ventas (`/api/sales`)

### POST `/sales`
🔒 Procesa una venta completa (transaccional).

**Body:**
```json
{
  "items": [{ "product_id": 1, "quantity": 2 }],
  "payment_method": "cash",
  "client_id": null,
  "notes": "Venta regular"
}
```

**Operaciones automáticas:**
1. Valida stock disponible
2. Calcula subtotal, IVA y total
3. Convierte a Bolívares con tasa BCV actual
4. Descuenta stock y registra movimientos
5. Registra transacción en la caja abierta
6. Si es crédito: crea registro en `credits`
7. Emite evento Socket.IO `sale:new`

### GET `/sales`
🔒 Lista ventas. Query: `from`, `to`, `limit` (default: 50).

### GET `/sales/:id`
🔒 Detalle de venta con items.

### POST `/sales/:id/void`
🔒 Anula una venta (restaura stock, registra refund en caja).

### DELETE `/sales/:id`
🔒 Elimina una venta completamente (restaura stock, elimina créditos asociados).

---

## 👥 Clientes (`/api/clients`)

### GET `/clients`
🔒 Lista clientes con deuda total calculada. Query: `search`.

### GET `/clients/:id`
🔒 Detalle con créditos y ventas recientes.

### POST `/clients`
🔒 Crea cliente. Body: `{ "name", "cedula", "phone", "credit_limit" }`

### PUT `/clients/:id`
🔒 Actualiza cliente.

### DELETE `/clients/:id`
🔒 Soft-delete.

### POST `/clients/:id/pay-credit`
🔒 Abona a un crédito específico. Body: `{ "credit_id", "amount", "payment_method" }`

### POST `/clients/:id/payment`
🔒 Abono general (aplica al crédito más antiguo primero). Body: `{ "amount", "payment_method" }`

### GET `/clients/:id/credit-history`
🔒 Historial de pagos de crédito.

---

## 🏭 Proveedores (`/api/suppliers`)

### GET `/suppliers`
🔒 Lista proveedores activos. Query: `search`.

### GET `/suppliers/:id`
🔒 Detalle de proveedor.

### POST `/suppliers`
🔒 Crea proveedor. Body: `{ "name", "phone", "email", "address" }`

### DELETE `/suppliers/:id`
🔒 Soft-delete. **Bloqueado** si tiene cuentas por pagar activas.

---

## 🛒 Compras (`/api/purchases`)

### GET `/purchases`
🔒 Lista todas las compras.

### GET `/purchases/:id`
🔒 Detalle de compra con items.

### POST `/purchases`
🔒 Registra una compra (transaccional).

**Body:**
```json
{
  "supplier_id": 1,
  "items": [{ "product_id": 1, "quantity": 100, "unit_cost": 3.50 }],
  "payment_method": "cash",
  "notes": "Reposición semanal"
}
```
**Operaciones automáticas:** incrementa stock, actualiza costo, crea cuenta por pagar si es crédito.

### DELETE `/purchases/:id`
🔒 Elimina compra completamente (revierte stock).

### GET `/purchases/payables/list`
🔒 Lista cuentas por pagar activas.

### POST `/purchases/payables/:id/pay`
🔒 Abona a una cuenta por pagar. Body: `{ "amount", "payment_method", "reference" }`

---

## 💵 Caja (`/api/cash`)

### POST `/cash/open`
🔒 Abre sesión de caja. Body: `{ "opening_amount": 100 }`

### POST `/cash/close`
🔒 Cierra la caja. Calcula diferencia automáticamente. Body: `{ "closing_amount", "notes" }`

### GET `/cash/current`
🔒 Estado de la caja abierta con transacciones y totales.

### GET `/cash/history`
🔒 Historial de sesiones de caja (últimas 30).

### DELETE `/cash/transaction/:id`
🔒 Elimina un movimiento de caja (solo si la sesión está abierta).

### DELETE `/cash/session/:id`
🔒 Elimina una sesión cerrada y sus transacciones.

---

## 📊 Reportes (`/api/reports`)

### GET `/reports/dashboard`
🔒 Datos completos del dashboard: ventas hoy/semana/mes, stock bajo, top productos, deudas activas.

### GET `/reports/sales-by-period`
🔒 Ventas agrupadas. Query: `period` = `daily` | `weekly` | `monthly`.

### GET `/reports/sales-by-payment`
🔒 Ventas agrupadas por método de pago (últimos 30 días).

### GET `/reports/top-products`
🔒 Top 10 productos más vendidos. Query: `startDate`, `endDate`.

### GET `/reports/inventory-value`
🔒 Valor total del inventario (costo y retail).

### GET `/reports/weekly-trend`
🔒 Tendencia de ventas por día de la semana.

### GET `/reports/valuation`
🔒 Valoración del inventario.

### GET `/reports/custom`
🔒 Reporte personalizado por rango de fechas. Query: `startDate`, `endDate`.

---

## ⚙️ Sistema (`/api/system`)

### GET `/system/config`
🔒 Lee toda la configuración del sistema.

### PUT `/system/config`
🔒 Actualiza configuración. Body: `{ "business_name", "tax_rate", "currency" }`

### GET `/system/bcv`
Obtiene la tasa BCV actual (no requiere auth).

### POST `/system/bcv/refresh`
🔒 Actualiza la tasa BCV desde el Banco Central de Venezuela.

### POST `/system/bcv/manual`
🔒 Establece la tasa BCV manualmente. Body: `{ "rate": 485.50 }`

### GET `/system/activity-log`
🔒 Últimas 100 entradas del log de actividad.

### POST `/system/reset-production`
🔒🛡️ **Admin.** Elimina todos los datos transaccionales. Conserva productos y categorías.

---

## 🔌 WebSocket Events (Socket.IO)

| Evento | Dirección | Payload | Descripción |
|--------|-----------|---------|-------------|
| `bcv:update` | Server → Client | `{ rate: number }` | Tasa BCV actualizada |
| `sale:new` | Server → Client | `{ id, sale_number, total }` | Nueva venta procesada |
| `sale:deleted` | Server → Client | `{ id, sale_number }` | Venta eliminada |

---

**Leyenda:**
- 🔒 = Requiere autenticación (JWT)
- 🛡️ = Requiere rol `admin`
]]>
