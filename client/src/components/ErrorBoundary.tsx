import { Component, type ReactNode } from "react";

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="mx-auto my-8 max-w-xl rounded-xl border border-line bg-surface p-5">
        <p className="font-medium">Something went wrong on this page.</p>
        <pre className="mt-2 whitespace-pre-wrap text-xs text-muted">{this.state.error.message}</pre>
        <button className="mt-3 text-sm underline" onClick={() => this.setState({ error: null })}>
          Try again
        </button>
      </div>
    );
  }
}
