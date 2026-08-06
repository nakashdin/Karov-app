export const en = {
  appName: 'Karov – Everything a Jew needs, close to you',

  greeting: {
    shabbat: 'Shabbat Shalom',
    weekday: 'Have a good week',
  },

  tabs: {
    home: 'Home',
    map: 'Map',
    list: 'List',
  },

  home: {
    title: 'Karov',
    subtitle: 'Everything a Jew needs, close to you',
    whatsAround: "What's around me?",
    restaurants: 'Kosher Restaurants',
    synagogues: 'Synagogues',
    mikvahs: 'Mikvahs',
    chabadHouses: 'Chabad Houses',
    tzadikGraves: 'Tzaddik Graves',
    favorites: 'Favorites',
    nearbyTitle: 'Near You',
    seeAll: 'See All',
    locating: 'Locating…',
    whatsAroundSubtitle: 'Show places close to your location',
    homeSearchPlaceholder: 'Search restaurant, synagogue...',
  },

  favorites: {
    title: 'Favorites',
    empty: 'No favorites yet',
    emptyHint: 'Tap the heart on a place to save it here',
  },

  list: {
    title: 'Kosher Places',
    searchPlaceholder: 'Search by name or address…',
    resultsCount: (n: number) => `${n} results`,
    sortByDistance: 'By distance',
    sortByName: 'By name',
  },

  map: {
    title: 'Map',
    recenter: 'Recenter',
    fallbackTitle: 'Map View',
    fallbackBody:
      'The map engine (MapLibre) requires a local build and is not available in Expo Go.',
  },

  detail: {
    navigate: 'Navigate',
    call: 'Call',
    report: 'Report an error',
    address: 'Address',
    phone: 'Phone',
    hours: 'Opening hours',
    kosherType: 'Kosher type',
    foodType: 'Food type',
    nusach: 'Nusach',
    gender: 'Mikveh type',
    attendant: 'Attendant',
    contactPerson: 'Emissary / Contact',
    services: 'Services',
    website: 'Website',
    source: 'Source',
    certifiedBy: 'Kosher certificate',
    validUntil: 'Valid until',
    lastVerified: 'Last verified',
    buriedPerson: 'Buried here',
    approxLocation: 'Approximate location by city',
    distanceAway: (text: string) => `${text} from you`,
    notFound: 'Place not found',
  },

  card: {
    details: 'Full details',
  },

  filters: {
    title: 'Filter',
    placeType: 'Place type',
    city: 'City',
    kosherType: 'Kosher type',
    category: 'Meat / Dairy / Parve',
    all: 'All',
    apply: 'Show results',
    clear: 'Clear',
    activeCount: (n: number) => (n > 0 ? `${n} active` : ''),
  },

  report: {
    title: 'Report Incorrect Info',
    intro: "Noticed something inaccurate? Tell us and we'll fix it.",
    placeLabel: 'Place',
    typeLabel: 'Issue type',
    types: {
      closed: "Place is closed / doesn't exist",
      wrong_kosher: 'Incorrect kosher details',
      wrong_details: 'Incorrect address / phone',
      other: 'Other',
    },
    detailsLabel: 'Details (optional)',
    detailsPlaceholder: 'Describe the issue…',
    submit: 'Submit report',
    submitting: 'Submitting…',
    successTitle: 'Thank you for the report!',
    successBody: 'Your report was received and will be handled promptly.',
    errorTitle: 'Oops',
    errorBody: 'Failed to send the report. Please try again.',
    back: 'Back',
  },

  category: {
    meat: 'Meat',
    dairy: 'Dairy',
    parve: 'Parve',
  },

  common: {
    loading: 'Loading…',
    error: 'Something went wrong',
    retry: 'Try again',
    empty: 'No places found',
    emptyHint: 'Try changing the filter or search',
    close: 'Close',
    cancel: 'Cancel',
    km: 'km',
    meters: 'm',
  },

  permissions: {
    denied: 'Location permission denied',
    deniedHint: 'You can enable location in device settings.',
  },

  cuisine: {
    coffee_shop: 'Coffee Shop',
    burger: 'Burger',
    pizza: 'Pizza',
    street_food: 'Street Food',
    sushi: 'Sushi',
    meat: 'Meats',
  },

  listCategories: {
    all: 'All',
    restaurant: 'Restaurants',
    synagogue: 'Synagogues',
    mikveh: 'Mikvahs',
    chabad_house: 'Chabad Houses',
    tzaddik_grave: 'Tzaddik Graves',
  },

  menu: {
    title: 'Menu',
    contact: 'Contact Us',
    donate: 'Donate',
    share: 'Share Karov',
    about: 'About',
    language: 'Language',
    shareMessage: 'Karov – Everything a Jew needs, close to you:',
  },
} as const;
