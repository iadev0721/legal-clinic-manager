"use client"

import { Download, Loader2, FileText } from "lucide-react"
import { useState } from "react"
import { domToPng } from "modern-screenshot"
import { Packer } from "docx"
import { createReportDocument } from "./ReportDocxDocument"

interface DownloadApplicantReportButtonProps {
    applicantId: string;
    applicantName: string;
    iconOnly?: boolean; // Prop to make the button just an icon for the table
}

export function DownloadApplicantReportButton({ applicantId, applicantName, iconOnly = false }: DownloadApplicantReportButtonProps) {
    const [isGenerating, setIsGenerating] = useState(false)

    const handleDownload = async () => {
        try {
            setIsGenerating(true)

            // 1. Create a hidden iframe to render the report page
            const iframe = document.createElement("iframe")
            iframe.style.position = "fixed"
            iframe.style.top = "-10000px"
            iframe.style.left = "-10000px"
            iframe.style.width = "210mm" // A4 width
            iframe.style.height = "10000px" // Tall enough

            iframe.src = `/applicants/report?applicantId=${applicantId}`
            document.body.appendChild(iframe)

            // 2. Wait for the iframe to load and data to fetch
            await new Promise((resolve) => {
                iframe.onload = () => setTimeout(resolve, 3000) // Wait for data fetching
            })

            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
            if (!iframeDoc) {
                document.body.removeChild(iframe)
                throw new Error("No se pudo acceder al contenido del reporte.")
            }

            // 3. Wait for loading to complete by checking for the presence of report pages (1 to 3)
            let attempts = 0
            const maxAttempts = 40 // Total 20 seconds polling
            const pageIds = [
                "applicant-report-page-1", "applicant-report-page-2", "applicant-report-page-3"
            ];
            let pageElements: (HTMLElement | null)[] = [];

            while (attempts < maxAttempts) {
                pageElements = pageIds.map(id => iframeDoc.getElementById(id));

                if (pageElements.every(el => el)) {
                    // Check if content is populated
                    const hasContent = pageElements.every(el => {
                        return el && el.innerHTML.length > 200;
                    });
                    if (hasContent) break;
                }

                await new Promise(resolve => setTimeout(resolve, 500))
                attempts++
            }

            if (pageElements.some(el => !el)) {
                document.body.removeChild(iframe)
                throw new Error("No se encontraron todas las páginas del reporte.")
            }

            // Options for high quality capture
            const captureOptions = {
                scale: 2,
                backgroundColor: "white",
            }

            const images: string[] = [];
            for (const el of pageElements) {
                if (el) {
                    const img = await domToPng(el, captureOptions);
                    images.push(img);
                }
            }

            // 4. Generate DOCX using docx
            const doc = createReportDocument({
                images,
                date: new Date().toLocaleDateString(),
                titles: [
                    { title: "Ficha del Solicitante", subtitle: `C.I. ${applicantId} - ${applicantName}` },
                    { title: "Datos Socioeconómicos", subtitle: `C.I. ${applicantId} - ${applicantName}` },
                    { title: "Historial de Casos", subtitle: `C.I. ${applicantId} - ${applicantName}` }
                ]
            })

            const blob = await Packer.toBlob(doc)

            // 5. Trigger download
            const url = URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            const now = new Date()
            const dateStr = now.toISOString().split('T')[0]
            const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0')
            link.download = `reporte_solicitante_${applicantId}_${dateStr}_${timeStr.replace(':', 'h')}.docx`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)

            // Cleanup
            document.body.removeChild(iframe)

        } catch (error) {
            console.error("Error generating DOCX:", error)
            alert("Ocurrió un error al generar el reporte DOCX.")
        } finally {
            setIsGenerating(false)
        }
    }

    if (iconOnly) {
        return (
            <button
                onClick={handleDownload}
                disabled={isGenerating}
                className="w-10 h-10 flex justify-center items-center hover:bg-green-100 rounded-lg transition-colors group cursor-pointer"
                title="Descargar Reporte del Solicitante"
            >
                {isGenerating ? (
                    <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                ) : (
                    <span className="icon-[mdi--file-document-arrow-right] text-3xl text-green-600 group-hover:scale-110 transition-transform"></span>
                )}
            </button>
        )
    }

    return (
        <button
            onClick={handleDownload}
            disabled={isGenerating}
            className="flex items-center gap-2 px-6 py-3 bg-[#003366] hover:bg-[#002244] text-white rounded-xl font-bold shadow-sm hover:shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
            title="Descargar Reporte en Word (DOCX)"
        >
            {isGenerating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
                <FileText className="w-5 h-5" />
            )}
            <span className="hidden sm:inline">Generar Reporte DOCX</span>
        </button>
    )
}
