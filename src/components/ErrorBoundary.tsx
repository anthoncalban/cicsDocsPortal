import React from 'react';
import { Component, ReactNode, ErrorInfo } from 'react';
import { AlertCircle, RefreshCw, ShieldAlert, LogOut } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let isPermissionError = false;
      let errorDetails: any = null;

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error?.includes('Missing or insufficient permissions')) {
            isPermissionError = true;
            errorDetails = parsed;
          }
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
          <div className="max-w-xl w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border border-stone-200 text-center">
            <div className="flex justify-center mb-8">
              <div className={`w-24 h-24 rounded-3xl flex items-center justify-center ${isPermissionError ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
                {isPermissionError ? <ShieldAlert size={56} /> : <AlertCircle size={56} />}
              </div>
            </div>

            <h1 className="text-3xl font-display font-bold text-stone-900 mb-4 tracking-tight">
              {isPermissionError ? 'Access Restricted' : 'Something went wrong'}
            </h1>

            {isPermissionError ? (
              <div className="space-y-6">
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 text-left">
                  <p className="text-amber-900 font-semibold mb-2 flex items-center gap-2">
                    <ShieldAlert size={18} />
                    Firestore Permission Denied
                  </p>
                  <p className="text-amber-800 text-sm leading-relaxed mb-4">
                    Your Firebase project is currently blocking access to the data. This usually happens when the <strong>Security Rules</strong> are set to "Locked Mode".
                  </p>
                  <div className="bg-white/50 rounded-xl p-4 font-mono text-[10px] text-amber-900 break-all border border-amber-200/50">
                    Path: {errorDetails?.path || 'unknown'}<br/>
                    Op: {errorDetails?.operationType || 'unknown'}
                  </div>
                </div>

                <div className="text-left space-y-4">
                  <p className="text-stone-600 text-sm font-medium">To fix this, go to your Firebase Console and update your rules:</p>
                  <ol className="text-stone-500 text-sm space-y-2 list-decimal list-inside">
                    <li>Open <strong>Firestore Database</strong> → <strong>Rules</strong></li>
                    <li>Paste the rules provided in the chat</li>
                    <li>Click <strong>Publish</strong></li>
                    <li>Wait 30 seconds and refresh this page</li>
                  </ol>
                </div>
              </div>
            ) : (
              <p className="text-stone-500 mb-8 leading-relaxed">
                {this.state.error?.message || 'An unexpected error occurred while loading the application.'}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-4 mt-10">
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 py-4 px-6 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-2xl transition-all shadow-lg"
              >
                <RefreshCw size={20} />
                Refresh App
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/';
                }}
                className="flex-1 flex items-center justify-center gap-2 py-4 px-6 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold rounded-2xl transition-all"
              >
                <LogOut size={20} />
                Clear Cache
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
