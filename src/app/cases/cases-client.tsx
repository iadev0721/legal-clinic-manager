"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CustomTable, type Column } from "@/components/ui/custom-table";
import PrimaryButton from "@/components/ui/primary-button";
import SearchInput from "@/components/ui/search-input";
import FilterSelect from "@/components/ui/filter-select";
import DateInput from "@/components/ui/date-input";
import StatusBadge from "@/components/ui/status-badge";
import { PieChart } from "@/components/ui/pie-chart";
import { BarChart } from "@/components/ui/bar-chart";
import Pagination from "@/components/ui/pagination";
import { type ChartConfig } from "@/components/shadcn/chart";
import LoadingScreen from "@/components/ui/loading-screen";
import CaseDetailsModal from "@/components/ui/case-details-modal";
import CaseEditModal, {
  type CaseEditData,
} from "@/components/ui/case-edit-modal";
import CaseCreateModal from "@/components/ui/case-create-modal";
import {
  getCasos,
  getCasosBySolicitante,
  cambiarEstatus,
  getEstatus,
  getMaterias,
  getTramites,
  getNucleos,
  asignarAlumno,
  asignarProfesor,
  getAsignacionesActivas,
  getSemestres,
  type Caso as CasoBD,
} from "@/actions/casos";

interface Case {
  id: string;
  nro_caso: number;
  caseNumber: string;
  applicantName: string;
  applicantId: string;
  subject: string; // Materia
  procedure: string; // Trámite
  legalAmbient: string; // Ámbito Legal (antes Tribunal/Subcategoría)
  period: string;
  assignedStudent: string;
  status: "EN_PROCESO" | "ARCHIVADO" | "ENTREGADO" | "ASESORIA" | "PAUSADO";
  createdAt: string;

  usuario_participa?: boolean; // Indica si el usuario actual participa en el caso
  allTerms: string[]; // Todos los semestres del caso
}

interface CasesClientProps {
  userRole: "ADMIN" | "PROFESSOR" | "STUDENT";
  userCedula?: string;
  debugRole?: string;
}

const ITEMS_PER_PAGE = 10;

// Mapear estatus de BD a formato del frontend
const mapEstatusToFrontend = (estatus: string | null): "EN_PROCESO" | "ARCHIVADO" | "ENTREGADO" | "ASESORIA" | "PAUSADO" => {
  if (!estatus) return "EN_PROCESO";
  const upper = estatus.toUpperCase();
  if (upper.includes("PROCESO")) return "EN_PROCESO";
  if (upper.includes("ARCHIVADO")) return "ARCHIVADO";
  if (upper.includes("ENTREGADO")) return "ENTREGADO";
  if (upper.includes("ASESORIA") || upper.includes("ASESORÍA")) return "ASESORIA";
  if (upper.includes("PAUSADO")) return "PAUSADO";
  return "EN_PROCESO";
};

export default function CasesClient({ userRole, userCedula, debugRole }: CasesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const applicantIdFilter = searchParams.get("applicantId");

  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  // Catálogos para filtros
  const [estatusList, setEstatusList] = useState<any[]>([]);
  const [materiasList, setMateriasList] = useState<any[]>([]);
  const [tramitesList, setTramitesList] = useState<any[]>([]);
  const [semestersList, setSemestersList] = useState<any[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [procedureFilter, setProcedureFilter] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");
  // const [tribunalFilter, setTribunalFilter] = useState(""); // Eliminated
  const [dateFilter, setDateFilter] = useState("");
  const [dateFilterEnd, setDateFilterEnd] = useState(""); // New End Date Filter
  const [currentPage, setCurrentPage] = useState(1);

  // Estados para los modales
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);

  // Estado para la vista (tabla o gráficas)
  const [viewMode, setViewMode] = useState<"table" | "charts">("table");

  // Estado para el panel de filtros
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Cargar datos al montar el componente
  useEffect(() => {
    loadData();
    loadCatalogs();
  }, [applicantIdFilter]);

  // Abrir modal de detalles si hay caseId en la URL
  useEffect(() => {
    const caseIdFromUrl = searchParams.get("caseId");
    if (caseIdFromUrl && cases.length > 0) {
      const caso = cases.find((c) => c.id === caseIdFromUrl || c.nro_caso.toString() === caseIdFromUrl);
      if (caso && !detailsModalOpen) {
        setSelectedCase(caso);
        setDetailsModalOpen(true);
        // Limpiar el parámetro de la URL
        router.replace("/cases" + (applicantIdFilter ? `?applicantId=${applicantIdFilter}` : ""));
      }
    }
  }, [searchParams, cases, applicantIdFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      let result;
      if (applicantIdFilter) {
        result = await getCasosBySolicitante(applicantIdFilter);
      } else {
        result = await getCasos();
      }

      if (result.success && result.data) {
        // Mapear datos de BD al formato del frontend
        const mappedCases: Case[] = result.data.map((caso: any) => {
          // Asegurar que la fecha sea un string
          let fechaStr = "";
          if (caso.fecha_caso_inicio) {
            if (caso.fecha_caso_inicio instanceof Date) {
              fechaStr = caso.fecha_caso_inicio.toISOString().split('T')[0];
            } else if (typeof caso.fecha_caso_inicio === 'string') {
              // Si ya es string, tomar solo la parte de la fecha (antes de T si hay hora)
              fechaStr = caso.fecha_caso_inicio.split('T')[0];
            } else {
              fechaStr = new Date().toISOString().split('T')[0];
            }
          } else {
            fechaStr = new Date().toISOString().split('T')[0];
          }

          return {
            id: caso.nro_caso.toString(),
            nro_caso: caso.nro_caso,
            caseNumber: `#${caso.nro_caso.toString().padStart(6, '0')}`,
            applicantName: caso.solicitante_nombre || "N/A",
            applicantId: caso.cedula_solicitante || "",
            subject: caso.nombre_materia || "N/A",
            procedure: caso.nombre_tramite || "N/A",
            legalAmbient: caso.nombre_ambito_legal || "N/A", // Mostrar ámbito legal
            period: caso.periodo_actual || "N/A",
            assignedStudent: caso.alumno_asignado || "Sin asignar",
            status: mapEstatusToFrontend(caso.estatus_actual),
            createdAt: fechaStr,

            usuario_participa: caso.usuario_participa || false,
            allTerms: caso.all_terms ? caso.all_terms.split(',') : [],
          };
        });
        setCases(mappedCases);
      } else {
        console.error("Error loading cases:", result.error);
        setCases([]);
      }
    } catch (error) {
      console.error("Error loading cases:", error);
      setCases([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCatalogs = async () => {
    const [estatusResult, materiasResult, tramitesResult, semestersResult] = await Promise.all([
      getEstatus(),
      getMaterias(),
      getTramites(),
      getSemestres(),
    ]);

    if (estatusResult.success && estatusResult.data) {
      setEstatusList(estatusResult.data);
    }
    if (materiasResult.success && materiasResult.data) {
      setMateriasList(materiasResult.data);
    }
    if (tramitesResult.success && tramitesResult.data) {
      setTramitesList(tramitesResult.data);
    }
    if (semestersResult.success && semestersResult.data) {
      setSemestersList(semestersResult.data);
    }
  };

  // Filtrar casos
  const filteredCases = useMemo(() => {
    return cases.filter((caso) => {
      const matchesSearch =
        !searchTerm ||
        caso.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        caso.applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        caso.applicantId.toLowerCase().includes(searchTerm.toLowerCase());

      // Comparar estatus (puede venir de BD con formato diferente)
      const matchesStatus = !statusFilter ||
        caso.status === statusFilter ||
        (statusFilter && caso.status === mapEstatusToFrontend(statusFilter));

      const matchesSubject = !subjectFilter ||
        caso.subject.toLowerCase().includes(subjectFilter.toLowerCase());

      const matchesProcedure =
        !procedureFilter ||
        caso.procedure.toLowerCase().includes(procedureFilter.toLowerCase());

      caso.procedure.toLowerCase().includes(procedureFilter.toLowerCase());

      const matchesSemester = !semesterFilter || caso.allTerms.includes(semesterFilter);

      // const matchesTribunal = ... // Removed

      // Filtro por rango de fecha
      const matchesDateStart = !dateFilter || caso.createdAt >= dateFilter;
      const matchesDateEnd = !dateFilterEnd || caso.createdAt <= dateFilterEnd;

      // Filtro por applicantId desde URL (cuando viene desde Gestión de Solicitantes)
      const matchesApplicant =
        !applicantIdFilter || caso.applicantId === applicantIdFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesSubject &&
        matchesProcedure &&
        matchesSemester &&
        matchesDateStart &&
        matchesDateEnd &&
        matchesApplicant
      );
    });
  }, [
    searchTerm,
    statusFilter,
    subjectFilter,
    procedureFilter,
    semesterFilter,
    dateFilter,
    dateFilterEnd,
    applicantIdFilter,
    cases,
  ]);

  // Paginación - reset page to 1 when filters change
  const totalPages = Math.ceil(filteredCases.length / ITEMS_PER_PAGE);

  // Automatically reset to page 1 if current page exceeds total pages
  const effectiveCurrentPage =
    currentPage > totalPages && totalPages > 0 ? 1 : currentPage;

  const paginatedCases = useMemo(() => {
    const startIndex = (effectiveCurrentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredCases.slice(startIndex, endIndex);
  }, [filteredCases, effectiveCurrentPage]);

  const handleNewCase = () => {
    setCreateModalOpen(true);
  };

  const handleCreateSuccess = () => {
    loadData(); // Recargar la lista de casos
  };

  const handleValidateCase = () => {
    // TODO: Abrir modal de validación
    console.log("Validar/Asignar caso");
    alert("Funcionalidad de validar caso próximamente");
  };

  // Datos para gráficos (calculados desde casos reales)
  const pieChartData = useMemo(() => {
    const materiasCount: Record<string, number> = {};
    cases.forEach((caso) => {
      const materia = caso.subject.toLowerCase();
      materiasCount[materia] = (materiasCount[materia] || 0) + 1;
    });

    return Object.entries(materiasCount).map(([subject, cases]) => ({
      subject,
      cases,
    }));
  }, [cases]);

  const pieChartConfig = useMemo(() => {
    const config: ChartConfig = {
      cases: { label: "Casos" },
    };
    pieChartData.forEach((item) => {
      config[item.subject] = { label: item.subject.charAt(0).toUpperCase() + item.subject.slice(1) };
    });
    return config;
  }, [pieChartData]) satisfies ChartConfig;

  const barChartData = useMemo(() => {
    const tramitesCount: Record<string, number> = {};
    cases.forEach((caso) => {
      const tramite = caso.procedure;
      tramitesCount[tramite] = (tramitesCount[tramite] || 0) + 1;
    });

    return Object.entries(tramitesCount).map(([procedure, count]) => ({
      procedure,
      count,
    }));
  }, [cases]);

  const barChartConfig = {
    count: { label: "Cantidad" },
  } satisfies ChartConfig;

  // Handlers para los modales
  const handleViewDetails = (id: string) => {
    const caso = cases.find((c) => c.id === id);
    if (caso) {
      setSelectedCase(caso);
      setDetailsModalOpen(true);
    }
  };

  const handleEdit = (id: string) => {
    const caso = cases.find((c) => c.id === id);
    if (caso) {
      setSelectedCase(caso);
      setEditModalOpen(true);
    }
  };

  const handleSaveEdit = async (data: CaseEditData) => {
    try {
      // El modal ahora maneja todas las actualizaciones internamente
      // Solo necesitamos recargar los datos
      await loadData();
    } catch (error) {
      console.error("Error saving case:", error);
      throw error;
    }
  };

  // Columnas según el rol
  const getColumns = (): Column<Case>[] => {
    const baseColumns: Column<Case>[] = [
      {
        header: "N° Caso",
        render: (caso) => (
          <div className="text-center">
            <div className="font-bold text-sky-950 text-sm">{caso.caseNumber}</div>
            <div className="text-xs text-sky-950/60">
              {caso.createdAt}
            </div>
          </div>
        ),
        className: "text-center",
        headerClassName: "w-[10%]",
      },
      {
        header: "Solicitante",
        render: (caso) => (
          <div>
            <div className="font-bold text-sky-950 text-sm break-words">{caso.applicantName}</div>
            <div className="text-xs text-sky-950/60">{caso.applicantId}</div>
          </div>
        ),
        headerClassName: "w-[15%]",
      },
      {
        header: "Materia",
        accessorKey: "subject",
        className: "text-center font-semibold text-sm break-words leading-tight",
        headerClassName: "w-[12%]",
      },
      {
        header: "Trámite",
        accessorKey: "procedure",
        className: "text-center text-sm break-words leading-tight",
        headerClassName: "w-[13%]",
      },
    ];

    // Columnas adicionales para Admin y Profesor
    if (userRole === "ADMIN" || userRole === "PROFESSOR") {
      baseColumns.push(
        {
          header: "Ámbito Legal",
          accessorKey: "legalAmbient",
          className: "text-center text-sm break-words leading-tight",
          headerClassName: "w-[13%]",
        },
        {
          header: "Periodo",
          accessorKey: "period",
          className: "text-center font-semibold text-sm",
          headerClassName: "w-[8%]",
        }
      );
    }

    // Columna de alumno asignado
    baseColumns.push({
      header: "Alumno Asignado",
      accessorKey: "assignedStudent",
      className: "text-center font-semibold text-sm break-words leading-tight",
      headerClassName: "w-[12%]",
    });

    // Columna de estatus
    baseColumns.push({
      header: "Estatus",
      render: (caso) => (
        <div className="flex justify-center">
          <StatusBadge status={caso.status} />
        </div>
      ),
      className: "text-center",
      headerClassName: "w-[12%]",
    });

    // Columna de acciones
    baseColumns.push({
      header: "Acciones",
      render: (caso) => {
        // Para estudiantes, solo mostrar botón de editar si participan en el caso
        const puedeEditar = userRole !== "STUDENT" || caso.usuario_participa === true;

        return (
          <div className="flex justify-center items-center gap-2">
            <button
              onClick={() => router.push(`/cases/follow-up?caseId=${caso.id}`)}
              className="w-10 h-10 flex justify-center items-center hover:bg-blue-100 rounded-lg transition-colors group cursor-pointer"
              title="Seguimiento y Control"
            >
              <span className="icon-[mdi--clipboard-text-clock-outline] text-3xl text-[#3E7DBB] group-hover:scale-110 transition-transform"></span>
            </button>
            {puedeEditar ? (
              <button
                onClick={() => handleEdit(caso.id)}
                className="w-10 h-10 flex justify-center items-center hover:bg-blue-100 rounded-lg transition-colors group cursor-pointer"
                title="Editar"
              >
                <span className="icon-[uil--pen] text-3xl text-[#003366] group-hover:scale-110 transition-transform"></span>
              </button>
            ) : (
              <button
                disabled
                className="w-10 h-10 flex justify-center items-center opacity-30 cursor-not-allowed"
                title="No tienes permisos para editar este caso"
              >
                <span className="icon-[uil--pen] text-3xl text-[#003366]"></span>
              </button>
            )}
          </div>
        );
      },
      className: "text-center",
      headerClassName: "w-[10%]",
    });

    return baseColumns;
  };

  if (loading) {
    return (
      <LoadingScreen message="Cargando casos..." className="w-full h-full" />
    );
  }

  return (

    <div className="w-full h-full p-6 inline-flex flex-col justify-start items-stretch gap-4 overflow-hidden">
      {/* Header */}
      <div className="self-stretch inline-flex justify-between items-start">
        <div className="flex flex-col justify-start items-start">
          <h1 className="text-sky-950 text-4xl font-bold tracking-tight">
            Gestión de Casos
          </h1>
          <p className="text-[#325B84] text-lg font-medium">
            Registra, asigna y filtra todos los expedientes legales de la
            clínica.
          </p>
        </div>
        <div className="flex gap-4">
          {(userRole === "ADMIN" || userRole === "PROFESSOR") && (
            <PrimaryButton data-testid="case-create-btn" onClick={handleNewCase} icon="icon-[mdi--plus]">
              Crear Nuevo Caso
            </PrimaryButton>
          )}


        </div>
      </div>

      {/* Banner informativo cuando se filtra por solicitante */}
      {applicantIdFilter && (
        <div className="self-stretch px-6 py-4 bg-blue-50 border-2 border-[#3E7DBB] rounded-2xl inline-flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="icon-[mdi--information] text-3xl text-[#3E7DBB]"></span>
            <div>
              <p className="text-sky-950 text-lg font-semibold">
                Mostrando casos del solicitante seleccionado
              </p>
              <p className="text-sky-950/70 text-sm">
                Se están filtrando los casos relacionados con este solicitante
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push("/cases")}
            className="px-4 py-2 bg-[#3E7DBB] hover:bg-[#2d5f8f] text-white rounded-xl font-semibold transition-colors"
          >
            Ver todos los casos
          </button>
        </div>
      )}

      {/* View Toggle (Segmented Control) */}
      <div className="self-stretch flex justify-center">
        <div className="bg-neutral-200/50 p-1.5 rounded-2xl inline-flex gap-1 shadow-inner">
          <button
            onClick={() => setViewMode("table")}
            className={`px-8 py-2.5 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 cursor-pointer ${viewMode === "table"
              ? "bg-white text-[#003366] shadow-[0_2px_8px_rgba(0,0,0,0.1)] scale-100"
              : "text-gray-500 hover:text-[#003366] hover:bg-white/50 scale-95"
              }`}
          >
            <span className="icon-[mdi--table] text-xl"></span>
            Listado de Casos
          </button>
          <button
            onClick={() => setViewMode("charts")}
            className={`px-8 py-2.5 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 cursor-pointer ${viewMode === "charts"
              ? "bg-white text-[#003366] shadow-[0_2px_8px_rgba(0,0,0,0.1)] scale-100"
              : "text-gray-500 hover:text-[#003366] hover:bg-white/50 scale-95"
              }`}
          >
            <span className="icon-[mdi--chart-pie] text-xl"></span>
            Estadísticas
          </button>
        </div>
      </div>

      {/* Modern Filter Section (only visible in table mode) */}
      {viewMode === "table" && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-500 w-full space-y-3">
          {/* Compact Filter Bar */}
          <div className="flex items-center gap-3">
            {/* Search - Always Visible */}
            <div className="flex-1">
              <SearchInput
                placeholder="Buscar caso por N°"
                value={searchTerm}
                onChange={setSearchTerm}
                className="w-full"
              />
            </div>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              className={`px-4 py-2.5 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 cursor-pointer border-2 ${isFilterPanelOpen
                ? "bg-[#003366] text-white border-[#003366]"
                : "bg-white text-[#003366] border-neutral-200 hover:border-[#003366]"
                }`}
            >
              <span className="icon-[mdi--filter-variant] text-lg"></span>
              Filtros
              {(() => {
                const activeCount = [
                  statusFilter,
                  subjectFilter,
                  procedureFilter,
                  semesterFilter,
                  dateFilter,
                  dateFilterEnd,
                ].filter(Boolean).length;
                return activeCount > 0 ? (
                  <span className="ml-1 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                    {activeCount}
                  </span>
                ) : null;
              })()}
              <span className={`icon-[mdi--chevron-down] text-lg transition-transform duration-300 ${isFilterPanelOpen ? "rotate-180" : ""
                }`}></span>
            </button>

            {/* Botón para limpiar filtros */}
            {(searchTerm || statusFilter || subjectFilter || procedureFilter || semesterFilter || dateFilter || dateFilterEnd) && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("");
                  setSubjectFilter("");
                  setProcedureFilter("");
                  setSemesterFilter("");
                  setDateFilter("");
                  setDateFilterEnd("");
                }}
                className="bg-gray-100 text-gray-600 hover:bg-gray-200 px-4 py-2.5 rounded-xl font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2"
                title="Limpiar filtros"
              >
                <span className="icon-[mdi--filter-off-outline] text-lg"></span>
              </button>
            )}
          </div>

          {/* Active Filter Chips */}
          {[
            { value: statusFilter, label: "Estatus", setter: setStatusFilter },
            { value: subjectFilter, label: "Materia", setter: setSubjectFilter },
            { value: procedureFilter, label: "Trámite", setter: setProcedureFilter },
            { value: semesterFilter, label: "Semestre", setter: setSemesterFilter },
            { value: dateFilter, label: "Desde", setter: setDateFilter },
            { value: dateFilterEnd, label: "Hasta", setter: setDateFilterEnd },
          ].some((f) => f.value) && (
              <div className="flex flex-wrap gap-2">
                {[
                  { value: statusFilter, label: "Estatus", setter: setStatusFilter },
                  { value: subjectFilter, label: "Materia", setter: setSubjectFilter },
                  { value: procedureFilter, label: "Trámite", setter: setProcedureFilter },
                  { value: semesterFilter, label: "Semestre", setter: setSemesterFilter },
                  { value: dateFilter, label: "Desde", setter: setDateFilter },
                  { value: dateFilterEnd, label: "Hasta", setter: setDateFilterEnd },
                ]
                  .filter((f) => f.value)
                  .map((filter, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-[#003366] rounded-lg text-sm font-semibold border border-blue-200"
                    >
                      <span className="text-xs text-blue-600">{filter.label}:</span>
                      <span>{filter.value}</span>
                      <button
                        onClick={() => filter.setter("")}
                        className="hover:bg-blue-100 rounded-full p-0.5 transition-colors cursor-pointer"
                      >
                        <span className="icon-[mdi--close] text-sm"></span>
                      </button>
                    </div>
                  ))}
              </div>
            )}

          {/* Collapsible Filter Panel */}
          {isFilterPanelOpen && (
            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 animate-in slide-in-from-top-2 fade-in duration-300">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { value: statusFilter, label: "Estatus", setter: setStatusFilter, options: estatusList.map((e: any) => ({ value: e.nombre_estatus, label: e.nombre_estatus })) },
                  { value: subjectFilter, label: "Materia", setter: setSubjectFilter, options: materiasList.map((m: any) => ({ value: m.nombre_materia, label: m.nombre_materia })) },
                  // Only show procedure filter for ADMIN or PROFESSOR
                  ...(userRole === "ADMIN" || userRole === "PROFESSOR"
                    ? [{ value: procedureFilter, label: "Trámite", setter: setProcedureFilter, options: tramitesList.map((t: any) => ({ value: t.nombre, label: t.nombre })) }]
                    : []),
                  // Only show semester filter for ADMIN or PROFESSOR
                  ...(userRole === "ADMIN" || userRole === "PROFESSOR"
                    ? [{ value: semesterFilter, label: "Semestre", setter: setSemesterFilter, options: semestersList.map((s: any) => ({ value: s.term, label: s.term })) }]
                    : []),
                ].map((filter, index) => (
                  <FilterSelect
                    key={index}
                    placeholder={filter.label}
                    value={filter.value}
                    onChange={filter.setter}
                    options={filter.options}
                    className="w-full text-sm"
                  />
                ))}

                <DateInput
                  placeholder="Desde"
                  value={dateFilter}
                  onChange={setDateFilter}
                  className="w-full text-sm"
                />
                <DateInput
                  placeholder="Hasta"
                  value={dateFilterEnd}
                  onChange={setDateFilterEnd}
                  className="w-full text-sm"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content Area: Table/Footer OR Charts */}
      {viewMode === "table" ? (
        <>
          {/* Table Container - takes remaining space */}
          <div className="self-stretch flex-1 min-h-0 bg-neutral-50 rounded-[30px] shadow-[0px_0px_15.5px_0px_rgba(0,0,0,0.25)] p-8 overflow-hidden flex flex-col">
            {filteredCases.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 h-full text-center py-12">
                <span className="icon-[mdi--gavel] text-6xl text-sky-950/30 mb-4 block"></span>
                <p className="text-sky-950 text-xl font-semibold">
                  {searchTerm || statusFilter || subjectFilter
                    ? "No se encontraron casos con los filtros aplicados"
                    : "No hay casos registrados"}
                </p>
              </div>
            ) : (
              <CustomTable
                data={paginatedCases}
                columns={getColumns()}
                keyField="id"
                className="h-full"
                minRows={10}
              />
            )}
          </div>

          {/* Footer Area: Pagination + Status Bar */}
          <div className="self-stretch flex flex-col gap-2">
            {/* Pagination */}
            {filteredCases.length > 0 && (
              <Pagination
                currentPage={effectiveCurrentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={ITEMS_PER_PAGE}
                totalItems={filteredCases.length}
              />
            )}

            {/* Status Bar (Footer) */}
            <div className="self-stretch flex justify-between items-center min-h-[30px] pt-2">
              {/* Left: Clear Filters */}


              {/* Center: Total Count */}
              <div className="flex items-center justify-center bg-white px-4 py-1.5 rounded-full border border-[#003366]/10 shadow-sm">
                <p className="text-sky-950 text-sm font-semibold">
                  Total de casos: <span className="text-[#3E7DBB] font-bold">{filteredCases.length}</span>
                </p>
              </div>

              {/* Right: Spacer */}
              <div className="flex-1"></div>
            </div>
          </div>
        </>
      ) : (
        /* Charts View */
        <div className="self-stretch flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-8 overflow-hidden animate-in fade-in zoom-in-95 duration-500 pb-8">
          <div className="bg-white rounded-[32px] shadow-sm border border-neutral-100 p-8 flex flex-col h-full hover:shadow-lg transition-shadow duration-300 items-center justify-center">
            <PieChart
              title="Distribución por Materia"
              data={pieChartData}
              config={pieChartConfig}
              dataKey="cases"
              nameKey="subject"
              innerRadius={60}
            />
          </div>
          <div className="bg-white rounded-[32px] shadow-sm border border-neutral-100 p-8 flex flex-col h-full hover:shadow-lg transition-shadow duration-300 justify-center">
            <BarChart
              title="Distribución por Trámite"
              data={barChartData}
              config={barChartConfig}
              dataKey="count"
              nameKey="procedure"
            />
          </div>
        </div>
      )}

      {/* Modales */}
      <CaseCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      <CaseDetailsModal
        open={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedCase(null);
        }}
        caseData={selectedCase}
        userRole={userRole}
        debugRole={debugRole}
      />

      <CaseEditModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedCase(null);
        }}
        onSave={handleSaveEdit}
        caseData={selectedCase}
        estatusList={estatusList}
        userCedula={userCedula}
        userRole={userRole}
        debugRole={debugRole}
      />
    </div>
  );
}
