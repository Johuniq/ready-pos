import { useRouteError, isRouteErrorResponse, Link } from "react-router-dom";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

const Error = () => {
  const error: any = useRouteError();

  const is404 = isRouteErrorResponse(error) && error.status === 404;

  const title = is404 ? "Page Not Found" : "Something went wrong";

  const description = is404
    ? "The page you're looking for doesn't exist or has been moved."
    : error?.statusText ||
      error?.message ||
      "An unexpected error occurred while rendering this page.";

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[60vh] px-6 text-center font-sans select-none">
      <div className="w-14 h-14 rounded-full bg-rose-500/10 flex items-center justify-center mb-5">
        <AlertTriangle className="w-7 h-7 text-rose-500" />
      </div>

      <h1 className="text-xl font-bold text-foreground mb-1">{title}</h1>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        {description}
      </p>

      {/* Show stack trace in dev for debugging */}
      {!is404 && error?.stack && import.meta.env.DEV && (
        <pre className="text-[10px] text-left bg-muted/50 border rounded-lg p-4 mb-6 max-w-xl w-full overflow-x-auto whitespace-pre-wrap text-muted-foreground">
          {error.stack}
        </pre>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted transition-colors">
          <RotateCcw className="w-3.5 h-3.5" />
          Go Back
        </button>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
          <Home className="w-3.5 h-3.5" />
          Dashboard
        </Link>
      </div>
    </div>
  );
};

export default Error;
