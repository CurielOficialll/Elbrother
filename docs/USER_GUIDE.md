<![CDATA[# 📖 Guía de Usuario — Elbrother POS

## Inicio de Sesión

1. Al abrir la aplicación, se muestra la pantalla de login
2. Ingresa tu email y contraseña
3. Según tu rol (`admin` o `cajero`) tendrás acceso a diferentes funciones

---

## 🏠 Dashboard

El panel principal muestra un resumen en tiempo real:

- **Ventas de Hoy** — Total en USD con conversión a Bolívares
- **Ventas de la Semana** — Acumulado semanal
- **Ventas del Mes** — Acumulado mensual
- **Productos con Stock Bajo** — Alertas de reposición
- **Deudas Activas** — Total de créditos pendientes
- **Últimas 5 Ventas** — Lista rápida de transacciones recientes
- **Top 10 Productos** — Los más vendidos
- **Tasa BCV** — Tasa de cambio actual del Bolívar

---

## 🛒 Punto de Venta (POS)

### Flujo de una Venta
1. **Abrir Caja** — Ir a la sección Caja y abrir una sesión con el monto inicial
2. **Buscar Productos** — Escribir nombre o escanear código de barras
3. **Agregar al Carrito** — Click en el producto para añadir unidades
4. **Ajustar Cantidades** — Modificar cantidades en el carrito
5. **Seleccionar Método de Pago** — Efectivo, tarjeta, transferencia o crédito
6. **Asociar Cliente** — (Opcional) Para ventas a crédito
7. **Procesar Venta** — Confirmar la transacción

### Métodos de Pago
| Método | Descripción |
|--------|-------------|
| `cash` | Efectivo |
| `card` | Tarjeta de débito/crédito |
| `transfer` | Transferencia bancaria |
| `credit` | A crédito (requiere cliente) |

### Precios
- Los precios se almacenan en **USD**
- Se muestran en **Bolívares** usando la tasa BCV vigente
- La referencia en USD se muestra en texto secundario

---

## 📦 Inventario

### Gestión de Productos
- **Crear** — Nombre, precio, categoría, proveedor, stock inicial
- **Editar** — Actualizar cualquier campo (se registra historial)
- **Ajustar Stock** — Modificar cantidad manualmente con trazabilidad
- **Eliminar** — Soft-delete (se puede reactivar)

### Categorías
- Organiza productos por tipo
- Cada categoría tiene nombre, icono y color

### Alertas de Stock
- Productos con stock ≤ `min_stock` aparecen como alerta
- Visible en el Dashboard y en la sección de Inventario

---

## 👥 Clientes

### Gestión
- Crear clientes con nombre, cédula, teléfono y límite de crédito
- Ver historial de compras y deudas

### Sistema de Créditos
1. Al vender a crédito, se crea un registro de deuda automáticamente
2. El cliente puede hacer abonos parciales
3. Los abonos se aplican al crédito más antiguo primero
4. Al completar el pago, el crédito cambia a estado `paid`

---

## 🏭 Compras

### Registrar una Compra
1. Seleccionar proveedor
2. Agregar productos con cantidad y costo unitario
3. Elegir método de pago
4. Confirmar — El stock se actualiza automáticamente

### Cuentas por Pagar
- Las compras a crédito generan una cuenta por pagar
- Se pueden registrar abonos parciales
- No se puede eliminar un proveedor con deudas activas

---

## 💵 Control de Caja

### Flujo de Caja
1. **Abrir Caja** — Registrar monto de apertura
2. **Operar** — Las ventas y abonos se registran automáticamente
3. **Cerrar Caja** — Ingresar monto de cierre
4. **Conciliación** — El sistema calcula la diferencia automáticamente

### Transacciones Registradas
| Tipo | Descripción |
|------|-------------|
| `opening` | Apertura de caja |
| `sale` | Venta procesada |
| `credit_payment` | Abono de crédito |
| `refund` | Anulación de venta |

---

## 📊 Reportes

- **Ventas por Período** — Diario, semanal, mensual
- **Ventas por Método de Pago** — Distribución porcentual
- **Top Productos** — Los más vendidos por cantidad y monto
- **Valor del Inventario** — Costo vs. precio retail
- **Tendencia Semanal** — Ventas por día de la semana
- **Reporte Personalizado** — Rango de fechas con cálculo de ganancia

---

## ⚙️ Configuración

### Sistema
- **Nombre del Negocio** — Se muestra en la interfaz
- **IVA (%)** — Porcentaje de impuesto aplicado a ventas
- **Moneda** — Moneda principal (USD)

### Tasa BCV
- **Actualizar Auto** — Obtiene la tasa del sitio web del BCV
- **Guardar Manual** — Permite ingresar la tasa manualmente (útil sin internet)
- Se actualiza automáticamente cada hora

### Base de Datos
- Cambiar ubicación del archivo de base de datos
- La app se reinicia al cambiar la ubicación

### Mantenimiento Crítico
- **Limpiar Datos de Prueba** — Elimina ventas, movimientos y sesiones
- Conserva productos, categorías y precios
- Requiere doble confirmación

### Actividad Reciente
- Muestra las últimas 5 acciones del sistema
- Incluye usuario, acción y tiempo transcurrido

---

## 🧮 Calculadora

- Herramienta de conversión USD ↔ Bolívares
- Calcula precios con IVA incluido
- Usa la tasa BCV actual del sistema

---

## ❓ Troubleshooting

### La tasa BCV no se actualiza
1. Verificar conexión a internet
2. Usar la opción "Guardar Manual" en Configuración
3. La tasa se cachea localmente si no hay conexión

### No puedo eliminar un proveedor
- Verificar que no tenga cuentas por pagar pendientes
- Pagar todas las deudas antes de eliminar

### La caja no cuadra
- Revisar movimientos eliminados o anulaciones
- Las anulaciones generan un refund negativo automáticamente

### Olvidé mi contraseña
- Contactar al administrador del sistema
- Las credenciales se almacenan en la base de datos local

### La app no arranca
1. Verificar que el puerto 3000 no esté ocupado
2. Revisar la consola de Electron para errores
3. Verificar que `node_modules` esté instalado (`npm install`)

---

## 📞 Glosario

| Término | Definición |
|---------|-----------|
| **BCV** | Banco Central de Venezuela — fuente oficial de tasa cambiaria |
| **POS** | Point of Sale — Punto de Venta |
| **Local-First** | Arquitectura que prioriza funcionamiento sin internet |
| **Soft Delete** | Marcar como inactivo en vez de eliminar físicamente |
| **Tasa BCV** | Tasa de cambio oficial Bolívar/USD |
| **Conciliación** | Comparación entre monto esperado y real en caja |
| **Velopack** | Sistema de actualizaciones delta para apps de escritorio |
]]>
