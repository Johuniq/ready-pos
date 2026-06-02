import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { clsx } from "clsx";

export function PageHeader({
  title,
  description,
  actions,
  className,
}) {
  return (
    <>
      <div
        className={clsx(
          "admin-page-header flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
          className,
        )}>
        <div className="min-w-0 space-y-1">
          <h2 className="page-title">
            <span>{title}</span>
          </h2>
          {description && <p className="page-subtitle">{description}</p>}
        </div>
        {actions && (
          <div className="admin-page-actions flex flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
      <Separator className="opacity-40" />
    </>
  );
}

PageHeader.defaultProps = {
  className: undefined,
};

export function PageToolbar({ children, summary, className }) {
  return (
    <div
      className={clsx(
        "admin-page-toolbar flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}>
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        {children}
      </div>
      {summary && (
        <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">
          {summary}
        </span>
      )}
    </div>
  );
}

PageToolbar.defaultProps = {
  className: undefined,
};

export function DataPanel({ children, className, contentClassName }) {
  return (
    <Card
      className={clsx(
        "admin-data-panel overflow-hidden border border-border/60 shadow-sm",
        className,
      )}>
      <CardContent className={clsx("p-0", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}

DataPanel.defaultProps = {
  className: undefined,
  contentClassName: undefined,
};

export function PaginationBar({
  page,
  totalPages,
  totalLabel,
  loading,
  onPrevious,
  onNext,
  previousLabel = "Previous",
  nextLabel = "Next",
}) {
  if (!totalPages || totalPages <= 1) return null;

  return (
    <div className="admin-pagination flex items-center justify-between border-t p-4 text-xs">
      <span className="text-muted-foreground">
        {totalLabel || (
          <>
            Page <b>{page}</b> of <b>{totalPages}</b>
          </>
        )}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1 || loading}
          onClick={onPrevious}
          className="h-8 text-xs font-semibold">
          {previousLabel}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages || loading}
          onClick={onNext}
          className="h-8 text-xs font-semibold">
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}
