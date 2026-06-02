import React, { createContext, useContext, useState, useCallback } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const AlertContext = createContext(null);

export function AlertProvider({ children }) {
  const [alertState, setAlertState] = useState({
    isOpen: false,
    title: "",
    description: "",
    type: "alert", // 'alert' or 'confirm'
    onConfirm: null,
    confirmText: "OK",
    cancelText: "Cancel",
  });

  const showAlert = useCallback((description, title = "Alert") => {
    return new Promise((resolve) => {
      setAlertState({
        isOpen: true,
        title,
        description,
        type: "alert",
        onConfirm: () => {
          resolve(true);
          setAlertState((prev) => ({ ...prev, isOpen: false }));
        },
        confirmText: "OK",
        cancelText: "Cancel",
      });
    });
  }, []);

  const showConfirm = useCallback(
    (description, title = "Confirm", options = {}) => {
      return new Promise((resolve) => {
        setAlertState({
          isOpen: true,
          title,
          description,
          type: "confirm",
          onConfirm: () => {
            resolve(true);
            setAlertState((prev) => ({ ...prev, isOpen: false }));
          },
          onCancel: () => {
            resolve(false);
            setAlertState((prev) => ({ ...prev, isOpen: false }));
          },
          confirmText: options.confirmText || "Continue",
          cancelText: options.cancelText || "Cancel",
        });
      });
    },
    []
  );

  const handleClose = useCallback(() => {
    if (alertState.type === "confirm" && alertState.onCancel) {
      alertState.onCancel();
    }
    setAlertState((prev) => ({ ...prev, isOpen: false }));
  }, [alertState]);

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      <AlertDialog open={alertState.isOpen} onOpenChange={handleClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertState.title}</AlertDialogTitle>
            <AlertDialogDescription>{alertState.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {alertState.type === "confirm" && (
              <AlertDialogCancel onClick={handleClose}>
                {alertState.cancelText}
              </AlertDialogCancel>
            )}
            <AlertDialogAction onClick={alertState.onConfirm}>
              {alertState.confirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert must be used within an AlertProvider");
  }
  return context;
}
