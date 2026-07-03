-- La vista pública no exponía drive_folder_id: con el inventario real importado,
-- miles de equipos solo tienen la carpeta completa de Drive (aún sin documentos
-- individuales indexados en la tabla `documentos`), así que la vista pública no
-- tenía forma de enlazarla. drive_folder_id no es sensible (Ley 1581/2012 aplica
-- a datos personales, no a IDs de carpetas), así que es seguro exponerlo.

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
  e.drive_folder_id
from equipos e
join sedes s on s.id = e.sede_id;
