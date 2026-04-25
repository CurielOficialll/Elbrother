# 🗄️ Modelo de Datos — Elbrother POS

## Diagrama Entidad-Relación

```mermaid
erDiagram
    users ||--o{ sales : "realiza"
    users ||--o{ cash_sessions : "opera"
    users ||--o{ activity_logs : "genera"
    users ||--o{ stock_movements : "ejecuta"
    users ||--o{ credit_payments : "registra"
    users ||--o{ price_history : "modifica"
    users ||--o{ purchases : "registra"
    users ||--o{ payable_payments : "paga"

    categories ||--o{ products : "agrupa"
    suppliers ||--o{ products : "provee"
    suppliers ||--o{ purchases : "recibe"
    suppliers ||--o{ accounts_payable : "adeuda"

    products ||--o{ sale_items : "vendido_en"
    products ||--o{ purchase_items : "comprado_en"
    products ||--o{ stock_movements : "registra"
    products ||--o{ price_history : "historial"

    sales ||--o{ sale_items : "contiene"
    sales ||--o{ credits : "genera"
    sales }o--|| cash_sessions : "pertenece"
    sales }o--o| clients : "asociada"

    clients ||--o{ credits : "tiene"
    clients ||--o{ sales : "compra"

    credits ||--o{ credit_payments : "recibe"

    cash_sessions ||--o{ cash_transactions : "registra"

    purchases ||--o{ purchase_items : "contiene"
    purchases ||--o{ accounts_payable : "genera"

    accounts_payable ||--o{ payable_payments : "recibe"

    users {
        int id PK
        text email UK
        text password_hash
        text name
        text role
        int active
    }
    categories {
        int id PK
        text name
        text icon
        text color
        int active
    }
    suppliers {
        int id PK
        text name
        text phone
        text email
        text address
        int active
    }
    products {
        int id PK
        text barcode UK
        text name
        int category_id FK
        int supplier_id FK
        real cost_price
        real sell_price
        int stock
        int min_stock
        text unit
        int active
    }
    sales {
        int id PK
        text sale_number UK
        int user_id FK
        int client_id FK
        int session_id FK
        real subtotal
        real tax
        real total
        real total_bs
        text payment_method
        real bcv_rate
        text status
    }
    sale_items {
        int id PK
        int sale_id FK
        int product_id FK
        int quantity
        real unit_price
        real cost_price
        real total
    }
    clients {
        int id PK
        text name
        text cedula UK
        text phone
        real credit_limit
        int active
    }
    credits {
        int id PK
        int client_id FK
        int sale_id FK
        real amount
        real balance
        text status
    }
    credit_payments {
        int id PK
        int credit_id FK
        real amount
        text payment_method
        int user_id FK
    }
    cash_sessions {
        int id PK
        int user_id FK
        real opening_amount
        real closing_amount
        real expected_amount
        real difference
        text status
    }
    cash_transactions {
        int id PK
        int session_id FK
        text type
        real amount
        text payment_method
        text reference
    }
    purchases {
        int id PK
        text purchase_number UK
        int supplier_id FK
        int user_id FK
        real subtotal
        real total
        text payment_method
        text status
    }
    purchase_items {
        int id PK
        int purchase_id FK
        int product_id FK
        int quantity
        real unit_cost
        real total
    }
    accounts_payable {
        int id PK
        int supplier_id FK
        int purchase_id FK
        real amount
        real balance
        text status
    }
    payable_payments {
        int id PK
        int account_payable_id FK
        real amount
        text payment_method
        int user_id FK
    }
```

## Tablas Principales

### `users` — Usuarios del sistema
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER PK | Auto-incremental |
| email | TEXT UNIQUE | Email de acceso |
| password_hash | TEXT | Hash bcrypt |
| name | TEXT | Nombre para mostrar |
| role | TEXT | `admin` o `cashier` |
| active | INTEGER | 1=activo, 0=inactivo |

### `products` — Catálogo de productos
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER PK | Auto-incremental |
| barcode | TEXT UNIQUE | Código de barras (opcional) |
| name | TEXT | Nombre del producto |
| category_id | INTEGER FK | Categoría |
| supplier_id | INTEGER FK | Proveedor |
| cost_price | REAL | Precio de costo (USD) |
| sell_price | REAL | Precio de venta (USD) |
| stock | INTEGER | Unidades disponibles |
| min_stock | INTEGER | Alerta de stock bajo (default: 5) |
| unit | TEXT | Unidad de medida (default: `und`) |

### `sales` — Transacciones de venta
| Campo | Tipo | Descripción |
|-------|------|-------------|
| sale_number | TEXT UNIQUE | Formato: `TRX-YYYYMMDD-NNNN` |
| total | REAL | Total en USD |
| total_bs | REAL | Total en Bolívares |
| payment_method | TEXT | `cash`, `card`, `transfer`, `credit` |
| bcv_rate | REAL | Tasa BCV al momento de la venta |
| status | TEXT | `completed`, `voided`, `credit` |

### `cash_sessions` — Sesiones de caja
| Campo | Tipo | Descripción |
|-------|------|-------------|
| opening_amount | REAL | Monto de apertura |
| closing_amount | REAL | Monto al cierre |
| expected_amount | REAL | Monto esperado (calculado) |
| difference | REAL | Diferencia (cierre - esperado) |
| status | TEXT | `open` o `closed` |

### `purchases` — Compras a proveedores
| Campo | Tipo | Descripción |
|-------|------|-------------|
| purchase_number | TEXT UNIQUE | Formato: `COMP-YYYYMMDD-NNNN` |
| supplier_id | INTEGER FK | Proveedor |
| payment_method | TEXT | `cash`, `transfer`, `credit` |

### `credits` — Créditos de clientes
| Campo | Tipo | Descripción |
|-------|------|-------------|
| amount | REAL | Monto original |
| balance | REAL | Saldo pendiente |
| status | TEXT | `active` o `paid` |

### `accounts_payable` — Cuentas por pagar a proveedores
| Campo | Tipo | Descripción |
|-------|------|-------------|
| amount | REAL | Monto original |
| balance | REAL | Saldo pendiente |
| status | TEXT | `active` o `paid` |

## Índices

| Índice | Tabla | Columna(s) | Propósito |
|--------|-------|------------|-----------|
| idx_products_barcode | products | barcode | Búsqueda rápida por código |
| idx_products_category | products | category_id | Filtro por categoría |
| idx_products_name | products | name | Búsqueda por nombre |
| idx_sales_date | sales | created_at | Reportes por fecha |
| idx_sales_user | sales | user_id | Ventas por usuario |
| idx_sale_items_sale | sale_items | sale_id | Items de una venta |
| idx_sale_items_product | sale_items | product_id | Ventas de un producto |
| idx_stock_movements_product | stock_movements | product_id | Historial de stock |
| idx_credits_client | credits | client_id | Créditos por cliente |
| idx_purchases_date | purchases | created_at | Compras por fecha |
| idx_accounts_payable_supplier | accounts_payable | supplier_id | Deudas por proveedor |
