-- =====================================================================
-- Retire l'index ivfflat : il faisait manquer les bons resultats
--
-- ivfflat partitionne les vecteurs en `lists` paquets et n'en explore que
-- `ivfflat.probes` a la recherche — un seul par defaut. Avec lists = 100 sur
-- 2 244 fragments, chaque requete ne voyait qu'environ 1 % de l'index.
--
-- Mesure : a la question « How do I share state between components in React? »,
-- le bon fragment obtient 0,774 de similarite, mais l'index renvoyait 0,474
-- sur une page sans rapport. La reponse etait en base, jamais trouvee.
--
-- A cette echelle le parcours exact coute quelques millisecondes et ne se
-- trompe jamais. On reintroduira un index approximatif quand le volume le
-- justifiera — avec lists ~ nb_lignes/1000 et probes releve en consequence,
-- pas avec les valeurs d'exemple de la documentation.
-- =====================================================================

drop index if exists doc_chunks_embedding_idx;
