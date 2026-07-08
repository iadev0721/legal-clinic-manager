"use client";

import { useState, useRef, useEffect } from "react";
import DashboardCard from "@/components/ui/DashboardCard";
import { PieChart } from "@/components/ui/pie-chart";
import {
    getCaseStatusStats,
    getHistoryofchanges,
    getTotalSolicitantesCount,
    getTodayAppointmentsCount,
} from "@/actions/dashboard";
import { type ChartConfig } from "@/components/shadcn/chart";
import { CustomTable, type Column } from "@/components/ui/custom-table";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/shadcn/dialog";
import { Input } from "@/components/shadcn/input";
import { Label } from "@/components/shadcn/label";
import Pagination from "@/components/ui/pagination";

// --- Types & Interfaces ---

interface DashboardStats {
    activeCases: number;
    totalApplicants: number;
    casesInCourt: number;
    pendingToday: number;
    casesByStatus: Array<{ status: string; _count: { status: number } }>;
}

interface Task {
    id: number;
    title: string;
    caseNumber: string;
    dueDate: Date;
    completed: boolean;
    priority?: "Alta" | "Media" | "Baja";
}

interface TaskCardProps extends Task {
    onToggle: (id: number) => void;
    onDelete: (id: number) => void;
}

// --- Helper Components ---

interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    className?: string;
    placeholder?: string;
}

const CustomSelect = ({ value, onChange, options, className, placeholder = "Seleccionar" }: CustomSelectProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div className={cn("relative", className)} ref={containerRef}>
            <div
                className={cn(
                    "flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors cursor-pointer flex items-center justify-between",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                )}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={selectedOption ? "text-sky-950" : "text-muted-foreground"}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <span className="icon-[mingcute--down-fill] text-sm text-gray-500"></span>
            </div>

            {isOpen && (
                <div className="absolute top-[110%] left-0 w-full rounded-md border bg-white shadow-md z-50 overflow-hidden max-h-40 overflow-y-auto">
                    {options.map((option) => (
                        <div
                            key={option.value}
                            className={cn(
                                "px-3 py-2 text-sm cursor-pointer transition-colors hover:bg-blue-50 text-sky-950",
                                value === option.value && "bg-blue-100 font-semibold"
                            )}
                            onClick={() => {
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                        >
                            {option.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


// --- TaskCard Component ---

function TaskCard({ id, title, caseNumber, dueDate, completed, onToggle, onDelete }: TaskCardProps) {
    const formatDueDate = (date: Date) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const diffTime = target.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return "Hoy";
        if (diffDays === 1) return "Mañana";

        const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
        if (date.getFullYear() !== now.getFullYear()) {
            options.year = 'numeric';
        }

        return new Intl.DateTimeFormat('es-ES', options).format(date);
    };

    const getPriority = (date: Date): "Alta" | "Media" | "Baja" => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const diffTime = target.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 3) return "Alta";
        if (diffDays <= 7) return "Media";
        return "Baja";
    };

    const priority = getPriority(dueDate);

    const priorityStyles = {
        Alta: "bg-red-100 text-red-500",
        Media: "bg-[#FEF9C3] text-[#CA8A04]",
        Baja: "bg-[#DBEAFE] text-[#2563EB]",
    };

    return (
        <div className={cn(
            "w-full p-4 bg-white rounded-2xl shadow-sm border border-neutral-100 flex justify-between items-start transition-all duration-300 group hover:shadow-md relative",
            completed && "bg-neutral-50/50 grayscale opacity-70"
        )}>
            <div className="flex items-start gap-3 flex-1 min-w-0">
                {/* BIG Checkbox */}
                <button
                    onClick={() => onToggle(id)}
                    className={cn(
                        "mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-none",
                        completed ? "bg-green-500 border-green-500 text-white scale-110" : "border-slate-300 hover:border-sky-500 text-transparent hover:scale-105"
                    )}
                >
                    <span className="icon-[mdi--check] text-sm font-bold"></span>
                </button>

                <div className={cn("flex flex-col items-start gap-1 min-w-0 flex-1", completed && "line-through text-gray-400")}>
                    {/* Title & Case */}
                    <div className="text-sky-950 text-base font-bold leading-tight w-full break-words group-hover:text-[#3E7DBB] transition-colors">
                        {title}
                    </div>
                    <div className="text-xs font-semibold text-sky-950/50 uppercase tracking-wide">
                        Caso #{caseNumber}
                    </div>

                    {/* Date & Priority Line */}
                    <div className="flex items-center gap-3 mt-1 w-full">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-sky-950/70 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                            <span className="icon-[uil--calendar-alt] text-base text-[#3E7DBB]"></span>
                            {formatDueDate(dueDate)}
                        </div>

                        {!completed && (
                            <div className={cn("px-2 py-0.5 rounded-md flex items-center justify-center text-[10px] font-extrabold uppercase", priorityStyles[priority])}>
                                {priority}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Actions Menu (Placeholder for 'Delete in another way') */}
            {/* Putting a subtle delete on hover or context menu - for now, using a subtle X on top right */}
            <button
                onClick={() => onDelete(id)}
                className="absolute top-2 right-2 text-gray-300 hover:text-red-400 p-1 rounded-full hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                title="Eliminar tarea"
            >
                <span className="icon-[mdi--close] text-lg"></span>
            </button>
        </div>
    );
}

// --- New Task Modal ---

interface AddTaskModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (task: { title: string, caseNumber: string, dueDate: Date }) => void;
}

function AddTaskModal({ open, onClose, onSave }: AddTaskModalProps) {
    const [title, setTitle] = useState("");
    const [caseId, setCaseId] = useState("");
    const [date, setDate] = useState("");

    // Mock cases list
    const availableCases = [
        { value: "2024-051", label: "Caso #2024-051 - Desalojo Injustificado" },
        { value: "2024-049", label: "Caso #2024-049 - Custodia de Menores" },
        { value: "2024-052", label: "Caso #2024-052 - Reclamo Laboral" },
        { value: "2024-044", label: "Caso #2024-044 - Divorcio Mutuo Acuerdo" },
        { value: "2024-060", label: "Caso #2024-060 - Violencia Doméstica" },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !caseId || !date) return;

        onSave({
            title,
            caseNumber: caseId,
            dueDate: new Date(date)
        });
        onClose();
        // Reset
        setTitle("");
        setCaseId("");
        setDate("");
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-white p-0 overflow-hidden border-0 gap-0 rounded-2xl shadow-2xl">
                <div className="bg-[#003366] text-white p-5 flex flex-col gap-1">
                    <DialogTitle className="font-bold text-xl flex items-center gap-2">
                        <span className="icon-[mdi--calendar-check] text-[#3E7DBB] bg-white rounded-full p-0.5"></span>
                        Nueva Tarea
                    </DialogTitle>
                    <DialogDescription className="text-blue-200 text-sm">
                        Agrega un recordatorio importante vinculado a un caso activo.
                    </DialogDescription>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6 bg-neutral-50/50">
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 ml-1">Caso Asociado</Label>
                        <CustomSelect
                            value={caseId}
                            onChange={setCaseId}
                            options={availableCases}
                            placeholder="Seleccionar caso..."
                            className="w-full bg-white"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="title" className="text-xs font-bold uppercase tracking-wider text-gray-500 ml-1">Título de la Tarea</Label>
                        <Input
                            id="title"
                            placeholder="Ej: Entregar documentos..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            className="bg-white border-gray-200 focus:border-[#3E7DBB] h-10"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="date" className="text-xs font-bold uppercase tracking-wider text-gray-500 ml-1">Fecha de Vencimiento</Label>
                        <Input
                            id="date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                            className="block bg-white border-gray-200 focus:border-[#3E7DBB] h-10"
                        />
                    </div>
                    <DialogFooter className="pt-2 gap-2 sm:gap-0">
                        <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors w-full sm:w-auto cursor-pointer">
                            Cancelar
                        </button>
                        <button type="submit" className="px-6 py-2.5 text-sm font-bold text-white bg-[#003366] hover:bg-[#002244] rounded-xl shadow-lg shadow-blue-900/10 transition-all transform active:scale-95 flex items-center justify-center gap-2 w-full sm:w-auto cursor-pointer">
                            <span className="icon-[mdi--plus]"></span>
                            Crear Tarea
                        </button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}


// --- Activity Log Modal ---

interface ActivityLogModalProps {
    open: boolean;
    onClose: () => void;
    data: any[];
}

function ActivityLogModal({ open, onClose, data }: ActivityLogModalProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;
    const totalPages = Math.ceil(data.length / itemsPerPage);

    const paginatedData = data.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const getActivityIcon = (type: string) => {
        switch (type?.toLowerCase()) {
            case 'cita':
                return "icon-[mdi--calendar-clock] text-blue-500";
            case 'soporte':
                return "icon-[mdi--file-document-outline] text-green-500";
            case 'estatus':
                return "icon-[mdi--progress-check] text-orange-500";
            default:
                return "icon-[mdi--flash-outline] text-purple-500";
        }
    };

    const columns: Column<any>[] = [
        {
            header: "Usuario",
            accessorKey: "user",
            className: "font-bold text-sky-950 text-xs pl-4",
        },
        {
            header: "Rol",
            accessorKey: "role",
            render: (item) => (
                <span className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase",
                    item.role === "Profesor" ? "bg-purple-100 text-purple-600" :
                        item.role === "Coordinador" ? "bg-orange-100 text-orange-600" :
                            item.role === "Sistema" ? "bg-gray-100 text-gray-600" :
                                "bg-blue-50 text-blue-600"
                )}>
                    {item.role}
                </span>
            ),
            className: "text-center",
        },
        {
            header: "Acción",
            accessorKey: "action",
            render: (item) => (
                <div className="flex items-center gap-2">
                    <span className={cn("text-lg", getActivityIcon(item.type))}></span>
                    <span>{item.action}</span>
                </div>
            ),
            className: "font-medium text-sky-950/80 px-2 leading-tight text-xs",
        },
        {
            header: "Fecha",
            accessorKey: "date",
            className: "text-gray-400 font-semibold text-xs whitespace-nowrap",
        },
    ];

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl bg-neutral-50 p-0 overflow-hidden border-0 rounded-2xl flex flex-col max-h-[90vh]">
                <DialogHeader className="p-6 bg-white border-b border-neutral-100 flex-none">
                    <DialogTitle className="text-sky-950 font-bold text-2xl flex items-center gap-3">
                        <div className="p-2 bg-[#E0F2FE] rounded-lg">
                            <span className="icon-[mdi--history] text-[#0284C7] text-2xl"></span>
                        </div>
                        Registro de Actividad Reciente
                    </DialogTitle>
                    <DialogDescription>
                        Historial completo de acciones realizadas en el sistema.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 p-6 overflow-hidden flex flex-col min-h-0 bg-white m-6 mt-0 rounded-b-xl border border-t-0 border-neutral-100 shadow-sm">
                    <div className="flex-1 min-h-0 overflow-auto">
                        <CustomTable
                            data={paginatedData}
                            columns={columns}
                            className="w-full"
                        />
                    </div>
                </div>

                <div className="p-4 border-t border-neutral-200 bg-white flex-none">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        itemsPerPage={itemsPerPage}
                        totalItems={data.length}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}

// --- Main Client Component ---

interface DashboardClientProps {
    user: any;
}

export default function DashboardClient({ user }: DashboardClientProps) {
    const [actions, setActions] = useState<any[]>([]);
    const [caseStatusData, setCaseStatusData] = useState<any[]>([]);
    const [totalSolicitantes, setTotalSolicitantes] = useState<number | string>("---");
    const [todayAppointments, setTodayAppointments] = useState<number | string>("---");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<"overview" | "metrics">("overview");
    const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        if (!user?.cedula) return;

        setLoading(true);
        setError(null);
        try {
            // Cargar estadísticas globales de estatus (para la gráfica y la tarjeta de resumen)
            const casesRes = await getCaseStatusStats();
            if (casesRes.success) {
                setCaseStatusData(casesRes.data || []);
            }

            // Cargar historial de cambios (acciones relacionadas al usuario)
            const historyRes = await getHistoryofchanges(user.cedula);
            if (historyRes.success) {
                setActions(historyRes.data || []);
            }

            // Cargar total de solicitantes
            const solicitantesRes = await getTotalSolicitantesCount();
            if (solicitantesRes.success) {
                setTotalSolicitantes(solicitantesRes.count);
            }

            // Cargar citas de hoy
            const appointmentsRes = await getTodayAppointmentsCount(user.cedula);
            if (appointmentsRes.success) {
                setTodayAppointments(appointmentsRes.count);
            }

        } catch (err: any) {
            setError(err.message || 'Error al cargar datos');
            console.error('Error al cargar datos:', err);
        } finally {
            setLoading(false);
        }
    };

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [tasks, setTasks] = useState<Task[]>([
        {
            id: 1,
            title: "Redactar Informe Preliminar",
            caseNumber: "2024-051",
            dueDate: new Date(new Date().setDate(new Date().getDate() + 1)),
            completed: false,
        },
        {
            id: 2,
            title: "Revisión de Evidencia",
            caseNumber: "2024-049",
            dueDate: new Date(new Date().setDate(new Date().getDate() + 2)),
            completed: false,
        },
        {
            id: 3,
            title: "Cita con el Solicitante",
            caseNumber: "2024-052",
            dueDate: new Date(),
            completed: true,
        },
    ]);

    const handleToggleTask = (id: number) => {
        setTasks(prev => prev.map(task =>
            task.id === id ? { ...task, completed: !task.completed } : task
        ));
    };

    const handleDeleteTask = (id: number) => {
        setTasks(prev => prev.filter(task => task.id !== id));
    };

    const handleSaveTask = (newTask: { title: string, caseNumber: string, dueDate: Date }) => {
        const task: Task = {
            id: Math.max(...tasks.map(t => t.id), 0) + 1,
            ...newTask,
            completed: false
        };
        setTasks(prev => [...prev, task]);
    };

    // Helper to get priority weight (lower is higher priority)
    const getPriorityWeight = (date: Date) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const diffTime = target.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 3) return 1; // Alta
        if (diffDays <= 7) return 2; // Media
        return 3; // Baja
    };

    // Sort Tasks: Uncompleted First > Priority (Date) > Completed Last
    const sortedTasks = [...tasks].sort((a, b) => {
        // 1. Completion Status
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }
        // 2. Priority/Date (only for pending)
        if (!a.completed) {
            return getPriorityWeight(a.dueDate) - getPriorityWeight(b.dueDate) || a.dueDate.getTime() - b.dueDate.getTime();
        }
        return 0;
    });


    // Calulate stats from live data
    const totalActiveCases = caseStatusData.reduce((acc, curr) => acc + curr.value, 0);

    const dashboardCards = [
        {
            label: "Total Casos Activos:",
            value: totalActiveCases.toString(),
            icon: "icon-[lucide--gavel]",
            iconColor: "text-[#3E7DBB]",
            iconBgColor: "bg-blue-100",
        },
        {
            label: "Solicitantes:",
            value: totalSolicitantes.toString(),
            icon: "icon-[tabler--users]",
            iconColor: "text-[#16A34A]",
            iconBgColor: "bg-[#DCFCE7]",
        },
        //{
        //    label: "En Tribunales:",
        //    value: stats.casesInCourt.toString(),
        //    icon: "icon-[mdi--justice]",
        //    iconColor: "text-[#CB8C06]",
        //    iconBgColor: "bg-[#FEF9C3]",
        // },
        {
            label: "Citas Pendientes Hoy:",
            value: todayAppointments.toString(),
            icon: "icon-[tabler--alert-triangle]",
            iconColor: "text-[#E03E3E]",
            iconBgColor: "bg-[#FEE2E2]",
        },
    ];

    const pieChartData = caseStatusData.map((item) => ({
        status: (item.name || 'desconocido').toLowerCase().replace(/ /g, '_'),
        cases: item.value,
    }));

    const pieChartConfig = {
        cases: { label: "Casos" },
        ...Object.fromEntries(caseStatusData.map(s => [
            (s.name || 'desconocido').toLowerCase().replace(/ /g, '_'),
            { label: (s.name || 'Desconocido').charAt(0).toUpperCase() + (s.name || 'Desconocido').slice(1).toLowerCase() }
        ]))
    } satisfies ChartConfig;

    // Activity Log Columns
    const recentAccessData = actions.slice(0, 5);

    const getActivityIcon = (type: string) => {
        switch (type?.toLowerCase()) {
            case 'cita':
                return "icon-[mdi--calendar-clock] text-blue-500";
            case 'soporte':
                return "icon-[mdi--file-document-outline] text-green-500";
            case 'estatus':
                return "icon-[mdi--progress-check] text-orange-500";
            default:
                return "icon-[mdi--flash-outline] text-purple-500";
        }
    };

    const recentAccessColumns: Column<any>[] = [
        {
            header: "Usuario",
            accessorKey: "user",
            className: "font-bold pl-4 text-sky-950 text-xs",
        },
        {
            header: "Rol",
            accessorKey: "role",
            render: (item) => (
                <span className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase",
                    item.role?.includes("Profesor") ? "bg-purple-100 text-purple-600" :
                        item.role?.includes("Coordinador") ? "bg-orange-100 text-orange-600" :
                            item.role?.includes("Sistema") ? "bg-gray-100 text-gray-600" :
                                "bg-blue-50 text-blue-600"
                )}>
                    {item.role}
                </span>
            ),
            className: "text-center",
        },
        {
            header: "Acción",
            accessorKey: "action",
            render: (item) => (
                <div className="flex items-center gap-2">
                    <span className={cn("text-lg", getActivityIcon(item.type))}></span>
                    <span>{item.action}</span>
                </div>
            ),
            className: "font-medium text-sky-950/80 px-2 leading-tight text-xs",
            headerClassName: "w-[45%]",
        },
        {
            header: "Fecha",
            accessorKey: "date",
            className: "text-gray-400 font-semibold text-xs pl-2 whitespace-nowrap",
        },
    ];

    // Calculate top 2 statuses for dynamic comment
    const topStatuses = [...caseStatusData]
        .sort((a, b) => b.value - a.value)
        .slice(0, 2);

    return (
        <div className="w-full h-full p-8 flex flex-col gap-4 overflow-hidden font-sans">
            {/* Header & Toggle Container */}
            <div className="flex-none flex justify-between items-end">
                <div className="flex flex-col">
                    <h1 className="text-sky-950 text-4xl font-bold tracking-tight">
                        Dashboard
                    </h1>
                    <p className="text-[#325B84] text-lg font-medium mt-1">
                        Bienvenido de nuevo. Aquí tienes tu resumen operativo.
                    </p>
                </div>

                {/* Segmented Control */}
                <div className="bg-neutral-100 p-1.5 rounded-xl flex gap-1 shadow-inner h-fit">
                    <button
                        onClick={() => setViewMode("overview")}
                        className={cn(
                            "px-6 py-2 rounded-[10px] text-sm font-bold flex items-center gap-2 transition-all duration-300 cursor-pointer",
                            viewMode === "overview"
                                ? "bg-white text-[#003366] shadow-sm"
                                : "text-gray-400 hover:text-gray-600 hover:bg-white/50"
                        )}
                    >
                        <span className="icon-[mdi--view-dashboard-outline] text-lg"></span>
                        Resumen
                    </button>
                    <button
                        onClick={() => setViewMode("metrics")}
                        className={cn(
                            "px-6 py-2 rounded-[10px] text-sm font-bold flex items-center gap-2 transition-all duration-300 cursor-pointer",
                            viewMode === "metrics"
                                ? "bg-white text-[#003366] shadow-sm"
                                : "text-gray-400 hover:text-gray-600 hover:bg-white/50"
                        )}
                    >
                        <span className="icon-[mdi--chart-pie] text-lg"></span>
                        Métricas
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 min-h-0 relative">

                {/* VIEW: OVERVIEW */}
                {viewMode === "overview" && (
                    <div className="absolute inset-0 flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Stats Row */}
                        <div className="flex-none grid grid-cols-3 gap-5">
                            {dashboardCards.map((card, index) => (
                                <DashboardCard key={index} {...card} />
                            ))}
                        </div>

                        {/* Split Content: Table & Tasks */}
                        <div className="flex-1 min-h-0 grid grid-cols-12 gap-5">
                            {/* Recent Access Table (Left - Wider) */}
                            <div className="col-span-12 bg-neutral-50 rounded-[24px] border border-neutral-200/50 shadow-sm p-6 flex flex-col min-h-0">
                                <div className="flex justify-between items-center mb-4 flex-none">
                                    <h2 className="text-sky-950 text-xl font-bold flex items-center gap-2">
                                        <span className="icon-[mdi--history] text-[#3E7DBB] text-2xl"></span>
                                        Actividad Reciente
                                    </h2>
                                    <button
                                        onClick={() => setIsActivityModalOpen(true)}
                                        className="text-xs font-bold text-[#3E7DBB] hover:underline uppercase tracking-wide cursor-pointer transition-colors hover:text-[#2d5f8f]"
                                    >
                                        Ver Todo
                                    </button>
                                </div>
                                <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-white rounded-xl border border-neutral-100 shadow-inner">
                                    <CustomTable
                                        data={recentAccessData}
                                        columns={recentAccessColumns}
                                        className="h-full"
                                        minRows={12}
                                    />
                                </div>
                            </div>

                            {/*    
                            // Pending Tasks (Right) 
                            <div className="col-span-4 bg-neutral-50 rounded-[24px] border border-neutral-200/50 shadow-sm p-6 flex flex-col min-h-0 relative overflow-hidden">
                                <div className="flex justify-between items-center mb-4 flex-none px-1">
                                    <h2 className="text-sky-950 text-xl font-bold flex items-center gap-2">
                                        <span className="icon-[mdi--clipboard-text-clock-outline] text-[#E03E3E] text-2xl"></span>
                                        Tareas Pendientes
                                    </h2>
                                    <div className="bg-red-50 text-red-600 px-2 py-0.5 rounded-full text-xs font-bold shadow-sm border border-red-100">{tasks.filter(t => !t.completed).length}</div>
                                </div>

                                
                                <div className="flex-1 overflow-y-auto pr-2 pl-1 flex flex-col gap-2.5 pb-2">
                                    {sortedTasks.map((task) => (
                                        <TaskCard
                                            key={task.id}
                                            {...task}
                                            onToggle={handleToggleTask}
                                            onDelete={handleDeleteTask}
                                        />
                                    ))}
                                </div>

                                
                                <div className="flex-none pt-2 mt-1">
                                    <button
                                        onClick={() => setIsModalOpen(true)}
                                        className="w-full py-3 border-2 border-dashed border-[#3E7DBB]/30 rounded-xl text-[#3E7DBB] font-bold text-sm hover:bg-blue-50/50 hover:border-[#3E7DBB]/50 transition-all flex items-center justify-center gap-2 group cursor-pointer"
                                    >
                                        <span className="icon-[mdi--plus-circle-outline] text-xl group-hover:scale-110 transition-transform"></span>
                                        Añadir Nueva Tarea
                                    </button>
                                </div>
                            </div>
                            */}

                        </div>
                    </div>
                )}

                {/* VIEW: METRICS */}
                {viewMode === "metrics" && (
                    <div className="absolute inset-0 grid grid-cols-2 gap-6 animate-in fade-in zoom-in-95 duration-500">
                        {/* Left: ODS & Impact */}
                        <div className="bg-gradient-to-br from-[#3E7DBB] to-[#003366] rounded-[30px] shadow-lg p-10 flex flex-col justify-center items-center text-center text-white relative overflow-hidden group">
                            {/* Background Pattern */}
                            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                                <span className="icon-[mdi--scale-balance] text-[300px] absolute -top-10 -left-10 transform rotate-12"></span>
                            </div>

                            <div className="relative z-10 flex flex-col items-center gap-6">
                                <div className="p-6 bg-white/10 backdrop-blur-md rounded-full border border-white/20 shadow-2xl group-hover:scale-110 transition-transform duration-500">
                                    <span className="icon-[flowbite--landmark-solid] text-7xl text-white"></span>
                                </div>
                                <div className="space-y-4 max-w-lg">
                                    <h2 className="text-4xl font-bold tracking-tight">ODS 16: Paz y Justicia</h2>
                                    <p className="text-blue-100 text-lg leading-relaxed">
                                        Nuestra clínica jurídica promueve el acceso a la justicia para todos, brindando asesoría legal gratuita y fortaleciendo las instituciones.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Right: Charts */}
                        <div className="bg-white rounded-[30px] border border-neutral-200 shadow-sm p-8 flex flex-col">
                            <h2 className="text-sky-950 text-2xl font-bold flex items-center gap-3 mb-6">
                                <span className="icon-[mdi--chart-donut] text-[#3E7DBB] text-3xl"></span>
                                Distribución de Casos
                            </h2>
                            <div className="flex-1 min-h-0 flex items-center justify-center">
                                <PieChart
                                    title=""
                                    data={pieChartData}
                                    config={pieChartConfig}
                                    dataKey="cases"
                                    nameKey="status"
                                    innerRadius={80}
                                />
                            </div>
                            <div className="mt-6 p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                                <p className="text-center text-sky-950/70 text-sm font-medium">
                                    {topStatuses.length > 0 ? (
                                        <>
                                            Se observa una mayor concentración de casos en etapa de <span className="text-[#3E7DBB] font-bold">{topStatuses[0]?.name}</span>
                                            {topStatuses[1] && (
                                                <>
                                                    , seguido de <span className="text-green-600 font-bold">{topStatuses[1]?.name}</span>
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        "No hay suficientes datos para mostrar estadísticas."
                                    )}
                                    .
                                </p>
                                <div className="mt-4 flex justify-center w-full">
                                    <a
                                        href="/statistics"
                                        className="px-6 py-2.5 bg-[#3E7DBB] text-white font-bold text-sm rounded-xl shadow-md hover:bg-[#2d5f8f] hover:shadow-lg transition-all transform active:scale-95 flex items-center gap-2"
                                    >
                                        Ver Reportes y Estadísticas
                                        <span className="icon-[mdi--chart-box-outline] text-lg"></span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ADD TASK MODAL */}
            <AddTaskModal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveTask}
            />

            {/* ACTIVITY LOG MODAL */}
            <ActivityLogModal
                open={isActivityModalOpen}
                onClose={() => setIsActivityModalOpen(false)}
                data={actions}
            />

        </div>
    );
}
