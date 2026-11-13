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