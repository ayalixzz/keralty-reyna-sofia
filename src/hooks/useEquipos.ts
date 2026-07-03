import { useState, useEffect, useCallback } from 'react'
import { buscarEquipos } from '@/api/equipos.api'
import type { Equipo, FiltrosEquipo, Paginacion } from '@/types/app.types'

const POR_PAGINA = 25

// Datos de prueba realistas para el prototipo
const MOCK_EQUIPOS: Equipo[] = [
  {
    id: '1',
    serie: '11050263',
    codigo_institucional: 'CL.141483',
    nombre: 'ACTIVINETRO',
    marca: 'BIODEX',
    modelo: 'ATOMLAB 500',
    registro_invima: 'INVIMA 2021EBC-0008432',
    fecha_adquisicion: '2022-03-15',
    fecha_entrada_servicio: '2022-04-01',
    garantia_meses: 24,
    vida_util_anios: 10,
    modalidad_ingreso: 'compra',
    clasificacion_riesgo: 'IIA',
    clasificacion_biomedica: 'equipo_medico',
    propiedad: 'propio',
    proveedor_id: null,
    numero_contrato: null,
    contrato_inicio: null,
    contrato_fin: null,
    sede_id: 'sede-1',
    area: 'MEDICINA NUCLEAR',
    ubicacion_detalle: 'Consultorio 102',
    ubicacion_documentacion_fisica: 'Archivo central · Sótano 1 · Sección A3',
    responsable_biomedico: 'Ing. Carlos Mendoza',
    estado: 'activo',
    drive_folder_id: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs',
    novedades_calibracion: null,
    novedades_doc: null,
    checklist_mantenimiento: { '2.1': true, '2.2': true },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    sede: { id: 'sede-1', nombre: 'CLÍNICA REINA SOFÍA', ciudad: 'Bogotá', direccion: 'Calle 127', created_at: '' }
  },
  {
    id: '2',
    serie: '1010814100279',
    codigo_institucional: 'CL.139441',
    nombre: 'AGITADOR DE MAZZINI',
    marca: 'BOECO',
    modelo: 'OS-20',
    registro_invima: 'INVIMA 2020EBC-0005121',
    fecha_adquisicion: '2021-06-20',
    fecha_entrada_servicio: '2021-07-05',
    garantia_meses: 12,
    vida_util_anios: 8,
    modalidad_ingreso: 'comodato',
    clasificacion_riesgo: 'I',
    clasificacion_biomedica: 'equipo_apoyo',
    propiedad: 'contrato',
    proveedor_id: null,
    numero_contrato: 'CTR-2021-98A',
    contrato_inicio: '2021-06-01',
    contrato_fin: '2026-06-01',
    sede_id: 'sede-2',
    area: 'LABORATORIO CLÍNICO',
    ubicacion_detalle: 'Área de Hematología',
    ubicacion_documentacion_fisica: 'Archivo central · Sótano 1 · Sección B1',
    responsable_biomedico: 'Ing. Sandra Restrepo',
    estado: 'activo',
    drive_folder_id: '1CxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs',
    novedades_calibracion: null,
    novedades_doc: null,
    checklist_mantenimiento: { '2.1': true, '2.2': false },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    sede: { id: 'sede-2', nombre: 'CLÍNICA REINA SOFÍA PEDIÁTRICA Y MUJER', ciudad: 'Bogotá', direccion: 'Carrera 15', created_at: '' }
  },
  {
    id: '3',
    serie: '2089715',
    codigo_institucional: 'CL.153849',
    nombre: 'AGITADOR DE PLAQUETAS',
    marca: 'HELMER SCIENTIFIC',
    modelo: 'PF15 PRO',
    registro_invima: 'INVIMA 2023EBC-0009110',
    fecha_adquisicion: '2023-01-10',
    fecha_entrada_servicio: '2023-01-25',
    garantia_meses: 36,
    vida_util_anios: 12,
    modalidad_ingreso: 'compra',
    clasificacion_riesgo: 'IIB',
    clasificacion_biomedica: 'equipo_medico',
    propiedad: 'propio',
    proveedor_id: null,
    numero_contrato: null,
    contrato_inicio: null,
    contrato_fin: null,
    sede_id: 'sede-1',
    area: 'TRANSFUSIÓN',
    ubicacion_detalle: 'Banco de Sangre',
    ubicacion_documentacion_fisica: null,
    responsable_biomedico: 'Ing. Carlos Mendoza',
    estado: 'en_mantenimiento',
    drive_folder_id: '1DxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs',
    novedades_calibracion: 'Calibración requerida urgente',
    novedades_doc: null,
    checklist_mantenimiento: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    sede: { id: 'sede-1', nombre: 'CLÍNICA REINA SOFÍA', ciudad: 'Bogotá', direccion: 'Calle 127', created_at: '' }
  }
]

export function useEquipos(filtrosIniciales: FiltrosEquipo = {}) {
  const [equipos, setEquipos]     = useState<Equipo[]>([])
  const [cargando, setCargando]   = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [filtros, setFiltros]     = useState<FiltrosEquipo>(filtrosIniciales)
  const [paginacion, setPaginacion] = useState<Paginacion>({
    pagina: 1, porPagina: POR_PAGINA, total: 0,
  })

  const cargar = useCallback(async (f: FiltrosEquipo, pagina: number) => {
    setCargando(true)
    setError(null)
    try {
      const { data, total } = await buscarEquipos(f, { pagina, porPagina: POR_PAGINA })
      setEquipos(data ?? [])
      setPaginacion((prev) => ({ ...prev, total, pagina }))
    } catch (e) {
      // Fallback si hay error de conexión a Supabase
      let mockFiltered = [...MOCK_EQUIPOS]
      if (f.busqueda) {
        const term = f.busqueda.toLowerCase()
        mockFiltered = mockFiltered.filter(
          (e) =>
            e.nombre.toLowerCase().includes(term) ||
            e.serie.toLowerCase().includes(term) ||
            e.codigo_institucional?.toLowerCase().includes(term)
        )
      }
      setEquipos(mockFiltered)
      setPaginacion({ pagina: 1, porPagina: POR_PAGINA, total: mockFiltered.length })
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar(filtros, 1)
  }, [filtros, cargar])

  const cambiarFiltros = (nuevos: FiltrosEquipo) => {
    setFiltros(nuevos)
  }

  const cambiarPagina = (pagina: number) => {
    void cargar(filtros, pagina)
  }

  return {
    equipos,
    cargando,
    error,
    filtros,
    paginacion,
    cambiarFiltros,
    cambiarPagina,
    recargar: () => cargar(filtros, paginacion.pagina),
  }
}
