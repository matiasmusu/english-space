-- English Space colaborativo
-- Ejecutar en Supabase > SQL Editor sobre un proyecto nuevo.
create extension if not exists pgcrypto;

create type public.user_role as enum ('student','teacher');
create type public.activity_status as enum ('pending','in_progress','completed','reviewed','changes_requested');
create type public.contribution_kind as enum ('answer','correction','comment','class_note');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'student',
  created_at timestamptz not null default now()
);

create table public.materials (
  id uuid primary key default gen_random_uuid(), title text not null, description text,
  type text not null default 'document', category text, file_path text, external_url text,
  is_pinned boolean not null default false, created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.activities (
  id uuid primary key default gen_random_uuid(), title text not null, instructions text,
  action_type text not null default 'free', status public.activity_status not null default 'pending',
  due_date date, book_reference text, material_id uuid references public.materials(id) on delete set null,
  created_by uuid not null references public.profiles(id), created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Respuestas, correcciones, comentarios y notas son aportes independientes.
-- No existe un campo exclusivo de profesor: ambos usuarios pueden registrar cualquiera.
create table public.contributions (
  id uuid primary key default gen_random_uuid(), activity_id uuid not null references public.activities(id) on delete cascade,
  author_id uuid not null references public.profiles(id), kind public.contribution_kind not null,
  original_text text, body text not null, created_at timestamptz not null default now(),
  edited_at timestamptz
);

create table public.notebook_entries (
  id uuid primary key default gen_random_uuid(), title text not null, entry_date date,
  topic text, notes text, related_activity_id uuid references public.activities(id) on delete set null,
  created_by uuid not null references public.profiles(id), created_at timestamptz not null default now()
);

-- Vocabulario de las clases: palabra, traducción y pronunciación.
create table public.vocabulary (
  id uuid primary key default gen_random_uuid(), term text not null,
  translation text, pronunciation text, notes text, class_date date,
  created_by uuid not null references public.profiles(id), created_at timestamptz not null default now()
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(), entity_type text not null check (entity_type in ('material','activity','contribution','notebook')),
  entity_id uuid not null, file_path text not null, file_name text not null,
  uploaded_by uuid not null references public.profiles(id), created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.materials enable row level security;
alter table public.activities enable row level security;
alter table public.contributions enable row level security;
alter table public.notebook_entries enable row level security;
alter table public.attachments enable row level security;
alter table public.vocabulary enable row level security;

-- Espacio privado y colaborativo: ambos usuarios autenticados tienen los mismos permisos sobre contenido.
create policy "profiles readable" on public.profiles for select to authenticated using (true);
create policy "own profile editable" on public.profiles for update to authenticated using (auth.uid()=id) with check (auth.uid()=id);
create policy "materials collaborative" on public.materials for all to authenticated using (true) with check (true);
create policy "activities collaborative" on public.activities for all to authenticated using (true) with check (true);
create policy "contributions collaborative" on public.contributions for all to authenticated using (true) with check (true);
create policy "notebook collaborative" on public.notebook_entries for all to authenticated using (true) with check (true);
create policy "attachments collaborative" on public.attachments for all to authenticated using (true) with check (true);
create policy "vocabulary collaborative" on public.vocabulary for all to authenticated using (true) with check (true);

insert into storage.buckets (id,name,public) values ('english-space','english-space',false)
on conflict (id) do nothing;
create policy "private collaborative read" on storage.objects for select to authenticated using (bucket_id='english-space');
create policy "private collaborative insert" on storage.objects for insert to authenticated with check (bucket_id='english-space');
create policy "private collaborative update" on storage.objects for update to authenticated using (bucket_id='english-space') with check (bucket_id='english-space');
create policy "private collaborative delete" on storage.objects for delete to authenticated using (bucket_id='english-space');

-- Crea automáticamente un perfil básico para cada usuario creado desde Authentication.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'student')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
