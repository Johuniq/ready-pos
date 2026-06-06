import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { saveAs } from "file-saver";
import { toast } from "sonner";

/**
 * Export data to CSV format
 * @param {Array} headers - Array of header strings
 * @param {Array<Array>} rows - 2D array of row data
 * @param {string} filename - Name of the file (without extension)
 */
export const exportToCSV = (headers, rows, filename) => {
  try {
    // Add UTF-8 BOM for Excel compatibility
    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [
        headers.join(","),
        ...rows.map((row) =>
          row
            .map((val) => {
              // Handle null/undefined
              if (val === null || val === undefined) return '""';
              // Convert to string and escape quotes
              const stringVal = String(val).replace(/"/g, '""');
              return `"${stringVal}"`;
            })
            .join(",")
        ),
      ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported to CSV successfully!`);
    return true;
  } catch (error) {
    console.error("CSV Export Error:", error);
    toast.error("Failed to export CSV");
    return false;
  }
};

/**
 * Export data to Excel format
 * @param {Array} headers - Array of header strings
 * @param {Array<Array>} rows - 2D array of row data
 * @param {string} filename - Name of the file (without extension)
 * @param {string} sheetName - Name of the worksheet
 */
export const exportToExcel = (headers, rows, filename, sheetName = "Sheet1") => {
  try {
    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheetData = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths
    const maxWidths = headers.map((header, colIndex) => {
      const headerLength = String(header).length;
      const maxDataLength = Math.max(
        ...rows.map((row) => String(row[colIndex] || "").length)
      );
      return Math.max(headerLength, maxDataLength, 10);
    });

    worksheet["!cols"] = maxWidths.map((width) => ({ wch: Math.min(width, 50) }));

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(blob, `${filename}.xlsx`);
    toast.success(`Exported to Excel successfully!`);
    return true;
  } catch (error) {
    console.error("Excel Export Error:", error);
    toast.error("Failed to export Excel");
    return false;
  }
};

/**
 * Export data to PDF format
 * @param {Array} headers - Array of header strings
 * @param {Array<Array>} rows - 2D array of row data
 * @param {string} filename - Name of the file (without extension)
 * @param {string} title - Title of the document
 */
export const exportToPDF = (headers, rows, filename, title = "Report") => {
  try {
    const doc = new jsPDF({
      orientation: headers.length > 6 ? "landscape" : "portrait",
      unit: "mm",
      format: "a4",
    });

    // Add title
    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    doc.text(title, 14, 15);

    // Add timestamp
    doc.setFontSize(9);
    doc.setFont(undefined, "normal");
    doc.text(
      `Generated: ${new Date().toLocaleString()}`,
      14,
      22
    );

    // Add table
    doc.autoTable({
      head: [headers],
      body: rows,
      startY: 28,
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { top: 28, left: 14, right: 14 },
    });

    doc.save(`${filename}.pdf`);
    toast.success(`Exported to PDF successfully!`);
    return true;
  } catch (error) {
    console.error("PDF Export Error:", error);
    toast.error("Failed to export PDF");
    return false;
  }
};

/**
 * Format date for export
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDateForExport = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Format price for export (removes currency symbols)
 * @param {number|string} price - Price to format
 * @returns {string} Formatted price
 */
export const formatPriceForExport = (price) => {
  if (price === null || price === undefined) return "0.00";
  const num = parseFloat(String(price).replace(/[^0-9.-]+/g, ""));
  return isNaN(num) ? "0.00" : num.toFixed(2);
};

/**
 * Generate filename with timestamp
 * @param {string} prefix - Prefix for the filename
 * @returns {string} Filename with timestamp
 */
export const generateFilename = (prefix) => {
  const timestamp = new Date().toISOString().slice(0, 10);
  return `${prefix}_${timestamp}`;
};
