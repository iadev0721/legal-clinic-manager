"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shadcn/dialog";
import { getSolicitanteCompleto } from "@/actions/solicitantes";
import { getCasosBySolicitante } from "@/actions/casos";
import { useRouter } from "next/navigation";
import { DownloadApplicantReportButton } from "@/components/DownloadApplicantReportButton";

interface ApplicantDetailsModalProps {
  open: boolean;
  onClose: () => void;
  cedulaSolicitante: string | null;
}

export default function ApplicantDetailsModal({
  open,
  onClose,
  cedulaSolicitante,
}: ApplicantDetailsModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [solicitante, setSolicitante] = useState<any>(null);
  const [casos, setCasos] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && cedulaSolicitante) {
      loadData();
    }
  }, [open, cedulaSolicitante]);

  const loadData = async () => {
    if (!cedulaSolicitante) return;

    setLoading(true);
    setError(null);

    try {
      const [solicitanteRes, casosRes] = await Promise.all([
        getSolicitanteCompleto(cedulaSolicitante),
        getCasosBySolicitante(cedulaSolicitante),
      ]);

      if (solicitanteRes.success && solicitanteRes.data) {
        setSolicitante(solicitanteRes.data);
      } else {
        setError(solicitanteRes.error || "Error al cargar datos del solicitante");
      }

      if (casosRes.success && casosRes.data) {
        setCasos(casosRes.data);
      }
    } catch (err: any) {
      setError(err.message || "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const calcularEdad = (fechaNacimiento: string) => {
    if (!fechaNacimiento) return "N/A";
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  };

  if (!cedulaSolicitante) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sky-950 text-3xl font-semibold flex items-center gap-3">
            <span className="icon-[mdi--account-details] text-4xl text-[#3E7DBB]"></span>
            Detalles del Solicitante
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-sky-950 text-lg">Cargando información...</div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-2 border-red-400 rounded-xl p-4">
            <p className="text-red-800 font-semibold">{error}</p>
          </div>
        ) : solicitante ? (
          <div className="space-y-6 py-4">
            {/* Información Personal */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl p-6 border-2 border-[#3E7DBB]/20">
              <h3 className="text-sky-950 text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="icon-[mdi--account] text-2xl text-[#3E7DBB]"></span>
                Información Personal
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sky-950/70 text-sm font-semibold">
                    Nombre Completo
                  </label>
                  <p className="text-sky-950 text-lg font-bold">
                    {solicitante.nombres} {solicitante.apellidos}
                  </p>
                </div>
                <div>
                  <label className="text-sky-950/70 text-sm font-semibold">
                    Cédula de Identidad
                  </label>
                  <p className="text-sky-950 text-lg font-bold">
                    {solicitante.cedula_solicitante}
                  </p>
                </div>
                <div>
                  <label className="text-sky-950/70 text-sm font-semibold">
                    Fecha de Nacimiento
                  </label>
                  <p className="text-sky-950 text-lg font-semibold">
                    {solicitante.fecha_nacimiento
                      ? new Date(solicitante.fecha_nacimiento).toLocaleDateString("es-ES", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "N/A"}{" "}
                    ({calcularEdad(solicitante.fecha_nacimiento)} años)
                  </p>
                </div>
                <div>
                  <label className="text-sky-950/70 text-sm font-semibold">
                    Sexo
                  </label>
                  <p className="text-sky-950 text-lg font-semibold">
                    {solicitante.sexo === "M" ? "Masculino" : solicitante.sexo === "F" ? "Femenino" : "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sky-950/70 text-sm font-semibold">
                    Nacionalidad
                  </label>
                  <p className="text-sky-950 text-lg font-semibold">
                    {solicitante.nacionalidad === "V" ? "Venezolano" : solicitante.nacionalidad === "E" ? "Extranjero" : "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sky-950/70 text-sm font-semibold">
                    Estado Civil
                  </label>
                  <p className="text-sky-950 text-lg font-semibold">
                    {solicitante.estado_civil || "N/A"}
                    {solicitante.en_concubinato && " (En concubinato)"}
                  </p>
                </div>
                <div>
                  <label className="text-sky-950/70 text-sm font-semibold">
                    Teléfono Local
                  </label>
                  <p className="text-sky-950 text-lg font-semibold">
                    {solicitante.telefono_local || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sky-950/70 text-sm font-semibold">
                    Teléfono Celular
                  </label>
                  <p className="text-sky-950 text-lg font-semibold">
                    {solicitante.telefono_celular || "N/A"}
                  </p>
                </div>
                <div className="col-span-2">
                  <label className="text-sky-950/70 text-sm font-semibold">
                    Correo Electrónico
                  </label>
                  <p className="text-sky-950 text-lg font-semibold">
                    {solicitante.correo_electronico || "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* Ubicación */}
            {solicitante.nombre_parroquia && (
              <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-2xl p-6 border-2 border-green-500/20">
                <h3 className="text-sky-950 text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="icon-[mdi--map-marker] text-2xl text-green-600"></span>
                  Ubicación
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sky-950/70 text-sm font-semibold">
                      Estado
                    </label>
                    <p className="text-sky-950 text-lg font-semibold">
                      {solicitante.nombre_estado || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sky-950/70 text-sm font-semibold">
                      Municipio
                    </label>
                    <p className="text-sky-950 text-lg font-semibold">
                      {solicitante.nombre_municipio || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sky-950/70 text-sm font-semibold">
                      Parroquia
                    </label>
                    <p className="text-sky-950 text-lg font-semibold">
                      {solicitante.nombre_parroquia || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Educación y Trabajo */}
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-2xl p-6 border-2 border-purple-500/20">
              <h3 className="text-sky-950 text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="icon-[mdi--school] text-2xl text-purple-600"></span>
                Educación y Situación Laboral
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sky-950/70 text-sm font-semibold">
                    Nivel Educativo
                  </label>
                  <p className="text-sky-950 text-lg font-semibold">
                    {solicitante.nivel_educativo_desc || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sky-950/70 text-sm font-semibold">
                    Tiempo de Educación
                  </label>
                  <p className="text-sky-950 text-lg font-semibold">
                    {solicitante.cantidad_tiempo_educacion
                      ? `${solicitante.cantidad_tiempo_educacion} ${solicitante.tipo_periodo_educacion || "años"}`
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sky-950/70 text-sm font-semibold">
                    Condición Laboral
                  </label>
                  <p className="text-sky-950 text-lg font-semibold">
                    {solicitante.condicion_trabajo || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sky-950/70 text-sm font-semibold">
                    Actividad
                  </label>
                  <p className="text-sky-950 text-lg font-semibold">
                    {solicitante.condicion_actividad || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sky-950/70 text-sm font-semibold">
                    Buscando Trabajo
                  </label>
                  <p className="text-sky-950 text-lg font-semibold">
                    {solicitante.buscando_trabajo ? "Sí" : "No"}
                  </p>
                </div>
              </div>
            </div>

            {/* Vivienda */}
            {solicitante.vivienda && (
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-2xl p-6 border-2 border-orange-500/20">
                <h3 className="text-sky-950 text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="icon-[mdi--home] text-2xl text-orange-600"></span>
                  Vivienda
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sky-950/70 text-sm font-semibold">
                      Tipo de Vivienda
                    </label>
                    <p className="text-sky-950 text-lg font-semibold">
                      {solicitante.vivienda.tipo_vivienda || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sky-950/70 text-sm font-semibold">
                      Habitaciones
                    </label>
                    <p className="text-sky-950 text-lg font-semibold">
                      {solicitante.vivienda.cantidad_habitaciones || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sky-950/70 text-sm font-semibold">
                      Baños
                    </label>
                    <p className="text-sky-950 text-lg font-semibold">
                      {solicitante.vivienda.cantidad_banos || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sky-950/70 text-sm font-semibold">
                      Material del Piso
                    </label>
                    <p className="text-sky-950 text-lg font-semibold">
                      {solicitante.vivienda.material_piso || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sky-950/70 text-sm font-semibold">
                      Material de Paredes
                    </label>
                    <p className="text-sky-950 text-lg font-semibold">
                      {solicitante.vivienda.material_paredes || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sky-950/70 text-sm font-semibold">
                      Material del Techo
                    </label>
                    <p className="text-sky-950 text-lg font-semibold">
                      {solicitante.vivienda.material_techo || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sky-950/70 text-sm font-semibold">
                      Agua Potable
                    </label>
                    <p className="text-sky-950 text-lg font-semibold">
                      {solicitante.vivienda.agua_potable || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sky-950/70 text-sm font-semibold">
                      Eliminación de Aguas
                    </label>
                    <p className="text-sky-950 text-lg font-semibold">
                      {solicitante.vivienda.eliminacion_aguas || "N/A"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sky-950/70 text-sm font-semibold">
                      Aseo Urbano
                    </label>
                    <p className="text-sky-950 text-lg font-semibold">
                      {solicitante.vivienda.aseo_urbano || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Familia/Hogar */}
            {solicitante.familia && (
              <div className="bg-gradient-to-r from-pink-50 to-pink-100 rounded-2xl p-6 border-2 border-pink-500/20">
                <h3 className="text-sky-950 text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="icon-[mdi--account-group] text-2xl text-pink-600"></span>
                  Familia y Hogar
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sky-950/70 text-sm font-semibold">
                      Cantidad de Personas
                    </label>
                    <p className="text-sky-950 text-lg font-bold">
                      {solicitante.familia.cantidad_personas || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sky-950/70 text-sm font-semibold">
                      Trabajadores
                    </label>
                    <p className="text-sky-950 text-lg font-semibold">
                      {solicitante.familia.cantidad_trabajadores || 0}
                    </p>
                  </div>
                  <div>
                    <label className="text-sky-950/70 text-sm font-semibold">
                      Niños
                    </label>
                    <p className="text-sky-950 text-lg font-semibold">
                      {solicitante.familia.cantidad_ninos || 0}
                    </p>
                  </div>
                  <div>
                    <label className="text-sky-950/70 text-sm font-semibold">
                      Niños Estudiando
                    </label>
                    <p className="text-sky-950 text-lg font-semibold">
                      {solicitante.familia.cantidad_ninos_estudiando || 0}
                    </p>
                  </div>
                  <div>
                    <label className="text-sky-950/70 text-sm font-semibold">
                      Ingreso Mensual Aproximado
                    </label>
                    <p className="text-sky-950 text-lg font-semibold">
                      {solicitante.familia.ingreso_mensual_aprox
                        ? `Bs. ${solicitante.familia.ingreso_mensual_aprox.toLocaleString()}`
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sky-950/70 text-sm font-semibold">
                      Es Jefe de Hogar
                    </label>
                    <p className="text-sky-950 text-lg font-semibold">
                      {solicitante.familia.es_jefe_hogar ? "Sí" : "No"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sky-950/70 text-sm font-semibold">
                      Nivel Educativo del Jefe
                    </label>
                    <p className="text-sky-950 text-lg font-semibold">
                      {solicitante.familia.nivel_educativo_jefe_desc || solicitante.nivel_educativo_jefe_desc || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Bienes */}
            {solicitante.bienes && solicitante.bienes.length > 0 && (
              <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-2xl p-6 border-2 border-yellow-500/20">
                <h3 className="text-sky-950 text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="icon-[mdi--package-variant] text-2xl text-yellow-600"></span>
                  Bienes
                </h3>
                <div className="flex flex-wrap gap-2">
                  {solicitante.bienes.map((bien: any, index: number) => (
                    <span
                      key={index}
                      className="bg-white px-4 py-2 rounded-lg text-sky-950 font-semibold border border-yellow-300"
                    >
                      {bien.descripcion}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Casos Relacionados */}
            <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-2xl p-6 border-2 border-indigo-500/20">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sky-950 text-xl font-semibold flex items-center gap-2">
                  <span className="icon-[mdi--gavel] text-2xl text-indigo-600"></span>
                  Casos Relacionados ({casos.length})
                </h3>
                <button
                  onClick={() => {
                    router.push(`/cases?applicantId=${cedulaSolicitante}`);
                    onClose();
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                >
                  <span className="icon-[mdi--arrow-right] text-xl"></span>
                  Ver Todos
                </button>
              </div>
              {casos.length > 0 ? (
                <div className="space-y-3">
                  {casos.slice(0, 5).map((caso: any) => (
                    <div
                      key={caso.nro_caso}
                      className="bg-white p-4 rounded-xl border border-indigo-200 hover:border-indigo-400 transition-colors cursor-pointer"
                      onClick={() => {
                        router.push(`/cases?caseId=${caso.nro_caso}`);
                        onClose();
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-sky-950">
                            Caso #{caso.nro_caso.toString().padStart(6, "0")}
                          </p>
                          <p className="text-sm text-sky-950/70">
                            {caso.nombre_materia} - {caso.nombre_tramite}
                          </p>
                          <p className="text-xs text-sky-950/50 mt-1">
                            {caso.fecha_caso_inicio
                              ? new Date(caso.fecha_caso_inicio).toLocaleDateString("es-ES")
                              : "N/A"}
                          </p>
                        </div>
                        <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">
                          {caso.estatus_actual || "Sin estatus"}
                        </span>
                      </div>
                    </div>
                  ))}
                  {casos.length > 5 && (
                    <p className="text-sm text-sky-950/60 text-center">
                      Y {casos.length - 5} caso(s) más...
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sky-950/60 text-center py-4">
                  No hay casos registrados para este solicitante
                </p>
              )}
            </div>
          </div>
        ) : null}

        <div className="flex justify-end gap-3 pt-4 border-t">
          {solicitante && (
            <DownloadApplicantReportButton
              applicantId={solicitante.cedula_solicitante}
              applicantName={`${solicitante.nombres} ${solicitante.apellidos}`}
            />
          )}
          <button
            onClick={onClose}
            className="px-6 py-3 bg-neutral-200 hover:bg-neutral-300 rounded-2xl text-sky-950 text-lg font-semibold transition-all duration-300 hover:scale-105"
          >
            Cerrar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

