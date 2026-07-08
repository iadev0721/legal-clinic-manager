"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { getCaseReportData } from "@/actions/cases";

function ReportContent() {
    const searchParams = useSearchParams();
    const caseId = searchParams.get("caseId");
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (caseId) {
            getCaseReportData(caseId)
                .then(setData)
                .finally(() => setLoading(false));
        }
    }, [caseId]);

    const pageStyle = {
        width: "210mm", // A4
        minHeight: "297mm",
        padding: "20mm",
        backgroundColor: "white",
        margin: "0 auto",
        color: "#0c1e33", // sky-950
    };

    if (loading) return <div className="p-10 text-center">Cargando datos del reporte...</div>;
    if (!data) return <div className="p-10 text-center text-red-500">No se encontró el caso o hubo un error.</div>;

    const { caseInfo, actions, appointments, supports, beneficiaries, students, supervisors } = data;

    return (
        <div className="bg-gray-100 py-10 print:p-0 print:bg-white">
            {/* Page 1: General Info & Participants */}
            <div id="case-report-page-1" style={pageStyle} className="shadow-lg mb-10 print:shadow-none print:mb-0 relative overflow-hidden">
                {/* Header Decor */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-10 -mt-10 opacity-50"></div>

                <div className="flex justify-between items-start border-b-4 border-blue-600 pb-6 mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-sky-950 uppercase tracking-tight">Reporte de Expediente</h1>
                        <p className="text-blue-600 font-semibold text-lg">Clínica Jurídica UCAB</p>
                    </div>
                    <div className="text-right">
                        <div className="bg-sky-950 text-white px-4 py-2 rounded-lg font-bold text-xl mb-1">
                            Caso {caseInfo.nro_caso}
                        </div>
                        <p className="text-sm text-gray-500 font-medium">Fecha de Emisión: {new Date().toLocaleString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</p>
                    </div>
                </div>

                <section className="mb-8">
                    <h2 className="text-2xl font-bold text-sky-950 mb-4 flex items-center gap-2 border-l-4 border-blue-600 pl-3">
                        Datos del Solicitante
                    </h2>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-8 bg-gray-50 p-6 rounded-2xl">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Nombre Completo</label>
                            <p className="text-lg font-semibold">{caseInfo.solicitante_nombres} {caseInfo.solicitante_apellidos}</p>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Cédula</label>
                            <p className="text-lg font-semibold">{caseInfo.cedula_solicitante}</p>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Teléfono</label>
                            <p className="text-md font-medium">{caseInfo.telefono_celular || 'N/A'}</p>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Correo</label>
                            <p className="text-md font-medium">{caseInfo.correo_electronico || 'N/A'}</p>
                        </div>
                    </div>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-bold text-sky-950 mb-4 flex items-center gap-2 border-l-4 border-blue-600 pl-3">
                        Información General
                    </h2>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-8 bg-blue-50/30 p-6 rounded-2xl">
                        <div>
                            <label className="text-xs font-bold text-blue-600 uppercase tracking-wider">Materia</label>
                            <p className="text-lg font-semibold">{caseInfo.nombre_materia}</p>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-blue-600 uppercase tracking-wider">Trámite</label>
                            <p className="text-lg font-semibold">{caseInfo.nombre_tramite}</p>
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs font-bold text-blue-600 uppercase tracking-wider">Categoría / Subcategoría / Ámbito</label>
                            <p className="text-md font-medium text-gray-700">
                                {caseInfo.nombre_categoria} {'>'} {caseInfo.nombre_subcategoria} {'>'} {caseInfo.nombre_ambito_legal}
                            </p>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-blue-600 uppercase tracking-wider">Núcleo</label>
                            <p className="text-lg font-semibold">{caseInfo.nombre_nucleo}</p>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-blue-600 uppercase tracking-wider">Estatus Actual</label>
                            <p className="text-lg font-bold text-blue-700">{caseInfo.estatus_actual || 'En Proceso'}</p>
                        </div>
                    </div>
                </section>



                <section>
                    <h2 className="text-2xl font-bold text-sky-950 mb-4 flex items-center gap-2 border-l-4 border-blue-600 pl-3">
                        Equipo Responsable
                    </h2>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="border border-gray-200 p-4 rounded-xl">
                            <label className="text-xs font-bold text-blue-600 uppercase block mb-2">Alumnos Asignados</label>
                            {students.length > 0 ? (
                                students.map((s: any) => (
                                    <div key={s.cedula_alumno} className="mb-2">
                                        <p className="font-bold">{s.nombres} {s.apellidos}</p>
                                        <p className="text-xs text-gray-500">{s.correo_electronico}</p>
                                    </div>
                                ))
                            ) : <p className="text-gray-400 italic">No hay alumnos asignados</p>}
                        </div>
                        <div className="border border-gray-200 p-4 rounded-xl">
                            <label className="text-xs font-bold text-blue-600 uppercase block mb-2">Profesores Supervisores</label>
                            {supervisors.length > 0 ? (
                                supervisors.map((s: any) => (
                                    <div key={s.cedula_profesor} className="mb-2">
                                        <p className="font-bold">{s.nombres} {s.apellidos}</p>
                                        <p className="text-xs text-gray-500">{s.correo_electronico}</p>
                                    </div>
                                ))
                            ) : <p className="text-gray-400 italic">No hay profesores asignados</p>}
                        </div>
                    </div>
                </section>

                <div className="mt-12 text-sm text-gray-400 text-center pt-8 border-t border-gray-100">
                    Este documento es para uso interno de la Clínica Jurídica UCAB.
                </div>
            </div>

            {/* Page 2: Bitácora de Acciones y Citas */}
            <div id="case-report-page-2" style={pageStyle} className="shadow-lg mb-10 print:shadow-none print:mb-0">
                <h2 className="text-2xl font-bold text-sky-950 mb-6 border-b-2 border-gray-100 pb-2">Bitácora de Acciones</h2>
                <div className="space-y-4 mb-12">
                    {actions.length > 0 ? (
                        actions.map((action: any) => (
                            <div key={action.nro_accion} className="border-l-4 border-blue-400 bg-blue-50/20 p-4 rounded-r-xl">
                                <div className="flex justify-between mb-1">
                                    <h3 className="font-bold text-sky-900">{action.titulo_accion}</h3>
                                    <span className="text-xs font-bold text-gray-500">
                                        {new Date(action.fecha_realizacion).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap mb-2">{action.observacion}</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase">Ejecutado por: {action.nombres} {action.apellidos}</p>
                            </div>
                        ))
                    ) : <div className="text-center py-8 bg-gray-50 rounded-xl text-gray-400 italic">Sin acciones registradas</div>}
                </div>

                <h2 className="text-2xl font-bold text-sky-950 mb-6 border-b-2 border-gray-100 pb-2">Citas y Entrevistas</h2>
                <div className="space-y-4">
                    {appointments.length > 0 ? (
                        appointments.map((cita: any) => (
                            <div key={cita.id_cita} className="border border-gray-200 p-4 rounded-xl">
                                <div className="flex justify-between mb-2">
                                    <span className="bg-sky-100 text-sky-700 px-3 py-1 rounded-full text-xs font-bold">
                                        Atención: {new Date(cita.fecha_atencion).toLocaleString()}
                                    </span>
                                    {cita.fecha_proxima_cita && (
                                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                                            Próxima: {new Date(cita.fecha_proxima_cita).toLocaleString()}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-700 mb-2">{cita.observacion}</p>
                                <div className="text-xs text-gray-500">
                                    <span className="font-bold uppercase text-[10px] block mb-1">Personal de atención:</span>
                                    <p>{cita.atendido_por?.filter(Boolean).join(', ') || 'Información no registrada'}</p>
                                </div>
                            </div>
                        ))
                    ) : <div className="text-center py-8 bg-gray-50 rounded-xl text-gray-400 italic">Sin citas registradas</div>}
                </div>
            </div>

            {/* Page 3: Soportes y Beneficiarios */}
            <div id="case-report-page-3" style={pageStyle} className="shadow-lg print:shadow-none">
                <h2 className="text-2xl font-bold text-sky-950 mb-6 border-b-2 border-gray-100 pb-2">Soporte Legal / Documentación</h2>
                <div className="grid grid-cols-1 gap-4 mb-12">
                    {supports.length > 0 ? (
                        supports.map((s: any) => (
                            <div key={s.id_soporte} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                                <div className="bg-white p-2 rounded-lg shadow-sm">
                                    <span className="icon-[mdi--file-pdf-box] text-3xl text-red-500"></span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-sky-900">{s.descripcion}</h3>
                                    <p className="text-xs text-gray-500 mb-1">Fecha de Soporte: {new Date(s.fecha_soporte).toLocaleDateString()}</p>
                                    <p className="text-sm text-gray-600 italic">"{s.observacion}"</p>
                                </div>
                            </div>
                        ))
                    ) : <div className="text-center py-8 bg-gray-50 rounded-xl text-gray-400 italic">Sin soportes vinculados</div>}
                </div>

                <h2 className="text-2xl font-bold text-sky-950 mb-4 flex items-center gap-2 border-l-4 border-pink-500 pl-3">
                    <span className="icon-[mdi--account-group] text-2xl text-pink-600"></span>
                    Lista de Beneficiarios ({beneficiaries.length})
                </h2>
                {beneficiaries.length > 0 ? (
                    <table className="w-full border-collapse mb-8 border-2 border-gray-200 rounded-lg overflow-hidden">
                        <thead>
                            <tr className="bg-sky-950 text-white text-xs uppercase tracking-wider">
                                <th className="p-3 text-left rounded-tl-lg font-bold">#</th>
                                <th className="p-3 text-left font-bold">Nombre Completo</th>
                                <th className="p-3 text-center font-bold">Cédula</th>
                                <th className="p-3 text-center font-bold">Sexo</th>
                                <th className="p-3 text-center font-bold">Fecha Nac.</th>
                                <th className="p-3 text-center font-bold">Edad</th>
                                <th className="p-3 text-center font-bold">Tipo</th>
                                <th className="p-3 text-center font-bold rounded-tr-lg">Parentesco</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {beneficiaries.map((b: any, idx: number) => (
                                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} style={{ pageBreakInside: 'avoid' }}>
                                    <td className="p-3 font-bold text-sky-950 border-b border-gray-200">{idx + 1}</td>
                                    <td className="p-3 font-semibold text-sky-950 border-b border-gray-200">
                                        {b.nombres && b.apellidos
                                            ? `${b.nombres} ${b.apellidos}`
                                            : (b.nombres || b.apellidos || 'N/A')}
                                    </td>
                                    <td className="p-3 text-center border-b border-gray-200">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="font-semibold">{b.cedula_beneficiario || 'N/A'}</span>
                                            {b.cedula_es_propia && (
                                                <span className="text-[9px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold uppercase">
                                                    Propia
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-3 text-center border-b border-gray-200">
                                        {b.sexo === 'M' ? 'Masculino' : b.sexo === 'F' ? 'Femenino' : 'N/A'}
                                    </td>
                                    <td className="p-3 text-center border-b border-gray-200">
                                        {b.fecha_nacimiento
                                            ? new Date(b.fecha_nacimiento).toLocaleDateString('es-ES', {
                                                year: 'numeric',
                                                month: '2-digit',
                                                day: '2-digit'
                                            })
                                            : 'N/A'}
                                    </td>
                                    <td className="p-3 text-center border-b border-gray-200 font-semibold">
                                        {b.edad !== null && b.edad !== undefined
                                            ? `${Math.floor(Number(b.edad))} años`
                                            : 'N/A'}
                                    </td>
                                    <td className="p-3 text-center border-b border-gray-200">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${b.tipo_beneficiario === 'Directo' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {b.tipo_beneficiario || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center border-b border-gray-200">
                                        {b.parentesco || (b.tipo_beneficiario === 'Directo' ? 'Solicitante' : 'N/A')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center mb-8">
                        <span className="icon-[mdi--account-off] text-4xl text-gray-400 block mb-2"></span>
                        <p className="text-gray-500 font-semibold">No hay beneficiarios registrados en este caso</p>
                    </div>
                )}

                <div className="mt-auto border-t-2 border-gray-100 pt-8">
                    <h3 className="text-xl font-bold text-sky-950 mb-2">Síntesis Final del Caso</h3>
                    <div className="bg-yellow-50/30 p-6 rounded-2xl border border-yellow-100 min-h-[200px] text-gray-800 leading-relaxed font-serif italic">
                        {caseInfo.sintesis_caso || 'Pendiente por redactar síntesis final descriptiva del alcance y resultados del expediente.'}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function CaseReportPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center">Cargando reporte...</div>}>
            <ReportContent />
        </Suspense>
    );
}

