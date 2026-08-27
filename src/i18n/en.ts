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
    certExpired: 'Kosher certificate expired',
    attributedSource: 'What the source reported',
    notVerifiedAgainstRegistry: 'Not verified against our authority registry',
    // Owner ruling, 2026-08-27: was 'Last verified' — a false claim (see
    // he.ts for the full reasoning). Records when the database entry was
    // last updated, not a human verification event.
    lastVerified: 'Updated in database',
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

  foodCategories: {
    all: 'All',
    restaurant: 'Restaurants',
    chef_restaurant: 'Chef Restaurants',
    cafe: 'Cafés',
    coffee_cart: 'Coffee Carts',
    fast_food: 'Fast Food',
    bakery: 'Bakeries',
    juice_bar: 'Juice Bars',
    ice_cream_parlor: 'Ice Cream',
    winery: 'Wineries',
  },

  about: {
    headerTitle: 'About Karov',
    appName: 'Karov',
    version: (v: string) => `Version ${v}`,
    missionTitle: 'Our mission',
    missionBody:
      'Karov was created out of a desire to give back to the Jewish community — bringing together every place, service and piece of Jewish information in one accessible spot, anywhere in the world.',
    categoriesTitle: "What you'll find in the app",
    dailyBrachot: 'Selected daily blessings',
    zmanim: 'Halachic times (zmanim)',
    parasha: 'Weekly Torah portion',
    communityTitle: 'A community built together',
    communityBody:
      "Karov is powered by the community. Anyone can add a new place or report incorrect information — together we make the service as useful as possible for Jews everywhere.",
    attributionTitle: 'Sources & licensing',
    attributionBody:
      'Some place and map data comes from OpenStreetMap, distributed under the ODbL license. Thank you to the thousands of volunteers mapping Israel.',
    osmLinkText: '© OpenStreetMap contributors — ODbL',
    osmLinkAccessibilityLabel: 'OpenStreetMap license',
    sourcesLine: 'Halachic times and Hebrew calendar: Hebcal · Torah content: Sefaria · Mikvahs: data.gov.il · Chabad Houses: Chabad.org',
    footerText: 'Made with love for the Jewish people 🇮🇱',
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
  errorBoundary: {
    title: 'Something went wrong',
    body: "An unexpected error occurred. You can try again — and if it keeps happening, we'd appreciate a report.",
    retry: 'Try again',
    retryLabel: 'Try again',
  },

  kosher: {
    rabbinate: 'Rabbinate',
    rabbinateMehadrin: 'Rabbinate Mehadrin',
    badatzGeneric: 'Badatz',
    mehadrinGeneric: 'Mehadrin',
    glattGeneric: 'Glatt',
    kosherGeneric: 'Kosher',
    unknownFloor: 'Kosher, local supervision',
    claimedLevelPrefix: 'Claims kashrut:',
  },
} as const;
