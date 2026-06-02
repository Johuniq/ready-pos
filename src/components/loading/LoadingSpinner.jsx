import { cn } from "@/lib/utils";

/**
 * Simple loading spinner component
 */
export function LoadingSpinner({ size = "md", className }) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-4",
    lg: "w-12 h-12 border-4",
  };

  return (
    <div
      className={cn(
        "border-primary border-t-transparent rounded-full animate-spin",
        sizeClasses[size],
        className,
      )}
    />
  );
}

/**
 * Full page loading spinner
 */
export function PageLoader({ message = "Loading..." }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <LoadingSpinner size="lg" />
      {message && (
        <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
      )}
    </div>
  );
}

/**
 * Inline loading spinner with text
 */
export function InlineLoader({ message = "Loading...", size = "sm" }) {
  return (
    <div className="flex items-center gap-2">
      <LoadingSpinner size={size} />
      <span className="text-sm text-muted-foreground">{message}</span>
    </div>
  );
}

/**
 * Button loading state
 */
export function ButtonLoader() {
  return <LoadingSpinner size="sm" className="mr-2" />;
}
