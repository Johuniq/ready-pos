import { useCallback } from "react";
import {
  exportToCSV,
  exportToExcel,
  exportToPDF,
  generateFilename,
} from "@/lib/export";

/**
 * Custom hook for exporting table data
 * @param {Object} config - Export configuration
 * @param {Function} config.getHeaders - Function that returns array of header strings
 * @param {Function} config.getRows - Function that returns 2D array of row data
 * @param {string} config.filename - Base filename (without extension or timestamp)
 * @param {string} config.title - Title for PDF export
 * @returns {Object} Export functions
 */
export const useTableExport = ({ getHeaders, getRows, filename, title }) => {
  const handleExportCSV = useCallback(() => {
    const headers = getHeaders();
    const rows = getRows();
    const generatedFilename = generateFilename(filename);
    return exportToCSV(headers, rows, generatedFilename);
  }, [getHeaders, getRows, filename]);

  const handleExportExcel = useCallback(() => {
    const headers = getHeaders();
    const rows = getRows();
    const generatedFilename = generateFilename(filename);
    return exportToExcel(headers, rows, generatedFilename, title || filename);
  }, [getHeaders, getRows, filename, title]);

  const handleExportPDF = useCallback(() => {
    const headers = getHeaders();
    const rows = getRows();
    const generatedFilename = generateFilename(filename);
    return exportToPDF(headers, rows, generatedFilename, title || filename);
  }, [getHeaders, getRows, filename, title]);

  return {
    handleExportCSV,
    handleExportExcel,
    handleExportPDF,
  };
};
