"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shadcn/dialog";
import { Label } from "@/components/shadcn/label";
import { Input } from "@/components/shadcn/input";
import { Textarea } from "@/components/shadcn/textarea";
import FilterSelect from "./filter-select";
import SolicitanteSearchSelect from "./solicitante-search-select";
import PrimaryButton from "./primary-button";
import LegalHierarchySelect from "./legal-hierarchy-select";
import {
  createCaso,
  getTramites,
  getNucleos,
  getAlumnosDisponibles,
  getProfesoresDisponibles,
  getEstatus,
  type CreateCasoData,
  type BeneficiarioData,
  type SoporteLegalData,
} from "@/actions/casos";
import { getSolicitantes, getSolicitanteCompleto } from "@/actions/solicitantes";
import { getSemestres } from "@/actions/administracion";
import CloudinaryUploadButton from "./cloudinary-upload-button";
import FormErrorAlert from "./form-error-alert";

interface CaseCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface BeneficiarioForm {
  cedula_beneficiario: string;
  cedula_es_propia: boolean;
  nombres: string;
  apellidos: string;
  sexo: "M" | "F" | "";
  fecha_nacimiento: string;
  tipo_beneficiario: "Directo" | "Indirecto" | "";
  parentesco: string;
}

export default function CaseCreateModal({
  open,
  onClose,
  onSuccess,
}: CaseCreateModalProps) {
  const [loading, setLoading] = useState(false);
  const [submitErrors, setSubmitErrors] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  // Catálogos
  const [solicitantes, setSolicitantes] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [tramites, setTramites] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [nucleos, setNucleos] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [alumnos, setAlumnos] = useState<
    Array<{ value: string; label: string; term: string }>
  >([]);
  const [profesores, setProfesores] = useState<
    Array<{ value: string; label: string; term: string }>
  >([]);
  const [semestres, setSemestres] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [estatusList, setEstatusList] = useState<
    Array<{ value: string; label: string }>
  >([]);

  // Form data
  const [cedulaSolicitante, setCedulaSolicitante] = useState("");
  const [legalHierarchy, setLegalHierarchy] = useState<{
    id_materia: number;
    num_categoria: number;
    num_subcategoria: number;
    num_ambito_legal: number;
  } | null>(null);
  const [idTramite, setIdTramite] = useState("");
  const [idNucleo, setIdNucleo] = useState("");
  const [sintesis, setSintesis] = useState("");
  const [fechaInicio, setFechaInicio] = useState(
    new Date().toISOString().split("T")[0]
  );

  // Semestre y Estatus (obligatorios)
  const [term, setTerm] = useState("");
  const [idEstatus, setIdEstatus] = useState("");

  // Asignación opcional - Múltiples alumnos
  const [asignarAlumno, setAsignarAlumno] = useState(false);
  const [alumnosSeleccionados, setAlumnosSeleccionados] = useState<Array<{
    cedula: string;
    term: string;
    nombre: string;
  }>>([]);
  const [cedulaAlumnoTemporal, setCedulaAlumnoTemporal] = useState("");
  const [asignarProfesor, setAsignarProfesor] = useState(false);
  const [cedulaProfesor, setCedulaProfesor] = useState("");

  // Beneficiarios
  const [beneficiarios, setBeneficiarios] = useState<BeneficiarioForm[]>([
    {
      cedula_beneficiario: "",
      cedula_es_propia: true,
      nombres: "",
      apellidos: "",
      sexo: "",
      fecha_nacimiento: "",
      tipo_beneficiario: "",
      parentesco: "",
    },
  ]);

  // Soportes Legales
  interface SoporteForm {
    descripcion: string;
    documento_url: string;
    observacion: string;
  }
  const [soportes, setSoportes] = useState<SoporteForm[]>([]);

  // Cargar catálogos al abrir el modal
  useEffect(() => {
    if (open) {
      loadCatalogs();
      resetForm();
    }
  }, [open]);

  // Recargar alumnos y profesores cuando cambia el term
  useEffect(() => {
    if (open && term) {
      loadAlumnosAndProfesores(term);
    }
  }, [term, open]);

  // Cargar datos del solicitante y llenar el primer beneficiario automáticamente
  useEffect(() => {
    const loadSolicitanteData = async () => {
      if (cedulaSolicitante && open) {
        try {
          const result = await getSolicitanteCompleto(cedulaSolicitante);
          if (result.success && result.data) {
            const solicitante = result.data;

            // Formatear fecha de nacimiento para el input date (YYYY-MM-DD)
            let fechaNacimiento = "";
            if (solicitante.fecha_nacimiento) {
              const fecha = new Date(solicitante.fecha_nacimiento);
              if (!isNaN(fecha.getTime())) {
                fechaNacimiento = fecha.toISOString().split('T')[0];
              }
            }

            // Actualizar el primer beneficiario con los datos del solicitante
            setBeneficiarios((prev) => {
              const updated = [...prev];
              // Asegurar que existe al menos un beneficiario
              if (updated.length === 0) {
                updated.push({
                  cedula_beneficiario: "",
                  cedula_es_propia: true,
                  nombres: "",
                  apellidos: "",
                  sexo: "",
                  fecha_nacimiento: "",
                  tipo_beneficiario: "",
                  parentesco: "",
                });
              }

              // Llenar el primer beneficiario con los datos del solicitante
              updated[0] = {
                cedula_beneficiario: solicitante.cedula_solicitante || "",
                cedula_es_propia: true,
                nombres: solicitante.nombres || "",
                apellidos: solicitante.apellidos || "",
                sexo: (solicitante.sexo as "M" | "F") || "",
                fecha_nacimiento: fechaNacimiento,
                tipo_beneficiario: "Directo",
                parentesco: "S",
              };

              return updated;
            });
          }
        } catch (error) {
          console.error("Error loading solicitante data:", error);
        }
      }
    };

    loadSolicitanteData();
  }, [cedulaSolicitante, open]);

  const loadCatalogs = async () => {
    try {
      const [
        solicitantesRes,
        tramitesRes,
        nucleosRes,
        semestresRes,
        estatusRes,
      ] = await Promise.all([
        getSolicitantes(),
        getTramites(),
        getNucleos(),
        getSemestres(),
        getEstatus(),
      ]);

      if (solicitantesRes.success && solicitantesRes.data) {
        setSolicitantes(
          solicitantesRes.data.map((s: any) => ({
            value: s.cedula_solicitante,
            label: `${s.nombres} ${s.apellidos} (${s.cedula_solicitante})`,
          }))
        );
      }

      if (tramitesRes.success && tramitesRes.data) {
        setTramites(
          tramitesRes.data.map((t: any) => ({
            value: t.id_tramite.toString(),
            label: t.nombre,
          }))
        );
      }

      if (nucleosRes.success && nucleosRes.data) {
        setNucleos(
          nucleosRes.data.map((n: any) => ({
            value: n.id_nucleo.toString(),
            label: n.nombre,
          }))
        );
      }

      if (semestresRes.success && semestresRes.data) {
        setSemestres(
          semestresRes.data.map((s: any) => ({
            value: s.term,
            label: s.term,
          }))
        );
        // Establecer el semestre más reciente por defecto
        if (semestresRes.data.length > 0) {
          const latest = semestresRes.data.sort(
            (a: any, b: any) => b.term.localeCompare(a.term)
          )[0];
          setTerm(latest.term);
        }
      }

      if (estatusRes.success && estatusRes.data) {
        setEstatusList(
          estatusRes.data.map((e: any) => ({
            value: e.id_estatus.toString(),
            label: e.nombre_estatus,
          }))
        );
        // Establecer "En proceso" por defecto si existe
        const enProceso = estatusRes.data.find(
          (e: any) => e.nombre_estatus === "En proceso"
        );
        if (enProceso) {
          setIdEstatus(enProceso.id_estatus.toString());
        } else if (estatusRes.data.length > 0) {
          setIdEstatus(estatusRes.data[0].id_estatus.toString());
        }
      }
    } catch (error) {
      console.error("Error loading catalogs:", error);
    }
  };

  const loadAlumnosAndProfesores = async (termFilter: string) => {
    try {
      const [alumnosRes, profesoresRes] = await Promise.all([
        getAlumnosDisponibles(termFilter),
        getProfesoresDisponibles(termFilter),
      ]);

      if (alumnosRes.success && alumnosRes.data) {
        setAlumnos(
          alumnosRes.data.map((a: any) => ({
            value: a.cedula_usuario,
            label: `${a.nombres} ${a.apellidos}`,
            term: a.term,
          }))
        );
      }

      if (profesoresRes.success && profesoresRes.data) {
        setProfesores(
          profesoresRes.data.map((p: any) => ({
            value: p.cedula_usuario,
            label: `${p.nombres} ${p.apellidos}`,
            term: p.term,
          }))
        );
      }
    } catch (error) {
      console.error("Error loading alumnos/profesores:", error);
    }
  };

  const resetForm = () => {
    setCedulaSolicitante("");
    setLegalHierarchy(null);
    setIdTramite("");
    setIdNucleo("");
    setSintesis("");
    setFechaInicio(new Date().toISOString().split("T")[0]);
    setAsignarAlumno(false);
    setAlumnosSeleccionados([]);
    setCedulaAlumnoTemporal("");
    setAsignarProfesor(false);
    setCedulaProfesor("");
    setBeneficiarios([
      {
        cedula_beneficiario: "",
        cedula_es_propia: true,
        nombres: "",
        apellidos: "",
        sexo: "",
        fecha_nacimiento: "",
        tipo_beneficiario: "",
        parentesco: "",
      },
    ]);
    setSoportes([]);
    setErrors({});
    setSubmitErrors([]);
    // Resetear term e idEstatus se hará después de cargar los catálogos
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const validationErrors: string[] = [];

    const fieldNames: Record<string, string> = {
      cedulaSolicitante: "Solicitante",
      legalHierarchy: "Jerarquía Legal",
      idTramite: "Trámite",
      idNucleo: "Núcleo",
      term: "Semestre",
      idEstatus: "Estatus",
      cedulaAlumno: "Alumno(s)",
      cedulaProfesor: "Profesor",
    };

    if (!cedulaSolicitante) {
      newErrors.cedulaSolicitante = "Debe seleccionar un solicitante";
      validationErrors.push(fieldNames.cedulaSolicitante);
    }

    if (!legalHierarchy) {
      newErrors.legalHierarchy = "Debe completar la jerarquía legal";
      validationErrors.push(fieldNames.legalHierarchy);
    }

    if (!idTramite) {
      newErrors.idTramite = "Debe seleccionar un trámite";
      validationErrors.push(fieldNames.idTramite);
    }

    if (!idNucleo) {
      newErrors.idNucleo = "Debe seleccionar un núcleo";
      validationErrors.push(fieldNames.idNucleo);
    }

    if (!term) {
      newErrors.term = "Debe seleccionar un semestre";
      validationErrors.push(fieldNames.term);
    }

    if (!idEstatus) {
      newErrors.idEstatus = "Debe seleccionar un estatus";
      validationErrors.push(fieldNames.idEstatus);
    }

    // Validar beneficiarios
    beneficiarios.forEach((ben, index) => {
      const benLabel = `Beneficiario ${index + 1}`;
      if (!ben.cedula_beneficiario.trim()) {
        newErrors[`beneficiario_${index}_cedula`] = "La cédula del beneficiario es requerida";
        validationErrors.push(`Cédula de ${benLabel}`);
      }
      if (!ben.tipo_beneficiario) {
        newErrors[`beneficiario_${index}_tipo`] = "Debe seleccionar el tipo de beneficiario";
        validationErrors.push(`Tipo de ${benLabel}`);
      }
      // Nueva validación general ya que ahora es requerido siempre (S/N)
      if (!ben.parentesco.trim()) {
        newErrors[`beneficiario_${index}_parentesco`] = "Debe indicar si hay parentesco (S/N)";
        validationErrors.push(`Parentesco de ${benLabel}`);
      }
    });

    // Validar asignación si está activa
    if (asignarAlumno && alumnosSeleccionados.length === 0) {
      newErrors.cedulaAlumno = "Debe seleccionar al menos un alumno";
      validationErrors.push(fieldNames.cedulaAlumno);
    }
    if (asignarProfesor && !cedulaProfesor) {
      newErrors.cedulaProfesor = "Debe seleccionar un profesor";
      validationErrors.push(fieldNames.cedulaProfesor);
    }

    setErrors(newErrors);

    if (validationErrors.length > 0) {
      const uniqueErrors = Array.from(new Set(validationErrors));
      setSubmitErrors(uniqueErrors);
    } else {
      setSubmitErrors([]);
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleAddBeneficiario = () => {
    setBeneficiarios([
      ...beneficiarios,
      {
        cedula_beneficiario: "",
        cedula_es_propia: true,
        nombres: "",
        apellidos: "",
        sexo: "",
        fecha_nacimiento: "",
        tipo_beneficiario: "",
        parentesco: "",
      },
    ]);
  };

  const handleRemoveBeneficiario = (index: number) => {
    // No permitir eliminar el primer beneficiario (siempre es el solicitante)
    if (index === 0) {
      return;
    }
    if (beneficiarios.length > 1) {
      setBeneficiarios(beneficiarios.filter((_, i) => i !== index));
    }
  };

  const handleBeneficiarioChange = (
    index: number,
    field: keyof BeneficiarioForm,
    value: any
  ) => {
    const updated = [...beneficiarios];
    updated[index] = { ...updated[index], [field]: value };
    setBeneficiarios(updated);
  };

  const handleAddSoporte = () => {
    setSoportes([
      ...soportes,
      {
        descripcion: "",
        documento_url: "",
        observacion: "",
      },
    ]);
  };

  const handleRemoveSoporte = (index: number) => {
    setSoportes(soportes.filter((_, i) => i !== index));
  };

  const handleSoporteChange = (
    index: number,
    field: keyof SoporteForm,
    value: string
  ) => {
    const updated = [...soportes];
    updated[index] = { ...updated[index], [field]: value };
    setSoportes(updated);
  };

  const handleAddAlumno = () => {
    if (!cedulaAlumnoTemporal || !term) return;

    const alumno = alumnos.find((a) => a.value === cedulaAlumnoTemporal && a.term === term);
    if (!alumno) return;

    // Verificar si ya está en la lista
    const alreadyExists = alumnosSeleccionados.some(a => a.cedula === cedulaAlumnoTemporal && a.term === term);
    if (alreadyExists) {
      setErrors({ ...errors, cedulaAlumno: "Este alumno ya está seleccionado" });
      return;
    }

    setAlumnosSeleccionados([
      ...alumnosSeleccionados,
      {
        cedula: cedulaAlumnoTemporal,
        term: term,
        nombre: alumno.label,
      },
    ]);

    setCedulaAlumnoTemporal("");
    setErrors({ ...errors, cedulaAlumno: undefined });
  };

  const handleRemoveAlumno = (index: number) => {
    setAlumnosSeleccionados(alumnosSeleccionados.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitErrors([]);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Preparar datos de beneficiarios
      const beneficiariosData: BeneficiarioData[] = beneficiarios.map((ben) => ({
        cedula_beneficiario: ben.cedula_beneficiario,
        cedula_es_propia: ben.cedula_es_propia,
        nombres: ben.nombres || undefined,
        apellidos: ben.apellidos || undefined,
        sexo: ben.sexo || undefined,
        fecha_nacimiento: ben.fecha_nacimiento || undefined,
        tipo_beneficiario: ben.tipo_beneficiario as "Directo" | "Indirecto",
        parentesco: ben.parentesco || undefined,
      }));

      // Preparar datos de soportes legales
      const soportesData: SoporteLegalData[] = soportes
        .filter((s) => s.descripcion.trim() && s.documento_url.trim())
        .map((s) => ({
          descripcion: s.descripcion,
          documento_url: s.documento_url,
          observacion: s.observacion || undefined,
        }));

      // Preparar datos del caso
      const casoData: CreateCasoData = {
        cedula_solicitante: cedulaSolicitante,
        id_nucleo: parseInt(idNucleo),
        id_tramite: parseInt(idTramite),
        id_materia: legalHierarchy!.id_materia,
        num_categoria: legalHierarchy!.num_categoria,
        num_subcategoria: legalHierarchy!.num_subcategoria,
        num_ambito_legal: legalHierarchy!.num_ambito_legal,
        sintesis_caso: sintesis || undefined,
        fecha_caso_inicio: fechaInicio,
        term: term,
        id_estatus: parseInt(idEstatus),
        beneficiarios: beneficiariosData,
        asignacion:
          (asignarAlumno && alumnosSeleccionados.length > 0) || asignarProfesor
            ? {
              cedula_alumno: asignarAlumno && alumnosSeleccionados.length > 0 ? alumnosSeleccionados[0].cedula : undefined,
              cedulas_alumnos: asignarAlumno && alumnosSeleccionados.length > 0 ? alumnosSeleccionados.map(a => a.cedula) : undefined,
              cedula_profesor: asignarProfesor ? cedulaProfesor : undefined,
            }
            : undefined,
        soportes: soportesData.length > 0 ? soportesData : undefined,
      };

      const result = await createCaso(casoData);

      if (result.success) {
        resetForm();
        onSuccess?.();
        onClose();
      } else {
        setSubmitErrors([result.error || "Error al crear el caso"]);
      }
    } catch (error: any) {
      console.error("Error creating case:", error);
      setSubmitErrors([error.message || "Error al crear el caso"]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent data-testid="case-create-dialog" className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sky-950 text-3xl font-semibold flex items-center gap-3">
            <span className="icon-[mdi--plus-circle] text-4xl text-green-600"></span>
            Crear Nuevo Caso
          </DialogTitle>
          <DialogDescription className="text-[#325B84] text-lg">
            Complete todos los campos para registrar un nuevo caso legal
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <FormErrorAlert errors={submitErrors} onClose={() => setSubmitErrors([])} />
          {/* Solicitante */}
          <div className="space-y-2">
            <Label htmlFor="solicitante" className="text-sky-950 font-semibold text-lg">
              Solicitante <span className="text-red-500">*</span>
            </Label>
            <SolicitanteSearchSelect
              data-testid="case-solicitante-search"
              placeholder="Buscar por cédula o nombre..."
              value={cedulaSolicitante}
              onChange={setCedulaSolicitante}
              options={solicitantes}
              error={errors.cedulaSolicitante}
            />
          </div>

          {/* Jerarquía Legal */}
          <div className="space-y-2">
            <Label className="text-sky-950 font-semibold text-lg">
              Jerarquía Legal <span className="text-red-500">*</span>
            </Label>
            <LegalHierarchySelect
              value={legalHierarchy || undefined}
              onChange={(value) => setLegalHierarchy(value || null)}
              required
              error={errors.legalHierarchy}
            />
          </div>

          {/* Trámite y Núcleo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tramite" className="text-sky-950 font-semibold text-lg">
                Trámite <span className="text-red-500">*</span>
              </Label>
              <FilterSelect
                placeholder="Seleccionar trámite"
                value={idTramite}
                onChange={setIdTramite}
                options={tramites}
              />
              {errors.idTramite && (
                <p className="text-red-500 text-sm">{errors.idTramite}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nucleo" className="text-sky-950 font-semibold text-lg">
                Núcleo <span className="text-red-500">*</span>
              </Label>
              <FilterSelect
                placeholder="Seleccionar núcleo"
                value={idNucleo}
                onChange={setIdNucleo}
                options={nucleos}
              />
              {errors.idNucleo && (
                <p className="text-red-500 text-sm">{errors.idNucleo}</p>
              )}
            </div>
          </div>

          {/* Síntesis y Fecha */}
          <div className="space-y-2">
            <Label htmlFor="sintesis" className="text-sky-950 font-semibold text-lg">
              Síntesis del Caso <span className="text-red-500">*</span>
            </Label>
            <Textarea
              data-testid="case-sintesis"
              id="sintesis"
              value={sintesis}
              onChange={(e) => setSintesis(e.target.value)}
              placeholder="Descripción breve del caso..."
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fechaInicio" className="text-sky-950 font-semibold text-lg">
              Fecha de Inicio
            </Label>
            <Input
              type="date"
              id="fechaInicio"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </div>

          {/* Semestre y Estatus */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="term" className="text-sky-950 font-semibold text-lg">
                Semestre <span className="text-red-500">*</span>
              </Label>
              <FilterSelect
                placeholder="Seleccionar semestre"
                value={term}
                onChange={(newTerm) => {
                  setTerm(newTerm);
                  // Limpiar selección de alumno/profesor cuando cambia el term
                  if (asignarAlumno) {
                    setAlumnosSeleccionados([]);
                    setCedulaAlumnoTemporal("");
                  }
                  if (asignarProfesor) {
                    setCedulaProfesor("");
                  }
                }}
                options={semestres}
              />
              {errors.term && (
                <p className="text-red-500 text-sm">{errors.term}</p>
              )}
              <p className="text-xs text-sky-950/60">
                Los alumnos y profesores disponibles se filtrarán por este semestre
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estatus" className="text-sky-950 font-semibold text-lg">
                Estatus <span className="text-red-500">*</span>
              </Label>
              <FilterSelect
                placeholder="Seleccionar estatus"
                value={idEstatus}
                onChange={setIdEstatus}
                options={estatusList}
              />
              {errors.idEstatus && (
                <p className="text-red-500 text-sm">{errors.idEstatus}</p>
              )}
            </div>
          </div>

          {/* Beneficiarios */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <Label className="text-sky-950 font-semibold text-lg">
                  Beneficiarios <span className="text-red-500">*</span>
                </Label>
                <p className="text-xs text-sky-950/60 mt-1">
                  * El primer beneficiario se llena automáticamente con los datos del solicitante
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddBeneficiario}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <span className="icon-[mdi--plus] text-xl"></span>
                Agregar Beneficiario
              </button>
            </div>

            {beneficiarios.map((ben, index) => (
              <div
                key={index}
                className={`p-4 rounded-xl border space-y-4 ${index === 0 && cedulaSolicitante
                  ? "bg-blue-50 border-blue-200"
                  : "bg-gray-50 border-gray-200"
                  }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sky-950">
                      Beneficiario {index + 1}
                    </h4>
                    {index === 0 && cedulaSolicitante && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                        Solicitante
                      </span>
                    )}
                  </div>
                  {beneficiarios.length > 1 && index !== 0 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveBeneficiario(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <span className="icon-[mdi--delete] text-xl"></span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      Cédula <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={ben.cedula_beneficiario}
                      onChange={(e) =>
                        handleBeneficiarioChange(
                          index,
                          "cedula_beneficiario",
                          e.target.value
                        )
                      }
                      placeholder="V-12345678"
                    />
                    {errors[`beneficiario_${index}_cedula`] && (
                      <p className="text-red-500 text-xs">
                        {errors[`beneficiario_${index}_cedula`]}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Tipo</Label>
                    <FilterSelect
                      placeholder="Seleccionar tipo"
                      value={ben.tipo_beneficiario}
                      onChange={(value) =>
                        handleBeneficiarioChange(
                          index,
                          "tipo_beneficiario",
                          value
                        )
                      }
                      options={[
                        { value: "Directo", label: "Directo" },
                        { value: "Indirecto", label: "Indirecto" },
                      ]}
                    />
                    {errors[`beneficiario_${index}_tipo`] && (
                      <p className="text-red-500 text-xs">
                        {errors[`beneficiario_${index}_tipo`]}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      Nombres <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={ben.nombres}
                      onChange={(e) =>
                        handleBeneficiarioChange(index, "nombres", e.target.value)
                      }
                      placeholder="Opcional"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      Apellidos <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={ben.apellidos}
                      onChange={(e) =>
                        handleBeneficiarioChange(
                          index,
                          "apellidos",
                          e.target.value
                        )
                      }
                      placeholder="Opcional"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      Sexo <span className="text-red-500">*</span>
                    </Label>
                    <FilterSelect
                      placeholder="Seleccionar"
                      value={ben.sexo}
                      onChange={(value) =>
                        handleBeneficiarioChange(index, "sexo", value)
                      }
                      options={[
                        { value: "M", label: "Masculino" },
                        { value: "F", label: "Femenino" },
                      ]}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      Fecha de Nacimiento <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="date"
                      value={ben.fecha_nacimiento}
                      onChange={(e) =>
                        handleBeneficiarioChange(
                          index,
                          "fecha_nacimiento",
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label className="text-sm font-semibold">
                      Parentesco <span className="text-red-500">*</span>
                    </Label>
                    <FilterSelect
                      placeholder="Seleccionar parentesco"
                      value={ben.parentesco}
                      onChange={(value) =>
                        handleBeneficiarioChange(
                          index,
                          "parentesco",
                          value
                        )
                      }
                      options={[
                        { value: "S", label: "Sí (S)" },
                        { value: "N", label: "No (N)" },
                      ]}
                    />
                    {errors[`beneficiario_${index}_parentesco`] && (
                      <p className="text-red-500 text-xs">
                        {errors[`beneficiario_${index}_parentesco`]}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 col-span-2">
                    <input
                      type="checkbox"
                      id={`cedula_propia_${index}`}
                      checked={ben.cedula_es_propia}
                      onChange={(e) =>
                        handleBeneficiarioChange(
                          index,
                          "cedula_es_propia",
                          e.target.checked
                        )
                      }
                      className="w-4 h-4"
                    />
                    <Label
                      htmlFor={`cedula_propia_${index}`}
                      className="text-sm cursor-pointer"
                    >
                      La cédula es propia del beneficiario
                    </Label>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Asignación Opcional */}
          <div className="space-y-4 border-t pt-4">
            <Label className="text-sky-950 font-semibold text-lg">
              Asignación (Opcional)
            </Label>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="asignarAlumno"
                  checked={asignarAlumno}
                  onChange={(e) => setAsignarAlumno(e.target.checked)}
                  className="w-4 h-4"
                />
                <Label htmlFor="asignarAlumno" className="cursor-pointer">
                  Asignar Alumno
                </Label>
              </div>

              {asignarAlumno && (
                <div className="ml-6 space-y-2">
                  <div className="flex gap-2">
                    <FilterSelect
                      placeholder="Seleccionar alumno"
                      value={cedulaAlumnoTemporal}
                      onChange={setCedulaAlumnoTemporal}
                      options={alumnos
                        .filter(a => a.term === term)
                        .filter(a => !alumnosSeleccionados.some(sel => sel.cedula === a.value))
                        .map((a) => ({
                          value: a.value,
                          label: a.label,
                        }))}
                    />
                    <button
                      type="button"
                      onClick={handleAddAlumno}
                      disabled={!cedulaAlumnoTemporal || !term}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                    >
                      <span className="icon-[mdi--plus] text-xl"></span>
                      Agregar
                    </button>
                  </div>
                  {errors.cedulaAlumno && (
                    <p className="text-red-500 text-sm">{errors.cedulaAlumno}</p>
                  )}

                  {/* Lista de alumnos seleccionados */}
                  {alumnosSeleccionados.length > 0 && (
                    <div className="space-y-2 mt-2">
                      <Label className="text-sm font-semibold text-green-700">Alumnos Seleccionados</Label>
                      {alumnosSeleccionados.map((alumno, index) => (
                        <div key={index} className="flex justify-between items-center bg-green-50/50 p-2 rounded-lg border border-green-100">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-green-900">{alumno.nombre}</span>
                            <span className="text-xs text-green-700/70">C.I: {alumno.cedula} | Term: {alumno.term}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAlumno(index)}
                            className="p-1 hover:bg-red-50 text-red-500 rounded-full transition-colors"
                            title="Eliminar de la lista"
                          >
                            <span className="icon-[mdi--close] text-lg"></span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="asignarProfesor"
                  checked={asignarProfesor}
                  onChange={(e) => setAsignarProfesor(e.target.checked)}
                  className="w-4 h-4"
                />
                <Label htmlFor="asignarProfesor" className="cursor-pointer">
                  Asignar Profesor Supervisor
                </Label>
              </div>

              {asignarProfesor && (
                <div className="ml-6 space-y-2">
                  <FilterSelect
                    placeholder="Seleccionar profesor"
                    value={cedulaProfesor}
                    onChange={setCedulaProfesor}
                    options={profesores.map((p) => ({
                      value: p.value,
                      label: p.label,
                    }))}
                  />
                  {errors.cedulaProfesor && (
                    <p className="text-red-500 text-sm">
                      {errors.cedulaProfesor}
                    </p>
                  )}
                </div>
              )}

              {(asignarAlumno || asignarProfesor) && (
                <div className="ml-6 space-y-2">
                  <p className="text-xs text-sky-950/60">
                    Los alumnos y profesores disponibles corresponden al semestre seleccionado arriba
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Soportes Legales */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex justify-between items-center">
              <Label className="text-sky-950 font-semibold text-lg">
                Soportes Legales (Opcional)
              </Label>
              <button
                type="button"
                onClick={handleAddSoporte}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <span className="icon-[mdi--plus] text-xl"></span>
                Agregar Soporte
              </button>
            </div>

            {soportes.map((soporte, index) => (
              <div
                key={index}
                className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4"
              >
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-sky-950">
                    Soporte Legal {index + 1}
                  </h4>
                  <button
                    type="button"
                    onClick={() => handleRemoveSoporte(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <span className="icon-[mdi--delete] text-xl"></span>
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      Descripción <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={soporte.descripcion}
                      onChange={(e) =>
                        handleSoporteChange(index, "descripcion", e.target.value)
                      }
                      placeholder="Ej: Contrato, Sentencia, etc."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      Documento <span className="text-red-500">*</span>
                    </Label>
                    {!soporte.documento_url ? (
                      <CloudinaryUploadButton
                        onUploadSuccess={(url) =>
                          handleSoporteChange(index, "documento_url", url)
                        }
                        label="Subir Documento"
                      />
                    ) : (
                      <div className="bg-green-50 p-3 rounded-lg flex items-center justify-between border border-green-200">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="icon-[mdi--file-check] text-xl text-green-600"></span>
                          <span className="text-sm text-green-800 font-medium truncate">
                            Documento subido correctamente
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handleSoporteChange(index, "documento_url", "")
                          }
                          className="text-xs text-red-600 hover:underline ml-2"
                        >
                          Cambiar
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      Observación
                    </Label>
                    <Textarea
                      value={soporte.observacion}
                      onChange={(e) =>
                        handleSoporteChange(index, "observacion", e.target.value)
                      }
                      placeholder="Observaciones adicionales (opcional)"
                      className="min-h-[60px]"
                    />
                  </div>
                </div>
              </div>
            ))}

            {soportes.length === 0 && (
              <p className="text-sm text-sky-950/60 italic text-center py-4">
                No hay soportes legales agregados. Puede agregarlos después de crear el caso.
              </p>
            )}
          </div>

          {/* Error general */}
          <DialogFooter className="gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-neutral-200 hover:bg-neutral-300 rounded-2xl text-sky-950 text-lg font-semibold transition-all duration-300 hover:scale-105"
              disabled={loading}
            >
              Cancelar
            </button>
            <PrimaryButton
              data-testid="case-save"
              type="submit"
              icon="icon-[mdi--content-save]"
              disabled={loading}
            >
              {loading ? "Creando..." : "Crear Caso"}
            </PrimaryButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

