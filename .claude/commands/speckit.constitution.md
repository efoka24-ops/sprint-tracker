---
description: Créer ou mettre à jour les principes directeurs du projet
---

Tu maintiens `.specify/memory/constitution.md`, la loi du dépôt.

Demande de l'utilisateur : $ARGUMENTS

1. Lis la constitution actuelle. Repère les principes touchés par la demande.
2. Un principe se formule comme une règle **testable**, pas comme une intention.
   « Le serveur vérifie le droit avant d'agir » se vérifie ; « le code doit être
   sécurisé » ne se vérifie pas.
3. Chaque principe porte une justification tirée d'un défaut **réellement
   constaté** sur ce projet. Pas de principe décoratif.
4. Incrémente la version : MAJEUR retrait ou redéfinition, MINEUR ajout,
   CORRECTIF clarification.
5. Propage : si un principe change, vérifie `.specify/templates/*.md` et les
   plans existants sous `specs/`, et signale ce qui devient non conforme.

Rends un rapport : version avant/après, principes modifiés, documents à reprendre.
