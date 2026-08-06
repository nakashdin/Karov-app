export const ru = {
  appName: 'Каров – всё необходимое для еврея, рядом с тобой',

  greeting: {
    shabbat: 'Шабат Шалом',
    weekday: 'Хорошей недели',
  },

  tabs: {
    home: 'Главная',
    map: 'Карта',
    list: 'Список',
  },

  home: {
    title: 'Каров',
    subtitle: 'Всё необходимое для еврея, рядом с тобой',
    whatsAround: 'Что рядом со мной?',
    restaurants: 'Кошерные рестораны',
    synagogues: 'Синагоги',
    mikvahs: 'Миквы',
    chabadHouses: 'Дома Хабада',
    tzadikGraves: 'Могилы праведников',
    favorites: 'Избранное',
    nearbyTitle: 'Рядом с тобой',
    seeAll: 'Показать все',
    locating: 'Определяю местоположение…',
    whatsAroundSubtitle: 'Показать места рядом с тобой',
    homeSearchPlaceholder: 'Поиск ресторана, синагоги...',
  },

  favorites: {
    title: 'Избранное',
    empty: 'Нет избранных',
    emptyHint: 'Нажми на сердечко, чтобы сохранить место здесь',
  },

  list: {
    title: 'Кошерные места',
    searchPlaceholder: 'Поиск по названию или адресу…',
    resultsCount: (n: number) => `${n} результатов`,
    sortByDistance: 'По расстоянию',
    sortByName: 'По названию',
  },

  map: {
    title: 'Карта',
    recenter: 'Центрировать',
    fallbackTitle: 'Вид карты',
    fallbackBody:
      'Движок карты (MapLibre) требует локальной сборки и недоступен в Expo Go.',
  },

  detail: {
    navigate: 'Навигация',
    call: 'Позвонить',
    report: 'Сообщить об ошибке',
    address: 'Адрес',
    phone: 'Телефон',
    hours: 'Часы работы',
    kosherType: 'Вид кашрута',
    foodType: 'Тип еды',
    nusach: 'Нусах',
    gender: 'Тип миквы',
    attendant: 'Служащий',
    contactPerson: 'Эмиссар / Контакт',
    services: 'Услуги',
    website: 'Веб-сайт',
    source: 'Источник',
    certifiedBy: 'Сертификат кашрута',
    validUntil: 'Действителен до',
    lastVerified: 'Последняя проверка',
    buriedPerson: 'Похоронен здесь',
    approxLocation: 'Приблизительное местоположение по городу',
    distanceAway: (text: string) => `${text} от тебя`,
    notFound: 'Место не найдено',
  },

  card: {
    details: 'Подробная информация',
  },

  filters: {
    title: 'Фильтр',
    placeType: 'Тип места',
    city: 'Город',
    kosherType: 'Вид кашрута',
    category: 'Мясное / Молочное / Парве',
    all: 'Все',
    apply: 'Показать результаты',
    clear: 'Очистить',
    activeCount: (n: number) => (n > 0 ? `${n} активных` : ''),
  },

  report: {
    title: 'Сообщить о неверной информации',
    intro: 'Заметил неточность? Расскажи нам, и мы исправим.',
    placeLabel: 'Место',
    typeLabel: 'Тип проблемы',
    types: {
      closed: 'Место закрыто / не существует',
      wrong_kosher: 'Неверные сведения о кашруте',
      wrong_details: 'Неверный адрес / телефон',
      other: 'Другое',
    },
    detailsLabel: 'Подробности (необязательно)',
    detailsPlaceholder: 'Опиши проблему…',
    submit: 'Отправить жалобу',
    submitting: 'Отправляем…',
    successTitle: 'Спасибо за жалобу!',
    successBody: 'Жалоба получена и будет рассмотрена в ближайшее время.',
    errorTitle: 'Ошибка',
    errorBody: 'Не удалось отправить жалобу. Попробуй снова.',
    back: 'Назад',
  },

  category: {
    meat: 'Мясное',
    dairy: 'Молочное',
    parve: 'Парве',
  },

  common: {
    loading: 'Загрузка…',
    error: 'Что-то пошло не так',
    retry: 'Попробовать снова',
    empty: 'Места не найдены',
    emptyHint: 'Попробуй изменить фильтр или поиск',
    close: 'Закрыть',
    cancel: 'Отмена',
    km: 'км',
    meters: 'м',
  },

  permissions: {
    denied: 'Разрешение на местоположение отклонено',
    deniedHint: 'Вы можете включить геолокацию в настройках устройства.',
  },

  cuisine: {
    coffee_shop: 'Кафе',
    burger: 'Бургер',
    pizza: 'Пицца',
    street_food: 'Уличная еда',
    sushi: 'Суши',
    meat: 'Мясные блюда',
  },

  listCategories: {
    all: 'Все',
    restaurant: 'Рестораны',
    synagogue: 'Синагоги',
    mikveh: 'Миквы',
    chabad_house: 'Дома Хабада',
    tzaddik_grave: 'Могилы праведников',
  },

  menu: {
    title: 'Меню',
    contact: 'Связаться с нами',
    donate: 'Пожертвовать',
    share: 'Поделиться Каров',
    about: 'О приложении',
    language: 'Язык',
    shareMessage: 'Каров – всё необходимое для еврея, рядом с тобой:',
  },
} as const;
