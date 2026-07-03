# Keralty MedTrack 🩺

Sistema de gestión, trazabilidad y hoja de vida de equipos médicos para **Keralty / Colsanitas**.

Este proyecto está diseñado para cumplir con la **Resolución 3100 de 2019** (habilitación en salud en Colombia), el **Decreto 4725 de 2005** (clasificación de riesgo INVIMA) y la **Ley 1581 de 2012** (Habeas Data).

---

## 📋 Estado de Desarrollo (Para Claude Code / Desarrolladores)

Este repositorio ha sido estructurado siguiendo principios de arquitectura limpia. A continuación, se detalla qué se ha construido y qué tareas están pendientes para completar la implementación:

### ✅ Implementado (Listo)
*   **Arquitectura Base:** Configuración de Vite con React y TypeScript, ruteo jerárquico dinámico y lazy loading de páginas.
*   **Design System:** Hojas de estilo unificadas en `index.css` usando tokens de Tailwind v4 adaptados al branding oscuro corporativo. Componentes comunes: `Button`, `Badge`, `Input`, `Select`, `Textarea`, `Modal`, `Spinner`.
*   **Capa de Integración (API & Hooks):** Clientes de Supabase y hooks de consulta para sedes, equipos, historial de mantenimientos y alertas de vencimientos.
*   **Vistas Principales:**
    *   `LoginPage`: Autenticación con email corporativo `@colsanitas.com`.
    *   `DashboardPage`: Resumen del inventario en tiempo real con widgets gráficos (Recharts) y listado directo de alertas.
    *   `FichaEquipoPage`: Hoja de vida digital del equipo médico con su historial de mantenimiento cronológico completo (Res. 3100) e información INVIMA.

### ⏳ Pendiente por Implementar (Lo que falta)
1.  **Migraciones SQL en Supabase (`supabase/migrations/`):** Crear los scripts de creación de tablas, triggers de auditoría, políticas RLS y la vista de alertas.
2.  **Pantalla de Códigos QR (`QRPage.tsx`):** Vista para generar códigos QR de forma unitaria y por lotes (exportación ZIP con PNGs de los códigos).
3.  **Panel de Administración (`AdminPage.tsx`):** Gestión y asignación de roles a usuarios (`admin`, `editor`, `lector`) y activación de alertas por correo.
4.  **Edge Functions (`supabase/functions/`):**
    *   `drive-proxy`: Endpoints para listar de forma segura los archivos de la carpeta del equipo sin exponer la cuenta de servicio de Google en el cliente.
    *   `alertas-email`: Script calendarizado para enviar correos automáticos cuando la calibración de un equipo esté por vencer.
5.  **Script de Importación (`scripts/import-excel.ts`):** Script idempotente en TypeScript para parsear el Excel de inventario actual y poblar las tablas.

---

## 📁 Estructura del Proyecto

```text
aplicativo keralty/
├── src/
│   ├── api/                 # Capa de comunicación con Supabase
│   │   ├── auth.api.ts      # Gestión de sesiones y roles de usuario
│   │   ├── documentos.api.ts# Referencias de archivos en Drive
│   │   ├── equipos.api.ts   # Consultas del inventario médico
│   │   ├── mantenimientos.api.ts
│   │   ├── sedes.api.ts
│   │   └── supabase.ts      # Cliente singleton inicializado
│   ├── components/
│   │   ├── layout/          # Elementos estructurales (Sidebar, Layout base)
│   │   └── ui/              # Componentes de diseño (Button, Badge, Input, Modal, Spinner)
│   ├── hooks/               # Custom hooks de react-query/state pattern
│   ├── pages/               # Páginas de la SPA
│   │   ├── AdminPage.tsx    # Gestión de usuarios (RBAC) - PENDIENTE
│   │   ├── DashboardPage.tsx# KPIs, alertas próximas y gráficos
│   │   ├── EquiposPage.tsx  # Búsqueda global, filtros y paginación
│   │   ├── FichaEquipoPage.tsx # Hoja de vida digital normativa
│   │   ├── LoginPage.tsx    # Login corporativo
│   │   └── QRPage.tsx       # Generación e impresión de QRs - PENDIENTE
│   ├── router/              # Configuración de React Router y Protected Routes
│   ├── stores/              # Zustand para estado global (Auth y UI)
│   ├── types/               # Tipos estrictos de TS compartidos
│   ├── utils/               # Funciones útiles (fechas, parseo de Drive, QRs)
│   ├── index.css            # Estilos generales y variables del tema
│   └── main.tsx
│
├── supabase/                # Estructura del backend Supabase
│   ├── migrations/          # Archivos SQL ordenados cronológicamente - PENDIENTE
│   └── seed.sql             # Datos de prueba realistas - PENDIENTE
│
├── scripts/                 # Scripts auxiliares de Node.js
│   ├── import-excel.ts      # Script de importación idempotente - PENDIENTE
│   └── import-config.json   # Configuración de mapeo de columnas - PENDIENTE
│
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 🗄️ Especificaciones del Modelo de Datos (Supabase / Postgres)

Para desplegar las tablas en la base de datos de Supabase, utiliza los siguientes esquemas sugeridos en tus archivos de migración:

### Esquema Físico (Tablas principales)

```sql
-- 1. Sedes
CREATE TABLE sedes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  ciudad text NOT NULL,
  direccion text,
  created_at timestamptz DEFAULT now()
);

-- 2. Proveedores
CREATE TABLE proveedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  nit text,
  contacto text,
  created_at timestamptz DEFAULT now()
);

-- 3. Equipos
CREATE TABLE equipos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  serie text UNIQUE NOT NULL,
  codigo_institucional text UNIQUE,
  nombre text NOT NULL,
  marca text,
  modelo text,
  registro_invima text,
  fecha_adquisicion date,
  fecha_entrada_servicio date,
  garantia_meses int,
  vida_util_anios int,
  modalidad_ingreso text,              -- compra | donacion | comodato
  clasificacion_riesgo text CHECK (clasificacion_riesgo IN ('I','IIA','IIB','III')),
  clasificacion_biomedica text,
  propiedad text NOT NULL CHECK (propiedad IN ('propio','contrato','proveedor')),
  proveedor_id uuid REFERENCES proveedores(id),
  numero_contrato text,
  contrato_inicio date,
  contrato_fin date,
  sede_id uuid NOT NULL REFERENCES sedes(id),
  area text,
  ubicacion_detalle text,
  responsable_biomedico text,
  estado text DEFAULT 'activo' CHECK (estado IN ('activo','en_mantenimiento','dado_de_baja')),
  drive_folder_id text,
  novedades_calibracion text,
  novedades_doc text,
  checklist_mantenimiento jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Documentos
CREATE TABLE documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipo_id uuid NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('documentacion','mantenimiento','correctivo','calibracion','manual','registro_invima')),
  nombre text NOT NULL,
  fecha_documento date,
  vence_el date,
  drive_file_id text,
  created_at timestamptz DEFAULT now()
);

-- 5. Mantenimientos
CREATE TABLE mantenimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipo_id uuid NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('preventivo','correctivo','calibracion')),
  fecha date NOT NULL,
  responsable text,
  observaciones text,
  proximo_vencimiento date,
  created_at timestamptz DEFAULT now()
);

-- 6. Usuarios
CREATE TABLE usuarios (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  nombre text,
  rol text DEFAULT 'lector' CHECK (rol IN ('admin','editor','lector')),
  notificaciones_email boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 7. Auditoría
CREATE TABLE auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabla text NOT NULL,
  registro_id uuid,
  accion text NOT NULL, -- INSERT | UPDATE | DELETE
  usuario_id uuid REFERENCES usuarios(id),
  fecha timestamptz DEFAULT now(),
  detalle jsonb
);
```

### Vista para Alertas de Calibración
```sql
CREATE VIEW v_alertas AS
SELECT
  e.id, e.serie, e.nombre, e.codigo_institucional,
  s.nombre AS sede,
  m.tipo, m.proximo_vencimiento,
  CASE
    WHEN m.proximo_vencimiento < CURRENT_DATE THEN 'vencida'
    WHEN m.proximo_vencimiento <= CURRENT_DATE + 30 THEN 'por_vencer'
    ELSE 'vigente'
  END AS estado_calibracion
FROM mantenimientos m
JOIN equipos e ON e.id = m.equipo_id
JOIN sedes s ON s.id = e.sede_id
WHERE m.proximo_vencimiento IS NOT NULL;
```

---

## 🔑 Configuración de Google Drive (Cuenta de Servicio)

Los archivos permanecen en las carpetas corporativas de Google Drive de la organización. Para que la aplicación pueda listar y mostrar documentos:

1.  Crea un proyecto en **Google Cloud Console**.
2.  Habilita la **Google Drive API**.
3.  Crea una **Cuenta de Servicio (Service Account)** y genera una clave privada en formato JSON.
4.  Comparte las carpetas maestras de Google Drive del hospital con el correo electrónico de la Cuenta de Servicio (permiso de *Lector*).
5.  Las credenciales JSON de la cuenta de servicio deben guardarse únicamente como variable de entorno de las Edge Functions de Supabase (`DRIVE_SERVICE_ACCOUNT_JSON`), garantizando que la clave nunca se exponga al navegador web.

---

## 📥 Especificación del Script de Importación de Excel

El script a programar en `scripts/import-excel.ts` debe contemplar:

*   **Librerías:** Usar `xlsx` para la lectura de los datos.
*   **Conexión a BD:** Utilizar el cliente de Supabase usando la `SUPABASE_SERVICE_ROLE_KEY` para saltarse las restricciones RLS temporalmente durante la migración inicial.
*   **Lógica de Negocio en la Importación:**
    1.  Si la Sede en el Excel no existe en la tabla `sedes`, se crea en caliente (upsert).
    2.  Mapear la columna `LINK ORGANIZADO` para extraer el ID de carpeta de Google Drive usando expresiones regulares.
    3.  Almacenar las columnas del protocolo de verificación (`2.1` a `2.9`+) como un objeto JSON estructurado en el campo `checklist_mantenimiento`.
    4.  Mapear la propiedad: `COMODATO` -> `contrato`, cualquier otro valor o vacío -> `propio`.

---

## ⚙️ Configuración del Entorno Local

1.  Copia el archivo de ejemplo para las variables:
    ```bash
    cp .env.example .env
    ```
2.  Agrega tus claves de Supabase correspondientes.
3.  Instala las dependencias y ejecuta el servidor de desarrollo:
    ```bash
    npm install
    npm run dev
    ```
