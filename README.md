# 🍔 MEU BURGUER - Sistema Completo

Sistema completo de cardápio online e painel administrativo para hamburgueria, desenvolvido com Next.js 14, TypeScript, Tailwind CSS 3.4, Material UI e Supabase.

## 🚀 Características

### Cardápio Online (Cliente)
- ✨ Design moderno e elegante com tema claro/escuro
- 📱 Mobile First - totalmente responsivo
- 🎨 Paleta de cores baseada na identidade visual (dourado/amarelo)
- 🛒 Carrinho de compras funcional com localStorage
- 🔥 Produtos em destaque
- 🍟 Sistema de adicionais/complementos com imagens
- 🥤 Seção completa de bebidas
- 🔍 Sistema de busca em tempo real
- 💬 Envio de pedidos via WhatsApp
- ⚡ Animações suaves e transições elegantes
- 🌙 Tema escuro adaptativo

### Painel Administrativo
- 🔐 Sistema de autenticação seguro
- 📊 Dashboard com estatísticas em tempo real
- 📋 Gerenciamento completo de pedidos
- ➕ Registro de pedidos físicos/presenciais
- ✏️ Edição de pedidos e status
- 📄 Geração de PDF profissional
- 🔍 Filtros avançados e busca
- 📱 Interface responsiva com Material UI
- 🎨 Design harmonizado com o tema principal

## 🛠️ Tecnologias Utilizadas

### Frontend
- **Next.js 14** - Framework React
- **TypeScript** - Tipagem estática
- **Tailwind CSS 3.4** - Estilização principal
- **Material UI** - Componentes do painel admin
- **Aceternity UI** - Componentes modernos (login)
- **Framer Motion** - Animações
- **Lucide React** - Ícones

### Backend & Ferramentas
- **Supabase** - Banco de dados PostgreSQL
- **jsPDF + autoTable** - Geração de PDFs
- **date-fns** - Manipulação de datas
- **Next Themes** - Gerenciamento de temas

## 📋 Pré-requisitos

- Node.js 18+ instalado
- Conta no Supabase
- Editor de código (recomendado: VS Code)

## 🔧 Instalação

### 1. Clone o repositório ou extraia os arquivos

```bash
cd meu-burgee
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure o Supabase

1. Crie uma conta em [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Copie a URL e a chave anônima do projeto
4. No SQL Editor do Supabase, execute o script `supabase-schema.sql`

### 4. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```bash
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase_aqui
```

### 5. Prepare as imagens dos produtos

Adicione as imagens dos hambúrgueres em `/public/assets/hamb/` seguindo os nomes:
- x-frango.jpg
- tradicional.jpg
- portuense.jpg
- meu-tudao.jpg
- meu-burguer.jpg
- x-cheddar.jpg
- x-calabresa.jpg
- marruas.jpg
- x-bacon.jpg
- nordestino.jpg
- x-burguer.jpg
- mega-calabresa.jpg
- super-mega-bacon.jpg
- super-cheddar.jpg
- x-topa-tudo.jpg

As imagens dos adicionais já estão incluídas em `/assets/adicionais/`.

### 6. Atualize o número do WhatsApp

No arquivo `src/components/ModalCarrinho.tsx`, linha 107, atualize o número do WhatsApp:

```typescript
const numeroWhatsApp = '5586999999999' // Substitua pelo seu número
```

## 🚀 Executando o Projeto

### Modo de Desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) no navegador.

### Build de Produção

```bash
npm run build
npm start
```

## 📁 Estrutura do Projeto

```
meu-burgee/
├── public/
│   └── assets/
│       ├── hamb/              # Imagens dos hambúrgueres
│       ├── adicionais/        # Imagens dos complementos
│       └── meuburger.png      # Logo
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Layout principal
│   │   ├── page.tsx           # Página inicial
│   │   └── globals.css        # Estilos globais
│   ├── components/
│   │   ├── Header.tsx         # Cabeçalho com logo e toggle de tema
│   │   ├── Footer.tsx         # Rodapé com navegação
│   │   ├── CartaoProduto.tsx  # Card de produto
│   │   ├── ModalComplementos.tsx  # Modal de adicionais
│   │   └── ModalCarrinho.tsx  # Modal do carrinho
│   ├── contexts/
│   │   └── CarrinhoContext.tsx    # Context API do carrinho
│   ├── lib/
│   │   └── supabase.ts        # Cliente e tipos do Supabase
│   └── providers/
│       └── ThemeProvider.tsx  # Provider de temas
├── supabase-schema.sql        # Schema do banco de dados
├── tailwind.config.js         # Configuração do Tailwind
├── tsconfig.json              # Configuração do TypeScript
└── package.json
```

## 🎨 Paleta de Cores

### Cores Principais (da logo)
- **Dourado**: #ca8a04 (e variações)
- **Creme**: #fef9c3 (backgrounds claros)
- **Marrom**: #854d0e (detalhes)

### Tema Claro
- Background: Branco (#ffffff)
- Texto: Cinza escuro (#111827)

### Tema Escuro
- Background: Cinza muito escuro (#030712)
- Texto: Cinza claro (#f9fafb)

## 📊 Banco de Dados

### Tabelas Principais

- **produtos** - Hambúrgueres do cardápio
- **adicionais** - Complementos disponíveis
- **bebidas** - Bebidas do cardápio
- **pedidos** - Pedidos realizados
- **itens_pedido** - Itens de cada pedido
- **item_adicionais** - Adicionais de cada item

### Política de Acesso (RLS)

O schema atual **não utiliza RLS** (Row Level Security) conforme solicitado. 
Para a área administrativa futura, será necessário implementar políticas de segurança.

## 🔒 Segurança

⚠️ **IMPORTANTE**: Este projeto foi desenvolvido para uso na área do cliente sem autenticação.
Para uso em produção com área administrativa, implemente:

1. Autenticação de usuários
2. Row Level Security (RLS) no Supabase
3. Validação de dados no backend
4. Rate limiting
5. HTTPS obrigatório

## 📱 WhatsApp Integration

Os pedidos são enviados automaticamente via WhatsApp com:
- Número do pedido
- Dados do cliente
- Itens com adicionais
- Total do pedido
- Observações

## 🎯 Funcionalidades Implementadas

- ✅ Listagem de produtos por categoria
- ✅ Produtos em destaque
- ✅ Modal de complementos com busca
- ✅ Carrinho de compras persistente
- ✅ Cálculo automático de totais
- ✅ Seleção de tipo de entrega
- ✅ Formas de pagamento
- ✅ Envio via WhatsApp
- ✅ Tema claro/escuro
- ✅ Design responsivo
- ✅ Animações e transições
- ✅ Loading states
- ✅ Tratamento de erros

## 🚧 Próximos Passos (Área Administrativa)

Para a próxima fase, implementar:

1. **Autenticação de Admin**
   - Login seguro
   - Recuperação de senha
   - Gestão de sessões

2. **Dashboard Administrativo**
   - Visualização de pedidos em tempo real
   - Atualização de status
   - Relatórios e estatísticas

3. **Gestão de Produtos**
   - CRUD completo de produtos
   - Upload de imagens
   - Controle de estoque

4. **Gestão de Pedidos**
   - Atualização de status
   - Histórico completo
   - Impressão de comandas

## 🐛 Troubleshooting

### Erro ao conectar com Supabase
- Verifique se as variáveis de ambiente estão corretas
- Confirme se o projeto Supabase está ativo
- Execute o schema SQL no Supabase

### Imagens não aparecem
- Verifique se as imagens estão nos diretórios corretos
- Confirme os nomes dos arquivos
- Limpe o cache do Next.js: `rm -rf .next`

### Erro de build
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

## 📄 Licença

Este projeto foi desenvolvido para uso privado da hamburgueria Meu Burguer.

## 👨‍💻 Desenvolvedor

Desenvolvido com ❤️ e muita atenção aos detalhes.

---

## 🎉 Pronto para usar!

Seu cardápio online está pronto. Para iniciar:

```bash
npm install
# Configure o .env
npm run dev
```

Acesse http://localhost:3000 e aproveite! 🍔✨

