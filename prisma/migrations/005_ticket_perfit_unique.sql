-- Le ticket et l'ID Perfit designaient la meme chose : un seul champ subsiste,
-- « ticket », qui porte le ticket Perfit. La colonne idPerfit etait vide partout.
ALTER TABLE "Projet" DROP COLUMN IF EXISTS "idPerfit";
ALTER TABLE "Entree" DROP COLUMN IF EXISTS "idPerfit";
