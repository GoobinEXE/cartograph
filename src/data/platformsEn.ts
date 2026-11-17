import { proseLanguage } from '../i18n/localized';
import { SupportedLanguage } from '../i18n/translations';
import { PlatformConfig } from '../types/academic';

export interface PlatformEnTranslation {
  shortTag: string;
  description: string;
  coverageNote: string;
}

export const PLATFORM_TRANSLATIONS_EN: Record<string, PlatformEnTranslation> = {
  scholar: {
    shortTag: 'Global Indexer',
    description: 'Comprehensive indexing of peer-reviewed articles, theses, books, and case law.',
    coverageNote: 'Multidisciplinary (~380M+ documents)',
  },
  openalex: {
    shortTag: 'Open Catalog',
    description: '100% open bibliographic database succeeding Microsoft Academic Graph, with Open Access tracking.',
    coverageNote: 'Multidisciplinary (250M+ indexed works)',
  },
  semanticscholar: {
    shortTag: 'Allen Institute AI',
    description: 'Academic search engine by Allen Institute for AI (AI2) with TL;DR summaries and influential citation metrics.',
    coverageNote: 'Computer Science, Biomedical, Social Sciences (215M+ papers)',
  },
  arxiv: {
    shortTag: 'STEM & AI Preprints',
    description: 'Primary preprint repository for Computer Science, Physics, Mathematics, Statistics, and Economics.',
    coverageNote: 'STEM, Machine Learning, Quantitative Finance (2.4M+ full PDFs)',
  },
  crossref: {
    shortTag: 'Official DOI Agency',
    description: 'Official DOI registration database for major international scientific publishers.',
    coverageNote: 'Peer-reviewed journals, proceedings, and chapters (150M+ records)',
  },
  doaj: {
    shortTag: 'Open Access Journals',
    description: 'Global directory of open access peer-reviewed scientific journals.',
    coverageNote: '100% validated Open Access (20,000+ journals, 10M+ articles)',
  },
  core: {
    shortTag: 'OA Full-Text Aggregator',
    description: 'Global aggregator of university and institutional repositories focused on open full-text PDFs.',
    coverageNote: 'Global institutional repositories (300M+ metadata, 40M+ full-text)',
  },
  base: {
    shortTag: 'Academic Repositories',
    description: 'Operated by Bielefeld University Library; indexes over 11,000 verified scientific sources.',
    coverageNote: 'Multidisciplinary (340M+ documents, 60% open access)',
  },
  worldwidescience: {
    shortTag: 'National Science Agencies',
    description: 'Global science gateway maintained by US DOE/OSTI integrating national and government databases.',
    coverageNote: 'Energy, Engineering, Public Policy, Natural Sciences',
  },
  zenodo: {
    shortTag: 'Papers, Datasets & Code',
    description: 'Open repository operated by CERN (OpenAIRE) for papers, replication packages, datasets, and scientific code.',
    coverageNote: 'Multidisciplinary, Open Data, and Reproducibility (4M+ records)',
  },
  hal: {
    shortTag: 'European Open Archive',
    description: 'Public multidisciplinary repository maintained by CNRS (France) with full texts from universities and institutes.',
    coverageNote: 'Exact Sciences, Humanities, Life Sciences, Engineering (3.5M+ works)',
  },
  datacite: {
    shortTag: 'Data & Preprint DOIs',
    description: 'Global DataCite catalog integrating OSF Preprints, Figshare, Dryad, and empirical datasets.',
    coverageNote: 'Scientific datasets, preprints, and technical reports (60M+ DOIs)',
  },
  repec: {
    shortTag: 'Economics & Public Policy',
    description: 'Largest open bibliographic database for Economics, Econometrics, Finance, and Policy Evaluation (Fed St. Louis).',
    coverageNote: 'Economics and Public Policy (4.7M+ working papers and articles)',
  },
  ssrn: {
    shortTag: 'Law, Economics & Management',
    description: 'Global network of preprints and working papers in Applied Social Sciences, Law, Economics, Governance, and Finance.',
    coverageNote: 'Social Sciences, Law, and Regulation (1.4M+ papers)',
  },
  dblp: {
    shortTag: 'CS & AI (Schloss Dagstuhl)',
    description: 'World reference bibliography in Computer Science, Artificial Intelligence, Systems, and Software Engineering.',
    coverageNote: 'Conferences (NeurIPS, ICML, IEEE, ACM) and journals (7.5M+ records)',
  },
  lens: {
    shortTag: 'Papers + Global Patents',
    description: 'Open platform linking peer-reviewed scientific literature to industrial patent citations and policy.',
    coverageNote: 'Innovation, R&D, Biotechnology, and Engineering (250M+ works)',
  },
  iascholar: {
    shortTag: 'Full-Text PDF Preservation',
    description: 'Index of over 35 million research papers and conference proceedings preserved as open PDFs by Internet Archive.',
    coverageNote: 'Historical and contemporary scientific literature in free PDF',
  },
  philpapers: {
    shortTag: 'Philosophy, Ethics & Cognition',
    description: 'Curated academic directory for Philosophy, Epistemology, Cognitive Science, Logic, and AI Ethics.',
    coverageNote: 'Humanities, Ethics, and Foundations of Science (2.8M+ entries)',
  },
  eric: {
    shortTag: 'Education & Pedagogy',
    description: 'World’s largest digital library of education research, learning, pedagogy, and education policy (US Dept. of Education).',
    coverageNote: 'Education, Teaching, and Educational Psychology (1.7M+ records)',
  },
  chemrxiv: {
    shortTag: 'Chemistry & Materials Preprints',
    description: 'International preprint server for Chemistry, Nanotechnology, Chemical Engineering, and Materials Science.',
    coverageNote: 'Chemistry, Materials, and Catalysis in open access',
  },
  osf: {
    shortTag: 'Open Science & Reproducibility',
    description: 'International meta-repository integrating PsyArXiv, SocArXiv, LawArXiv, MetaArXiv, and empirical preregistrations.',
    coverageNote: 'Open Science, Replication, Psychology, Social Sciences (30+ servers)',
  },
  wos: {
    shortTag: 'Global Scientometric Standard',
    description: 'Premier bibliographic and scientometric citation index (Science Citation Index, JCR, and Impact Factor).',
    coverageNote: 'Rigorously indexed multidisciplinary catalog (85M+ articles, 21,000 journals)',
  },
  scopus: {
    shortTag: 'Largest Abstract & Citation DB',
    description: 'World’s largest abstract and citation database of peer-reviewed literature with CiteScore metrics and percentiles.',
    coverageNote: 'STEM, Medicine, and Social Sciences (90M+ records, 27,000 journals)',
  },
  ieeexplore: {
    shortTag: 'Electrical Eng & Computing',
    description: 'Global gold standard for Electrical Engineering, Electronics, Telecommunications, Robotics, AI, and Computer Systems.',
    coverageNote: 'Over 6 million papers, IEEE standards, and global conference proceedings',
  },
  sciencedirect: {
    shortTag: 'Elsevier Full-Text Platform',
    description: 'Elsevier’s flagship scientific journal platform, including The Lancet, Cell, and leading journals across disciplines.',
    coverageNote: 'Over 19 million full-text articles across 2,500 leading journals',
  },
  springer: {
    shortTag: 'Springer Nature Group',
    description: 'Home to high-impact international journals from Springer Nature Group, including Nature and LNCS proceedings.',
    coverageNote: 'Over 15 million articles, academic books, and lab protocols',
  },
  acmdl: {
    shortTag: 'Core Computer Science',
    description: 'Official Association for Computing Machinery catalog featuring seminal papers in Computing, AI, Networks, and Theory.',
    coverageNote: 'SIGGRAPH, SIGCHI, and foundational Computing journals',
  },
  wiley: {
    shortTag: 'International Publisher',
    description: 'One of the world’s oldest and most established academic publishers in Chemistry, Health Sciences, Physics, and Economics.',
    coverageNote: 'Over 1,600 high-impact scientific journals and 8M+ articles',
  },
  jstor: {
    shortTag: 'Global Humanities & Socials',
    description: 'Core digital archive in Humanities, History, Philosophy, Economics, Political Science, and Literature.',
    coverageNote: 'Over 12 million journal articles, books, and historical primary sources',
  },
  taylorfrancis: {
    shortTag: 'Social, Humanities & Tech',
    description: 'International publisher in Social Sciences, International Relations, Education, Public Policy, and Engineering.',
    coverageNote: 'Over 2,700 peer-reviewed academic journals and 4.5M+ articles',
  },
  oxfordacademic: {
    shortTag: 'Oxford University Press',
    description: 'High-impact peer-reviewed publications from Oxford University Press in Law, Economics, Medicine, and Humanities.',
    coverageNote: 'Over 500 high-impact journals and 3M+ articles',
  },
  cambridgecore: {
    shortTag: 'Cambridge University Press',
    description: 'World’s oldest university press with peer-reviewed collections in Humanities, Exact Sciences, and Life Sciences.',
    coverageNote: 'Over 400 journals and 45,000 academic books from Cambridge University Press',
  },
  sage: {
    shortTag: 'Social Sciences & Health',
    description: 'Publisher specializing in Research Methodology, Social Research, Psychology, Behavioral Health, and Management.',
    coverageNote: 'Over 1,100 international scientific society journals',
  },
  proquest: {
    shortTag: 'Global Dissertations (Clarivate)',
    description: 'World’s largest collection of master’s theses and doctoral dissertations; official US Library of Congress repository.',
    coverageNote: 'Over 5.5 million graduate theses defended across 100+ countries',
  },
  dimensions: {
    shortTag: 'Global Research Intelligence',
    description: 'Linked research database connecting articles, research grants, clinical trials, and industrial patents.',
    coverageNote: 'Over 145 million publications with impact and citation indicators',
  },
  scielo: {
    shortTag: 'Latin America & Brazil',
    description: 'Electronic library of Brazilian, Latin American, and Iberian scientific journals in full open access.',
    coverageNote: 'Brazil, Latin America, Portugal, Spain, and South Africa',
  },
  capes: {
    shortTag: 'MEC / Brazil',
    description: 'Official Brazilian academic portal integrating open and institutional subscription databases (via CAFe).',
    coverageNote: 'Over 49,000 journals and major international reference databases',
  },
  bdtd: {
    shortTag: 'Brazilian Theses & Dissertations',
    description: 'Brazilian Digital Library of Theses and Dissertations defended in graduate programs nationwide.',
    coverageNote: 'Over 900,000 full-text theses and dissertations free to access',
  },
  oasisbr: {
    shortTag: 'BR Repositories + Research Data',
    description: 'Brazilian portal of open access scientific publications and research data from universities and institutes.',
    coverageNote: 'Brazilian scientific output and research data repositories',
  },
  redalyc: {
    shortTag: 'LatAm Diamond Open Access',
    description: 'Network of Diamond Open Access scientific journals from Latin America, the Caribbean, Spain, and Portugal.',
    coverageNote: 'Social Sciences, Humanities, Public Policy, and Multidisciplinary',
  },
  lareferencia: {
    shortTag: 'LatAm Open Science Network',
    description: 'Federated network of institutional repositories across 12 Latin American countries and Spain.',
    coverageNote: 'Over 4.5 million Latin American articles, theses, and reports',
  },
  dialnet: {
    shortTag: 'Ibero-American Portal',
    description: 'One of the largest Spanish and Portuguese bibliographic databases in Humanities, Law, and Social Sciences.',
    coverageNote: 'Over 9 million academic documents and 12,000 journals',
  },
  rcaap: {
    shortTag: 'Lusophone Repositories',
    description: 'Official portal of Open Access Scientific Repositories of Portugal (FCT/FCCN) integrated with Brazil.',
    coverageNote: 'Universities and research centers across Portugal and Lusophone world',
  },
  spell: {
    shortTag: 'Public Admin & Management',
    description: 'Brazilian electronic library maintained by ANPAD focused on Public Administration, Management, Economics, and Accounting.',
    coverageNote: 'Peer-reviewed Brazilian journals in Management and Public Policy',
  },
  pubmed: {
    shortTag: 'Biomedical Gold Standard',
    description: 'Official US National Library of Medicine database covering MEDLINE, life sciences, and clinical trials.',
    coverageNote: 'Medicine, Public Health, Biology, Neuroscience (37M+ citations)',
  },
  europepmc: {
    shortTag: 'EMBL-EBI Open Full-Text',
    description: 'European life sciences repository linked to PubMed with millions of free full-text articles.',
    coverageNote: 'Biomedicine, Pharmacology, Genomics, and Global Health',
  },
  cochrane: {
    shortTag: 'Systematic Reviews',
    description: 'Global gold standard for systematic reviews, meta-analyses, and controlled clinical trials.',
    coverageNote: 'Evidence-Based Healthcare and Health Technology Assessment',
  },
  lilacs: {
    shortTag: 'Latin American Health',
    description: 'BIREME/PAHO/WHO bibliographic index for health sciences and public health in Latin America.',
    coverageNote: 'Public Health, Epidemiology, Nursing, Tropical Medicine',
  },
  epistemonikos: {
    shortTag: 'Evidence Matrices & SRs',
    description: 'Multilingual collaborative database of health evidence and policy, specialized in systematic reviews.',
    coverageNote: 'Over 500,000 linked systematic reviews and primary studies',
  },
  clinicaltrials: {
    shortTag: 'Global Clinical Trials',
    description: 'Official US National Library of Medicine registry of interventional and observational clinical studies.',
    coverageNote: 'Over 490,000 clinical study protocols and results across 220 countries',
  },
  medrxiv: {
    shortTag: 'Health & Biology Preprints',
    description: 'Preprint servers operated by Cold Spring Harbor Laboratory, Yale, and BMJ for medical and biological sciences.',
    coverageNote: 'Epidemiology, Clinical Research, Genetics, and Neuroscience in open access',
  },
  consensus: {
    shortTag: 'AI Evidence Consensus',
    description: 'Academic AI search engine aggregating direct findings from papers indexed in Semantic Scholar.',
    coverageNote: 'Evidence synthesis with consensus meter (Yes/No/Possibly)',
  },
  elicit: {
    shortTag: 'AI Structured Review',
    description: 'Extracts methodology tables, sample size, interventions, and outcomes from scientific papers.',
    coverageNote: 'Automated systematic review workflows across 125M+ papers',
  },
  scite: {
    shortTag: 'Smart Citations',
    description: 'Classifies citation context indicating whether subsequent studies support or contrast the finding.',
    coverageNote: 'Over 1.2 billion citation statements analyzed',
  },
  scispace: {
    shortTag: 'AI Literature Matrix',
    description: 'Semantic search generating comparative columns for results, limitations, and methodology.',
    coverageNote: 'Multidisciplinary (280M+ indexed papers)',
  },
  perplexity_academic: {
    shortTag: 'Academic Web Synthesis',
    description: 'Synthesized answers with numbered citations restricted to peer-reviewed papers and preprints.',
    coverageNote: 'Rapid synthesis with direct DOI and PDF links',
  },
  connectedpapers: {
    shortTag: 'Co-Citation Graph',
    description: 'Builds bibliographic similarity graphs to identify seminal prior works and derivative studies.',
    coverageNote: 'Topological scientific cluster mapping from a seed paper',
  },
  openknowledgemaps: {
    shortTag: '100% Free Visual Map',
    description: 'Groups the top 100 most relevant papers from BASE or PubMed into open-access thematic visual clusters.',
    coverageNote: 'Open visual interface with zero usage limits or paywalls',
  },
  litmaps: {
    shortTag: 'Timeline & Citation Network',
    description: 'Visualizes citation connections along a chronological X-axis and citation impact on the Y-axis.',
    coverageNote: 'Chronological mapping of scientific field evolution',
  },
  huggingface: {
    shortTag: 'AI Papers & Community',
    description: 'Daily feed of community-upvoted AI papers linked with discussions, models, and benchmarks.',
    coverageNote: 'Machine Learning, LLMs, Computer Vision, and Neural Architectures',
  },
  paperswithcode: {
    shortTag: 'Papers + SOTA Code',
    description: 'Links AI research papers directly to open-source GitHub repositories and SOTA leaderboards.',
    coverageNote: 'Machine Learning, Deep Learning, Natural Language Processing',
  },
  openreview: {
    shortTag: 'Open AI Peer Review',
    description: 'Public submissions and peer reviews from major AI conferences (ICLR, NeurIPS, ICML, CoRL).',
    coverageNote: 'Transparent reviews, author rebuttals, and submission metadata',
  },
  aclanthology: {
    shortTag: 'Computational Linguistics & NLP',
    description: 'Open digital archive of reference in Natural Language Processing and AI (ACL, EMNLP, NAACL, COLING).',
    coverageNote: 'Over 90,000 full-text NLP and computational linguistics papers',
  },
  googlepatents: {
    shortTag: 'Global Patents',
    description: 'Worldwide patent indexer covering USPTO, EPO, WIPO, JPO, and INPI with full technical claims.',
    coverageNote: 'Over 120 million patent publications across 100+ patent offices',
  },
  wipo: {
    shortTag: 'UN Intellectual Property',
    description: 'Official international PCT patent portal of the World Intellectual Property Organization (UN).',
    coverageNote: 'International patented technology and PCT filings (110M+ documents)',
  },
  mittechreview: {
    shortTag: 'MIT Tech Analysis',
    description: 'Scientific journalism and deep-dive MIT reports on disruptive tech, chips, biotech, and AI.',
    coverageNote: 'Frontier technology reports and 10 Breakthrough Technologies',
  },
  biorxiv: {
    shortTag: 'Biology & Life Sciences',
    description: 'Cold Spring Harbor Laboratory server for preprints in molecular biology, genetics, neuroscience, and bioinformatics.',
    coverageNote: 'Biomedical research and advanced biology in open access',
  },
  getty: {
    shortTag: 'Art History & Archives',
    description: 'Over 150,000 rare digitized volumes and publications in art history, architecture, and aesthetic theory.',
    coverageNote: 'Rare works, inventories, and visual literature from global institutes',
  },
  smithsonian: {
    shortTag: 'Collections & Open Science',
    description: 'Over 4.5 million 2D and 3D records, historical artifacts, art, and specimens under CC0 public domain license.',
    coverageNote: '19 Smithsonian museums, research centers, and national zoo',
  },
  metmuseum: {
    shortTag: 'Art & MetPublications',
    description: 'Collection of over 490,000 artworks and critical curatorial essays from The Met (New York).',
    coverageNote: 'Historical exhibition catalogs, monographs, and art collections',
  },
  aiga: {
    shortTag: 'Graphic Design & Typography',
    description: 'Historical repository of visual design excellence, typography, brand identity, and interaction design since 1924.',
    coverageNote: 'Award-winning design collection and AIGA archive records',
  },
  digra: {
    shortTag: 'Game Studies & Ludology',
    description: 'Digital Games Research Association academic library, the premier international reference for digital game research.',
    coverageNote: 'Full peer-reviewed papers from DiGRA world conferences and chapters',
  },
  gamestudies: {
    shortTag: 'Pioneering Game Journal',
    description: 'First international peer-reviewed academic journal dedicated to computer game aesthetics, culture, and theory.',
    coverageNote: 'Game theory, ludic design, semiotics, and video game sociology',
  },
  gdcvault: {
    shortTag: 'GDC Technical Talks',
    description: 'Game Developers Conference technical repository covering physics, game AI, audio, and shaders.',
    coverageNote: 'Talks by leading developers and industry post-mortems',
  },
  ieeetog: {
    shortTag: 'Game Engineering & AI',
    description: 'Leading IEEE scientific journal on computational intelligence, graphics rendering, and physics simulation in games.',
    coverageNote: 'Procedural modeling, real-time AI agents, and engine architecture',
  },
  github: {
    shortTag: 'Open Source & Repositories',
    description: 'Search software implementations, academic libraries, frameworks, and paper companion code on GitHub.',
    coverageNote: 'Millions of open-source repositories and replication codebases',
  },
  softwareheritage: {
    shortTag: 'Universal Source Code Archive',
    description: 'UNESCO and Inria initiative preserving humanity’s software source code with persistent identifiers (SWHID).',
    coverageNote: 'Over 18 billion source files and 3 billion archived commits',
  },
  sigsoft: {
    shortTag: 'Frontier Software Eng',
    description: 'Premier ACM publications in software architecture, empirical testing, refactoring, and formal verification.',
    coverageNote: 'ICSE, FSE, ASE, ISSTA conferences and ACM TOSEM journals',
  },
  wikichip: {
    shortTag: 'Semiconductors & Microarch',
    description: 'Encyclopedia of microarchitecture, lithography process nodes (TSMC, Intel, Samsung), ISAs, and die shots.',
    coverageNote: 'x86, ARM, RISC-V, EUV lithography, interconnects, and accelerators',
  },
  ieeemicro: {
    shortTag: 'Processor Architecture',
    description: 'IEEE technical magazine covering breakthroughs in microprocessors, cache hierarchies, accelerators, and silicon security.',
    coverageNote: '"Top Picks in Computer Architecture" special issues and ISA design',
  },
  hotchips: {
    shortTag: 'High-Performance Chips Symp',
    description: 'Engineering presentations on the world’s most advanced commercial microprocessors, GPUs, and AI ASICs.',
    coverageNote: 'Architecture slide decks and whitepapers from Nvidia, AMD, Apple, Intel, Google TPU',
  },
  arxivhardware: {
    shortTag: 'Architecture & Silicon Preprints',
    description: 'Cornell University preprint archive dedicated to computer architecture, FPGA acceleration, ICs, and memory systems.',
    coverageNote: 'cs.AR, eess.SP, and neuromorphic/quantum computing',
  },
  espacenet: {
    shortTag: 'European & Global Patents',
    description: 'Official European Patent Office database with 150M+ patent documents across 100+ jurisdictions and CPC classes.',
    coverageNote: 'Global patents, INPADOC families, and Cooperative Patent Classification',
  },
  uspto_patents: {
    shortTag: 'Official US Patents',
    description: 'Official search system for granted patents and published applications by the US Patent and Trademark Office.',
    coverageNote: 'US patents, technological citations, and claims',
  },
  inpi: {
    shortTag: 'Brazilian Industrial Property',
    description: 'Search portal of Brazil’s National Institute of Industrial Property for patents, utility models, and software filings.',
    coverageNote: 'BR patent filings, granted patents, and industrial designs',
  },
  ietf_rfc: {
    shortTag: 'Open Internet Standards',
    description: 'Official repository of Internet technical specifications (RFCs and Internet-Drafts) for networking, crypto, HTTP/QUIC, and security.',
    coverageNote: 'Normative RFCs, protocol standards, and engineering drafts',
  },
  nist_nvd: {
    shortTag: 'NIST Standards & Cybersecurity',
    description: 'Technical publications from NIST (SP 800, cryptography, AI benchmarks) and National Vulnerability Database CVE search.',
    coverageNote: 'NIST standards, post-quantum cryptography, and CVE vulnerability database',
  },
  usenix: {
    shortTag: 'OS & Systems Security',
    description: 'Open-access proceedings of USENIX conferences (OSDI, NSDI, FAST, USENIX Security) in distributed systems and security.',
    coverageNote: 'Open full-text PDF papers on systems, networking, and security',
  },
  saemobilus: {
    shortTag: 'Automotive & Aerospace Eng',
    description: 'SAE International technical library featuring industrial standards, technical reports, and mobility engineering papers.',
    coverageNote: 'SAE AS/J standards, propulsion, autonomous vehicles, and materials',
  },
  ostigov: {
    shortTag: 'Energy, Physics & Supercomputing',
    description: 'Official US Department of Energy repository with 3M+ technical reports, software, and datasets from national labs.',
    coverageNote: 'Integrated proxy API; Oak Ridge, Fermilab, Argonne, and clean energy',
  },
  nasantrs: {
    shortTag: 'Aerospace Technical Reports',
    description: 'NASA Technical Reports Server with open access to aerospace engineering, propulsion, avionics, and planetary science.',
    coverageNote: 'Integrated proxy API; NASA technical documents and space missions',
  },
  nasaads: {
    shortTag: 'Astrophysics & Space Science',
    description: 'Astrophysics Data System operated by Harvard/Smithsonian CfA for astronomy, astrophysics, heliophysics, and planetary science.',
    coverageNote: 'Over 15 million astronomy, physics, and telescope records',
  },
  inspirehep: {
    shortTag: 'High-Energy Physics',
    description: 'Scientific platform operated by CERN, DESY, Fermilab, and SLAC for particle physics, accelerators, and quantum computing.',
    coverageNote: 'Open API integrated into metasearch; HEP citations and preprints',
  },
  pubchem: {
    shortTag: 'Molecular Chemistry & Compounds',
    description: 'Largest open chemical information resource at NIH, indexing molecules, structures, spectra, and bioassays.',
    coverageNote: 'Chemical compounds, substances, chemical patents, and toxicology',
  },
  chembl: {
    shortTag: 'Medicinal Chemistry & Bioactivity',
    description: 'Database curated by EMBL-EBI with bioactive molecules, pharmacological targets, and preclinical screening data.',
    coverageNote: 'Ligand-target interactions, pharmacological assays, and approved drugs',
  },
  gbif: {
    shortTag: 'Global Biodiversity',
    description: 'Open intergovernmental network of biodiversity data, species occurrences, and peer-reviewed ecology literature.',
    coverageNote: 'Literature API integrated into metasearch; georeferenced records',
  },
  figshare: {
    shortTag: 'Research Data & Replication',
    description: 'Open repository for research data, experimental datasets, replication scripts, figures, and supplements with persistent DOIs.',
    coverageNote: 'Open API integrated into metasearch; datasets and supplementary files',
  },
  dryad: {
    shortTag: 'Curated Empirical Datasets',
    description: 'Curated repository of scientific datasets linked to peer-reviewed articles in evolutionary biology, ecology, health, and earth sciences.',
    coverageNote: 'Curated CC0 raw data linked directly to peer-reviewed journals',
  },
  bdpa_embrapa: {
    shortTag: 'Agri-Tech & Climate Research',
    description: 'Embrapa Agricultural Research Database offering open scientific literature on tropical agronomy, biotech, soils, and sustainability.',
    coverageNote: 'Technical bulletins, articles, theses, and Brazilian agri-environmental data',
  },
  cordis_eu: {
    shortTag: 'EU R&D Projects & Deliverables',
    description: 'Official European Commission portal with results, technical deliverables, and reports from Horizon Europe and Horizon 2020.',
    coverageNote: 'European R&D consortia, technological innovation, and public deliverables',
  },
  pangaea: {
    shortTag: 'Climate Data & Oceanography',
    description: 'Certified German repository (AWI/MARUM) for publishing and accessing georeferenced Earth, climate, and ocean data.',
    coverageNote: 'Climate time series, oceanography, and paleoclimatology with DOIs',
  },
  noaa_ir: {
    shortTag: 'Atmosphere, Climate & Oceans',
    description: 'Scientific library of the National Oceanic and Atmospheric Administration with technical reports, climate forecasts, and marine research.',
    coverageNote: 'Meteorology, fisheries, remote sensing, and NOAA technical reports',
  },
  eartharxiv: {
    shortTag: 'Geosciences Preprints',
    description: 'Community open preprint server dedicated to geology, geophysics, hydrology, planetary sciences, and climate change.',
    coverageNote: 'Reviewable preprints from the international Earth science community',
  },
  materials_project: {
    shortTag: 'Materials Science & Batteries',
    description: 'Lawrence Berkeley National Laboratory platform providing computed quantum properties of inorganic materials, crystals, and batteries.',
    coverageNote: 'Crystal structures, bandgaps, electrodes, and phase diagrams',
  },
  iaea_inis: {
    shortTag: 'Nuclear Physics & Isotopes',
    description: 'International Nuclear Information System by IAEA covering peaceful literature on fusion, reactors, and radiation protection.',
    coverageNote: 'Over 4.8 million nuclear science and technology records',
  },
  ncbi_geo: {
    shortTag: 'Genomics & Transcriptomics',
    description: 'Public NIH/NCBI repository for experimental gene expression data, RNA-Seq, microarrays, and functional epigenomics.',
    coverageNote: 'GSE series, GSM samples, and sequencing platforms',
  },
  uniprot: {
    shortTag: 'Proteomics & Sequences',
    description: 'International consortium (EMBL-EBI, SIB, PIR) with functional annotations and manually curated protein sequences (Swiss-Prot).',
    coverageNote: 'Protein sequences, structural domains, and gene ontology',
  },
  rcsb_pdb: {
    shortTag: '3D Molecular Structures',
    description: 'Global archive of 3D structures of biological macromolecules resolved via crystallography, cryo-EM, and NMR.',
    coverageNote: '3D atomic coordinates of proteins, nucleic acids, and complexes',
  },
  nber: {
    shortTag: 'Econometrics & Macroeconomics',
    description: 'National Bureau of Economic Research working paper series, benchmark in empirical economics, causal inference, and policy.',
    coverageNote: 'Working papers by affiliated researchers in the US and worldwide',
  },
  worldbank_okr: {
    shortTag: 'Development & Public Policy',
    description: 'Official World Bank repository with impact evaluation reports, economic studies, sector data, and global public policy.',
    coverageNote: 'Policy Research Working Papers, global reports, and microdata',
  },
  ipea: {
    shortTag: 'Brazilian Public Policy',
    description: 'Institutional repository of Brazil’s Institute for Applied Economic Research covering macroeconomics, labor, health, and infrastructure.',
    coverageNote: 'Discussion Papers (TD), technical books, and public policy briefs',
  },
  openaire: {
    shortTag: 'European Open Science Graph',
    description: 'European Open Science infrastructure linking publications, datasets, research software, and funded projects.',
    coverageNote: 'Over 180 million bibliographic records linked to EOSC',
  },
  plos: {
    shortTag: 'Peer-Reviewed Open Access',
    description: 'Suite of peer-reviewed Open Access journals including PLOS ONE, PLOS Medicine, and PLOS Computational Biology.',
    coverageNote: 'Multidisciplinary and biomedical papers with open XML and data',
  },
  dataverse: {
    shortTag: 'Datasets & Empirical Replication',
    description: 'Open repository for research datasets, statistical code, and replication packages across Social Sciences and STEM.',
    coverageNote: 'Empirical microdata, R/Stata/Python scripts, and DOI metadata',
  },
  worldbank_wds: {
    shortTag: 'Working Papers & Global Projects',
    description: 'Official World Bank Group archive of Policy Research Working Papers, project evaluations, and economic reports.',
    coverageNote: 'Global technical reports with direct open-access PDF links',
  },
  socarxiv: {
    shortTag: 'Social & Political Science Preprints',
    description: 'Open archive dedicated to preprints and working papers in Sociology, Political Science, Political Economy, and Education.',
    coverageNote: 'Hosted on OSF with community moderation and immediate DOIs',
  },
  undl: {
    shortTag: 'UN Official Documents & Reports',
    description: 'Official United Nations bibliographic repository containing resolutions, UNDP/UNCTAD studies, and development reports.',
    coverageNote: 'Multilingual open-access UN multilateral documentation',
  },
  imf_elibrary: {
    shortTag: 'Macroeconomics & Finance (IMF)',
    description: 'International Monetary Fund digital library with World Economic Outlook series, IMF Working Papers, and country reports.',
    coverageNote: 'Monetary policy, sovereign debt, exchange rates, and financial stability',
  },
  oecd_ilibrary: {
    shortTag: 'OECD Indicators & Policy',
    description: 'OECD analytical platform with books, periodicals, country reviews, and comparative public policy statistics.',
    coverageNote: 'Education (PISA), taxation, labor markets, and public governance',
  },
  cepal: {
    shortTag: 'Latin America Development (ECLAC)',
    description: 'Digital repository of the UN Economic Commission for Latin America and the Caribbean covering fiscal and industrial studies.',
    coverageNote: 'Full collection since 1948 in English, Spanish, and Portuguese',
  },
  apsa_preprints: {
    shortTag: 'Political Science (APSA)',
    description: 'Preprint platform of the American Political Science Association covering elections, political institutions, and IR.',
    coverageNote: 'Early research papers and political science conference presentations',
  },
  bis: {
    shortTag: 'Central Banks & Regulation',
    description: 'Research publications from the Bank for International Settlements on monetary policy, CBDCs, systemic risk, and Basel.',
    coverageNote: 'Working papers and quarterly reviews from the central bank hub',
  },
  jpal: {
    shortTag: 'RCTs & Social Impact (MIT)',
    description: 'Catalog of randomized evaluations from the Abdul Latif Jameel Poverty Action Lab measuring public policy effectiveness.',
    coverageNote: 'Over 1,000 impact evaluations across poverty, health, and education',
  },
  brookings: {
    shortTag: 'Public Policy Think Tank',
    description: 'Economic policy, metropolitan governance, technology, and foreign policy research including Brookings Papers on Economic Activity.',
    coverageNote: 'Open public policy analyses and economic briefings',
  },
  econstor: {
    shortTag: 'German Economics Repository',
    description: 'International open-access repository operated by ZBW hosting economics and management working papers and articles.',
    coverageNote: 'Over 250,000 full texts indexed in RePEc and OpenAIRE',
  },
  govinfo: {
    shortTag: 'Legislation & CRS Reports (US)',
    description: 'Official U.S. Government Publishing Office portal for bills, hearings, and Congressional Research Service reports.',
    coverageNote: 'Federal legislative, budgetary, and regulatory documentation',
  },
  overton: {
    shortTag: 'Policy Citations Index',
    description: 'Commercial database tracking how scholarly articles are cited in government documents, IGOs, and think tanks across 180+ countries.',
    coverageNote: 'Regulatory impact and policy citations of academic evidence',
  },
  policy_commons: {
    shortTag: 'Global Think Tanks & IGOs',
    description: 'Grey literature aggregator indexing reports from over 30,000 think tanks, NGOs, cities, and international organizations.',
    coverageNote: 'Over 4 million public policy briefs and technical reports',
  },
};

export function getLocalizedPlatformInfo(
  platform: PlatformConfig,
  language: SupportedLanguage | string
): { shortTag: string; description: string; coverageNote: string } {
  // Catalog prose exists in Portuguese and English; other UI languages read English.
  if (proseLanguage(language) === 'en') {
    const translated = PLATFORM_TRANSLATIONS_EN[platform.id];
    if (translated) return translated;
  }
  return {
    shortTag: platform.shortTag,
    description: platform.description,
    coverageNote: platform.coverageNote,
  };
}
