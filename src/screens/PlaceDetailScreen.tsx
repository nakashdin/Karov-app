import React, { useEffect, useState } from 'react';
import { TZADDIK_BIOS } from '../data/tzaddikBios';
import {
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { MapView } from '../components/map/MapView';
import { StarRating } from '../components/StarRating';
import { Loading } from '../components/Loading';
import { EmptyState } from '../components/EmptyState';
import { SuggestEditModal } from '../components/SuggestEditModal';
import { colors, radius, shadow, sizes, spacing } from '../theme';
import { useLanguage } from '../context/LanguageContext';
import { transliterateHebrew } from '../utils/transliterate';
import { usePlace } from '../hooks/usePlace';
import { useSharedLocation } from '../context/LocationContext';
import { useFavorites } from '../context/FavoritesContext';
import { distanceKm, formatDistance } from '../utils/geo';
import { categoryLabel, kosherTypeLabel } from '../utils/kosher';
import { displayPlaceName, placeTypeLabel } from '../utils/placeType';
import { callPhone } from '../utils/navigation';
import { NavPickerModal } from '../components/NavPickerModal';
import { fullHoursHebrew, isCurrentlyOpen } from '../utils/openingHours';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type DetailRoute = RouteProp<RootStackParamList, 'PlaceDetail'>;

const TYPE_COLOR: Record<string, string> = {
  restaurant:   colors.categoryRestaurant,
  winery:       colors.categoryWinery,
  synagogue:    colors.categorySynagogue,
  mikveh:       colors.categoryMikveh,
  chabad_house: colors.chabad,
  tzaddik_grave: colors.tzaddik,
};

const TYPE_EMOJI: Record<string, string> = {
  restaurant:   '🍽️',
  winery:       '🍷',
  synagogue:    '🕍',
  mikveh:       '💧',
  chabad_house: '🕎',
  tzaddik_grave: '🪦',
};

// ─── Chips that appear under the name ────────────────────────────────────────

function buildChips(place: ReturnType<typeof usePlace>['place']): string[] {
  if (!place) return [];
  const chips: string[] = [];
  chips.push(placeTypeLabel[place.type]);
  if (place.category)   chips.push(categoryLabel[place.category]);
  if (place.kosherType) chips.push(kosherTypeLabel[place.kosherType]);
  if (place.certifiedBy) chips.push(place.certifiedBy);
  if (place.nusach) chips.push(`נוסח ${place.nusach}`);
  if (place.tags)   chips.push(...place.tags.filter(t => !(t in placeTypeLabel)));
  return chips;
}

// ─── Kashrut certificate ─────────────────────────────────────────────────────

const todayISO = () => new Date().toISOString().slice(0, 10);

/** Label for the certificate link: says whether it is still in force. */
function certStatusLabel(validUntil?: string): string {
  if (!validUntil) return 'צפייה בתעודה';
  const [y, m, d] = validUntil.split('-');
  const he = `${d}.${m}.${y}`;
  return validUntil < todayISO() ? `פג תוקף ב-${he}` : `בתוקף עד ${he}`;
}

/** The kashrut standards printed on the certificate, as display strings. */
function kosherStandards(details: NonNullable<ReturnType<typeof usePlace>['place']>['kosherDetails']): string[] {
  if (!details) return [];
  const out: string[] = [];
  if (details.shabbatClosed) out.push('סגור בשבתות ובמועדי ישראל');
  if (details.bishulYisrael) out.push('בישול ישראל');
  if (details.chalavYisrael) out.push('חלב ישראל');
  if (details.vegChecked)    out.push('ירק עלים ללא חרקים');
  if (details.noChametz)     out.push('ללא חשש חמץ שעבר עליו הפסח');
  return out;
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export function PlaceDetailScreen() {
  const { t, locale } = useLanguage();
  const isHe = locale === 'he';
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<DetailRoute>();
  const { place, loading, error } = usePlace(params.id);
  const { location } = useSharedLocation();
  const { isFavorite, toggleFavorite } = useFavorites();

  const fav = isFavorite(params.id);
  const [tab, setTab]               = useState<'info' | 'map'>('info');
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [navPickerOpen, setNavPickerOpen] = useState(false);
  const [bioOpen, setBioOpen]       = useState(true);
  const [prayerOpen, setPrayerOpen] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: place ? (isHe ? displayPlaceName(place) : transliterateHebrew(displayPlaceName(place))) : '',
      headerLeft: () => (
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={{ paddingEnd: 8 }}>
          <Ionicons name="chevron-forward" size={26} color={colors.primary} />
        </Pressable>
      ),
      headerRight: () => (
        <Pressable onPress={() => toggleFavorite(params.id)} hitSlop={10}>
          <Ionicons
            name={fav ? 'heart' : 'heart-outline'}
            size={24}
            color={fav ? colors.danger : colors.text}
          />
        </Pressable>
      ),
    });
  }, [place, fav, navigation, params.id, toggleFavorite]);

  if (loading) return <Screen><Loading /></Screen>;
  if (error || !place) {
    return <Screen><EmptyState title={t.detail.notFound} icon="sad-outline" /></Screen>;
  }

  const dist     = location ? distanceKm(location, place.location) : null;
  const chips    = buildChips(place);
  const accent   = colors.primary;
  const mapCenter: [number, number] = [place.location.latitude, place.location.longitude];

  const isTzaddikContext = place.type === 'tzaddik_grave' || (place.tags?.includes('tzaddik_grave') ?? false);
  const bio = isTzaddikContext ? TZADDIK_BIOS[place.id] : undefined;

  const prayerTzaddikTitle = bio
    ? bio.gender === 'f'  ? `הַצַּדֶּקֶת ${place.name}`
    : bio.gender === 'group' ? `הַצַּדִּיקִים הַנִּקְבָּרִים כָּאן`
    : `הַצַּדִּיק ${place.name}`
    : place.name;
  const prayerGenitiveHe = bio?.gender === 'f' ? 'ָהּ' : bio?.gender === 'group' ? 'ָם' : 'וֹ';
  const prayerNoun       = bio?.gender === 'f' ? 'נַפְשָׁהּ'
                         : bio?.gender === 'group' ? 'נַפְשָׁם' : 'נַפְשׁוֹ';
  const prayerText =
    `אָנָּא ה׳ אֱלֹקֵי יִשְׂרָאֵל,\nמֶלֶךְ מַלְכֵי הַמְּלָכִים,` +
    `\n\nהִנְנִי עוֹמֵד עַל קֶבֶר\n${prayerTzaddikTitle},\nלְעוֹרֵר זְכוּת${prayerGenitiveHe} לְטוֹבָתֵנוּ.` +
    `\n\nיְהִי רָצוֹן מִלְּפָנֶיךָ ה׳ אֱלֹקֵינוּ וֵאלֹקֵי אֲבוֹתֵינוּ,\nשֶׁיְּהֵא ${prayerNoun} צָרוּר בִּצְרוֹר הַחַיִּים,\nוּזְכוּת${prayerGenitiveHe} תָּגֵן עָלֵינוּ\nוְעַל כָּל יִשְׂרָאֵל,\nאָמֵן.`;

  const handleShare = async () => {
    try {
      await Share.share({ message: `${place.name} — ${place.address}` });
    } catch { /* ignore */ }
  };

  return (
    <Screen style={{ padding: 0 }}>
      {/* ── Toggle מידע / מפה ───────────────────────────────── */}
      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggleBtn, tab === 'info' && styles.toggleActive]}
          onPress={() => setTab('info')}
        >
          <Text style={[styles.toggleText, tab === 'info' && styles.toggleTextActive]}>מידע</Text>
        </Pressable>
        <Pressable
          style={[styles.toggleBtn, tab === 'map' && styles.toggleActive]}
          onPress={() => setTab('map')}
        >
          <Ionicons
            name="map-outline"
            size={14}
            color={tab === 'map' ? colors.textInverse : colors.textMuted}
          />
          <Text style={[styles.toggleText, tab === 'map' && styles.toggleTextActive]}>מפה</Text>
        </Pressable>
      </View>

      {/* ── Map tab ─────────────────────────────────────────── */}
      {tab === 'map' ? (
        <View style={styles.mapContainer}>
          <Pressable
            style={styles.mapTouchable}
            onPress={() => navigation.navigate('MapDetail', { placeId: place.id })}
          >
            <MapView
              places={[place]}
              userLocation={location}
              onSelectPlace={() => navigation.navigate('MapDetail', { placeId: place.id })}
              initialCenter={mapCenter}
              initialZoom={15}
              highlightId={place.id}
            />
            <View style={styles.mapOverlayHint}>
              <Ionicons name="expand-outline" size={16} color={colors.textInverse} />
              <Text style={styles.mapHintText}>הקש לפתיחת מפה מלאה</Text>
            </View>
          </Pressable>
          {/* Actions visible in map mode too */}
          <View style={[styles.quickActions, { marginHorizontal: spacing.lg, marginTop: 0 }]}>
            <QuickAction icon="navigate" label={t.detail.navigate} color={accent} filled onPress={() => setNavPickerOpen(true)} />
            {place.phone && <QuickAction icon="call-outline" label={t.detail.call} color={accent} onPress={() => callPhone(place.phone!)} />}
            {place.website && <QuickAction icon="globe-outline" label="אתר" color={accent} onPress={() => Linking.openURL(place.website!)} />}
            <QuickAction icon="share-outline" label="שתף" color={accent} onPress={handleShare} />
          </View>
        </View>
      ) : (

      /* ── Info tab ────────────────────────────────────────── */
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Hero — photo when available, gradient fallback otherwise */}
        {place.imageUrl ? (
          <View style={styles.hero}>
            <Image source={{ uri: place.imageUrl }} style={styles.heroImage} resizeMode="cover" />
            <View style={styles.heroImageOverlay} />
            <View style={[styles.heroIconBadge, { backgroundColor: accent }]}>
              <Text style={styles.heroEmojiBadge}>{TYPE_EMOJI[place.type] ?? '📍'}</Text>
            </View>
          </View>
        ) : (
          <View style={[styles.hero, { backgroundColor: accent + '22' }]}>
            <View style={[styles.heroIconCircle, { backgroundColor: accent + '33' }]}>
              <Text style={styles.heroEmoji}>{TYPE_EMOJI[place.type] ?? '📍'}</Text>
            </View>
          </View>
        )}

        {/* Name card — overlaps hero */}
        <View style={styles.nameCard}>
          <Text style={styles.placeName}>
            {isHe ? displayPlaceName(place) : transliterateHebrew(displayPlaceName(place))}
          </Text>
          {!isHe && (
            <Text style={styles.placeNameHe}>{displayPlaceName(place)}</Text>
          )}

          {/* Tags */}
          {chips.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {chips.map((chip) => (
                <View key={chip} style={styles.chip}>
                  <Text style={styles.chipText}>{chip}</Text>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Description */}
          {place.description ? (
            <Text style={styles.description}>{place.description}</Text>
          ) : null}

          {/* Rating + Distance */}
          <View style={styles.metaRow}>
            {typeof place.rating === 'number' && (
              <>
                <Text style={styles.ratingNum}>{place.rating.toFixed(1)}</Text>
                <StarRating value={place.rating} />
              </>
            )}
            {dist !== null && (
              <Text style={styles.distance}>
                {typeof place.rating === 'number' ? '  ·  ' : ''}{t.detail.distanceAway(formatDistance(dist, t))}
              </Text>
            )}
          </View>
        </View>

        {/* ── 4 Quick action buttons ──────────────────────────── */}
        <View style={styles.quickActions}>
          <QuickAction icon="navigate" label={t.detail.navigate} color={accent} filled onPress={() => setNavPickerOpen(true)} />
          {place.phone
            ? <QuickAction icon="call-outline" label={t.detail.call} color={accent} onPress={() => callPhone(place.phone!)} />
            : <QuickAction icon="call-outline" label={t.detail.call} color={accent} disabled />}
          {place.website
            ? <QuickAction icon="globe-outline" label="אתר" color={accent} onPress={() => Linking.openURL(place.website!)} />
            : <QuickAction icon="globe-outline" label="אתר" color={accent} disabled />}
          {place.instagram && (
            <QuickAction icon="logo-instagram" label="אינסטגרם" color={accent} onPress={() => Linking.openURL(place.instagram!)} />
          )}
          {place.facebook && (
            <QuickAction icon="logo-facebook" label="פייסבוק" color={accent} onPress={() => Linking.openURL(place.facebook!)} />
          )}
          {place.tiktok && (
            <QuickAction icon="logo-tiktok" label="טיקטוק" color={accent} onPress={() => Linking.openURL(place.tiktok!)} />
          )}
          <QuickAction icon="share-outline" label="שתף" color={accent} onPress={handleShare} />
        </View>

        {/* ── גלריה ────────────────────────────────────────────── */}
        <SectionCard title="גלריה">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gallery}>
            {place.kosherCertUrl ? (() => {
              const expired = !!place.certificateValidUntil && place.certificateValidUntil < todayISO();
              const tint = expired ? colors.danger : accent;
              return (
                <Pressable
                  style={[styles.galleryCert, { borderColor: tint + '55', backgroundColor: tint + '0D' }]}
                  onPress={() => Linking.openURL(place.kosherCertUrl!)}
                >
                  <Ionicons name="ribbon-outline" size={30} color={tint} />
                  <Text style={[styles.galleryCertTitle, { color: tint }]}>תעודת כשרות</Text>
                  {place.certifiedBy ? (
                    <Text style={styles.galleryCertBody} numberOfLines={1}>{place.certifiedBy}</Text>
                  ) : null}
                  <Text style={[styles.galleryCertBody, expired && { color: colors.danger }]} numberOfLines={1}>
                    {certStatusLabel(place.certificateValidUntil)}
                  </Text>
                </Pressable>
              );
            })() : null}
            {place.imageUrl ? (
              <Image source={{ uri: place.imageUrl }} style={styles.galleryImage} resizeMode="cover" />
            ) : (
              <>
                <View style={[styles.galleryPlaceholder, { backgroundColor: accent + '11' }]}>
                  <Ionicons name="image-outline" size={32} color={accent + '55'} />
                </View>
                {!place.kosherCertUrl ? (
                  <View style={[styles.galleryPlaceholder, { backgroundColor: accent + '11' }]}>
                    <Ionicons name="image-outline" size={32} color={accent + '55'} />
                  </View>
                ) : null}
              </>
            )}
            <Pressable style={[styles.galleryAdd, { borderColor: accent }]} onPress={() => setSuggestOpen(true)}>
              <Ionicons name="camera-outline" size={28} color={accent} />
              <Text style={[styles.galleryAddText, { color: accent }]}>הוסף תמונה</Text>
            </Pressable>
          </ScrollView>
        </SectionCard>

        {/* ── קבר צדיק: על הצדיק ─────────────────────────────── */}
        {isTzaddikContext && bio && (
          <View style={[sectionStyles.card, { overflow: 'hidden' }]}>
            <Pressable style={tzStyles.header} onPress={() => setBioOpen(o => !o)}>
              <Text style={tzStyles.headerTitle}>
                {'על '}
                {bio.gender === 'group' ? 'הצדיקים הנקברים כאן' : place.name}
              </Text>
              <Ionicons
                name={bioOpen ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.textFaint}
              />
            </Pressable>

            {bioOpen && (
              <View style={tzStyles.body}>
                {bio.era ? (
                  <View style={tzStyles.eraBadge}>
                    <Text style={tzStyles.eraText}>{bio.era}</Text>
                  </View>
                ) : null}

                <Text style={tzStyles.bioText}>{bio.bio}</Text>

                {bio.torahQuote ? (
                  <View style={tzStyles.quoteBlock}>
                    <Text style={tzStyles.quoteText}>{bio.torahQuote.text}</Text>
                    <Text style={tzStyles.quoteSource}>{bio.torahQuote.source}</Text>
                  </View>
                ) : null}

                {bio.hillula ? (
                  <View style={tzStyles.hillulaRow}>
                    <Ionicons name="flame-outline" size={13} color={colors.tzaddik} />
                    <Text style={tzStyles.hillulaText}>הילולה: {bio.hillula.label}</Text>
                  </View>
                ) : null}

                {bio.torahSources.length > 0 && (
                  <View style={tzStyles.sourcesRow}>
                    {bio.torahSources.map((s) => (
                      <View key={s} style={tzStyles.sourceTag}>
                        <Text style={tzStyles.sourceTagText}>{s}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* ── קבר צדיק: תפילה ─────────────────────────────────── */}
        {isTzaddikContext && (
          <View style={[sectionStyles.card, { overflow: 'hidden' }]}>
            <Pressable style={tzStyles.header} onPress={() => setPrayerOpen(o => !o)}>
              <Text style={tzStyles.headerTitle}>תפילה לקבר הצדיק</Text>
              <Ionicons
                name={prayerOpen ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.textFaint}
              />
            </Pressable>

            {prayerOpen && (
              <View style={tzStyles.prayerBody}>
                <Text style={tzStyles.prayerIntro}>
                  נוהגים לומר תפילה זו בבואם לקבר הצדיק, לבקש שזכותו תעמוד למתפלל.
                </Text>
                <Text style={tzStyles.prayerText}>{prayerText}</Text>
                <Text style={tzStyles.prayerSource}>מנהג ישראל — סדר ביקור קברות</Text>
              </View>
            )}
          </View>
        )}

        {/* ── פרטים ───────────────────────────────────────────── */}
        <SectionCard title="פרטים">
          {place.type === 'restaurant' ? (
            /* ── מסעדות: שלד קבוע, placeholder כשאין דאטה ── */
            <>
              <DetailRow
                icon="shield-checkmark-outline"
                label="כשרות"
                value={[place.certifiedBy, place.kosherType ? kosherTypeLabel[place.kosherType] : null].filter(Boolean).join(' · ') || '—'}
                accent={accent}
                empty={!place.certifiedBy && !place.kosherType}
              />
              {place.kosherCertUrl ? (
                <DetailRow
                  icon="document-text-outline"
                  label="תעודת כשרות"
                  value={certStatusLabel(place.certificateValidUntil)}
                  accent={accent}
                  tappable
                  onPress={() => Linking.openURL(place.kosherCertUrl!)}
                  link
                />
              ) : null}
              {kosherStandards(place.kosherDetails).length ? (
                <DetailRow
                  icon="checkmark-circle-outline"
                  label="תקני הכשרות"
                  value={kosherStandards(place.kosherDetails).join(' · ')}
                  accent={accent}
                  multiline
                />
              ) : null}
              {(place.extra as any)?.mashgiachPhone ? (
                <DetailRow
                  icon="person-outline"
                  label="משגיח"
                  value={`${place.certifiedBy ?? 'משגיח'} · ${(place.extra as any).mashgiachPhone}`}
                  accent={accent}
                  tappable
                  onPress={() => callPhone((place.extra as any).mashgiachPhone)}
                  link
                />
              ) : null}
              <DetailRow
                icon="location-outline"
                label="כתובת"
                value={place.address || '—'}
                accent={accent}
                tappable={!!place.address}
                onPress={place.address ? () => setNavPickerOpen(true) : undefined}
                empty={!place.address}
              />
              <DetailRow
                icon="call-outline"
                label="טלפון"
                value={place.phone || '—'}
                accent={accent}
                tappable={!!place.phone}
                onPress={place.phone ? () => callPhone(place.phone!) : undefined}
                link={!!place.phone}
                empty={!place.phone}
              />
              <DetailRow
                icon="fast-food-outline"
                label="סוג מסעדה"
                value={place.category ? categoryLabel[place.category] : '—'}
                accent={accent}
                empty={!place.category}
              />
              <DetailRow
                icon="time-outline"
                label="שעות פתיחה"
                value={fullHoursHebrew(place.openingHours) || '—'}
                accent={accent}
                multiline={!!place.openingHours}
                empty={!place.openingHours}
              />
              {place.website ? (
                <DetailRow icon="globe-outline" label="אתר" value={place.website} accent={accent} tappable onPress={() => Linking.openURL(place.website!)} link />
              ) : null}
              {place.menu ? (
                <DetailRow icon="restaurant-outline" label="תפריט" value={place.menu} accent={accent} tappable onPress={() => Linking.openURL(place.menu!)} link />
              ) : null}
            </>
          ) : (
            /* ── שאר הקטגוריות ── */
            <>
              {place.address ? (
                <DetailRow icon="location-outline" label="כתובת" value={place.address} accent={accent} tappable onPress={() => setNavPickerOpen(true)} />
              ) : null}
              {place.phone ? (
                <DetailRow icon="call-outline" label="טלפון" value={place.phone} accent={accent} tappable onPress={() => callPhone(place.phone!)} link />
              ) : null}
              {place.website ? (
                <DetailRow icon="globe-outline" label="אתר" value={place.website} accent={accent} tappable onPress={() => Linking.openURL(place.website!)} link />
              ) : null}
              {place.menu ? (
                <DetailRow icon="restaurant-outline" label="תפריט" value={place.menu} accent={accent} tappable onPress={() => Linking.openURL(place.menu!)} link />
              ) : null}
              {place.instagram ? (
                <DetailRow icon="logo-instagram" label="אינסטגרם" value={place.instagram.replace('https://www.instagram.com/', '@').replace(/\/$/, '')} accent={accent} tappable onPress={() => Linking.openURL(place.instagram!)} link />
              ) : null}
              {place.facebook ? (
                <DetailRow icon="logo-facebook" label="פייסבוק" value="עמוד רשמי" accent={accent} tappable onPress={() => Linking.openURL(place.facebook!)} link />
              ) : null}
              {place.tiktok ? (
                <DetailRow icon="logo-tiktok" label="טיקטוק" value="עמוד רשמי" accent={accent} tappable onPress={() => Linking.openURL(place.tiktok!)} link />
              ) : null}
              {place.nusach ? (
                <DetailRow icon="book-outline" label="נוסח" value={`נוסח ${place.nusach}`} accent={accent} />
              ) : null}
              {place.type === 'mikveh' && place.mikvehGender ? (
                <DetailRow icon="people-outline" label="מיועד ל" value={place.mikvehGender} accent={accent} />
              ) : null}
              {place.type === 'mikveh' && place.attendant ? (
                <DetailRow icon="person-outline" label="בלן/בלנית" value={place.attendant} accent={accent} />
              ) : null}
              {place.contactPerson ? (
                <DetailRow icon="person-outline" label="איש קשר" value={place.contactPerson} accent={accent} />
              ) : null}
              {place.services && place.services.length > 0 ? (
                <DetailRow icon="sparkles-outline" label="שירותים" value={place.services.join(' · ')} accent={accent} />
              ) : null}
              {place.type === 'tzaddik_grave' && place.extra?.buriedPerson ? (
                <DetailRow icon="flower-outline" label="הנצחה" value={String(place.extra.buriedPerson)} accent={accent} />
              ) : null}
              {place.type === 'mikveh' && place.openingHours ? (() => {
                const open = isCurrentlyOpen(place.openingHours, place.location);
                return open === null ? null : (
                  <DetailRow icon={open ? 'checkmark-circle' : 'close-circle'} label="סטטוס" value={open ? 'פתוח כעת' : 'סגור כעת'} accent={open ? '#1B873F' : '#C0394A'} />
                );
              })() : null}
              {place.openingHours ? (
                <DetailRow icon="time-outline" label="שעות פתיחה" value={fullHoursHebrew(place.openingHours) || place.openingHours} accent={accent} multiline />
              ) : null}
              {place.type === 'mikveh' && (place.extra as any)?.contacts ? (() => {
                const c = (place.extra as any).contacts as Record<string, string>;
                const num = (s?: string) => (String(s ?? '').match(/0\d[\d-]{7,}/) || [])[0]?.replace(/-/g, '');
                return (
                  <>
                    {c.maintenance ? <DetailRow icon="construct-outline" label="תחזוקה ותפעול" value={c.maintenance} accent={accent} tappable={!!num(c.maintenance)} onPress={num(c.maintenance) ? () => callPhone(num(c.maintenance)!) : undefined} link={!!num(c.maintenance)} /> : null}
                    {c.halacha ? <DetailRow icon="book-outline" label="ענייני הלכה" value={c.halacha} accent={accent} tappable={!!num(c.halacha)} onPress={num(c.halacha) ? () => callPhone(num(c.halacha)!) : undefined} link={!!num(c.halacha)} /> : null}
                    {c.moked ? <DetailRow icon="call-outline" label="מוקד המועצה" value={c.moked} accent={accent} tappable onPress={() => callPhone(String(c.moked).replace(/-/g, ''))} link /> : null}
                    {c.whatsapp ? <DetailRow icon="logo-whatsapp" label="וואטסאפ" value={c.whatsapp} accent={accent} tappable onPress={() => Linking.openURL(`https://wa.me/972${String(c.whatsapp).replace(/\D/g, '').replace(/^0/, '')}`)} link /> : null}
                  </>
                );
              })() : null}
              {place.type === 'mikveh' && (place.extra as any)?.notice ? (
                <DetailRow icon="water-outline" label="לתשומת לב" value={String((place.extra as any).notice)} accent={accent} multiline />
              ) : null}
              {place.type === 'mikveh' && (place.extra as any)?.hasKelim ? (
                <DetailRow icon="cube-outline" label="טבילת כלים" value="קיים אזור לטבילת כלים" accent={accent} />
              ) : null}
              {place.kosherCertUrl ? (
                <DetailRow
                  icon="document-text-outline"
                  label="תעודת כשרות"
                  value={certStatusLabel(place.certificateValidUntil)}
                  accent={accent}
                  tappable
                  onPress={() => Linking.openURL(place.kosherCertUrl!)}
                  link
                />
              ) : place.certificateValidUntil ? (
                <DetailRow icon="calendar-outline" label="תוקף תעודה" value={place.certificateValidUntil} accent={accent} />
              ) : null}
              {kosherStandards(place.kosherDetails).length ? (
                <DetailRow
                  icon="checkmark-circle-outline"
                  label="תקני הכשרות"
                  value={kosherStandards(place.kosherDetails).join(' · ')}
                  accent={accent}
                  multiline
                />
              ) : null}
            </>
          )}

          {place.lastVerifiedAt ? (
            <DetailRow icon="checkmark-done-outline" label="אומת לאחרונה" value={place.lastVerifiedAt} accent={accent} />
          ) : null}

          {/* sourceUrl / sourceName retained in data for admin panel only */}

          {place.locationPrecision === 'city' ? (
            <View style={styles.approxNote}>
              <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
              <Text style={styles.approxText}>{t.detail.approxLocation}</Text>
            </View>
          ) : null}
        </SectionCard>

        {/* ── ביקורות ─────────────────────────────────────────── */}
        <SectionCard title="ביקורות">
          {typeof place.rating === 'number' ? (
            <View style={styles.ratingBig}>
              <Text style={[styles.ratingBigNum, { color: accent }]}>{place.rating.toFixed(1)}</Text>
              <StarRating value={place.rating} />
            </View>
          ) : (
            <Text style={styles.noReviews}>אין ביקורות עדיין — היה הראשון!</Text>
          )}
          <Pressable style={[styles.reviewBtn, { borderColor: accent }]} onPress={() => {}}>
            <Ionicons name="create-outline" size={18} color={accent} />
            <Text style={[styles.reviewBtnText, { color: accent }]}>כתוב ביקורת</Text>
          </Pressable>
        </SectionCard>

        {/* ── תרומה לקהילה ───────────────────────────────────── */}
        <Pressable style={styles.suggestBtn} onPress={() => setSuggestOpen(true)}>
          <Ionicons name="people-outline" size={18} color={colors.primary} />
          <View style={styles.suggestText}>
            <Text style={styles.suggestTitle}>כל עדכון שלכם תורם לקהילה</Text>
            <Text style={styles.suggestSub}>שעות, טלפון, כשרות ועוד — ביחד משפרים</Text>
          </View>
          <Ionicons name="chevron-back" size={16} color={colors.textMuted} />
        </Pressable>

        {/* ── דווח על טעות ───────────────────────────────────── */}
        <Pressable
          style={styles.reportBtn}
          onPress={() => navigation.navigate('Report', { placeId: place.id })}
        >
          <Ionicons name="flag-outline" size={15} color={colors.danger} />
          <Text style={styles.reportText}>{t.detail.report}</Text>
        </Pressable>

      </ScrollView>
      )}

      <NavPickerModal
        visible={navPickerOpen}
        point={place.location}
        label={place.name}
        address={place.address}
        onClose={() => setNavPickerOpen(false)}
      />

      <SuggestEditModal
        visible={suggestOpen}
        placeId={place.id}
        placeName={place.name}
        onClose={() => setSuggestOpen(false)}
      />
    </Screen>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sectionStyles.card}>
      <Text style={sectionStyles.title}>{title}</Text>
      {children}
    </View>
  );
}

function QuickAction({
  icon, label, color, filled, disabled, onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  filled?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      style={[qaStyles.btn, filled && { backgroundColor: color }, disabled && qaStyles.disabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Ionicons name={icon} size={22} color={filled ? '#fff' : disabled ? colors.textMuted : color} />
      <Text style={[qaStyles.label, { color: filled ? '#fff' : disabled ? colors.textMuted : color }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function DetailRow({
  icon, label, value, accent, tappable, onPress, link, multiline, empty,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  accent: string;
  tappable?: boolean;
  onPress?: () => void;
  link?: boolean;
  multiline?: boolean;
  empty?: boolean;
}) {
  const inner = (
    <View style={drStyles.row}>
      {/* Icon box */}
      <View style={[drStyles.iconBox, { backgroundColor: empty ? colors.border : accent + '18' }]}>
        <Ionicons name={icon} size={18} color={empty ? colors.textMuted : accent} />
      </View>

      {/* Text */}
      <View style={drStyles.textBlock}>
        <Text style={drStyles.label}>{label}</Text>
        <Text
          style={[
            drStyles.value,
            empty && drStyles.valuePlaceholder,
            link && !empty && { color: accent, textDecorationLine: 'underline' },
          ]}
          numberOfLines={multiline ? undefined : 2}
        >
          {value}
        </Text>
      </View>

      {/* Arrow for tappable rows */}
      {tappable && <Ionicons name="chevron-back" size={16} color={colors.textMuted} />}
    </View>
  );

  if (tappable && onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.65 }]}>
        {inner}
      </Pressable>
    );
  }
  return inner;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Toggle
  toggleRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  toggleActive: { backgroundColor: colors.primary },
  toggleText: { fontSize: 14, fontWeight: '700', color: colors.textMuted },
  toggleTextActive: { color: colors.textInverse },

  // Map tab
  mapContainer: { flex: 1 },
  mapTouchable: {
    flex: 1,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadow.card,
  },
  mapOverlayHint: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  mapHintText: { fontSize: 12, fontWeight: '600', color: '#fff' },

  // Info tab scroll
  scroll: { paddingBottom: spacing.xxl },

  // Hero
  hero: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    ...StyleSheet.absoluteFill,
  },
  heroImageOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  heroIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 12,
    left: 16,
  },
  heroEmojiBadge: { fontSize: 22 },
  heroIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmoji: { fontSize: 42 },

  // Name card (overlaps hero)
  nameCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: -28,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  placeName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'right',
    marginBottom: 2,
    letterSpacing: -0.6,
  },
  placeNameHe: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'right',
    marginBottom: spacing.sm,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    justifyContent: 'flex-end',
  },
  chip: {
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.xs,
    gap: 4,
  },
  ratingNum: { fontSize: 14, fontWeight: '700', color: colors.text },
  distance: { fontSize: 13, color: colors.textMuted },
  description: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'right',
    lineHeight: 21,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },

  // Quick actions row
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },

  // Gallery
  gallery: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  galleryAdd: {
    width: 110,
    height: 140,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  galleryAddText: { fontSize: 12, fontWeight: '600' },
  galleryImage: {
    width: 200,
    height: 140,
    borderRadius: radius.md,
  },
  galleryPlaceholder: {
    width: 110,
    height: 140,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryCert: {
    width: 130,
    height: 140,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    gap: 5,
  },
  galleryCertTitle: { fontSize: 13, fontWeight: '700' },
  galleryCertBody: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },

  // Rating big
  ratingBig: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'flex-end',
    marginBottom: spacing.md,
  },
  ratingBigNum: { fontSize: 32, fontWeight: '800' },
  noReviews: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'right',
    marginBottom: spacing.md,
  },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingVertical: 12,
  },
  reviewBtnText: { fontSize: 15, fontWeight: '700' },

  // Approx note
  approxNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    justifyContent: 'flex-end',
    paddingVertical: spacing.sm,
  },
  approxText: { fontSize: 12, color: colors.textMuted },

  // Community suggest
  suggestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.primary + '33',
    ...shadow.card,
  },
  suggestText: { flex: 1, alignItems: 'flex-end' },
  suggestTitle: { fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'right' },
  suggestSub: { fontSize: 13, color: colors.textMuted, textAlign: 'right', marginTop: 2 },

  // Report
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
  },
  reportText: { fontSize: 13, fontWeight: '600', color: colors.danger },
});

// Section card styles
const sectionStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    ...shadow.card,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'right',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    letterSpacing: -0.4,
  },
});

// Quick action button styles
const qaStyles = StyleSheet.create({
  btn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  label: { fontSize: 11, fontWeight: '700' },
  disabled: { opacity: 0.38 },
});

// Detail row styles
const drStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textBlock: { flex: 1, alignItems: 'flex-end' },
  label: { fontSize: 11, color: colors.textMuted, marginBottom: 2, textAlign: 'right' },
  value: { fontSize: 15, fontWeight: '600', color: colors.text, textAlign: 'right' },
  valuePlaceholder: { color: colors.textMuted, fontWeight: '400' },
});

// ─── Tzaddik-specific styles ──────────────────────────────────────────────────

const tzStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  body: {
    padding: spacing.lg,
    gap: 14,
  },
  eraBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.tzaddik + '18',
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  eraText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.tzaddik,
  },
  bioText: {
    fontSize: 14.5,
    color: colors.text,
    lineHeight: 24,
    textAlign: 'right',
  },
  quoteBlock: {
    borderRightWidth: 3,
    borderRightColor: colors.tzaddik + '88',
    backgroundColor: colors.tzaddik + '0D',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 6,
  },
  quoteText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 26,
    textAlign: 'right',
    fontStyle: 'italic',
  },
  quoteSource: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    textAlign: 'right',
  },
  hillulaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
  },
  hillulaText: {
    fontSize: 12,
    color: colors.tzaddik,
    fontWeight: '700',
  },
  sourcesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  sourceTag: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sourceTagText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  prayerBody: {
    padding: spacing.lg,
    gap: 12,
  },
  prayerIntro: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
    textAlign: 'right',
  },
  prayerText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 30,
    textAlign: 'center',
    fontWeight: '500',
  },
  prayerSource: {
    fontSize: 11,
    color: colors.textFaint,
    textAlign: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});

