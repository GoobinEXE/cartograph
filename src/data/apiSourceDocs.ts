import type { ApiSourceId } from '../types/academic';
import type { LocalizedText } from '../i18n/localized';

export interface ApiSourceDoc {
  /** Public name of the programming interface. */
  apiName: string;
  organization: string;
  license: LocalizedText;
  scope: LocalizedText;
}

/**
 * Documentation shown in About › APIs. A total Record keyed by ApiSourceId: registering a
 * new federated source without documenting it here fails type-checking.
 */
export const API_SOURCE_DOCS: Record<ApiSourceId, ApiSourceDoc> = {
  openalex: {
    apiName: 'OpenAlex API',
    organization: 'OurResearch',
    license: { pt: 'CC0 1.0 (Domínio Público)', en: 'CC0 1.0 (Public Domain)' },
    scope: {
      pt: 'Mais de 250 milhões de obras científicas, conceitos, grafo de citações e links diretos de PDF em Acesso Aberto.',
      en: 'Over 250 million scholarly works, concepts, citation graphs, and direct Open Access PDF links.',
    },
  },
  semanticscholar: {
    apiName: 'Semantic Scholar Graph API',
    organization: 'Allen Institute for AI (AI2)',
    license: { pt: 'AI2 Open Research Corpus', en: 'AI2 Open Research Corpus' },
    scope: {
      pt: 'Indexação multidisciplinar, métricas de citações influentes, resumos estruturados e localização de PDFs abertos.',
      en: 'Multidisciplinary indexing, influential citation metrics, structured abstracts, and open PDF discovery.',
    },
  },
  pubmed: {
    apiName: 'PubMed / MEDLINE (NCBI Entrez)',
    organization: 'National Library of Medicine (NIH)',
    license: { pt: 'NLM Public Domain / Open', en: 'NLM Public Domain / Open' },
    scope: {
      pt: 'Base biomédica e clínica oficial com resolução de identificadores PMID, PMCID, vocabulário MeSH e textos completos no PMC.',
      en: 'Official biomedical and clinical database with PMID, PMCID, MeSH vocabulary, and PubMed Central full-text resolution.',
    },
  },
  europepmc: {
    apiName: 'Europe PMC REST API',
    organization: 'EMBL-EBI',
    license: { pt: 'EMBL-EBI Open Science', en: 'EMBL-EBI Open Science' },
    scope: {
      pt: 'Literatura europeia e global em ciências da vida, biociências e ensaios clínicos com rastreamento de financiamento.',
      en: 'European and global life sciences literature, biosciences, and clinical trials with funding attribution.',
    },
  },
  arxiv: {
    apiName: 'arXiv API',
    organization: 'Cornell University',
    license: { pt: 'arXiv Open Metadata', en: 'arXiv Open Metadata' },
    scope: {
      pt: 'Repositório primário de preprints em Ciência da Computação, Física, Matemática, Biologia Quantitativa, Estatística e Economia.',
      en: 'Primary preprint repository for Computer Science, Physics, Mathematics, Quantitative Biology, Statistics, and Economics.',
    },
  },
  crossref: {
    apiName: 'Crossref REST API',
    organization: 'Crossref DOI Foundation',
    license: { pt: 'CC0 1.0 (Metadados)', en: 'CC0 1.0 (Metadata)' },
    scope: {
      pt: 'Registro mundial de Digital Object Identifiers (DOIs) e metadados editoriais auditados de periódicos revisados por pares.',
      en: 'Global Digital Object Identifier (DOI) registry and audited publisher metadata for peer-reviewed journals.',
    },
  },
  doaj: {
    apiName: 'DOAJ API v4',
    organization: 'Directory of Open Access Journals',
    license: { pt: 'CC0 / Open Access', en: 'CC0 / Open Access' },
    scope: {
      pt: 'Artigos publicados exclusivamente em periódicos científicos de Acesso Aberto com revisão por pares auditada.',
      en: 'Articles published exclusively in audited, peer-reviewed Open Access scientific journals.',
    },
  },
  zenodo: {
    apiName: 'Zenodo / OpenAIRE API',
    organization: 'CERN',
    license: { pt: 'CERN Open Data / CC', en: 'CERN Open Data / CC' },
    scope: {
      pt: 'Conjuntos de dados empíricos, pacotes de replicação, softwares científicos e relatórios técnicos depositados no CERN.',
      en: 'Empirical datasets, replication packages, scientific software, and technical reports hosted by CERN.',
    },
  },
  hal: {
    apiName: 'HAL Open Science API',
    organization: 'CNRS (França)',
    license: { pt: 'Open Archive France', en: 'Open Archive France' },
    scope: {
      pt: 'Repositório nacional multi-institucional francês com mais de 3,5 milhões de artigos e teses acadêmicas.',
      en: 'French national multi-institutional open repository with over 3.5 million scholarly articles and theses.',
    },
  },
  datacite: {
    apiName: 'DataCite Commons API',
    organization: 'DataCite e.V.',
    license: { pt: 'CC0 1.0 (Domínio Público)', en: 'CC0 1.0 (Public Domain)' },
    scope: {
      pt: 'Consórcio global de DOIs para datasets, repositórios institucionais, OSF Preprints, Dryad e Figshare.',
      en: 'Global DOI consortium covering datasets, institutional repositories, OSF Preprints, Dryad, and Figshare.',
    },
  },
  inspire: {
    apiName: 'INSPIRE-HEP API',
    organization: 'CERN / DESY / Fermilab / SLAC',
    license: { pt: 'CC0 / Open High-Energy Physics', en: 'CC0 / Open High-Energy Physics' },
    scope: {
      pt: 'Literatura internacional de física de altas energias, aceleradores, cosmologia e computação quântica.',
      en: 'International high-energy physics, particle accelerators, cosmology, and quantum computing literature.',
    },
  },
  figshare: {
    apiName: 'Figshare REST API v2',
    organization: 'Digital Science',
    license: { pt: 'CC0 / CC-BY', en: 'CC0 / CC-BY' },
    scope: {
      pt: 'Repositório de dados suplementares, figuras técnicas, scripts de análise e resultados experimentais abertos.',
      en: 'Repository for supplementary datasets, technical figures, analysis scripts, and open experimental outputs.',
    },
  },
  gbif: {
    apiName: 'GBIF Literature API',
    organization: 'Global Biodiversity Information Facility',
    license: { pt: 'CC0 / CC-BY', en: 'CC0 / CC-BY' },
    scope: {
      pt: 'Publicações revisadas por pares que utilizam dados globais de biodiversidade, ecologia e modelagem climática.',
      en: 'Peer-reviewed publications citing global biodiversity, ecology, and climate modeling records.',
    },
  },
  osti: {
    apiName: 'OSTI.GOV API',
    organization: 'U.S. Department of Energy (DOE)',
    license: { pt: 'U.S. Government Open Data', en: 'U.S. Government Open Data' },
    scope: {
      pt: 'Relatórios técnicos, patentes energéticas e resultados de pesquisa dos laboratórios nacionais dos Estados Unidos.',
      en: 'Technical reports, energy patents, and research outputs from U.S. Department of Energy national laboratories.',
    },
  },
  ntrs: {
    apiName: 'NASA NTRS API',
    organization: 'NASA STI Program',
    license: { pt: 'U.S. Government Public Domain', en: 'U.S. Government Public Domain' },
    scope: {
      pt: 'NASA Technical Reports Server com estudos de engenharia aeroespacial, propulsão, ciência planetária e materiais.',
      en: 'NASA Technical Reports Server covering aerospace engineering, propulsion, planetary science, and materials.',
    },
  },
  openaire: {
    apiName: 'OpenAIRE Graph API',
    organization: 'OpenAIRE AMKE (União Europeia)',
    license: { pt: 'CC-BY 4.0', en: 'CC-BY 4.0' },
    scope: {
      pt: 'Grafo europeu de produtos de pesquisa que interliga publicações, datasets, software, financiadores e projetos do Horizonte Europa.',
      en: 'European research graph linking publications, datasets, software, funders, and Horizon Europe projects.',
    },
  },
  osf: {
    apiName: 'OSF Preprints API v2',
    organization: 'Center for Open Science',
    license: { pt: 'CC0 1.0 (metadados)', en: 'CC0 1.0 (metadata)' },
    scope: {
      pt: 'Preprints multidisciplinares hospedados no Open Science Framework, incluindo servidores temáticos mantidos por comunidades científicas.',
      en: 'Multidisciplinary preprints hosted on the Open Science Framework, including subject servers run by research communities.',
    },
  },
  eric: {
    apiName: 'ERIC API',
    organization: 'Institute of Education Sciences (U.S. Department of Education)',
    license: { pt: 'Dados abertos do governo dos EUA', en: 'U.S. Government Open Data' },
    scope: {
      pt: 'Pesquisa em educação: artigos revisados por pares, relatórios técnicos e documentos de política educacional.',
      en: 'Education research: peer-reviewed articles, technical reports, and education policy documents.',
    },
  },
  plos: {
    apiName: 'PLOS Search API',
    organization: 'Public Library of Science',
    license: { pt: 'CC-BY 4.0', en: 'CC-BY 4.0' },
    scope: {
      pt: 'Artigos em Acesso Aberto dos periódicos PLOS em biologia, medicina, saúde pública e ciência multidisciplinar.',
      en: 'Open Access articles from PLOS journals in biology, medicine, public health, and multidisciplinary science.',
    },
  },
  oasisbr: {
    apiName: 'Oasisbr API (VuFind)',
    organization: 'IBICT (Brasil)',
    license: { pt: 'Metadados abertos', en: 'Open metadata' },
    scope: {
      pt: 'Portal brasileiro que agrega repositórios institucionais, revistas científicas e a Biblioteca Digital Brasileira de Teses e Dissertações (BDTD).',
      en: 'Brazilian portal aggregating institutional repositories, scholarly journals, and the Brazilian Digital Library of Theses and Dissertations (BDTD).',
    },
  },
  dataverse: {
    apiName: 'Harvard Dataverse Search API',
    organization: 'Institute for Quantitative Social Science (Harvard)',
    license: { pt: 'CC0 1.0 (padrão dos datasets)', en: 'CC0 1.0 (dataset default)' },
    scope: {
      pt: 'Conjuntos de dados de pesquisa e pacotes de replicação, com ampla cobertura em ciências sociais e economia.',
      en: 'Research datasets and replication packages, with broad coverage of the social sciences and economics.',
    },
  },
  core: {
    apiName: 'CORE API v3',
    organization: 'The Open University / Jisc (Reino Unido)',
    license: { pt: 'Metadados abertos; texto completo sob a licença de cada obra', en: 'Open metadata; full text under each work\'s license' },
    scope: {
      pt: 'Agregador de artigos em Acesso Aberto coletados de repositórios e periódicos do mundo inteiro, com links para o texto completo. Aceita chave própria opcional para cota maior.',
      en: 'Aggregator of Open Access articles harvested from repositories and journals worldwide, with full-text links. Accepts an optional personal key for a higher quota.',
    },
  },
  worldbank_wds: {
    apiName: 'World Bank Documents & Reports API',
    organization: 'Grupo Banco Mundial',
    license: { pt: 'CC-BY 3.0 IGO (maioria dos documentos)', en: 'CC-BY 3.0 IGO (most documents)' },
    scope: {
      pt: 'Relatórios de projetos, documentos de política e estudos econômicos do Banco Mundial.',
      en: 'World Bank project reports, policy documents, and economic studies.',
    },
  },
  worldbank_okr: {
    apiName: 'World Bank Open Knowledge Repository (DSpace 7)',
    organization: 'Grupo Banco Mundial',
    license: { pt: 'CC-BY 3.0 IGO', en: 'CC-BY 3.0 IGO' },
    scope: {
      pt: 'Publicações formais, working papers e livros do Banco Mundial em Acesso Aberto.',
      en: 'World Bank formal publications, working papers, and Open Access books.',
    },
  },
  socarxiv: {
    apiName: 'SocArXiv (OSF API)',
    organization: 'Center for Open Science / University of Maryland',
    license: { pt: 'CC0 1.0 (metadados)', en: 'CC0 1.0 (metadata)' },
    scope: {
      pt: 'Preprints em ciências sociais, economia, direito e políticas públicas.',
      en: 'Preprints in the social sciences, economics, law, and public policy.',
    },
  },
  ipea: {
    apiName: 'RCIpea (DSpace 7)',
    organization: 'Instituto de Pesquisa Econômica Aplicada (Ipea)',
    license: { pt: 'Licença indicada em cada documento', en: 'License stated on each document' },
    scope: {
      pt: 'Textos para discussão, notas técnicas e livros do Ipea sobre economia e políticas públicas no Brasil.',
      en: 'Ipea discussion papers, technical notes, and books on the Brazilian economy and public policy.',
    },
  },
  undl: {
    apiName: 'UN Digital Library',
    organization: 'Dag Hammarskjöld Library (Nações Unidas)',
    license: { pt: 'Termos de uso das Nações Unidas', en: 'United Nations terms of use' },
    scope: {
      pt: 'Documentos oficiais, resoluções, relatórios e publicações do sistema das Nações Unidas.',
      en: 'Official documents, resolutions, reports, and publications of the United Nations system.',
    },
  },
  scopus: {
    apiName: 'Scopus Search API',
    organization: 'Elsevier',
    license: { pt: 'Termos da Elsevier; exige chave própria (BYOK)', en: 'Elsevier terms; requires your own key (BYOK)' },
    scope: {
      pt: 'Índice multidisciplinar de resumos e citações de periódicos, livros e anais revisados por pares.',
      en: 'Multidisciplinary abstract and citation index of peer-reviewed journals, books, and proceedings.',
    },
  },
  sciencedirect: {
    apiName: 'ScienceDirect Search API',
    organization: 'Elsevier',
    license: { pt: 'Termos da Elsevier; exige chave própria (BYOK)', en: 'Elsevier terms; requires your own key (BYOK)' },
    scope: {
      pt: 'Periódicos e livros de texto completo publicados pela Elsevier.',
      en: 'Full-text journals and books published by Elsevier.',
    },
  },
  ieeexplore: {
    apiName: 'IEEE Xplore API',
    organization: 'IEEE',
    license: { pt: 'Termos do IEEE; exige chave própria (BYOK)', en: 'IEEE terms; requires your own key (BYOK)' },
    scope: {
      pt: 'Artigos, anais e normas técnicas em engenharia elétrica, eletrônica e computação.',
      en: 'Articles, proceedings, and standards in electrical engineering, electronics, and computing.',
    },
  },
  springer: {
    apiName: 'Springer Nature Open Access API',
    organization: 'Springer Nature',
    license: { pt: 'Termos da Springer Nature; exige chave própria (BYOK)', en: 'Springer Nature terms; requires your own key (BYOK)' },
    scope: {
      pt: 'Artigos e capítulos em Acesso Aberto do portfólio Springer Nature, incluindo BMC e Nature Communications.',
      en: 'Open Access articles and chapters from the Springer Nature portfolio, including BMC and Nature Communications.',
    },
  },
  lens: {
    apiName: 'Lens Scholarly API',
    organization: 'Cambia (Austrália)',
    license: { pt: 'Termos da Lens.org; exige token próprio (BYOK)', en: 'Lens.org terms; requires your own token (BYOK)' },
    scope: {
      pt: 'Grafo de literatura acadêmica conectado a patentes, aplicado a estudos de inovação e transferência tecnológica.',
      en: 'Scholarly literature graph linked to patents, applied to innovation and technology-transfer studies.',
    },
  },
  fedinprint: {
    apiName: 'Fed in Print API',
    organization: 'Federal Reserve System (EUA)',
    license: { pt: 'Termos do Federal Reserve; exige chave própria (BYOK)', en: 'Federal Reserve terms; requires your own key (BYOK)' },
    scope: {
      pt: 'Publicações de pesquisa econômica do Federal Reserve Board e dos bancos regionais do sistema.',
      en: 'Economic research publications from the Federal Reserve Board and the regional Reserve Banks.',
    },
  },
  govinfo: {
    apiName: 'Congress.gov API',
    organization: 'Library of Congress (EUA)',
    license: { pt: 'Dados públicos do governo dos EUA; exige chave própria (BYOK)', en: 'U.S. Government public data; requires your own key (BYOK)' },
    scope: {
      pt: 'Projetos de lei e tramitação legislativa no Congresso dos Estados Unidos.',
      en: 'Bills and legislative actions in the United States Congress.',
    },
  },
};
