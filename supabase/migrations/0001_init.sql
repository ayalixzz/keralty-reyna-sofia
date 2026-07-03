-- ============================================================
-- KERALTY MEDTRACK — Esquema inicial
-- Sistema de gestión y trazabilidad de equipos médicos
-- Cumple: Resolución 3100/2019, Decreto 4725/2005 (INVIMA), Ley 1581/2012 (Habeas Data)
-- ============================================================

-- ── Tablas base ──────────────────────────────────────────────

create table sedes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  ciudad text not null,
  direccion text,
  created_at timestamptz default now()
);

create table proveedores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  nit text,
  contacto text,
  created_at timestamptz default now()
);

create table equipos (
  id uuid primary key default gen_random_uuid(),
  serie text unique not null,
  codigo_institucional text,
  nombre text not null,
  marca text,
  modelo text,
  registro_invima text,
  fecha_adquisicion date,
  fecha_entrada_servicio date,
  garantia_meses int,
  vida_util_anios int,
  modalidad_ingreso text,
  clasificacion_riesgo text check (clasificacion_riesgo in ('I','IIA','IIB','III')),
  clasificacion_biomedica text,
  propiedad text not null default 'propio' check (propiedad in ('propio','contrato','proveedor')),
  proveedor_id uuid references proveedores(id),
  numero_contrato text,
  contrato_inicio date,
  contrato_fin date,
  sede_id uuid not null references sedes(id),
  area text,
  ubicacion_detalle text,
  responsable_biomedico text,
  estado text not null default 'activo' check (estado in ('activo','en_mantenimiento','dado_de_baja')),
  drive_folder_id text,
  novedades_calibracion text,
  novedades_doc text,
  checklist_mantenimiento jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index equipos_sede_id_idx on equipos(sede_id);
create index equipos_serie_idx on equipos(serie);

create table documentos (
  id uuid primary key default gen_random_uuid(),
  equipo_id uuid not null references equipos(id) on delete cascade,
  tipo text not null check (tipo in ('documentacion','mantenimiento','correctivo','calibracion','manual','registro_invima')),
  nombre text not null,
  fecha_documento date,
  vence_el date,
  drive_file_id text,
  created_at timestamptz default now()
);

create index documentos_equipo_id_idx on documentos(equipo_id);

create table mantenimientos (
  id uuid primary key default gen_random_uuid(),
  equipo_id uuid not null references equipos(id) on delete cascade,
  tipo text not null check (tipo in ('preventivo','correctivo','calibracion')),
  fecha date not null,
  responsable text,
  observaciones text,
  proximo_vencimiento date,
  created_at timestamptz default now(),
  unique (equipo_id, tipo, fecha)
);

create index mantenimientos_equipo_id_idx on mantenimientos(equipo_id);

create table usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  nombre text,
  rol text not null default 'lector' check (rol in ('admin','editor','lector')),
  notificaciones_email boolean not null default false,
  created_at timestamptz default now()
);

create table auditoria (
  id uuid primary key default gen_random_uuid(),
  tabla text not null,
  registro_id uuid,
  accion text not null, -- INSERT | UPDATE | DELETE
  usuario_id uuid references usuarios(id),
  fecha timestamptz default now(),
  detalle jsonb
);

-- updated_at automático en equipos
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger equipos_set_updated_at
  before update on equipos
  for each row execute function set_updated_at();

-- ── Vista de alertas de calibración/mantenimiento (personal autenticado) ──

create view v_alertas as
select
  e.id, e.serie, e.nombre, e.codigo_institucional,
  s.nombre as sede,
  m.tipo, m.proximo_vencimiento,
  case
    when m.proximo_vencimiento < current_date then 'vencida'
    when m.proximo_vencimiento <= current_date + 30 then 'por_vencer'
    else 'vigente'
  end as estado_calibracion
from mantenimientos m
join equipos e on e.id = m.equipo_id
join sedes s on s.id = e.sede_id
where m.proximo_vencimiento is not null;

-- ============================================================
-- Row Level Security
-- ============================================================

alter table sedes           enable row level security;
alter table proveedores     enable row level security;
alter table equipos         enable row level security;
alter table documentos      enable row level security;
alter table mantenimientos  enable row level security;
alter table usuarios        enable row level security;
alter table auditoria       enable row level security;

-- Helper: rol del usuario autenticado actual
create or replace function auth_rol()
returns text language sql stable security definer as $$
  select rol from usuarios where id = auth.uid()
$$;

-- Lectura general para cualquier usuario autenticado y activo en `usuarios`
create policy "autenticados_select_sedes" on sedes
  for select using (auth.uid() is not null);
create policy "autenticados_select_proveedores" on proveedores
  for select using (auth.uid() is not null);
create policy "autenticados_select_equipos" on equipos
  for select using (auth.uid() is not null);
create policy "autenticados_select_documentos" on documentos
  for select using (auth.uid() is not null);
create policy "autenticados_select_mantenimientos" on mantenimientos
  for select using (auth.uid() is not null);

-- Escritura: solo admin/editor
create policy "editor_admin_write_equipos" on equipos
  for all using (auth_rol() in ('admin','editor')) with check (auth_rol() in ('admin','editor'));
create policy "editor_admin_write_documentos" on documentos
  for all using (auth_rol() in ('admin','editor')) with check (auth_rol() in ('admin','editor'));
create policy "editor_admin_write_mantenimientos" on mantenimientos
  for all using (auth_rol() in ('admin','editor')) with check (auth_rol() in ('admin','editor'));
create policy "editor_admin_write_sedes" on sedes
  for all using (auth_rol() in ('admin','editor')) with check (auth_rol() in ('admin','editor'));
create policy "editor_admin_write_proveedores" on proveedores
  for all using (auth_rol() in ('admin','editor')) with check (auth_rol() in ('admin','editor'));

-- Usuarios: cada quien ve su propio perfil; admin ve y gestiona todos
create policy "usuarios_select_propio" on usuarios
  for select using (id = auth.uid() or auth_rol() = 'admin');
create policy "admin_write_usuarios" on usuarios
  for all using (auth_rol() = 'admin') with check (auth_rol() = 'admin');

-- Auditoría: solo admin lee, cualquier autenticado puede insertar su propia acción
create policy "admin_select_auditoria" on auditoria
  for select using (auth_rol() = 'admin');
create policy "autenticados_insert_auditoria" on auditoria
  for insert with check (auth.uid() is not null);

-- ============================================================
-- Vista pública para el QR físico del equipo (sin login)
-- Expone SOLO identificación, ubicación y estado — nunca datos de
-- contrato/proveedor, responsable biomédico, novedades ni auditoría
-- (Ley 1581/2012 - Habeas Data). Las vistas corren con los permisos
-- del owner, así que `anon` puede leerlas aunque no tenga acceso
-- directo a las tablas base.
-- ============================================================

create view v_equipo_publico as
select
  e.id,
  e.serie,
  e.codigo_institucional,
  e.nombre,
  e.marca,
  e.modelo,
  e.registro_invima,
  e.clasificacion_riesgo,
  e.estado,
  e.area,
  e.ubicacion_detalle,
  s.nombre    as sede_nombre,
  s.ciudad    as sede_ciudad,
  s.direccion as sede_direccion
from equipos e
join sedes s on s.id = e.sede_id;

create view v_documento_publico as
select id, equipo_id, tipo, nombre, fecha_documento, vence_el, drive_file_id
from documentos;

grant usage on schema public to anon;
grant select on v_equipo_publico to anon;
grant select on v_documento_publico to anon;
