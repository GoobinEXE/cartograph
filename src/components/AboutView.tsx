import React, { useState } from 'react';
import { PrismMonogram, PrismSpectralBar } from './PrismLogo';
import { PLATFORMS } from '../data/platforms';
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

const FEDERATED_APIS_LIST = [
  {
    name: 'OpenAlex API',
    org: 'OurResearch',
    license: 'CC0 1.0 (Domínio Público)',
    scope: 'Mais de 250 milhões de obras científicas, conceitos, grafo de citações e links diretos de PDF em Acesso Aberto.',
  },
  {
    name: 'Semantic Scholar Graph API',
    org: 'Allen Institute for AI (AI2)',
    license: 'AI2 Open Research Corpus',
    scope: 'Indexação multidisciplinar, métricas de citações influentes, resumos estruturados e localização de PDFs abertos.',
  },
  {
    name: 'PubMed / MEDLINE (NCBI Entrez)',
    org: 'National Library of Medicine (NIH)',
    license: 'NLM Public Domain / Open',
    scope: 'Base biomédica e clínica oficial com resolução de identificadores PMID, PMCID, vocabulário MeSH e textos completos no PMC.',
  },
  {
    name: 'Europe PMC REST API',
    org: 'EMBL-EBI',
    license: 'EMBL-EBI Open Science',
    scope: 'Literatura europeia e global em ciências da vida, biociências e ensaios clínicos com rastreamento de financiamento.',
  },
  {
    name: 'arXiv API',
    org: 'Cornell University',
    license: 'arXiv Open Metadata',
    scope: 'Repositório primário de preprints em Ciência da Computação, Física, Matemática, Biologia Quantitativa, Estatística e Economia.',
  },
  {
    name: 'Crossref REST API',
    org: 'Crossref DOI Foundation',
    license: 'CC0 1.0 (Metadados)',
    scope: 'Registro mundial de Digital Object Identifiers (DOIs) e metadados editoriais auditados de periódicos revisados por pares.',
  },
  {
    name: 'DOAJ API v4',
    org: 'Directory of Open Access Journals',
    license: 'CC0 / Open Access',
    scope: 'Artigos publicados exclusivamente em periódicos científicos de Acesso Aberto com revisão por pares auditada.',
  },
  {
    name: 'Zenodo / OpenAIRE API',
    org: 'CERN',
    license: 'CERN Open Data / CC',
    scope: 'Conjuntos de dados empíricos, pacotes de replicação, softwares científicos e relatórios técnicos depositados no CERN.',
  },
  {
    name: 'HAL Open Science API',
    org: 'CNRS (França)',
    license: 'Open Archive France',
    scope: 'Repositório nacional multi-institucional francês com mais de 3,5 milhões de artigos e teses acadêmicas.',
  },
  {
    name: 'DataCite Commons API',
    org: 'DataCite e.V.',
    license: 'CC0 1.0 (Domínio Público)',
    scope: 'Consórcio global de DOIs para datasets, repositórios institucionais, OSF Preprints, Dryad e Figshare.',
  },
  {
    name: 'INSPIRE-HEP API',
    org: 'CERN / DESY / Fermilab / SLAC',
    license: 'CC0 / Open High-Energy Physics',
    scope: 'Literatura internacional de física de altas energias, aceleradores, cosmologia e computação quântica.',
  },
  {
    name: 'Figshare REST API v2',
    org: 'Digital Science',
    license: 'CC0 / CC-BY',
    scope: 'Repositório de dados suplementares, figuras técnicas, scripts de análise e resultados experimentais abertos.',
  },
  {
    name: 'GBIF Literature API',
    org: 'Global Biodiversity Information Facility',
    license: 'CC0 / CC-BY',
    scope: 'Publicações revisadas por pares que utilizam dados globais de biodiversidade, ecologia e modelagem climática.',
  },
  {
    name: 'OSTI.GOV API',
    org: 'U.S. Department of Energy (DOE)',
    license: 'U.S. Government Open Data',
    scope: 'Relatórios técnicos, patentes energéticas e resultados de pesquisa dos laboratórios nacionais dos Estados Unidos.',
  },
  {
    name: 'NASA NTRS API',
    org: 'NASA STI Program',
    license: 'U.S. Government Public Domain',
    scope: 'NASA Technical Reports Server com estudos de engenharia aeroespacial, propulsão, ciência planetária e materiais.',
  },
];

const CITATION_FORMATS = {
  abnt: `CARTOGRAPH. Cartograph: Hub de Metabusca Científica, Tecnológica e Revisão Sistemática PRISMA 2020 (Versão 2.4). [Programa de computador]. 2026. Disponível em: https://cartographsearch.com. Acesso em: ${new Date().toLocaleDateString('pt-BR')}.`,
  apa: `Cartograph. (2026). Cartograph: Scientific Metasearch Hub & PRISMA 2020 Systematic Review Workstation (Version 2.4) [Computer software]. https://cartographsearch.com`,
  bibtex: `@software{cartograph_2026,
  author       = {{Cartograph}},
  title        = {{Cartograph: Scientific Metasearch Hub and PRISMA 2020 Systematic Review Workstation}},
  year         = {2026},
  version      = {2.4.0},
  url          = {https://cartographsearch.com},
  note         = {Federated metasearch across 15 open scientific APIs and 111 curated academic platforms}
}`,
};

const SECTIONS_META: {
  id: AboutSectionId;
  label: string;
  shortDesc: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  {
    id: 'cartograph',
    label: 'Sobre o Cartograph',
    shortDesc: 'Arquitetura, deduplicação e PRISMA 2020',
    icon: BookOpen,
  },
  {
    id: 'apis',
    label: '15 APIs Federadas',
    shortDesc: 'Especificação das fontes em tempo real',
    icon: Database,
  },
  {
    id: 'citation',
    label: 'Como Citar',
    shortDesc: 'ABNT NBR 6023, APA 7ª Ed. e BibTeX',
    icon: FileText,
  },
  {
    id: 'copyright',
    label: 'Direitos Autorais & Licenças',
    shortDesc: 'Copyright, marcas de terceiros e CC0',
    icon: Scale,
  },
  {
    id: 'privacy',
    label: 'Privacidade (LGPD) & Termos',
    shortDesc: 'Proteção de dados Local-First e termos de uso',
    icon: Lock,
  },
];

export const AboutView: React.FC<AboutViewProps> = ({
  activeSection: controlledSection,
  onSelectSection,
  onNavigateTab,
}) => {
  const [internalSection, setInternalSection] = useState<AboutSectionId>('cartograph');
  const [copiedCitation, setCopiedCitation] = useState<'abnt' | 'apa' | 'bibtex' | null>(null);

  const currentSection = controlledSection ?? internalSection;
  const currentYear = new Date().getFullYear();

  const handleSelectSection = (sec: AboutSectionId) => {
    if (onSelectSection) {
      onSelectSection(sec);
    } else {
      setInternalSection(sec);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentIndex = SECTIONS_META.findIndex((s) => s.id === currentSection);
  const prevSection = currentIndex > 0 ? SECTIONS_META[currentIndex - 1] : null;
  const nextSection =
    currentIndex < SECTIONS_META.length - 1 ? SECTIONS_META[currentIndex + 1] : null;

  const handleCopyCitation = async (format: 'abnt' | 'apa' | 'bibtex') => {
    try {
      await navigator.clipboard.writeText(CITATION_FORMATS[format]);
      setCopiedCitation(format);
      setTimeout(() => setCopiedCitation(null), 2200);
    } catch {
      // ignore clipboard restriction
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr] gap-8 xl:gap-12 items-start pb-16">
      {/* COLUNA ESQUERDA: NAVEGAÇÃO DOCUMENTAL & FICHA TÉCNICA */}
      <aside
        className="space-y-6 lg:sticky lg:top-24"
        aria-label="Navegação institucional e documentação legal"
      >
        {/* Bloco de Assinatura Institucional */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <PrismMonogram className="h-7 w-auto shrink-0" />
            <div>
              <div className="text-base font-heading font-semibold text-[var(--text-primary)] leading-tight">
                Cartograph
              </div>
              <div className="text-xs text-[var(--text-muted)]">Versão 2.4</div>
            </div>
          </div>

          <PrismSpectralBar className="h-[2px] w-full opacity-85" />

          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            Documentação técnica, diretrizes metodológicas e termos legais do sistema.
          </p>
        </div>

        {/* Menu de Seções */}
        <nav className="space-y-1" aria-label="Seções da página Sobre">
          <div className="px-3 pb-2 text-xs font-semibold text-[var(--text-muted)]">
            Sumário da Documentação
          </div>
          {SECTIONS_META.map((sec) => {
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

        {/* Ficha Técnica Resumida */}
        <div className="border-t border-[var(--divider)] pt-5 px-2 space-y-3 text-sm">
          <div className="text-xs font-semibold text-[var(--text-muted)]">
            Ficha Técnica
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--text-muted)]">Plataformas Curadas</dt>
              <dd className="font-medium text-[var(--text-primary)]">{PLATFORMS.length} portais</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--text-muted)]">APIs em Tempo Real</dt>
              <dd className="font-medium text-[var(--text-primary)]">15 fontes abertas</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--text-muted)]">Diretriz de Triagem</dt>
              <dd className="font-medium text-[var(--meta-green)]">PRISMA 2020</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--text-muted)]">Persistência de Dados</dt>
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
                <span>Ir para o Diretório de Bases</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('feedback')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-subtle)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <span>Enviar Sugestão ou Relato</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* COLUNA DIREITA: CONTEÚDO EDITORIAL COM TIPOGRAFIA DE LEITURA ACADÊMICA */}
      <div className="min-w-0 bg-[var(--bg-secondary)]/50 rounded-2xl p-6 sm:p-10 lg:p-12 border border-[var(--divider)]">
        {/* SEÇÃO 1: SOBRE O CARTOGRAPH */}
        {currentSection === 'cartograph' && (
          <article className="space-y-8 max-w-4xl">
            <header className="border-b border-[var(--divider)] pb-6 space-y-3">
              <div className="text-sm font-medium text-[var(--link-academic)]">
                Arquitetura e Metodologia Científica
              </div>
              <div className="flex items-center gap-3.5">
                <PrismMonogram className="h-9 w-auto shrink-0" />
                <h1 className="text-2xl sm:text-3xl font-heading font-bold text-[var(--text-primary)]">
                  Sobre o Cartograph
                </h1>
              </div>
              <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed pt-1">
                O <strong>Cartograph</strong> é um hub de metabusca científica, tecnológica e acadêmica projetado para pesquisadores, docentes, pós-graduandos e equipes de revisão sistemática de literatura.
              </p>
            </header>

            <div className="space-y-6 text-base text-[var(--text-primary)] leading-relaxed">
              <p className="text-[var(--text-secondary)]">
                A produção científica contemporânea encontra-se distribuída em centenas de repositórios institucionais, bases governamentais, servidores de preprints e editoras comerciais. O Cartograph unifica a descoberta bibliográfica em uma interface de comando única, combinando <strong>consulta federada direta em 15 APIs abertas</strong> com um <strong>catálogo estruturado de {PLATFORMS.length} plataformas especializadas</strong>.
              </p>

              <h2 className="text-xl font-heading font-semibold text-[var(--text-primary)] pt-2">
                Pilares Técnicos e Operacionais
              </h2>

              <div className="divide-y divide-[var(--divider)] border-y border-[var(--divider)]">
                <div className="py-5 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4">
                  <div className="font-semibold text-base text-[var(--text-primary)]">
                    Metabusca Federada em 15 APIs Abertas
                  </div>
                  <div className="text-base text-[var(--text-secondary)] leading-relaxed">
                    Consulta assíncrona paralela em bases mundiais como OpenAlex, Semantic Scholar, PubMed/MEDLINE, Europe PMC, arXiv, Crossref, DOAJ, CERN Zenodo, HAL, DataCite, INSPIRE-HEP, Figshare, GBIF, OSTI.GOV e NASA NTRS. Caso uma base externa apresente latência elevada ou limite de requisições, as demais continuam operando sem interrupção.
                  </div>
                </div>

                <div className="py-5 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4">
                  <div className="font-semibold text-base text-[var(--text-primary)]">
                    Deduplicação Determinística em 3 Níveis
                  </div>
                  <div className="text-base text-[var(--text-secondary)] leading-relaxed">
                    Quando o mesmo estudo retorna de múltiplas APIs, o motor de deduplicação executa três verificações sequenciais: normalização canônica de DOI, cruzamento exato de identificadores (PMID e arXiv ID) e cálculo de similaridade textual Jaro-Winkler combinada à distância de Levenshtein (limiar ≥ 0,92). Os registros colapsados têm seus metadados fundidos, preservando a maior contagem de citações e o link direto de PDF aberto.
                  </div>
                </div>

                <div className="py-5 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4">
                  <div className="font-semibold text-base text-[var(--text-primary)]">
                    Fluxo Sistemático PRISMA 2020
                  </div>
                  <div className="text-base text-[var(--text-secondary)] leading-relaxed">
                    A biblioteca integrada estrutura a triagem segundo a diretriz internacional <strong>PRISMA 2020</strong> (<em>Preferred Reporting Items for Systematic Reviews and Meta-Analyses</em>). O pesquisador organiza seus estudos em diferentes grupos de pesquisa (ou sem grupo), registra decisões de inclusão ou exclusão com justificativa padronizada e gera automaticamente o diagrama oficial de fluxo em formato vetorial SVG e o parágrafo metodológico pronto para publicação.
                  </div>
                </div>

                <div className="py-5 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4">
                  <div className="font-semibold text-base text-[var(--text-primary)]">
                    Extração Metodológica Zero-Alucinação
                  </div>
                  <div className="text-base text-[var(--text-secondary)] leading-relaxed">
                    O Cartograph não utiliza modelos de linguagem generativos para reescrever ou inventar dados bibliográficos. O parser de resumos opera por expressões regulares e vocabulário controlado para destacar Objetivo, Métodos, Tamanho Amostral (<em>N</em>), Desenho de Estudo e Conclusões diretamente do texto original dos autores.
                  </div>
                </div>

                <div className="py-5 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4">
                  <div className="font-semibold text-base text-[var(--text-primary)]">
                    Abertura Multi-Abas e Sessões Institucionais
                  </div>
                  <div className="text-base text-[var(--text-secondary)] leading-relaxed">
                    No diretório de {PLATFORMS.length} bases, o pesquisador compila sua expressão booleana uma única vez e dispara a busca simultaneamente nos portais selecionados, aproveitando sua sessão institucional ativa (como Portal de Periódicos CAPES/CAFe ou proxy universitário) e extensões de coleta como o Zotero Connector.
                  </div>
                </div>
              </div>
            </div>
          </article>
        )}

        {/* SEÇÃO 2: 15 APIs CIENTÍFICAS FEDERADAS */}
        {currentSection === 'apis' && (
          <article className="space-y-8">
            <header className="border-b border-[var(--divider)] pb-6 space-y-3">
              <div className="text-sm font-medium text-[var(--link-academic)]">
                Fontes de Dados em Tempo Real
              </div>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold text-[var(--text-primary)]">
                15 APIs Científicas e Tecnológicas Federadas
              </h1>
              <p className="text-base text-[var(--text-secondary)] leading-relaxed max-w-3xl">
                Relação completa das interfaces de programação (APIs REST/XML) consultadas em paralelo pelo motor de agregação do Cartograph durante a busca integrada.
              </p>
            </header>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-[var(--divider)] text-xs font-semibold text-[var(--text-muted)]">
                    <th className="py-3.5 pr-4 w-10">#</th>
                    <th className="py-3.5 px-4 min-w-[200px]">API / Fonte</th>
                    <th className="py-3.5 px-4 min-w-[180px]">Instituição Mantenedora</th>
                    <th className="py-3.5 px-4 min-w-[170px]">Licença de Metadados</th>
                    <th className="py-3.5 pl-4">Escopo e Cobertura Científica</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--divider)] text-sm sm:text-base">
                  {FEDERATED_APIS_LIST.map((api, idx) => (
                    <tr key={api.name} className="hover:bg-[var(--bg-subtle)]/40 transition-colors">
                      <td className="py-4 pr-4 text-sm text-[var(--text-muted)] align-top">
                        {idx + 1}.
                      </td>
                      <td className="py-4 px-4 font-semibold text-[var(--text-primary)] align-top">
                        {api.name}
                      </td>
                      <td className="py-4 px-4 text-[var(--meta-green)] font-medium align-top">
                        {api.org}
                      </td>
                      <td className="py-4 px-4 text-sm text-[var(--text-secondary)] align-top">
                        {api.license}
                      </td>
                      <td className="py-4 pl-4 text-[var(--text-secondary)] leading-relaxed align-top">
                        {api.scope}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        )}

        {/* SEÇÃO 4: COMO CITAR O CARTOGRAPH */}
        {currentSection === 'citation' && (
          <article className="space-y-8 max-w-4xl">
            <header className="border-b border-[var(--divider)] pb-6 space-y-3">
              <div className="text-sm font-medium text-[var(--link-academic)]">
                Referência Metodológica
              </div>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold text-[var(--text-primary)]">
                Como Citar o Cartograph em Trabalhos Acadêmicos
              </h1>
              <p className="text-base text-[var(--text-secondary)] leading-relaxed">
                Pesquisadores que utilizem a busca federada, o algoritmo de deduplicação multicritério ou o gerador de fluxograma PRISMA 2020 do Cartograph na seção de metodologia de artigos, dissertações ou teses podem utilizar os formatos normativos abaixo.
              </p>
            </header>

            <div className="space-y-6">
              {/* ABNT */}
              <div className="bg-[var(--bg-canvas)] rounded-xl p-6 border border-[var(--divider)] space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-[var(--text-primary)]">
                      Padrão ABNT (NBR 6023:2018)
                    </h2>
                    <p className="text-sm text-[var(--text-muted)]">
                      Recomendado para teses, dissertações, TCCs e periódicos brasileiros.
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
                    <span>{copiedCitation === 'abnt' ? 'Copiado' : 'Copiar ABNT'}</span>
                  </button>
                </div>
                <div className="p-4 rounded-lg bg-[var(--bg-secondary)] text-base text-[var(--text-primary)] leading-relaxed break-words">
                  {CITATION_FORMATS.abnt}
                </div>
              </div>

              {/* APA 7 */}
              <div className="bg-[var(--bg-canvas)] rounded-xl p-6 border border-[var(--divider)] space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-[var(--text-primary)]">
                      Padrão APA (7ª Edição)
                    </h2>
                    <p className="text-sm text-[var(--text-muted)]">
                      Recomendado para periódicos internacionais, psicologia, ciências sociais e saúde.
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
                    <span>{copiedCitation === 'apa' ? 'Copiado' : 'Copiar APA'}</span>
                  </button>
                </div>
                <div className="p-4 rounded-lg bg-[var(--bg-secondary)] text-base text-[var(--text-primary)] leading-relaxed break-words">
                  {CITATION_FORMATS.apa}
                </div>
              </div>

              {/* BibTeX */}
              <div className="bg-[var(--bg-canvas)] rounded-xl p-6 border border-[var(--divider)] space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-[var(--text-primary)]">
                      Entrada BibTeX (LaTeX / Overleaf / Zotero)
                    </h2>
                    <p className="text-sm text-[var(--text-muted)]">
                      Pronto para inclusão direta em arquivos <code>.bib</code>.
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
                    <span>{copiedCitation === 'bibtex' ? 'Copiado' : 'Copiar BibTeX'}</span>
                  </button>
                </div>
                <pre className="p-4 rounded-lg bg-[var(--bg-secondary)] text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed overflow-x-auto whitespace-pre-wrap">
                  {CITATION_FORMATS.bibtex}
                </pre>
              </div>
            </div>
          </article>
        )}

        {/* SEÇÃO 5: DIREITOS AUTORAIS, PROPRIEDADE INTELECTUAL E LICENÇAS */}
        {currentSection === 'copyright' && (
          <article className="space-y-8 max-w-4xl">
            <header className="border-b border-[var(--divider)] pb-6 space-y-3">
              <div className="text-sm font-medium text-[var(--link-academic)]">
                Propriedade Intelectual e Direitos Autorais
              </div>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold text-[var(--text-primary)]">
                Direitos Autorais (Copyright) e Licenciamento de Dados
              </h1>
              <p className="text-base text-[var(--text-secondary)] leading-relaxed">
                Declaração de titularidade sobre o software Cartograph, marcas de terceiros e regime jurídico dos metadados científicos.
              </p>
            </header>

            <div className="space-y-8 text-base text-[var(--text-secondary)] leading-relaxed">
              <section className="space-y-3">
                <h2 className="text-xl font-heading font-semibold text-[var(--text-primary)]">
                  1. Titularidade do Software Cartograph
                </h2>
                <p className="font-medium text-[var(--text-primary)]">
                  © {currentYear} Cartograph. Todos os direitos reservados.
                </p>
                <p>
                  A marca, o logotipo da lupa cartográfica e o sistema <strong>Cartograph</strong> (compreendendo seu código-fonte, projeto de interface gráfica, motor de deduplicação multicritério, parser determinístico de resumos estruturados, geradores vetoriais PRISMA 2020, compiladores bibliográficos e taxonomia curada de plataformas) são protegidos por direitos de propriedade intelectual.
                </p>
                <p>
                  Estes ativos são amparados pela legislação brasileira de Propriedade Intelectual, Lei do Software (Lei nº 9.609/1998), Lei de Direitos Autorais (Lei nº 9.610/1998) e pelos tratados internacionais aplicáveis (Convenção de Berna e Acordo TRIPS). É vedada a reprodução comercial não autorizada ou redistribuição como serviço próprio.
                </p>
              </section>

              <section className="space-y-3 border-t border-[var(--divider)] pt-6">
                <h2 className="text-xl font-heading font-semibold text-[var(--text-primary)]">
                  2. Marcas de Terceiros e Isenção de Afiliação Editorial
                </h2>
                <p>
                  Todas as denominações de bases de dados, periódicos, editoras científicas, índices de citação e repositórios institucionais listados no diretório de {PLATFORMS.length} plataformas (incluindo, sem limitação, <em>Google Scholar, PubMed/MEDLINE, OpenAlex, Semantic Scholar, Crossref, Scopus, Web of Science, IEEE Xplore, ACM Digital Library, SciELO, Portal de Periódicos CAPES, Springer Nature, Elsevier/ScienceDirect, Wiley, Oxford Academic, Cambridge Core, JSTOR, arXiv</em> e <em>CERN Zenodo</em>) constituem marcas registradas ou serviços pertencentes aos seus respectivos titulares e instituições mantenedoras.
                </p>
                <p>
                  A citação dessas plataformas no Cartograph possui caráter estritamente informativo, acadêmico e de facilitação técnica de consultas, não configurando parceria societária, representação comercial ou endosso oficial por parte de tais editoras ou órgãos governamentais.
                </p>
              </section>

              <section className="space-y-3 border-t border-[var(--divider)] pt-6">
                <h2 className="text-xl font-heading font-semibold text-[var(--text-primary)]">
                  3. Licenciamento de Metadados Científicos e Direitos sobre Artigos
                </h2>
                <p>
                  Os metadados bibliográficos exibidos na busca federada (títulos, nomes de autores, ano de publicação, periódico, identificadores DOI/PMID e contagens de citação) são obtidos em tempo real por meio de APIs públicas sob licenças abertas, tais como a dedicação ao domínio público <strong>CC0 1.0 Universal</strong> (adotada pelo OpenAlex, Crossref e DataCite) e termos de dados abertos da National Library of Medicine (NIH) e do CERN.
                </p>
                <p>
                  Os direitos autorais sobre os textos completos (arquivos PDF), resumos originais, ilustrações e conjuntos de dados vinculados pertencem integralmente aos respectivos autores, periódicos ou editoras. Cabe ao pesquisador observar a licença específica de cada obra (como Creative Commons <code>CC-BY</code>, <code>CC-BY-NC</code>, <code>CC-BY-ND</code> ou termos de acesso institucional restrito) ao baixar, armazenar ou citar os documentos.
                </p>
              </section>
            </div>
          </article>
        )}

        {/* SEÇÃO 6: PRIVACIDADE (LGPD / GDPR) E TERMOS DE USO */}
        {currentSection === 'privacy' && (
          <article className="space-y-8 max-w-4xl">
            <header className="border-b border-[var(--divider)] pb-6 space-y-3">
              <div className="text-sm font-medium text-[var(--link-academic)]">
                Proteção de Dados e Termos Operacionais
              </div>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold text-[var(--text-primary)]">
                Política de Privacidade (LGPD / GDPR) e Termos de Uso
              </h1>
              <p className="text-base text-[var(--text-secondary)] leading-relaxed">
                Transparência sobre o armazenamento local de dados do pesquisador, segurança de credenciais institucionais e limites de responsabilidade acadêmica e clínica.
              </p>
            </header>

            <div className="space-y-8 text-base text-[var(--text-secondary)] leading-relaxed">
              <section className="space-y-3">
                <h2 className="text-xl font-heading font-semibold text-[var(--text-primary)]">
                  1. Conformidade com a LGPD (Lei nº 13.709/2018) e GDPR
                </h2>
                <p>
                  O Cartograph foi concebido segundo os princípios de <em>Privacy-by-Design</em> e minimização de dados previstos na <strong>Lei Geral de Proteção de Dados Pessoais brasileira (Lei nº 13.709/2018, LGPD)</strong>, no Marco Civil da Internet (Lei nº 12.965/2014) e no Regulamento Geral sobre a Proteção de Dados da União Europeia (<strong>GDPR</strong>).
                </p>
                <p>
                  O uso do sistema para pesquisa em plataformas, metabusca federada, construção booleana e revisão sistemática PRISMA 2020 <strong>não exige criação de conta, cadastro de dados pessoais ou rastreamento comportamental</strong>.
                </p>
              </section>

              <section className="space-y-3 border-t border-[var(--divider)] pt-6">
                <h2 className="text-xl font-heading font-semibold text-[var(--text-primary)]">
                  2. Armazenamento Estritamente Local (LocalStorage)
                </h2>
                <p>
                  Toda a biblioteca de artigos salvos, grupos de pesquisa, notas de fichamento, classificações de prioridade, justificativas de exclusão PRISMA 2020, seleção de plataformas favoritas e preferências visuais (tema claro/escuro e idioma) são armazenadas exclusivamente no navegador do próprio dispositivo do usuário por meio da API nativa <code>window.localStorage</code>.
                </p>
                <p>
                  O pesquisador detém controle total sobre esses registros, podendo exportá-los a qualquer momento em formato CSV ou BibTeX, ou excluí-los permanentemente por meio do botão de limpeza da biblioteca. Apenas os envios voluntários realizados na aba <em>Feedback & Sugestões</em> transmitem os dados preenchidos no formulário para análise de melhoria do catálogo.
                </p>
              </section>

              <section className="space-y-3 border-t border-[var(--divider)] pt-6">
                <h2 className="text-xl font-heading font-semibold text-[var(--text-primary)]">
                  3. Segurança de Credenciais Institucionais (CAPES CAFe, Shibboleth e EZProxy)
                </h2>
                <p>
                  O Cartograph <strong>jamais solicita, processa ou intercepta</strong> senhas acadêmicas ou credenciais institucionais. Quando o pesquisador abre portais com acesso assinado (como Periódicos CAPES/CAFe, IEEE, Scopus ou ScienceDirect), a navegação ocorre diretamente em abas nativas do seu navegador padrão, utilizando os cookies e sessões autenticadas diretamente junto à sua universidade ou instituto de pesquisa.
                </p>
              </section>

              <section className="space-y-3 border-t border-[var(--divider)] pt-6">
                <h2 className="text-xl font-heading font-semibold text-[var(--text-primary)]">
                  4. Termos de Uso e Isenção de Responsabilidade Clínica, Jurídica e Técnica
                </h2>
                <p>
                  O Cartograph é disponibilizado gratuitamente no estado em que se encontra (<em>&ldquo;as is&rdquo;</em>) como instrumento computacional de auxílio à localização, triagem e organização bibliográfica.
                </p>
                <p>
                  Os artigos médicos, biomédicos, farmacológicos, jurídicos ou de engenharia recuperados por meio das APIs e plataformas refletem unicamente as opiniões e resultados experimentais de seus respectivos autores. Nenhuma informação apresentada pelo Cartograph substitui parecer médico, diagnóstico clínico, prescrição terapêutica, consultoria jurídica ou laudo técnico homologado. É responsabilidade indelegável do pesquisador verificar o status de revisão por pares (<em>peer review</em> vs. <em>preprint</em>), a qualidade metodológica e a eventual retratação de qualquer estudo antes de adotá-lo em sua prática acadêmica ou profissional.
                </p>
              </section>
            </div>
          </article>
        )}

        {/* RODAPÉ DE PAGINAÇÃO INTERNA ENTRE AS SEÇÕES */}
        <div className="mt-12 pt-6 border-t border-[var(--divider)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {prevSection ? (
            <button
              type="button"
              onClick={() => handleSelectSection(prevSection.id)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--bg-canvas)] hover:bg-[var(--bg-subtle)] border border-[var(--divider)] transition-colors cursor-pointer text-left"
            >
              <ArrowLeft className="w-4 h-4 text-[var(--link-academic)] shrink-0" />
              <div>
                <div className="text-xs text-[var(--text-muted)]">Seção anterior</div>
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
                <div className="text-xs text-[var(--text-muted)]">Próxima seção</div>
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
