import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import Button from "./ui/Button";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-neo-bg flex items-center justify-center p-4">
          <div className="bg-neo-white border-4 border-neo-ink shadow-neo-lg p-6 sm:p-8 max-w-lg w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-neo-accent border-2 border-neo-ink flex items-center justify-center shadow-neo-sm">
                <AlertTriangle size={24} strokeWidth={3} className="text-neo-ink" />
              </div>
              <div>
                <h2 className="text-lg font-black uppercase tracking-wider text-neo-ink">
                  Application Encountered An Issue
                </h2>
                <p className="text-xs font-bold text-neo-ink/70 uppercase">
                  Neo-Brutalist Safety Boundary
                </p>
              </div>
            </div>

            <div className="bg-neo-bg border-2 border-neo-ink p-3 mb-6 font-mono text-xs text-neo-ink break-words">
              {this.state.error?.message || "Unknown rendering exception"}
            </div>

            <div className="flex gap-3">
              <Button
                variant="primary"
                onClick={this.handleReset}
                className="w-full flex items-center justify-center gap-2"
              >
                <RotateCcw size={16} strokeWidth={3} />
                Reload Application
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
