import { useEffect } from 'react';
import type { AboutSectionId } from '../components/AboutView';
import type { LanguageCode } from '../i18n/translations';

export const CANONICAL_ORIGIN = 'https://cartographsearch.com';

export type AppTab = 'platforms' | 'federated' | 'saved' | 'feedback' | 'about';

export interface ParsedRouteState {
  tab: AppTab;
  aboutSection: AboutSectionId;
  isNotFound: boolean;
  canonicalPath: string;
}

const ABOUT_SECTIONS_BY_PATH: Record<string, AboutSectionId> = {
  '/about': 'cartograph',
  '/about/cartograph': 'cartograph',
  '/apis': 'apis',
  '/about/apis': 'apis',
  '/citation': 'citation',
  '/about/citation': 'citation',
  '/copyright': 'copyright',
  '/about/copyright': 'copyright',
  '/privacy': 'privacy',
  '/about/privacy': 'privacy',
};

const CANONICAL_PATH_BY_ABOUT_SECTION: Record<AboutSectionId, string> = {
  cartograph: '/about',
  apis: '/apis',
  citation: '/citation',
  copyright: '/copyright',
  privacy: '/privacy',
};

export function parsePathnameToRoute(pathname: string): ParsedRouteState {
  const normalized =
    pathname.length > 1 && pathname.endsWith('/')
      ? pathname.slice(0, -1).toLowerCase()
      : (pathname || '/').toLowerCase();

  if (normalized === '/' || normalized === '/index.html' || normalized === '/platforms') {
    return {
      tab: 'platforms',
      aboutSection: 'cartograph',
      isNotFound: false,
      canonicalPath: '/',
    };
  }

  if (normalized === '/federated') {
    return {
      tab: 'federated',
      aboutSection: 'cartograph',
      isNotFound: false,
      canonicalPath: '/federated',
    };
  }

  if (normalized === '/saved') {
    return {
      tab: 'saved',
      aboutSection: 'cartograph',
      isNotFound: false,
      canonicalPath: '/saved',
    };
  }

  if (normalized === '/feedback') {
    return {
      tab: 'feedback',
      aboutSection: 'cartograph',
      isNotFound: false,
      canonicalPath: '/feedback',
    };
  }

  const matchedAboutSection = ABOUT_SECTIONS_BY_PATH[normalized];
  if (matchedAboutSection) {
    return {
      tab: 'about',
      aboutSection: matchedAboutSection,
      isNotFound: false,
      canonicalPath: CANONICAL_PATH_BY_ABOUT_SECTION[matchedAboutSection],
    };
  }

  return {
    tab: 'platforms',
    aboutSection: 'cartograph',
    isNotFound: true,
    canonicalPath: normalized,
  };
}

export function buildCanonicalPath(tab: AppTab, aboutSection: AboutSectionId): string {
  switch (tab) {
    case 'platforms':
      return '/';
    case 'federated':
      return '/federated';
    case 'saved':
      return '/saved';
    case 'feedback':
      return '/feedback';
    case 'about':
      return CANONICAL_PATH_BY_ABOUT_SECTION[aboutSection] || '/about';
    default:
      return '/';
  }
}

interface SeoCopyEntry {
  title: string;
  description: string;
}

const SEO_METADATA: Record<
  LanguageCode,
  Record<'platforms' | 'federated' | 'saved' | 'feedback' | AboutSectionId | 'notFound', SeoCopyEntry>
> = {
  pt: {
    platforms: {
      title: 'Cartograph — Hub de Metabusca Científica & Revisão de Literatura',
      description:
        'Metabuscador científico e acadêmico com 15 APIs abertas em tempo real, catálogo curado de 111 plataformas, construtor booleano e triagem sistemática PRISMA 2020.',
    },
    federated: {
      title: 'Metabuscador Integrado (15 APIs Abertas) · Cartograph',
      description:
        'Consulte simultaneamente OpenAlex, Semantic Scholar, PubMed, Europe PMC, arXiv, Crossref, DOAJ, CERN Zenodo, HAL, DataCite, INSPIRE-HEP, Figshare, GBIF, OSTI e NASA.',
    },
    saved: {
      title: 'Biblioteca de Fichamento & Triagem PRISMA 2020 · Cartograph',
      description:
        'Organize referências em grupos temáticos, aplique critérios de inclusão/exclusão PRISMA 2020, gere diagramas vetoriais SVG e exporte em ABNT, APA 7, BibTeX e CSV.',
    },
    feedback: {
      title: 'Feedback & Sugestão de Plataformas Científicas · Cartograph',
      description:
        'Envie sugestões de novas bases científicas, reporte melhorias técnicas ou contribua para a evolução do catálogo curado do Cartograph.',
    },
    cartograph: {
      title: 'Sobre o Cartograph — Arquitetura e Metodologia Científica',
      description:
        'Conheça a engenharia determinística do Cartograph v2.4: deduplicação multicritério Jaro-Winkler, parser de resumos estruturados e reprodutibilidade PRISMA 2020.',
    },
    apis: {
      title: 'Catálogo das 15 APIs Científicas Abertas Federadas · Cartograph',
      description:
        'Documentação técnica e licenças das 15 APIs públicas consultadas em paralelo pelo Cartograph: OpenAlex, PubMed, Semantic Scholar, arXiv, CERN Zenodo e mais.',
    },
    citation: {
      title: 'Como Citar o Cartograph (ABNT NBR 6023, APA 7 e BibTeX)',
      description:
        'Formatos oficiais de citação bibliográfica do software Cartograph para artigos científicos, dissertações, teses e revisões sistemáticas de literatura.',
    },
    copyright: {
      title: 'Direitos Autorais, Propriedade Intelectual e Licenças · Cartograph',
      description:
        'Declaração de titularidade sobre o software Cartograph, isenção editorial sobre marcas de terceiros e licenciamento CC0 de metadados.',
    },
    privacy: {
      title: 'Política de Privacidade (LGPD / GDPR) e Termos de Uso · Cartograph',
      description:
        'Arquitetura Privacy-by-Design em conformidade com a LGPD e GDPR: armazenamento local, proteção de credenciais institucionais CAPES CAFe e termos operacionais.',
    },
    notFound: {
      title: '404 — Coordenada Não Encontrada · Cartograph',
      description:
        'A rota solicitada não foi encontrada no índice do Cartograph. Retorne ao diretório de 111 plataformas científicas ou ao metabuscador federado.',
    },
  },
  en: {
    platforms: {
      title: 'Cartograph — Scientific Metasearch & Literature Review Hub',
      description:
        'Scientific and academic metasearch hub featuring 15 live open APIs, 111 curated platforms, Boolean query builder, deduplication, and PRISMA 2020 systematic workflow.',
    },
    federated: {
      title: 'Federated Metasearch (15 Live Open APIs) · Cartograph',
      description:
        'Query OpenAlex, Semantic Scholar, PubMed, Europe PMC, arXiv, Crossref, DOAJ, CERN Zenodo, HAL, DataCite, INSPIRE-HEP, Figshare, GBIF, OSTI, and NASA in parallel.',
    },
    saved: {
      title: 'Saved Literature & PRISMA 2020 Screening · Cartograph',
      description:
        'Manage research slots, run PRISMA 2020 systematic screening, generate SVG flow diagrams, and export citations in ABNT, APA 7th, BibTeX, RIS, and CSV.',
    },
    feedback: {
      title: 'Feedback & Scientific Platform Suggestions · Cartograph',
      description:
        'Submit new academic databases, suggest technical improvements, or report issues to expand the Cartograph scientific catalog.',
    },
    cartograph: {
      title: 'About Cartograph — Architecture & Scientific Methodology',
      description:
        'Explore the deterministic architecture of Cartograph v2.4: multi-criteria deduplication, structured abstract parsing, and PRISMA 2020 compliance.',
    },
    apis: {
      title: '15 Federated Open Scientific APIs Catalog · Cartograph',
      description:
        'Technical specifications and open licenses of the 15 scientific APIs aggregated by Cartograph: OpenAlex, PubMed, Semantic Scholar, arXiv, CERN Zenodo, and more.',
    },
    citation: {
      title: 'How to Cite Cartograph (APA 7th, ABNT, BibTeX)',
      description:
        'Official bibliographic citation formats for referencing the Cartograph metasearch hub in peer-reviewed papers, theses, and systematic reviews.',
    },
    copyright: {
      title: 'Copyright, Intellectual Property & Data Licensing · Cartograph',
      description:
        'Software ownership notice for Cartograph, third-party trademark disclaimers, and CC0 open metadata licensing terms.',
    },
    privacy: {
      title: 'Privacy Policy (GDPR / LGPD) & Terms of Use · Cartograph',
      description:
        'Privacy-by-Design compliance with GDPR and LGPD: strictly local browser storage, institutional proxy credential safety, and academic disclaimers.',
    },
    notFound: {
      title: '404 — Coordinate Not Found · Cartograph',
      description:
        'The requested route was not found in Cartograph. Return to the 111 scientific platforms directory or the 15-API federated metasearch.',
    },
  },
};

const HTML_LANG_MAP: Record<LanguageCode, string> = {
  pt: 'pt-BR',
  en: 'en',
};

const OG_LOCALE_MAP: Record<LanguageCode, string> = {
  pt: 'pt_BR',
  en: 'en_US',
};

function setMetaContent(selector: string, content: string): void {
  const el = document.querySelector<HTMLMetaElement>(selector);
  if (el) {
    el.setAttribute('content', content);
  }
}

export function useSeoMeta(params: {
  activeTab: AppTab;
  aboutSection: AboutSectionId;
  language: LanguageCode;
  isNotFound: boolean;
}): void {
  const { activeTab, aboutSection, language, isNotFound } = params;

  useEffect(() => {
    const langBundle = SEO_METADATA[language] || SEO_METADATA.pt;
    const key = isNotFound
      ? 'notFound'
      : activeTab === 'about'
      ? aboutSection
      : activeTab;
    const meta = langBundle[key] || langBundle.platforms;

    const canonicalPath = isNotFound
      ? window.location.pathname
      : buildCanonicalPath(activeTab, aboutSection);
    const canonicalUrl = `${CANONICAL_ORIGIN}${canonicalPath === '/' ? '/' : canonicalPath}`;

    document.title = meta.title;
    document.documentElement.lang = HTML_LANG_MAP[language] || 'pt-BR';

    setMetaContent('meta[name="description"]', meta.description);
    setMetaContent('meta[property="og:title"]', meta.title);
    setMetaContent('meta[property="og:description"]', meta.description);
    setMetaContent('meta[property="og:url"]', canonicalUrl);
    setMetaContent('meta[property="og:locale"]', OG_LOCALE_MAP[language] || 'pt_BR');
    setMetaContent('meta[name="twitter:title"]', meta.title);
    setMetaContent('meta[name="twitter:description"]', meta.description);
    setMetaContent(
      'meta[name="robots"]',
      isNotFound
        ? 'noindex, nofollow'
        : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
    );

    const canonicalLink = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonicalLink) {
      canonicalLink.setAttribute('href', canonicalUrl);
    }
  }, [activeTab, aboutSection, language, isNotFound]);
}
