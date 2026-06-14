import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/**
 * Generic page loading skeleton
 */
export function PageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
            </CardHeader>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Table loading skeleton
 */
export function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {[...Array(columns)].map((_, i) => (
          <Skeleton key={i} className="h-10 flex-1" />
        ))}
      </div>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          {[...Array(columns)].map((_, j) => (
            <Skeleton key={j} className="h-16 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Card grid loading skeleton
 */
export function CardGridSkeleton({ count = 6, columns = 3 }) {
  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      }}>
      {[...Array(count)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Stats cards loading skeleton
 */
export function StatsCardsSkeleton({ count = 4 }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(count)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4 rounded" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-3 w-40" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Form loading skeleton
 */
export function FormSkeleton({ fields = 5 }) {
  return (
    <div className="space-y-6">
      {[...Array(fields)].map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

/**
 * Product grid loading skeleton (for POS terminal)
 */
export function ProductGridSkeleton({ count = 12 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {[...Array(count)].map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <Skeleton className="h-32 w-full" />
          <CardContent className="p-3 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-6 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Chart loading skeleton
 */
export function ChartSkeleton({ height = "h-80" }) {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <Skeleton className={`w-full ${height}`} />
      </CardContent>
    </Card>
  );
}

/**
 * List loading skeleton
 */
export function ListSkeleton({ items = 5 }) {
  return (
    <div className="space-y-3">
      {[...Array(items)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

/**
 * Shared Header Skeleton wrapper
 */
function HeaderSkeleton() {
  return (
    <div className="space-y-1.5 pb-4 mb-4 border-b border-border/40">
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-6 rounded-md" />
        <Skeleton className="h-7 w-48" />
      </div>
      <Skeleton className="h-4 w-80 max-w-full" />
    </div>
  );
}

/**
 * Dashboard page skeleton
 */
export function DashboardSkeleton() {
  return (
    <div className="page-container bg-muted/20 p-6 space-y-6">
      <HeaderSkeleton />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-28 mb-1.5" />
              <Skeleton className="h-3.5 w-36" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-60" />
          </CardHeader>
          <CardContent className="h-[320px] flex items-end gap-2 pt-4">
            {[...Array(12)].map((_, i) => (
              <Skeleton
                key={i}
                className="w-full"
                style={{ height: `${20 + ((i * 7) % 80)}%` }}
              />
            ))}
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-60" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Orders page skeleton
 */
export function OrdersSkeleton() {
  return (
    <div className="page-container bg-muted/20 p-6 space-y-6">
      <HeaderSkeleton />
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between pb-2">
        <div className="flex flex-1 w-full sm:max-w-xs gap-2">
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-20 rounded-lg" />
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="border-b px-4 py-3 flex gap-4">
            {[...Array(7)].map((_, i) => (
              <Skeleton key={i} className="h-5 flex-1" />
            ))}
          </div>
          <div className="divide-y p-4 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex gap-4 pt-3 items-center">
                {[...Array(7)].map((_, j) => (
                  <Skeleton key={j} className="h-6 flex-1" />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Customers page skeleton
 */
export function CustomersSkeleton() {
  return (
    <div className="page-container bg-muted/20 p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-4 mb-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded-md" />
            <Skeleton className="h-7 w-48" />
          </div>
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between pb-2">
        <div className="flex flex-1 w-full sm:max-w-xs gap-2">
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
        <Skeleton className="h-6 w-24" />
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="border-b px-4 py-3 flex gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-5 flex-1" />
            ))}
          </div>
          <div className="divide-y p-4 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex gap-4 pt-3 items-center">
                {[...Array(6)].map((_, j) => (
                  <Skeleton key={j} className="h-6 flex-1" />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Outlets page skeleton
 */
export function OutletsSkeleton() {
  return (
    <div className="page-container bg-muted/20 p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-4 mb-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded-md" />
            <Skeleton className="h-7 w-48" />
          </div>
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="space-y-2 pb-3">
              <div className="flex justify-between items-start">
                <Skeleton className="h-6 w-40" />
                <div className="flex gap-1.5">
                  <Skeleton className="h-5 w-16 rounded" />
                  <Skeleton className="h-5 w-14 rounded" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pb-4">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="flex gap-2 items-center">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ))}
            </CardContent>
            <div className="border-t p-3 flex justify-end gap-2 bg-muted/10">
              <Skeleton className="h-8 w-24 rounded-md" />
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/**
 * Settings page skeleton
 */
export function SettingsSkeleton() {
  return (
    <div className="page-container bg-muted/20 p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-4 mb-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded-md" />
            <Skeleton className="h-7 w-48" />
          </div>
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
      <div className="flex gap-2 pb-2 overflow-x-auto border-b">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-9 w-28 rounded-md shrink-0" />
        ))}
      </div>
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
          <div className="space-y-2 pt-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Staff page skeleton
 */
export function StaffSkeleton() {
  return (
    <div className="page-container bg-muted/20 p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-4 mb-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded-md" />
            <Skeleton className="h-7 w-48" />
          </div>
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between pb-2">
        <div className="flex flex-1 w-full sm:max-w-xs gap-2">
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Skeleton className="h-9 w-36 rounded-lg" />
          <Skeleton className="h-9 w-20 rounded-lg" />
        </div>
      </div>
      <Card>
        <CardContent className="p-4 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4.5 w-16 rounded" />
                  </div>
                  <Skeleton className="h-3.5 w-48" />
                </div>
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}


