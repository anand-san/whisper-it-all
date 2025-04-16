import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode; // Optional custom fallback UI
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return this.props.fallback ? (
        this.props.fallback
      ) : (
        <div className="flex flex-col items-center justify-center h-full p-4 text-destructive">
          <h1 className="text-lg font-semibold mb-2">
            Oops! Something went wrong.
          </h1>
          <p className="text-sm mb-4">
            An unexpected error occurred. Please try refreshing the application.
          </p>
          {/* Optionally display error details in development */}
          {process.env.NODE_ENV === "development" && this.state.error && (
            <pre className="text-xs bg-destructive/10 p-2 rounded overflow-auto max-w-full">
              {this.state.error.toString()}
              <br />
              {this.state.error.stack}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
