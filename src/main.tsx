import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./styles/globals.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ErrorBoundary from "./components/ErrorBoundary"; // Import ErrorBoundary
import { Toaster } from "sonner";
import { SidebarProvider } from "./components/ui/sidebar";
import { ModelSelectionProvider } from "./views/AiInteraction/context/ModelSelectionContext";
import { AuthProvider } from "./contexts/AuthContext";
import WindowManager from "./WindowManager";
import { initializeTauriFetch } from "./lib/tauriFetch";

// Initialize Tauri fetch override for proper cookie handling
initializeTauriFetch();

const RootComponent = () => {
  const queryClient = new QueryClient();

  return (
    <div className="bg-background/80">
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <BrowserRouter>
              <SidebarProvider defaultOpen={false}>
                <ModelSelectionProvider>
                  <>
                    <div
                      className="absolute top-0 h-7 w-full z-50"
                      data-tauri-drag-region
                    />
                    <div className="h-screen w-screen grow bg-background/50">
                      <WindowManager />
                    </div>
                  </>
                  <Toaster position="top-center" />
                </ModelSelectionProvider>
              </SidebarProvider>
            </BrowserRouter>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </div>
  );
};
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <RootComponent />
);
