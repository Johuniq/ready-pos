/**
 * STANDARD PAGE STRUCTURE TEMPLATE
 *
 * This is the official template for all admin pages in Ready POS.
 * Follow this structure to maintain consistency across the application.
 *
 * Last Updated: 2024
 */

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  YourIcon, // Replace with appropriate icon
  RefreshCw,
  Plus,
} from "lucide-react";
import { ErrorState, EmptyState } from "@/components/error/ErrorState";
import { PageSkeleton } from "@/components/loading/PageSkeleton"; // Or ListSkeleton, TableSkeleton, etc.
import { handleError } from "@/lib/errorHandler";

export default function YourPageName() {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================
  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await api.get("/your-endpoint");
      setData(result || []);
    } catch (err) {
      const appError = handleError(err, {
        showToast: data.length > 0, // Only toast if we have cached data
        customMessage: "Failed to load data",
      });
      setError(appError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  const handleCreate = () => {
    // Your create logic
  };

  const handleEdit = (item) => {
    // Your edit logic
  };

  const handleDelete = async (id) => {
    // Your delete logic
  };

  // ============================================================================
  // RENDER: LOADING STATE
  // ============================================================================
  if (loading && !data.length && !error) {
    return (
      <div className="page-container bg-muted/20">
        <PageSkeleton />
      </div>
    );
  }

  // ============================================================================
  // RENDER: MAIN CONTENT
  // ============================================================================
  return (
    <div className="page-container bg-muted/20">
      {/* ========================================================================
          HEADER SECTION (REQUIRED)
          - Title with icon
          - Subtitle/description
          - Action buttons (right-aligned)
          ======================================================================== */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="page-title">
            <YourIcon className="w-6 h-6 text-primary" />
            <span>Page Title</span>
          </h2>
          <p className="page-subtitle">
            Brief description of what this page does and what users can
            accomplish here.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="h-9 font-semibold text-xs">
            <RefreshCw
              className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            onClick={handleCreate}
            size="sm"
            className="h-9 font-bold gap-1.5">
            <Plus className="w-4 h-4" />
            Add New
          </Button>
        </div>
      </div>

      {/* ========================================================================
          SEPARATOR (REQUIRED)
          ======================================================================== */}
      <Separator className="opacity-40" />

      {/* ========================================================================
          FILTERS/SEARCH (OPTIONAL)
          Include this section if your page has filtering or search functionality
          ======================================================================== */}
      {/* <div className="flex flex-wrap items-center gap-3">
        <Input 
          placeholder="Search..." 
          className="w-full sm:w-80"
        />
        <Select>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div> */}

      {/* ========================================================================
          MAIN CONTENT CARD (REQUIRED)
          ======================================================================== */}
      <Card className="border border-border/60 shadow-sm rounded-2xl">
        <CardContent className="p-0">
          {/* ERROR STATE */}
          {error && data.length === 0 ? (
            <ErrorState
              title="Failed to load data"
              message={error.message}
              onRetry={fetchData}
            />
          ) : /* EMPTY STATE */
          data.length === 0 ? (
            <EmptyState
              title="No items found"
              message="Get started by creating your first item."
              icon={YourIcon}
              action={handleCreate}
              actionLabel="Add New"
            />
          ) : (
            /* ACTUAL CONTENT */
            <div className="divide-y divide-border/50">
              {data.map((item) => (
                <div
                  key={item.id}
                  className="p-4 hover:bg-muted/10 transition-colors">
                  {/* Your content here */}
                  <p>{item.name}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========================================================================
          ADDITIONAL CARDS (OPTIONAL)
          Use grid layout for multiple cards
          ======================================================================== */}
      {/* <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border border-border/60 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-sm font-bold">Card Title</CardTitle>
            <CardDescription className="text-xs">Card description</CardDescription>
          </CardHeader>
          <CardContent>
            Content here
          </CardContent>
        </Card>
      </div> */}

      {/* ========================================================================
          MODALS/DIALOGS (OPTIONAL)
          Place at the end of the component
          ======================================================================== */}
      {/* <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modal Title</DialogTitle>
          </DialogHeader>
          Modal content
        </DialogContent>
      </Dialog> */}
    </div>
  );
}

/**
 * ============================================================================
 * STRUCTURE RULES & GUIDELINES
 * ============================================================================
 *
 * 1. CONTAINER
 *    - Always use: <div className="page-container bg-muted/20">
 *    - Never use custom container classes
 *
 * 2. HEADER SECTION
 *    - Use flex layout with gap-4 and responsive breakpoints
 *    - Title: <h2 className="page-title"> with icon (w-6 h-6)
 *    - Subtitle: <p className="page-subtitle">
 *    - No custom text sizes (text-xl, text-xs, etc.)
 *    - Space-y-1 for title/subtitle spacing
 *
 * 3. SEPARATOR
 *    - Always include after header: <Separator className="opacity-40" />
 *
 * 4. LOADING STATES
 *    - Use appropriate skeleton: PageSkeleton, ListSkeleton, TableSkeleton, etc.
 *    - Show skeleton only when: loading && !data.length && !error
 *
 * 5. ERROR STATES
 *    - Use ErrorState component with onRetry callback
 *    - Show when: error && data.length === 0
 *
 * 6. EMPTY STATES
 *    - Use EmptyState component with icon, action, and actionLabel
 *    - Show when: data.length === 0 (and no error)
 *
 * 7. CARDS
 *    - Standard classes: "border border-border/60 shadow-sm rounded-2xl"
 *    - Never use: stat-card, card-elevated, shadow-xs, or custom card classes
 *
 * 8. BUTTONS
 *    - Always use shadcn Button component
 *    - Never use native <button> elements
 *    - Standard sizes: size="sm" for actions, size="icon" for icon-only
 *
 * 9. ICONS
 *    - Standard size: w-6 h-6 for page title icons
 *    - Standard size: w-4 h-4 for card title icons
 *    - Standard size: w-3.5 h-3.5 for button icons
 *
 * 10. GRID LAYOUTS
 *     - Use responsive grids: grid gap-4 md:grid-cols-2 lg:grid-cols-3
 *     - Adjust columns based on content type
 *
 * ============================================================================
 * SPECIAL CASES
 * ============================================================================
 *
 * - Terminal: Full-screen app, uses custom layout (correct)
 * - Onboarding: Wizard flow, uses centered card (correct)
 * - Settings: Tabs-based, follows standard structure with tabs
 * - Dashboard: Metrics grid, follows standard structure with custom grid
 *
 * ============================================================================
 */
