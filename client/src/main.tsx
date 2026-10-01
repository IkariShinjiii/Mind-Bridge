import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import { AuthProvider } from "./components/AuthProvider";
import "./styles/index.css";
import "./styles/theme.css";

const container = document.getElementById("root");
if (!container) throw new Error("Missing #root element in index.html");

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
