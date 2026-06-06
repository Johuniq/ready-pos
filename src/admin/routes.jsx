import { createHashRouter } from "react-router-dom";
import ApplicationLayout from "../components/application-layout/LayoutOne";
import ErrorPage from "./pages/error/Error";
import Dashboard from "./pages/dashboard";
import Terminal from "./pages/terminal/Terminal";
import Orders from "./pages/orders";
import Reports from "./pages/reports";
import Outlets from "./pages/outlets";
import Settings from "./pages/settings";
import Customers from "./pages/customers";
import Onboarding from "./pages/onboarding";
import Hardware from "./pages/hardware";
import LicensePage from "./pages/license";
import StaffPage from "./pages/staff";
import CustomerDisplay from "./pages/terminal/components/CustomerDisplay";
import Inventory from "./pages/inventory";

export const router = createHashRouter([
  {
    path: "/",
    element: <ApplicationLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "/",
        element: <Dashboard />,
      },
      {
        path: "dashboard",
        element: <Dashboard />,
      },
      {
        path: "terminal",
        element: <Terminal />,
      },
      {
        path: "orders",
        element: <Orders />,
      },
      {
        path: "customers",
        element: <Customers />,
      },
      {
        path: "reports",
        element: <Reports />,
      },
      {
        path: "outlets",
        element: <Outlets />,
      },
      {
        path: "inventory",
        element: <Inventory />,
      },
      {
        path: "settings",
        element: <Settings />,
      },
      {
        path: "hardware",
        element: <Hardware />,
      },
      {
        path: "staff",
        element: <StaffPage />,
      },
      {
        path: "license",
        element: <LicensePage />,
      },
      {
        path: "onboarding",
        element: <Onboarding />,
      },
    ],
  },
  {
    path: "customer-display",
    element: <CustomerDisplay />,
  },
]);
