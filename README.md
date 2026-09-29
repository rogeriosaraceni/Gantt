# 📊 Gráfico de Gantt Interativo

Aplicação web moderna, interativa e responsiva para gerenciamento de projetos e cronogramas utilizando **Gráfico de Gantt**, construída com **Astro**, **Bootstrap 5** e **jQuery**.

---

## ✨ Funcionalidades

### 📋 Painel de Atividades (Tabela à Esquerda)
- **Hierarquia e Numeração Automática:** Suporte a grupos (ex: `1`, `2`) e subtarefas filhas (ex: `1.1`, `2.1`), com renumeração automática ao adicionar ou excluir itens.
- **Edição Inline Direta:** Edite títulos, responsáveis, datas de início/fim (planejadas e reais), predecessoras e percentual de progresso diretamente nas células.
- **Indicadores de Status:** Ícones visuais para atividades em estado **Crítico** ou **Atrasado**.
- **Gerenciador de Colunas:** Menu dropdown para ocultar ou exibir colunas sob demanda (*Responsável*, *Planejado*, *Real*, *Predecessoras* e *%*).
- **Exclusão Segura:** Modal de confirmação via Bootstrap com tooltips integrados.
- **Inclusão Dinâmica:** Adicione novas atividades com foco automático imediato na edição.

### ⏱️ Linha do Tempo / Timeline (Painel à Direita)
- **Escalas Temporais Dinâmicas:** Alterne a visualização entre **Semana** (`Sem. S/AA`), **Mês** (`Mês/AA`) e **Ano** (`AAAA`).
- **Barras de Tarefas Proporcionais:** Cálculo exato de posição e largura baseado nas datas, com preenchimento visual proporcional ao progresso (`%`).
- **Linha de Base (*Baseline*):**
  - Salve o snapshot do cronograma planejado atual.
  - Ative a comparação para visualizar a barra de baseline sobreposta às datas reais/planejadas.
- **Navegação Horizontal Rápida:** Botões de navegação anterior/próximo (`<` e `>`) para deslocar a linha do tempo suavemente.
- **Tooltips do Bootstrap:** Informações contextuais detalhadas ao passar o mouse sobre as barras e ações.

### 🎨 Experiência e Layout
- **Cabeçalhos Fixos (*Sticky Headers*):** Cabeçalhos da tabela e da linha do tempo permanecem fixos no topo durante a rolagem vertical.
- **Sincronização de Rolagem:** Sincronização vertical fluida entre a tabela de atividades e a grade temporal.
- **Scrollbars Modernas e Finas:** Barras de rolagem estilizadas e compactas (6px) com trilho transparente.
- **Paleta Neutra e Elegante:** Cores suaves inspiradas em design corporativo moderno.

---

## 🛠️ Tecnologias Utilizadas

- **[Astro](https://astro.build/):** Framework web rápido e componentizado.
- **[Bootstrap 5.3](https://getbootstrap.com/):** Componentes de interface, grid, dropdowns, modais e tooltips.
- **[Bootstrap Icons](https://icons.getbootstrap.com/):** Iconografia do sistema.
- **[jQuery 3.7](https://jquery.com/):** Manipulação de DOM, cálculos temporais e sincronização de eventos.
- **CSS3 Moderno:** Variáveis CSS, `position: sticky`, `scrollbar-width` e pseudo-elementos WebKit.

---

## 📁 Estrutura do Projeto

```text
/
├──puplic/
│   │  data/
│   │   ├── estado.js
│   │   ├── responsaveis.js
│   ├── gantt/
│   │   ├── gantt.js
│   │   ├── ganttLeft.js
│   │   ├── ganttRight.js
│   │   ├── ganttTaskServices.js
│   │   ├── ganttUtils.js
│   │   └──
│   ├── js/
│      └── main.js
│
├── src/
│   ├── layouts/
│   │   └── Layout.astro    # Layout base (Bootstrap, Bootstrap Icons, Jquery, Assets e Fontes)
│   ├── pages/
│   │   ├── index.astro     # Página principal e toolbar
│   │   ├── /popups         # Página de Caparar beseline
│   │   └── /modals         # Modal de confirmação de exclusão
│   └── styles.css          # Estilização completa do Gantt e timeline
├── package.json
└── README.md
```

---

## 🚀 Como Executar

### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão `>= 22.12.0`)
- Gerenciador de pacotes (`npm`, `pnpm` ou `yarn`)

### Instalação

```sh
# Clone o repositório
git clone https://github.com/rogeriosaraceni/Gantt.git
cd Gantt

# Instale as dependências
npm install
```

### Modo de Desenvolvimento

```sh
# Iniciar o servidor de desenvolvimento
npm run dev
```

Acesse [http://localhost:4321](http://localhost:4321) no seu navegador.

#### Executar em Segundo Plano (Opcional)
```sh
# Iniciar em background
astro dev --background

# Verificar status / logs / parar
astro dev status
astro dev logs
astro dev stop
```

### Build para Produção

```sh
# Gerar arquivos estáticos otimizados para produção
npm run build

# Pré-visualizar a build de produção localmente
npm run preview
```

---

## 📝 Licença

Este projeto está sob a licença [MIT](LICENSE).
