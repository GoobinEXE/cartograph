import React, { useState } from 'react';
import { FeedbackType, UserFeedbackItem } from '../types/academic';
import { useI18n } from '../i18n/context';
import { PrismMonogram, PrismSpectralBar } from './PrismLogo';
import {
  Check,
  Copy,
  Lightbulb,
  AlertTriangle,
  Sparkles,
  MessageSquare,
  Star,
  Send,
  Trash2,
  ExternalLink,
} from 'lucide-react';

interface FeedbackViewProps {
  onFeedbackSent?: (item: UserFeedbackItem) => void;
}

const STORAGE_KEY_FEEDBACK = 'cartograph_feedback_history_v1';

export const FeedbackView: React.FC<FeedbackViewProps> = ({ onFeedbackSent }) => {
  const { t } = useI18n();

  const [type, setType] = useState<FeedbackType>('suggestion');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [relatedUrl, setRelatedUrl] = useState('');
  const [institution, setInstitution] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [history, setHistory] = useState<UserFeedbackItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_FEEDBACK);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const feedbackTypes: { id: FeedbackType; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'suggestion', label: t('feedbackTypeSuggestion'), icon: Lightbulb },
    { id: 'correction', label: t('feedbackTypeCorrection'), icon: AlertTriangle },
    { id: 'feature', label: t('feedbackTypeFeature'), icon: Sparkles },
    { id: 'general', label: t('feedbackTypeGeneral'), icon: MessageSquare },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const newItem: UserFeedbackItem = {
      id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      subject: subject.trim(),
      message: message.trim(),
      relatedUrl: relatedUrl.trim() || undefined,
      institution: institution.trim() || undefined,
      userEmail: userEmail.trim() || undefined,
      rating,
      createdAt: new Date().toISOString(),
    };

    // 1. Persist locally
    const updatedHistory = [newItem, ...history];
    setHistory(updatedHistory);
    try {
      localStorage.setItem(STORAGE_KEY_FEEDBACK, JSON.stringify(updatedHistory));
    } catch {
      // ignore
    }

    // 2. Attempt sending to local server bridge if online
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });
    } catch {
      // Graceful degradation when running purely in static browser mode
    }

    if (onFeedbackSent) {
      onFeedbackSent(newItem);
    }

    // Reset form
    setSubject('');
    setMessage('');
    setRelatedUrl('');
    setIsSubmitting(false);
    setSuccessBanner(t('feedbackSuccessBanner'));
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  const handleCopyMarkdown = async (item: UserFeedbackItem) => {
    const text = `### [Feedback Cartograph] ${item.subject}
- **Tipo:** ${item.type}
- **Avaliação:** ${item.rating}/5
- **Data:** ${new Date(item.createdAt).toLocaleDateString()}
${item.institution ? `- **Instituição:** ${item.institution}\n` : ''}${item.relatedUrl ? `- **URL/Base:** ${item.relatedUrl}\n` : ''}${item.userEmail ? `- **Contato:** ${item.userEmail}\n` : ''}
${item.message}`;

    await navigator.clipboard.writeText(text);
    setCopiedKey(item.id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRemoveHistoryItem = (id: string) => {
    const next = history.filter((h) => h.id !== id);
    setHistory(next);
    try {
      localStorage.setItem(STORAGE_KEY_FEEDBACK, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header Banner */}
      <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 mb-2">
              <PrismMonogram className="h-4 w-auto" />
              <span className="text-xs uppercase font-mono tracking-wider text-[var(--text-muted)]">
                Prism Open Science
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-heading font-semibold text-[var(--text-primary)] tracking-tight">
              {t('feedbackTitle')}
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1.5 max-w-2xl leading-relaxed">
              {t('feedbackSubtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="p-4 rounded-xl bg-[var(--accent-blue-tint)] text-[var(--link-academic)] text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-[var(--meta-green)]" />
            <span>{successBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="text-xs opacity-70 hover:opacity-100 cursor-pointer ml-3"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Feedback Form — Soft Surface, Borderless */}
      <form onSubmit={handleSubmit} className="bg-[var(--bg-secondary)] rounded-2xl p-6 sm:p-8 space-y-6">
        {/* Type Selector Pills */}
        <div>
          <label className="block text-xs font-semibold text-[var(--text-primary)] mb-2.5">
            {t('feedbackTypeLabel')}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {feedbackTypes.map((ft) => {
              const Icon = ft.icon;
              const isSelected = type === ft.id;
              return (
                <button
                  key={ft.id}
                  type="button"
                  onClick={() => setType(ft.id)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer text-left ${
                    isSelected
                      ? 'bg-[var(--link-academic)] text-white shadow-xs'
                      : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-canvas)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{ft.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Rating Row */}
        <div>
          <label className="block text-xs font-semibold text-[var(--text-primary)] mb-2">
            {t('feedbackRatingLabel')}
          </label>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((star) => {
              const active = (hoverRating ?? rating) >= star;
              return (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  onClick={() => setRating(star)}
                  className="p-1 text-[var(--text-muted)] hover:text-amber-400 transition-colors cursor-pointer"
                  title={`${star} de 5`}
                >
                  <Star
                    className={`w-5 h-5 transition-transform hover:scale-110 ${
                      active ? 'fill-amber-400 text-amber-400' : 'text-[var(--text-muted)]'
                    }`}
                  />
                </button>
              );
            })}
            <span className="ml-2 text-xs text-[var(--text-muted)] font-mono">
              {rating}/5
            </span>
          </div>
        </div>

        {/* Subject */}
        <div>
          <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
            {t('feedbackSubjectLabel')} <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t('feedbackSubjectPlaceholder')}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-canvas)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--link-academic)]/25"
          />
        </div>

        {/* Message */}
        <div>
          <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
            {t('feedbackMessageLabel')} <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('feedbackMessagePlaceholder')}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-canvas)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--link-academic)]/25 resize-y"
          />
        </div>

        {/* Optional Metadata Row (Institution, Related URL, Email) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              {t('feedbackInstitutionLabel')}
            </label>
            <input
              type="text"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder={t('feedbackInstitutionPlaceholder')}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-canvas)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--link-academic)]/25"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              {t('feedbackUrlLabel')}
            </label>
            <input
              type="text"
              value={relatedUrl}
              onChange={(e) => setRelatedUrl(e.target.value)}
              placeholder={t('feedbackUrlPlaceholder')}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-canvas)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--link-academic)]/25"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              {t('feedbackEmailLabel')}
            </label>
            <input
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder={t('feedbackEmailPlaceholder')}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-canvas)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--link-academic)]/25"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex items-center justify-between gap-4">
          <span className="text-xs text-[var(--text-muted)]">
            Seus comentários ajudam a aprimorar o catálogo e a precisão do Cartograph.
          </span>
          <button
            type="submit"
            disabled={!subject.trim() || !message.trim() || isSubmitting}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold transition-opacity shrink-0 cursor-pointer ${
              subject.trim() && message.trim() && !isSubmitting
                ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:opacity-90'
                : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] cursor-not-allowed opacity-60'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Registrando...' : t('feedbackSubmitBtn')}</span>
          </button>
        </div>
      </form>

      {/* History Section */}
      <div className="space-y-4">
        <h3 className="text-base font-heading font-semibold text-[var(--text-primary)]">
          {t('feedbackHistoryTitle')} ({history.length})
        </h3>

        {history.length === 0 ? (
          <div className="bg-[var(--bg-secondary)] rounded-2xl p-8 text-center text-xs text-[var(--text-muted)]">
            {t('feedbackHistoryEmpty')}
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div
                key={item.id}
                className="bg-[var(--bg-secondary)] rounded-2xl p-5 transition-colors flex flex-col justify-between gap-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] uppercase font-mono px-2 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-medium">
                        {item.type}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-amber-400 font-mono">
                        {'★'.repeat(item.rating)}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                      {item.subject}
                    </h4>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyMarkdown(item)}
                      className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2.5 py-1 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-canvas)] transition-colors cursor-pointer"
                      title="Copiar em Markdown"
                    >
                      {copiedKey === item.id ? (
                        <Check className="w-3.5 h-3.5 text-[var(--meta-green)]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      )}
                      <span>Copiar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveHistoryItem(item.id)}
                      className="p-1 text-[var(--text-muted)] hover:text-rose-500 transition-colors cursor-pointer"
                      title="Remover do histórico"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                  {item.message}
                </p>

                {(item.institution || item.relatedUrl) && (
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--text-muted)] pt-1">
                    {item.institution && <span>Instituição: {item.institution}</span>}
                    {item.relatedUrl && (
                      <a
                        href={item.relatedUrl.startsWith('http') ? item.relatedUrl : `https://${item.relatedUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[var(--link-academic)] hover:underline"
                      >
                        <span>{item.relatedUrl}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Institutional Note */}
      <div className="p-5 rounded-2xl bg-[var(--bg-secondary)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <PrismMonogram className="h-5 w-auto shrink-0" />
          <div className="text-xs">
            <span className="font-semibold text-[var(--text-primary)]">Prism Labs</span>
            <span className="mx-1.5 text-[var(--divider)]">·</span>
            <span className="text-[var(--text-muted)]">
              Engenharia de software e pesquisa em ciência aberta.
            </span>
          </div>
        </div>
        <PrismSpectralBar className="h-1 w-24 shrink-0 rounded-full" />
      </div>
    </div>
  );
};

