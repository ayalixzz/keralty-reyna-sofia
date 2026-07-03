-- El Tablero reutilizaba el hook paginado de Equipos (25 por página) para calcular
-- sus estadísticas, así que con inventario real (miles de filas) solo contaba la
-- primera página. Esta función agrega los conteos en el servidor, sin traer todas
-- las filas al cliente.

create or replace function get_dashboard_stats()
returns jsonb
language sql
stable
security invoker
as $$
  select jsonb_build_object(
    'total',            (select count(*) from equipos),
    'activos',          (select count(*) from equipos where estado = 'activo'),
    'en_mantenimiento',  (select count(*) from equipos where estado = 'en_mantenimiento'),
    'dado_de_baja',      (select count(*) from equipos where estado = 'dado_de_baja'),
    'propio',            (select count(*) from equipos where propiedad = 'propio'),
    'contrato',          (select count(*) from equipos where propiedad = 'contrato'),
    'proveedor',         (select count(*) from equipos where propiedad = 'proveedor'),
    'sedes_total',       (select count(*) from sedes),
    'por_sede', (
      select coalesce(jsonb_agg(jsonb_build_object('sede', s.nombre, 'total', c.total) order by c.total desc), '[]'::jsonb)
      from (
        select sede_id, count(*) as total
        from equipos
        group by sede_id
        order by count(*) desc
        limit 8
      ) c
      join sedes s on s.id = c.sede_id
    )
  )
$$;

grant execute on function get_dashboard_stats() to authenticated;
