-- ============================================================
-- SCHEMA CORRIGÉ - GROSSISTE PHARMACEUTIQUE TCHAD
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- PROFILES
-- ============================================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  email text not null,
  role text not null default 'employe'
    check (role in ('superadmin', 'admin', 'employe', 'client')),
  actif boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Fonction sécurisée pour récupérer le rôle sans récursion
create or replace function public.get_my_role()
returns text language sql security definer stable as $$
  select role from public.profiles where id = auth.uid() limit 1;
$$;

create policy "profiles_select" on public.profiles
  for select using (auth.role() = 'authenticated');

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create policy "profiles_all_admin" on public.profiles
  for all using (public.get_my_role() in ('superadmin', 'admin'));

-- Trigger création profil auto
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'employe')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- CLIENTS
-- ============================================================
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  telephone text,
  adresse text,
  email text,
  user_id uuid references auth.users(id) on delete set null,
  actif boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.clients enable row level security;

create policy "clients_staff" on public.clients
  for all using (public.get_my_role() in ('superadmin','admin','employe'));

create policy "clients_own" on public.clients
  for select using (user_id = auth.uid());

-- ============================================================
-- MEDICAMENTS
-- ============================================================
create table public.medicaments (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  code text unique,
  description text,
  forme text,
  dosage text,
  marge decimal(10,2) not null default 500,
  seuil_alerte integer not null default 10,
  actif boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.medicaments enable row level security;

create policy "medicaments_read" on public.medicaments
  for select using (auth.role() = 'authenticated');

create policy "medicaments_write" on public.medicaments
  for all using (public.get_my_role() in ('superadmin','admin'));

-- ============================================================
-- LOTS
-- ============================================================
create table public.lots (
  id uuid primary key default gen_random_uuid(),
  medicament_id uuid references public.medicaments(id) on delete cascade not null,
  pays_origine text not null,
  prix_achat decimal(10,2) not null,
  quantite integer not null default 0 check (quantite >= 0),
  quantite_initiale integer not null default 0,
  date_reception date not null,
  date_expiration date not null,
  numero_lot text not null,
  actif boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.lots enable row level security;

create policy "lots_all" on public.lots
  for all using (public.get_my_role() in ('superadmin','admin','employe'));

-- ============================================================
-- COMMANDES
-- ============================================================
create table public.commandes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete restrict not null,
  date_commande timestamptz default now(),
  total decimal(10,2) not null default 0,
  statut text not null default 'en_attente'
    check (statut in ('en_attente','confirmee','preparee','livree','annulee')),
  statut_paiement text not null default 'en_attente'
    check (statut_paiement in ('en_attente','paye','annule')),
  numero_facture text unique,
  facture_url text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.commandes enable row level security;

create policy "commandes_staff" on public.commandes
  for all using (public.get_my_role() in ('superadmin','admin','employe'));

create policy "commandes_client_select" on public.commandes
  for select using (
    exists (
      select 1 from public.clients c
      where c.id = client_id and c.user_id = auth.uid()
    )
  );

create policy "commandes_client_insert" on public.commandes
  for insert with check (
    exists (
      select 1 from public.clients c
      where c.id = client_id and c.user_id = auth.uid()
    )
  );

-- ============================================================
-- COMMANDE_ITEMS
-- ============================================================
create table public.commande_items (
  id uuid primary key default gen_random_uuid(),
  commande_id uuid references public.commandes(id) on delete cascade not null,
  medicament_id uuid references public.medicaments(id) on delete restrict not null,
  quantite integer not null check (quantite > 0),
  prix_unitaire decimal(10,2) not null,
  created_at timestamptz default now()
);

alter table public.commande_items enable row level security;

create policy "items_staff" on public.commande_items
  for all using (public.get_my_role() in ('superadmin','admin','employe'));

create policy "items_client" on public.commande_items
  for select using (
    exists (
      select 1 from public.commandes co
      join public.clients cl on cl.id = co.client_id
      where co.id = commande_id and cl.user_id = auth.uid()
    )
  );

create policy "items_client_insert" on public.commande_items
  for insert with check (
    exists (
      select 1 from public.commandes co
      join public.clients cl on cl.id = co.client_id
      where co.id = commande_id and cl.user_id = auth.uid()
    )
  );

-- ============================================================
-- LOT_MOVEMENTS
-- ============================================================
create table public.lot_movements (
  id uuid primary key default gen_random_uuid(),
  commande_item_id uuid references public.commande_items(id) on delete cascade,
  lot_id uuid references public.lots(id) on delete restrict not null,
  quantite integer not null,
  created_at timestamptz default now()
);

alter table public.lot_movements enable row level security;

create policy "movements_all" on public.lot_movements
  for all using (public.get_my_role() in ('superadmin','admin','employe'));

-- ============================================================
-- PAIEMENTS
-- ============================================================
create table public.paiements (
  id uuid primary key default gen_random_uuid(),
  commande_id uuid references public.commandes(id) on delete restrict not null,
  montant decimal(10,2) not null,
  date_paiement timestamptz default now(),
  mode_paiement text not null default 'cash',
  notes text,
  enregistre_par uuid references auth.users(id),
  created_at timestamptz default now()
);

alter table public.paiements enable row level security;

create policy "paiements_all" on public.paiements
  for all using (public.get_my_role() in ('superadmin','admin','employe'));

-- ============================================================
-- VUE STOCK AGRÉGÉ
-- ============================================================
create or replace view public.stock_medicament as
  select
    m.id as medicament_id,
    m.nom,
    m.code,
    m.marge,
    m.seuil_alerte,
    coalesce(sum(l.quantite), 0) as quantite_totale,
    count(l.id) as nb_lots,
    min(l.prix_achat) as prix_achat_min,
    min(l.date_expiration) as date_expiration_proche
  from public.medicaments m
  left join public.lots l
    on l.medicament_id = m.id
    and l.quantite > 0
    and l.actif = true
    and l.date_expiration > current_date
  where m.actif = true
  group by m.id, m.nom, m.code, m.marge, m.seuil_alerte;

-- ============================================================
-- FONCTION FIFO
-- ============================================================
create or replace function public.get_fifo_price(
  p_medicament_id uuid,
  p_quantite integer
)
returns table (
  lot_id uuid,
  quantite_utilisee integer,
  prix_achat decimal,
  prix_vente decimal
) language plpgsql security definer as $$
declare
  v_restant integer := p_quantite;
  v_lot record;
  v_marge decimal;
begin
  select marge into v_marge from public.medicaments where id = p_medicament_id;
  for v_lot in (
    select l.id, l.quantite, l.prix_achat
    from public.lots l
    where l.medicament_id = p_medicament_id
      and l.quantite > 0
      and l.actif = true
      and l.date_expiration > current_date
    order by l.prix_achat asc, l.date_reception asc
  ) loop
    exit when v_restant <= 0;
    lot_id := v_lot.id;
    quantite_utilisee := least(v_restant, v_lot.quantite);
    prix_achat := v_lot.prix_achat;
    prix_vente := v_lot.prix_achat + v_marge;
    v_restant := v_restant - quantite_utilisee;
    return next;
  end loop;
end;
$$;

-- ============================================================
-- INDEX
-- ============================================================
create index idx_lots_medicament_id on public.lots(medicament_id);
create index idx_lots_quantite on public.lots(quantite) where quantite > 0;
create index idx_lots_date_expiration on public.lots(date_expiration);
create index idx_commandes_client_id on public.commandes(client_id);
create index idx_commandes_date on public.commandes(date_commande desc);
create index idx_commande_items_commande_id on public.commande_items(commande_id);
