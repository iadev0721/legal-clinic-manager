"use client"

import { useSearchParams } from "next/navigation";
import { Pie2Chart } from "@/components/ui/pie2-chart";
import { BarChart } from "@/components/ui/bar-chart";
import { CaseGrowthChart } from "@/components/ui/area-chart";
import { type ChartConfig } from "@/components/shadcn/chart";
import { useStatisticsData } from "@/hooks/useStatisticsData";
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

const commonConfig = {
    value: {
        label: "Cantidad",
        color: "#3E7DBB",
    }
} satisfies ChartConfig

function ReportContent() {
    const searchParams = useSearchParams();

    const filters = {
        materia: searchParams.get('materia') || searchParams.get('subject') || undefined,
        startDate: searchParams.get('startDate') || undefined,
        endDate: searchParams.get('endDate') || undefined,
        nucleus: searchParams.get('nucleus') || undefined,
    };

    const { data, loading } = useStatisticsData(filters);

    const pageStyle = {
        width: "210mm",
        minHeight: "297mm",
        padding: "15mm",
        backgroundColor: "white",
        margin: "0 auto",
    };

    if (loading || !data) {
        return (
            <div className="fixed inset-0 bg-white/80 flex items-center justify-center z-50">
                <div className="text-sky-950 text-2xl font-semibold">Cargando reporte...</div>
            </div>
        );
    }

    return (
        <div className="bg-white">
            {/* Page 1: Case Metrics */}
            <div id="socioeconomic-report-page-1" style={pageStyle} className="flex flex-col gap-10 shadow-md">
                <header className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-sky-950">Métricas de Casos y Crecimiento</h1>
                    <p className="text-gray-500">Reporte Socio-Cultural - Página 1</p>
                    <p className="text-xs text-gray-400 mt-2 font-mono">Emisión: {new Date().toLocaleString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</p>
                </header>
                <div className="grid grid-cols-1 md:grid-cols-2">
                    <div className="p-5 col-span-2">
                        <CaseGrowthChart
                            data={data.caseGrowth.map((c: any) => ({ name: c.month, value: c.count }))}
                            config={{ value: { label: "Casos", color: "#3E7DBB" } }}
                            dataKey="value"
                            nameKey="name"
                            title="Crecimiento de Casos"
                            disableAnimation
                        />
                    </div>
                    <div className="p-5 ">
                        <BarChart
                            data={data.parish.map((p: any, index: number) => ({ name: p.name, value: p.value, fill: CHART_COLORS[index % CHART_COLORS.length] }))}
                            config={{ value: { label: "Casos", color: "#3E7DBB" } }}
                            dataKey="value"
                            nameKey="name"
                            title="Distribución por Parroquia"
                            disableAnimation
                        />
                    </div>
                    <div className="p-5 ">
                        <Pie2Chart
                            data={data.caseStatus.map((s: any, index: number) => ({ name: s.name, value: s.value, fill: CHART_COLORS[index % CHART_COLORS.length] }))}
                            config={{ value: { label: "Casos", color: "#3E7DBB" } }}
                            dataKey="value"
                            nameKey="name"
                            title="Estado de los Casos"
                            disableAnimation
                        />
                    </div>

                </div>
            </div>

            {/* Page 2: Socio-Economic Part 1 */}
            <div id="socioeconomic-report-page-2" style={pageStyle} className="flex flex-col gap-10 shadow-md">
                <header className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-sky-950">Datos Socio-Económicos I</h1>
                    <p className="text-gray-500">Reporte Socio-Cultural - Página 2</p>
                    <p className="text-xs text-gray-400 mt-2 font-mono">Emisión: {new Date().toLocaleString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</p>
                </header>
                <div className="grid grid-cols-1 md:grid-cols-2 ">
                    <Pie2Chart
                        data={data.socioEconomic.gender.map((g: any, index: number) => ({
                            name: g.name,
                            value: g.value,
                            fill: g.name.toLowerCase().includes('femenino') || g.name.toLowerCase().includes('mujer') ? '#F43F5E' : // Pink
                                g.name.toLowerCase().includes('masculino') || g.name.toLowerCase().includes('hombre') ? '#3E7DBB' : // Blue
                                    CHART_COLORS[index % CHART_COLORS.length]
                        }))}
                        title="Distribución por Género"
                        config={{ value: { label: "Cantidad" } }}
                        dataKey="value"
                        nameKey="name"
                        disableAnimation
                    />
                    {/* AgeChart -> BarChart */}
                    <BarChart
                        data={data.socioEconomic.age.map((a: any, index: number) => ({ name: a.name, value: a.value, fill: CHART_COLORS[index % CHART_COLORS.length] }))}
                        title="Rangos de Edad"
                        config={{ value: { label: "Cantidad" } }}
                        dataKey="value"
                        nameKey="name"
                        disableAnimation
                    />
                </div>
                <div className="grid grid-cols-1">
                    <Pie2Chart
                        data={data.socioEconomic.housing.map((h: any, index: number) => ({ name: h.name, value: h.value, fill: CHART_COLORS[index % CHART_COLORS.length] }))}
                        title="Tipo de Vivienda"
                        config={{ value: { label: "Cantidad" } }}
                        dataKey="value"
                        nameKey="name"
                        disableAnimation
                    />
                </div>
            </div>

            {/* Page 3: Socio-Economic Part 2 */}
            <div id="socioeconomic-report-page-3" style={pageStyle} className="flex flex-col gap-10 shadow-md">
                <header className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-sky-950">Datos Socio-Económicos II</h1>
                    <p className="text-gray-500">Reporte Socio-Cultural - Página 3</p>
                    <p className="text-xs text-gray-400 mt-2 font-mono">Emisión: {new Date().toLocaleString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</p>
                </header>
                <div className="grid grid-cols-1 md:grid-cols-2 ">
                    <Pie2Chart
                        data={data.socioEconomic.education.map((e: any, index: number) => ({ name: e.name, value: e.value, fill: CHART_COLORS[index % CHART_COLORS.length] }))}
                        title="Nivel Educativo"
                        config={{ value: { label: "Cantidad" } }}
                        dataKey="value"
                        nameKey="name"
                        disableAnimation
                    />

                    <Pie2Chart
                        data={data.socioEconomic.employment.map((e: any, index: number) => ({ name: e.name, value: e.value, fill: CHART_COLORS[index % CHART_COLORS.length] }))}
                        title="Condición Laboral"
                        config={{ value: { label: "Cantidad" } }}
                        dataKey="value"
                        nameKey="name"
                        disableAnimation
                    />
                </div>
            </div>
        </div>
    );
}

export default function ReportPage() {
    return (
        <Suspense fallback={<div>Cargando reporte...</div>}>
            <ReportContent />
        </Suspense>
    );
}
