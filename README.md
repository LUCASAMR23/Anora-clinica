# Anora Clínica

Plataforma de apoio à gestão clínica, criada para organizar materiais, procedimentos, viagens e a rotina da equipe em um só lugar.

## Recursos

- **Visão geral:** acompanhamento do estoque, das viagens em andamento e dos itens que precisam de reposição.
- **Controle de estoque:** cadastro de materiais, lotes e validades, com registro de entradas e movimentações.
- **Procedimentos:** criação de modelos de materiais para facilitar o preparo das malas.
- **Malas e viagens:** planejamento, despacho de materiais, registro de consumo e conferência do retorno ao estoque.
- **Relatórios:** exportação do estoque para Excel e consulta de relatórios de viagens para imprimir, abrir no Word ou visualizar como texto.
- **Equipe e permissões:** acessos organizados por função — administradora, gestora, médica e consulta.

## Tecnologias

- Next.js e React
- TypeScript
- Cloudflare Workers e D1
- Drizzle ORM

## Executar localmente

Requisitos: Node.js `>=22.13.0`, npm e Git.

```bash
npm ci
npm run dev
```

Abra no navegador o endereço local mostrado no terminal.

Para gerar a versão de produção:

```bash
npm run build
```

## Acesso e dados

O acesso da equipe é protegido pela autenticação configurada para o ambiente de hospedagem. A administradora controla os convites e as permissões. No primeiro acesso autorizado, a clínica e o perfil de administradora são inicializados.

Os dados da aplicação são armazenados no banco D1 configurado para o ambiente. As migrações do banco ficam em `drizzle/`; alterações no esquema podem gerar novas migrações com:

```bash
npm run db:generate
```

## Relatórios

Na área **Relatórios**, é possível baixar a planilha do estoque e consultar o relatório de viagens para impressão, Word ou texto simples.
