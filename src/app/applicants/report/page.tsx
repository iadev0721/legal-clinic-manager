"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { getSolicitanteCompleto } from "@/actions/solicitantes";
import { getCasosBySolicitante } from "@/actions/casos";

function ReportContent() {
    const searchParams = useSearchParams();
    const applicantId = searchParams.get("applicantId");
    
    const [solicitante, setSolicitante] = useState<any>(null);
    const [casos, setCasos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (applicantId) {
            Promise.all([
                getSolicitanteCompleto(applicantId),
                getCasosBySolicitante(applicantId)
            ]).then(([solRes, casosRes]) => {
                if (solRes.success && solRes.data) {
                    setSolicitante(solRes.data);
                } else {
                    setError(solRes.error || "No se encontró el solicitante.");
                }
                if (casosRes.success && casosRes.data) {
                    setCasos(casosRes.data);
                }
            }).catch(err => {
                setError(err.message || "Error al cargar datos.");
            }).finally(() => {
                setLoading(false);
            });
        } else {
            setLoading(false);
            setError("No se proporcionó la cédula del solicitante.");
        }
    }, [applicantId]);

    const pageStyle = {
        width: "210mm", // A4
        minHeight: "297mm",
        padding: "20mm",
        backgroundColor: "white",
        margin: "0 auto",
        color: "#0c1e33", // sky-950
    };

    if (loading) return <div className="p-10 text-center">Cargando datos del reporte...</div>;
    if (error || !solicitante) return <div className="p-10 text-center text-red-500">{error || "No se encontró la información."}</div>;

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

    return (
        <div className="bg-gray-100 py-10 print:p-0 print:bg-white flex flex-col gap-10">
            {/* Page 1: General Info, Location & Education */}
            <div id="applicant-report-page-1" style={{...pageStyle, minHeight: 'unset', height: '297mm'}} className="shadow-lg mb-0 print:shadow-none print:mb-0 relative overflow-hidden flex flex-col">
                {/* Header Decor */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-10 -mt-10 opacity-50"></div>

                <div className="flex justify-between items-start border-b-4 border-blue-600 pb-6 mb-8 shrink-0">
                    <div>
                        <h1 className="text-4xl font-bold text-sky-950 uppercase tracking-tight">Reporte de Solicitante</h1>
                        <p className="text-blue-600 font-semibold text-lg">Clínica Jurídica UCAB</p>
                    </div>
                    <div className="text-right">
                        <div className="bg-sky-950 text-white px-4 py-2 rounded-lg font-bold text-xl mb-1">
                            C.I. {solicitante.cedula_solicitante}
                        </div>
                        <p className="text-sm text-gray-500 font-medium">Fecha de Emisión: {new Date().toLocaleString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden">
                    {/* Información Personal */}
                    <section className="mb-6">
                        <h2 className="text-2xl font-bold text-sky-950 mb-3 flex items-center gap-2 border-l-4 border-blue-600 pl-3">
                            Información Personal
                        </h2>
                        <div className="grid grid-cols-2 gap-y-3 gap-x-6 bg-gray-50 p-5 rounded-2xl">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Nombre Completo</label>
                                <p className="text-lg font-semibold">{solicitante.nombres} {solicitante.apellidos}</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Cédula de Identidad</label>
                                <p className="text-lg font-semibold">{solicitante.cedula_solicitante}</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Fecha de Nacimiento</label>
                                <p className="text-md font-medium">
                                    {solicitante.fecha_nacimiento ? new Date(solicitante.fecha_nacimiento).toLocaleDateString("es-VE") : 'N/A'} ({calcularEdad(solicitante.fecha_nacimiento)} años)
                                </p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Género y Nacionalidad</label>
                                <p className="text-md font-medium">
                                    {solicitante.sexo === "M" ? "Masculino" : solicitante.sexo === "F" ? "Femenino" : "N/A"} - {solicitante.nacionalidad === "V" ? "Venezolano" : solicitante.nacionalidad === "E" ? "Extranjero" : "N/A"}
                                </p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Estado Civil</label>
                                <p className="text-md font-medium">{solicitante.estado_civil || "N/A"}{solicitante.en_concubinato ? " (En concubinato)" : ""}</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Teléfonos</label>
                                <p className="text-md font-medium">Cel: {solicitante.telefono_celular || 'N/A'} / Loc: {solicitante.telefono_local || 'N/A'}</p>
                            </div>
                            <div className="col-span-2">
                                <label className="text-xs font-bold text-gray-500 uppercase">Correo Electrónico</label>
                                <p className="text-md font-medium">{solicitante.correo_electronico || 'N/A'}</p>
                            </div>
                        </div>
                    </section>

                    {/* Ubicación */}
                    {solicitante.nombre_parroquia && (
                        <section className="mb-6">
                            <h2 className="text-2xl font-bold text-sky-950 mb-3 flex items-center gap-2 border-l-4 border-blue-600 pl-3">
                                Ubicación
                            </h2>
                            <div className="grid grid-cols-3 gap-y-3 gap-x-6 bg-blue-50/40 p-5 rounded-2xl">
                                <div>
                                    <label className="text-xs font-bold text-blue-600 uppercase">Estado</label>
                                    <p className="text-md font-semibold text-gray-800">{solicitante.nombre_estado || "N/A"}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-blue-600 uppercase">Municipio</label>
                                    <p className="text-md font-semibold text-gray-800">{solicitante.nombre_municipio || "N/A"}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-blue-600 uppercase">Parroquia</label>
                                    <p className="text-md font-semibold text-gray-800">{solicitante.nombre_parroquia || "N/A"}</p>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Educación y Situación Laboral */}
                    <section>
                        <h2 className="text-2xl font-bold text-sky-950 mb-3 flex items-center gap-2 border-l-4 border-blue-600 pl-3">
                            Educación y Situación Laboral
                        </h2>
                        <div className="grid grid-cols-2 gap-y-3 gap-x-6 bg-gray-50 p-5 rounded-2xl">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Nivel Educativo</label>
                                <p className="text-md font-semibold">{solicitante.nivel_educativo_desc || "N/A"}</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Tiempo de Educación</label>
                                <p className="text-md font-medium">
                                    {solicitante.cantidad_tiempo_educacion ? `${solicitante.cantidad_tiempo_educacion} ${solicitante.tipo_periodo_educacion || "años"}` : "N/A"}
                                </p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Condición Laboral</label>
                                <p className="text-md font-semibold">{solicitante.condicion_trabajo || "N/A"}</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Actividad Regular</label>
                                <p className="text-md font-medium">{solicitante.condicion_actividad || "N/A"}</p>
                            </div>
                            <div className="col-span-2">
                                <label className="text-xs font-bold text-gray-500 uppercase">¿Buscando Trabajo?</label>
                                <p className="text-md font-medium">{solicitante.buscando_trabajo ? "Sí" : "No"}</p>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="mt-auto text-sm text-gray-400 text-center pt-8 border-t border-gray-100 shrink-0">
                    Este documento es para uso interno de la Clínica Jurídica UCAB. - Página 1
                </div>
            </div>

            {/* Page 2: Housing, Family, Goods */}
            <div id="applicant-report-page-2" style={{...pageStyle, minHeight: 'unset', height: '297mm'}} className="shadow-lg print:shadow-none print:mb-0 mb-0 relative overflow-hidden flex flex-col">
                <div className="flex-1 overflow-hidden">
                    {/* Vivienda */}
                    <section className="mb-6">
                        <h2 className="text-2xl font-bold text-sky-950 mb-3 flex items-center gap-2 border-l-4 border-blue-600 pl-3">
                            Condiciones de Vivienda
                        </h2>
                        {solicitante.vivienda ? (
                            <div className="grid grid-cols-2 gap-y-3 gap-x-6 bg-gray-50 p-5 rounded-2xl">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Tipo</label>
                                    <p className="text-sm font-semibold">{solicitante.vivienda.tipo_vivienda || "N/A"}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Habitaciones / Baños</label>
                                    <p className="text-sm font-medium">{solicitante.vivienda.cantidad_habitaciones || "0"} habs. - {solicitante.vivienda.cantidad_banos || "0"} baños</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Techo y Paredes</label>
                                    <p className="text-sm font-medium">{solicitante.vivienda.material_techo || "N/A"} / {solicitante.vivienda.material_paredes || "N/A"}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Material de Piso</label>
                                    <p className="text-sm font-medium">{solicitante.vivienda.material_piso || "N/A"}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Agua Potable</label>
                                    <p className="text-sm font-medium">{solicitante.vivienda.agua_potable || "N/A"}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Aseo / Aguas Blancas</label>
                                    <p className="text-sm font-medium">{solicitante.vivienda.aseo_urbano || "N/A"} / {solicitante.vivienda.eliminacion_aguas || "N/A"}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 bg-gray-50 rounded-xl text-gray-500 italic">No hay información de vivienda registrada.</div>
                        )}
                    </section>

                    {/* Familia/Hogar */}
                    <section className="mb-6">
                        <h2 className="text-2xl font-bold text-sky-950 mb-3 flex items-center gap-2 border-l-4 border-blue-600 pl-3">
                            Estructura Familiar y Hogar
                        </h2>
                        {solicitante.familia ? (
                            <div className="grid grid-cols-2 gap-y-3 gap-x-6 bg-blue-50/40 p-5 rounded-2xl">
                                <div>
                                    <label className="text-xs font-bold text-blue-600 uppercase">Total de Personas / Niños</label>
                                    <p className="text-sm font-bold text-gray-800">{solicitante.familia.cantidad_personas || "0"} personas ({solicitante.familia.cantidad_ninos || "0"} niños)</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-blue-600 uppercase">Trabajadores / Niños Estudiando</label>
                                    <p className="text-sm font-medium text-gray-800">{solicitante.familia.cantidad_trabajadores || "0"} trabajadores / {solicitante.familia.cantidad_ninos_estudiando || "0"} estudiando</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-blue-600 uppercase">Ingreso Aprox. Mensual</label>
                                    <p className="text-sm font-bold text-gray-800">{solicitante.familia.ingreso_mensual_aprox ? `Bs. ${solicitante.familia.ingreso_mensual_aprox.toLocaleString()}` : "No especificado"}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-blue-600 uppercase">Jefatura de Hogar</label>
                                    <p className="text-sm font-medium text-gray-800">{solicitante.familia.es_jefe_hogar ? "Es Jefe de Hogar" : "No es Jefe de Hogar"}</p>
                                </div>
                                {solicitante.familia.nivel_educativo_jefe_desc && (
                                    <div className="col-span-2">
                                        <label className="text-xs font-bold text-blue-600 uppercase">Nivel Educativo del Jefe de Hogar</label>
                                        <p className="text-sm font-medium text-gray-800">{solicitante.familia.nivel_educativo_jefe_desc}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-4 bg-gray-50 rounded-xl text-gray-500 italic">No hay información familiar registrada.</div>
                        )}
                    </section>

                    {/* Bienes */}
                    <section className="mb-6">
                        <h2 className="text-2xl font-bold text-sky-950 mb-3 flex items-center gap-2 border-l-4 border-blue-600 pl-3">
                            Bienes
                        </h2>
                        {solicitante.bienes && solicitante.bienes.length > 0 ? (
                            <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-2xl">
                                {solicitante.bienes.map((bien: any, idx: number) => (
                                    <span key={idx} className="bg-white border border-gray-200 shadow-sm px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700">
                                        {bien.descripcion}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 bg-gray-50 rounded-xl text-gray-500 italic">No hay bienes registrados.</div>
                        )}
                    </section>
                </div>
                
                <div className="mt-auto text-sm text-gray-400 text-center pt-8 border-t border-gray-100 shrink-0">
                    Este documento es para uso interno de la Clínica Jurídica UCAB. - Página 2
                </div>
            </div>

            {/* Page 3: Cases */}
            <div id="applicant-report-page-3" style={{...pageStyle, minHeight: 'unset', height: '297mm'}} className="shadow-lg print:shadow-none print:mb-0 mb-0 relative overflow-hidden flex flex-col">
                <div className="flex-1 overflow-hidden flex flex-col">
                    <h2 className="text-2xl font-bold text-sky-950 mb-6 flex items-center gap-2 border-b-2 border-gray-100 pb-3 shrink-0">
                        Historial de Casos Relacionados ({casos.length})
                    </h2>
                    
                    <div className="flex-1 overflow-hidden">
                        {casos.length > 0 ? (
                            <div className="space-y-4">
                                {casos.slice(0, 10).map((caso: any) => (
                                    <div key={caso.nro_caso} className="border-l-4 border-blue-600 bg-blue-50/30 p-4 rounded-r-xl">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="font-bold text-sky-950 text-lg">Caso #{caso.nro_caso.toString().padStart(6, "0")}</h3>
                                                <p className="text-sm font-semibold text-blue-800">{caso.nombre_materia} - {caso.nombre_tramite}</p>
                                            </div>
                                            <span className="bg-white border border-blue-200 text-blue-700 font-bold px-3 py-1 rounded-full text-xs shadow-sm">
                                                {caso.estatus_actual || "Abierto"}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mb-2">
                                            <b>Iniciado:</b> {caso.fecha_caso_inicio ? new Date(caso.fecha_caso_inicio).toLocaleDateString("es-VE") : "N/A"}
                                        </p>
                                        {caso.sintesis_caso && (
                                            <p className="text-sm text-gray-700 italic border-t border-blue-100 pt-2 mt-2">
                                                "{caso.sintesis_caso.substring(0, 150)}{caso.sintesis_caso.length > 150 ? '...' : ''}"
                                            </p>
                                        )}
                                    </div>
                                ))}
                                {casos.length > 10 && (
                                    <div className="text-center p-3 bg-gray-50 rounded-lg text-sm text-gray-500 font-semibold">
                                        Se omiten {casos.length - 10} casos adicionales por espacio.
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                <p className="text-gray-500 font-semibold text-lg">No hay casos registrados para este solicitante</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-auto text-sm text-gray-400 text-center pt-8 border-t border-gray-100 shrink-0">
                    Este documento es para uso interno de la Clínica Jurídica UCAB. - Página 3
                </div>
            </div>
        </div>
    );
}

export default function ApplicantReportPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center">Cargando reporte...</div>}>
            <ReportContent />
        </Suspense>
    );
}
