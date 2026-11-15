# Diretrizes Normativas: UI/UX Intelligence, Rigor Tipográfico e Integração Arquitetural Estrita

Este documento estabelece as regras obrigatórias para qualquer agente de IA ou desenvolvedor ao conceber, modificar ou expandir interfaces, componentes e fluxos visuais no **Cartograph / Super Pesquisador 2000**.

---

## 1. Ativação Mandatória de Skills de Design

É terminantemente proibido implementar ou refatorar interfaces visuais com base em palpites ou templates genéricos de modelos de linguagem. Qualquer tarefa que envolva interface gráfica, CSS, componentes React ou interações deve acionar obrigatoriamente a inteligência de design disponível:

1. **Skill Primária (/ui-ux-pro-max):**
   - Execução mandatória antes de desenhar ou alterar componentes para consulta de estilos, paletas, microinterações, espaçamentos e acessibilidade:
     ```bash
     python "/Users/marcelopessoa/.gemini/config/skills/ui-ux-pro-max/scripts/search.py" "<termo>" --domain <ux|style|color|typography|icons|gsap>
     ```
   - Utilização obrigatória dos checklists canônicos de usabilidade (`references/quick-reference.md`) e regras de acabamento (`references/pro-rules.md`).
2. **Suíte Complementar de Design:**
   - `frontend-design`: Para direção visual não genérica, composições autênticas e refinamento estético de alto nível.
   - `bencium-impact-designer` e `bencium-controlled-ux-designer`: Para validação de contraste, hierarquia visual e prevenção de layouts derivativos.
   - `emil-design-eng`: Para micro-detalhes de interação, física de transições e sensação tátil de software de primeira linha.
   - `apple-design`: Para consistência espacial, transições com inércia física e estados de transição refinados.
   - `animate` e `find-animation-opportunities`: Para coreografia de estados sem poluição visual.
   - `accesslint` e `web-design-guidelines`: Para conformidade com WCAG 2.2 AA (contraste mínimo 4.5:1, áreas de toque $\ge 44 \times 44\text{px}$, estados `:focus-visible` acessíveis e suporte a leitores de tela).

---

## 2. Proibição de Estética Genérica de IA e Padronização Tipográfica Estrita

O Cartograph possui identidade visual proprietária baseada no ecossistema PRISM (Spectral Prism Design). Interfaces construídas com estética padrão de frameworks ou geradores genéricos de IA serão sumariamente rejeitadas.

### 2.1 Famílias Tipográficas Canônicas do Projeto
É expressamente proibido injetar fontes genéricas (como *Comic Sans*, *Times New Roman*, *Arial* solto ou fontes padrão não catalogadas). Toda tipografia deve aderir às três famílias configuradas na aplicação:

1. **Títulos, Marca e Cabeçalhos de Seção (`.font-heading`, `.font-brand`):**
   - **Família:** `Plus Jakarta Sans` (pesos 500, 600, 700).
   - **Ajuste:** `letter-spacing: -0.02em`, `font-feature-settings: "kern" 1, "liga" 1`.
2. **Corpo de Texto, Rótulos e Parágrafos:**
   - **Família:** `Inter` / `Roboto` com fallbacks nativos (`-apple-system`, `BlinkMacSystemFont`, `'Segoe UI'`).
   - **Ajuste:** `line-height: 1.5`, renderização antialiased subpixel.
3. **Código, Identificadores Persistentes (DOI/PMID), Queries Booleanas e Métricas:**
   - **Família:** `JetBrains Mono` / `ui-monospace` (pesos 400, 500).
   - **Ajuste:** `font-variant-numeric: tabular-nums` para alinhamento vertical estrito de números, contagens de citação e tabelas.

---

## 3. Padrão de Integração Excepcional: Tolerância Zero para Soluções Provisórias

Novas funcionalidades nunca devem ser introduzidas como remendos isolados, componentes flutuantes descontextualizados ou "gambiarras" técnicas. Toda adição de recurso exige integração profunda e perfeita com os pilares arquiteturais do sistema:

1. **Integração de Estado e Contratos de Tipo (`src/types/academic.ts`):**
   - Nenhuma propriedade pode ser tratada como `any` ou passada via props genéricas sem tipagem estrita. Toda estrutura deve refletir os modelos formais da aplicação (`NormalizedPaper`, `BooleanQueryState`, `SearchFilters`, `ScreeningStatus`).
2. **Suporte Completo ao Tema Claro e Escuro:**
   - Todo componente deve implementar suporte simultâneo a `[data-theme="light"]` e `[data-theme="dark"]`, utilizando exclusivamente as variáveis semânticas do projeto (`--bg-canvas`, `--bg-secondary`, `--bg-subtle`, `--text-primary`, `--text-secondary`, `--divider`, `--link-academic`, `--meta-green`). Proibido usar cores hexadecimais arbitrárias dispersas em classes inline.
3. **Internacionalização Obrigatória em 4 Idiomas (`src/i18n/`):**
   - Nenhuma string visível de interface pode ser estática no código. Todo texto, tooltip, aria-label e mensagem de erro deve ser registrado nas chaves de tradução em `src/i18n/translations.ts` para os 4 idiomas suportados: Português (`pt`), Inglês (`en`), Espanhol (`es`) e Francês (`fr`).
4. **Acoplamento Harmônico nos Orquestradores Principais:**
   - Se a feature for uma gaveta, modal ou painel, deve integrar-se organicamente a `AcademicCommandCenter()` em `src/App.tsx`, respeitando o ciclo de atalhos de teclado globais (`Ctrl/Cmd + K`, `Escape`, `Enter`), controle de foco e transições de entrada/saída suaves.
5. **Responsividade Multi-Target:**
   - A interface deve responder perfeitamente desde telas móveis (360px) até monitores widescreen (4K), além de manter compatibilidade nativa com o runtime de janela do Tauri v2 (1280x860) sem rolagem horizontal espúria ou cortes de layout.
