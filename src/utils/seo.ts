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
  '/prism': 'prism',
  '/about/prism': 'prism',
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
  prism: '/prism',
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
      title: 'Cartograph — Hub de Metabusca Científica & Revisão de Literatura · Prism',
      description:
        'Metabuscador científico e acadêmico com 15 APIs abertas em tempo real, catálogo curado de 111 plataformas, construtor booleano e triagem sistemática PRISMA 2020.',
    },
    federated: {
      title: 'Metabuscador Integrado (15 APIs Abertas) · Cartograph · Prism',
      description:
        'Consulte simultaneamente OpenAlex, Semantic Scholar, PubMed, Europe PMC, arXiv, Crossref, DOAJ, CERN Zenodo, HAL, DataCite, INSPIRE-HEP, Figshare, GBIF, OSTI e NASA.',
    },
    saved: {
      title: 'Biblioteca de Fichamento & Triagem PRISMA 2020 · Cartograph · Prism',
      description:
        'Organize referências em grupos temáticos, aplique critérios de inclusão/exclusão PRISMA 2020, gere diagramas vetoriais SVG e exporte em ABNT, APA 7, BibTeX e CSV.',
    },
    feedback: {
      title: 'Feedback & Sugestão de Plataformas Científicas · Cartograph · Prism',
      description:
        'Envie sugestões de novas bases científicas, reporte melhorias técnicas ou contribua para a evolução do catálogo curado do Cartograph.',
    },
    cartograph: {
      title: 'Sobre o Cartograph — Arquitetura e Metodologia Científica · Prism',
      description:
        'Conheça a engenharia determinística do Cartograph v2.4: deduplicação multicritério Jaro-Winkler, parser de resumos estruturados e reprodutibilidade PRISMA 2020.',
    },
    prism: {
      title: 'Ecossistema Prism (Prism Labs) — Instrumentos Científicos · Cartograph',
      description:
        'Filosofia de engenharia da Prism: softwares científicos determinísticos, arquitetura Local-First, zero alucinação algorítmica e precisão editorial.',
    },
    apis: {
      title: 'Catálogo das 15 APIs Científicas Abertas Federadas · Cartograph · Prism',
      description:
        'Documentação técnica e licenças das 15 APIs públicas consultadas em paralelo pelo Cartograph: OpenAlex, PubMed, Semantic Scholar, arXiv, CERN Zenodo e mais.',
    },
    citation: {
      title: 'Como Citar o Cartograph (ABNT NBR 6023, APA 7 e BibTeX) · Prism',
      description:
        'Formatos oficiais de citação bibliográfica do software Cartograph para artigos científicos, dissertações, teses e revisões sistemáticas de literatura.',
    },
    copyright: {
      title: 'Direitos Autorais, Propriedade Intelectual e Licenças · Cartograph · Prism',
      description:
        'Declaração de titularidade sobre o software Cartograph, marcas da Prism, isenção editorial sobre marcas de terceiros e licenciamento CC0 de metadados.',
    },
    privacy: {
      title: 'Política de Privacidade (LGPD / GDPR) e Termos de Uso · Cartograph · Prism',
      description:
        'Arquitetura Privacy-by-Design em conformidade com a LGPD e GDPR: armazenamento local, proteção de credenciais institucionais CAPES CAFe e termos operacionais.',
    },
    notFound: {
      title: '404 — Coordenada Não Encontrada · Cartograph · Prism',
      description:
        'A rota solicitada não foi encontrada no índice do Cartograph. Retorne ao diretório de 111 plataformas científicas ou ao metabuscador federado.',
    },
  },
  en: {
    platforms: {
      title: 'Cartograph — Scientific Metasearch & Literature Review Hub · Prism',
      description:
        'Scientific and academic metasearch hub featuring 15 live open APIs, 111 curated platforms, Boolean query builder, deduplication, and PRISMA 2020 systematic workflow.',
    },
    federated: {
      title: 'Federated Metasearch (15 Live Open APIs) · Cartograph · Prism',
      description:
        'Query OpenAlex, Semantic Scholar, PubMed, Europe PMC, arXiv, Crossref, DOAJ, CERN Zenodo, HAL, DataCite, INSPIRE-HEP, Figshare, GBIF, OSTI, and NASA in parallel.',
    },
    saved: {
      title: 'Saved Literature & PRISMA 2020 Screening · Cartograph · Prism',
      description:
        'Manage research slots, run PRISMA 2020 systematic screening, generate SVG flow diagrams, and export citations in ABNT, APA 7th, BibTeX, RIS, and CSV.',
    },
    feedback: {
      title: 'Feedback & Scientific Platform Suggestions · Cartograph · Prism',
      description:
        'Submit new academic databases, suggest technical improvements, or report issues to expand the Cartograph scientific catalog.',
    },
    cartograph: {
      title: 'About Cartograph — Architecture & Scientific Methodology · Prism',
      description:
        'Explore the deterministic architecture of Cartograph v2.4: multi-criteria deduplication, structured abstract parsing, and PRISMA 2020 compliance.',
    },
    prism: {
      title: 'Prism Ecosystem (Prism Labs) — Scientific Instruments · Cartograph',
      description:
        'Prism engineering principles: deterministic scientific software, Local-First storage, zero LLM hallucination, and reproducible research workflows.',
    },
    apis: {
      title: '15 Federated Open Scientific APIs Catalog · Cartograph · Prism',
      description:
        'Technical specifications and open licenses of the 15 scientific APIs aggregated by Cartograph: OpenAlex, PubMed, Semantic Scholar, arXiv, CERN Zenodo, and more.',
    },
    citation: {
      title: 'How to Cite Cartograph (APA 7th, ABNT, BibTeX) · Prism',
      description:
        'Official bibliographic citation formats for referencing the Cartograph metasearch hub in peer-reviewed papers, theses, and systematic reviews.',
    },
    copyright: {
      title: 'Copyright, Intellectual Property & Data Licensing · Cartograph · Prism',
      description:
        'Software ownership notice for Cartograph and Prism, third-party trademark disclaimers, and CC0 open metadata licensing terms.',
    },
    privacy: {
      title: 'Privacy Policy (GDPR / LGPD) & Terms of Use · Cartograph · Prism',
      description:
        'Privacy-by-Design compliance with GDPR and LGPD: strictly local browser storage, institutional proxy credential safety, and academic disclaimers.',
    },
    notFound: {
      title: '404 — Coordinate Not Found · Cartograph · Prism',
      description:
        'The requested route was not found in Cartograph. Return to the 111 scientific platforms directory or the 15-API federated metasearch.',
    },
  },
  es: {
    platforms: {
      title: 'Cartograph — Hub de Metabúsqueda Científica y Revisión PRISMA 2020 · Prism',
      description:
        'Metabuscador científico y académico con 15 APIs abiertas en tiempo real, 111 plataformas curadas, constructor booleano y flujo sistemático PRISMA 2020.',
    },
    federated: {
      title: 'Metabuscador Federado (15 APIs Abiertas) · Cartograph · Prism',
      description:
        'Consulte simultáneamente OpenAlex, Semantic Scholar, PubMed, Europe PMC, arXiv, Crossref, DOAJ, CERN Zenodo, HAL, DataCite, INSPIRE-HEP, Figshare, GBIF, OSTI y NASA.',
    },
    saved: {
      title: 'Biblioteca y Cribado Sistemático PRISMA 2020 · Cartograph · Prism',
      description:
        'Organice referencias en grupos, aplique criterios PRISMA 2020, exporte diagramas SVG y genere referencias en ABNT, APA 7, BibTeX y CSV.',
    },
    feedback: {
      title: 'Comentarios y Sugerencias de Plataformas · Cartograph · Prism',
      description:
        'Sugiera nuevas bases de datos científicas o mejoras funcionales para el catálogo académico de Cartograph.',
    },
    cartograph: {
      title: 'Sobre Cartograph — Arquitectura y Metodología Científica · Prism',
      description:
        'Ingeniería determinista de Cartograph v2.4: deduplicación multicriterio, análisis de resúmenes estructurados y reproducibilidad PRISMA 2020.',
    },
    prism: {
      title: 'Ecosistema Prism (Prism Labs) — Instrumentos Científicos · Cartograph',
      description:
        'Principios de ingeniería de Prism: software científico determinista, arquitectura Local-First y precisión bibliográfica.',
    },
    apis: {
      title: 'Catálogo de 15 APIs Científicas Abiertas Federadas · Cartograph · Prism',
      description:
        'Especificaciones técnicas y licencias de las 15 APIs públicas integradas en Cartograph: OpenAlex, PubMed, Semantic Scholar, arXiv, CERN Zenodo y más.',
    },
    citation: {
      title: 'Cómo Citar Cartograph (APA 7, ABNT, BibTeX) · Prism',
      description:
        'Formatos oficiales de citación bibliográfica para referenciar Cartograph en artículos científicos, tesis y revisiones sistemáticas.',
    },
    copyright: {
      title: 'Derechos de Autor y Licencias de Datos · Cartograph · Prism',
      description:
        'Titularidad del software Cartograph y la marca Prism, aviso sobre marcas de terceros y licencias abiertas CC0 de metadatos.',
    },
    privacy: {
      title: 'Política de Privacidad (RGPD / LGPD) y Términos de Uso · Cartograph · Prism',
      description:
        'Privacidad por diseño conforme a RGPD y LGPD: almacenamiento local en el navegador y protección de credenciales institucionales.',
    },
    notFound: {
      title: '404 — Coordenada No Encontrada · Cartograph · Prism',
      description:
        'La ruta solicitada no existe en Cartograph. Regrese al directorio de 111 plataformas científicas o al metabuscador federado.',
    },
  },
  fr: {
    platforms: {
      title: 'Cartograph — Hub de Métarecherche Scientifique & Revue PRISMA 2020 · Prism',
      description:
        'Métamoteur scientifique et académique avec 15 API ouvertes fédérées, 111 plateformes sélectionnées, constructeur booléen et flux systématique PRISMA 2020.',
    },
    federated: {
      title: 'Métamoteur Fédéré (15 API Ouvertes) · Cartograph · Prism',
      description:
        'Interrogez simultanément OpenAlex, Semantic Scholar, PubMed, Europe PMC, arXiv, Crossref, DOAJ, CERN Zenodo, HAL, DataCite, INSPIRE-HEP, Figshare, GBIF, OSTI et NASA.',
    },
    saved: {
      title: 'Bibliothèque & Triage Systématique PRISMA 2020 · Cartograph · Prism',
      description:
        'Organisez vos références par groupes, appliquez le flux PRISMA 2020, générez le diagramme SVG et exportez en APA 7, ABNT, BibTeX et CSV.',
    },
    feedback: {
      title: 'Retours & Suggestions de Plateformes · Cartograph · Prism',
      description:
        'Proposez de nouvelles bases scientifiques ou des améliorations techniques pour enrichir le catalogue Cartograph.',
    },
    cartograph: {
      title: 'À propos de Cartograph — Architecture & Méthodologie · Prism',
      description:
        'Architecture déterministe de Cartograph v2.4 : déduplication multicritère, analyse de résumés structurés et reproductibilité PRISMA 2020.',
    },
    prism: {
      title: 'Écosystème Prism (Prism Labs) — Instruments Scientifiques · Cartograph',
      description:
        "Principes d'ingénierie Prism : logiciels scientifiques déterministes, architecture Local-First et rigueur bibliographique.",
    },
    apis: {
      title: 'Catalogue des 15 API Scientifiques Ouvertes Fédérées · Cartograph · Prism',
      description:
        'Spécifications et licences des 15 API publiques agrégées par Cartograph : OpenAlex, PubMed, Semantic Scholar, arXiv, HAL, CERN Zenodo et plus.',
    },
    citation: {
      title: 'Comment Citer Cartograph (APA 7, ABNT, BibTeX) · Prism',
      description:
        'Formats officiels de citation bibliographique pour référencer Cartograph dans vos articles scientifiques, thèses et revues systématiques.',
    },
    copyright: {
      title: "Droits d'Auteur, Propriété Intellectuelle & Licences · Cartograph · Prism",
      description:
        'Titularité du logiciel Cartograph et de la marque Prism, mentions relatives aux marques tierces et licences CC0 des métadonnées.',
    },
    privacy: {
      title: "Politique de Confidentialité (RGPD / LGPD) & Conditions d'Utilisation · Cartograph",
      description:
        'Confidentialité dès la conception (RGPD / LGPD) : stockage strictement local dans le navigateur et sécurité des accès institutionnels.',
    },
    notFound: {
      title: '404 — Coordonnée Introuvable · Cartograph · Prism',
      description:
        "La route demandée n'existe pas dans Cartograph. Retournez au répertoire des 111 plateformes scientifiques ou au métamoteur fédéré.",
    },
  },
};

const HTML_LANG_MAP: Record<LanguageCode, string> = {
  pt: 'pt-BR',
  en: 'en',
  es: 'es',
  fr: 'fr',
};

const OG_LOCALE_MAP: Record<LanguageCode, string> = {
  pt: 'pt_BR',
  en: 'en_US',
  es: 'es_ES',
  fr: 'fr_FR',
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
