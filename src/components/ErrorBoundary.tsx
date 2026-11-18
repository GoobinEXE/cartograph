import React from 'react';
import { detectBrowserLanguage, translate } from '../i18n/context';
import type { Translations } from '../i18n/translations';
import { loadUserAccessConfig } from '../utils/accessConfig';
import { canUseNativeShare, shareOrDownloadFile } from '../utils/fileDownload';
import { LAYOUT_STORAGE_KEYS, clearLayoutPreferences } from '../utils/layoutPreferences';
import { workspaceStorageEngine } from '../utils/storageEngine';
import { buildEmergencyBackupFromRecords } from '../utils/workspaceBackup';

type EmergencyBackupStatus =
  | { kind: 'idle' }
  | { kind: 'saved'; papers: number; groups: number; rejected: number }
  | { kind: 'failed' };

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
  backupStatus: EmergencyBackupStatus;
}

/**
 * Last-resort recovery screen. It reads the dictionary through `translate()` instead of the
 * I18n context because the provider subtree may be the part that crashed.
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: null, backupStatus: { kind: 'idle' } };
  }

  static getDerivedStateFromError(error: unknown): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      errorMessage: error instanceof Error && error.message ? error.message : null,
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo): void {
    console.error('[Cartograph ErrorBoundary]', error, info.componentStack);
    // A crash during the first render happens before App's theme effect commits, so the
    // recovery screen would ignore the stored dark theme without this.
    try {
      const root = document.documentElement;
      if (!root.hasAttribute('data-theme')) {
        const stored = window.localStorage.getItem(LAYOUT_STORAGE_KEYS.theme);
        if (stored === 'light' || stored === 'dark') root.setAttribute('data-theme', stored);
      }
    } catch {
      // storage blocked: keep the default light tokens
    }
  }

  private handleExportEmergencyBackup = async (): Promise<void> => {
    try {
      // Only workspace keys are read here; the access config (BYOK keys, InstToken,
      // institutional proxy) is never serialized. Owned platform IDs are not secrets.
      const records = await workspaceStorageEngine.exportAllRawRecords().catch(() => ({}));
      let ownedPlatformIds: string[] | undefined;
      try {
        ownedPlatformIds = loadUserAccessConfig().ownedPlatformIds;
      } catch {
        ownedPlatformIds = undefined;
      }

      const backup = buildEmergencyBackupFromRecords(records, { ownedPlatformIds });
      const result = await shareOrDownloadFile(
        `cartograph-emergency-backup-${new Date().toISOString().slice(0, 10)}.json`,
        backup.json,
        'application/json;charset=utf-8;',
        'Cartograph Emergency Backup'
      );
      if (result === 'cancelled') return;
      this.setState({
        backupStatus: {
          kind: 'saved',
          papers: backup.savedPapers,
          groups: backup.groups,
          rejected: backup.rejected,
        },
      });
    } catch {
      this.setState({ backupStatus: { kind: 'failed' } });
    }
  };

  private handleResetLayoutState = (): void => {
    try {
      clearLayoutPreferences(window.localStorage);
    } catch {
      // localStorage access itself can throw when site data is blocked
    }
    window.location.reload();
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const language = detectBrowserLanguage();
    const tr = (key: keyof Translations, params?: Record<string, string | number>) =>
      translate(language, key, params);
    const { backupStatus } = this.state;

    return (
      <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-lg w-full rounded-2xl border border-[var(--divider)] bg-[var(--bg-secondary)] p-4 sm:p-7 space-y-4 sm:space-y-5 shadow-xl">
          <div className="space-y-1.5">
            <p className="text-xs font-mono uppercase tracking-wider text-[var(--link-academic)]">
              {tr('errorBoundaryEyebrow')}
            </p>
            <h1 className="font-heading text-xl font-semibold">{tr('errorBoundaryTitle')}</h1>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {tr('errorBoundaryBody')}
            </p>
          </div>

          <pre className="text-xs font-mono bg-[var(--bg-subtle)] text-[var(--text-primary)] rounded-xl p-3 max-h-40 overflow-y-auto overscroll-contain whitespace-pre-wrap break-words border border-[var(--divider)]">
            {this.state.errorMessage ?? tr('errorBoundaryFallbackMessage')}
          </pre>

          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-11 w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-semibold bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:opacity-90 transition-opacity cursor-pointer"
            >
              {tr('errorBoundaryReload')}
            </button>
            <button
              type="button"
              onClick={this.handleExportEmergencyBackup}
              className="min-h-11 w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-medium border border-[var(--divider)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
            >
              {canUseNativeShare() ? tr('shareBackupBtn') : tr('errorBoundaryDownloadBackup')}
            </button>
            <button
              type="button"
              onClick={this.handleResetLayoutState}
              className="min-h-11 w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
            >
              {tr('errorBoundaryResetLayout')}
            </button>
          </div>

          {backupStatus.kind !== 'idle' && (
            <p
              role="status"
              className="text-[13px] leading-relaxed text-[var(--text-secondary)]"
            >
              {backupStatus.kind === 'saved'
                ? [
                    tr('errorBoundaryBackupSaved', {
                      papers: backupStatus.papers,
                      groups: backupStatus.groups,
                    }),
                    backupStatus.rejected > 0
                      ? tr('errorBoundaryBackupRejected', { count: backupStatus.rejected })
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')
                : tr('errorBoundaryBackupFailed')}
            </p>
          )}
        </div>
      </div>
    );
  }
}
