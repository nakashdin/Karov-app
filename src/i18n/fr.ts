export const fr = {
  appName: 'Karov – Tout ce dont un Juif a besoin, près de toi',

  greeting: {
    shabbat: 'Chabbat Chalom',
    weekday: 'Bonne semaine',
  },

  tabs: {
    home: 'Accueil',
    map: 'Carte',
    list: 'Liste',
  },

  home: {
    title: 'Karov',
    subtitle: 'Tout ce dont un Juif a besoin, près de toi',
    whatsAround: "Qu'est-ce qu'il y a autour?",
    restaurants: 'Restaurants cacher',
    synagogues: 'Synagogues',
    mikvahs: 'Mikvaot',
    chabadHouses: 'Maisons Chabad',
    tzadikGraves: 'Tombes des Tsadikim',
    favorites: 'Favoris',
    nearbyTitle: 'Près de toi',
    seeAll: 'Voir tout',
    locating: 'Localisation…',
    whatsAroundSubtitle: 'Afficher les lieux proches de toi',
    homeSearchPlaceholder: 'Chercher un restaurant, une synagogue...',
  },

  favorites: {
    title: 'Favoris',
    empty: 'Pas encore de favoris',
    emptyHint: "Appuie sur le cœur d'un lieu pour le sauvegarder ici",
  },

  list: {
    title: 'Lieux cacher',
    searchPlaceholder: 'Rechercher par nom ou adresse…',
    resultsCount: (n: number) => `${n} résultats`,
    sortByDistance: 'Par distance',
    sortByName: 'Par nom',
  },

  map: {
    title: 'Carte',
    recenter: 'Recentrer',
    fallbackTitle: 'Vue de la carte',
    fallbackBody:
      "Le moteur de carte (MapLibre) nécessite une compilation locale et n'est pas disponible dans Expo Go.",
  },

  detail: {
    navigate: 'Naviguer',
    call: 'Appeler',
    report: 'Signaler une erreur',
    address: 'Adresse',
    phone: 'Téléphone',
    hours: "Heures d'ouverture",
    kosherType: 'Type de casherout',
    foodType: 'Type de nourriture',
    nusach: 'Nousakh',
    gender: 'Type de mikvé',
    attendant: 'Préposé',
    contactPerson: 'Émissaire / Contact',
    services: 'Services',
    website: 'Site web',
    source: 'Source',
    certifiedBy: 'Certificat cacher',
    validUntil: "Valable jusqu'au",
    lastVerified: 'Dernière vérification',
    buriedPerson: 'Enterré ici',
    approxLocation: 'Emplacement approximatif par ville',
    distanceAway: (text: string) => `${text} de toi`,
    notFound: 'Lieu non trouvé',
  },

  card: {
    details: 'Détails complets',
  },

  filters: {
    title: 'Filtrer',
    placeType: 'Type de lieu',
    city: 'Ville',
    kosherType: 'Type de casherout',
    category: 'Viande / Laitier / Parve',
    all: 'Tout',
    apply: 'Afficher les résultats',
    clear: 'Effacer',
    activeCount: (n: number) => (n > 0 ? `${n} actifs` : ''),
  },

  report: {
    title: 'Signaler une info incorrecte',
    intro: "Tu as remarqué quelque chose d'inexact? Dis-nous et nous corrigerons.",
    placeLabel: 'Lieu',
    typeLabel: 'Type de problème',
    types: {
      closed: "Le lieu est fermé / n'existe pas",
      wrong_kosher: 'Détails de casherout incorrects',
      wrong_details: 'Adresse / téléphone incorrects',
      other: 'Autre',
    },
    detailsLabel: 'Détails (facultatif)',
    detailsPlaceholder: 'Décris le problème…',
    submit: 'Envoyer le signalement',
    submitting: 'Envoi…',
    successTitle: 'Merci pour le signalement!',
    successBody: 'Le signalement a été reçu et sera traité rapidement.',
    errorTitle: 'Oups',
    errorBody: "Échec de l'envoi. Veuillez réessayer.",
    back: 'Retour',
  },

  category: {
    meat: 'Viande',
    dairy: 'Laitier',
    parve: 'Parve',
  },

  common: {
    loading: 'Chargement…',
    error: "Quelque chose s'est mal passé",
    retry: 'Réessayer',
    empty: 'Aucun lieu trouvé',
    emptyHint: 'Essayez de modifier le filtre ou la recherche',
    close: 'Fermer',
    cancel: 'Annuler',
    km: 'km',
    meters: 'm',
  },

  permissions: {
    denied: 'Permission de localisation refusée',
    deniedHint: 'Vous pouvez activer la localisation dans les paramètres de votre appareil.',
  },

  cuisine: {
    coffee_shop: 'Café',
    burger: 'Burger',
    pizza: 'Pizza',
    street_food: 'Street food',
    sushi: 'Sushi',
    meat: 'Viandes',
  },

  listCategories: {
    all: 'Tout',
    restaurant: 'Restaurants',
    synagogue: 'Synagogues',
    mikveh: 'Mikvaot',
    chabad_house: 'Maisons Chabad',
    tzaddik_grave: 'Tombes des Tsadikim',
  },

  menu: {
    title: 'Menu',
    contact: 'Nous contacter',
    donate: 'Faire un don',
    share: 'Partager Karov',
    about: 'À propos',
    language: 'Langue',
    shareMessage: 'Karov – Tout ce dont un Juif a besoin, près de toi :',
  },
  errorBoundary: {
    title: "Une erreur s'est produite",
    body: "Une erreur inattendue s'est produite. Vous pouvez réessayer — et si cela persiste, un signalement serait apprécié.",
    retry: 'Réessayer',
    retryLabel: 'Réessayer',
  },
} as const;
