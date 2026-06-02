import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import { ThemeProvider } from "@/components/theme-provider";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { PageSkeleton } from "@/components/loading/PageSkeleton";
const el = document.getElementById("myplugin-frontend");

if (el) {
  ReactDOM.createRoot(el).render(
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <React.StrictMode>
          <RouterProvider router={router} fallbackElement={<PageSkeleton />} />
        </React.StrictMode>
      </ThemeProvider>
    </ErrorBoundary>,
  );
}
