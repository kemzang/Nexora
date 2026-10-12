-- =====================================================================
-- Documentation officielle vectorisee
--
-- Les modeles repondent avec les API qu'ils ont vues a l'entrainement : sur un
-- framework qui bouge vite, cela donne du code qui ne compile plus. Indexer la
-- documentation officielle et la fournir au moment de la requete corrige une
-- partie de ces erreurs — pas toutes : le modele peut ignorer le passage qu'on
-- lui donne, et la recherche peut rapporter le mauvais extrait.
--
-- 768 dimensions : c'est ce que produit all-mpnet-base-v2, le modele deja
-- utilise par l'extension pour indexer le code et les docs locales. Les
-- vecteurs calcules cote client sont donc directement comparables a ceux-ci,
-- sans appel d'API ni cout par requete.
-- =====================================================================

create extension if not exists vector;

create table if not exists doc_chunks (
  id          bigserial primary key,
  -- 'react', 'nextjs' … permet de filtrer la recherche sur le stack du projet
  source      text        not null,
  version     text,
  -- chemin du fichier dans le depot d'origine, pour citer la source
  path        text        not null,
  title       text,
  url         text,
  content     text        not null,
  embedding   vector(768) not null,
  token_count int,
  created_at  timestamptz not null default now()
);

create index if not exists doc_chunks_source_idx on doc_chunks (source);

-- ivfflat plutot que hnsw : moins de memoire a la construction, largement
-- suffisant a cette echelle. `lists` se regle a environ sqrt(nb_lignes) ;
-- 100 convient jusqu'a ~100 000 fragments. A revoir au-dela.
create index if not exists doc_chunks_embedding_idx
  on doc_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

/**
 * Recherche par similarite, filtrable par source.
 *
 * Renvoie la distance cosinus convertie en similarite (1 = identique) pour que
 * l'appelant puisse ecarter les resultats trop faibles plutot que de prendre
 * aveuglement les k premiers.
 */
create or replace function match_doc_chunks(
  query_embedding vector(768),
  match_count     int     default 5,
  filter_sources  text[]  default null,
  min_similarity  float   default 0.0
)
returns table (
  id         bigint,
  source     text,
  version    text,
  path       text,
  title      text,
  url        text,
  content    text,
  similarity float
)
language sql stable
as $$
  select
    c.id, c.source, c.version, c.path, c.title, c.url, c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from doc_chunks c
  where (filter_sources is null or c.source = any(filter_sources))
    and 1 - (c.embedding <=> query_embedding) >= min_similarity
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- La table est publique en lecture : son contenu est de la documentation
-- officielle, deja accessible a tous. L'ecriture passe par la cle de service.
alter table doc_chunks enable row level security;

drop policy if exists doc_chunks_read on doc_chunks;
create policy doc_chunks_read on doc_chunks for select using (true);
