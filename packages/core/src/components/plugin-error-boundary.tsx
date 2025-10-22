import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  pluginId?: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error Boundary for plugin components
 * FIX: Critical for preventing plugin crashes from breaking the entire app
 */
export class PluginErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const pluginId = this.props.pluginId || 'unknown';
    console.error(`Plugin "${pluginId}" error:`, error, errorInfo);

    // TODO: Send error to telemetry/logging service
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{ padding: '1rem', color: 'red' }}>
          <h3>Plugin Error</h3>
          <p>
            {this.props.pluginId
              ? `The "${this.props.pluginId}" plugin encountered an error.`
              : 'A plugin encountered an error.'}
          </p>
          {this.state.error && (
            <pre style={{ fontSize: '0.875rem', overflow: 'auto' }}>
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
