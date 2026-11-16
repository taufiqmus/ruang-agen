-- Gamifikasi kelas Ruang Agen. Tanpa data pribadi: hanya kode kelas dan nama panggilan.
-- Prasyarat: Authentication, Sign In / Providers, aktifkan "Allow anonymous sign-ins".
-- Jalankan sekali di SQL Editor Supabase.

create table if not exists public.pemain (
  id      uuid primary key references auth.users (id) on delete cascade,
  kelas   text not null check (kelas ~ '^[A-Za-z0-9_-]{2,20}$'),
  nama    text not null check (nama ~ '^[A-Za-z0-9 _.-]{2,16}$'),
  xp      int  not null default 0 check (xp between 0 and 3000),
  badge   text[] not null default '{}' check (cardinality(badge) <= 20),
  diubah  timestamptz not null default now()
);

create table if not exists public.serangan (
  id        bigint generated always as identity primary key,
  pemain_id uuid not null default auth.uid() references public.pemain (id) on delete cascade,
  kelas     text not null check (kelas ~ '^[A-Za-z0-9_-]{2,20}$'),
  pesan     text not null check (char_length(pesan) between 1 and 200),
  hasil     text not null check (hasil in ('diblokir_input', 'ditolak_guard', 'llm_tertipu', 'lolos')),
  dibuat    timestamptz not null default now()
);
create index if not exists serangan_kelas_dibuat on public.serangan (kelas, dibuat desc);
create index if not exists pemain_kelas_xp on public.pemain (kelas, xp desc);

alter table public.pemain   enable row level security;
alter table public.serangan enable row level security;

-- Papan skor dan daftar serangan terbuka untuk pemain yang sudah login anonim.
create policy pemain_baca on public.pemain for select to authenticated using (true);
create policy pemain_isi  on public.pemain for insert to authenticated with check (auth.uid() = id);
create policy pemain_ubah on public.pemain for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy serangan_baca  on public.serangan for select to authenticated using (true);
create policy serangan_isi   on public.serangan for insert to authenticated
  with check (pemain_id = auth.uid() and kelas = (select p.kelas from public.pemain p where p.id = auth.uid()));
create policy serangan_hapus on public.serangan for delete to authenticated using (pemain_id = auth.uid());

-- Batas laju: paling banyak 60 serangan per jam per pemain (anti spam).
create or replace function public.batasi_serangan() returns trigger language plpgsql as $$
begin
  if (select count(*) from public.serangan where pemain_id = new.pemain_id and dibuat > now() - interval '1 hour') >= 60 then
    raise exception 'terlalu banyak serangan, coba lagi nanti';
  end if;
  return new;
end $$;
drop trigger if exists serangan_batas on public.serangan;
create trigger serangan_batas before insert on public.serangan for each row execute function public.batasi_serangan();

-- Catatan keterbatasan: XP dihitung di browser, jadi pemain yang paham DevTools bisa memalsukannya.
-- Constraint di atas hanya membatasi rentang (0 sampai 3000). Cukup untuk permainan kelas, bukan untuk penilaian resmi.
