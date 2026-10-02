import React from "react";
import "./lib/zodConfig";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { LazyMotion, MotionConfig, domAnimation } from "framer-motion";
import App from "./App";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import { AuthProvider } from "./components/AuthProvider";
import { ToastProvider } from "./components/ui/Toast";
import "./styles/index.css";
import "./styles/theme.css";

const container = document.getElementById("root");
if (!container) throw new Error("Missing #root element in index.html");

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation} strict>
        <ErrorBoundary>
          <BrowserRouter>
            <AuthProvider>
              <ToastProvider>
                <App />
              </ToastProvider>
            </AuthProvider>
          </BrowserRouter>
        </ErrorBoundary>
      </LazyMotion>
    </MotionConfig>
  </React.StrictMode>,
);
