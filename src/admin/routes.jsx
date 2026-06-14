import { createHashRouter } from "react-router-dom";
import ApplicationLayout from "../components/application-layout/LayoutOne";
import ErrorPage from "./pages/error/Error";
import Dashboard from "./pages/dashboard";
import Terminal from "./pages/terminal/Terminal";
import Orders from "./pages/orders";
import Outlets from "./pages/outlets";
import Settings from "./pages/settings";
import Customers from "./pages/customers";
import Onboarding from "./pages/onboarding";
import CustomerDisplay from "./pages/terminal/components/CustomerDisplay";

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
        path: "outlets",
        element: <Outlets />,
      },
      {
        path: "settings",
        element: <Settings />,
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
