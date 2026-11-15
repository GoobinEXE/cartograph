import { ApiSourceId, ByokProviderId } from '../types/academic';

export interface ByokProviderSpec {
  id: ByokProviderId;
  name: string;
  targetSourceId: ApiSourceId;
  accessTier: 'free-key' | 'paid-subscription' | 'institutional-key';
  docsUrl: string;
  supportsSecondaryToken: boolean;
  keyPlaceholder: string;
  secondaryPlaceholder?: string;
  descriptionPt: string;
  descriptionEn: string;
}

export const BYOK_PROVIDERS: ByokProviderSpec[] = [
  {
    id: 'semanticscholar',
    name: 'Semantic Scholar',
    targetSourceId: 'semanticscholar',
    accessTier: 'free-key',
    docsUrl: 'https://www.semanticscholar.org/product/api#api-key-form',
    supportsSecondaryToken: false,
    keyPlaceholder: 'x-api-key',
    descriptionPt:
      'Opcional: chave gratuita dedicada para evitar limite compartilhado (HTTP 429) sob alta demanda.',
    descriptionEn:
      'Optional: dedicated free API key to avoid shared public rate limits (HTTP 429) under high traffic.',
  },
  {
    id: 'core',
    name: 'CORE API v3',
    targetSourceId: 'core',
    accessTier: 'free-key',
    docsUrl: 'https://core.ac.uk/services/api',
    supportsSecondaryToken: false,
    keyPlaceholder: 'CORE API Key',
    descriptionPt:
      'Opcional: eleva a cota de consultas no maior agregador Open Access e libera links de texto completo.',
    descriptionEn:
      'Optional: raises rate limits on the largest Open Access aggregator and unlocks full-text links.',
  },
  {
    id: 'springer',
    name: 'Springer Nature',
    targetSourceId: 'springer',
    accessTier: 'free-key',
    docsUrl: 'https://dev.springernature.com/',
    supportsSecondaryToken: false,
    keyPlaceholder: 'Springer API Key',
    descriptionPt:
      'Chave gratuita do Developer Portal (500 req/dia na API Open Access) ou chave institucional.',
    descriptionEn:
      'Free Developer Portal key (500 req/day on Open Access API) or institutional subscription key.',
  },
  {
    id: 'scopus',
    name: 'Scopus (Elsevier)',
    targetSourceId: 'scopus',
    accessTier: 'paid-subscription',
    docsUrl: 'https://dev.elsevier.com/',
    supportsSecondaryToken: true,
    keyPlaceholder: 'Elsevier API Key (X-ELS-APIKey)',
    secondaryPlaceholder: 'InstToken (opcional fora do campus)',
    descriptionPt:
      'Integra busca direta no Scopus usando sua chave Elsevier Developer e InstToken institucional.',
    descriptionEn:
      'Enables direct Scopus search using your Elsevier Developer key and optional institutional token.',
  },
  {
    id: 'sciencedirect',
    name: 'ScienceDirect (Elsevier)',
    targetSourceId: 'sciencedirect',
    accessTier: 'paid-subscription',
    docsUrl: 'https://dev.elsevier.com/',
    supportsSecondaryToken: true,
    keyPlaceholder: 'Elsevier API Key (X-ELS-APIKey)',
    secondaryPlaceholder: 'InstToken (opcional fora do campus)',
    descriptionPt:
      'Integra artigos de periódicos e livros da ScienceDirect com sua assinatura institucional.',
    descriptionEn:
      'Integrates ScienceDirect journal articles and books using your institutional subscription.',
  },
  {
    id: 'ieeexplore',
    name: 'IEEE Xplore',
    targetSourceId: 'ieeexplore',
    accessTier: 'institutional-key',
    docsUrl: 'https://developer.ieee.org/',
    supportsSecondaryToken: false,
    keyPlaceholder: 'IEEE Xplore API Key',
    descriptionPt:
      'Habilita busca direta na biblioteca digital IEEE (engenharia, computação, hardware e normas).',
    descriptionEn:
      'Enables direct search across IEEE Digital Library (engineering, computing, hardware, standards).',
  },
  {
    id: 'lens',
    name: 'The Lens.org',
    targetSourceId: 'lens',
    accessTier: 'free-key',
    docsUrl: 'https://www.lens.org/lens/user/subscriptions#scholar',
    supportsSecondaryToken: false,
    keyPlaceholder: 'Lens Bearer Access Token',
    descriptionPt:
      'Token acadêmico gratuito para cruzar literatura científica global e citações de patentes.',
    descriptionEn:
      'Free academic access token combining global scholarly works and patent citations.',
  },
  {
    id: 'fedinprint',
    name: 'Fed in Print (Federal Reserve)',
    targetSourceId: 'fedinprint',
    accessTier: 'free-key',
    docsUrl: 'https://fedinprint.org/api',
    supportsSecondaryToken: false,
    keyPlaceholder: 'Fed in Print X-API-Key',
    descriptionPt:
      'Chave gratuita do sistema Federal Reserve para buscar working papers dos 12 bancos regionais do Fed.',
    descriptionEn:
      'Free Federal Reserve key to search working papers across all 12 regional Fed Banks.',
  },
  {
    id: 'govinfo',
    name: 'Congress.gov / GovInfo',
    targetSourceId: 'govinfo',
    accessTier: 'free-key',
    docsUrl: 'https://api.data.gov/signup/',
    supportsSecondaryToken: false,
    keyPlaceholder: 'api.data.gov API Key',
    descriptionPt:
      'Chave gratuita api.data.gov para relatórios legislativos, audiências e documentos públicos dos EUA.',
    descriptionEn:
      'Free api.data.gov key for U.S. legislative reports, congressional hearings, and policy records.',
  },
];

export const BYOK_PROVIDER_MAP: Record<ByokProviderId, ByokProviderSpec> = Object.fromEntries(
  BYOK_PROVIDERS.map((p) => [p.id, p])
) as Record<ByokProviderId, ByokProviderSpec>;
