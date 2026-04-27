# 🔵 ELBROTHER POS v2.5.20

![Version](https://img.shields.io/badge/version-2.5.20-blue)
![Platform](https://img.shields.io/badge/platform-Windows-lightgrey)
![License](https://img.shields.io/badge/license-Private-red)
![Node](https://img.shields.io/badge/node-%3E%3D18-green)
![Electron](https://img.shields.io/badge/electron-41.x-9cf)

**Sistema de Punto de Venta e Inventario Local-First para negocios minoristas en Venezuela.**

---

## 📋 Resumen Ejecutivo

Elbrother POS es una aplicación de escritorio construida con Electron que proporciona un sistema completo de punto de venta (POS), gestión de inventario, control de caja y reportes financieros. Diseñada bajo la filosofía **Local-First**, garantiza operación 100% offline con base de datos SQLite embebida.

### Objetivos Principales
- Gestión completa de inventario con trazabilidad de movimientos de stock
- Punto de venta rápido con búsqueda por nombre y código de barras
- Control de caja con apertura/cierre y conciliación automática
- Gestión de clientes con sistema de créditos y abonos
- Gestión de compras a proveedores con cuentas por pagar
- Integración automática de tasa BCV (Banco Central de Venezuela)
- Reportes financieros con análisis de rentabilidad

### Usuarios Objetivo
- Administradores de negocios minoristas
- Cajeros de punto de venta
- Propietarios de tiendas en Venezuela

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────┐
│                  ELECTRON SHELL                  │
│  ┌──────────┐  ┌─────────────────────────────┐  │
│  │ main.js  │  │    BrowserWindow (Renderer)  │  │
│  │ Proceso  │  │  ┌───────────────────────┐   │  │
│  │ Principal│  │  │   Frontend SPA        │   │  │
│  │          │  │  │  HTML + CSS + JS      │   │  │
│  │ IPC      │◄►│  │  Hash Router          │   │  │
│  │ Handlers │  │  │  Socket.IO Client     │   │  │
│  └──────────┘  │  └───────────┬───────────┘   │  │
│                │              │ HTTP/WS        │  │
│                │  ┌───────────▼───────────┐   │  │
│                │  │  Express Server :3000  │   │  │
│                │  │  ┌─────────────────┐  │   │  │
│                │  │  │  REST API       │  │   │  │
│                │  │  │  Socket.IO      │  │   │  │
│                │  │  │  Auth (JWT)     │  │   │  │
│                │  │  └────────┬────────┘  │   │  │
│                │  │           │            │   │  │
│                │  │  ┌────────▼────────┐  │   │  │
│                │  │  │  SQLite (sql.js)│  │   │  │
│                │  │  │  In-Memory +    │  │   │  │
│                │  │  │  Disk Persist   │  │   │  │
│                │  │  └─────────────────┘  │   │  │
│                │  └───────────────────────┘   │  │
│                └─────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### Patrones de Diseño
| Patrón | Uso |
|--------|-----|
| **Local-First** | La app funciona 100% sin internet |
| **SPA (Single Page App)** | Hash-based routing en el frontend |
| **MVC** | Separación de rutas, middleware y vistas |
| **Proxy Pattern** | `connection.js` envuelve sql.js con API tipo better-sqlite3 |
| **Transaction Pattern** | Operaciones complejas (ventas, compras) son atómicas |
| **Soft Delete** | Entidades se desactivan (`active=0`) en vez de eliminarse |
| **Atomic Write** | Escritura a disco vía archivo temporal + `fsync` + rename |

### Stack Tecnológico

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| Desktop Runtime | Electron 41 | App nativa Windows con web tech |
| Backend | Express.js 4.x | API REST ligera y madura |
| Base de Datos | SQLite (sql.js) | Embebida, zero-config, portable |
| Autenticación | JWT + bcryptjs | Tokens stateless, hashing seguro |
| Realtime | Socket.IO | Actualizaciones en vivo (tasa BCV) |
| Frontend | Vanilla JS (SPA) | Sin framework = máximo rendimiento |
| Estilos | CSS custom con variables | Dark theme, design system propio |
| Tipografía | Google Material Symbols | Iconografía moderna y consistente |
| Updates | Velopack | Actualizaciones delta nativas |

---

## 📁 Estructura del Proyecto

```
ELBROTHER/
├── main.js                    # Proceso principal Electron
├── preload.js                 # Bridge seguro Electron ↔ Renderer
├── server.js                  # Servidor Express + Socket.IO
├── package.json               # Dependencias y scripts
├── PUBLICAR_ELBROTHER.ps1     # Script de publicación manual
│
├── src/                       # Backend
│   ├── database/
│   │   ├── connection.js      # Conexión SQLite + proxy better-sqlite3
│   │   ├── schema.js          # DDL: Tablas e índices
│   │   └── seed.js            # Datos iniciales (usuarios, config)
│   ├── middleware/
│   │   └── auth.js            # JWT verify + role guard
│   ├── routes/
│   │   ├── auth.js            # Login / Logout / Me
│   │   ├── products.js        # CRUD productos + historial
│   │   ├── categories.js      # CRUD categorías
│   │   ├── sales.js           # Procesar / anular / eliminar ventas
│   │   ├── clients.js         # CRUD clientes + créditos
│   │   ├── suppliers.js       # CRUD proveedores
│   │   ├── purchases.js       # Compras + cuentas por pagar
│   │   ├── cashRegister.js    # Apertura / cierre de caja
│   │   ├── reports.js         # Dashboard + reportes
│   │   └── system.js          # Config + BCV + actividad + reset
│   └── services/
│       └── bcv.js             # Scraper tasa BCV + caché
│
├── public/                    # Frontend
│   ├── index.html             # Shell de la SPA
│   ├── css/
│   │   ├── app.css            # Design system completo
│   │   └── fonts.css          # Material Symbols
│   ├── fonts/                 # Fuentes offline
│   └── js/
│       ├── app.js             # Router SPA + controlador principal
│       ├── utils/
│       │   ├── api.js         # Fetch wrapper con auth
│       │   ├── format.js      # Formateo: moneda, fechas, BCV
│       │   └── store.js       # Estado reactivo + carrito
│       ├── components/
│       │   ├── toast.js       # Notificaciones toast
│       │   └── sounds.js      # Efectos de sonido
│       └── pages/
│           ├── login.js       # Pantalla de login
│           ├── dashboard.js   # KPIs y resumen
│           ├── pos.js         # Punto de venta
│           ├── inventory.js   # Gestión de inventario
│           ├── clients.js     # Gestión de clientes
│           ├── purchases.js   # Gestión de compras
│           ├── cash.js        # Control de caja
│           ├── reports.js     # Reportes y gráficos
│           ├── calculator.js  # Calculadora de precios
│           └── settings.js    # Configuración del sistema
│
└── data/                      # Base de datos (gitignored)
    ├── elbrother.db           # BD principal
    └── backups/               # Rotación automática de backups
```

---

## ⚙️ Guía de Instalación

### Prerequisitos
- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- **Windows** 10/11 (para versión Electron)
- **Git** (opcional, para clonar)

### Instalación para Desarrollo

```bash
# 1. Clonar el repositorio
git clone https://github.com/CurielOficialll/Elbrother.git
cd Elbrother

# 2. Instalar dependencias
npm install

# 3. Ejecutar en modo desarrollo
npm start          # Abre la app Electron completa
# o
npm run server     # Solo el servidor Express en localhost:3000
```

### Variables de Entorno (Opcionales)

| Variable | Default | Descripción |
|----------|---------|-------------|
| `PORT` | `3000` | Puerto del servidor Express |
| `JWT_SECRET` | `elbrother-pos-secret-key-2025-local` | Clave para firmar JWT |
| `DB_PATH` | `./data/elbrother.db` | Ruta de la base de datos |

### Credenciales por Defecto

| Rol | Email | Contraseña |
|-----|-------|------------|
| Administrador | `admin@elbrother.com` | `admin123` |
| Cajero | `cajero@elbrother.com` | `cajero123` |

> ⚠️ **IMPORTANTE:** Cambiar las credenciales por defecto antes de usar en producción.

### Verificación de Instalación
1. Ejecutar `npm start`
2. La consola debe mostrar el banner de Elbrother POS
3. La ventana Electron debe abrirse en `http://localhost:3000`
4. Login con las credenciales por defecto

---

## 🔒 Seguridad

### Autenticación
- **JWT (JSON Web Tokens)** con expiración de 24 horas
- Tokens almacenados en cookies HTTP-Only (`sameSite: lax`)
- Contraseñas hasheadas con **bcryptjs** (salt rounds: 10)

### Autorización
- Dos roles: `admin` y `cashier`
- Middleware `requireAdmin` protege operaciones destructivas
- Todas las rutas API requieren `authenticateToken`

### Persistencia de Datos
- **Escritura atómica**: archivo temporal → `fsync` → rename
- **Rotación de backups**: 3 copias automáticas en `/backups`
- **Auto-guardado**: cada 30 segundos
- **Graceful shutdown**: guarda BD al cerrar la app

### Consideraciones
- El JWT_SECRET por defecto debe cambiarse en producción
- La app está diseñada para uso en red local (LAN)
- `contextIsolation: true` en Electron previene acceso directo al Node

---

## 🚀 Deployment

### Build para Producción

```powershell
# Usar el script automatizado:
.\PUBLICAR_ELBROTHER.ps1
```

El script ejecuta:
1. Limpieza de builds anteriores
2. `npm install`
3. `electron-builder --win` (genera instalador NSIS + portable)
4. Empaquetado con **Velopack** para actualizaciones delta
5. Publicación en GitHub Releases vía `gh`

### Actualizaciones
- Velopack gestiona actualizaciones delta automáticas
- La BD está en `%APPDATA%/elbrother-pos/` (no se pierde en updates)
- Migración automática desde carpeta local si existe BD antigua

---

## 📊 Historial de Versiones

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 2.5.20 | 2026-04-27 | Corrección definitiva de icono en Windows mediante electron-icon-builder |
| 2.5.19 | 2026-04-27 | Intento de corrección de icono de aplicación en Windows |
| 2.5.18 | 2026-04-27 | Optimización de UI: eliminación de logo redundante en la barra lateral |
| 2.5.17 | 2026-04-27 | Integración de nueva identidad visual (Icono de instalador, Logo en Login y Sidebar) |
| 2.5.16 | 2026-04-27 | Corrección de accesos directos duplicados tras actualización |
| 2.5.15 | 2026-04-27 | Eliminación de la opción de Mantenimiento Crítico en configuración |
| 2.5.14 | 2026-04-26 | Optimización de dependencias nativas y configuración de compilación para SQLite |
| 2.5.13 | 2026-04-26 | Corrección de módulo nativo de SQLite al inicializar aplicación |
| 2.5.12 | 2026-04-26 | Corrección de redondeo de precios y traducción de métodos de pago |
| 2.5.11 | 2026-04-26 | Selector de cliente obligatorio para ventas a crédito (Fiado) en el POS |
| 2.5.10 | 2026-04-26 | Sistema de actualización híbrido interno (Velopack + GitHub API) |
| 2.5.5 | 2026-04-26 | Integración de Velopack para actualizaciones delta automáticas |
| 2.5.4 | 2026-04-25 | Mitigación XSS, auth bcrypt asíncrono, migración a better-sqlite3 |
| 2.5.3 | 2026-04-25 | Tasa BCV manual, límite actividad reciente |
| 2.5.2 | 2026-04-25 | Actividad reciente limitada a 5 items |
| 2.5.1 | 2026-04-24 | Eliminación de compras y proveedores |
| 2.5.0 | 2026-04-24 | Módulo de compras y cuentas por pagar |
| 2.x.x | 2026-04 | Arquitectura Local-First, Velopack |

---

## 📚 Documentación Adicional

- [Modelo de Datos](docs/DATABASE.md)
- [API Reference](docs/API.md)
- [Guía de Usuario](docs/USER_GUIDE.md)
