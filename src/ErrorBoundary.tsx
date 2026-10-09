import type { ErrorInfo, ReactNode } from "react";
import React, { Component } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-900 text-white p-6 flex flex-col justify-center">
          <h1 className="text-3xl font-bold mb-4">💥 Opa, algo quebrou!</h1>
          <p className="mb-4">Tire um print desta tela e mande para o suporte:</p>
          <div className="bg-black p-4 rounded text-xs font-mono overflow-auto border border-red-500 mb-6">
            {this.state.error?.toString()}
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-white text-red-900 py-3 px-6 rounded-xl font-bold"
          >
            Tentar Reiniciar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;