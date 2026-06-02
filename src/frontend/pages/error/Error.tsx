import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";

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
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center px-6 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10">
        <AlertTriangle className="h-7 w-7 text-rose-500" />
      </div>

      <h1 className="mb-1 text-xl font-bold text-foreground">{title}</h1>
      <p className="mb-6 max-w-md text-sm text-muted-foreground">
        {description}
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2 text-xs font-semibold transition-colors hover:bg-muted">
          <RotateCcw className="h-3.5 w-3.5" />
          Go Back
        </button>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
          <Home className="h-3.5 w-3.5" />
          Home
        </Link>
      </div>
    </div>
  );
};

export default Error;
