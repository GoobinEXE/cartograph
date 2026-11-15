import React from 'react';
import ReactDOM from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import AcademicCommandCenter from './App';
import { I18nProvider } from './i18n/context';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider>
      <AcademicCommandCenter />
      <Analytics />
    </I18nProvider>
  </React.StrictMode>
);
