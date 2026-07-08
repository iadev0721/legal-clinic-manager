"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/shadcn/dialog";
import { CustomTable, type Column } from "@/components/ui/custom-table";
import { DownloadCaseReportButton } from "@/components/DownloadCaseReportButton";
import { Input } from "@/components/shadcn/input";
import {
    getHistorialEstatus,
    getAccionesCaso,
    createAccion,
    updateAccion,
    deleteAccion,
    getEstatus,
    type CreateAccionData,
    type UpdateAccionData
} from "@/actions/casos";
import { getCaseReportData } from "@/actions/cases";
import CaseDetailsModal from "@/components/ui/case-details-modal";
import { StatusChangeDialog } from "@/components/ui/status-change-dialog";

// --- Interfaces ---

interface SearchResultCase {
    nro_caso: number;
    // ...
}

interface Action {
    id: string;
    rawId?: number; // nro_accion real
    nroCaso?: number; // nro_caso relateed
    type: string;
    date: string;
    dateObj: Date;
    author: string;
    role?: string;
    description: string;
    isStatusChange: boolean;
}

// --- Modals Components ---

// 1. Edit Action Dialog
interface EditActionDialogProps {
    open: boolean;
    onClose: () => void;
    action: Action | null;
    onSave: (data: UpdateAccionData) => Promise<void>;
}

function EditActionDialog({ open, onClose, action, onSave }: EditActionDialogProps) {
    const [problem, setProblem] = useState("");
    const [orientation, setOrientation] = useState("");
    const [date, setDate] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (action && open) {
            // Parse description to extract problem and orientation if possible
            const desc = action.description;
            const probMatch = desc.match(/Problema:\s*([\s\S]*?)(?=\n\nOrientación:|$)/);
            const orientMatch = desc.match(/Orientación:\s*([\s\S]*?)$/);

            if (action.type) {
                setProblem(action.type);
            }
            if (orientMatch) {
                setOrientation(orientMatch[1].trim());
            } else if (probMatch) {
                // If old format but only Problem, maybe put it in Description if Title is empty?
                // But we set Title from action.type.
                // So if no Orientation, Description is empty?
                // Let's assume description is the *entire* text if not formatted.
                if (!action.description.includes('Problema:') && !action.description.includes('Orientación:')) {
                    setOrientation(action.description);
                } else {
                    setOrientation("");
                }
            } else {
                setOrientation(action.description);
            }

            // check if dateObj is valid
            if (action.dateObj && !isNaN(action.dateObj.getTime())) {
                setDate(action.dateObj.toISOString().split('T')[0]);
            } else {
                setDate(new Date().toISOString().split('T')[0]);
            }

            setError(null);
        }
    }, [action, open]);

    const handleSave = async () => {
        if (!problem.trim() && !orientation.trim()) {
            setError("Por favor ingrese al menos una descripción (Problema u Orientación)");
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            // Reconstruct description
            const titulo = problem.trim().substring(0, 50) || 'Acción actualizada';
            // Save ONLY the description content in observacion, without prefixes if possible, or keep format for backward compat?
            // User requested "solo deja la descripcion". This implies display mainly.
            // But for consistency let's save cleanly:
            const observacion = orientation.trim();

            await onSave({
                titulo_accion: titulo,
                observacion: observacion,
                fecha_realizacion: date
            });
            onClose();
        } catch (err: any) {
            setError(err.message || "Error al guardar");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-white rounded-3xl p-0 overflow-hidden">
                <DialogHeader className="p-6 border-b border-neutral-100">
                    <DialogTitle className="text-xl font-bold text-sky-950 flex items-center gap-2">
                        <span className="icon-[mdi--pencil] text-[#3E7DBB]"></span>
                        Editar Acción
                    </DialogTitle>
                </DialogHeader>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sky-950 font-semibold mb-2 text-sm">Fecha</label>
                        <Input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                            className="bg-neutral-50 border-neutral-200"
                        />
                    </div>
                    <div>
                        <label className="block text-sky-950 font-semibold mb-2 text-sm">Título de la Acción</label>
                        <textarea
                            className="w-full px-4 py-3 bg-neutral-50 rounded-xl border border-neutral-200 text-sky-950 text-sm focus:outline-none focus:border-[#3E7DBB] h-24 resize-none placeholder:text-sky-950/30"
                            value={problem}
                            onChange={(e) => setProblem(e.target.value)}
                            placeholder="Descripción del problema..."
                        />
                    </div>
                    <div>
                        <label className="block text-sky-950 font-semibold mb-2 text-sm">Descripción de la Acción</label>
                        <textarea
                            className="w-full px-4 py-3 bg-neutral-50 rounded-xl border border-neutral-200 text-sky-950 text-sm focus:outline-none focus:border-[#3E7DBB] h-24 resize-none placeholder:text-sky-950/30"
                            value={orientation}
                            onChange={(e) => setOrientation(e.target.value)}
                            placeholder="Orientación..."
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2">
                            <span className="icon-[mdi--alert-circle]"></span>
                            {error}
                        </div>
                    )}
                </div>

                <DialogFooter className="p-6 bg-neutral-50 border-t border-neutral-100 flex gap-2 justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sky-950 font-bold hover:bg-neutral-200 rounded-lg transition-colors text-sm"
                        disabled={isSaving}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-[#003366] text-white font-bold rounded-lg hover:bg-[#002244] transition-colors flex items-center gap-2 text-sm"
                        disabled={isSaving}
                    >
                        {isSaving ? <span className="icon-[svg-spinners--180-ring-with-bg]"></span> : <span className="icon-[mdi--content-save]"></span>}
                        Guardar Cambios
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// 2. Delete Confirmation Dialog
interface DeleteActionDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
}

function DeleteActionDialog({ open, onClose, onConfirm }: DeleteActionDialogProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleConfirm = async () => {
        setIsDeleting(true);
        setError(null);
        try {
            await onConfirm();
            onClose();
        } catch (err: any) {
            setError(err.message || "Error al eliminar");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md bg-white rounded-3xl p-6">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-red-600 flex items-center gap-2">
                        <span className="icon-[mdi--alert] text-2xl"></span>
                        Eliminar Acción
                    </DialogTitle>
                    <DialogDescription className="text-sky-950/70 mt-2 text-base">
                        ¿Estás seguro de que deseas eliminar esta acción de la bitácora? <br /><br />
                        <span className="font-bold">Esta acción no se puede deshacer.</span>
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <div className="mt-4 bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2">
                        <span className="icon-[mdi--alert-circle]"></span>
                        {error}
                    </div>
                )}

                <DialogFooter className="mt-6 flex gap-2 justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sky-950 font-bold hover:bg-neutral-100 rounded-lg transition-colors text-sm"
                        disabled={isDeleting}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm"
                        disabled={isDeleting}
                    >
                        {isDeleting ? <span className="icon-[svg-spinners--180-ring-with-bg]"></span> : <span className="icon-[mdi--trash-can-outline]"></span>}
                        Eliminar
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


// --- Action History Modal (Updated) ---

interface ActionHistoryModalProps {
    open: boolean;
    onClose: () => void;
    data: Action[];
    onEdit: (action: Action) => void;
    onDelete: (action: Action) => void;
}

function ActionHistoryModal({ open, onClose, data, onEdit, onDelete }: ActionHistoryModalProps) {
    const [filterText, setFilterText] = useState("");
    const [roleFilter, setRoleFilter] = useState("Todos");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filterText, roleFilter]);

    // Filter logic
    const filteredData = data.filter(item => {
        const matchesText =
            item.description.toLowerCase().includes(filterText.toLowerCase()) ||
            item.type.toLowerCase().includes(filterText.toLowerCase()) ||
            item.author.toLowerCase().includes(filterText.toLowerCase());

        const matchesRole =
            roleFilter === "Todos" ||
            (roleFilter === "Estudiantes" && (item.role === "Estudiante" || item.author.includes("Alumno"))) ||
            (roleFilter === "Profesores" && (item.role === "Profesor" || item.author.includes("Profesor"))) ||
            (roleFilter === "Coordinadores" && item.role === "Coordinador") ||
            (roleFilter === "Administradores" && (item.role === "Administrador" || item.role === "Admin" || item.author === "Sistema"));

        return matchesText && matchesRole;
    });

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const columns: Column<Action>[] = [
        {
            header: "Fecha",
            accessorKey: "date",
            className: "text-base font-bold text-sky-950 whitespace-nowrap",
        },
        {
            header: "Tipo / Autor",
            accessorKey: "type",
            render: (item) => (
                <div className="flex flex-col">
                    <span className="font-bold text-sky-950">{item.type}</span>
                    <span className="text-sm text-sky-950/60">{item.author}</span>
                </div>
            ),
        },
        {
            header: "Descripción",
            accessorKey: "description",
            render: (item) => (
                <div className="text-base text-sky-950/80 leading-snug whitespace-pre-wrap">
                    {(() => {
                        const desc = item.description;
                        // Clean up description for display:
                        let cleanDesc = desc;
                        const orientMatch = desc.match(/Orientación:\s*([\s\S]*?)$/);
                        if (orientMatch) {
                            cleanDesc = orientMatch[1].trim();
                        } else {
                            if (desc.includes('Problema:')) {
                                cleanDesc = desc.replace(/Problema:\s*[\s\S]*?(?=\n|$)/, '').trim();
                            }
                        }
                        const textToDisplay = cleanDesc || item.description;

                        // Bold specific phrases logic
                        return textToDisplay.split(/(\bNuevo estatus:|\bMotivo:|\bCaso creado con estatus:)/).map((part: string, i: number) => {
                            if (["Nuevo estatus:", "Motivo:", "Caso creado con estatus:"].includes(part)) {
                                return <strong key={i} className="text-sky-950 font-black">{part}</strong>;
                            }
                            return part;
                        });
                    })()}
                </div>
            ),
        },
        {
            header: "Acciones",
            render: (item) => {
                // Don't show actions for Status Changes, only for regular Actions
                if (item.isStatusChange) return null;

                return (
                    <div className="flex gap-2">
                        <button
                            onClick={() => onEdit(item)}
                            className="p-2 hover:bg-neutral-100 rounded-lg text-sky-950/60 hover:text-[#3E7DBB] transition-colors"
                            title="Editar"
                        >
                            <span className="icon-[mdi--pencil] text-lg"></span>
                        </button>
                        <button
                            onClick={() => onDelete(item)}
                            className="p-2 hover:bg-red-50 rounded-lg text-sky-950/60 hover:text-red-600 transition-colors"
                            title="Eliminar"
                        >
                            <span className="icon-[mdi--trash-can-outline] text-lg"></span>
                        </button>
                    </div>
                );
            }
        }
    ];

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl bg-neutral-50 p-0 overflow-hidden border-0 rounded-3xl flex flex-col max-h-[85vh]">
                <DialogHeader className="p-8 bg-white border-b border-neutral-100 flex-none">
                    <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-1">
                            <DialogTitle className="text-sky-950 font-bold text-3xl flex items-center gap-3">
                                <span className="icon-[mdi--history] text-[#3E7DBB]"></span>
                                Historial Completo de Acciones
                            </DialogTitle>
                            <DialogDescription className="text-lg text-sky-950/60">
                                Visualiza y filtra todas las acciones registradas en este expediente.
                            </DialogDescription>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex items-center gap-4 mt-6">
                        <div className="relative flex-1">
                            <span className="icon-[mdi--magnify] text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 text-xl"></span>
                            <Input
                                placeholder="Buscar en descripción, tipo o autor..."
                                value={filterText}
                                onChange={(e) => setFilterText(e.target.value)}
                                className="pl-10 bg-neutral-50 border-neutral-200 h-12 text-base rounded-xl"
                            />
                        </div>
                        <div className="flex bg-neutral-100 p-1 rounded-xl">
                            {["Todos", "Estudiantes", "Profesores", "Coordinadores", "Administradores"].map((role) => (
                                <button
                                    key={role}
                                    onClick={() => setRoleFilter(role)}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                                        roleFilter === role
                                            ? "bg-white text-[#003366] shadow-sm"
                                            : "text-gray-400 hover:text-gray-600"
                                    )}
                                >
                                    {role}
                                </button>
                            ))}
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 p-8 overflow-hidden bg-neutral-50 flex flex-col min-h-0">
                    <div className="flex-1 bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col min-h-0">

                        <CustomTable
                            data={paginatedData}
                            columns={columns}
                            className="flex-1 border-0 rounded-none shadow-none"
                            minRows={10}
                        />
                        {/* Pagination Footer */}
                        <div className="flex-none p-4 border-t border-neutral-200 bg-white flex items-center justify-between">
                            <p className="text-sm text-sky-950/60 font-medium">
                                Mostrando {filteredData.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0} a {Math.min(currentPage * itemsPerPage, filteredData.length)} de {filteredData.length} acciones
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg text-sky-950 hover:bg-neutral-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                                >
                                    <span className="icon-[mdi--chevron-left] text-2xl"></span>
                                </button>
                                <span className="text-sm font-bold text-sky-950">
                                    Página {currentPage} de {totalPages || 1}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    className="p-2 rounded-lg text-sky-950 hover:bg-neutral-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                                >
                                    <span className="icon-[mdi--chevron-right] text-2xl"></span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

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
export default function FollowUpClient({ user }: { user: any }) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const paramCaseId = searchParams.get("caseId");

    // Selected Case State
    const [selectedCaseId, setSelectedCaseId] = useState<number | null>(paramCaseId ? parseInt(paramCaseId) : null);
    const [caseDetails, setCaseDetails] = useState<any>(null); // Full details from getCaseReportData
    const [statusHistory, setStatusHistory] = useState<any[]>([]); // From getHistorialEstatus
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    // New Action State
    const [newActionProblem, setNewActionProblem] = useState("");
    const [newActionOrientation, setNewActionOrientation] = useState("");
    const [newActionDate, setNewActionDate] = useState(new Date().toISOString().split('T')[0]);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isSavingAction, setIsSavingAction] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [actionSuccess, setActionSuccess] = useState(false);
    const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);

    // Edit/Delete State
    const [editingAction, setEditingAction] = useState<Action | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [actionToDelete, setActionToDelete] = useState<Action | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Redirect if no caseId
    useEffect(() => {
        if (!paramCaseId) {
            router.replace("/cases");
        } else {
            setSelectedCaseId(parseInt(paramCaseId));
        }
    }, [paramCaseId, router]);
    useEffect(() => {
        const loadDetails = async () => {
            if (!selectedCaseId) {
                setCaseDetails(null);
                setStatusHistory([]);
                return;
            }

            setIsLoadingDetails(true);
            try {
                const [details, history] = await Promise.all([
                    getCaseReportData(selectedCaseId.toString()),
                    getHistorialEstatus(selectedCaseId)
                ]);

                if (details) setCaseDetails(details);
                if (history.success) setStatusHistory(history.data || []);

            } catch (error) {
                console.error("Error loading case details:", error);
            } finally {
                setIsLoadingDetails(false);
            }
        };

        if (selectedCaseId) loadDetails();
    }, [selectedCaseId]);


    // Handlers removed (search/click)

    const refreshData = async () => {
        if (!selectedCaseId) return;
        setIsLoadingDetails(true);
        try {
            const [details, history] = await Promise.all([
                getCaseReportData(selectedCaseId.toString()),
                getHistorialEstatus(selectedCaseId)
            ]);

            if (details) setCaseDetails(details);
            if (history.success) setStatusHistory(history.data || []);
        } catch (error) {
            console.error("Error refreshing case details:", error);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const handleSaveAction = async () => {
        if (!selectedCaseId) return;
        if (!newActionProblem.trim() && !newActionOrientation.trim()) {
            setActionError('Por favor ingrese al menos una descripción');
            return;
        }

        setIsSavingAction(true);
        setActionError(null);
        setActionSuccess(false);

        try {
            // Save cleanly: Title separate from Description
            const titulo = newActionProblem.trim().substring(0, 50) || 'Acción registrada';
            const observacion = newActionOrientation.trim();

            const result = await createAccion({
                nro_caso: selectedCaseId,
                titulo_accion: titulo,
                observacion: observacion || undefined,
                fecha_realizacion: newActionDate
            });

            if (result.success) {
                // Limpiar formulario
                setNewActionProblem("");
                setNewActionOrientation("");
                setNewActionDate(new Date().toISOString().split('T')[0]);
                setActionSuccess(true);

                // Recargar datos del caso para mostrar la nueva acción
                await refreshData();

                // Ocultar mensaje de éxito después de 3 segundos
                setTimeout(() => setActionSuccess(false), 3000);
            } else {
                setActionError(result.error || 'Error al guardar la acción');
            }
        } catch (error: any) {
            setActionError(error.message || 'Error al guardar la acción');
        } finally {
            setIsSavingAction(false);
        }
    };

    const handleEditAction = (action: Action) => {
        setEditingAction(action);
        setIsEditModalOpen(true);
    };

    const handleDeleteAction = (action: Action) => {
        setActionToDelete(action);
        setIsDeleteModalOpen(true);
    };

    const onUpdateAction = async (data: UpdateAccionData) => {
        if (!editingAction || !editingAction.rawId || !editingAction.nroCaso) return;

        const result = await updateAccion(editingAction.rawId!, editingAction.nroCaso!, data);
        if (result.success) {
            await refreshData();
        } else {
            throw new Error(result.error || "Error al actualizar la acción");
        }
    };

    const onDeleteConfirm = async () => {
        if (!actionToDelete || !actionToDelete.rawId || !actionToDelete.nroCaso) return;

        const result = await deleteAccion(actionToDelete.rawId!, actionToDelete.nroCaso!);
        if (result.success) {
            await refreshData();
        } else {
            throw new Error(result.error || "Error al eliminar la acción");
        }
    };

    const handleAttachFile = () => {
        console.log("Attaching file");
        // TODO: Implement file attachment
    };

    // Derived Data for UI
    const appointmentsDisplay = caseDetails?.appointments?.map((appt: any) => ({
        id: appt.id_cita,
        title: appt.observacion || "Cita Programada",
        date: new Date(appt.fecha_atencion).toLocaleDateString("es-ES", { day: '2-digit', month: 'short', year: 'numeric' }),
        time: new Date(appt.fecha_atencion).toLocaleTimeString("es-ES", { hour: '2-digit', minute: '2-digit' })
    })) || [];

    const documentsDisplay = caseDetails?.supports?.map((doc: any) => ({
        id: doc.id_soporte,
        name: doc.descripcion || "Documento",
        type: "pdf", // Placeholder type
        url: doc.documento_url // Correct property from API
    })) || [];

    const actionsDisplay: Action[] = caseDetails?.actions?.map((action: any, index: number) => ({
        id: `action-${action.nro_accion || index}`,
        rawId: action.nro_accion,
        nroCaso: action.nro_caso,
        type: action.titulo_accion || "Acción",
        dateObj: new Date(action.fecha_registro || action.fecha_realizacion),
        date: new Date(action.fecha_realizacion).toLocaleDateString("es-ES", { day: '2-digit', month: 'long', year: 'numeric' }),
        author: action.nombres ? `${action.nombres} ${action.apellidos}` : "Usuario",
        role: action.rol,
        description: action.observacion || "",
        isStatusChange: false
    })) || [];

    const statusDisplay: Action[] = statusHistory.map((status: any, index: number) => {
        // Logic for "Caso creado"
        const isCaseCreated = status.motivo === "Caso creado";
        const displayType = isCaseCreated ? "Caso creado" : "Cambio de Estatus";
        const displayDescription = isCaseCreated
            ? `Caso creado con estatus: ${status.nombre_estatus}`
            : `Nuevo estatus: ${status.nombre_estatus}${status.motivo ? `.\nMotivo: ${status.motivo}` : ""}`;

        return {
            id: `status-${index}`,
            type: displayType,
            dateObj: new Date(status.fecha_registro),
            date: new Date(status.fecha_registro).toLocaleDateString("es-ES", { day: '2-digit', month: 'long', year: 'numeric' }),
            author: status.usuario_nombre || "Sistema",
            role: status.rol || "Sistema",
            description: displayDescription,
            isStatusChange: true
        };
    }) || [];

    const historyDisplay = [...actionsDisplay, ...statusDisplay].sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());

    // Add status history to display if needed, or mix them. Usually actions are separate from status changes.
    // For now we use the 'actions' (Bitácora) as the main history timeline per the mock.

    const historyPreview = historyDisplay.slice(0, 3);

    // Loading State Logic handled in render below to keep header visible


    return (
        <div className="w-full h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex-none px-8 pt-8 pb-6 bg-white border-b border-neutral-200 flex justify-between items-center">
                <div>
                    <h1 className="text-sky-950 text-4xl font-bold tracking-tight">
                        Gestión de Casos
                    </h1>
                    <p className="text-[#325B84] text-lg font-medium mt-2">
                        Visualiza el historial de acciones, citas y recaudos de un caso específico.
                    </p>
                </div>
                <button
                    onClick={() => router.push('/cases')}
                    className="px-8 py-4 bg-[#003366] hover:bg-[#002244] text-white text-lg font-bold rounded-xl transition-all hover:scale-105 shadow-sm hover:shadow-md cursor-pointer flex items-center gap-3"
                >
                    <span className="icon-[mdi--arrow-left] text-2xl"></span>
                    Volver a Casos
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-h-0 overflow-y-auto bg-neutral-50 p-8">
                {(!selectedCaseId || isLoadingDetails || !caseDetails) ? (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="flex flex-col items-center gap-4">
                            <span className="icon-[svg-spinners--180-ring-with-bg] text-4xl text-[#3E7DBB]"></span>
                            <p className="text-sky-950/60 font-medium">Cargando expediente...</p>
                        </div>
                    </div>
                ) : (
                    /* Case Selected View */
                    <div className="max-w-7xl mx-auto">
                        {/* Case Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex flex-col">
                                <h2 className="text-sky-950 text-3xl font-bold flex items-center gap-2">
                                    <span className="icon-[mdi--clipboard-text-clock-outline] text-3xl text-[#3E7DBB]"></span>
                                    Seguimiento y Control
                                </h2>
                                <h3 className="text-sky-950/60 text-xl font-medium mt-1">
                                    Expediente #{selectedCaseId}
                                </h3>
                            </div>
                            <div className="flex gap-2">
                                <DownloadCaseReportButton
                                    caseId={selectedCaseId.toString()}
                                    caseNumber={caseDetails.caseInfo.nro_caso.toString()}
                                />
                            </div>
                        </div>

                        {/* Grid Layout */}
                        <div className="grid grid-cols-3 gap-6">
                            {/* Left Column */}
                            <div className="col-span-1 space-y-6">
                                {/* Case Details Card */}
                                <div className="bg-white rounded-2xl border-2 border-neutral-200 p-6 shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sky-950 text-xl font-bold">
                                            Detalles del Caso:
                                        </h3>
                                        <button
                                            onClick={() => setIsDetailsModalOpen(true)}
                                            className="px-4 py-2 bg-[#EEF5FB] hover:bg-[#E0EBF7] text-[#3E7DBB] text-xs font-bold rounded-xl transition-all hover:scale-105 flex items-center gap-2 cursor-pointer shadow-sm border border-[#3E7DBB]/10"
                                        >
                                            <span className="icon-[mdi--eye-plus-outline] text-xl"></span>
                                            VER TODO
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <div className="text-sky-950/60 text-sm font-medium mb-1">Beneficiario:</div>
                                            <div className="text-sky-950 font-bold">
                                                {caseDetails?.caseInfo?.solicitante_nombres} {caseDetails?.caseInfo?.solicitante_apellidos}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-sky-950/60 text-sm font-medium mb-1">Materia:</div>
                                            <div className="text-sky-950 font-bold">{caseDetails?.caseInfo?.nombre_materia}</div>
                                        </div>
                                        <div>
                                            <div className="text-sky-950/60 text-sm font-medium mb-1">Profesor Supervisor:</div>
                                            <div className="text-sky-950 font-bold">
                                                {caseDetails?.supervisors?.[0] ? `${caseDetails.supervisors[0].nombres} ${caseDetails.supervisors[0].apellidos}` : "Sin Asignar"}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-sky-950/60 text-sm font-medium mb-1">Alumnos Asignados:</div>
                                            <div className="space-y-1">
                                                {caseDetails?.students && caseDetails.students.length > 0 ? (
                                                    caseDetails.students.map((student: any, idx: number) => (
                                                        <div key={idx} className="text-sky-950 font-bold">
                                                            {student.nombres} {student.apellidos}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-sky-950 font-bold">Sin Asignar</div>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-sky-950/60 text-sm font-medium mb-1">Semestre de Gestión:</div>
                                            <div className="text-sky-950 font-bold">
                                                {caseDetails?.caseInfo?.periodo_actual || "N/A"}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-sky-950/60 text-sm font-medium mb-1 flex items-center justify-between">
                                                <span>Estatus:</span>
                                                <button
                                                    onClick={() => setIsStatusDialogOpen(true)}
                                                    className="px-4 py-1.5 bg-[#EEF5FB] hover:bg-[#E0EBF7] text-[#3E7DBB] text-xs font-black uppercase tracking-widest rounded-lg transition-all hover:scale-105 flex items-center gap-2 cursor-pointer shadow-sm border border-[#3E7DBB]/10 active:scale-95"
                                                >
                                                    <span className="icon-[mdi--swap-horizontal] text-sm"></span>
                                                    CAMBIAR
                                                </button>
                                            </div>
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">
                                                <span className="icon-[mdi--circle] text-[8px] mr-1.5"></span>
                                                {caseDetails?.caseInfo?.estatus_actual || "Desconocido"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Beneficiaries Card */}
                                <div className="bg-white rounded-2xl border-2 border-neutral-200 p-6 shadow-sm">
                                    <h3 className="text-sky-950 text-xl font-bold mb-4">
                                        Beneficiarios:
                                    </h3>
                                    <div className="space-y-3">
                                        {caseDetails?.beneficiaries && caseDetails.beneficiaries.length > 0 ? (
                                            caseDetails.beneficiaries.map((ben: any, idx: number) => (
                                                <div key={idx} className="p-3 bg-pink-50 rounded-xl border border-pink-100">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="icon-[mdi--account] text-pink-600 text-lg"></span>
                                                        <span className="font-bold text-sky-950 text-sm">
                                                            {ben.nombres} {ben.apellidos}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-sky-950/70 ml-6">
                                                        <span className="font-semibold">C.I:</span> {ben.cedula_beneficiario}
                                                    </div>
                                                    <div className="text-xs text-sky-950/70 ml-6">
                                                        <span className="font-semibold">Parentesco:</span> {ben.parentesco || "N/A"}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-gray-400 text-sm">No hay beneficiarios registrados.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Legal Details Card */}
                                <div className="bg-white rounded-2xl border-2 border-neutral-200 p-6 shadow-sm">
                                    <h3 className="text-sky-950 text-xl font-bold mb-4">
                                        Detalles Legales:
                                    </h3>
                                    <div className="space-y-3">
                                        <div>
                                            <div className="text-sky-950/60 text-sm font-medium mb-1">Trámite:</div>
                                            <div className="text-sky-950 font-bold text-sm">{caseDetails?.caseInfo?.nombre_tramite || "N/A"}</div>
                                        </div>
                                        <div>
                                            <div className="text-sky-950/60 text-sm font-medium mb-1">Núcleo:</div>
                                            <div className="text-sky-950 font-bold text-sm">{caseDetails?.caseInfo?.nombre_nucleo || "N/A"}</div>
                                        </div>
                                        <div>
                                            <div className="text-sky-950/60 text-sm font-medium mb-1">Ámbito:</div>
                                            <div className="text-sky-950 font-bold text-sm">{caseDetails?.caseInfo?.nombre_ambito_legal || "N/A"}</div>
                                        </div>
                                        <div>
                                            <div className="text-sky-950/60 text-sm font-medium mb-1">Inicio del Caso:</div>
                                            <div className="text-sky-950 font-bold text-sm">
                                                {caseDetails?.caseInfo?.fecha_caso_inicio
                                                    ? new Date(caseDetails.caseInfo.fecha_caso_inicio).toLocaleDateString("es-ES")
                                                    : "N/A"}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Upcoming Appointments Card */}
                                <div className="bg-white rounded-2xl border-2 border-neutral-200 p-6 shadow-sm">
                                    <h3 className="text-sky-950 text-xl font-bold mb-4">
                                        Próximas Citas:
                                    </h3>
                                    <div className="space-y-3">
                                        {appointmentsDisplay.length > 0 ? appointmentsDisplay.map((appointment: any) => (
                                            <div key={appointment.id} className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
                                                <span className="icon-[mdi--calendar-clock] text-[#3E7DBB] text-2xl flex-none mt-0.5"></span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sky-950 font-bold text-sm mb-1">
                                                        {appointment.title}
                                                    </div>
                                                    <div className="text-sky-950/60 text-xs font-medium">
                                                        {appointment.date} - {appointment.time}
                                                    </div>
                                                </div>
                                            </div>
                                        )) : <p className="text-gray-400 text-sm">No hay citas próximas.</p>}
                                    </div>
                                </div>

                                {/* Soportes Legales Section */}
                                <div className="bg-white rounded-2xl border-2 border-neutral-200 p-6 shadow-sm">
                                    <h3 className="text-sky-950 text-xl font-bold mb-4">
                                        Soportes Legales:
                                    </h3>
                                    <div className="space-y-3">
                                        {documentsDisplay.length > 0 ? documentsDisplay.map((doc: any) => (
                                            doc.url ? (
                                                <a
                                                    key={doc.id}
                                                    href={doc.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="group flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-neutral-200 hover:border-[#3E7DBB] hover:bg-blue-50/50 transition-all cursor-pointer shadow-sm hover:shadow-md"
                                                >
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className="w-10 h-10 rounded-lg bg-white border border-neutral-200 flex items-center justify-center flex-none group-hover:bg-[#3E7DBB] group-hover:border-[#3E7DBB] transition-colors">
                                                            <span className="icon-[mdi--file-document-outline] text-[#3E7DBB] text-2xl group-hover:text-white transition-colors"></span>
                                                        </div>
                                                        <div className="flex flex-col overflow-hidden">
                                                            <span className="text-sky-950 text-sm font-bold truncate group-hover:text-[#003366] transition-colors" title={doc.name}>
                                                                {doc.name}
                                                            </span>
                                                            <span className="text-sky-950/40 text-xs font-medium group-hover:text-[#3E7DBB] transition-colors">
                                                                Clic para ver documento
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <span className="icon-[mdi--open-in-new] text-neutral-300 text-xl group-hover:text-[#3E7DBB] transition-colors"></span>
                                                </a>
                                            ) : (
                                                <div key={doc.id} className="group flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-neutral-200 opacity-60">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className="w-10 h-10 rounded-lg bg-white border border-neutral-200 flex items-center justify-center flex-none">
                                                            <span className="icon-[mdi--file-document-outline] text-neutral-400 text-2xl"></span>
                                                        </div>
                                                        <div className="flex flex-col overflow-hidden">
                                                            <span className="text-sky-950 text-sm font-bold truncate" title={doc.name}>
                                                                {doc.name}
                                                            </span>
                                                            <span className="text-sky-950/40 text-xs font-medium">No disponible</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        )) : (
                                            <div className="text-center py-8 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                                                <span className="icon-[mdi--file-document-remove-outline] text-4xl text-neutral-300 mb-2"></span>
                                                <p className="text-sky-950/40 text-sm font-medium">No hay soportes registrados.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column */}
                            <div className="col-span-2 space-y-6">
                                {/* Register New Action Card */}
                                <div className="bg-white rounded-2xl border-2 border-neutral-200 p-6 shadow-sm">
                                    <h3 className="text-sky-950 text-xl font-bold mb-4">
                                        Registrar Nueva Acción:
                                    </h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sky-950 font-semibold mb-2 text-sm">Fecha de Realización</label>
                                            <Input
                                                type="date"
                                                value={newActionDate}
                                                onChange={(e) => setNewActionDate(e.target.value)}
                                                className="w-full"
                                                max={new Date().toISOString().split('T')[0]}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sky-950 font-semibold mb-2 text-sm">Título de la Acción</label>
                                            <textarea
                                                placeholder="Ej: Entrevista inicial, Revisión de documentos..."
                                                value={newActionProblem}
                                                onChange={(e) => setNewActionProblem(e.target.value)}
                                                disabled={isSavingAction}
                                                className="w-full px-4 py-3 bg-neutral-50 rounded-xl border-2 border-neutral-200 text-sky-950 text-sm font-medium placeholder:text-sky-950/40 focus:outline-none focus:border-[#3E7DBB] focus:bg-white transition-all resize-none h-24 disabled:opacity-50 disabled:cursor-not-allowed"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sky-950 font-semibold mb-2 text-sm">Descripción de la Acción</label>
                                            <textarea
                                                placeholder="Ej: Se atendió al usuario y se le solicitaron los recaudos necesarios..."
                                                value={newActionOrientation}
                                                onChange={(e) => setNewActionOrientation(e.target.value)}
                                                disabled={isSavingAction}
                                                className="w-full px-4 py-3 bg-neutral-50 rounded-xl border-2 border-neutral-200 text-sky-950 text-sm font-medium placeholder:text-sky-950/40 focus:outline-none focus:border-[#3E7DBB] focus:bg-white transition-all resize-none h-24 disabled:opacity-50 disabled:cursor-not-allowed"
                                            />
                                        </div>

                                        {/* Error Message */}
                                        {actionError && (
                                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                                                <span className="icon-[mdi--alert-circle] text-lg"></span>
                                                {actionError}
                                            </div>
                                        )}

                                        {/* Success Message */}
                                        {actionSuccess && (
                                            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                                                <span className="icon-[mdi--check-circle] text-lg"></span>
                                                Acción guardada exitosamente
                                            </div>
                                        )}
                                        <div className="flex gap-3">
                                            <button
                                                onClick={handleSaveAction}
                                                disabled={isSavingAction}
                                                className="flex-1 px-5 py-2.5 bg-[#003366] hover:bg-[#002244] text-white text-sm font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isSavingAction ? (
                                                    <>
                                                        <span className="icon-[svg-spinners--180-ring-with-bg] text-lg"></span>
                                                        Guardando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="icon-[mdi--content-save] text-lg"></span>
                                                        Guardar Acción
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Action History Timeline */}
                                <div className="bg-white rounded-2xl border-2 border-neutral-200 p-6 shadow-sm">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-sky-950 text-xl font-bold">
                                            Historial de Acciones:
                                        </h3>
                                        <button
                                            onClick={() => setIsHistoryModalOpen(true)}
                                            className="px-4 py-2 bg-[#EEF5FB] hover:bg-[#E0EBF7] text-[#3E7DBB] text-xs font-bold rounded-xl transition-all hover:scale-105 flex items-center gap-2 cursor-pointer shadow-sm border border-[#3E7DBB]/10"
                                        >
                                            <span className="icon-[mdi--eye-outline] text-xl"></span>
                                            VER TODO
                                        </button>
                                    </div>

                                    <div className="flex flex-col">
                                        {historyPreview.length > 0 ? (
                                            <>
                                                {historyPreview.map((action: any, index: number) => (
                                                    <div key={action.id} className="flex gap-4">
                                                        {/* Timeline Icon */}
                                                        <div className="flex flex-col items-center">
                                                            <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center flex-none ${action.isStatusChange ? "bg-yellow-50 border-yellow-500" : "bg-blue-50 border-[#3E7DBB]"}`}>
                                                                <span className={`text-lg ${action.isStatusChange ? "icon-[mdi--swap-horizontal] text-yellow-600" : "icon-[mdi--file-document-outline] text-[#3E7DBB]"}`}></span>
                                                            </div>
                                                            {(index < historyPreview.length - 1 || historyDisplay.length > 3) && (
                                                                <div className="w-0.5 flex-1 bg-neutral-200"></div>
                                                            )}
                                                        </div>

                                                        {/* Action Content */}
                                                        <div className="flex-1 pb-6">
                                                            <div className="flex items-start justify-between mb-2">
                                                                <div>
                                                                    <h4 className="text-sky-950 font-bold text-base mb-1">
                                                                        {action.type}
                                                                    </h4>
                                                                    <p className="text-sky-950/60 text-xs font-medium">
                                                                        {action.date}
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="px-3 py-1 bg-blue-50 text-[#3E7DBB] text-xs font-bold rounded-full">
                                                                        {action.author}
                                                                    </span>
                                                                    {/* Buttons for quick edit/delete in preview if desired, 
                                                                         for now keeping it simple as only history modal was requested 
                                                                         explicitly, but let's add them for consistency with the modal if it's not a status change 
                                                                     */}
                                                                    {!action.isStatusChange && (
                                                                        <div className="flex gap-1">
                                                                            <button
                                                                                onClick={() => handleEditAction(action)}
                                                                                className="p-1 text-sky-950/40 hover:text-[#3E7DBB] transition-colors"
                                                                                title="Editar"
                                                                            >
                                                                                <span className="icon-[mdi--pencil]"></span>
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleDeleteAction(action)}
                                                                                className="p-1 text-sky-950/40 hover:text-red-500 transition-colors"
                                                                                title="Eliminar"
                                                                            >
                                                                                <span className="icon-[mdi--trash-can-outline]"></span>
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <p className="text-sky-950/80 text-sm leading-relaxed whitespace-pre-wrap">
                                                                {(() => {
                                                                    const desc = action.description;
                                                                    // Same cleaning logic 
                                                                    let cleanDesc = desc;
                                                                    const orientMatch = desc.match(/Orientación:\s*([\s\S]*?)$/);
                                                                    if (orientMatch) {
                                                                        cleanDesc = orientMatch[1].trim();
                                                                    } else if (desc.includes('Problema:')) {
                                                                        cleanDesc = desc.replace(/Problema:\s*[\s\S]*?(?=\n|$)/, '').trim();
                                                                    }
                                                                    const textToDisplay = cleanDesc || action.description;

                                                                    // Bold specific phrases logic
                                                                    return textToDisplay.split(/(\bNuevo estatus:|\bMotivo:|\bCaso creado con estatus:)/).map((part: string, i: number) => {
                                                                        if (["Nuevo estatus:", "Motivo:", "Caso creado con estatus:"].includes(part)) {
                                                                            return <strong key={i} className="text-sky-950 font-black">{part}</strong>;
                                                                        }
                                                                        return part;
                                                                    });
                                                                })()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}

                                                {/* More Content Indicator */}
                                                {historyDisplay.length > 3 && (
                                                    <div className="flex gap-4">
                                                        <div className="flex flex-col items-center">
                                                            <div className="w-10 h-10 rounded-full bg-neutral-50 border-2 border-dashed border-neutral-300 flex items-center justify-center flex-none group">
                                                                <span className="icon-[mdi--dots-vertical] text-neutral-400 text-xl group-hover:text-[#3E7DBB] transition-colors"></span>
                                                            </div>
                                                        </div>
                                                        <div className="flex-1 pt-0.5">
                                                            <button
                                                                onClick={() => setIsHistoryModalOpen(true)}
                                                                className="px-4 py-2 bg-[#EEF5FB] hover:bg-[#E0EBF7] text-[#3E7DBB] text-xs font-black uppercase tracking-widest rounded-xl transition-all hover:scale-105 flex items-center gap-2 cursor-pointer shadow-sm border border-[#3E7DBB]/10 active:scale-95 group"
                                                            >
                                                                <span className="icon-[mdi--eye-outline] text-lg group-hover:scale-110 transition-transform"></span>
                                                                Ver {historyDisplay.length - 3} más en el historial completo
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        ) : <p className="text-gray-400 text-sm">No hay historial disponible.</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* History Modal */}
            <ActionHistoryModal
                open={isHistoryModalOpen}
                onClose={() => setIsHistoryModalOpen(false)}
                data={historyDisplay}
                onEdit={handleEditAction}
                onDelete={handleDeleteAction}
            />

            {/* Edit Action Dialog */}
            <EditActionDialog
                open={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                action={editingAction}
                onSave={onUpdateAction}
            />

            {/* Delete Action Dialog */}
            <DeleteActionDialog
                open={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={onDeleteConfirm}
            />

            {/* Case Details Modal */}
            {selectedCaseId && caseDetails && (
                <CaseDetailsModal
                    open={isDetailsModalOpen}
                    onClose={() => setIsDetailsModalOpen(false)}
                    caseData={{
                        id: selectedCaseId.toString(),
                        caseNumber: caseDetails.caseInfo?.nro_caso?.toString() || "",
                        applicantName: caseDetails.caseInfo?.solicitante_nombres || "",
                        applicantId: caseDetails.caseInfo?.cedula_solicitante || "",
                        subject: caseDetails.caseInfo?.nombre_materia || "",
                        procedure: caseDetails.caseInfo?.nombre_tramite || "",
                        legalAmbient: caseDetails.caseInfo?.nombre_ambito_legal || "",
                        period: "2024-2025",
                        assignedStudent: caseDetails.students?.[0] ? `${caseDetails.students[0].nombres} ${caseDetails.students[0].apellidos}` : "Sin Asignar",
                        status: mapEstatusToFrontend(caseDetails.caseInfo?.estatus_actual),
                        createdAt: caseDetails.caseInfo?.fecha_caso_inicio || ""
                    }}
                    preloadedDetails={caseDetails}
                    preloadedStatusHistory={statusHistory}
                />
            )}

            {/* Status Change Dialog */}
            {selectedCaseId && (
                <StatusChangeDialog
                    open={isStatusDialogOpen}
                    onClose={() => setIsStatusDialogOpen(false)}
                    nroCaso={selectedCaseId!}
                    currentStatusId={caseDetails?.case?.id_estatus}
                    onStatusChanged={refreshData}
                    cedulaUsuario={user?.cedula}
                />
            )}
        </div>
    );
}
