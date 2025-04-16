import ReactDOM from "react-dom/client";
import WindowManager from "./WindowManager";
import "./styles/globals.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ErrorBoundary from "./components/ErrorBoundary"; // Import ErrorBoundary

// Interface no longer needed here
// interface TranscriptionPayload {
//   text: string;
// }

const RootComponent = () => {
  const queryClient = new QueryClient();
  // currentWindowLabel and useEffect hook related to new_transcription listener are removed

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex">
        <WindowManager />
      </div>
    </QueryClientProvider>
  );
};
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  // Wrap RootComponent with ErrorBoundary
  <ErrorBoundary>
    <RootComponent />
  </ErrorBoundary>
);
