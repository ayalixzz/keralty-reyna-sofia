-- Ubicación física de la documentación en papel (archivo/sótano/sección), distinta
-- de la ubicación del equipo (`area`/`ubicacion_detalle`). Corresponde a la columna
-- "UBICACION EN LA ACETA" del Excel de inventario (viene vacía en Zona Norte hoy,
-- pero el campo queda listo para cuando se diligencie).

alter table equipos add column ubicacion_documentacion_fisica text;

-- Se agrega también a la vista pública del QR: no es un dato sensible y es
-- justamente lo que alguien que escanea el QR físico necesita para encontrar
-- el expediente en papel del equipo.
create or replace view v_equipo_publico as
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
  s.direccion as sede_direccion,
  e.drive_folder_id,
  e.ubicacion_documentacion_fisica
from equipos e
join sedes s on s.id = e.sede_id;
