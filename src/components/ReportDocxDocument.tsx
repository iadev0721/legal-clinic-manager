import React from 'react';
import { Document, Paragraph, TextRun, AlignmentType, HeadingLevel, ImageRun } from 'docx';


interface ReportDocxDocumentProps {
    images: string[]; // Array of base64 strings
    date: string;
    titles?: { title: string; subtitle: string }[]; // Optional custom titles
}

// Helper function to convert base64 to buffer
function base64ToBuffer(base64: string): Uint8Array {
    const base64Data = base64.split(',')[1];
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

export const createReportDocument = ({ images, date, titles }: ReportDocxDocumentProps) => {
    // Default titles for 6-page report if not provided
    const defaultTitles = [
        { title: "Materia Civil: Sucesiones y Familia", subtitle: "Reporte de Gestión Legal" },
        { title: "Materia Civil: Personas, Bienes y Contratos", subtitle: "Reporte de Gestión Legal" },
        { title: "Materias: Penal, Laboral y Mercantil", subtitle: "Reporte de Gestión Legal" },
        { title: "Otros Casos y Resumen General", subtitle: "Reporte de Gestión Legal" },
        { title: "Demografía: Género y Ubicación", subtitle: "Reporte de Gestión Legal" },
        { title: "Distribución por Parroquia", subtitle: "Reporte de Gestión Legal" }
    ];

    const pageTitles = titles || defaultTitles;

    const sections = images.map((image, index) => {
        return {
            properties: {
                page: {
                    margin: {
                        top: 200,
                        right: 200,
                        bottom: 200,
                        left: 200,
                    },
                },
            },
            children: [
                // Header
                new Paragraph({
                    text: pageTitles[index]?.subtitle || "Reporte de Gestión Legal",
                    heading: HeadingLevel.HEADING_1,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 },
                }),
                new Paragraph({
                    text: pageTitles[index]?.title || `Página ${index + 1}`,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 }, // Increased spacing since date is gone
                }),
                // Main Image
                new Paragraph({
                    children: [
                        new ImageRun({
                            data: base64ToBuffer(image),
                            transformation: {
                                width: 720,
                                height: 926,
                            },
                            type: "png",
                        }),
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 },
                }),
                // Footer
                new Paragraph({
                    text: `Clínica Jurídica UCAB - Página ${index + 1}`,
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 400 },
                }),
            ],
        };
    });

    return new Document({
        sections: sections,
    });
};

