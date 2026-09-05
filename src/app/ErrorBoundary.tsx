import { Component, type ErrorInfo, type ReactNode } from "react";

import { Wordmark } from "@/components/Brand";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * The last line before a blank white screen.
 *
 * A render error anywhere below this unmounts the whole tree; on the floor
 * tablet that looks like the app has vanished, and the person holding it has
 * no way to tell a crash from a dead network. This shows a page that says
 * what happened in one line and offers the only two actions that help:
 * reload, or go back to the start. Nothing here depends on state that might
 * itself be the broken thing.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // The platform's log drain is the place this goes; nothing else to do
    // client-side without a telemetry vendor, which this tool does not have.
    console.error("render error", error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <main className="flex min-h-full items-center justify-center px-5 py-12">
        <div className="w-full max-w-md text-center">
          <Wordmark />
          <h1 className="mt-6 text-xl font-semibold tracking-tight">Something went wrong</h1>
          <p className="mt-2 text-sm text-akira-ink/60">
            The screen hit an error it could not recover from. Nothing you submitted has been lost:
            anything unsent is still queued on this device.
          </p>
          <p className="mt-2 font-mono text-xs text-akira-ink/40">{this.state.error.message}</p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-md bg-akira-ink px-4 py-2 text-sm font-medium text-white"
            >
              Reload
            </button>
            <button
              type="button"
              onClick={() => window.location.assign("/")}
              className="rounded-md border border-akira-ink/15 px-4 py-2 text-sm font-medium"
            >
              Start again
            </button>
          </div>
        </div>
      </main>
    );
  }
}
