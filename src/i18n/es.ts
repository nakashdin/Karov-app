export const es = {
  appName: 'Karov – Todo lo que un judío necesita, cerca de ti',

  greeting: {
    shabbat: 'Shabat Shalom',
    weekday: 'Buena semana',
  },

  tabs: {
    home: 'Inicio',
    map: 'Mapa',
    list: 'Lista',
  },

  home: {
    title: 'Karov',
    subtitle: 'Todo lo que un judío necesita, cerca de ti',
    whatsAround: '¿Qué hay cerca?',
    restaurants: 'Restaurantes kosher',
    synagogues: 'Sinagogas',
    mikvahs: 'Mikvaot',
    chabadHouses: 'Casas Jabad',
    tzadikGraves: 'Tumbas de Tzadikim',
    favorites: 'Favoritos',
    nearbyTitle: 'Cerca de ti',
    seeAll: 'Ver todo',
    locating: 'Localizando…',
    whatsAroundSubtitle: 'Mostrar lugares cerca de tu ubicación',
    homeSearchPlaceholder: 'Buscar restaurante, sinagoga...',
  },

  favorites: {
    title: 'Favoritos',
    empty: 'Sin favoritos aún',
    emptyHint: 'Toca el corazón en un lugar para guardarlo aquí',
  },

  list: {
    title: 'Lugares kosher',
    searchPlaceholder: 'Buscar por nombre o dirección…',
    resultsCount: (n: number) => `${n} resultados`,
    sortByDistance: 'Por distancia',
    sortByName: 'Por nombre',
  },

  map: {
    title: 'Mapa',
    recenter: 'Centrar',
    fallbackTitle: 'Vista de mapa',
    fallbackBody:
      'El motor de mapa (MapLibre) requiere una compilación local y no está disponible en Expo Go.',
  },

  detail: {
    navigate: 'Navegar',
    call: 'Llamar',
    report: 'Reportar un error',
    address: 'Dirección',
    phone: 'Teléfono',
    hours: 'Horario',
    kosherType: 'Tipo de kashrut',
    foodType: 'Tipo de comida',
    nusach: 'Nusaj',
    gender: 'Tipo de mikvé',
    attendant: 'Asistente',
    contactPerson: 'Emisario / Contacto',
    services: 'Servicios',
    website: 'Sitio web',
    source: 'Fuente',
    certifiedBy: 'Certificado kosher',
    validUntil: 'Válido hasta',
    certExpired: 'Certificado kosher caducado',
    attributedSource: 'Lo que reportó la fuente',
    notVerifiedAgainstRegistry: 'No verificado con nuestro registro de autoridades',
    // Owner ruling, 2026-08-27: was 'Última verificación' ("last
    // verification") — a false claim (see he.ts for the full reasoning).
    lastVerified: 'Actualizado en la base de datos',
    buriedPerson: 'Enterrado aquí',
    approxLocation: 'Ubicación aproximada por ciudad',
    distanceAway: (text: string) => `${text} de ti`,
    notFound: 'Lugar no encontrado',
  },

  card: {
    details: 'Detalles completos',
  },

  filters: {
    title: 'Filtrar',
    placeType: 'Tipo de lugar',
    city: 'Ciudad',
    kosherType: 'Tipo de kashrut',
    category: 'Carne / Lácteo / Parve',
    all: 'Todo',
    apply: 'Mostrar resultados',
    clear: 'Limpiar',
    activeCount: (n: number) => (n > 0 ? `${n} activos` : ''),
  },

  report: {
    title: 'Reportar información incorrecta',
    intro: '¿Notaste algo incorrecto? Cuéntanos y lo corregiremos.',
    placeLabel: 'Lugar',
    typeLabel: 'Tipo de problema',
    types: {
      closed: 'El lugar está cerrado / no existe',
      wrong_kosher: 'Detalles de kashrut incorrectos',
      wrong_details: 'Dirección / teléfono incorrectos',
      other: 'Otro',
    },
    detailsLabel: 'Detalles (opcional)',
    detailsPlaceholder: 'Describe el problema…',
    submit: 'Enviar reporte',
    submitting: 'Enviando…',
    successTitle: '¡Gracias por el reporte!',
    successBody: 'El reporte fue recibido y será atendido.',
    errorTitle: 'Vaya',
    errorBody: 'No se pudo enviar el reporte. Intenta de nuevo.',
    back: 'Volver',
  },

  category: {
    meat: 'Carne',
    dairy: 'Lácteo',
    parve: 'Parve',
  },

  common: {
    loading: 'Cargando…',
    error: 'Algo salió mal',
    retry: 'Intentar de nuevo',
    empty: 'No se encontraron lugares',
    emptyHint: 'Intenta cambiar el filtro o la búsqueda',
    close: 'Cerrar',
    cancel: 'Cancelar',
    km: 'km',
    meters: 'm',
  },

  permissions: {
    denied: 'Permiso de ubicación denegado',
    deniedHint: 'Puedes habilitar la ubicación en la configuración del dispositivo.',
  },

  cuisine: {
    coffee_shop: 'Café',
    burger: 'Hamburguesa',
    pizza: 'Pizza',
    street_food: 'Comida callejera',
    sushi: 'Sushi',
    meat: 'Carnes',
  },

  listCategories: {
    all: 'Todo',
    restaurant: 'Restaurantes',
    synagogue: 'Sinagogas',
    mikveh: 'Mikvaot',
    chabad_house: 'Casas Jabad',
    tzaddik_grave: 'Tumbas de Tzadikim',
  },

  foodCategories: {
    all: 'Todo',
    restaurant: 'Restaurantes',
    chef_restaurant: 'Restaurantes de autor',
    cafe: 'Cafeterías',
    coffee_cart: 'Carritos de café',
    fast_food: 'Comida rápida',
    bakery: 'Panaderías',
    juice_bar: 'Zumerías',
    ice_cream_parlor: 'Heladerías',
    winery: 'Bodegas',
  },

  about: {
    headerTitle: 'Acerca de Karov',
    appName: 'Karov',
    version: (v: string) => `Versión ${v}`,
    missionTitle: 'Nuestra misión',
    missionBody:
      'Karov nació del deseo de contribuir a la comunidad judía — reunir todos los lugares, servicios e información judía en un solo sitio accesible, en cualquier parte del mundo.',
    categoriesTitle: 'Qué encontrarás en la app',
    dailyBrachot: 'Bendiciones diarias seleccionadas',
    zmanim: 'Horarios halájicos (zmanim)',
    parasha: 'Parashá semanal',
    communityTitle: 'Una comunidad construida en conjunto',
    communityBody:
      'Karov es impulsada por la comunidad. Cualquiera puede añadir un lugar nuevo o reportar información incorrecta — así, juntos, maximizamos el servicio para los judíos en todo el mundo.',
    attributionTitle: 'Fuentes y licencias',
    attributionBody:
      'Parte de los datos de lugares y del mapa provienen de OpenStreetMap, distribuidos bajo la licencia ODbL. Gracias a los miles de voluntarios que mapean Israel.',
    osmLinkText: '© OpenStreetMap contributors — ODbL',
    osmLinkAccessibilityLabel: 'Licencia de OpenStreetMap',
    sourcesLine: 'Horarios halájicos y calendario hebreo: Hebcal · Contenido de Torá: Sefaria · Mikvaot: data.gov.il · Casas Jabad: Chabad.org',
    footerText: 'Hecho con amor para el pueblo de Israel 🇮🇱',
  },

  menu: {
    title: 'Menú',
    contact: 'Contáctanos',
    donate: 'Donar',
    share: 'Compartir Karov',
    about: 'Acerca de',
    language: 'Idioma',
    shareMessage: 'Karov – Todo lo que un judío necesita, cerca de ti:',
  },
  errorBoundary: {
    title: 'Algo salió mal',
    body: 'Se produjo un error inesperado. Puedes intentarlo de nuevo — y si sigue ocurriendo, agradeceríamos que lo reportaras.',
    retry: 'Intentar de nuevo',
    retryLabel: 'Intentar de nuevo',
  },

  kosher: {
    rabbinate: 'Rabinato',
    rabbinateMehadrin: 'Rabinato Mehadrin',
    badatzGeneric: 'Badatz',
    mehadrinGeneric: 'Mehadrin',
    glattGeneric: 'Glatt',
    kosherGeneric: 'Kosher',
    unknownFloor: 'Kosher, supervisión local',
    claimedLevelPrefix: 'Declara casherut:',
  },
} as const;
