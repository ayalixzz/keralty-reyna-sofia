import { useState, useEffect } from 'react'
import { getEquipoPorSerie } from '@/api/equipos.api'
import { getMantenimientosDeEquipo } from '@/api/mantenimientos.api'
import { getDocumentosDeEquipo } from '@/api/documentos.api'
import type { Equipo, Mantenimiento, Documento } from '@/types/app.types'

interface UseEquipoResult {
  equipo: Equipo | null
  mantenimientos: Mantenimiento[]
  documentos: Documento[]
  cargando: boolean
  error: string | null
  recargar: () => void
}

// Datos Mock detallados por si falla Supabase
export const MOCK_MANTENIMIENTOS: Record<string, Mantenimiento[]> = {
  '1': [
    {
      id: 'm1',
      equipo_id: '1',
      tipo: 'calibracion',
      fecha: '2024-05-10',
      responsable: 'BIO-CALIBRACIONES S.A.S.',
      observaciones: 'Calibración conforme a estándares INVIMA y fabricante.',
      proximo_vencimiento: '2025-05-10',
      created_at: ''
    },
    {
      id: 'm2',
      equipo_id: '1',
      tipo: 'preventivo',
      fecha: '2024-02-15',
      responsable: 'Ing. Carlos Mendoza',
      observaciones: 'Limpieza interna de circuitos y verificación de parámetros.',
      proximo_vencimiento: null,
      created_at: ''
    }
  ],
  '2': [
    {
      id: 'm3',
      equipo_id: '2',
      tipo: 'preventivo',
      fecha: '2024-04-01',
      responsable: 'Ing. Sandra Restrepo',
      observaciones: 'Ajuste de velocidad y control de rotación.',
      proximo_vencimiento: '2024-10-01',
      created_at: ''
    }
  ],
  '3': [
    {
      id: 'm4',
      equipo_id: '3',
      tipo: 'calibracion',
      fecha: '2023-08-20',
      responsable: 'METRO-MED S.A.',
      observaciones: 'Calibración del sensor de temperatura.',
      proximo_vencimiento: '2024-08-20',
      created_at: ''
    }
  ]
}

export const MOCK_DOCUMENTOS: Record<string, Documento[]> = {
  '1': [
    {
      id: 'd1',
      equipo_id: '1',
      tipo: 'registro_invima',
      nombre: 'Registro Sanitario INVIMA Biodex.pdf',
      fecha_documento: '2021-03-01',
      vence_el: '2031-03-01',
      drive_file_id: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs',
      created_at: ''
    },
    {
      id: 'd2',
      equipo_id: '1',
      tipo: 'manual',
      nombre: 'Manual de Usuario Atomlab 500.pdf',
      fecha_documento: null,
      vence_el: null,
      drive_file_id: '1xyzMVs0XRA5nFMdKvBdBZjgmUUqptlbs',
      created_at: ''
    }
  ]
}

export const MOCK_EQUIPOS: Equipo[] = [
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

export function useEquipo(serie: string | undefined): UseEquipoResult {
  const [equipo, setEquipo]               = useState<Equipo | null>(null)
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([])
  const [documentos, setDocumentos]       = useState<Documento[]>([])
  const [cargando, setCargando]           = useState(false)
  const [error, setError]                 = useState<string | null>(null)
  const [tick, setTick]                   = useState(0)

  useEffect(() => {
    if (!serie) return

    let cancelado = false
    setCargando(true)
    setError(null)

    const cargar = async () => {
      try {
        const eq = await getEquipoPorSerie(serie)
        if (cancelado) return

        if (!eq) {
          // Fallback a Mock si no se encuentra en Supabase
          const mockEq = MOCK_EQUIPOS.find((e) => e.serie === serie)
          if (!mockEq) {
            setError('Equipo no encontrado')
            setEquipo(null)
            return
          }
          setEquipo(mockEq)
          setMantenimientos(MOCK_MANTENIMIENTOS[mockEq.id] ?? [])
          setDocumentos(MOCK_DOCUMENTOS[mockEq.id] ?? [])
          return
        }

        const [mants, docs] = await Promise.all([
          getMantenimientosDeEquipo(eq.id),
          getDocumentosDeEquipo(eq.id),
        ])

        if (!cancelado) {
          setEquipo(eq)
          setMantenimientos(mants)
          setDocumentos(docs)
        }
      } catch (e) {
        if (!cancelado) {
          // Fallback en caso de error de conexión
          const mockEq = MOCK_EQUIPOS.find((e) => e.serie === serie)
          if (mockEq) {
            setEquipo(mockEq)
            setMantenimientos(MOCK_MANTENIMIENTOS[mockEq.id] ?? [])
            setDocumentos(MOCK_DOCUMENTOS[mockEq.id] ?? [])
          } else {
            setError(e instanceof Error ? e.message : 'Error cargando equipo')
          }
        }
      } finally {
        if (!cancelado) setCargando(false)
      }
    }

    void cargar()
    return () => { cancelado = true }
  }, [serie, tick])

  return {
    equipo,
    mantenimientos,
    documentos,
    cargando,
    error,
    recargar: () => setTick((t) => t + 1),
  }
}
