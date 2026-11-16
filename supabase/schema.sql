-- Anshel Code Market: foundation schema for a dedicated Supabase project.
-- NOT applied until a separate project is created and explicitly selected.
-- Run ONCE on a NEW dedicated project. It creates NO administrator or live orders.

create table if not exists public.market_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.market_products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(trim(name)) between 3 and 160),
  category text not null check (char_length(trim(category)) between 2 and 60),
  stack text not null default '',
  description text not null default '',
  price_idr bigint not null default 0 check (price_idr >= 0),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  features jsonb not null default '[]'::jsonb check (jsonb_typeof(features) = 'array'),
  preview_path text not null default '',
  license_summary text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- This is a PRIVATE asset index. An unpublished or downloadable ZIP path is
-- never returned to anonymous catalog visitors.
create table if not exists public.market_assets (
  product_id uuid primary key references public.market_products(id) on delete cascade,
  object_path text not null unique,
  original_filename text not null,
  file_size_bytes bigint not null check (file_size_bytes > 0 and file_size_bytes <= 52428800),
  uploaded_at timestamptz not null default now()
);

-- Orders are scaffolding only. Browser clients have NO INSERT/UPDATE/DELETE grants.
-- Future checkout must use verified server-side order creation and payment reviews.
create table if not exists public.market_orders (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.market_products(id),
  buyer_user_id uuid references auth.users(id),
  amount_idr bigint not null check (amount_idr >= 0),
  status text not null default 'pending'
    check (status in ('pending','awaiting_payment','payment_review','paid','delivered','expired','cancelled','rejected','refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  verified_by uuid references auth.users(id)
);

create table if not exists public.market_order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.market_orders(id) on delete cascade,
  actor_id uuid references auth.users(id),
  event_name text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists market_products_status_idx on public.market_products(status);
create index if not exists market_products_created_at_idx on public.market_products(created_at desc);
create index if not exists market_orders_created_at_idx on public.market_orders(created_at desc);
create index if not exists market_orders_status_idx on public.market_orders(status);
create index if not exists market_order_events_order_id_idx on public.market_order_events(order_id);

alter table public.market_admins enable row level security;
alter table public.market_products enable row level security;
alter table public.market_assets enable row level security;
alter table public.market_orders enable row level security;
alter table public.market_order_events enable row level security;

-- Revoke broad permissions that older Supabase projects may grant by default.
revoke all on table public.market_admins from anon, authenticated;
revoke all on table public.market_products from anon, authenticated;
revoke all on table public.market_assets from anon, authenticated;
revoke all on table public.market_orders from anon, authenticated;
revoke all on table public.market_order_events from anon, authenticated;
revoke all on sequence public.market_order_events_id_seq from anon, authenticated;

-- A signed-in user can read ONLY their own admin membership. No browser
-- user can create, delete, or elevate admin membership.
grant select on public.market_admins to authenticated;
create policy market_admins_self_read
  on public.market_admins for select to authenticated
  using (user_id = (select auth.uid()));

-- Product listings are public ONLY after an authorized admin publishes them.
grant select on public.market_products to anon, authenticated;
grant insert, update, delete on public.market_products to authenticated;
create policy market_products_published_read
  on public.market_products for select to anon, authenticated
  using (status = 'published');
create policy market_products_admin_read
  on public.market_products for select to authenticated
  using (exists(select 1 from public.market_admins
                where user_id = (select auth.uid())));
create policy market_products_admin_insert
  on public.market_products for insert to authenticated
  with check (exists(select 1 from public.market_admins
                     where user_id = (select auth.uid())));
create policy market_products_admin_update
  on public.market_products for update to authenticated
  using (exists(select 1 from public.market_admins
                where user_id = (select auth.uid())))
  with check (exists(select 1 from public.market_admins
                     where user_id = (select auth.uid())));
create policy market_products_admin_delete
  on public.market_products for delete to authenticated
  using (exists(select 1 from public.market_admins
                where user_id = (select auth.uid())));

-- ZIP metadata is accessible only to approved admins.
grant select, insert, update, delete on public.market_assets to authenticated;
create policy market_assets_admin_read on public.market_assets
  for select to authenticated
  using (exists(select 1 from public.market_admins where user_id = (select auth.uid())));
create policy market_assets_admin_insert on public.market_assets
  for insert to authenticated
  with check (exists(select 1 from public.market_admins where user_id = (select auth.uid())));
create policy market_assets_admin_update on public.market_assets
  for update to authenticated
  using (exists(select 1 from public.market_admins where user_id = (select auth.uid())))
  with check (exists(select 1 from public.market_admins where user_id = (select auth.uid())));
create policy market_assets_admin_delete on public.market_assets
  for delete to authenticated
  using (exists(select 1 from public.market_admins where user_id = (select auth.uid())));

-- Admins may see order/event records; neither customers nor admins may
-- mark a payment as paid via generic browser table writes.
grant select on public.market_orders, public.market_order_events to authenticated;
create policy market_orders_admin_read on public.market_orders
  for select to authenticated
  using (exists(select 1 from public.market_admins where user_id = (select auth.uid())));
create policy market_order_events_admin_read on public.market_order_events
  for select to authenticated
  using (exists(select 1 from public.market_admins where user_id = (select auth.uid())));

-- Prevent accidental publication before ZIP and license have been configured.
create or replace function public.market_check_publishable()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'published' then
    if new.price_idr <= 0
       or length(trim(new.license_summary)) = 0
       or not exists(select 1 from public.market_assets
                     where product_id = new.id) then
      raise exception 'Publikasi perlu harga final, lisensi, dan ZIP privat';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.market_check_publishable() from public, anon, authenticated;
drop trigger if exists market_products_publish_guard on public.market_products;
create trigger market_products_publish_guard before insert or update
  on public.market_products for each row execute function public.market_check_publishable();

-- Private ZIP bucket. NEVER mark it public; buyer downloads will need a
-- server-verified, short-lived signed URL after payment review is built.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('anshel-source-packages', 'anshel-source-packages', false, 52428800,
        array['application/zip','application/x-zip-compressed','application/octet-stream'])
on conflict (id) do nothing;

create policy market_storage_admin_select on storage.objects
  for select to authenticated
  using (bucket_id = 'anshel-source-packages'
    and exists (select 1 from public.market_admins
                where user_id = (select auth.uid())));
create policy market_storage_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'anshel-source-packages'
    and exists (select 1 from public.market_admins
                where user_id = (select auth.uid())));
create policy market_storage_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'anshel-source-packages'
    and exists (select 1 from public.market_admins
                where user_id = (select auth.uid())))
  with check (bucket_id = 'anshel-source-packages'
    and exists (select 1 from public.market_admins
                where user_id = (select auth.uid())));
create policy market_storage_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'anshel-source-packages'
    and exists (select 1 from public.market_admins
                where user_id = (select auth.uid())));

-- Preserve the existing six public illustrative cards as admin-only DRAFTS.
-- These are NOT real downloadable products, and are never shown as published.
insert into public.market_products
  (slug,name,category,stack,description,price_idr,features,preview_path,status)
values
  ('company-profile-starter','Company Profile Starter','Website','HTML, CSS, JavaScript',
   'Konsep website perusahaan dengan halaman layanan, profil, dan kontak.',399000,
   '["Halaman beranda dan layanan","Struktur profil perusahaan","Tampilan responsif"]','/previews/website.svg','draft'),
  ('business-dashboard-ui','Business Dashboard UI','Dashboard','React, Tailwind CSS',
   'Konsep dashboard operasional dengan ringkasan data dan navigasi.',549000,
   '["Ringkasan metrik","Visualisasi data","Navigasi modul"]','/previews/dashboard.svg','draft'),
  ('ai-assistant-interface','AI Assistant Interface','AI Tools','Next.js, TypeScript',
   'Konsep antarmuka chat untuk asisten AI atau aplikasi internal.',699000,
   '["Tampilan percakapan","Daftar sesi","Area input pesan"]','/previews/assistant.svg','draft'),
  ('team-task-board','Team Task Board','Dashboard','React, JavaScript',
   'Konsep pengelolaan tugas untuk tim kecil dan pekerjaan harian.',499000,
   '["Daftar tugas","Status pekerjaan","Ringkasan tim"]','/previews/operations.svg','draft'),
  ('booking-calendar','Booking Calendar','Website','HTML, CSS, JavaScript',
   'Konsep kalender reservasi untuk usaha jasa dan studio.',449000,
   '["Tampilan kalender","Pilihan tanggal","Alur reservasi"]','/previews/booking.svg','draft'),
  ('creative-portfolio','Creative Portfolio','Website','HTML, CSS',
   'Konsep portofolio untuk freelancer dan studio kreatif.',299000,
   '["Galeri karya","Profil singkat","Halaman kontak"]','/previews/portfolio.svg','draft')
on conflict (slug) do nothing;

-- Grant access to a real admin ONLY after creating a verified Supabase Auth user.
-- DO NOT execute this placeholder:
-- insert into public.market_admins(user_id) values ('<REAL-AUTH-USER-UUID>');
