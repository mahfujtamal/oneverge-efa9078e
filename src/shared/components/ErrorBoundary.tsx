import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional label shown above the error (e.g. "App", "Route") */
  label?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Runtime error boundary with a visible "Something went wrong" fallback.
 *
 * Catches render-time errors in its subtree and renders a themed fallback
 * screen with the error message + stack so we never get a silent blank page.
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Surface to console so devtools and Lovable preview logs both capture it.
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary] Caught render error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.assign("/");
  };

  private handleHardReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error, errorInfo } = this.state;
    const isDev = import.meta.env?.DEV ?? false;

    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground px-6 py-12">
        <div className="max-w-2xl w-full space-y-6">
          <div className="space-y-2 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {this.props.label ?? "Runtime"} error
            </p>
            <h1 className="text-3xl font-semibold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              The page failed to render. You can try reloading, or return to the
              home screen.
            </p>
          </div>

          {(isDev || error) && (
            <div className="rounded-lg border border-border bg-card text-card-foreground p-4 text-left space-y-3 max-h-[50vh] overflow-auto">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  Message
                </p>
                <pre className="text-sm whitespace-pre-wrap break-words font-mono text-destructive">
                  {error?.name ? `${error.name}: ` : ""}
                  {error?.message ?? "Unknown error"}
                </pre>
              </div>

              {error?.stack && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    Stack
                  </p>
                  <pre className="text-xs whitespace-pre-wrap break-words font-mono text-muted-foreground">
                    {error.stack}
                  </pre>
                </div>
              )}

              {errorInfo?.componentStack && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    Component stack
                  </p>
                  <pre className="text-xs whitespace-pre-wrap break-words font-mono text-muted-foreground">
                    {errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={this.handleReload}
              className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
            >
              Go home
            </button>
            <button
              onClick={this.handleHardReload}
              className="px-5 py-2 rounded-md border border-border text-sm font-medium hover:bg-muted transition"
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
