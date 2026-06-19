import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import { ThemeProvider } from "@/components/theme-provider";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { PageSkeleton } from "@/components/loading/PageSkeleton";
import { AlertProvider } from "@/components/ui/alert-provider";
import { Toaster } from "sonner";

const el = document.getElementById("readypos-app");

if (el) {
  ReactDOM.createRoot(el).render(
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <AlertProvider>
          <React.StrictMode>
            <RouterProvider
              router={router}
              fallbackElement={<PageSkeleton />}
            />
          </React.StrictMode>
          <Toaster position="top-right" richColors closeButton />
        </AlertProvider>
      </ThemeProvider>
    </ErrorBoundary>,
  );
}
