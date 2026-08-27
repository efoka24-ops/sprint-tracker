/**
 * Contenu de l'expression de besoin (SFD) — source unique du document Word.
 * Le rendu vit dans scripts/generer-sfd.mjs ; ce fichier ne porte que le texte.
 */

export const ENTETE = {
  titre: 'Sprint Tracker',
  sousTitre: 'Spécifications Fonctionnelles Détaillées',
  perimetre: "Pilotage de la capacité, de l'engagement et des instances de validation d'une squad, "
    + 'du cadrage en faisabilité jusqu\'à la mise en production.',
  organisation: 'Orange Cameroun · Squad Digital',
  version: '1.0',
  date: '27/08/2026',
  statut: 'Brouillon',
  nbCas: '16',
  auteur: 'Emmanuel FOKA',
  validePar: 'À compléter',
};

export const HISTORIQUE = [
  ['1.0', '27/08/2026', 'Emmanuel FOKA',
   "Version initiale — 16 cas d'usage (T01 à T16), 61 scénarios d'exception (SE1 à SE61), 56 règles de gestion (RG1 à RG56)."],
];

export const DEMANDE = {
  identification: [
    ['Nom / Direction', 'Emmanuel FOKA — Scrum Master, Squad Digital, Direction Technique Orange Cameroun'],
    ['Date de la demande', '27/08/2026'],
    ['Référence / ID Perfit', "À affecter à l'ouverture du ticket"],
  ],
  description: [
    ['Description du changement',
     "Créer une plateforme de pilotage de sprint remplaçant le classeur Excel partagé. Elle porte la "
     + "capacité calculée de l'équipe, l'engagement issu des faisabilités, la planification hebdomadaire "
     + 'par développeur, les checklists documentaires exigées à chaque instance de validation (DAB, CAB ACL, '
     + 'CAB Go Live), et la restitution vers les parties prenantes.'],
    ['Raisons du changement',
     "Le déclencheur : l'incapacité à répondre quand la livraison prend du retard. À chaque point "
     + "d'avancement où le sprint dérivait, la question « pourquoi ? » restait sans réponse étayée. Nous "
     + 'avions la sensation — désagréable et récurrente — de ne pas disposer des éléments de réponse : ni la '
     + "capacité réellement disponible de l'équipe, ni ce qui avait été engagé, ni ce qui avait bloqué et "
     + 'depuis quand. Les explications se construisaient de mémoire, en réunion, et ne convainquaient '
     + 'personne, à commencer par nous.\n\n'
     + "Trois causes racines à cette absence d'éléments :\n"
     + "• Une capacité fictive. Les 600 h d'un sprint étaient un chiffre rond posé à la main, que rien ne "
     + "reliait aux congés, aux fériés ni à la composition réelle de l'équipe.\n"
     + '• Un engagement illisible. L\'enveloppe estimée en faisabilité était recopiée sur chaque ligne '
     + 'hebdomadaire : 280 h de projet apparaissaient en 640 h, et le total affiché — 1 116 h — était sans '
     + 'rapport avec les 600 h disponibles.\n'
     + '• Des passages en instance non tracés. Les documents exigés en DAB et en CAB se vérifiaient de '
     + "mémoire ; un dossier incomplet ne se découvrait qu'en comité."],
    ['Origine de la demande', 'Équipe IT — Squad Digital. Constat interne partagé en rétrospective de sprint.'],
  ],
  objectifs: [
    ['Objectif',
     'Permettre au Scrum Master de justifier, à tout moment et en moins de cinq minutes, l\'écart entre ce '
     + 'qui était prévu et ce qui est livré, à partir de données saisies une seule fois : capacité calculée, '
     + 'engagement issu des faisabilités, consommation réelle et blocages datés.'],
    ['Client cible',
     "Squads de développement d'Orange Cameroun — Scrum Masters, Tech Leads, développeurs et observateurs "
     + 'métier. Périmètre initial : Squad Digital, 6 collaborateurs. Extension prévue aux autres squads sans '
     + 'modification du socle.'],
  ],
  planification: [
    ['Priorité',
     'Haute — chaque sprint conduit sans ces éléments reproduit l\'écart de pilotage et prive le comité de '
     + 'suivi d\'informations vérifiables.'],
    ['Date de mise en production souhaitée',
     'Socle déjà en service. Intégration Keycloak souhaitée avant le prochain cycle de revue des accès — '
     + 'échéance flexible.'],
    ['Dépendances / Prérequis',
     'Base PostgreSQL managée · Hébergement Vercel · Instance Keycloak pour la fédération des identités '
     + '(cible) · Référentiel Perfit pour les numéros de ticket'],
  ],
  regulateur: [
    ['Soumission requise ?',
     'Non — outil interne de pilotage. Aucune opération financière, aucun service client, aucune donnée '
     + "d'abonné. Les données traitées sont des données professionnelles de collaborateurs (identité, rôle, "
     + 'temps de travail).'],
    ["Nature de l'information", 'Sans objet'],
    ['Délai réglementaire', 'Sans objet'],
    ['Documents requis',
     'Aucun document régulateur. En interne : la présente SFD et la notice de traitement des données '
     + 'personnelles collaborateurs.'],
    ['Responsable régulatoire', 'Sans objet'],
  ],
};

export const ACTEURS = 'Super admin — administre la plateforme, toutes squads confondues. '
  + 'Scrum Master — pilote sa squad. Tech Lead — anime la revue technique. '
  + 'Développeur — porte les objectifs. Observateur — consulte. '
  + 'Système — traitements automatiques (calculs, contrôles, refus).';

export const CAS = [
  {
    code: 'T01', titre: 'Connexion à la plateforme',
    acteur: 'Tout collaborateur disposant d\'un compte',
    objectif: "Permettre à un collaborateur d'accéder à la plateforme avec les droits de son rôle, et "
      + "l'obliger à remplacer le mot de passe provisoire qui lui a été remis.",
    preconditions: [
      'Un compte a été créé pour le collaborateur par le super admin ou son Scrum Master.',
      'Le compte est actif.',
      'Le collaborateur dispose de son adresse professionnelle et de son mot de passe.',
      'La plateforme est accessible.',
    ],
    postconditions: [
      "Une session est ouverte et le tableau de bord du périmètre de l'utilisateur s'affiche.",
      'La date de dernière connexion est enregistrée.',
      'La navigation ne présente que les écrans autorisés par le rôle.',
      'En cas de mot de passe provisoire, le changement a été effectué et les autres sessions ouvertes sont révoquées.',
    ],
    scenario: [
      ['Collaborateur', "Il ouvre l'adresse de la plateforme."],
      ['Système', "Le système constate l'absence de session et affiche l'écran de connexion."],
      ['Collaborateur', 'Il saisit son adresse professionnelle et son mot de passe.'],
      ['Système', "Le système vérifie les identifiants et l'état actif du compte."],
      ['Système', 'Le système ouvre la session, enregistre la date de connexion et charge les droits du rôle.'],
      ['Système', "Si le mot de passe est provisoire, le système impose l'écran de changement."],
      ['Collaborateur', 'Il accède au tableau de bord, avec la seule navigation autorisée par son rôle.'],
    ],
    exceptions: [
      ['SE1', 'Identifiants incorrects', '« Identifiants incorrects », sans préciser lequel des deux champs est en cause.'],
      ['SE2', 'Compte désactivé', 'Message invitant à contacter le super admin ; la session n\'est pas ouverte.'],
      ['SE3', 'Nouveau mot de passe inférieur à 8 caractères', 'Le changement est refusé et le motif est affiché.'],
      ['SE4', 'Session expirée en cours d\'utilisation', 'Redirection vers la connexion, en conservant la page demandée pour y revenir après identification.'],
    ],
    regles: [
      ['RG1', 'Toute page autre que la connexion et le tableau public exige une session valide.'],
      ['RG2', "Un mot de passe est stocké haché (scrypt, sel unique par compte) ; il n'est jamais restitué en clair, ni affiché, ni journalisé."],
      ['RG3', 'Un changement de mot de passe incrémente la version de session, ce qui révoque toutes les autres sessions ouvertes du compte.'],
      ['RG4', "Un compte désactivé ne peut ouvrir aucune session, et ses sessions en cours cessent d'être valides."],
    ],
  },
  {
    code: 'T02', titre: "Création d'une squad",
    acteur: 'Super admin (ou Scrum Master sans squad, pour la sienne)',
    objectif: "Créer l'entité qui regroupe une équipe, ses sprints et ses projets, et régler la base de "
      + 'calcul de sa capacité : heures par jour et temps de cérémonie retiré.',
    preconditions: [
      "L'utilisateur est connecté et dispose du droit de création de squad.",
      "Le nom envisagé n'est pas déjà porté par une autre squad.",
      "La base horaire de référence de l'équipe est connue.",
    ],
    postconditions: [
      'La squad existe et peut recevoir des comptes, des projets et des sprints.',
      'Sa base de calcul est enregistrée : heures par jour, minutes de daily, rôles concernés par le daily.',
      'Les capacités des sprints ouverts de la squad ont été recalculées.',
      'Un Scrum Master sans squad devient rattaché à celle qu\'il vient de créer.',
    ],
    scenario: [
      ['Super admin', "Il ouvre l'administration, onglet Squads."],
      ['Super admin', 'Il saisit le nom de la squad et valide la création.'],
      ['Système', "Le système vérifie l'unicité du nom et crée la squad avec 8 h/jour et aucun daily déduit."],
      ['Super admin', "Il ajuste les heures par jour si la base de l'équipe diffère."],
      ['Super admin', 'Il saisit la durée du daily en minutes.'],
      ['Système', 'Le système enregistre le réglage et recalcule la capacité de tous les sprints ouverts de la squad.'],
      ['Super admin', 'Il constate la nouvelle capacité affichée sur les sprints concernés.'],
    ],
    exceptions: [
      ['SE5', 'Nom déjà porté par une autre squad', 'Création refusée, le nom en conflit est indiqué.'],
      ['SE6', "Heures par jour hors de l'intervalle 1–24", "Modification refusée, l'intervalle admis est rappelé."],
      ['SE7', "Daily hors de l'intervalle 0–240 minutes", "Modification refusée : un daily ne peut pas absorber la journée."],
      ['SE8', "Suppression d'une squad portant des membres ou des sprints", "Suppression refusée tant que la squad n'est pas vide."],
    ],
    regles: [
      ['RG5', "Le nom d'une squad est unique sur l'ensemble de la plateforme."],
      ['RG6', 'Toute modification des heures par jour, du daily ou des rôles concernés déclenche le recalcul de la capacité des sprints ouverts de la squad.'],
      ['RG7', "Le daily ne peut être déduit qu'aux rôles qui produisent de la capacité, soit Tech Lead et Développeur."],
    ],
  },
  {
    code: 'T03', titre: 'Création des comptes et attribution des rôles',
    acteur: 'Super admin (tous comptes) ou Scrum Master (sa squad uniquement)',
    objectif: "Doter chaque collaborateur d'un compte portant le rôle qui détermine l'intégralité de ses "
      + 'droits, sans attribution de permission à la carte.',
    preconditions: [
      "L'utilisateur dispose du droit d'administrer des comptes, globalement ou sur sa squad.",
      "La squad d'accueil existe.",
      "L'adresse professionnelle du collaborateur est connue et n'est pas déjà utilisée.",
      "Le rôle à attribuer figure parmi ceux que l'utilisateur peut attribuer.",
    ],
    postconditions: [
      'Le compte existe, actif, rattaché à une squad et porteur d\'un rôle.',
      'Un mot de passe provisoire a été généré et affiché une seule fois.',
      'Le compte doit changer son mot de passe à la première connexion.',
      'Si le rôle produit de la capacité, celle des sprints ouverts a été recalculée.',
    ],
    scenario: [
      ['Scrum Master', "Il ouvre l'administration, onglet Comptes."],
      ['Scrum Master', 'Il saisit le nom et l\'adresse professionnelle du collaborateur.'],
      ['Scrum Master', "Il choisit le rôle parmi ceux qu'il peut attribuer : Tech Lead, Développeur ou Observateur."],
      ['Système', "Le système vérifie l'unicité de l'adresse et la légitimité du rôle demandé."],
      ['Système', 'Le système crée le compte, génère un mot de passe provisoire et l\'affiche une seule fois.'],
      ['Scrum Master', 'Il transmet le mot de passe provisoire au collaborateur par un canal distinct.'],
      ['Système', 'Le système recalcule la capacité des sprints ouverts si le rôle créé produit de la capacité.'],
    ],
    exceptions: [
      ['SE9', 'Adresse déjà utilisée par un autre compte', 'Création refusée, le conflit est signalé.'],
      ['SE10', 'Un Scrum Master tente d\'attribuer le rôle Super admin ou Scrum Master', "Refus : ce rôle ne figure pas parmi ceux qu'il peut attribuer."],
      ['SE11', "Un Scrum Master tente d'agir sur un compte d'une autre squad", 'Refus : le compte est hors de son périmètre.'],
      ['SE12', 'Rétrogradation ou désactivation du dernier super admin actif', 'Refus : la plateforme doit conserver un administrateur.'],
      ['SE13', 'Un utilisateur tente de modifier son propre rôle', 'Refus : nul ne modifie son propre niveau de droits.'],
    ],
    regles: [
      ['RG8', "Le rôle porte l'intégralité des droits. Aucun droit ne s'attribue individuellement."],
      ['RG9', 'Le super admin administre tous les comptes ; le Scrum Master administre les seuls comptes non privilégiés de sa propre squad.'],
      ['RG10', 'Un Scrum Master ne peut attribuer que les rôles Tech Lead, Développeur et Observateur.'],
      ['RG11', 'La plateforme conserve en permanence au moins un compte super admin actif.'],
      ['RG12', 'Un mot de passe provisoire s\'affiche une seule fois et ne peut être réaffiché ; seule une réinitialisation en produit un nouveau.'],
      ['RG13', "Un utilisateur dont le rôle n'ouvre pas un écran est redirigé, jamais servi un écran vide."],
    ],
  },
  {
    code: 'T04', titre: "Création d'un sprint",
    acteur: 'Scrum Master (ou super admin)',
    objectif: 'Ouvrir un cycle de travail sur une période donnée, le découper en semaines de revue et en '
      + "déduire la capacité réellement disponible, sans qu'aucun chiffre ne soit saisi à la main.",
    preconditions: [
      "L'utilisateur dispose du droit de création de sprint.",
      "Il est rattaché à une squad, ou désigne la squad cible s'il est super admin.",
      'La squad compte au moins un membre produisant de la capacité.',
      "La période envisagée ne chevauche aucun sprint existant de la squad.",
    ],
    postconditions: [
      'Le sprint existe, numéroté et rattaché à la squad.',
      'La période est découpée en semaines de revue, du lundi au vendredi.',
      'La capacité de chaque semaine et le total du sprint sont calculés et enregistrés.',
      'Les objectifs hebdomadaires peuvent être saisis sur les semaines ouvertes.',
    ],
    scenario: [
      ['Scrum Master', "Il ouvre l'administration, onglet Sprints."],
      ['Scrum Master', 'Il saisit le numéro du sprint et sa période, du premier au dernier jour.'],
      ['Système', "Le système vérifie l'unicité du numéro dans la squad et l'absence de chevauchement."],
      ['Système', "Le système découpe la période en semaines de revue s'achevant le vendredi."],
      ['Système', 'Le système calcule la capacité de chaque semaine : membres producteurs × jours ouvrés hors fériés et congés × heures nettes du daily.'],
      ['Système', 'Le système enregistre la capacité totale du sprint.'],
      ['Scrum Master', "Il consulte la capacité obtenue et confronte l'engagement du portefeuille à ce plafond."],
    ],
    exceptions: [
      ['SE14', 'Numéro de sprint déjà utilisé dans la squad', 'Création refusée, le conflit est nommé.'],
      ['SE15', 'Période chevauchant un sprint existant', 'Création refusée, le sprint en conflit est nommé.'],
      ['SE16', 'Date de fin antérieure à la date de début', 'Création refusée.'],
      ['SE17', 'Modification de période réduisant le nombre de semaines alors que des objectifs sont saisis', 'Refus, avec le nombre de saisies concernées et le nombre de semaines à conserver.'],
    ],
    regles: [
      ['RG14', "La capacité d'une semaine vaut : Σ des membres producteurs × (jours ouvrés − fériés − congés) × (heures par jour − durée du daily)."],
      ['RG15', 'Seuls les rôles Tech Lead et Développeur produisent de la capacité. Le Scrum Master anime le sprint sans y porter de charge.'],
      ['RG16', 'La capacité est toujours calculée, jamais saisie. Aucun écran ne permet de la forcer.'],
      ['RG17', "Le numéro d'un sprint est unique au sein d'une squad, et deux sprints d'une même squad ne peuvent se chevaucher."],
      ['RG18', 'Une semaine de revue court du lundi au vendredi ; le vendredi est le point de validation.'],
    ],
  },
  {
    code: 'T05', titre: 'Déclaration des absences et des jours fériés',
    acteur: 'Scrum Master, ou collaborateur pour ses propres absences',
    objectif: 'Répercuter les absences et les jours chômés sur la capacité, afin que le sprint reflète la '
      + "disponibilité réelle de l'équipe et non un effectif théorique.",
    preconditions: [
      "L'utilisateur est connecté.",
      "Le collaborateur concerné appartient au périmètre de l'utilisateur.",
      "Les dates de l'absence sont connues.",
      'Un sprint ouvert couvre au moins partiellement la période.',
    ],
    postconditions: [
      "L'absence ou le jour férié est enregistré.",
      'La capacité des semaines concernées a diminué du volume correspondant.',
      'La capacité totale des sprints ouverts a été mise à jour.',
      'La bande passante du collaborateur reflète sa disponibilité réduite.',
    ],
    scenario: [
      ['Scrum Master', "Il ouvre l'administration, onglet Calendrier."],
      ['Scrum Master', "Il sélectionne le collaborateur et saisit les dates de début et de fin de l'absence."],
      ['Système', "Le système vérifie que le collaborateur relève du périmètre de l'utilisateur."],
      ['Système', 'Le système ne retient que les jours ouvrés de la période, week-ends et fériés exclus.'],
      ['Système', 'Le système recalcule la capacité des semaines concernées et le total des sprints ouverts.'],
      ['Scrum Master', 'Il constate la capacité réduite sur le sprint et sur la bande passante du collaborateur.'],
    ],
    exceptions: [
      ['SE18', "Collaborateur hors du périmètre de l'utilisateur", 'Enregistrement refusé.'],
      ['SE19', 'Absence entièrement hors des périodes de sprint', 'Enregistrement accepté, sans effet sur la capacité.'],
      ['SE20', 'Jour férié tombant un week-end', 'Enregistré, sans effet : il ne retire aucun jour ouvré.'],
      ['SE21', "Absence couvrant l'intégralité d'une semaine", 'Capacité nulle pour ce collaborateur sur la semaine, et aucun daily décompté.'],
    ],
    regles: [
      ['RG19', "Un jour férié sans squad désignée s'applique à toutes les squads ; rattaché à une squad, il ne vaut que pour elle."],
      ['RG20', "Un jour à la fois férié et couvert par un congé n'est décompté qu'une seule fois."],
      ['RG21', "Le daily n'est retiré que sur les jours effectivement travaillés : un jour d'absence n'en consomme pas."],
    ],
  },
  {
    code: 'T06', titre: 'Constitution du portefeuille de projets',
    acteur: 'Scrum Master (ou super admin)',
    objectif: "Enregistrer, pour chaque projet issu de la faisabilité, l'enveloppe estimée en heures et en "
      + "story points ainsi que ses porteurs, afin que l'engagement de la squad se lise en une ligne et se "
      + 'compare à la capacité.',
    preconditions: [
      "L'utilisateur dispose du droit de création de sprint et de projet.",
      'Il est rattaché à une squad.',
      'La faisabilité du projet a été réalisée : heures et story points sont arrêtés.',
      'Le ticket Perfit du projet est connu.',
      "Les porteurs pressentis disposent d'un compte actif dans la squad.",
    ],
    postconditions: [
      'Le projet existe avec son ticket Perfit, son enveloppe et ses porteurs.',
      "L'engagement de la squad intègre l'enveloppe si le projet est actif.",
      'La charge — engagement rapporté à la capacité du sprint — est affichée.',
      "Les objectifs hebdomadaires peuvent s'imputer sur ce projet.",
    ],
    scenario: [
      ['Scrum Master', "Il ouvre l'administration, onglet Projets."],
      ['Scrum Master', "Il saisit le ticket Perfit, le libellé du projet, l'enveloppe en heures et les story points issus de la faisabilité."],
      ['Système', "Le système vérifie que le ticket n'est pas déjà porté par un autre projet de la squad."],
      ['Système', "Le système crée le projet au statut Actif et l'intègre à l'engagement."],
      ['Scrum Master', 'Il désigne le ou les porteurs du projet parmi les membres de la squad.'],
      ['Système', "Le système enregistre les porteurs et recalcule l'engagement, les story points et la charge."],
      ['Scrum Master', "Il compare l'engagement obtenu à la capacité du sprint et arbitre le portefeuille."],
    ],
    exceptions: [
      ['SE22', 'Ticket Perfit déjà porté par un projet de la squad', 'Création refusée, le projet en conflit est nommé.'],
      ['SE23', 'Porteur désigné hors de la squad du projet', "Refus : on ne porte pas un projet d'une autre équipe."],
      ['SE24', 'Enveloppe ou story points négatifs', 'Enregistrement refusé.'],
      ['SE25', "Suppression d'un projet portant des objectifs hebdomadaires", "Refus, avec le nombre d'objectifs rattachés et l'invitation à passer le projet en Terminé."],
    ],
    regles: [
      ['RG22', "L'enveloppe de faisabilité est portée par le projet et par lui seul. Elle n'est jamais recopiée sur les lignes hebdomadaires."],
      ['RG23', 'Un projet est identifié par son ticket Perfit, unique au sein de la squad.'],
      ['RG24', 'Un projet peut avoir plusieurs porteurs.'],
      ['RG25', "L'engagement de la squad est la somme des enveloppes des projets Actifs. Un projet Bloqué ou Terminé en est exclu."],
      ['RG26', "Les heures exclues de l'engagement restent affichées, avec le motif de leur exclusion."],
    ],
    encart: {
      titre: 'Illustration — Squad Digital, sprint #01',
      texte: 'Quatre projets actifs totalisent 413 h et 89 SP ; GTR Flow, bloqué, met 12 h de côté sans les '
        + "faire disparaître. Rapporté aux 600 h de capacité, l'engagement représente une charge de 69 %. "
        + "Avant la règle RG22, ce même portefeuille s'affichait à 1 116 h — sans rapport avec la capacité, "
        + 'donc inexploitable en comité.',
    },
  },
  {
    code: 'T07', titre: "Saisie d'un objectif hebdomadaire",
    acteur: 'Développeur (pour lui-même)',
    objectif: "Déclarer ce que le collaborateur s'engage à produire dans la semaine, sur un projet du "
      + 'portefeuille, avec les heures réellement prévues pour cette semaine.',
    preconditions: [
      'Le collaborateur est connecté et son rôle autorise la saisie.',
      'Un sprint de sa squad est ouvert et comporte au moins une semaine non clôturée.',
      'Le projet concerné existe au portefeuille avec son ticket Perfit.',
      "Le collaborateur connaît les heures qu'il consacrera à cet objectif dans la semaine.",
    ],
    postconditions: [
      "L'objectif est enregistré sur la semaine choisie, au nom du collaborateur.",
      'Les heures prévues sont imputées sur sa bande passante de la semaine.',
      'Le total de ses heures sur la semaine ne dépasse pas sa capacité.',
      "L'objectif apparaît au tableau de bord et à la réunion de validation.",
    ],
    scenario: [
      ['Développeur', "Il ouvre l'écran Ma saisie."],
      ['Développeur', 'Il choisit la semaine ouverte concernée.'],
      ['Développeur', "Il saisit le ticket Perfit, le projet et l'objectif de la semaine."],
      ['Développeur', "Il saisit les heures qu'il prévoit d'y consacrer cette semaine."],
      ['Système', 'Le système vérifie que la semaine est ouverte et que le collaborateur saisit bien pour lui-même.'],
      ['Système', 'Le système contrôle que le total de ses heures sur la semaine tient dans sa capacité.'],
      ['Système', "Le système enregistre l'objectif et met à jour la bande passante."],
    ],
    exceptions: [
      ['SE26', 'Heures supérieures à la capacité hebdomadaire du porteur', "Saisie refusée. Le message rappelle la capacité disponible et distingue l'enveloppe du projet, qui se règle au portefeuille, des heures de la semaine."],
      ['SE27', 'Semaine clôturée', 'Saisie refusée, sauf pour les rôles qui pilotent la squad.'],
      ['SE28', "Tentative de saisie au nom d'un autre collaborateur sans le droit d'affectation", 'Refus : chacun ne saisit que ses propres objectifs.'],
      ['SE29', "Statut d'exécution demandé dont les prérequis documentaires ne sont pas validés", 'Refus, la checklist manquante est nommée.'],
    ],
    regles: [
      ['RG27', "Une ligne hebdomadaire porte les heures prévues pour sa seule semaine, jamais l'enveloppe du projet."],
      ['RG28', "La somme des heures prévues d'un porteur sur une semaine ne peut excéder sa capacité hebdomadaire. Le contrôle porte sur la somme, non sur chaque ligne isolément."],
      ['RG29', "La clôture d'une semaine ferme la saisie, sauf pour les rôles qui pilotent la squad."],
    ],
  },
  {
    code: 'T08', titre: "Affectation d'un objectif à un porteur",
    acteur: 'Scrum Master (ou super admin)',
    objectif: "Confier un objectif à un membre de la squad, ou le transférer d'un porteur ou d'une semaine à "
      + "l'autre, lors d'un arbitrage de charge.",
    preconditions: [
      "L'utilisateur dispose du droit d'affectation.",
      'Le porteur visé est actif et appartient à la squad du sprint.',
      'La semaine de destination est ouverte.',
      "La capacité résiduelle du porteur sur cette semaine permet d'accueillir l'objectif.",
    ],
    postconditions: [
      "L'objectif est porté par le collaborateur désigné, sur la semaine désignée.",
      'Les bandes passantes de l\'ancien et du nouveau porteur sont mises à jour.',
      "L'objectif apparaît dans la saisie du nouveau porteur.",
    ],
    scenario: [
      ['Scrum Master', "Il ouvre l'administration, onglet Objectifs."],
      ['Scrum Master', 'Il consulte les bandes passantes pour repérer qui peut prendre un sujet de plus.'],
      ['Scrum Master', "Il sélectionne l'objectif et désigne le porteur ainsi que la semaine."],
      ['Système', 'Le système vérifie que le porteur est actif et appartient à la squad du sprint.'],
      ['Système', 'Le système contrôle que la capacité du porteur absorbe les heures affectées.'],
      ['Système', "Le système enregistre l'affectation et met à jour les deux bandes passantes."],
      ['Scrum Master', "Il vérifie l'équilibre de charge obtenu sur la semaine."],
    ],
    exceptions: [
      ['SE30', 'Porteur appartenant à une autre squad', 'Affectation refusée.'],
      ['SE31', 'Porteur désactivé', 'Affectation refusée.'],
      ['SE32', "Réaffectation tentée par un rôle sans droit d'affectation", 'Refus : la réaffectation relève du pilotage de la squad.'],
      ['SE33', 'Capacité du porteur insuffisante sur la semaine visée', 'Refus, avec la capacité disponible et les heures demandées.'],
    ],
    regles: [
      ['RG30', "Seuls le super admin et le Scrum Master peuvent affecter un objectif à un autre porteur ou le déplacer d'une semaine à l'autre."],
      ['RG31', "Un porteur doit appartenir à la squad du sprint auquel l'objectif se rattache."],
    ],
  },
  {
    code: 'T09', titre: 'Consultation de la bande passante',
    acteur: 'Scrum Master, Tech Lead, Développeur, Observateur',
    objectif: "Répondre à la question « qui peut prendre un sujet de plus, et qui est déjà au-delà ? », "
      + 'porteur par porteur et semaine par semaine.',
    preconditions: [
      "L'utilisateur est connecté et son rôle autorise la consultation du tableau de bord.",
      'Un sprint de son périmètre comporte au moins une semaine.',
      'Les objectifs de la semaine ont été saisis.',
    ],
    postconditions: [
      "Le disponible, l'engagé, le consommé et le restant s'affichent pour chaque porteur.",
      'Un état de charge qualifie chaque porteur : disponible, partielle, chargée ou surchargée.',
      "Aucune donnée d'une autre squad n'est présentée, sauf vision transverse.",
      'Aucune écriture n\'a été produite : la consultation est sans effet.',
    ],
    scenario: [
      ['Scrum Master', 'Il ouvre le tableau de bord.'],
      ['Scrum Master', 'Il sélectionne la semaine à examiner.'],
      ['Système', 'Le système calcule, pour chaque porteur, ses jours disponibles et sa capacité nette.'],
      ['Système', 'Le système agrège les heures engagées, les heures consommées et les rallonges accordées.'],
      ['Système', "Le système en déduit le restant et l'état de charge de chacun."],
      ['Scrum Master', 'Il identifie les porteurs disponibles et ceux en dépassement.'],
      ['Scrum Master', 'Il arbitre : nouvelle affectation, rallonge ou report.'],
    ],
    exceptions: [
      ['SE34', 'Aucun sprint configuré', "Message de démarrage ; le lien de création n'apparaît qu'aux rôles habilités."],
      ['SE35', 'Utilisateur sans squad', "Aucune donnée de squad n'est présentée, sans message d'erreur technique."],
      ['SE36', "Demande d'une semaine d'une autre squad par son identifiant", 'Refus : la semaine est hors périmètre.'],
    ],
    regles: [
      ['RG32', "Le restant d'un porteur vaut : capacité + rallonges accordées − le plus élevé de l'engagé et du consommé."],
      ['RG33', "Hors vision transverse, toute lecture et toute écriture se bornent à la squad de l'utilisateur."],
      ['RG34', 'La consultation ne produit aucune écriture métier.'],
    ],
  },
  {
    code: 'T10', titre: 'Validation des prérequis du sprint',
    acteur: 'Scrum Master ou Tech Lead',
    objectif: 'Attester que les documents exigés avant le lancement du sprint — spécifications détaillées '
      + "et cahier des tests — sont disponibles, condition d'accès de tout ticket à l'instance DAB.",
    preconditions: [
      'Un sprint de la squad est ouvert.',
      "L'utilisateur dispose du droit de cocher et de valider une checklist.",
      'Le référentiel documentaire est amorcé.',
      "Les documents attendus ont été produits par l'équipe.",
    ],
    postconditions: [
      'Les checklists SDD et Cahier des tests portent le statut Validé.',
      'Chaque validation est signée et horodatée au nom de son auteur.',
      "Les cases d'une checklist validée ne sont plus modifiables.",
      "Les tickets du sprint peuvent accéder à l'instance DAB.",
    ],
    scenario: [
      ['Scrum Master', "Il ouvre l'écran Réunion de validation."],
      ['Système', 'Le système présente les prérequis du sprint et leurs items issus du référentiel.'],
      ['Scrum Master', 'Il coche chaque document disponible et commente ceux qui appellent une précision.'],
      ['Système', 'Le système enregistre chaque coche avec son auteur et son horodatage.'],
      ['Scrum Master', 'Une fois tous les items cochés, il valide la checklist.'],
      ['Système', "Le système vérifie l'exhaustivité, appose la signature et fige les cases."],
      ['Scrum Master', "Il répète l'opération pour le cahier des tests."],
    ],
    exceptions: [
      ['SE37', 'Validation demandée avec un item non coché', 'Refus : tous les items doivent être cochés au préalable.'],
      ['SE38', "Tentative de modifier une case d'une checklist validée", "Refus : la checklist doit d'abord être rouverte par un rôle habilité."],
      ['SE39', 'Utilisateur sans droit de validation', 'Les commandes de validation ne lui sont pas présentées, et toute tentative est refusée par le serveur.'],
      ['SE40', "Sprint d'une autre squad", 'Refus : hors périmètre.'],
    ],
    regles: [
      ['RG35', "Une checklist ne se valide qu'une fois tous ses items cochés."],
      ['RG36', 'Une validation est nominative et horodatée.'],
      ['RG37', "Les items d'une checklist sont recopiés du référentiel à sa création : une évolution ultérieure du référentiel ne modifie pas les checklists déjà ouvertes."],
      ['RG38', "Les prérequis SDD et Cahier des tests s'apprécient au niveau du sprint, non du ticket."],
    ],
  },
  {
    code: 'T11', titre: "Validation d'une instance DAB ou CAB",
    acteur: 'Scrum Master ou Tech Lead',
    objectif: 'Constituer et attester le dossier documentaire exigé avant chaque comité — DAB, CAB ACL puis '
      + "CAB Go Live — et interdire au ticket de franchir l'étape tant que le dossier n'est pas complet.",
    preconditions: [
      "Le ticket existe comme objectif d'une semaine du sprint.",
      'Les prérequis du sprint sont validés pour un passage en DAB.',
      "L'utilisateur dispose du droit de cocher et de valider.",
      "Les documents exigés par l'instance visée ont été produits.",
    ],
    postconditions: [
      "La checklist de l'instance porte le statut Validé, signée et horodatée.",
      "Le ticket peut prendre le statut d'exécution correspondant.",
      'Le suivi des checklists présente le ticket et son avancement documentaire.',
      "Un badge d'avancement apparaît au tableau public.",
    ],
    scenario: [
      ['Tech Lead', 'Il ouvre la réunion de validation et déplie la checklist du ticket concerné.'],
      ['Système', 'Le système présente les checklists DAB, CAB ACL et CAB Go Live du ticket, avec leurs items.'],
      ['Tech Lead', "Il coche les documents de l'instance visée : document technique, schémas d'architecture, ticket SWAN, checklist sécurité, mode opératoire, plan de retour arrière."],
      ['Système', 'Le système enregistre chaque coche avec son auteur et son horodatage.'],
      ['Tech Lead', 'Il valide la checklist une fois le dossier complet.'],
      ['Tech Lead', "Il fait passer le ticket au statut d'exécution correspondant."],
      ['Système', 'Le système vérifie que la checklist prérequise est validée, puis accepte le changement de statut.'],
    ],
    exceptions: [
      ['SE41', "Passage en DAB demandé alors que SDD ou Cahier des tests n'est pas validé", 'Refus : la checklist manquante est nommée, ainsi que le rôle habilité à la valider.'],
      ['SE42', 'Passage en CAB ACL demandé sans DAB validé sur le ticket', 'Refus, la checklist manquante est nommée.'],
      ['SE43', 'Passage en Go Live demandé sans CAB ACL validé', 'Refus, la checklist manquante est nommée.'],
      ['SE44', "Réouverture d'une checklist validée", 'Opération réservée aux rôles habilités ; la signature est levée et les cases redeviennent modifiables.'],
    ],
    regles: [
      ['RG39', 'La chaîne de validation est séquentielle : Passage en DAB exige SDD et Cahier des tests ; CAB ACL exige DAB ; CAB Go Live exige CAB ACL ; Live exige CAB Go Live.'],
      ['RG40', "Les prérequis SDD et Cahier des tests s'apprécient au niveau du sprint ; DAB, CAB ACL et CAB Go Live au niveau du ticket."],
      ['RG41', "Un ticket entre au suivi documentaire dès qu'une checklist est ouverte pour lui, quel que soit son statut d'exécution."],
      ['RG42', "Les états d'exception — Incident, Bloqué — ne valent pas avancement dans la chaîne de validation."],
    ],
    encart: {
      titre: 'Point non tranché — bloquant',
      texte: "La règle RG39 n'est aujourd'hui appliquée qu'au changement de statut, pas à la validation de la "
        + 'checklist elle-même. Une checklist Go Live peut donc être validée sans que DAB et CAB ACL l\'aient '
        + 'été. La fermeture de la chaîne à la validation reste à arbitrer et à développer. Le document '
        + 'Checklist Factory prévoit par ailleurs trois signatures — Scrum Master, Lead technique et Product '
        + "Owner. La plateforme n'en enregistre qu'une, et le rôle Product Owner n'existe pas encore.",
      alerte: true,
    },
  },
  {
    code: 'T12', titre: 'Réunion de validation du vendredi',
    acteur: 'Tech Lead ou Scrum Master',
    objectif: 'Tenir le point hebdomadaire : consigner les heures réellement consommées, ajuster le statut '
      + "d'exécution de chaque objectif et attester ceux qui sont atteints.",
    preconditions: [
      "L'utilisateur dispose du droit de validation des objectifs.",
      "Une semaine du sprint est en cours ou vient de s'achever.",
      'Des objectifs ont été saisis sur cette semaine.',
      'Les porteurs ont communiqué leur avancement.',
    ],
    postconditions: [
      'Les heures réelles sont consignées pour chaque objectif examiné.',
      "Les statuts d'exécution reflètent l'avancement constaté.",
      'Les objectifs atteints portent la mention validé.',
      'Les changements de statut sont tracés avec leur auteur et leur date.',
    ],
    scenario: [
      ['Tech Lead', "Il ouvre l'écran Réunion de validation et sélectionne la semaine."],
      ['Système', 'Le système affiche les objectifs de la semaine, porteur par porteur, avec capacité et réel.'],
      ['Tech Lead', 'Pour chaque objectif, il saisit les heures réellement consommées.'],
      ['Tech Lead', "Il ajuste le statut d'exécution selon l'avancement constaté."],
      ['Système', 'Le système contrôle les prérequis documentaires du statut demandé et trace le changement.'],
      ['Tech Lead', 'Il coche les objectifs atteints.'],
      ['Tech Lead', 'Il examine les demandes de rallonge des objectifs non tenus.'],
    ],
    exceptions: [
      ['SE45', 'Utilisateur sans droit de validation', "L'écran ne lui est pas servi : il est redirigé vers le tableau de bord."],
      ['SE46', 'Statut demandé dont les prérequis documentaires manquent', 'Refus ; le statut affiché revient à sa valeur antérieure et la checklist manquante est nommée.'],
      ['SE47', 'Aucune semaine disponible', 'Message informatif, sans erreur technique.'],
      ['SE48', 'Heures réelles supérieures à la capacité du porteur', "Enregistrement accepté et signalé : le constaté n'est jamais refusé, il est rendu visible."],
    ],
    regles: [
      ['RG43', 'Le point de validation se tient le vendredi, dernier jour ouvré de la semaine de revue.'],
      ['RG44', "Les heures réellement consommées sont consignées telles qu'elles sont constatées, même en dépassement : le contrôle de capacité porte sur le prévisionnel, jamais sur le réalisé."],
      ['RG45', "Tout changement de statut d'exécution est tracé avec son auteur, son ancien et son nouveau statut, et sa date."],
      ['RG46', 'Le porteur peut corriger ses propres heures et son propre statut ; la mention validé est réservée aux rôles habilités.'],
    ],
  },
  {
    code: 'T13', titre: "Demande et arbitrage d'une rallonge",
    acteur: 'Développeur (demande) · Scrum Master ou Tech Lead (arbitrage)',
    objectif: "Formaliser le besoin d'heures supplémentaires ou de report d'un objectif non tenu, et en "
      + 'conserver la décision motivée.',
    preconditions: [
      "L'objectif existe et est porté par le demandeur.",
      "L'objectif n'est pas terminé.",
      "Le volume d'heures supplémentaires est estimé.",
      'Le motif du dépassement est explicable.',
    ],
    postconditions: [
      'La demande est enregistrée avec son volume, son motif et son demandeur.',
      'Le décideur voit la demande à la réunion de validation.',
      'La décision — accordée ou refusée — est enregistrée avec son auteur et sa date.',
      'Une rallonge accordée augmente la bande passante du porteur sur la semaine.',
    ],
    scenario: [
      ['Développeur', "Il constate qu'un objectif ne tiendra pas dans les heures prévues."],
      ['Développeur', 'Il ouvre une demande de rallonge sur cet objectif.'],
      ['Développeur', "Il saisit le volume d'heures nécessaire et le motif."],
      ['Système', "Le système vérifie que le demandeur porte bien l'objectif et enregistre la demande."],
      ['Scrum Master', 'Il examine la demande lors de la réunion de validation.'],
      ['Scrum Master', 'Il accorde ou refuse, en motivant sa réponse.'],
      ['Système', "Le système enregistre la décision et, si elle est favorable, l'impute sur la bande passante du porteur."],
    ],
    exceptions: [
      ['SE49', "Demande sur un objectif porté par un autre collaborateur", 'Refus.'],
      ['SE50', 'Demande sur un objectif déjà terminé', "Refus : un point livré n'ouvre pas de rallonge."],
      ['SE51', 'Arbitrage tenté par un rôle sans droit de décision', 'Refus : la décision relève du pilotage de la squad.'],
    ],
    regles: [
      ['RG47', "Une rallonge est demandée par le porteur de l'objectif et décidée par un rôle qui pilote la squad."],
      ['RG48', 'Seules les rallonges accordées entrent dans la bande passante ; une demande en attente reste sans effet.'],
      ['RG49', "Un objectif terminé n'ouvre pas de rallonge."],
    ],
  },
  {
    code: 'T14', titre: "Clôture d'une semaine et d'un sprint",
    acteur: 'Tech Lead ou Scrum Master',
    objectif: "Arrêter les chiffres d'une semaine puis d'un sprint, de sorte que les données servant au "
      + 'rapport et à la rétrospective ne bougent plus.',
    preconditions: [
      "L'utilisateur dispose du droit de clôture.",
      "La réunion de validation de la semaine s'est tenue.",
      'Les heures réelles et les statuts sont à jour.',
      'Les demandes de rallonge de la semaine ont été arbitrées.',
    ],
    postconditions: [
      'La semaine est clôturée et la saisie y est fermée aux porteurs.',
      'Les chiffres de la semaine sont figés pour le rapport et la tendance.',
      "Une fois toutes les semaines clôturées, le sprint peut l'être à son tour.",
      'La rétrospective du sprint devient accessible.',
    ],
    scenario: [
      ['Tech Lead', 'Il vérifie que tous les objectifs de la semaine ont été examinés.'],
      ['Tech Lead', 'Il déclenche la clôture de la semaine.'],
      ['Système', 'Le système contrôle le droit de clôture et le périmètre.'],
      ['Système', 'Le système marque la semaine close et ferme la saisie aux porteurs.'],
      ['Scrum Master', 'À la dernière semaine, il déclenche la clôture du sprint.'],
      ['Système', "Le système marque le sprint clos et ouvre l'accès à sa rétrospective."],
      ['Scrum Master', 'Il édite le rapport de clôture destiné au comité.'],
    ],
    exceptions: [
      ['SE52', 'Saisie tentée sur une semaine clôturée', 'Refus, sauf pour les rôles qui pilotent la squad.'],
      ['SE53', "Suppression d'un sprint portant des saisies", 'Refus : le sprint se clôture, il ne se supprime pas. La suppression forcée est réservée au super admin.'],
      ['SE54', "Clôture tentée sur un sprint d'une autre squad", 'Refus : hors périmètre.'],
    ],
    regles: [
      ['RG50', "La clôture d'une semaine ferme la saisie aux porteurs ; les rôles qui pilotent la squad conservent la main pour corriger."],
      ['RG51', 'Un sprint portant des saisies ne se supprime pas : il se clôture. Seul le super admin peut forcer la suppression.'],
    ],
  },
  {
    code: 'T15', titre: 'Rétrospective de sprint',
    acteur: 'Scrum Master ou Tech Lead',
    objectif: "Consigner le bilan du sprint, ce qui a fonctionné, ce qui n'a pas fonctionné et les "
      + 'améliorations retenues, à partir d\'un bilan chiffré calculé automatiquement.',
    preconditions: [
      'Le sprint est clôturé.',
      "L'utilisateur dispose du droit de clôture, qui ouvre l'écriture de la rétrospective.",
      'Les heures réelles et les statuts ont été consignés.',
      "La séance de rétrospective s'est tenue avec l'équipe.",
    ],
    postconditions: [
      'Le bilan, les points forts, les points faibles et les améliorations sont enregistrés.',
      "L'animateur de la rétrospective est identifié.",
      'Le bilan chiffré calculé accompagne le commentaire rédigé.',
      'La rétrospective est consultable par les membres de la squad.',
    ],
    scenario: [
      ['Scrum Master', 'Il ouvre la rétrospective du sprint clôturé.'],
      ['Système', 'Le système calcule le bilan chiffré : objectifs validés, capacité consommée, sujets bloqués.'],
      ['Scrum Master', 'Il rédige le bilan du sprint au regard de ces chiffres.'],
      ['Scrum Master', 'Il consigne les points forts relevés en séance.'],
      ['Scrum Master', 'Il consigne les points faibles et les difficultés rencontrées.'],
      ['Scrum Master', 'Il note les améliorations retenues pour le sprint suivant.'],
      ['Système', "Le système enregistre chaque section et l'attribue à son auteur."],
    ],
    exceptions: [
      ['SE55', "Utilisateur sans droit d'écriture", "La rétrospective s'affiche en lecture seule, sans commande d'édition."],
      ['SE56', "Sprint d'une autre squad", 'Refus : hors périmètre.'],
      ['SE57', 'Bilan chiffré non calculable', 'Les sections rédigées restent accessibles ; seul le bilan chiffré est omis.'],
    ],
    regles: [
      ['RG52', "L'écriture de la rétrospective est réservée aux rôles qui clôturent une semaine ; la lecture est ouverte à toute la squad."],
      ['RG53', "L'animateur enregistré est l'auteur de l'écriture, jamais une valeur transmise par le poste client."],
    ],
  },
  {
    code: 'T16', titre: 'Restitution et tableau public',
    acteur: 'Scrum Master, Observateur, partie prenante externe',
    objectif: "Rendre compte de l'avancement : rapport imprimable, export CSV, présentation PowerPoint, et "
      + 'tableau consultable sans authentification.',
    preconditions: [
      'Un sprint comporte au moins une semaine renseignée.',
      "Pour le rapport et l'export, l'utilisateur est connecté et son rôle autorise l'export.",
      "Pour le tableau public, aucune condition : l'accès est libre.",
      'Les heures réelles ont été consignées lors de la réunion de validation.',
    ],
    postconditions: [
      "Le rapport de la semaine s'affiche, prêt à imprimer ou à enregistrer en PDF.",
      "L'export CSV est téléchargé, restreint au périmètre de l'utilisateur.",
      'Le tableau public présente l\'avancement sans donnée nominative sensible.',
      "Aucune donnée d'une autre squad n'a été divulguée.",
    ],
    scenario: [
      ['Scrum Master', 'Il ouvre le rapport de la semaine à restituer.'],
      ['Système', 'Le système vérifie que la semaine relève de son périmètre.'],
      ['Système', 'Le système compose le rapport : objectifs, capacité prévue et consommée, tendance, bilan par porteur.'],
      ['Scrum Master', 'Il imprime ou enregistre le rapport au format PDF.'],
      ['Scrum Master', "Il télécharge l'export CSV pour un retraitement."],
      ['Partie prenante', "Elle consulte le tableau public sans avoir à s'identifier."],
      ['Système', "Le système présente l'avancement de la semaine en cours par squad, avec les badges documentaires."],
    ],
    exceptions: [
      ['SE58', "Export d'une semaine d'une autre squad par son identifiant", 'Refus : la semaine est hors périmètre.'],
      ['SE59', 'Aucune semaine à restituer', 'Message informatif, sans erreur technique.'],
      ['SE60', 'Donnée secondaire indisponible pour le tableau public', "Le tableau s'affiche sans cette donnée plutôt que de tomber en erreur."],
      ['SE61', 'Aucune semaine en cours', 'Le tableau public présente la semaine la plus récente de chaque squad.'],
    ],
    regles: [
      ['RG54', "Le tableau public est la seule surface accessible sans authentification. Il ne présente ni adresse, ni commentaire, ni donnée d'administration."],
      ['RG55', "Une surface publique se dégrade plutôt qu'elle ne tombe : l'indisponibilité d'une donnée secondaire n'interrompt pas l'affichage."],
      ['RG56', "L'export est borné au périmètre de l'utilisateur, quel que soit l'identifiant demandé."],
    ],
  },
];

export const RECAP_RG = [
  ['Accès', 'RG1 – RG4', 'Session, hachage des mots de passe, révocation, compte désactivé', 'T01'],
  ['Squad', 'RG5 – RG7', 'Unicité, recalcul déclenché, rôles concernés par le daily', 'T02'],
  ['Rôles', 'RG8 – RG13', 'Le rôle porte le droit, délégation, dernier administrateur, redirection', 'T03'],
  ['Capacité', 'RG14 – RG18', 'Formule, rôles producteurs, calcul non saisissable, semaine de revue', 'T04'],
  ['Calendrier', 'RG19 – RG21', 'Portée des fériés, non-cumul, daily sur jours travaillés', 'T05'],
  ['Portefeuille', 'RG22 – RG26', 'Enveloppe unique, ticket Perfit, porteurs multiples, engagement, exclusions visibles', 'T06'],
  ['Planification', 'RG27 – RG31', 'Heures de la semaine, borne de capacité, clôture, affectation', 'T07–T08'],
  ['Bande passante', 'RG32 – RG34', 'Calcul du restant, périmètre de squad, consultation sans écriture', 'T09'],
  ['Checklists', 'RG35 – RG42', 'Exhaustivité, signature, référentiel figé, chaîne séquentielle, états d\'exception', 'T10–T11'],
  ['Validation', 'RG43 – RG46', 'Point du vendredi, réel constaté, traçabilité, droits du porteur', 'T12'],
  ['Rallonges', 'RG47 – RG49', 'Demandeur et décideur, effet des seules rallonges accordées', 'T13'],
  ['Clôture', 'RG50 – RG53', 'Fermeture de la saisie, non-suppression, écriture de la rétrospective', 'T14–T15'],
  ['Restitution', 'RG54 – RG56', 'Surface publique, dégradation, périmètre de l\'export', 'T16'],
];

export const NON_TRANCHES = [
  ['T11', 'Fermeture de la chaîne de validation à la validation de la checklist elle-même, et non au seul changement de statut', 'Bloquant'],
  ['T11', "Trois signatures exigées par la Checklist Factory — dont le Product Owner, rôle inexistant à ce jour", 'Bloquant'],
  ['T11', 'Dépôt du dossier signé sur Documenso : PDF imprimable ou transmission par interface ?', 'À arbitrer'],
  ['T06', "Report des heures qui ne tiennent pas dans le sprint — 120 h sur CXRecov, 4 h sur Compteur de clic", 'À arbitrer'],
  ['T06', 'Numéros de ticket Perfit provisoires sur Incident Thank You Board et GTR Flow', 'À corriger'],
  ['T01', 'Bascule vers Keycloak : instance cible, compte de secours, source du rattachement à la squad', 'À arbitrer'],
];

export const SIGNATURES = [
  ['Rédacteur', 'Chef de projet / Analyste', 'Emmanuel FOKA'],
  ['Responsable métier', 'Product Owner / MOA', ''],
  ['Responsable technique', 'Lead Dev / Architecte / MOE', ''],
  ['Validation hiérarchique', 'Directeur / Manager N+1', ''],
];
