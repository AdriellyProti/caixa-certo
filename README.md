# Caixa Certo

![CI](https://github.com/AdriellyProti/caixa-certo/actions/workflows/ci.yml/badge.svg)

MVP de controle financeiro para profissionais autônomos, desenvolvido como Projeto de Extensão do curso de Análise e Desenvolvimento de Sistemas.

## O problema

Profissionais autônomos, como barbeiros e cabeleireiros, recebem por débito, crédito, PIX e dinheiro, e as informações ficam espalhadas entre a maquininha, o banco e anotações. No fim da semana, fica difícil saber se houve lucro ou prejuízo.

Parceiro do projeto: **JP Barber Hair** (Jardim Maracanã, São Paulo/SP).

## Funcionalidades do MVP

- **RF01** – Cadastro de usuário (senha com no mínimo 8 caracteres)
- **RF02** – Login
- **RF03** – Registro de recebimento, com forma de pagamento
- **RF04** – Registro de despesa, com categoria
- **RF05** – Resumo do período (hoje, semana e mês), com lucro ou prejuízo

## Tecnologias

- **Angular 22** (TypeScript): interface e lógica de negócio (services)
- **Supabase**: PostgreSQL, autenticação e Row Level Security
- **Vitest**: testes unitários e de integração
- **GitHub Actions**: integração contínua

## Arquitetura

Monolítica em camadas, cliente-servidor:

- **Apresentação:** componentes em `src/app/pages`
- **Lógica de negócio:** services em `src/app/services` e regras puras em `src/app/utils`
- **Dados:** PostgreSQL no Supabase (`supabase/schema.sql`)

## Segurança

- Senhas gerenciadas pelo Supabase Auth (bcrypt), nunca salvas na tabela de usuários
- Row Level Security: cada usuário acessa somente os próprios dados
- Validação no cliente (Angular) e no servidor (restrições `check` no banco)
- Apenas a chave pública (publishable key) é usada no front-end
- Rotas internas protegidas por guard de autenticação

## Acessibilidade

- Área de toque de no mínimo 44 px em botões e campos
- Resultado financeiro indicado por texto, símbolo e cor (Lucro ▲ / Prejuízo ▼; + / −)
- Opções selecionadas marcadas com ✓ e `aria-pressed`

## Como executar

Pré-requisitos: Node.js 24 ou superior.

```bash
git clone https://github.com/AdriellyProti/caixa-certo.git
cd caixa-certo
npm install
npm start
```

Abra http://localhost:4200.

## Testes

```bash
npx ng test --watch=false --coverage
```

O pipeline de CI executa build, testes e cobertura a cada push na `main` e a cada Pull Request.

## Fluxo de trabalho

- Um branch por funcionalidade (`feature/...`), integrado à `main` por Pull Request com revisão
- Mensagens de commit no padrão Conventional Commits (`feat`, `fix`, `test`, `ci`, `docs`)

## Autora

Adrielly Proti – [github.com/AdriellyProti](https://github.com/AdriellyProti)