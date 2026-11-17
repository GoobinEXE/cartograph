import React from 'react';
import ReactDOM from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import AcademicCommandCenter from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { I18nProvider } from './i18n/context';
import { WorkspaceProvider } from './state/workspace';
import { analyticsBeforeSend } from './utils/analytics';
import './index.css';

// WorkspaceProvider sits inside the ErrorBoundary: a crash unmounts it, which flushes pending
// library writes before the recovery screen reads storage for the emergency backup.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider>
      <ErrorBoundary>
        <WorkspaceProvider>
          <AcademicCommandCenter />
        </WorkspaceProvider>
      </ErrorBoundary>
      <Analytics beforeSend={analyticsBeforeSend} />
      <SpeedInsights beforeSend={analyticsBeforeSend} />
    </I18nProvider>
  </React.StrictMode>
);
