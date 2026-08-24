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
    lastVerified: 'Última verificación',
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
} as const;
