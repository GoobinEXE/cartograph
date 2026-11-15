import React, { useEffect, useState } from 'react';
import { ArrowUpRight, Check, Copy, ExternalLink, X } from 'lucide-react';
import { sanitizeExternalUrl } from '../utils/urlSafety';

export interface WebLaunchTarget {
  id: string;
  name: string;
  shortTag: string;
  url: string;
}

interface WebLaunchDrawerProps {
  isOpen: boolean;
  query: string;
  targets: WebLaunchTarget[];
  blockedOrBrowserLimited: boolean;
  onClose: () => void;
}

export const WebLaunchDrawer: React.FC<WebLaunchDrawerProps> = ({
  isOpen,
  query,
  targets,
  blockedOrBrowserLimited,
  onClose,
}) => {
  const [openedIds, setOpenedIds] = useState<Set<string>>(() => new Set());
  const [copiedAll, setCopiedAll] = useState(false);

  useEffect(() => {
    setOpenedIds(new Set());
  }, [query, targets]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || targets.length === 0) return null;

  const markOpened = (id: string) => {
    setOpenedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const handleCopyAllUrls = async () => {
    const safeList = targets
      .map((t) => {
        const safe = sanitizeExternalUrl(t.url);
        return safe ? `${t.name}: ${safe}` : null;
      })
      .filter(Boolean)
      .join('\n');

    if (!safeList) return;
    try {
      await navigator.clipboard.writeText(safeList);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    } catch {
      // ignore clipboard restriction
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="web-launch-dialog-title"
    >
      <div
        className="w-full max-w-xl bg-[var(--bg-canvas)] border border-[var(--divider)] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[var(--divider)] flex items-start justify-between gap-4">
          <div>
            <h2
              id="web-launch-dialog-title"
              className="text-base font-heading font-semibold text-[var(--text-primary)]"
            >
              Abertura Assistida de Portais ({targets.length})
            </h2>
            <p className="text-[13px] text-[var(--text-secondary)] mt-1 leading-snug">
              {blockedOrBrowserLimited
                ? 'Navegadores bloqueiam múltiplas abas simultâneas sem Bridge local. Clique em cada portal abaixo para abrir diretamente com a sua busca:'
                : 'Acesso direto aos portais selecionados para a busca atual:'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
            aria-label="Fechar painel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-3 bg-[var(--bg-secondary)] border-b border-[var(--divider)] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="text-[var(--text-secondary)] truncate max-w-md">
            Query: <code className="font-mono text-[var(--text-primary)]">{query}</code>
          </div>
          <button
            type="button"
            onClick={handleCopyAllUrls}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--divider)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-medium cursor-pointer"
          >
            {copiedAll ? (
              <Check className="w-3.5 h-3.5 text-[var(--meta-green)]" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            )}
            <span>{copiedAll ? 'URLs copiadas' : 'Copiar todas as URLs'}</span>
          </button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto divide-y divide-[var(--divider)]">
          {targets.map((target) => {
            const safeHref = sanitizeExternalUrl(target.url);
            if (!safeHref) return null;
            const isOpened = openedIds.has(target.id);

            return (
              <div
                key={target.id}
                className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {target.name}
                    </span>
                    <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-muted)] shrink-0">
                      {target.shortTag}
                    </span>
                    {isOpened && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--meta-green)]">
                        <Check className="w-3 h-3" />
                        <span>Aberto</span>
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                    {safeHref}
                  </div>
                </div>

                <a
                  href={safeHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => markOpened(target.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:opacity-90 shrink-0"
                >
                  <span>Abrir</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>
            );
          })}
        </div>

        <div className="px-5 py-3 bg-[var(--bg-secondary)] border-t border-[var(--divider)] flex items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <ExternalLink className="w-3.5 h-3.5" />
            <span>
              Dica: permita pop-ups para <strong>cartographsearch.com</strong> ou use o app desktop Tauri para abrir tudo de uma vez.
            </span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--divider)] text-[var(--text-primary)] font-medium cursor-pointer hover:bg-[var(--bg-hover)] shrink-0"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
