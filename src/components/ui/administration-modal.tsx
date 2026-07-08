"use client";
import { getUsuarioById } from "@/actions/administracion";

import { useState, useEffect, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/shadcn/dialog";
import { Input } from "@/components/shadcn/input";
import { Label } from "@/components/shadcn/label";
import PrimaryButton from "./primary-button";
import { cn } from "@/lib/utils";
import FormErrorAlert from "./form-error-alert";

interface AdministrationModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void> | void;
    item?: any;
    mode: "create" | "edit";
    type: "users" | "centers" | "semestres" | "materias" | "categorias" | "subcategorias" | "ambitos" | "bienes";
    parishes?: { id: string; nombre: string }[];
    participations?: any[];
    materias?: { id: string; nombre: string }[];
    categorias?: { id: string; nombre: string; materiaid?: string }[];
    subcategorias?: { id: string; nombre: string; categorymateriaid: string }[];
    semestres?: { term: string; fecha_inicio: string; fecha_final: string }[];
    initialData?: any;
}

interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    className?: string;
}

const CustomSelect = ({ value, onChange, options, className }: CustomSelectProps) => {
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

    const selectedOption = options.find(opt => String(opt.value) === String(value));

    return (
        <div className={cn("relative", className)} ref={containerRef}>
            <div
                className={cn(
                    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors cursor-pointer flex items-center justify-between",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                )}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={selectedOption ? "text-sky-950" : "text-muted-foreground"}>
                    {selectedOption ? selectedOption.label : "Seleccionar"}
                </span>
                <span className="icon-[mingcute--down-fill] text-sm text-gray-500"></span>
            </div>

            {isOpen && (
                <div className="absolute top-[110%] left-0 w-full rounded-md border bg-white shadow-md z-50 overflow-hidden max-h-40 overflow-y-auto">
                    {options.map((option, index) => (
                        <div
                            key={option.value || `option-${index}`}
                            className={cn(
                                "px-3 py-2 text-sm cursor-pointer transition-colors hover:bg-blue-50 text-sky-950",
                                String(value) === String(option.value) && "bg-blue-100 font-semibold"
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


export default function AdministrationModal({
    open,
    onClose,
    onSave,
    item,
    mode,
    type,
    parishes = [],
    participations = [],
    materias = [],
    categorias = [],
    subcategorias = [],
    semestres = [],
    initialData = {},
}: AdministrationModalProps) {
    const [formData, setFormData] = useState<any>({});
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [submitErrors, setSubmitErrors] = useState<string[]>([]);
    const [isExistingUser, setIsExistingUser] = useState(false);

    // Filter states
    const [selectedMateriaId, setSelectedMateriaId] = useState<string>("");
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");

    // Initial State Setup
    useEffect(() => {
        if (open) {
            setSubmitErrors([]);
            setIsExistingUser(false);
            if (item && mode === "edit") {
                setFormData({
                    ...item,
                    cedulaPrefix: item.cedulaPrefix || "V",
                    cedulaNumber: item.cedulaNumber || item.id?.split("-")[1] || "",
                    parishId: item.parishId || item.id_parroquia?.toString() || "",
                    legalfieldid: item.legalfieldid || "",
                    categorylegalfieldid: item.categorylegalfieldid || item.categorymateriaid || "",
                    longid: item.longid || "",
                    // Asegurar que los valores de string nunca sean null o undefined
                    nombres: item.nombres || "",
                    apellidos: item.apellidos || "",
                    correo: item.correo || "",
                    telefonoLocal: item.telefonoLocal ?? "",
                    telefonoCelular: item.telefonoCelular ?? "",
                    password: "",
                    nombre: item.nombre || "",
                    term: item.term || "",
                    fecha_inicio: item.fecha_inicio ? new Date(item.fecha_inicio).toISOString().split('T')[0] : "",
                    fecha_final: item.fecha_final ? new Date(item.fecha_final).toISOString().split('T')[0] : "",
                });

                // Set initial filters for edit mode
                if (type === "subcategorias" && (item.categorylegalfieldid || item.categorymateriaid)) {
                    const catId = item.categorylegalfieldid || item.categorymateriaid;
                    const cat = categorias.find(c => String(c.id) === String(catId));
                    if (cat && cat.materiaid) {
                        setSelectedMateriaId(cat.materiaid);
                    }
                } else if (type === "ambitos" && item.longid) {
                    const sub = subcategorias.find(s => String(s.id) === String(item.longid));
                    if (sub && (sub.categorymateriaid || (sub as any).categorylegalfieldid)) {
                        const catId = sub.categorymateriaid || (sub as any).categorylegalfieldid;
                        setSelectedCategoryId(catId);
                        // Also set the materia ID
                        const cat = categorias.find(c => String(c.id) === String(catId));
                        if (cat && cat.materiaid) {
                            setSelectedMateriaId(cat.materiaid);
                        }
                    }
                }
            } else {
                setFormData({
                    user: "",
                    role: "Estudiante",
                    cedulaPrefix: "V",
                    cedulaNumber: "",
                    nombres: "",
                    apellidos: "",
                    correo: "",
                    sexo: "M",
                    telefonoLocal: "",
                    telefonoCelular: "",
                    password: "",
                    parishId: "",
                    legalfieldid: "",
                    nombre: "",
                    term: "",
                    tipoParticipacion: "Inscrito",
                    ...initialData
                });

                // Set initial filters for create mode (from initialData)
                if (type === "subcategorias" && initialData.categorylegalfieldid) {
                    const cat = categorias.find(c => String(c.id) === String(initialData.categorylegalfieldid));
                    if (cat && cat.materiaid) {
                        setSelectedMateriaId(cat.materiaid);
                    }
                } else if (type === "ambitos" && initialData.longid) {
                    const sub = subcategorias.find(s => String(s.id) === String(initialData.longid));
                    if (sub && (sub.categorymateriaid || (sub as any).categorylegalfieldid)) {
                        const catId = sub.categorymateriaid || (sub as any).categorylegalfieldid;
                        setSelectedCategoryId(catId);
                        // Also set the materia ID
                        const cat = categorias.find(c => String(c.id) === String(catId));
                        if (cat && cat.materiaid) {
                            setSelectedMateriaId(cat.materiaid);
                        }
                    }
                } else {
                    // Reset filters if no initial data
                    setSelectedMateriaId("");
                    setSelectedCategoryId("");
                }
            }
            setShowPassword(false);
        }
    }, [item, mode, open]);

    // Update tipoParticipacion when role changes in create mode
    useEffect(() => {
        if (mode === "create" && type === "users") {
            setFormData((prev: any) => ({
                ...prev,
                tipoParticipacion: prev.role === "Profesor" ? "Titular" : "Inscrito"
            }));
        }
    }, [formData.role, mode, type]);

    // Auto-fill logic
    useEffect(() => {
        const checkExistingUser = async () => {
            if (type === "users" && mode === "create" && formData.cedulaNumber && formData.cedulaNumber.length >= 6) {
                const cedula = `${formData.cedulaPrefix}-${formData.cedulaNumber}`;
                const result = await getUsuarioById(cedula);
                if (result.success && result.data) {
                    const user = result.data;
                    setFormData((prev: any) => ({
                        ...prev,
                        nombres: user.nombres || prev.nombres,
                        apellidos: user.apellidos || prev.apellidos,
                        correo: user.correo || prev.correo,
                        telefonoLocal: user.telefonoLocal || prev.telefonoLocal,
                        telefonoCelular: user.telefonoCelular || prev.telefonoCelular,
                        role: user.role || prev.role,
                        sexo: user.sexo || prev.sexo,
                    }));
                    setIsExistingUser(true);
                } else {
                    setIsExistingUser(false);
                }
            } else if (type === "users" && mode === "create" && (!formData.cedulaNumber || formData.cedulaNumber.length < 6)) {
                setIsExistingUser(false);
            }
        };

        const timer = setTimeout(() => {
            checkExistingUser();
        }, 500); // Debounce

        return () => clearTimeout(timer);
    }, [formData.cedulaNumber, formData.cedulaPrefix, mode, type]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitErrors([]);

        const errors: string[] = [];
        const fieldNames: Record<string, string> = {
            cedulaNumber: "Cédula",
            nombres: "Nombres",
            apellidos: "Apellidos",
            correo: "Correo",
            role: "Rol",
            term: "Semestre/Término",
            fecha_inicio: "Fecha de Inicio",
            fecha_final: "Fecha Final",
            nombre: "Nombre",
            materiaId: "Materia/Área",
            categorylegalfieldid: "Categoría",
            longid: "Subcategoría",
            parishId: "Parroquia",
            tipoParticipacion: "Tipo de Participación"
        };

        if (type === "users") {
            if (!formData.cedulaNumber || formData.cedulaNumber.trim() === "") errors.push(fieldNames.cedulaNumber);
            if (!formData.nombres || formData.nombres.trim() === "") errors.push(fieldNames.nombres);
            if (!formData.apellidos || formData.apellidos.trim() === "") errors.push(fieldNames.apellidos);
            if (!formData.correo || formData.correo.trim() === "") errors.push(fieldNames.correo);
            
            if (isStudentOrTeacher && (!formData.term || !formData.tipoParticipacion)) {
                if (!formData.term) errors.push(fieldNames.term);
                if (!formData.tipoParticipacion) errors.push(fieldNames.tipoParticipacion);
            }
            if (mode === "create" && !isExistingUser && formData.password && formData.password.length < 6) {
                errors.push("La contraseña debe tener al menos 6 caracteres");
            }
            if (mode === "edit" && formData.password && formData.password.length < 6) {
                errors.push("La contraseña debe tener al menos 6 caracteres");
            }
        }

        if (type === "centers" && mode === "create") {
            if (!formData.nombre || formData.nombre.trim() === "") errors.push(fieldNames.nombre);
        }

        if (type === "semestres") {
            if (!formData.term || formData.term.trim() === "") {
                errors.push(fieldNames.term);
            } else {
                const termPattern = /^\d{4}-\d{2}$/;
                if (!termPattern.test(formData.term)) errors.push("Formato de término inválido (YYYY-NN)");
            }
            if (!formData.fecha_inicio) errors.push(fieldNames.fecha_inicio);
            if (!formData.fecha_final) errors.push(fieldNames.fecha_final);
            
            if (formData.fecha_inicio && formData.fecha_final) {
                const fechaInicio = new Date(formData.fecha_inicio);
                const fechaFinal = new Date(formData.fecha_final);
                if (fechaFinal <= fechaInicio) errors.push("La fecha final debe ser posterior a la inicial");
            }
        }

        if (type === "materias" || type === "categorias" || type === "subcategorias" || type === "ambitos") {
            if (!formData.nombre || formData.nombre.trim() === "") errors.push(fieldNames.nombre);
            
            if (type === "categorias" && !formData.materiaId) errors.push(fieldNames.materiaId);
            if (type === "subcategorias" && !formData.categorylegalfieldid) errors.push(fieldNames.categorylegalfieldid);
            if (type === "ambitos" && !formData.longid) errors.push(fieldNames.longid);
        }

        switch (type) {
            case "ambitos":
                if (!formData.nombre?.trim()) errors.push("El nombre del ámbito legal es requerido");
                if (!formData.longid) errors.push("El ID de la subcategoría es requerido");
                break;
            case "bienes":
                if (!formData.descripcion?.trim()) errors.push("La descripción del bien es requerida");
                break;
        }

        if (errors.length > 0) {
            const uniqueErrors = Array.from(new Set(errors));
            setSubmitErrors(uniqueErrors);
            return;
        }

        setLoading(true);

        const finalData = { ...formData };
        if (type === "users") {
            finalData.id = `${formData.cedulaPrefix}-${formData.cedulaNumber}`;
            finalData.user = `${formData.nombres} ${formData.apellidos}`;
        }
        
        if (type === "categorias") {
            finalData.materiaid = formData.materiaId;
        }

        if (type === "subcategorias") {
            // Already validated categorylegalfieldid
        }

        if (type === "centers" && formData.parishId) {
            const parsed = parseInt(formData.parishId);
            if (!isNaN(parsed)) {
                finalData.id_parroquia = parsed;
            }
        }

        // Llamar a onSave de forma asíncrona
        try {
            await Promise.resolve(onSave(finalData));
            // Si onSave no lanza error, asumimos éxito y cerramos
            setLoading(false);
            onClose();
        } catch (err: any) {
            setLoading(false);
            setSubmitErrors([err.message || "Error al guardar"]);
            // El modal permanece abierto para que el usuario corrija
        }
    };

    const handleChange = (field: string, value: string) => {
        // Normalizar el valor a string para consistencia
        const normalizedValue = String(value);
        setFormData((prev: any) => ({ ...prev, [field]: normalizedValue }));
        if (submitErrors.length > 0) setSubmitErrors([]);
    };

    const getTitle = () => {
        const action = mode === "create" ? "Crear" : "Editar";
        let entity = "";
        switch (type) {
            case "users": entity = "Usuario"; break;
            case "centers": entity = "Centro"; break;
            case "semestres": entity = "Semestre"; break;
            case "materias": entity = "Materia"; break;
            case "categorias": entity = "Categoría"; break;
            case "subcategorias": entity = "Subcategoría"; break;
            case "ambitos": entity = "Ámbito Legal"; break;
            case "bienes": entity = "Bien"; break;
        }
        return `${action} ${entity}`;
    };

    const isStudentOrTeacher = type === "users" && (formData.role === "Estudiante" || formData.role === "Alumno" || formData.role === "Profesor");

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="w-[95vw] sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="text-sky-950 text-2xl font-semibold">{getTitle()}</DialogTitle>
                    <DialogDescription className="text-[#325B84]">
                        {mode === "create" ? "Ingresa los datos del nuevo elemento" : "Modifica los datos del elemento seleccionado"}
                    </DialogDescription>
                </DialogHeader>

                <div className="max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-4 px-1 pb-4">
                    <form id="admin-form" onSubmit={handleSubmit} className="space-y-4 pt-2">
                        <FormErrorAlert errors={submitErrors} onClose={() => setSubmitErrors([])} />

                        {type === "users" ? (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Columna 1 */}
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="role">Rol en el Sistema <span className="text-red-500">*</span></Label>
                                            <div className={isExistingUser ? "pointer-events-none opacity-50" : ""}>
                                                <CustomSelect
                                                    value={formData.role ?? "Estudiante"}
                                                    onChange={(val) => handleChange("role", val)}
                                                    options={[
                                                        { value: "Estudiante", label: "Estudiante" },
                                                        { value: "Profesor", label: "Profesor" },
                                                        { value: "Coordinador", label: "Coordinador" },
                                                    ]}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Cédula de Identidad <span className="text-red-500">*</span></Label>
                                            <div className="flex gap-2">
                                                <div className="w-24">
                                                    <CustomSelect
                                                        value={formData.cedulaPrefix ?? "V"}
                                                        onChange={(val) => handleChange("cedulaPrefix", val)}
                                                        options={[
                                                            { value: "V", label: "V" },
                                                            { value: "E", label: "E" },
                                                        ]}
                                                    />
                                                </div>
                                                <Input
                                                    value={formData.cedulaNumber ?? ""}
                                                    onChange={(e) => handleChange("cedulaNumber", e.target.value)}
                                                    placeholder="12.345.678"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="nombres">Nombres <span className="text-red-500">*</span></Label>
                                            <Input
                                                id="nombres"
                                                value={formData.nombres ?? ""}
                                                onChange={(e) => handleChange("nombres", e.target.value)}
                                                placeholder="Nombres"
                                                required
                                                disabled={isExistingUser}
                                                className={isExistingUser ? "bg-gray-100" : ""}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="apellidos">Apellidos <span className="text-red-500">*</span></Label>
                                            <Input
                                                id="apellidos"
                                                value={formData.apellidos ?? ""}
                                                onChange={(e) => handleChange("apellidos", e.target.value)}
                                                placeholder="Apellidos"
                                                required
                                                disabled={isExistingUser}
                                                className={isExistingUser ? "bg-gray-100" : ""}
                                            />
                                        </div>
                                    </div>

                                    {/* Columna 2 */}
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="correo">Correo Institucional <span className="text-red-500">*</span></Label>
                                            <Input
                                                id="correo"
                                                type="email"
                                                value={formData.correo ?? ""}
                                                onChange={(e) => handleChange("correo", e.target.value)}
                                                placeholder="@universidad.edu"
                                                required
                                                disabled={isExistingUser}
                                                className={isExistingUser ? "bg-gray-100" : ""}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="sexo">Sexo <span className="text-red-500">*</span></Label>
                                            <div className={isExistingUser ? "pointer-events-none opacity-50" : ""}>
                                                <CustomSelect
                                                    value={formData.sexo ?? "M"}
                                                    onChange={(val) => handleChange("sexo", val)}
                                                    options={[
                                                        { value: "M", label: "Masculino" },
                                                        { value: "F", label: "Femenino" },
                                                    ]}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="tlf_local">Tlf. Local</Label>
                                                <Input
                                                    id="tlf_local"
                                                    value={formData.telefonoLocal ?? ""}
                                                    onChange={(e) => handleChange("telefonoLocal", e.target.value)}
                                                    placeholder="(0212) ..."
                                                    disabled={isExistingUser}
                                                    className={isExistingUser ? "bg-gray-100" : ""}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="tlf_celular">Tlf. Celular <span className="text-red-500">*</span></Label>
                                                <Input
                                                    id="tlf_celular"
                                                    value={formData.telefonoCelular ?? ""}
                                                    onChange={(e) => handleChange("telefonoCelular", e.target.value)}
                                                    placeholder="(0414) ..."
                                                    required
                                                    disabled={isExistingUser}
                                                    className={isExistingUser ? "bg-gray-100" : ""}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="password">
                                                {mode === "create" ? "Contraseña" : "Nueva Contraseña"} {mode === "create" && !isExistingUser && <span className="text-red-500">*</span>}
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    id="password"
                                                    type={showPassword ? "text" : "password"}
                                                    value={formData.password ?? ""}
                                                    onChange={(e) => handleChange("password", e.target.value)}
                                                    placeholder={mode === "create" ? "******" : "(Opcional)"}
                                                    required={mode === "create" && !isExistingUser}
                                                    disabled={isExistingUser}
                                                    className={isExistingUser ? "bg-gray-100" : ""}
                                                />
                                                {!isExistingUser && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-sky-950 focus:outline-none cursor-pointer"
                                                    >
                                                        <span className={`text-xl ${showPassword ? "icon-[uil--eye]" : "icon-[uil--eye-slash]"}`}></span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {isStudentOrTeacher && mode === "create" && (
                                    <div className="pt-4 border-t space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="term">Semestre de Ingreso <span className="text-red-500">*</span></Label>
                                                <CustomSelect
                                                    value={formData.term ?? ""}
                                                    onChange={(val) => handleChange("term", val)}
                                                    options={semestres.map(s => ({ value: s.term, label: s.term }))}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="tipoParticipacion">Tipo de Participación <span className="text-red-500">*</span></Label>
                                                <CustomSelect
                                                    value={formData.tipoParticipacion ?? ""}
                                                    onChange={(val) => handleChange("tipoParticipacion", val)}
                                                    options={
                                                        formData.role === "Profesor"
                                                            ? [
                                                                { value: "Voluntario", label: "Voluntario" },
                                                                { value: "Asesor", label: "Asesor" },
                                                                { value: "Titular", label: "Titular" },
                                                            ]
                                                            : [
                                                                { value: "Voluntario", label: "Voluntario" },
                                                                { value: "Inscrito", label: "Inscrito" },
                                                                { value: "Egresado", label: "Egresado" },
                                                            ]
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {type !== "semestres" && type !== "materias" && type !== "categorias" && type !== "subcategorias" && type !== "ambitos" && (
                                    <div className="space-y-2">
                                        <Label htmlFor="nombre">Nombre <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="nombre"
                                            value={formData.nombre || ""}
                                            onChange={(e) => handleChange("nombre", e.target.value)}
                                            required
                                        />
                                    </div>
                                )}
                                {type === "materias" && (
                                    <div className="space-y-2">
                                        <Label htmlFor="nombre">Nombre de la Materia <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="nombre"
                                            value={formData.nombre || ""}
                                            onChange={(e) => handleChange("nombre", e.target.value)}
                                            required
                                        />
                                    </div>
                                )}

                                {type === "categorias" && (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="materia">Materia <span className="text-red-500">*</span></Label>
                                            <CustomSelect
                                                value={formData.materiaId || ""}
                                                onChange={(val) => handleChange("materiaId", val)}
                                                options={materias.map(m => ({ value: m.id, label: m.nombre }))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="nombre">Nombre de la Categoría <span className="text-red-500">*</span></Label>
                                            <Input
                                                id="nombre"
                                                value={formData.nombre || ""}
                                                onChange={(e) => handleChange("nombre", e.target.value)}
                                                required
                                            />
                                        </div>
                                    </>
                                )}

                                {type === "subcategorias" && (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="materia_filter">Filtrar por Materia</Label>
                                            <CustomSelect
                                                value={selectedMateriaId}
                                                onChange={(val) => {
                                                    setSelectedMateriaId(val);
                                                    setFormData((prev: any) => ({ ...prev, categorylegalfieldid: "" })); // Reset category
                                                }}
                                                options={materias.map(m => ({ value: m.id, label: m.nombre }))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="categoria">Categoría <span className="text-red-500">*</span></Label>
                                            <CustomSelect
                                                value={formData.categorylegalfieldid || ""}
                                                onChange={(val) => handleChange("categorylegalfieldid", val)}
                                                options={categorias
                                                    .filter(c => !selectedMateriaId || String(c.materiaid) === String(selectedMateriaId))
                                                    .map(c => ({ value: c.id, label: c.nombre }))
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="nombre">Nombre de la Subcategoría <span className="text-red-500">*</span></Label>
                                            <Input
                                                id="nombre"
                                                value={formData.nombre || ""}
                                                onChange={(e) => handleChange("nombre", e.target.value)}
                                                required
                                            />
                                        </div>
                                    </>
                                )}

                                {type === "ambitos" && (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="materia_filter_ambito">Filtrar por Materia</Label>
                                            <CustomSelect
                                                value={selectedMateriaId}
                                                onChange={(val) => {
                                                    setSelectedMateriaId(val);
                                                    setSelectedCategoryId(""); // Reset category
                                                    setFormData((prev: any) => ({ ...prev, longid: "" })); // Reset subcategory
                                                }}
                                                options={materias.map(m => ({ value: m.id, label: m.nombre }))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="categoria_filter">Filtrar por Categoría</Label>
                                            <CustomSelect
                                                value={selectedCategoryId}
                                                onChange={(val) => {
                                                    setSelectedCategoryId(val);
                                                    setFormData((prev: any) => ({ ...prev, longid: "" })); // Reset subcategory
                                                }}
                                                options={categorias
                                                    .filter(c => !selectedMateriaId || String(c.materiaid) === String(selectedMateriaId))
                                                    .map(c => ({
                                                        value: c.id,
                                                        label: c.nombre
                                                    }))
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="subcategoria">Subcategoría <span className="text-red-500">*</span></Label>
                                            <CustomSelect
                                                value={formData.longid || ""}
                                                onChange={(val) => handleChange("longid", val)}
                                                options={subcategorias
                                                    .filter(s => !selectedCategoryId || String(s.categorymateriaid) === String(selectedCategoryId) || String((s as any).categorylegalfieldid) === String(selectedCategoryId))
                                                    .map(s => ({ value: s.id, label: s.nombre }))
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="nombre">Nombre del Ámbito Legal <span className="text-red-500">*</span></Label>
                                            <Input
                                                id="nombre"
                                                value={formData.nombre || ""}
                                                onChange={(e) => handleChange("nombre", e.target.value)}
                                                required
                                            />
                                        </div>
                                    </>
                                )}
                                {type === "centers" && (
                                    <div className="space-y-2">
                                        <Label htmlFor="parish">Parroquia</Label>
                                        <CustomSelect
                                            value={formData.parishId || ""}
                                            onChange={(val) => handleChange("parishId", val)}
                                            options={parishes.map(p => ({ value: p.id, label: p.nombre }))}
                                        />
                                    </div>
                                )}
                                {type === "semestres" && (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="term">Término del Semestre <span className="text-red-500">*</span></Label>
                                            <Input
                                                id="term"
                                                value={formData.term || ""}
                                                onChange={(e) => handleChange("term", e.target.value)}
                                                placeholder="Ej: 2025-15"
                                                required
                                                disabled={mode === "edit"}
                                            />
                                            <p className="text-xs text-gray-500">Formato: YYYY-NN (ej: 2025-15)</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="fecha_inicio">Fecha de Inicio <span className="text-red-500">*</span></Label>
                                                <Input
                                                    id="fecha_inicio"
                                                    type="date"
                                                    value={formData.fecha_inicio || ""}
                                                    onChange={(e) => handleChange("fecha_inicio", e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="fecha_final">Fecha Final <span className="text-red-500">*</span></Label>
                                                <Input
                                                    id="fecha_final"
                                                    type="date"
                                                    value={formData.fecha_final || ""}
                                                    onChange={(e) => handleChange("fecha_final", e.target.value)}
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {isStudentOrTeacher && mode === "edit" && (
                            <div className="mt-6 border-t pt-4">
                                <h3 className="text-sky-950 font-bold mb-3 flex items-center gap-2">
                                    <span className="icon-[uil--history] text-xl"></span>
                                    Historial de Participación
                                </h3>
                                {participations.length > 0 ? (
                                    <div className="max-h-40 overflow-y-auto border rounded-lg bg-gray-50 overflow-x-auto">
                                        <table className="w-full text-sm text-left min-w-[400px]">
                                            <thead className="text-xs text-sky-950 uppercase bg-gray-100 border-b">
                                                <tr>
                                                    <th className="px-4 py-2">Semestre</th>
                                                    <th className="px-4 py-2">NRC</th>
                                                    <th className="px-4 py-2 text-center">Tipo de Participación</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {participations.map((p, idx) => (
                                                    <tr key={idx} className="bg-white border-b hover:bg-neutral-50">
                                                        <td className="px-4 py-2 font-medium text-sky-950">{p.semestre}</td>
                                                        <td className="px-4 py-2 text-sky-950">{p.nrc}</td>
                                                        <td className="px-4 py-2 text-center">
                                                            <span className={cn(
                                                                "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                                                                (p.tipo === "Regular" || p.tipo === "fijo") ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                                                            )}>
                                                                {p.tipo}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-4 bg-gray-50 border rounded-lg text-gray-400 text-sm">
                                        No hay historial de participación registrado.
                                    </div>
                                )}
                            </div>
                        )}

                    </form>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full sm:w-auto px-4 py-2 bg-neutral-200 hover:bg-neutral-300 rounded-lg text-sky-950 font-semibold transition-colors cursor-pointer"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <PrimaryButton
                        type="submit"
                        form="admin-form"
                        icon={mode === "create" ? "icon-[mdi--plus]" : "icon-[mdi--content-save]"}
                        className={cn("w-full sm:w-auto", loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer")}
                    >
                        {loading ? "Guardando..." : "Guardar"}
                    </PrimaryButton>
                </DialogFooter>
            </DialogContent >
        </Dialog >
    );
}
