import { intlLocale } from '../i18n/localized';
import React, { useState } from 'react';
import { FeedbackType, UserFeedbackItem } from '../types/academic';
import { useI18n } from '../i18n/context';
import { copyTextSafely } from '../utils/fileDownload';
import { sanitizeExternalUrl } from '../utils/urlSafety';
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
  const { language, t } = useI18n();

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

    // 2. Attempt sending to API endpoint if online
    let persistedRemotely = false;
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });
      if (res.ok) {
        const data = (await res.json()) as { persistedRemotely?: boolean };
        persistedRemotely = Boolean(data?.persistedRemotely);
      }
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
    setSuccessBanner(
      persistedRemotely
        ? t('feedbackSuccessBanner')
        : `${t('feedbackSuccessBanner')} ${t('feedbackLocalNotice')}`
    );
    setTimeout(() => setSuccessBanner(null), 6000);
  };

  const handleCopyMarkdown = async (item: UserFeedbackItem) => {
    const locale = intlLocale(language);
    const text = `### ${t('feedbackMarkdownHeader')} ${item.subject}
- **${t('feedbackMarkdownType')}** ${item.type}
- **${t('feedbackMarkdownRating')}** ${item.rating}/5
- **${t('feedbackMarkdownDate')}** ${new Date(item.createdAt).toLocaleDateString(locale)}
${item.institution ? `- **${t('feedbackMarkdownInstitution')}** ${item.institution}\n` : ''}${item.relatedUrl ? `- **${t('feedbackMarkdownUrl')}** ${item.relatedUrl}\n` : ''}${item.userEmail ? `- **${t('feedbackMarkdownContact')}** ${item.userEmail}\n` : ''}
${item.message}`;

    const copied = await copyTextSafely(text);
    if (!copied) return;
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
      <div className="bg-[var(--bg-secondary)] rounded-2xl p-5 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 mb-2">
              <PrismMonogram className="h-4 w-auto" />
              <span className="text-xs font-medium text-[var(--text-muted)]">
                {t('feedbackBadge')}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-heading font-semibold text-[var(--text-primary)] tracking-tight">
              {t('feedbackTitle')}
            </h2>
            <p className="text-[15px] text-[var(--text-secondary)] mt-1.5 max-w-2xl leading-relaxed">
              {t('feedbackSubtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="p-4 rounded-xl bg-[var(--accent-blue-tint)] text-[var(--link-academic)] text-sm flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Check className="w-4 h-4 shrink-0 text-[var(--meta-green)]" />
            <span>{successBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            aria-label={t('mobileCloseSheetBtn')}
            className="w-10 h-10 shrink-0 inline-flex items-center justify-center rounded-lg text-xs opacity-70 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Feedback Form — Soft Surface, Borderless */}
      <form onSubmit={handleSubmit} className="bg-[var(--bg-secondary)] rounded-2xl p-5 sm:p-8 space-y-6">
        {/* Type Selector Pills */}
        <div>
          <label className="block text-[13px] font-semibold text-[var(--text-primary)] mb-2.5">
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
                  className={`min-h-11 flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors cursor-pointer text-left ${
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
          <label className="block text-[13px] font-semibold text-[var(--text-primary)] mb-2">
            {t('feedbackRatingLabel')}
          </label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => {
              const active = (hoverRating ?? rating) >= star;
              return (
                <button
                  key={star}
                  type="button"
                  onPointerEnter={(e) => {
                    if (e.pointerType === 'mouse') setHoverRating(star);
                  }}
                  onPointerLeave={(e) => {
                    if (e.pointerType === 'mouse') setHoverRating(null);
                  }}
                  onClick={() => setRating(star)}
                  className="w-11 h-11 inline-flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-amber-400 transition-colors cursor-pointer"
                  title={t('feedbackRatingOutOf', { star })}
                  aria-label={t('feedbackRatingOutOf', { star })}
                  aria-pressed={rating === star}
                >
                  <Star
                    className={`w-5 h-5 transition-transform hover:scale-110 ${
                      active ? 'fill-amber-400 text-amber-400' : 'text-[var(--text-muted)]'
                    }`}
                  />
                </button>
              );
            })}
            <span className="ml-2 text-[13px] text-[var(--text-muted)] font-medium">
              {rating}/5
            </span>
          </div>
        </div>

        {/* Subject */}
        <div>
          <label className="block text-[13px] font-semibold text-[var(--text-primary)] mb-1.5">
            {t('feedbackSubjectLabel')} <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t('feedbackSubjectPlaceholder')}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-canvas)] text-base md:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--link-academic)]/25"
          />
        </div>

        {/* Message */}
        <div>
          <label className="block text-[13px] font-semibold text-[var(--text-primary)] mb-1.5">
            {t('feedbackMessageLabel')} <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('feedbackMessagePlaceholder')}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-canvas)] text-base md:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--link-academic)]/25 resize-y"
          />
        </div>

        {/* Optional Metadata Row (Institution, Related URL, Email) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1">
              {t('feedbackInstitutionLabel')}
            </label>
            <input
              type="text"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder={t('feedbackInstitutionPlaceholder')}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-canvas)] text-base md:text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--link-academic)]/25"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1">
              {t('feedbackUrlLabel')}
            </label>
            <input
              type="url"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              value={relatedUrl}
              onChange={(e) => setRelatedUrl(e.target.value)}
              placeholder={t('feedbackUrlPlaceholder')}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-canvas)] text-base md:text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--link-academic)]/25"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1">
              {t('feedbackEmailLabel')}
            </label>
            <input
              type="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder={t('feedbackEmailPlaceholder')}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-canvas)] text-base md:text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--link-academic)]/25"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <span className="text-[13px] text-[var(--text-muted)]">
            {t('feedbackFooterHint')}
          </span>
          <button
            type="submit"
            disabled={!subject.trim() || !message.trim() || isSubmitting}
            className={`w-full sm:w-auto min-h-11 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold transition-opacity shrink-0 cursor-pointer ${
              subject.trim() && message.trim() && !isSubmitting
                ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:opacity-90'
                : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] cursor-not-allowed opacity-60'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmitting ? t('feedbackSubmittingBtn') : t('feedbackSubmitBtn')}</span>
          </button>
        </div>
      </form>

      {/* History Section */}
      <div className="space-y-4">
        <h3 className="text-base font-heading font-semibold text-[var(--text-primary)]">
          {t('feedbackHistoryTitle')} ({history.length})
        </h3>

        {history.length === 0 ? (
          <div className="bg-[var(--bg-secondary)] rounded-2xl p-8 text-center text-[13px] text-[var(--text-muted)]">
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
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-[11px] px-2 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-medium">
                        {item.type}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {new Date(item.createdAt).toLocaleDateString(intlLocale(language))}
                      </span>
                      <span className="text-xs text-amber-400">
                        {'★'.repeat(item.rating)}
                      </span>
                    </div>
                    <h4 className="text-[15px] font-semibold text-[var(--text-primary)] break-words">
                      {item.subject}
                    </h4>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyMarkdown(item)}
                      className="min-h-11 md:min-h-0 inline-flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-2 md:px-2.5 md:py-1 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-canvas)] transition-colors cursor-pointer"
                      title={t('feedbackCopyMarkdownTitle')}
                    >
                      {copiedKey === item.id ? (
                        <Check className="w-3.5 h-3.5 text-[var(--meta-green)]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      )}
                      <span>{t('feedbackCopyBtn')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveHistoryItem(item.id)}
                      className="w-11 h-11 md:w-9 md:h-9 inline-flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-rose-500 hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                      title={t('feedbackRemoveHistoryTitle')}
                      aria-label={t('feedbackRemoveHistoryTitle')}
                    >
                      <Trash2 className="w-4 h-4 md:w-3.5 md:h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-[13.5px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap break-words">
                  {item.message}
                </p>

                {(item.institution || item.relatedUrl) && (
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--text-muted)] pt-1">
                    {item.institution && <span>{t('feedbackInstitutionPrefix')} {item.institution}</span>}
                    {(() => {
                      const safeRelatedUrl = sanitizeExternalUrl(item.relatedUrl, {
                        allowImplicitHttps: true,
                      });
                      if (!safeRelatedUrl) return null;
                      return (
                        <a
                          href={safeRelatedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[var(--link-academic)] hover:underline break-all"
                        >
                          <span className="break-all">{item.relatedUrl}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      );
                    })()}
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
            <span className="font-semibold text-[var(--text-primary)]">Cartograph</span>
            <span className="mx-1.5 text-[var(--divider)]">·</span>
            <span className="text-[var(--text-muted)]">
              {t('feedbackFooterNote')}
            </span>
          </div>
        </div>
        <PrismSpectralBar className="h-1 w-24 shrink-0 rounded-full" />
      </div>
    </div>
  );
};

