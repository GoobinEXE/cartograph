import React, { useState } from 'react';
import { PrismMonogram, PrismPMonogram, PrismSpectralBar } from './PrismLogo';
import { PLATFORMS } from '../data/platforms';
import {
  BookOpen,
  Check,
  Code2,
  Copy,
  Cpu,
  Database,
  FileCheck2,
  GitMerge,
  Globe,
  HardDrive,
  Layers,
  Lock,
  Scale,
  ShieldCheck,
  Terminal,
} from 'lucide-react';

interface AboutViewProps {
  onNavigateTab?: (tab: 'platforms' | 'federated' | 'saved' | 'feedback' | 'about') => void;
}

const FEDERATED_APIS_LIST = [
  {
    name: 'OpenAlex API',
    org: 'OurResearch',
    scope: 'Mais de 250 milhões de obras científicas, conceitos, grafo de citações e links diretos Open Access (licença CC0).',
  },
  {
    name: 'Semantic Scholar Graph API',
    org: 'Allen Institute for AI (AI2)',
    scope: 'Indexação semântica multidisciplinar, métricas de citações influentes, resumos estruturados e PDFs abertos.',
  },
  {
    name: 'PubMed / MEDLINE (NCBI Entrez)',
    org: 'National Library of Medicine (NIH)',
    scope: 'Base biomédica e clínica oficial com resolução de identificadores PMID, PMCID, MeSH e textos completos no PMC.',
  },
  {
    name: 'Europe PMC REST API',
    org: 'EMBL-EBI',
    scope: 'Literatura europeia e global em ciências da vida, biociências e ensaios clínicos com rastreamento de financiamento.',
  },
  {
    name: 'arXiv API',
    org: 'Cornell University',
    scope: 'Repositório primário de preprints em Ciência da Computação, Física, Matemática, Biologia Quantitativa, Estatística e Economia.',
  },
  {
    name: 'Crossref REST API',
    org: 'Crossref DOI Foundation',
    scope: 'Registro oficial de Digital Object Identifiers (DOIs) e metadados editoriais auditados de periódicos revisados por pares.',
  },
  {
    name: 'DOAJ API v4',
    org: 'Directory of Open Access Journals',
    scope: 'Artigos publicados exclusivamente em periódicos científicos de Acesso Aberto com revisão por pares verificada.',
  },
  {
    name: 'Zenodo / OpenAIRE API',
    org: 'CERN',
    scope: 'Conjuntos de dados empíricos, pacotes de replicação, softwares científicos e relatórios técnicos depositados no CERN.',
  },
  {
    name: 'HAL Open Science API',
    org: 'CNRS (França)',
    scope: 'Repositório nacional multi-institucional francês com mais de 3,5 milhões de artigos e teses acadêmicas.',
  },
  {
    name: 'DataCite Commons API',
    org: 'DataCite e.V.',
    scope: 'Consórcio global de DOIs para datasets, repositórios institucionais, OSF Preprints, Dryad e Figshare.',
  },
  {
    name: 'INSPIRE-HEP API',
    org: 'CERN / DESY / Fermilab / SLAC',
    scope: 'Literatura internacional de física de altas energias, aceleradores, cosmologia e computação quântica.',
  },
  {
    name: 'Figshare REST API v2',
    org: 'Digital Science',
    scope: 'Repositório de dados suplementares, figuras técnicas, scripts de análise e resultados experimentais abertos.',
  },
  {
    name: 'GBIF Literature API',
    org: 'Global Biodiversity Information Facility',
    scope: 'Publicações revisadas por pares que utilizam dados globais de biodiversidade, ecologia e modelagem climática.',
  },
  {
    name: 'OSTI.GOV API',
    org: 'U.S. Department of Energy (DOE)',
    scope: 'Relatórios técnicos, patentes energéticas e resultados de pesquisa dos laboratórios nacionais dos Estados Unidos.',
  },
  {
    name: 'NASA NTRS API',
    org: 'NASA STI Program',
    scope: 'NASA Technical Reports Server com estudos de engenharia aeroespacial, propulsão, ciência planetária e materiais.',
  },
];

const CITATION_FORMATS = {
  abnt: `PRISM. Cartograph: Hub de Metabusca Científica, Tecnológica e Revisão Sistemática PRISMA 2020 (Versão 2.4). [Programa de computador]. 2026. Disponível em: https://cartograph.prism.org. Acesso em: ${new Date().toLocaleDateString('pt-BR')}.`,
  apa: `Prism. (2026). Cartograph: Scientific Metasearch Hub & PRISMA 2020 Systematic Review Workstation (Version 2.4) [Computer software]. Prism Labs.`,
  bibtex: `@software{prism_cartograph_2026,
  author       = {{Prism Labs}},
  title        = {{Cartograph: Scientific Metasearch Hub and PRISMA 2020 Systematic Review Workstation}},
  year         = {2026},
  version      = {2.4.0},
  publisher    = {Prism},
  note         = {Federated metasearch across 15 open scientific APIs and 111 curated academic platforms}
}`,
};

export const AboutView: React.FC<AboutViewProps> = ({ onNavigateTab }) => {
  const [copiedCitation, setCopiedCitation] = useState<'abnt' | 'apa' | 'bibtex' | null>(null);
  const currentYear = new Date().getFullYear();

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
    <div className="max-w-5xl mx-auto space-y-8 pb-14">
      {/* 1. HERO INSTITUCIONAL DUAL: CARTOGRAPH × PRISM */}
      <section className="bg-[var(--bg-secondary)] rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <PrismSpectralBar className="h-1 w-full rounded-full mb-6" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-canvas)] text-xs font-medium text-[var(--text-primary)]">
                <PrismMonogram className="h-4 w-auto" />
                <span>Cartograph v2.4</span>
              </div>
              <span className="text-[var(--text-muted)] text-xs">×</span>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-canvas)] text-xs font-medium text-[var(--text-primary)]">
                <PrismPMonogram className="h-3.5 w-auto" />
                <span>Prism Labs</span>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--accent-blue-tint)] text-[var(--link-academic)] text-[11px] font-mono">
                PRISMA 2020 Compliant
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-heading font-semibold text-[var(--text-primary)] tracking-tight leading-snug">
              Infraestrutura de Metabusca Científica, Engenharia Determinística e Revisão de Literatura
            </h1>

            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              O <strong>Cartograph</strong> é uma estação de trabalho para descoberta bibliográfica, consulta federada em tempo real e triagem sistemática desenvolvida pela <strong>Prism</strong>. O sistema unifica o acesso a {PLATFORMS.length} plataformas acadêmicas curadas e consulta simultaneamente 15 APIs científicas abertas, operando sob rigor metodológico determinístico, reprodutibilidade auditável e armazenamento local sob controle exclusivo do pesquisador.
            </p>
          </div>

          {/* Dual Brand Card */}
          <div className="bg-[var(--bg-canvas)] rounded-2xl p-5 shrink-0 flex flex-col justify-between gap-4 min-w-[250px] border border-[var(--divider)]">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <PrismMonogram className="h-8 w-auto" />
                <div>
                  <div className="text-sm font-heading font-semibold text-[var(--text-primary)]">Cartograph</div>
                  <div className="text-[11px] text-[var(--text-muted)] font-mono">Scientific Hub</div>
                </div>
              </div>
              <div className="h-7 w-[1px] bg-[var(--divider)]" />
              <div className="flex items-center gap-2.5">
                <PrismPMonogram className="h-7 w-auto" />
                <div>
                  <div className="text-sm font-heading font-semibold text-[var(--text-primary)]">Prism</div>
                  <div className="text-[11px] text-[var(--text-muted)] font-mono">Engineering</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--divider)] text-center">
              <div>
                <div className="text-base font-heading font-bold text-[var(--link-academic)]">{PLATFORMS.length}</div>
                <div className="text-[10px] text-[var(--text-muted)]">Bases Curadas</div>
              </div>
              <div>
                <div className="text-base font-heading font-bold text-[var(--meta-green)]">15</div>
                <div className="text-[10px] text-[var(--text-muted)]">APIs Abertas</div>
              </div>
              <div>
                <div className="text-base font-heading font-bold text-[var(--text-primary)]">20</div>
                <div className="text-[10px] text-[var(--text-muted)]">Perfis de Área</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Navigation Bar */}
        {onNavigateTab && (
          <div className="flex flex-wrap items-center gap-2.5 mt-6 pt-5 border-t border-[var(--divider)]">
            <button
              type="button"
              onClick={() => onNavigateTab('platforms')}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:text-[var(--link-academic)] transition-colors cursor-pointer"
            >
              Explorar {PLATFORMS.length} Plataformas ↗
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('federated')}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:text-[var(--link-academic)] transition-colors cursor-pointer"
            >
              Metabusca Federada (15 APIs) ↗
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('saved')}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:text-[var(--link-academic)] transition-colors cursor-pointer"
            >
              Matriz & Fluxograma PRISMA 2020 ↗
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('feedback')}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:text-[var(--link-academic)] transition-colors cursor-pointer"
            >
              Sugerir Nova Base ou Reportar Erro ↗
            </button>
          </div>
        )}
      </section>

      {/* 2. SOBRE O CARTOGRAPH: ARQUITETURA TÉCNICA E METODOLÓGICA */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5">
          <PrismMonogram className="h-5 w-auto" />
          <h2 className="text-lg font-heading font-semibold text-[var(--text-primary)]">
            Sobre o Cartograph: Arquitetura e Capacidades Operacionais
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-[var(--bg-secondary)] rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--link-academic)]">
              <Database className="w-4 h-4 shrink-0" />
              <span>Agregação Federada Assíncrona</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Executa consultas simultâneas via <code>Promise.allSettled</code> em 15 APIs científicas e governamentais abertas. O isolamento de falhas garante que o limite de taxa (HTTP 429) ou latência de uma fonte externa não interrompa a coleta nas demais bases.
            </p>
          </div>

          <div className="bg-[var(--bg-secondary)] rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--link-academic)]">
              <GitMerge className="w-4 h-4 shrink-0" />
              <span>Deduplicação Multicritério em 3 Estágios</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Elimina registros redundantes combinando normalização canônica de DOI, pareamento exato de identificadores (PMID e arXiv ID) e cálculo de similaridade textual Jaro-Winkler e Levenshtein (limiar ≥ 0,92), fundindo contagens de citação e preservando links de PDF aberto.
            </p>
          </div>

          <div className="bg-[var(--bg-secondary)] rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--link-academic)]">
              <FileCheck2 className="w-4 h-4 shrink-0" />
              <span>Fluxo Sistemático PRISMA 2020</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Automatiza a contabilização das fases de Identificação, Triagem e Inclusão segundo a diretriz internacional PRISMA 2020. Gera o diagrama de fluxo oficial em formato vetorial SVG e redige a síntese metodológica padronizada para inserção direta em artigos e dissertações.
            </p>
          </div>

          <div className="bg-[var(--bg-secondary)] rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--link-academic)]">
              <Code2 className="w-4 h-4 shrink-0" />
              <span>Extração Metodológica Determinística</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Analisa resumos científicos por meio de expressões regulares e vocabulários controlados para segmentar Objetivo, Métodos, Resultados e Conclusão, identificando o desenho metodológico (ensaio clínico randomizado, coorte, revisão sistemática) e o tamanho amostral (<em>N</em>) sem risco de alucinação generativa.
            </p>
          </div>

          <div className="bg-[var(--bg-secondary)] rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--link-academic)]">
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>Compilação Bibliográfica Normativa</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Formata referências de maneira determinística de acordo com as normas <strong>ABNT NBR 6023:2018</strong>, <strong>APA 7ª Edição</strong> e <strong>BibTeX</strong>, além de exportar a matriz completa de revisão de literatura em arquivo CSV codificado em UTF-8 com BOM para abertura direta no Excel, LibreOffice ou R/Python.
            </p>
          </div>

          <div className="bg-[var(--bg-secondary)] rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--link-academic)]">
              <Terminal className="w-4 h-4 shrink-0" />
              <span>Execução Híbrida Web & Desktop Nativo</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Opera tanto no navegador quanto como aplicativo nativo via <strong>Tauri v2</strong> e <strong>Node Local Bridge</strong> em Windows, macOS e Linux. O acionamento pelo sistema operacional abre múltiplos portais no navegador padrão com cadência controlada, aproveitando sessões institucionais CAPES CAFe e extensões Zotero.
            </p>
          </div>
        </div>
      </section>

      {/* 3. SOBRE A PRISM: IDENTIDADE, ENGENHARIA E CIÊNCIA ABERTA */}
      <section className="bg-[var(--bg-secondary)] rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--divider)] pb-5">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--divider)] shrink-0">
              <PrismPMonogram className="h-8 w-auto" />
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                Organização Desenvolvedora & Estúdio de Engenharia
              </div>
              <h2 className="text-xl font-heading font-semibold text-[var(--text-primary)]">
                Sobre a Prism (Prism Labs)
              </h2>
            </div>
          </div>

          {/* 5 Spectral Color Swatches */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-muted)]">
            <span className="inline-block w-3 h-3 rounded-full bg-[#01ABE8]" title="#01ABE8 · Ciano Espectral" />
            <span className="inline-block w-3 h-3 rounded-full bg-[#AEB932]" title="#AEB932 · Oliva Óptico" />
            <span className="inline-block w-3 h-3 rounded-full bg-[#F4E412]" title="#F4E412 · Amarelo Solar" />
            <span className="inline-block w-3 h-3 rounded-full bg-[#E97635]" title="#E97635 · Âmbar de Refração" />
            <span className="inline-block w-3 h-3 rounded-full bg-[#DA0082]" title="#DA0082 · Magenta Profundo" />
            <span className="ml-1.5">Espectro Prism</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs text-[var(--text-secondary)] leading-relaxed">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Missão Técnica e Identidade Óptica
            </h3>
            <p>
              A <strong>Prism</strong> (<em>Prism Labs</em>) desenvolve sistemas de engenharia de software, ferramentas de síntese informacional e infraestrutura para pesquisa científica e tecnológica. O símbolo <strong>P</strong> da Prism incorpora cinco faixas espectrais contínuas (<code>#01ABE8</code>, <code>#AEB932</code>, <code>#F4E412</code>, <code>#E97635</code> e <code>#DA0082</code>) que representam a decomposição de um feixe bruto de dados em componentes estruturados, verificáveis e rastreáveis.
            </p>
            <p>
              No <strong>Cartograph</strong>, essa arquitetura óptica é combinada à lupa e à agulha cartográfica: enquanto a Prism fornece a fundação de decomposição analítica e processamento determinístico de dados, o Cartograph atua como o instrumento de navegação sobre a literatura científica mundial.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Princípios de Engenharia da Prism
            </h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <Cpu className="w-4 h-4 text-[var(--link-academic)] shrink-0 mt-0.5" />
                <span>
                  <strong>Determinismo e Reprodutibilidade:</strong> Os algoritmos de construção booleana, deduplicação e cálculo de métricas PRISMA operam por regras matemáticas explícitas, assegurando que diferentes pesquisadores obtenham resultados auditáveis a partir da mesma estratégia de busca.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <HardDrive className="w-4 h-4 text-[var(--link-academic)] shrink-0 mt-0.5" />
                <span>
                  <strong>Arquitetura Local-First:</strong> A biblioteca de artigos, os fichamentos e os critérios de elegibilidade pertencem integralmente ao pesquisador, permanecendo armazenados no dispositivo local com exportação aberta em formatos padronizados (CSV, BibTeX e SVG).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Globe className="w-4 h-4 text-[var(--link-academic)] shrink-0 mt-0.5" />
                <span>
                  <strong>Valorização da Ciência Aberta e Regional:</strong> Integração paritária entre indexadores globais do Norte Global e infraestruturas estratégicas da América Latina, Europa e Brasil (SciELO, Periódicos CAPES, Redalyc, Latindex, LA Referencia, BDTD/IBICT e HAL).
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 4. MATRIZ DAS 15 APIs CIENTÍFICAS ABERTAS INTEGRADA */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[var(--link-academic)]" />
            <h2 className="text-base font-heading font-semibold text-[var(--text-primary)]">
              Fontes de Dados em Tempo Real (15 APIs Abertas Federadas)
            </h2>
          </div>
          <span className="text-xs text-[var(--text-muted)]">
            Consultadas simultaneamente pelo motor <code>academicAggregator.ts</code>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FEDERATED_APIS_LIST.map((api, idx) => (
            <div
              key={api.name}
              className="bg-[var(--bg-secondary)] rounded-xl p-4 flex flex-col justify-between gap-2"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    {idx + 1}. {api.name}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--meta-green)] shrink-0">
                    {api.org}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  {api.scope}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. COMO CITAR O CARTOGRAPH EM TRABALHOS ACADÊMICOS */}
      <section className="bg-[var(--bg-secondary)] rounded-2xl p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-heading font-semibold text-[var(--text-primary)]">
              Como Citar o Cartograph em Artigos, Dissertações e Teses
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Caso utilize a metabusca federada, a deduplicação determinística ou o fluxograma PRISMA 2020 do Cartograph em sua metodologia, utilize uma das referências padronizadas abaixo:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* ABNT */}
          <div className="bg-[var(--bg-canvas)] rounded-xl p-4 flex flex-col justify-between gap-3 border border-[var(--divider)]">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  ABNT NBR 6023:2018
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyCitation('abnt')}
                  className="inline-flex items-center gap-1 text-[11px] text-[var(--link-academic)] hover:underline cursor-pointer"
                >
                  {copiedCitation === 'abnt' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCitation === 'abnt' ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] font-mono leading-relaxed break-words">
                {CITATION_FORMATS.abnt}
              </p>
            </div>
          </div>

          {/* APA 7 */}
          <div className="bg-[var(--bg-canvas)] rounded-xl p-4 flex flex-col justify-between gap-3 border border-[var(--divider)]">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  APA (7th Edition)
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyCitation('apa')}
                  className="inline-flex items-center gap-1 text-[11px] text-[var(--link-academic)] hover:underline cursor-pointer"
                >
                  {copiedCitation === 'apa' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCitation === 'apa' ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] font-mono leading-relaxed break-words">
                {CITATION_FORMATS.apa}
              </p>
            </div>
          </div>

          {/* BibTeX */}
          <div className="bg-[var(--bg-canvas)] rounded-xl p-4 flex flex-col justify-between gap-3 border border-[var(--divider)]">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  BibTeX (LaTeX / Overleaf)
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyCitation('bibtex')}
                  className="inline-flex items-center gap-1 text-[11px] text-[var(--link-academic)] hover:underline cursor-pointer"
                >
                  {copiedCitation === 'bibtex' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCitation === 'bibtex' ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
              <pre className="text-[10px] text-[var(--text-secondary)] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap">
                {CITATION_FORMATS.bibtex}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* 6. INFORMAÇÕES LEGAIS, DIREITOS AUTORAIS (COPYRIGHT), PRIVACIDADE E TERMOS DE USO */}
      <section className="bg-[var(--bg-secondary)] rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-2.5 border-b border-[var(--divider)] pb-4">
          <Scale className="w-5 h-5 text-[var(--link-academic)] shrink-0" />
          <div>
            <h2 className="text-lg font-heading font-semibold text-[var(--text-primary)]">
              Informações Legais, Direitos Autorais (Copyright) e Conformidade
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Propriedade intelectual, licenciamento de metadados científicos, proteção de dados (LGPD / GDPR) e termos operacionais.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-[var(--text-secondary)] leading-relaxed">
          {/* 6.1 Copyright & Propriedade Intelectual */}
          <div className="bg-[var(--bg-canvas)] rounded-xl p-5 space-y-2.5 border border-[var(--divider)]">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
              <ShieldCheck className="w-4 h-4 text-[var(--link-academic)] shrink-0" />
              <span>1. Direitos Autorais e Propriedade Intelectual (Copyright)</span>
            </div>
            <p>
              <strong>© {currentYear} Prism (Prism Labs). Todos os direitos reservados.</strong>
            </p>
            <p>
              A identidade visual, o nome comercial e o monograma espectral <strong>Prism (P)</strong>, bem como a marca, o símbolo da lupa cartográfica e o software <strong>Cartograph</strong> (incluindo sua arquitetura de interface, código-fonte, algoritmos de deduplicação multicritério, parser de resumos estruturados, compiladores bibliográficos e curadoria taxonômica de plataformas) são de titularidade exclusiva da <strong>Prism</strong>, protegidos pela legislação brasileira de Propriedade Intelectual e Programas de Computador (Lei nº 9.609/1998 e Lei nº 9.610/1998) e por tratados internacionais de direitos autorais (Convenção de Berna).
            </p>
          </div>

          {/* 6.2 Marcas de Terceiros e Isenção de Afiliação Editorial */}
          <div className="bg-[var(--bg-canvas)] rounded-xl p-5 space-y-2.5 border border-[var(--divider)]">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
              <Globe className="w-4 h-4 text-[var(--link-academic)] shrink-0" />
              <span>2. Marcas de Terceiros e Isenção de Afiliação Editorial</span>
            </div>
            <p>
              Todas as denominações de bases de dados, periódicos, editoras acadêmicas, índices de citação e repositórios institucionais listados no diretório (incluindo, de forma exemplificativa, <em>Google Scholar, PubMed/MEDLINE, OpenAlex, Semantic Scholar, Crossref, Scopus, Web of Science, IEEE Xplore, ACM Digital Library, SciELO, Portal de Periódicos CAPES, Springer Nature, Elsevier/ScienceDirect, Wiley, Oxford Academic, Cambridge Core, JSTOR, arXiv</em> e <em>CERN Zenodo</em>) constituem marcas registradas ou serviços pertencentes aos seus respectivos proprietários e instituições mantenedoras.
            </p>
            <p>
              A presença dessas plataformas no catálogo do Cartograph tem finalidade estritamente referencial e de redirecionamento técnico de consultas acadêmicas, não implicando vínculo societário, patrocínio ou endosso institucional por parte das referidas editoras.
            </p>
          </div>

          {/* 6.3 Licenciamento de Metadados e Direitos sobre Obras Científicas */}
          <div className="bg-[var(--bg-canvas)] rounded-xl p-5 space-y-2.5 border border-[var(--divider)]">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
              <BookOpen className="w-4 h-4 text-[var(--link-academic)] shrink-0" />
              <span>3. Licenciamento de Metadados e Direitos Autorais de Artigos</span>
            </div>
            <p>
              Os metadados bibliográficos exibidos na aba de busca federada são recuperados em tempo real a partir de APIs públicas oficiais disponibilizadas sob licenças de dados abertos (tais como dedicação ao domínio público <strong>CC0 1.0 Universal</strong> no OpenAlex, Crossref e DataCite, e termos públicos da National Library of Medicine e do CERN).
            </p>
            <p>
              Os direitos autorais sobre os textos completos (arquivos PDF), figuras, conjuntos de dados e resumos originais pertencem aos respectivos autores, sociedades científicas ou editoras responsáveis pela publicação. Ao acessar ou baixar um documento externo, o pesquisador compromete-se a respeitar a licença específica atribuída à obra (como Creative Commons <code>CC-BY</code>, <code>CC-BY-NC</code> ou termos de assinatura institucional CAPES/CAFe).
            </p>
          </div>

          {/* 6.4 Privacidade, Proteção de Dados (LGPD / GDPR) e Segurança */}
          <div className="bg-[var(--bg-canvas)] rounded-xl p-5 space-y-2.5 border border-[var(--divider)]">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
              <Lock className="w-4 h-4 text-[var(--link-academic)] shrink-0" />
              <span>4. Privacidade, Proteção de Dados (LGPD / GDPR) e Segurança</span>
            </div>
            <p>
              Em conformidade com a <strong>Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD)</strong>, o Marco Civil da Internet (Lei nº 12.965/2014) e o Regulamento Geral sobre a Proteção de Dados Europeu (<strong>GDPR</strong>), o Cartograph adota arquitetura <em>Privacy-by-Design</em> e <em>Local-First</em>:
            </p>
            <p>
              Os artigos salvos na biblioteca, notas de fichamento, classificações de relevância, decisões de triagem PRISMA e preferências de interface são gravados exclusivamente no armazenamento local do navegador do próprio usuário (<code>window.localStorage</code>). O Cartograph não comercializa dados pessoais, não rastreia o histórico privado de leituras do pesquisador e jamais intercepta credenciais de login institucional (senhas CAFe, Shibboleth ou EZProxy), cuja autenticação ocorre diretamente nos servidores das instituições de ensino e editoras.
            </p>
          </div>
        </div>

        {/* 6.5 Isenção de Responsabilidade Científica, Clínica e Jurídica */}
        <div className="bg-[var(--bg-canvas)] rounded-xl p-5 space-y-2 text-xs text-[var(--text-secondary)] leading-relaxed border border-[var(--divider)]">
          <div className="font-semibold text-[var(--text-primary)]">
            5. Termos de Uso e Limitação de Responsabilidade Acadêmica, Clínica e Técnica
          </div>
          <p>
            O Cartograph é fornecido no estado em que se encontra (<em>&ldquo;as is&rdquo;</em>) como instrumento computacional de apoio à pesquisa bibliográfica e sistematização de literatura. As publicações médicas, farmacológicas, biomédicas, jurídicas ou de engenharia localizadas por meio das bases indexadas refletem exclusivamente as conclusões de seus autores originais e destinam-se à investigação acadêmica. Nenhuma informação exibida pelo sistema constitui aconselhamento médico, diagnóstico clínico, prescrição terapêutica, parecer jurídico ou laudo técnico de engenharia. Cabe ao pesquisador verificar a validade metodológica, o status de revisão por pares (preprint vs. artigo publicado) e a eventual retratação das obras antes de citá-las ou aplicá-las.
          </p>
        </div>

        {/* Rodapé Interno de Assinatura Oficial Prism × Cartograph */}
        <div className="pt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-3">
            <PrismMonogram className="h-5 w-auto shrink-0" />
            <span>+</span>
            <PrismPMonogram className="h-4 w-auto shrink-0" />
            <span>
              <strong className="text-[var(--text-primary)]">Cartograph</strong> é um produto oficial projetado e mantido pela <strong className="text-[var(--text-primary)]">Prism</strong>.
            </span>
          </div>
          <span className="font-mono text-[11px]">
            © {currentYear} Prism · Todos os direitos reservados
          </span>
        </div>
      </section>
    </div>
  );
};
