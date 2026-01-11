// ============================================
// Error Boundary Component with Sentry Integration
// Path: src/components/ErrorBoundary.tsx
// ============================================

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import * as Sentry from '@sentry/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  eventId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    eventId: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to Sentry with full error context
    const eventId = Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
      level: 'error',
    });

    this.setState({ errorInfo, eventId });

    // Also log to console in development
    if (import.meta.env.DEV) {
      console.error('Error caught by boundary:', error, errorInfo);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, eventId: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.href = '/';
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleReportFeedback = () => {
    if (this.state.eventId) {
      Sentry.showReportDialog({ eventId: this.state.eventId });
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const showDetails = this.props.showDetails ?? import.meta.env.DEV;

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" role="alert" aria-live="assertive">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-10 h-10 text-finixar-red" />
              </div>

              <h1 className="text-2xl font-bold text-slate-900 mb-3">
                Une erreur est survenue
              </h1>

              <p className="text-slate-600 mb-6 leading-relaxed">
                Nous sommes désolés, une erreur inattendue s'est produite. Veuillez réessayer ou revenir à l'accueil.
              </p>
            </div>

            {this.state.error && showDetails && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-2 mb-2">
                  <Bug className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 mb-1">Détails de l'erreur:</p>
                    <p className="text-sm text-slate-600 font-mono break-words">
                      {this.state.error.message}
                    </p>
                    {this.state.error.stack && (
                      <details className="mt-3">
                        <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">
                          Voir la stack trace
                        </summary>
                        <pre className="mt-2 text-xs text-slate-600 overflow-x-auto whitespace-pre-wrap">
                          {this.state.error.stack}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={this.handleReset}
                className="px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium flex items-center justify-center gap-2"
                aria-label="Retourner à la page d'accueil"
              >
                <Home className="w-5 h-5" />
                Accueil
              </button>

              <button
                onClick={this.handleReload}
                className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium flex items-center justify-center gap-2"
                aria-label="Recharger la page"
              >
                <RefreshCw className="w-5 h-5" />
                Recharger
              </button>

              {this.state.eventId && (
                <button
                  onClick={this.handleReportFeedback}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                  aria-label="Signaler le problème"
                >
                  <Bug className="w-5 h-5" />
                  Signaler
                </button>
              )}
            </div>

            {this.state.eventId && (
              <p className="text-xs text-slate-500 text-center mt-4">
                ID d'erreur: {this.state.eventId}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
