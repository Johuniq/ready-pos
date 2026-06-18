import {
  AlertCircle,
  RefreshCw,
  WifiOff,
  ServerCrash,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * Generic error state component
 */
export function ErrorState({
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  onRetry,
  showRetry = true,
  icon: Icon = AlertCircle,
  variant = "default",
}) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div
              className={`rounded-full p-3 ${
                variant === "destructive"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-muted text-muted-foreground"
              }`}>
              <Icon className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">{title}</h3>
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
            {showRetry && onRetry && (
              <Button onClick={onRetry} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Network error state
 */
export function NetworkErrorState({ onRetry }) {
  return (
    <ErrorState
      title="Connection Error"
      message="Unable to connect to the server. Please check your internet connection and try again."
      onRetry={onRetry}
      icon={WifiOff}
      variant="destructive"
    />
  );
}

/**
 * Server error state (5xx)
 */
export function ServerErrorState({ onRetry }) {
  return (
    <ErrorState
      title="Server Error"
      message="The server encountered an error. Our team has been notified. Please try again later."
      onRetry={onRetry}
      icon={ServerCrash}
      variant="destructive"
    />
  );
}

/**
 * Permission/Authorization error state
 */
export function PermissionErrorState({ message }) {
  return (
    <ErrorState
      title="Access Denied"
      message={message || "You don't have permission to access this resource."}
      showRetry={false}
      icon={ShieldAlert}
      variant="destructive"
    />
  );
}

/**
 * Empty state (no data)
 */
export function EmptyState({
  title = "No data found",
  message = "There's nothing here yet.",
  action,
  actionLabel,
  icon: Icon = AlertCircle,
}) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <div className="text-center space-y-4 max-w-md">
        <div className="flex justify-center">
          <div className="rounded-full p-3 bg-muted text-muted-foreground">
            <Icon className="h-8 w-8" />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">{title}</h3>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        {action && actionLabel && (
          <Button onClick={action} variant="outline">
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Inline error alert (for forms, sections)
 */
export function InlineError({ title, message, onRetry }) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>{message}</span>
        {onRetry && (
          <Button
            onClick={onRetry}
            variant="ghost"
            size="sm"
            className="gap-1 h-auto p-1">
            <RefreshCw className="h-3 w-3" />
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

/**
 * Error boundary fallback UI
 */
export function ErrorBoundaryFallback({ error, resetErrorBoundary }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="max-w-lg w-full">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="rounded-full p-3 bg-destructive/10 text-destructive">
              <AlertCircle className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <h2 className="font-bold text-xl">Application Error</h2>
              <p className="text-sm text-muted-foreground">
                Something went wrong and the application crashed. Please try
                refreshing the page.
              </p>

            </div>
            <div className="flex gap-2">
              <Button onClick={resetErrorBoundary} variant="default">
                Try Again
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="outline">
                Reload Page
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
