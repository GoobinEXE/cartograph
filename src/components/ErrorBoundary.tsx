import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : 'Erro inesperado de renderização',
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo): void {
    console.error('[Cartograph ErrorBoundary]', error, info.componentStack);
  }

  private handleExportEmergencyBackup = (): void => {
    try {
      const snapshot: Record<string, unknown> = {
        schemaVersion: 1,
        emergencyBackupAt: new Date().toISOString(),
      };
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith('cartograph_')) {
          const raw = window.localStorage.getItem(key);
          try {
            snapshot[key] = raw ? JSON.parse(raw) : null;
          } catch {
            snapshot[key] = raw;
          }
        }
      }
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
        type: 'application/json;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cartograph_emergency_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // ignore download errors
    }
  };

  private handleResetLayoutState = (): void => {
    try {
      window.localStorage.removeItem('cartograph_sidebar_drawers_v2');
      window.localStorage.removeItem('cartograph_federated_sidebar_drawers_v1');
      window.localStorage.removeItem('cartograph_theme_v1');
    } catch {
      // ignore storage errors
    }
    window.location.reload();
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-[var(--bg-canvas,#090D16)] text-[var(--text-primary,#F8FAFC)] flex items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-2xl border border-[var(--divider,#1E293B)] bg-[var(--bg-secondary,#0F172A)] p-7 space-y-5 shadow-xl">
          <div className="space-y-1.5">
            <p className="text-xs font-mono uppercase tracking-wider text-sky-400">
              Recuperação de Sessão · Cartograph
            </p>
            <h1 className="text-xl font-semibold">
              Ocorreu uma falha inesperada na interface
            </h1>
            <p className="text-sm text-[var(--text-secondary,#94A3B8)] leading-relaxed">
              Seus artigos salvos, grupos de revisão e notas no navegador não foram apagados. Você pode exportar um backup imediato antes de recarregar.
            </p>
          </div>

          {this.state.errorMessage && (
            <pre className="text-xs font-mono bg-black/25 rounded-xl p-3 overflow-x-auto text-rose-300 border border-rose-500/20">
              {this.state.errorMessage}
            </pre>
          )}

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-sky-500 text-slate-950 hover:bg-sky-400 transition-colors cursor-pointer"
            >
              Recarregar página
            </button>
            <button
              type="button"
              onClick={this.handleExportEmergencyBackup}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-[var(--divider,#334155)] hover:bg-white/5 transition-colors cursor-pointer"
            >
              Baixar backup (.json)
            </button>
            <button
              type="button"
              onClick={this.handleResetLayoutState}
              className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--text-secondary,#94A3B8)] hover:bg-white/5 transition-colors cursor-pointer"
            >
              Redefinir layout e recarregar
            </button>
          </div>
        </div>
      </div>
    );
  }
}
