import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { AuthProvider } from "./context/AuthContext.jsx";
import { BranchProvider } from "./context/BranchContext.jsx";
import { NotificationProvider } from "./context/NotificationContext.jsx";
import { RealtimeSyncProvider } from "./context/RealtimeSyncContext.jsx";
import muiTheme from "./theme/muiTheme.js";
import App from "./App.jsx";
import { queryClient } from "./api/queryClient.js";
import { ErrorBoundary } from "./components/system/ErrorBoundary.jsx";
import { AppFeedback } from "./components/system/AppFeedback.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <BranchProvider>
              <NotificationProvider>
                <RealtimeSyncProvider>
                  <ErrorBoundary><App /></ErrorBoundary>
                  <AppFeedback />
                </RealtimeSyncProvider>
              </NotificationProvider>
            </BranchProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// Register Web Push Service Worker reliably
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const registerSw = () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        console.log('✅ Web Push Service Worker registered with scope:', reg.scope);
      })
      .catch((err) => {
        console.warn('⚠️ Web Push Service Worker registration failed:', err);
      });
  };

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    registerSw();
  } else {
    window.addEventListener('load', registerSw);
  }
}

