-- =========================================
-- Caixa Certo - estrutura do banco de dados
-- =========================================

-- 1. Perfil do usuário (a senha fica no Supabase Auth, nunca aqui)
create table public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  nome_negocio text not null,
  email text not null unique,
  criado_em timestamptz not null default now()
);

-- 2. Lançamentos (entradas e saídas)
create table public.lancamentos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references public.usuarios(id) on delete cascade,
  tipo text not null check (tipo in ('entrada', 'saida')),
  valor numeric(10,2) not null check (valor > 0),
  data date not null default current_date,
  forma_pagamento text not null check (forma_pagamento in ('debito', 'credito', 'pix', 'dinheiro')),
  categoria text,
  criado_em timestamptz not null default now()
);

-- 3. Contas fixas
create table public.contas_fixas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references public.usuarios(id) on delete cascade,
  descricao text not null,
  valor numeric(10,2) not null check (valor > 0),
  dia_vencimento int not null check (dia_vencimento between 1 and 31),
  ativa boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Índice para o resumo do período carregar rápido (RNF03)
create index idx_lancamentos_usuario_data on public.lancamentos (usuario_id, data);

-- 4. Segurança: RLS (RNF02) - cada usuário só acessa os próprios dados
alter table public.usuarios enable row level security;
alter table public.lancamentos enable row level security;
alter table public.contas_fixas enable row level security;

create policy "usuario acessa o proprio perfil" on public.usuarios
  for all using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "usuario acessa os proprios lancamentos" on public.lancamentos
  for all using ((select auth.uid()) = usuario_id) with check ((select auth.uid()) = usuario_id);

create policy "usuario acessa as proprias contas fixas" on public.contas_fixas
  for all using ((select auth.uid()) = usuario_id) with check ((select auth.uid()) = usuario_id);

-- 5. Ao se cadastrar, o perfil é criado automaticamente
create function public.criar_perfil_usuario()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.usuarios (id, nome, nome_negocio, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    coalesce(new.raw_user_meta_data ->> 'nome_negocio', ''),
    new.email
  );
  return new;
end;
$$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil_usuario();

-- =========================================
-- Versão 2: serviços, produtos e estoque
-- (mesmo conteúdo da migracao-002-melhorias.sql)
-- =========================================

-- 1. Serviços (corte, barba...) com preço
create table public.servicos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references public.usuarios(id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  preco numeric(10,2) not null check (preco > 0),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- 2. Produtos (pomada, cerveja...) com custo, venda e estoque
create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references public.usuarios(id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  preco_custo numeric(10,2) not null default 0 check (preco_custo >= 0),
  preco_venda numeric(10,2) not null check (preco_venda > 0),
  estoque int not null default 0,
  estoque_minimo int not null default 0 check (estoque_minimo >= 0),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- 3. Novos campos nos lançamentos
alter table public.lancamentos
  add column conta_fixa_id uuid references public.contas_fixas(id) on delete set null,
  add column servico_id uuid references public.servicos(id) on delete set null,
  add column produto_id uuid references public.produtos(id) on delete set null,
  add column quantidade int not null default 1 check (quantidade > 0),
  add column custo_unitario numeric(10,2) check (custo_unitario >= 0);

create index idx_lancamentos_produto on public.lancamentos (produto_id);
create index idx_lancamentos_conta_fixa on public.lancamentos (conta_fixa_id);

-- 4. Segurança (RLS) das tabelas novas
alter table public.servicos enable row level security;
alter table public.produtos enable row level security;

create policy "usuario acessa os proprios servicos" on public.servicos
  for all using ((select auth.uid()) = usuario_id) with check ((select auth.uid()) = usuario_id);

create policy "usuario acessa os proprios produtos" on public.produtos
  for all using ((select auth.uid()) = usuario_id) with check ((select auth.uid()) = usuario_id);

-- 5. Venda de produto: guarda o custo do dia da venda
-- Assim, se o custo mudar depois, o lucro das vendas antigas não muda.
create function public.guardar_custo_da_venda()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.produto_id is null or new.tipo <> 'entrada' then
    new.custo_unitario := null;
  elsif tg_op = 'INSERT' or new.produto_id is distinct from old.produto_id then
    select p.preco_custo into new.custo_unitario
    from public.produtos p
    where p.id = new.produto_id;
  end if;
  return new;
end;
$$;

create trigger antes_de_salvar_lancamento
  before insert or update on public.lancamentos
  for each row execute function public.guardar_custo_da_venda();

-- 6. Estoque automático
-- Venda (entrada) tira do estoque; compra (despesa) soma no estoque.
-- Ao editar ou excluir um lançamento, o movimento antigo é desfeito.
create function public.atualizar_estoque()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Desfaz o movimento antigo (edição ou exclusão)
  if tg_op in ('UPDATE', 'DELETE') and old.produto_id is not null then
    update public.produtos
    set estoque = estoque + (case when old.tipo = 'entrada' then old.quantidade else -old.quantidade end)
    where id = old.produto_id;
  end if;

  -- Aplica o movimento novo (cadastro ou edição)
  if tg_op in ('INSERT', 'UPDATE') and new.produto_id is not null then
    update public.produtos
    set estoque = estoque + (case when new.tipo = 'entrada' then -new.quantidade else new.quantidade end)
    where id = new.produto_id;

    -- Compra nova: atualiza o preço de custo com o valor pago por unidade
    if tg_op = 'INSERT' and new.tipo = 'saida' then
      update public.produtos
      set preco_custo = round(new.valor / new.quantidade, 2)
      where id = new.produto_id;
    end if;
  end if;

  return null;
end;
$$;

create trigger depois_de_salvar_lancamento
  after insert or update or delete on public.lancamentos
  for each row execute function public.atualizar_estoque();
