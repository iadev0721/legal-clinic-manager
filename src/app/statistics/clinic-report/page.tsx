
"use client"

import { useSearchParams } from "next/navigation";
import { type ChartConfig } from "@/components/shadcn/chart";
import { useStatisticsData } from "@/hooks/useStatisticsData";
import { Pie2Chart } from "@/components/ui/pie2-chart";
import { BarChart } from "@/components/ui/bar-chart";
import { Suspense } from "react";

// Palette derived from Dashboard + Complementary
const CHART_COLORS = [
    "#3E7DBB", // Dashboard Blue
    "#16A34A", // Dashboard Green
    "#E03E3E", // Dashboard Red
    "#CB8C06", // Dashboard Orange
    "#003366", // Dashboard Dark Blue
    "#8B5CF6", // Purple
    "#14B8A6", // Teal
    "#F43F5E", // Rose
    "#64748B", // Slate
    "#D946EF", // Magenta
];

// Generic helper to filter and group data
function getFilteredAndGroupedData(
    data: any[],
    filterFn: (item: any) => boolean,
    groupByField: string = 'nombre_subcategoria'
) {
    if (!data) return [];
    return data
        .filter(item => filterFn(item))
        .reduce((acc: any[], item: any) => {
            const groupName = item[groupByField] || "Desconocido";
            const existing = acc.find((x: any) => x.name === groupName);
            if (existing) {
                existing.value += item.value;
            } else {
                acc.push({
                    name: groupName,
                    value: item.value,
                    fill: CHART_COLORS[acc.length % CHART_COLORS.length]
                });
            }
            return acc;
        }, [])
        .sort((a: any, b: any) => b.value - a.value);
}

const commonConfig = {
    value: {
        label: "Cantidad",
        color: "#3E7DBB",
    }
} satisfies ChartConfig

function ReportContent() {
    const searchParams = useSearchParams();

    const activeFilters = {
        materia: searchParams.get("materia") || undefined,
        startDate: searchParams.get("startDate") || undefined,
        endDate: searchParams.get("endDate") || undefined,
        nucleus: searchParams.get("nucleus") || undefined,
    };

    const { data, loading, error } = useStatisticsData(activeFilters);

    const pageStyle = {
        width: "210mm",
        minHeight: "297mm",
        padding: "15mm",
        backgroundColor: "white",
        margin: "0 auto",
    };

    if (loading) return <div>Cargando reporte personalizado...</div>;
    if (error) return <div>Error cargando datos: {error}</div>;
    if (!data) return <div>No hay datos para mostrar.</div>;

    const breakdown = data?.materiaDetails.detailedBreakdown || [];
    const materiaByMateria = data?.materiaDetails.byMateria || [];
    const genderData = data?.socioEconomic.gender || [];
    const parishData = data?.parish || [];
    const stateData = data?.state || [];

    // ... (rest of data prep using data? or fallback)
    // To keep it simple, we just ensure the return block handles null data

    // Data Preparation - Grouping by Subcategory for all Materia charts

    // 1. Civil - Sucesiones
    const civilSucesiones = getFilteredAndGroupedData(breakdown,
        i => i.nombre_materia?.toLowerCase() === 'civil' && i.nombre_subcategoria?.toLowerCase().includes('sucesiones'),
        'nombre_ambito_legal'
    );

    // 2. Civil - Familia
    const civilFamiliaOrd = getFilteredAndGroupedData(breakdown,
        i => i.nombre_materia?.toLowerCase() === 'civil' &&
            i.nombre_categoria?.toLowerCase().includes('familia') &&
            i.nombre_subcategoria?.toLowerCase().includes('ordinario'),
        'nombre_ambito_legal'
    );
    const civilFamiliaProt = getFilteredAndGroupedData(breakdown,
        i => i.nombre_materia?.toLowerCase() === 'civil' &&
            i.nombre_categoria?.toLowerCase().includes('familia') &&
            i.nombre_subcategoria?.toLowerCase().includes('protecc'),
        'nombre_ambito_legal'
    );

    // 3. Civil - Personas, Bienes, Contratos
    // Assuming "Personas", "Bienes", "Contratos" are Categories or implied context
    const civilPersonas = getFilteredAndGroupedData(breakdown,
        i => i.nombre_materia?.toLowerCase() === 'civil' && i.nombre_subcategoria?.toLowerCase().includes('personas'),
        'nombre_ambito_legal'
    );
    const civilPersonasBar = civilPersonas.map((p: any) => ({ category: p.name, value: p.value }));

    const civilBienes = getFilteredAndGroupedData(breakdown,
        i => i.nombre_materia?.toLowerCase() === 'civil' && i.nombre_subcategoria?.toLowerCase().includes('bienes'),
        'nombre_ambito_legal'
    );

    const civilContrato = getFilteredAndGroupedData(breakdown,
        i => i.nombre_materia?.toLowerCase() === 'civil' && i.nombre_subcategoria?.toLowerCase().includes('contratos'),
        'nombre_ambito_legal'
    );

    // 4. Other Materias
    const penal = getFilteredAndGroupedData(breakdown,
        i => i.nombre_materia?.toLowerCase().includes('penal') || i.nombre_materia?.toLowerCase().includes('violencia'), // Penal often grouped with Violencia
        'nombre_ambito_legal'
    );
    const laboral = getFilteredAndGroupedData(breakdown,
        i => i.nombre_materia?.toLowerCase().includes('laboral'),
        'nombre_ambito_legal'
    );
    const mercantil = getFilteredAndGroupedData(breakdown,
        i => i.nombre_materia?.toLowerCase().includes('mercantil'),
        'nombre_ambito_legal'
    );

    // 'Otros' logic
    const otros = getFilteredAndGroupedData(breakdown,
        i => i.nombre_materia?.toLowerCase() === 'otro' || i.nombre_materia?.toLowerCase().includes('lopnna') || i.nombre_materia?.toLowerCase().includes('administracion'),
        'nombre_ambito_legal'
    );
    const otrosBar = otros.map((p: any) => ({ category: p.name, value: p.value }));

    const porMateria = materiaByMateria.map((item: any, index: number) => ({
        name: item.name,
        value: item.value,
        fill: CHART_COLORS[index % CHART_COLORS.length]
    }));

    const genero = genderData.map((item: any, index: number) => ({
        category: item.name,
        value: item.value,
        fill: item.name.toLowerCase().includes('femenino') || item.name.toLowerCase().includes('mujer') ? '#F43F5E' : // Pink
            item.name.toLowerCase().includes('masculino') || item.name.toLowerCase().includes('hombre') ? '#3E7DBB' : // Blue
                CHART_COLORS[index % CHART_COLORS.length]
    }));
    const parroquia = parishData.map((item: any) => ({ category: item.name, value: item.value }));
    const estado = stateData.map((item: any) => ({ category: item.name, value: item.value }));

    return (
        <div className="w-full h-screen min-h-screen bg-neutral-50 inline-flex justify-start items-center overflow-hidden">
            {loading && (
                <div className="fixed inset-0 bg-white/80 flex items-center justify-center z-50">
                    <div className="text-sky-950 text-2xl font-semibold">Cargando reporte...</div>
                </div>
            )}
            <div className="w-full h-full p-6 overflow-y-auto">
                <div className="self-stretch flex flex-col justify-start items-start">
                    <h1 className="self-stretch justify-start text-sky-950 text-4xl font-bold tracking-tight">Reporte General</h1>
                    <p className="self-stretch justify-start text-[#325B84] text-lg font-medium">Vista previa del reporte personalizado.</p>
                </div>

                <div className="w-full flex flex-col gap-8 mt-8 items-center">
                    {/* Page 1 */}
                    <div id="clinic-report-page-1" style={pageStyle} className="flex flex-col gap-8 shadow-md">
                        <header className="text-center mb-6">
                            <h1 className="text-3xl font-bold text-sky-950">Reporte de Gestión - Página 1</h1>
                            <p className="text-gray-500">Materia Civil: Sucesiones y Familia</p>
                            <p className="text-xs text-gray-400 mt-2 font-mono">Emisión: {new Date().toLocaleString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</p>
                        </header>
                        <div className="grid grid-cols-1 md:grid-cols-2">
                            <div className="p-3 col-span-2">
                                <Pie2Chart
                                    data={civilSucesiones}
                                    config={commonConfig}
                                    dataKey="value"
                                    nameKey="name"
                                    title="Materia Civil - Sucesiones"
                                    disableAnimation
                                />
                            </div>
                            <div className="p-3">
                                <Pie2Chart
                                    data={civilFamiliaOrd}
                                    config={commonConfig}
                                    dataKey="value"
                                    nameKey="name"
                                    title=" Materia Civil - Familia (Tribunales Ordinarios)"
                                    disableAnimation
                                />
                            </div>
                            <div className="p-3">
                                <Pie2Chart
                                    data={civilFamiliaProt}
                                    config={commonConfig}
                                    dataKey="value"
                                    nameKey="name"
                                    title="Materia Civil - Familia (Protección)"
                                    disableAnimation
                                />
                            </div>
                        </div>
                    </div>

                    {/* Page 2 */}
                    <div id="clinic-report-page-2" style={pageStyle} className="flex flex-col gap-8 shadow-md">
                        <header className="text-center mb-6">
                            <h1 className="text-3xl font-bold text-sky-950">Reporte de Gestión - Página 2</h1>
                            <p className="text-gray-500">Materia Civil: Personas, Bienes y Contratos</p>
                            <p className="text-xs text-gray-400 mt-2 font-mono">Emisión: {new Date().toLocaleString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</p>
                        </header>
                        <div className="grid grid-cols-1 md:grid-cols-2">
                            <div className="p-3 col-span-2">
                                <BarChart
                                    data={civilPersonasBar}
                                    config={commonConfig}
                                    dataKey="value"
                                    nameKey="category"
                                    title="Materia Civil - Personas"
                                    disableAnimation
                                />
                            </div>
                            <div className="p-3 col-span-1">
                                <Pie2Chart
                                    data={civilBienes} config={commonConfig} dataKey="value" nameKey="name" title="Materia Civil - Bienes" disableAnimation />
                            </div>
                            <div className="p-3 col-span-1">
                                <Pie2Chart data={civilContrato} config={commonConfig} dataKey="value" nameKey="name" title="Materia Civil - Contratos" disableAnimation />
                            </div>
                        </div>
                    </div>

                    {/* Page 3 */}
                    <div id="clinic-report-page-3" style={pageStyle} className="flex flex-col gap-8 shadow-md">
                        <header className="text-center mb-6">
                            <h1 className="text-3xl font-bold text-sky-950">Reporte de Gestión - Página 3</h1>
                            <p className="text-gray-500">Materias: Penal, Laboral y Mercantil</p>
                            <p className="text-xs text-gray-400 mt-2 font-mono">Emisión: {new Date().toLocaleString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</p>
                        </header>
                        <div className="grid grid-cols-1 md:grid-cols-2">
                            <div className="p-3 col-span-2">
                                <Pie2Chart data={penal} config={commonConfig} dataKey="value" nameKey="name" title="Materia Penal" disableAnimation />
                            </div>
                            <div className="p-3 col-span-2">
                                <Pie2Chart data={laboral} config={commonConfig} dataKey="value" nameKey="name" title="Materia Laboral" disableAnimation />
                            </div>
                        </div>
                    </div>

                    {/* Page 4 */}
                    <div id="clinic-report-page-4" style={pageStyle} className="flex flex-col gap-8 shadow-md">
                        <header className="text-center mb-6">
                            <h1 className="text-3xl font-bold text-sky-950">Reporte de Gestión - Página 4</h1>
                            <p className="text-gray-500">Otros Casos y Resumen General</p>
                            <p className="text-xs text-gray-400 mt-2 font-mono">Emisión: {new Date().toLocaleString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</p>
                        </header>
                        <div className="grid grid-cols-1 md:grid-cols-2">
                            <div className="p-3 col-span-2">
                                <BarChart data={otrosBar} config={commonConfig} dataKey="value" nameKey="category" title="Otros Casos" disableAnimation />
                            </div>
                            <div className="p-3 col-span-1">
                                <Pie2Chart data={mercantil} config={commonConfig} dataKey="value" nameKey="name" title="Materia Mercantil" disableAnimation />
                            </div>
                            <div className="p-3 col-span-1">
                                <Pie2Chart data={porMateria} config={commonConfig} dataKey="value" nameKey="name" title="Reporte de Casos por Materia" disableAnimation />
                            </div>
                        </div>
                    </div>

                    {/* Page 5 */}
                    <div id="clinic-report-page-5" style={pageStyle} className="flex flex-col gap-8 shadow-md">
                        <header className="text-center mb-6">
                            <h1 className="text-3xl font-bold text-sky-950">Reporte de Gestión - Página 5</h1>
                            <p className="text-gray-500">Demografía: Género y Ubicación</p>
                            <p className="text-xs text-gray-400 mt-2 font-mono">Emisión: {new Date().toLocaleString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</p>
                        </header>
                        <div className="grid grid-cols-1 md:grid-cols-2">
                            <div className="p-3 col-span-2">
                                <BarChart data={genero} config={commonConfig} dataKey="value" nameKey="category" title="Clasificación por Género" disableAnimation />
                            </div>
                            <div className="p-3 col-span-2">
                                <BarChart data={estado} config={commonConfig} dataKey="value" nameKey="category" title="Usuario por Estado" disableAnimation />
                            </div>
                        </div>
                    </div>

                    {/* Page 6 */}
                    <div id="clinic-report-page-6" style={pageStyle} className="flex flex-col gap-8 shadow-md">
                        <header className="text-center mb-6">
                            <h1 className="text-3xl font-bold text-sky-950">Reporte de Gestión - Página 6</h1>
                            <p className="text-gray-500">Distribución por Parroquia</p>
                            <p className="text-xs text-gray-400 mt-2 font-mono">Emisión: {new Date().toLocaleString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</p>
                        </header>
                        <div className="grid grid-cols-1 md:grid-cols-2">
                            <div className="p-3 col-span-2">
                                <BarChart data={parroquia} config={commonConfig} dataKey="value" nameKey="category" title="Usuario por Parroquia" disableAnimation />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function CustomReportPage() {
    return (
        <Suspense fallback={<div>Cargando reporte personalizado...</div>}>
            <ReportContent />
        </Suspense>
    );
}

