"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { CustomTable, type Column } from "@/components/ui/custom-table";
import PrimaryButton from "@/components/ui/primary-button";
import SearchInput from "@/components/ui/search-input";
import FilterSelect from "@/components/ui/filter-select";
import ApplicantModal, {
  type ApplicantFormData,
} from "@/components/ui/applicant-modal";
import ApplicantDetailsModal from "@/components/ui/applicant-details-modal";
import Pagination from "@/components/ui/pagination";
import DeleteConfirmationModal from "@/components/ui/delete-confirmation-modal";
import LoadingScreen from "@/components/ui/loading-screen";
import { DownloadApplicantReportButton } from "@/components/DownloadApplicantReportButton";
import {
  getSolicitantes,
  createSolicitante,
  updateSolicitante,
  deleteSolicitante,
  getParroquias,
  getTrabajos,
  getSolicitanteCompleto,
} from "@/actions/solicitantes";

interface Solicitante {
  cedula_solicitante: string;
  nombres: string;
  apellidos: string;
  telefono_local?: string;
  telefono_celular?: string;
  correo_electronico?: string;
  sexo?: "M" | "F";
  nacionalidad?: "V" | "E";
  estado_civil?: "Soltero" | "Casado" | "Divorciado" | "Viudo";
  en_concubinato?: boolean;
  fecha_nacimiento: string;
  buscando_trabajo?: boolean;
  tipo_periodo_educacion?: string;
  cantidad_tiempo_educacion?: number;
  id_parroquia: number;
  id_actividad_solicitante?: number;
  id_trabajo?: number;
  id_nivel_educativo?: number;
  // Joined data
  nombre_parroquia?: string;
  nombre_municipio?: string;
  nombre_estado?: string;
}

const ITEMS_PER_PAGE = 10;

interface ApplicantsClientProps {
  userRole: string;
}

export default function ApplicantsClient({ userRole }: ApplicantsClientProps) {
  const router = useRouter();
  const [applicants, setApplicants] = useState<Solicitante[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [parroquiaFilter, setParroquiaFilter] = useState("");
  const [trabajoFilter, setTrabajoFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Catálogos para filtros
  const [parroquias, setParroquias] = useState<any[]>([]);
  const [trabajos, setTrabajos] = useState<any[]>([]);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedApplicant, setSelectedApplicant] =
    useState<Solicitante | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedApplicantCedula, setSelectedApplicantCedula] = useState<string | null>(null);

  // Selection state
  const [selectedItems, setSelectedItems] = useState<Solicitante[]>([]);

  useEffect(() => {
    loadData();
    loadCatalogs();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const result = await getSolicitantes();
    if (result.success && result.data) {
      setApplicants(result.data);
    } else {
      console.error("Error loading applicants:", result.error);
    }
    setLoading(false);
  };

  const loadCatalogs = async () => {
    const [parroquiasResult, trabajosResult] = await Promise.all([
      getParroquias(),
      getTrabajos(),
    ]);

    if (parroquiasResult.success && parroquiasResult.data) {
      setParroquias(parroquiasResult.data);
    }

    if (trabajosResult.success && trabajosResult.data) {
      setTrabajos(trabajosResult.data);
    }
  };

  // Filtrar solicitantes usando useMemo
  const filteredApplicants = useMemo(() => {
    return applicants.filter((applicant) => {
      // Filtro de búsqueda
      const matchesSearch =
        !searchTerm ||
        `${applicant.nombres} ${applicant.apellidos}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        applicant.cedula_solicitante
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      // Filtro de parroquia
      const matchesParroquia =
        !parroquiaFilter ||
        applicant.id_parroquia.toString() === parroquiaFilter;

      // Filtro de trabajo
      const matchesTrabajo =
        !trabajoFilter ||
        applicant.id_trabajo?.toString() === trabajoFilter;

      return matchesSearch && matchesParroquia && matchesTrabajo;
    });
  }, [searchTerm, parroquiaFilter, trabajoFilter, applicants]);

  // Paginación
  const totalPages = Math.ceil(filteredApplicants.length / ITEMS_PER_PAGE);
  const paginatedApplicants = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredApplicants.slice(startIndex, endIndex);
  }, [filteredApplicants, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedItems([]); // Clear selection on filter change
  }, [searchTerm, parroquiaFilter, trabajoFilter]);

  const handleNewApplicant = () => {
    setModalMode("create");
    setSelectedApplicant(null);
    setModalOpen(true);
  };

  const handleEdit = async (applicant: Solicitante) => {
    setModalMode("edit");
    setLoadingEdit(true);
    try {
      // Cargar datos completos del solicitante
      const result = await getSolicitanteCompleto(applicant.cedula_solicitante);
      if (result.success && result.data) {
        setSelectedApplicant(result.data as any);
      } else {
        // Si falla, usar los datos básicos
        setSelectedApplicant(applicant);
      }
    } catch (error) {
      console.error("Error loading applicant details:", error);
      setSelectedApplicant(applicant);
    } finally {
      setLoadingEdit(false);
      // Abrir el modal después de que termine la carga
      setModalOpen(true);
    }
  };

  const handleViewDetails = (cedula: string) => {
    setSelectedApplicantCedula(cedula);
    setDetailsModalOpen(true);
  };

  const handleDelete = (applicant: Solicitante) => {
    setSelectedApplicant(applicant); // Set for single delete
    setDeleteModalOpen(true);
  };

  const handleBulkDelete = () => {
    setSelectedApplicant(null); // Indicates multiple delete
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedApplicant) {
      // Single delete
      const result = await deleteSolicitante(
        selectedApplicant.cedula_solicitante
      );
      if (result.success) {
        await loadData();
      } else {
        alert(`Error: ${result.error}`);
      }
      setSelectedApplicant(null);
    } else if (selectedItems.length > 0) {
      // Bulk delete
      const promises = selectedItems.map((item) =>
        deleteSolicitante(item.cedula_solicitante)
      );
      await Promise.all(promises);
      await loadData();
      setSelectedItems([]);
    }
    setDeleteModalOpen(false);
  };

  const handleSaveApplicant = async (formData: ApplicantFormData) => {
    if (modalMode === "create") {
      const result = await createSolicitante(formData);
      if (result.success) {
        await loadData();
        setModalOpen(false);
      } else {
        throw new Error(result.error || "Error al crear el solicitante");
      }
    } else if (selectedApplicant) {
      const result = await updateSolicitante(
        selectedApplicant.cedula_solicitante,
        formData
      );
      if (result.success) {
        await loadData();
        setModalOpen(false);
      } else {
        throw new Error(result.error || "Error al actualizar el solicitante");
      }
    }
  };

  const columns: Column<Solicitante>[] = [
    {
      header: "C.I.",
      accessorKey: "cedula_solicitante",
      className: "font-bold text-center",
      headerClassName: "w-[15%]",
    },
    {
      header: "Nombre Completo",
      render: (applicant) => (
        <span className="font-bold">
          {applicant.nombres} {applicant.apellidos}
        </span>
      ),
      headerClassName: "w-[25%]",
    },
    {
      header: "Parroquia",
      render: (applicant) => (
        <span className="text-center block">
          {applicant.nombre_parroquia || "N/A"}
        </span>
      ),
      className: "text-center",
      headerClassName: "w-[15%]",
    },
    {
      header: "Teléfono",
      render: (applicant) => (
        <span className="text-center block">
          {applicant.telefono_celular || applicant.telefono_local || "N/A"}
        </span>
      ),
      className: "text-center",
      headerClassName: "w-[15%]",
    },
    {
      header: "Email",
      render: (applicant) => (
        <span className="text-center block text-sm">
          {applicant.correo_electronico || "N/A"}
        </span>
      ),
      className: "text-center",
      headerClassName: "w-[15%]",
    },
    {
      header: "Acciones",
      render: (applicant) => (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => handleViewDetails(applicant.cedula_solicitante)}
            className="w-10 h-10 flex justify-center items-center hover:bg-blue-100 rounded-lg transition-colors group cursor-pointer"
            title="Ver detalles"
          >
            <span className="icon-[mdi--file-document-outline] text-3xl text-[#3E7DBB] group-hover:scale-110 transition-transform"></span>
          </button>
          <DownloadApplicantReportButton
            applicantId={applicant.cedula_solicitante}
            applicantName={`${applicant.nombres} ${applicant.apellidos}`}
            iconOnly={true}
          />
          <button
            onClick={() => handleEdit(applicant)}
            className="w-10 h-10 flex justify-center items-center hover:bg-blue-100 rounded-lg transition-colors group cursor-pointer"
            title="Editar"
          >
            <span className="icon-[uil--pen] text-3xl text-[#003366] group-hover:scale-110 transition-transform"></span>
          </button>
          {userRole !== 'Estudiante' && (
            <button
              onClick={() => handleDelete(applicant)}
              className="w-10 h-10 flex justify-center items-center hover:bg-red-100 rounded-lg transition-colors group cursor-pointer"
              title="Eliminar"
            >
              <span className="icon-[mdi--trash-can-outline] text-3xl text-red-600 group-hover:scale-110 transition-transform"></span>
            </button>
          )}
        </div>
      ),
      className: "text-center",
      headerClassName: "w-[15%]",
    },
  ];

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <LoadingScreen
          message="Cargando solicitantes..."
          subMessage="Por favor espera mientras se cargan los datos"
          size="lg"
        />
      </div>
    );
  }

  if (loadingEdit) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <LoadingScreen
          message="Cargando información del solicitante..."
          subMessage="Por favor espera mientras se cargan los datos completos"
          size="lg"
        />
      </div>
    );
  }

  return (
    <>
      <div className="w-full h-full p-11 inline-flex flex-col justify-start items-start gap-6 overflow-hidden">
        {/* Header */}
        <div className="self-stretch inline-flex justify-between items-start">
          <div className="flex flex-col justify-start items-start">
            <h1 className="text-sky-950 text-4xl font-bold tracking-tight">
              Gestión de Solicitantes
            </h1>
            <p className="text-[#325B84] text-lg font-medium">
              Crea, consulta y administra el registro de todos los clientes.
            </p>
          </div>
          <PrimaryButton
            data-testid="new-applicant-btn"
            onClick={handleNewApplicant}
            icon="icon-[mdi--account-plus]"
          >
            Nuevo Solicitante
          </PrimaryButton>
        </div>

        {/* Filters and Bulk Actions */}
        <div className="self-stretch inline-flex justify-start items-center gap-4">
          <SearchInput
            placeholder="Buscar por C.I. o Nombre"
            value={searchTerm}
            onChange={setSearchTerm}
            className="flex-1"
          />
          <FilterSelect
            placeholder="Filtrar por Parroquia"
            value={parroquiaFilter}
            onChange={setParroquiaFilter}
            options={parroquias.map((p) => ({
              value: p.id_parroquia.toString(),
              label: `${p.nombre_parroquia} (${p.nombre_municipio})`,
            }))}
            className="w-80"
          />
          <FilterSelect
            placeholder="Filtrar por Condición Laboral"
            value={trabajoFilter}
            onChange={setTrabajoFilter}
            options={trabajos.map((t) => ({
              value: t.id_trabajo.toString(),
              label: t.condicion_trabajo,
            }))}
            className="w-96"
          />
          {selectedItems.length > 0 && userRole !== 'Estudiante' && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors cursor-pointer flex items-center gap-2 h-[42px] shadow-sm whitespace-nowrap"
            >
              <span className="icon-[mdi--trash-can-outline] text-xl"></span>
              Eliminar ({selectedItems.length})
            </button>
          )}
        </div>





        {/* Table */}
        <div className="self-stretch flex-1 min-h-0 bg-neutral-50 rounded-[30px] shadow-[0px_0px_15.5px_0px_rgba(0,0,0,0.25)] p-8 overflow-hidden flex flex-col">
          {filteredApplicants.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 h-full text-center py-12">
              <span className="icon-[mdi--account-search] text-6xl text-sky-950/30 mb-4 block"></span>
              <p className="text-sky-950 text-xl font-semibold">
                {searchTerm || parroquiaFilter || trabajoFilter
                  ? "No se encontraron solicitantes con los filtros aplicados"
                  : "No hay solicitantes registrados"}
              </p>
            </div>
          ) : (
            <CustomTable
              data={paginatedApplicants}
              columns={columns}
              enableSelection={true}
              selectedItems={selectedItems}
              onSelectionChange={setSelectedItems}
              keyField="cedula_solicitante"
              className="h-full"
              minRows={10}
            />
          )}
        </div>

        {/* Footer Area: Pagination + Status Bar */}
        <div className="self-stretch flex flex-col gap-2">
          {/* Pagination */}
          {filteredApplicants.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={ITEMS_PER_PAGE}
              totalItems={filteredApplicants.length}
            />
          )}

          {/* Status Bar (Footer) */}
          <div className="self-stretch flex justify-between items-center min-h-[30px] pt-2">
            {/* Left: Clear Filters */}
            <div className="flex-1 flex justify-start">
              {(searchTerm || parroquiaFilter || trabajoFilter) && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setParroquiaFilter("");
                    setTrabajoFilter("");
                  }}
                  className="text-[#3E7DBB] font-semibold hover:text-[#2d5f8f] transition-colors cursor-pointer flex items-center gap-1 text-sm"
                >
                  <span className="icon-[mdi--filter-off-outline] text-lg"></span>
                  Limpiar filtros
                </button>
              )}
            </div>

            {/* Center: Total Count */}
            <div className="flex items-center justify-center bg-white px-4 py-1.5 rounded-full border border-[#003366]/10 shadow-sm">
              <p className="text-sky-950 text-sm font-semibold">
                Total de solicitantes: <span className="text-[#3E7DBB] font-bold">{filteredApplicants.length}</span>
              </p>
            </div>

            {/* Right: Spacer to keep center alignment true */}
            <div className="flex-1"></div>
          </div>
        </div>

      </div>

      {/* Modales */}
      <ApplicantDetailsModal
        open={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedApplicantCedula(null);
        }}
        cedulaSolicitante={selectedApplicantCedula}
      />

      <ApplicantModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveApplicant}
        applicant={selectedApplicant}
        mode={modalMode}
      />

      <DeleteConfirmationModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
