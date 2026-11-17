import React, { useState } from 'react';
import { PrismMonogram, PrismSpectralBar } from './PrismLogo';
import { PLATFORMS } from '../data/platforms';
import {
  API_SOURCE_REGISTRY,
  BYOK_FEDERATED_SOURCE_COUNT,
  OPEN_FEDERATED_SOURCE_COUNT,
  TOTAL_FEDERATED_SOURCE_COUNT,
} from '../data/apiSources';
import { API_SOURCE_DOCS } from '../data/apiSourceDocs';
import { localize } from '../i18n/localized';
import { useI18n } from '../i18n/context';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  Copy,
  Database,
  FileText,
  Lock,
  Scale,
} from 'lucide-react';

export type AboutSectionId =
  | 'cartograph'
  | 'apis'
  | 'citation'
  | 'copyright'
  | 'privacy';

interface AboutViewProps {
  activeSection?: AboutSectionId;
  onSelectSection?: (section: AboutSectionId) => void;
  onNavigateTab?: (tab: 'platforms' | 'federated' | 'saved' | 'feedback' | 'about') => void;
}

export const AboutView: React.FC<AboutViewProps> = ({
  activeSection: controlledSection,
  onSelectSection,
  onNavigateTab,
}) => {
  const { language } = useI18n();
  const isEn = language === 'en';
  const [internalSection, setInternalSection] = useState<AboutSectionId>('cartograph');
  const [copiedCitation, setCopiedCitation] = useState<'abnt' | 'apa' | 'bibtex' | null>(null);

  const currentSection = controlledSection ?? internalSection;
  const currentYear = new Date().getFullYear();

  const citationFormats = {
    abnt: `CARTOGRAPH. Cartograph: Hub de Metabusca Científica, Tecnológica e Revisão Sistemática PRISMA 2020 (Versão 2.4). [Programa de computador]. 2026. Disponível em: https://cartographsearch.com. Acesso em: ${new Date().toLocaleDateString(isEn ? 'en-US' : 'pt-BR')}.`,
    apa: `Cartograph. (2026). Cartograph: Scientific Metasearch Hub & PRISMA 2020 Systematic Review Workstation (Version 2.4) [Computer software]. https://cartographsearch.com`,
    bibtex: `@software{cartograph_2026,
  author       = {{Cartograph}},
  title        = {{Cartograph: Scientific Metasearch Hub and PRISMA 2020 Systematic Review Workstation}},
  year         = {2026},
  version      = {2.4.0},
  url          = {https://cartographsearch.com},
  note         = {Federated metasearch across ${OPEN_FEDERATED_SOURCE_COUNT} open scientific APIs, ${BYOK_FEDERATED_SOURCE_COUNT} researcher-key APIs, and ${PLATFORMS.length} curated academic platforms}
}`,
  };

  const sectionsMeta: {
    id: AboutSectionId;
    label: string;
    shortDesc: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    {
      id: 'cartograph',
      label: isEn ? 'About Cartograph' : 'Sobre o Cartograph',
      shortDesc: isEn
        ? 'Architecture, deduplication, and PRISMA 2020'
        : 'Arquitetura, deduplicação e PRISMA 2020',
      icon: BookOpen,
    },
    {
      id: 'apis',
      label: isEn
        ? `${TOTAL_FEDERATED_SOURCE_COUNT} Federated APIs`
        : `${TOTAL_FEDERATED_SOURCE_COUNT} APIs Federadas`,
      shortDesc: isEn
        ? 'Real-time open source specifications'
        : 'Especificação das fontes em tempo real',
      icon: Database,
    },
    {
      id: 'citation',
      label: isEn ? 'How to Cite' : 'Como Citar',
      shortDesc: isEn
        ? 'ABNT NBR 6023, APA 7th Ed., and BibTeX'
        : 'ABNT NBR 6023, APA 7ª Ed. e BibTeX',
      icon: FileText,
    },
    {
      id: 'copyright',
      label: isEn ? 'Copyright & Licenses' : 'Direitos Autorais & Licenças',
      shortDesc: isEn
        ? 'Software copyright, third-party marks, and CC0'
        : 'Copyright, marcas de terceiros e CC0',
      icon: Scale,
    },
    {
      id: 'privacy',
      label: isEn ? 'Privacy (LGPD / GDPR) & Terms' : 'Privacidade (LGPD) & Termos',
      shortDesc: isEn
        ? 'Local-First data protection and terms of use'
        : 'Proteção de dados Local-First e termos de uso',
      icon: Lock,
    },
  ];

  const handleSelectSection = (sec: AboutSectionId) => {
    if (onSelectSection) {
      onSelectSection(sec);
    } else {
      setInternalSection(sec);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentIndex = sectionsMeta.findIndex((s) => s.id === currentSection);
  const prevSection = currentIndex > 0 ? sectionsMeta[currentIndex - 1] : null;
  const nextSection =
    currentIndex < sectionsMeta.length - 1 ? sectionsMeta[currentIndex + 1] : null;

  const handleCopyCitation = async (format: 'abnt' | 'apa' | 'bibtex') => {
    try {
      await navigator.clipboard.writeText(citationFormats[format]);
      setCopiedCitation(format);
      setTimeout(() => setCopiedCitation(null), 2200);
    } catch {
      // ignore clipboard restriction
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr] gap-8 xl:gap-12 items-start pb-16">
      {/* LEFT SIDEBAR: DOCUMENT NAVIGATION & TECHNICAL SPEC */}
      <aside
        className="space-y-6 lg:sticky lg:top-24"
        aria-label={
          isEn
            ? 'Institutional navigation and legal documentation'
            : 'Navegação institucional e documentação legal'
        }
      >
        {/* 1. Primary Documentation Navigation (Top priority) */}
        <nav
          className="space-y-1"
          aria-label={isEn ? 'About page sections' : 'Seções da página Sobre'}
        >
          <div className="px-3 pb-2 text-xs font-semibold text-[var(--text-muted)]">
            {isEn ? 'Documentation Contents' : 'Sumário da Documentação'}
          </div>
          {sectionsMeta.map((sec) => {
            const Icon = sec.icon;
            const isActive = currentSection === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => handleSelectSection(sec.id)}
                className={`w-full flex items-start gap-3 px-3.5 py-3 rounded-xl text-left transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[var(--accent-blue-tint)] text-[var(--link-academic)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold leading-snug">{sec.label}</div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
                    {sec.shortDesc}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* 2. Technical Specifications & Quick Actions */}
        <div className="border-t border-[var(--divider)] pt-5 px-2 space-y-3 text-sm">
          <div className="text-xs font-semibold text-[var(--text-muted)]">
            {isEn ? 'Technical Specifications' : 'Ficha Técnica'}
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--text-muted)]">
                {isEn ? 'Curated Platforms' : 'Plataformas Curadas'}
              </dt>
              <dd className="font-medium text-[var(--text-primary)]">
                {PLATFORMS.length} {isEn ? 'portals' : 'portais'}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--text-muted)]">
                {isEn ? 'Real-Time APIs' : 'APIs em Tempo Real'}
              </dt>
              <dd className="font-medium text-[var(--text-primary)]">
                {isEn
                  ? `${OPEN_FEDERATED_SOURCE_COUNT} open + ${BYOK_FEDERATED_SOURCE_COUNT} with your key`
                  : `${OPEN_FEDERATED_SOURCE_COUNT} abertas + ${BYOK_FEDERATED_SOURCE_COUNT} com chave própria`}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--text-muted)]">
                {isEn ? 'Screening Guideline' : 'Diretriz de Triagem'}
              </dt>
              <dd className="font-medium text-[var(--meta-green)]">PRISMA 2020</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--text-muted)]">
                {isEn ? 'Data Persistence' : 'Persistência de Dados'}
              </dt>
              <dd className="font-medium text-[var(--text-primary)]">Local-First</dd>
            </div>
          </dl>

          {onNavigateTab && (
            <div className="pt-3 space-y-1.5">
              <button
                type="button"
                onClick={() => onNavigateTab('platforms')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-subtle)] text-xs font-medium text-[var(--link-academic)] transition-colors cursor-pointer"
              >
                <span>{isEn ? 'Go to Platforms Directory' : 'Ir para o Diretório de Bases'}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('feedback')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-subtle)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <span>{isEn ? 'Submit Suggestion or Report' : 'Enviar Sugestão ou Relato'}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* 3. Institutional Summary Card (Context footer) */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <PrismMonogram className="h-7 w-auto shrink-0" />
            <div>
              <div className="text-base font-heading font-semibold text-[var(--text-primary)] leading-tight">
                Cartograph
              </div>
              <div className="text-xs text-[var(--text-muted)]">
                {isEn ? 'Version 2.4' : 'Versão 2.4'}
              </div>
            </div>
          </div>

          <PrismSpectralBar className="h-[2px] w-full opacity-85" />

          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {isEn
              ? 'Technical documentation, methodological guidelines, and legal terms.'
              : 'Documentação técnica, diretrizes metodológicas e termos legais do sistema.'}
          </p>
        </div>
      </aside>

      {/* RIGHT CONTENT COLUMN */}
      <div className="min-w-0 bg-[var(--bg-secondary)]/50 rounded-2xl p-6 sm:p-10 lg:p-12 border border-[var(--divider)]">
        {/* SECTION 1: ABOUT CARTOGRAPH */}
        {currentSection === 'cartograph' && (
          <article className="space-y-8 max-w-4xl">
            <header className="border-b border-[var(--divider)] pb-6 space-y-3">
              <div className="text-sm font-medium text-[var(--link-academic)]">
                {isEn
                  ? 'Architecture and Scientific Methodology'
                  : 'Arquitetura e Metodologia Científica'}
              </div>
              <div className="flex items-center gap-3.5">
                <PrismMonogram className="h-9 w-auto shrink-0" />
                <h1 className="text-2xl sm:text-3xl font-heading font-bold text-[var(--text-primary)]">
                  {isEn ? 'About Cartograph' : 'Sobre o Cartograph'}
                </h1>
              </div>
              <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed pt-1">
                {isEn ? (
                  <>
                    <strong>Cartograph</strong> is a scientific, technical, and academic metasearch hub designed for researchers, faculty, graduate students, and systematic review teams.
                  </>
                ) : (
                  <>
                    O <strong>Cartograph</strong> é um hub de metabusca científica, tecnológica e acadêmica projetado para pesquisadores, docentes, pós-graduandos e equipes de revisão sistemática de literatura.
                  </>
                )}
              </p>
            </header>

            <div className="space-y-6 text-base text-[var(--text-primary)] leading-relaxed">
              <p className="text-[var(--text-secondary)]">
                {isEn ? (
                  <>
                    Contemporary scientific output is distributed across institutional repositories, government archives, preprint servers, and commercial publishers. Cartograph unifies bibliographic discovery in one command interface, combining <strong>direct federated search across {OPEN_FEDERATED_SOURCE_COUNT} open APIs</strong> with a <strong>curated directory of {PLATFORMS.length} specialized platforms</strong>.
                  </>
                ) : (
                  <>
                    A produção científica contemporânea encontra-se distribuída em centenas de repositórios institucionais, bases governamentais, servidores de preprints e editoras comerciais. O Cartograph unifica a descoberta bibliográfica em uma interface de comando única, combinando <strong>consulta federada direta em {OPEN_FEDERATED_SOURCE_COUNT} APIs abertas</strong> com um <strong>catálogo estruturado de {PLATFORMS.length} plataformas especializadas</strong>.
                  </>
                )}
              </p>

              <h2 className="text-xl font-heading font-semibold text-[var(--text-primary)] pt-2">
                {isEn ? 'Technical and Operational Architecture' : 'Pilares Técnicos e Operacionais'}
              </h2>

              <div className="divide-y divide-[var(--divider)] border-y border-[var(--divider)]">
                <div className="py-5 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4">
                  <div className="font-semibold text-base text-[var(--text-primary)]">
                    {isEn
                      ? `Federated Search Across ${OPEN_FEDERATED_SOURCE_COUNT} Open APIs`
                      : `Metabusca Federada em ${OPEN_FEDERATED_SOURCE_COUNT} APIs Abertas`}
                  </div>
                  <div className="text-base text-[var(--text-secondary)] leading-relaxed">
                    {isEn
                      ? `Parallel asynchronous querying of ${OPEN_FEDERATED_SOURCE_COUNT} open sources: general indexes (OpenAlex, Semantic Scholar, Crossref, OpenAIRE), biomedicine (PubMed/MEDLINE, Europe PMC, PLOS), preprints (arXiv, OSF, SocArXiv), repositories and datasets (CERN Zenodo, HAL, CORE, DataCite, Figshare, Harvard Dataverse), and economics and public policy (World Bank, Ipea, UN Digital Library, Oasisbr). With your own keys, ${BYOK_FEDERATED_SOURCE_COUNT} more sources join the search, among them Scopus, IEEE Xplore, and Springer Nature. If one source responds slowly or hits a rate limit, the others keep returning results.`
                      : `Consulta assíncrona paralela em ${OPEN_FEDERATED_SOURCE_COUNT} fontes abertas: índices gerais (OpenAlex, Semantic Scholar, Crossref, OpenAIRE), biomedicina (PubMed/MEDLINE, Europe PMC, PLOS), preprints (arXiv, OSF, SocArXiv), repositórios e dados (CERN Zenodo, HAL, CORE, DataCite, Figshare, Harvard Dataverse) e economia e políticas públicas (Banco Mundial, Ipea, UN Digital Library, Oasisbr). Com chaves próprias, mais ${BYOK_FEDERATED_SOURCE_COUNT} fontes entram na busca, entre elas Scopus, IEEE Xplore e Springer Nature. Se uma base responder devagar ou atingir o limite de requisições, as demais continuam retornando resultados.`}
                  </div>
                </div>

                <div className="py-5 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4">
                  <div className="font-semibold text-base text-[var(--text-primary)]">
                    {isEn ? '3-Level Deterministic Deduplication' : 'Deduplicação Determinística em 3 Níveis'}
                  </div>
                  <div className="text-base text-[var(--text-secondary)] leading-relaxed">
                    {isEn
                      ? 'When the same study returns from multiple APIs, the deduplication engine executes three sequential checks: canonical DOI normalization, exact identifier matching (PMID and arXiv ID), and Jaro-Winkler combined with Levenshtein title similarity (threshold ≥ 0.92). Collapsed records merge metadata, preserving the highest citation count and direct open PDF links.'
                      : 'Quando o mesmo estudo retorna de múltiplas APIs, o motor de deduplicação executa três verificações sequenciais: normalização canônica de DOI, cruzamento exato de identificadores (PMID e arXiv ID) e cálculo de similaridade textual Jaro-Winkler combinada à distância de Levenshtein (limiar ≥ 0,92). Os registros colapsados têm seus metadados fundidos, preservando a maior contagem de citações e o link direto de PDF aberto.'}
                  </div>
                </div>

                <div className="py-5 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4">
                  <div className="font-semibold text-base text-[var(--text-primary)]">
                    {isEn ? 'PRISMA 2020 Systematic Flow' : 'Fluxo Sistemático PRISMA 2020'}
                  </div>
                  <div className="text-base text-[var(--text-secondary)] leading-relaxed">
                    {isEn ? (
                      <>
                        The built-in library structures screening according to the international <strong>PRISMA 2020</strong> guideline (<em>Preferred Reporting Items for Systematic Reviews and Meta-Analyses</em>). Researchers organize studies into isolated research groups (or ungrouped), log inclusion/exclusion decisions with standardized reasons, and automatically generate the vector SVG flow diagram and publication-ready methods paragraph.
                      </>
                    ) : (
                      <>
                        A biblioteca integrada estrutura a triagem segundo a diretriz internacional <strong>PRISMA 2020</strong> (<em>Preferred Reporting Items for Systematic Reviews and Meta-Analyses</em>). O pesquisador organiza seus estudos em diferentes grupos de pesquisa (ou sem grupo), registra decisões de inclusão ou exclusão com justificativa padronizada e gera automaticamente o diagrama oficial de fluxo em formato vetorial SVG e o parágrafo metodológico pronto para publicação.
                      </>
                    )}
                  </div>
                </div>

                <div className="py-5 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4">
                  <div className="font-semibold text-base text-[var(--text-primary)]">
                    {isEn ? 'Zero-Hallucination Method Extraction' : 'Extração Metodológica Zero-Alucinação'}
                  </div>
                  <div className="text-base text-[var(--text-secondary)] leading-relaxed">
                    {isEn ? (
                      <>
                        Cartograph runs deterministically without generative language models rewriting or fabricating bibliographic data. The abstract parser applies regular expressions and controlled vocabulary to surface Objective, Methods, Sample Size (<em>N</em>), Study Design, and Conclusions directly from author abstracts.
                      </>
                    ) : (
                      <>
                        O Cartograph não utiliza modelos de linguagem generativos para reescrever ou inventar dados bibliográficos. O parser de resumos opera por expressões regulares e vocabulário controlado para destacar Objetivo, Métodos, Tamanho Amostral (<em>N</em>), Desenho de Estudo e Conclusões diretamente do texto original dos autores.
                      </>
                    )}
                  </div>
                </div>

                <div className="py-5 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4">
                  <div className="font-semibold text-base text-[var(--text-primary)]">
                    {isEn ? 'Batch Tab Launch & Institutional Access' : 'Abertura Multi-Abas e Sessões Institucionais'}
                  </div>
                  <div className="text-base text-[var(--text-secondary)] leading-relaxed">
                    {isEn
                      ? `In the directory of ${PLATFORMS.length} sources, researchers compile a Boolean query once and dispatch it across selected portals in one batch, reusing active university authentication (such as university EZProxy, Shibboleth, or CAPES CAFe) and browser reference managers such as Zotero Connector.`
                      : `No diretório de ${PLATFORMS.length} bases, o pesquisador compila sua expressão booleana uma única vez e dispara a busca simultaneamente nos portais selecionados, aproveitando sua sessão institucional ativa (como Portal de Periódicos CAPES/CAFe ou proxy universitário) e extensões de coleta como o Zotero Connector.`}
                  </div>
                </div>
              </div>
            </div>
          </article>
        )}

        {/* SECTION 2: FEDERATED SCIENTIFIC APIS (generated from API_SOURCE_REGISTRY) */}
        {currentSection === 'apis' && (
          <article className="space-y-8">
            <header className="border-b border-[var(--divider)] pb-6 space-y-3">
              <div className="text-sm font-medium text-[var(--link-academic)]">
                {isEn ? 'Real-Time Data Sources' : 'Fontes de Dados em Tempo Real'}
              </div>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold text-[var(--text-primary)]">
                {isEn
                  ? `${TOTAL_FEDERATED_SOURCE_COUNT} Federated Scientific and Technical APIs`
                  : `${TOTAL_FEDERATED_SOURCE_COUNT} APIs Científicas e Tecnológicas Federadas`}
              </h1>
              <p className="text-base text-[var(--text-secondary)] leading-relaxed max-w-3xl">
                {isEn
                  ? `Complete list of the REST/XML programming interfaces queried in parallel by the Cartograph aggregation engine. ${OPEN_FEDERATED_SOURCE_COUNT} run without any key; the ${BYOK_FEDERATED_SOURCE_COUNT} marked BYOK run only with a key you configure in Access Settings.`
                  : `Relação completa das interfaces de programação (APIs REST/XML) consultadas em paralelo pelo motor de agregação do Cartograph. ${OPEN_FEDERATED_SOURCE_COUNT} funcionam sem chave; as ${BYOK_FEDERATED_SOURCE_COUNT} marcadas como BYOK só rodam com uma chave sua, configurada em Acesso Institucional & Chaves de API.`}
              </p>
            </header>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-[var(--divider)] text-xs font-semibold text-[var(--text-muted)]">
                    <th className="py-3.5 pr-4 w-10">#</th>
                    <th className="py-3.5 px-4 min-w-[200px]">{isEn ? 'API / Source' : 'API / Fonte'}</th>
                    <th className="py-3.5 px-4 min-w-[180px]">{isEn ? 'Maintaining Organization' : 'Instituição Mantenedora'}</th>
                    <th className="py-3.5 px-4 min-w-[170px]">{isEn ? 'Metadata License' : 'Licença de Metadados'}</th>
                    <th className="py-3.5 pl-4">{isEn ? 'Scientific Scope & Coverage' : 'Escopo e Cobertura Científica'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--divider)] text-sm sm:text-base">
                  {Object.values(API_SOURCE_REGISTRY).map((meta, idx) => {
                    const doc = API_SOURCE_DOCS[meta.id];
                    return (
                      <tr key={meta.id} className="hover:bg-[var(--bg-subtle)]/40 transition-colors">
                        <td className="py-4 pr-4 text-sm text-[var(--text-muted)] align-top font-mono tabular-nums">
                          {idx + 1}.
                        </td>
                        <td className="py-4 px-4 font-semibold text-[var(--text-primary)] align-top">
                          <span>{doc.apiName}</span>
                          {meta.requiresByok && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-mono font-medium bg-[var(--accent-blue-tint)] text-[var(--link-academic)] align-middle">
                              BYOK
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-[var(--meta-green)] font-medium align-top">
                          {doc.organization}
                        </td>
                        <td className="py-4 px-4 text-sm text-[var(--text-secondary)] align-top">
                          {localize(doc.license, language)}
                        </td>
                        <td className="py-4 pl-4 text-[var(--text-secondary)] leading-relaxed align-top">
                          {localize(doc.scope, language)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </article>
        )}

        {/* SECTION 3: HOW TO CITE */}
        {currentSection === 'citation' && (
          <article className="space-y-8 max-w-4xl">
            <header className="border-b border-[var(--divider)] pb-6 space-y-3">
              <div className="text-sm font-medium text-[var(--link-academic)]">
                {isEn ? 'Methodological Reference' : 'Referência Metodológica'}
              </div>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold text-[var(--text-primary)]">
                {isEn
                  ? 'How to Cite Cartograph in Academic Work'
                  : 'Como Citar o Cartograph em Trabalhos Acadêmicos'}
              </h1>
              <p className="text-base text-[var(--text-secondary)] leading-relaxed">
                {isEn
                  ? 'Researchers using federated metasearch, multi-criteria deduplication, or the PRISMA 2020 flowchart generator in manuscripts, dissertations, or theses may use the reference formats below.'
                  : 'Pesquisadores que utilizem a busca federada, o algoritmo de deduplicação multicritério ou o gerador de fluxograma PRISMA 2020 do Cartograph na seção de metodologia de artigos, dissertações ou teses podem utilizar os formatos normativos abaixo.'}
              </p>
            </header>

            <div className="space-y-6">
              {/* ABNT */}
              <div className="bg-[var(--bg-canvas)] rounded-xl p-6 border border-[var(--divider)] space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-[var(--text-primary)]">
                      {isEn ? 'ABNT Standard (NBR 6023:2018)' : 'Padrão ABNT (NBR 6023:2018)'}
                    </h2>
                    <p className="text-sm text-[var(--text-muted)]">
                      {isEn
                        ? 'Recommended for Brazilian theses, dissertations, and Portuguese-language journals.'
                        : 'Recomendado para teses, dissertações, TCCs e periódicos brasileiros.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyCitation('abnt')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--link-academic)] transition-colors cursor-pointer shrink-0"
                  >
                    {copiedCitation === 'abnt' ? (
                      <Check className="w-3.5 h-3.5 text-[var(--meta-green)]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {copiedCitation === 'abnt'
                        ? isEn ? 'Copied' : 'Copiado'
                        : isEn ? 'Copy ABNT' : 'Copiar ABNT'}
                    </span>
                  </button>
                </div>
                <div className="p-4 rounded-lg bg-[var(--bg-secondary)] text-base text-[var(--text-primary)] leading-relaxed break-words">
                  {citationFormats.abnt}
                </div>
              </div>

              {/* APA 7 */}
              <div className="bg-[var(--bg-canvas)] rounded-xl p-6 border border-[var(--divider)] space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-[var(--text-primary)]">
                      {isEn ? 'APA Style (7th Edition)' : 'Padrão APA (7ª Edição)'}
                    </h2>
                    <p className="text-sm text-[var(--text-muted)]">
                      {isEn
                        ? 'Recommended for international journals, psychology, social sciences, and health sciences.'
                        : 'Recomendado para periódicos internacionais, psicologia, ciências sociais e saúde.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyCitation('apa')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--link-academic)] transition-colors cursor-pointer shrink-0"
                  >
                    {copiedCitation === 'apa' ? (
                      <Check className="w-3.5 h-3.5 text-[var(--meta-green)]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {copiedCitation === 'apa'
                        ? isEn ? 'Copied' : 'Copiado'
                        : isEn ? 'Copy APA' : 'Copiar APA'}
                    </span>
                  </button>
                </div>
                <div className="p-4 rounded-lg bg-[var(--bg-secondary)] text-base text-[var(--text-primary)] leading-relaxed break-words">
                  {citationFormats.apa}
                </div>
              </div>

              {/* BibTeX */}
              <div className="bg-[var(--bg-canvas)] rounded-xl p-6 border border-[var(--divider)] space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-[var(--text-primary)]">
                      {isEn
                        ? 'BibTeX Entry (LaTeX / Overleaf / Zotero)'
                        : 'Entrada BibTeX (LaTeX / Overleaf / Zotero)'}
                    </h2>
                    <p className="text-sm text-[var(--text-muted)]">
                      {isEn ? (
                        <>
                          Ready for direct inclusion in <code>.bib</code> files.
                        </>
                      ) : (
                        <>
                          Pronto para inclusão direta em arquivos <code>.bib</code>.
                        </>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyCitation('bibtex')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--link-academic)] transition-colors cursor-pointer shrink-0"
                  >
                    {copiedCitation === 'bibtex' ? (
                      <Check className="w-3.5 h-3.5 text-[var(--meta-green)]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {copiedCitation === 'bibtex'
                        ? isEn ? 'Copied' : 'Copiado'
                        : isEn ? 'Copy BibTeX' : 'Copiar BibTeX'}
                    </span>
                  </button>
                </div>
                <pre className="p-4 rounded-lg bg-[var(--bg-secondary)] text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed overflow-x-auto whitespace-pre-wrap">
                  {citationFormats.bibtex}
                </pre>
              </div>
            </div>
          </article>
        )}

        {/* SECTION 4: COPYRIGHT & LICENSES */}
        {currentSection === 'copyright' && (
          <article className="space-y-8 max-w-4xl">
            <header className="border-b border-[var(--divider)] pb-6 space-y-3">
              <div className="text-sm font-medium text-[var(--link-academic)]">
                {isEn ? 'Intellectual Property and Copyright' : 'Propriedade Intelectual e Direitos Autorais'}
              </div>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold text-[var(--text-primary)]">
                {isEn
                  ? 'Copyright and Data Licensing'
                  : 'Direitos Autorais (Copyright) e Licenciamento de Dados'}
              </h1>
              <p className="text-base text-[var(--text-secondary)] leading-relaxed">
                {isEn
                  ? 'Ownership statement for the Cartograph software, third-party trademarks, and scholarly metadata licensing terms.'
                  : 'Declaração de titularidade sobre o software Cartograph, marcas de terceiros e regime jurídico dos metadados científicos.'}
              </p>
            </header>

            <div className="space-y-8 text-base text-[var(--text-secondary)] leading-relaxed">
              <section className="space-y-3">
                <h2 className="text-xl font-heading font-semibold text-[var(--text-primary)]">
                  {isEn ? '1. Ownership of the Cartograph Software' : '1. Titularidade do Software Cartograph'}
                </h2>
                <p className="font-medium text-[var(--text-primary)]">
                  {isEn
                    ? `© ${currentYear} Cartograph. All rights reserved.`
                    : `© ${currentYear} Cartograph. Todos os direitos reservados.`}
                </p>
                <p>
                  {isEn ? (
                    <>
                      The brand, the prism magnifying glass mark, and the <strong>Cartograph</strong> system (comprising its source code, graphical user interface, multi-criteria deduplication engine, deterministic structured abstract parser, PRISMA 2020 vector generators, citation exporters, and curated platform taxonomy) are protected by intellectual property laws.
                    </>
                  ) : (
                    <>
                      A marca, o logotipo da lupa cartográfica e o sistema <strong>Cartograph</strong> (compreendendo seu código-fonte, projeto de interface gráfica, motor de deduplicação multicritério, parser determinístico de resumos estruturados, geradores vetoriais PRISMA 2020, compiladores bibliográficos e taxonomia curada de plataformas) são protegidos por direitos de propriedade intelectual.
                    </>
                  )}
                </p>
                <p>
                  {isEn
                    ? 'These assets are protected under Brazilian Intellectual Property legislation (Software Law No. 9.609/1998 and Copyright Law No. 9.610/1998) and applicable international treaties (Berne Convention and TRIPS Agreement). Unauthorized commercial reproduction or redistribution as a standalone service is prohibited.'
                    : 'Estes ativos são amparados pela legislação brasileira de Propriedade Intelectual, Lei do Software (Lei nº 9.609/1998), Lei de Direitos Autorais (Lei nº 9.610/1998) e pelos tratados internacionais aplicáveis (Convenção de Berna e Acordo TRIPS). É vedada a reprodução comercial não autorizada ou redistribuição como serviço próprio.'}
                </p>
              </section>

              <section className="space-y-3 border-t border-[var(--divider)] pt-6">
                <h2 className="text-xl font-heading font-semibold text-[var(--text-primary)]">
                  {isEn
                    ? '2. Third-Party Trademarks and Editorial Independence'
                    : '2. Marcas de Terceiros e Isenção de Afiliação Editorial'}
                </h2>
                <p>
                  {isEn ? (
                    <>
                      All database, journal, publisher, citation index, and institutional repository names listed in the {PLATFORMS.length}-platform directory (including, without limitation, <em>Google Scholar, PubMed/MEDLINE, OpenAlex, Semantic Scholar, Crossref, Scopus, Web of Science, IEEE Xplore, ACM Digital Library, SciELO, Portal de Periódicos CAPES, Springer Nature, Elsevier/ScienceDirect, Wiley, Oxford Academic, Cambridge Core, JSTOR, arXiv</em>, and <em>CERN Zenodo</em>) are trademarks or services of their respective owners and maintaining institutions.
                    </>
                  ) : (
                    <>
                      Todas as denominações de bases de dados, periódicos, editoras científicas, índices de citação e repositórios institucionais listados no diretório de {PLATFORMS.length} plataformas (incluindo, sem limitação, <em>Google Scholar, PubMed/MEDLINE, OpenAlex, Semantic Scholar, Crossref, Scopus, Web of Science, IEEE Xplore, ACM Digital Library, SciELO, Portal de Periódicos CAPES, Springer Nature, Elsevier/ScienceDirect, Wiley, Oxford Academic, Cambridge Core, JSTOR, arXiv</em> e <em>CERN Zenodo</em>) constituem marcas registradas ou serviços pertencentes aos seus respectivos titulares e instituições mantenedoras.
                    </>
                  )}
                </p>
                <p>
                  {isEn
                    ? 'References to those platforms inside Cartograph serve strictly informational, academic, and query-routing purposes, and do not imply corporate partnership, commercial representation, or official endorsement by those publishers or government agencies.'
                    : 'A citação dessas plataformas no Cartograph possui caráter estritamente informativo, acadêmico e de facilitação técnica de consultas, não configurando parceria societária, representação comercial ou endosso oficial por parte de tais editoras ou órgãos governamentais.'}
                </p>
              </section>

              <section className="space-y-3 border-t border-[var(--divider)] pt-6">
                <h2 className="text-xl font-heading font-semibold text-[var(--text-primary)]">
                  {isEn
                    ? '3. Scientific Metadata Licensing and Full-Text Rights'
                    : '3. Licenciamento de Metadados Científicos e Direitos sobre Artigos'}
                </h2>
                <p>
                  {isEn ? (
                    <>
                      Bibliographic metadata displayed in federated search (titles, author names, publication years, venues, DOI/PMID identifiers, and citation counts) are retrieved in real time via public APIs under open licenses such as the <strong>CC0 1.0 Universal</strong> public domain dedication (adopted by OpenAlex, Crossref, and DataCite) and open data terms of the National Library of Medicine (NIH) and CERN.
                    </>
                  ) : (
                    <>
                      Os metadados bibliográficos exibidos na busca federada (títulos, nomes de autores, ano de publicação, periódico, identificadores DOI/PMID e contagens de citação) são obtidos em tempo real por meio de APIs públicas sob licenças abertas, tais como a dedicação ao domínio público <strong>CC0 1.0 Universal</strong> (adotada pelo OpenAlex, Crossref e DataCite) e termos de dados abertos da National Library of Medicine (NIH) e do CERN.
                    </>
                  )}
                </p>
                <p>
                  {isEn ? (
                    <>
                      Copyright over full-text PDFs, original abstracts, illustrations, and linked datasets belongs exclusively to their respective authors, journals, or publishers. Researchers must observe the license governing each work (such as Creative Commons <code>CC-BY</code>, <code>CC-BY-NC</code>, <code>CC-BY-ND</code>, or institutional subscription terms) when downloading, storing, or citing documents.
                    </>
                  ) : (
                    <>
                      Os direitos autorais sobre os textos completos (arquivos PDF), resumos originais, ilustrações e conjuntos de dados vinculados pertencem integralmente aos respectivos autores, periódicos ou editoras. Cabe ao pesquisador observar a licença específica de cada obra (como Creative Commons <code>CC-BY</code>, <code>CC-BY-NC</code>, <code>CC-BY-ND</code> ou termos de acesso institucional restrito) ao baixar, armazenar ou citar os documentos.
                    </>
                  )}
                </p>
              </section>
            </div>
          </article>
        )}

        {/* SECTION 5: PRIVACY & TERMS */}
        {currentSection === 'privacy' && (
          <article className="space-y-8 max-w-4xl">
            <header className="border-b border-[var(--divider)] pb-6 space-y-3">
              <div className="text-sm font-medium text-[var(--link-academic)]">
                {isEn ? 'Data Protection and Operational Terms' : 'Proteção de Dados e Termos Operacionais'}
              </div>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold text-[var(--text-primary)]">
                {isEn
                  ? 'Privacy Policy (LGPD / GDPR) and Terms of Use'
                  : 'Política de Privacidade (LGPD / GDPR) e Termos de Uso'}
              </h1>
              <p className="text-base text-[var(--text-secondary)] leading-relaxed">
                {isEn
                  ? 'Transparency regarding local researcher data storage, institutional credential safety, and academic/clinical liability boundaries.'
                  : 'Transparência sobre o armazenamento local de dados do pesquisador, segurança de credenciais institucionais e limites de responsabilidade acadêmica e clínica.'}
              </p>
            </header>

            <div className="space-y-8 text-base text-[var(--text-secondary)] leading-relaxed">
              <section className="space-y-3">
                <h2 className="text-xl font-heading font-semibold text-[var(--text-primary)]">
                  {isEn
                    ? '1. LGPD (Law No. 13.709/2018) and GDPR Compliance'
                    : '1. Conformidade com a LGPD (Lei nº 13.709/2018) e GDPR'}
                </h2>
                <p>
                  {isEn ? (
                    <>
                      Cartograph is designed around <em>Privacy-by-Design</em> and data minimization principles under the <strong>Brazilian General Data Protection Law (Law No. 13.709/2018, LGPD)</strong>, the Brazilian Civil Rights Framework for the Internet (Law No. 12.965/2014), and the European Union <strong>General Data Protection Regulation (GDPR)</strong>.
                    </>
                  ) : (
                    <>
                      O Cartograph foi concebido segundo os princípios de <em>Privacy-by-Design</em> e minimização de dados previstos na <strong>Lei Geral de Proteção de Dados Pessoais brasileira (Lei nº 13.709/2018, LGPD)</strong>, no Marco Civil da Internet (Lei nº 12.965/2014) e no Regulamento Geral sobre a Proteção de Dados da União Europeia (<strong>GDPR</strong>).
                    </>
                  )}
                </p>
                <p>
                  {isEn ? (
                    <>
                      Using the platform directory, federated metasearch, Boolean builder, and PRISMA 2020 screening tools <strong>requires no account registration, personal profile creation, or behavioral tracking</strong>.
                    </>
                  ) : (
                    <>
                      O uso do sistema para pesquisa em plataformas, metabusca federada, construção booleana e revisão sistemática PRISMA 2020 <strong>não exige criação de conta, cadastro de dados pessoais ou rastreamento comportamental</strong>.
                    </>
                  )}
                </p>
              </section>

              <section className="space-y-3 border-t border-[var(--divider)] pt-6">
                <h2 className="text-xl font-heading font-semibold text-[var(--text-primary)]">
                  {isEn
                    ? '2. Strictly Local Storage (IndexedDB + LocalStorage)'
                    : '2. Armazenamento Estritamente Local (IndexedDB + LocalStorage)'}
                </h2>
                <p>
                  {isEn ? (
                    <>
                      All saved articles, research groups, search strategy logs (PRISMA-S), screening notes, priority tags, PRISMA 2020 exclusion reasons, selected favorite platforms, and interface preferences (light/dark theme and language) are stored exclusively in the browser on the user&apos;s own device through native <code>IndexedDB</code> (with automatic <code>window.localStorage</code> migration and fallback).
                    </>
                  ) : (
                    <>
                      Toda a biblioteca de artigos salvos, grupos de pesquisa, histórico auditável de buscas (PRISMA-S), notas de fichamento, classificações de prioridade, justificativas de exclusão PRISMA 2020, seleção de plataformas favoritas e preferências visuais (tema claro/escuro e idioma) são armazenadas exclusivamente no navegador do próprio dispositivo do usuário por meio das APIs nativas <code>IndexedDB</code> (com migração automática a partir do <code>window.localStorage</code>).
                    </>
                  )}
                </p>
                <p>
                  {isEn ? (
                    <>
                      Researchers retain full control over these records and can export them as CSV, BibTeX, or full JSON Backup, import <code>.bib</code>/<code>.ris</code> references, or permanently erase them from the library panel. Only voluntary submissions through the <em>Feedback & Suggestions</em> tab transmit the form contents entered there to improve the catalog.
                    </>
                  ) : (
                    <>
                      O pesquisador detém controle total sobre esses registros, podendo exportá-los em CSV, BibTeX ou Backup JSON completo, importar referências <code>.bib</code>/<code>.ris</code> ou excluí-los permanentemente pelo botão de limpeza da biblioteca. Apenas os envios voluntários realizados na aba <em>Feedback & Sugestões</em> transmitem os dados preenchidos no formulário para análise de melhoria do catálogo.
                    </>
                  )}
                </p>
              </section>

              <section className="space-y-3 border-t border-[var(--divider)] pt-6">
                <h2 className="text-xl font-heading font-semibold text-[var(--text-primary)]">
                  {isEn
                    ? '3. Institutional Credential Security (CAPES CAFe, Shibboleth, and EZProxy)'
                    : '3. Segurança de Credenciais Institucionais (CAPES CAFe, Shibboleth e EZProxy)'}
                </h2>
                <p>
                  {isEn ? (
                    <>
                      Cartograph <strong>never requests, processes, or intercepts</strong> academic passwords or institutional credentials. When opening subscription portals (such as CAPES CAFe, IEEE, Scopus, or ScienceDirect), navigation occurs directly in native tabs of your default browser using the authenticated cookies and sessions held directly with your university or research institute.
                    </>
                  ) : (
                    <>
                      O Cartograph <strong>jamais solicita, processa ou intercepta</strong> senhas acadêmicas ou credenciais institucionais. Quando o pesquisador abre portais com acesso assinado (como Periódicos CAPES/CAFe, IEEE, Scopus ou ScienceDirect), a navegação ocorre diretamente em abas nativas do seu navegador padrão, utilizando os cookies e sessões autenticadas diretamente junto à sua universidade ou instituto de pesquisa.
                    </>
                  )}
                </p>
              </section>

              <section className="space-y-3 border-t border-[var(--divider)] pt-6">
                <h2 className="text-xl font-heading font-semibold text-[var(--text-primary)]">
                  {isEn
                    ? '4. Terms of Use and Clinical, Legal, and Technical Disclaimer'
                    : '4. Termos de Uso e Isenção de Responsabilidade Clínica, Jurídica e Técnica'}
                </h2>
                <p>
                  {isEn ? (
                    <>
                      Cartograph is provided free of charge on an <em>&ldquo;as is&rdquo;</em> basis as a computational tool for bibliographic discovery, screening, and organization.
                    </>
                  ) : (
                    <>
                      O Cartograph é disponibilizado gratuitamente no estado em que se encontra (<em>&ldquo;as is&rdquo;</em>) como instrumento computacional de auxílio à localização, triagem e organização bibliográfica.
                    </>
                  )}
                </p>
                <p>
                  {isEn ? (
                    <>
                      Medical, biomedical, pharmacological, legal, or engineering articles retrieved from external APIs and portals reflect solely the findings and views of their respective authors. Nothing displayed in Cartograph replaces clinical judgment, medical diagnosis, therapeutic prescription, legal counsel, or certified engineering review. Researchers remain solely responsible for verifying peer-review status (<em>peer review</em> vs. <em>preprint</em>), methodological rigor, and potential retractions prior to applying any study in academic or professional work.
                    </>
                  ) : (
                    <>
                      Os artigos médicos, biomédicos, farmacológicos, jurídicos ou de engenharia recuperados por meio das APIs e plataformas refletem unicamente as opiniões e resultados experimentais de seus respectivos autores. Nenhuma informação apresentada pelo Cartograph substitui parecer médico, diagnóstico clínico, prescrição terapêutica, consultoria jurídica ou laudo técnico homologado. É responsabilidade indelegável do pesquisador verificar o status de revisão por pares (<em>peer review</em> vs. <em>preprint</em>), a qualidade metodológica e a eventual retratação de qualquer estudo antes de adotá-lo em sua prática acadêmica ou profissional.
                    </>
                  )}
                </p>
              </section>

              <section className="space-y-3 border-t border-[var(--divider)] pt-6">
                <h2 className="text-xl font-heading font-semibold text-[var(--text-primary)]">
                  {isEn
                    ? '5. Privacy Contact (LGPD/GDPR) and Institutional Channel'
                    : '5. Canal de Privacidade, LGPD e Contato Institucional'}
                </h2>
                <p>
                  {isEn
                    ? 'For privacy requests (LGPD/GDPR), portal URL corrections, indexing removal inquiries, or security reports, contact the maintaining team at '
                    : 'Para solicitações sobre privacidade (LGPD/GDPR), correção de URLs de portais, pedidos de remoção de indexação ou questões de segurança, o contato oficial da equipe mantenedora é '}
                  <a
                    href="mailto:contato@cartographsearch.com"
                    className="text-[var(--link-academic)] underline font-medium"
                  >
                    contato@cartographsearch.com
                  </a>
                  .
                </p>
              </section>
            </div>
          </article>
        )}

        {/* INTERNAL SECTION PAGINATION FOOTER */}
        <div className="mt-12 pt-6 border-t border-[var(--divider)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {prevSection ? (
            <button
              type="button"
              onClick={() => handleSelectSection(prevSection.id)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--bg-canvas)] hover:bg-[var(--bg-subtle)] border border-[var(--divider)] transition-colors cursor-pointer text-left"
            >
              <ArrowLeft className="w-4 h-4 text-[var(--link-academic)] shrink-0" />
              <div>
                <div className="text-xs text-[var(--text-muted)]">
                  {isEn ? 'Previous section' : 'Seção anterior'}
                </div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">{prevSection.label}</div>
              </div>
            </button>
          ) : (
            <div />
          )}

          {nextSection ? (
            <button
              type="button"
              onClick={() => handleSelectSection(nextSection.id)}
              className="flex items-center justify-end gap-3 px-4 py-3 rounded-xl bg-[var(--bg-canvas)] hover:bg-[var(--bg-subtle)] border border-[var(--divider)] transition-colors cursor-pointer text-right"
            >
              <div>
                <div className="text-xs text-[var(--text-muted)]">
                  {isEn ? 'Next section' : 'Próxima seção'}
                </div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">{nextSection.label}</div>
              </div>
              <ArrowRight className="w-4 h-4 text-[var(--link-academic)] shrink-0" />
            </button>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  );
};
