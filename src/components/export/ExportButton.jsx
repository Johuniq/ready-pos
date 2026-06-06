import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileSpreadsheet, FileText, Download, ChevronDown } from "lucide-react";

/**
 * ExportButton Component
 * Dropdown button for exporting table data to CSV, Excel, or PDF
 * 
 * @param {Object} props
 * @param {Function} props.onExportCSV - Function to handle CSV export
 * @param {Function} props.onExportExcel - Function to handle Excel export
 * @param {Function} props.onExportPDF - Function to handle PDF export
 * @param {boolean} props.disabled - Whether the button is disabled
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.variant - Button variant (default: "outline")
 * @param {string} props.size - Button size (default: "sm")
 */
export const ExportButton = ({
  onExportCSV,
  onExportExcel,
  onExportPDF,
  disabled = false,
  className = "",
  variant = "outline",
  size = "sm",
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (exportFn, format) => {
    if (isExporting) return;
    
    setIsExporting(true);
    try {
      await exportFn();
    } catch (error) {
      console.error(`${format} export failed:`, error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled || isExporting}
          className={`h-9 px-3 gap-1.5 btn-premium bg-background hover:bg-muted/50 ${className}`}
        >
          <Download className="h-3.5 w-3.5" />
          Export
          <ChevronDown className="h-3 w-3 ml-0.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs font-semibold">
          Export Format
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => handleExport(onExportCSV, "CSV")}
          disabled={isExporting}
          className="cursor-pointer text-xs"
        >
          <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
          <span>Export as CSV</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport(onExportExcel, "Excel")}
          disabled={isExporting}
          className="cursor-pointer text-xs"
        >
          <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
          <span>Export as Excel</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport(onExportPDF, "PDF")}
          disabled={isExporting}
          className="cursor-pointer text-xs"
        >
          <FileText className="mr-2 h-4 w-4 text-red-600" />
          <span>Export as PDF</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportButton;
