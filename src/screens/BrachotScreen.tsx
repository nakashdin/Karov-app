import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Screen } from '../components/Screen';
import { makeStyles, radius, spacing, useTheme } from '../theme';
import { BRACHOT_CATEGORIES, Blessing } from '../data/brachot';
import { Nusach } from '../data/birkatHamazon';
import { useNusach } from '../hooks/useNusach';
import { useHalachicDate } from '../hooks/useHalachicDate';
import {
  TEHILLIM_BAKASHA,
  TEHILLIM_CHAPTERS,
  TEHILLIM_INTRO,
  TEHILLIM_WEEKLY,
  TehillimDay,
  getDayForChapter,
  numToHebrew,
} from '../data/tehillim';
import { TEHILLIM_TEXT } from '../data/tehillimText';

// ─── Types ───────────────────────────────────────────────────────────────────

const NUSACH_LABEL: Record<Nusach, string> = {
  ashkenaz: '🕍 נוסח אשכנז',
  sfarad: '🕌 נוסח ספרד',
  edot_hamizrach: '✡️ נוסח עדות המזרח',
};

type ViewState =
  | { type: 'list' }
  | { type: 'global_nusach_picker' }
  | { type: 'text'; blessing: Blessing; useIgeret?: boolean }
  | { type: 'igeret_picker'; blessing: Blessing }
  | { type: 'tehillim_days' }
  | { type: 'tehillim_bakasha' }
  | { type: 'tehillim_day'; day: TehillimDay }
  | { type: 'tehillim_chapter'; chapterNum: number; day: TehillimDay };

// ─── Main component ───────────────────────────────────────────────────────────

export function BrachotScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const [view, setView] = useState<ViewState>({ type: 'list' });
  const [query, setQuery] = useState('');
  const { nusach, loaded, setNusach } = useNusach();

  // Sunset, not midnight — see useHalachicDate.
  const { weekday: todayIndex } = useHalachicDate();

  if (!loaded) return null;

  if (!nusach && view.type !== 'global_nusach_picker') {
    return (
      <Screen padded>
        <GlobalNusachPickerView
          canGoBack={false}
          onSelect={setNusach}
          onBack={() => setView({ type: 'list' })}
        />
      </Screen>
    );
  }

  // ── Blessing text reader ──────────────────────────────────────────────────
  if (view.type === 'text') {
    const { blessing, useIgeret } = view;
    const resolvedNusach = nusach === 'edot_hamizrach'
      ? (blessing.nusachim?.edot_hamizrach ? 'edot_hamizrach' : 'sfarad')
      : (nusach ?? 'sfarad');
    const paragraphs = useIgeret
      ? blessing.igeretParagraphs!
      : blessing.hasNusach && blessing.nusachim
      ? (blessing.nusachim[resolvedNusach as 'ashkenaz' | 'sfarad'] ?? blessing.nusachim.sfarad)
      : blessing.paragraphs!;

    return (
      <Screen padded>
        <View style={styles.header}>
          <Pressable
            onPress={() =>
              useIgeret || blessing.hasIgeret
                ? setView({ type: 'igeret_picker', blessing })
                : setView({ type: 'list' })
            }
            style={styles.backBtn}
            hitSlop={10}
          >
            <Ionicons name="chevron-forward" size={22} color={theme.primary} />
            <Text style={styles.backText}>
              {useIgeret || blessing.hasIgeret ? blessing.title : 'תפילה'}
            </Text>
          </Pressable>
          <Text style={styles.headerTitle}>{blessing.title}</Text>
          <View style={{ width: 60 }} />
        </View>

        {blessing.hasNusach && nusach ? (
          <Text style={styles.nusachLabel}>{NUSACH_LABEL[nusach]}</Text>
        ) : null}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.textContent}
        >
          {paragraphs.map((para, i) => (
            <View key={i} style={styles.para}>
              {para.title ? (
                <Text style={styles.paraTitle}>{para.title}</Text>
              ) : null}
              <Text style={styles.paraText}>{para.text}</Text>
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      </Screen>
    );
  }

  // ── Global nusach picker (first run or via settings) ─────────────────────
  if (view.type === 'global_nusach_picker') {
    return (
      <Screen padded>
        <GlobalNusachPickerView
          canGoBack={!!nusach}
          onSelect={async (n) => { await setNusach(n); setView({ type: 'list' }); }}
          onBack={() => setView({ type: 'list' })}
        />
      </Screen>
    );
  }

  // ── Igeret HaRamban picker ────────────────────────────────────────────────
  if (view.type === 'igeret_picker') {
    const { blessing } = view;
    return (
      <Screen padded>
        <View style={styles.header}>
          <Pressable
            onPress={() => setView({ type: 'list' })}
            style={styles.backBtn}
            hitSlop={10}
          >
            <Ionicons name="chevron-forward" size={22} color={theme.primary} />
            <Text style={styles.backText}>תפילה</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{blessing.title}</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.nusachCards}>
          <Pressable
            style={styles.nusachCard}
            onPress={() => setView({ type: 'text', blessing })}
          >
            <View style={styles.nusachIcon}>
              <Text style={styles.emoji}>📖</Text>
            </View>
            <View style={styles.nusachTextBox}>
              <Text style={styles.nusachTitle}>על האגרת עצמה</Text>
              <Text style={styles.nusachSub}>מהי האגרת ומדוע לקוראה</Text>
            </View>
            <Ionicons name="chevron-back" size={18} color={theme.textMuted} />
          </Pressable>

          <Pressable
            style={styles.nusachCard}
            onPress={() => setView({ type: 'text', blessing, useIgeret: true })}
          >
            <View style={styles.nusachIcon}>
              <Text style={styles.emoji}>📜</Text>
            </View>
            <View style={styles.nusachTextBox}>
              <Text style={styles.nusachTitle}>האגרת</Text>
              <Text style={styles.nusachSub}>הטקסט המלא — לקריאה שבועית</Text>
            </View>
            <Ionicons name="chevron-back" size={18} color={theme.textMuted} />
          </Pressable>
        </View>
      </Screen>
    );
  }

  // ── Tehillim: bakasha before reading ─────────────────────────────────────
  if (view.type === 'tehillim_bakasha') {
    return (
      <Screen padded>
        <View style={styles.header}>
          <Pressable
            onPress={() => setView({ type: 'tehillim_days' })}
            style={styles.backBtn}
            hitSlop={10}
          >
            <Ionicons name="chevron-forward" size={22} color={theme.primary} />
            <Text style={styles.backText}>ספר תהילים</Text>
          </Pressable>
          <Text style={styles.headerTitle}>בקשה</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.textContent}
        >
          <View style={styles.bakashaNoteCard}>
            <Text style={styles.bakashaNoteText}>{TEHILLIM_BAKASHA.note}</Text>
          </View>

          {TEHILLIM_BAKASHA.paragraphs.map((para, i) => (
            <View key={i} style={styles.para}>
              <Text style={styles.paraText}>{para.text}</Text>
            </View>
          ))}

          <View style={styles.para}>
            <Text style={styles.paraTitle}>{TEHILLIM_BAKASHA.psalmLabel}</Text>
            <View style={styles.versesBox}>
              {TEHILLIM_BAKASHA.psalmVerses.map((verse, i) => (
                <View key={i} style={styles.verseRow}>
                  <Text style={styles.verseNum}>{numToHebrew(i + 1)}</Text>
                  <Text style={styles.verseText}>{verse}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </Screen>
    );
  }

  // ── Tehillim: day picker (ליום ראשון…) ───────────────────────────────────
  if (view.type === 'tehillim_days') {
    return (
      <Screen padded>
        <View style={styles.header}>
          <Pressable
            onPress={() => setView({ type: 'list' })}
            style={styles.backBtn}
            hitSlop={10}
          >
            <Ionicons name="chevron-forward" size={22} color={theme.primary} />
            <Text style={styles.backText}>תפילה</Text>
          </Pressable>
          <Text style={styles.headerTitle}>ספר תהילים</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Pressable
            style={({ pressed }) => [styles.bakashahCard, pressed && styles.pressed]}
            onPress={() => setView({ type: 'tehillim_bakasha' })}
          >
            <View style={styles.bakashahLeft}>
              <Text style={styles.bakashahTitle}>בקשה קודם אמירת תהילים</Text>
              <Text style={styles.bakashahSub}>יְהִי רָצוֹן מִלְּפָנֶיךָ...</Text>
            </View>
            <Ionicons name="chevron-back" size={16} color={theme.primary} />
          </Pressable>

          <View style={styles.daysGrid}>
            {TEHILLIM_WEEKLY.map((day) => {
              const isToday = day.dayIndex === todayIndex;
              return (
                <Pressable
                  key={day.dayIndex}
                  style={({ pressed }) => [
                    styles.dayCardFull,
                    isToday && styles.dayCardToday,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setView({ type: 'tehillim_day', day })}
                >
                  <Text style={styles.dayEmoji}>{day.emoji}</Text>
                  <View style={styles.dayCardInfo}>
                    <Text style={[styles.dayName, isToday && styles.dayNameToday]}>
                      {day.liDay}
                    </Text>
                    <Text style={styles.dayRange2}>פרקים {numToHebrew(day.from)}–{numToHebrew(day.to)}</Text>
                  </View>
                  {isToday ? (
                    <View style={styles.todayBadge}>
                      <Text style={styles.todayBadgeText}>היום</Text>
                    </View>
                  ) : null}
                  <Ionicons name="chevron-back" size={16} color={isToday ? theme.primary : theme.textMuted} />
                </Pressable>
              );
            })}
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </Screen>
    );
  }

  // ── Tehillim: day chapter list ────────────────────────────────────────────
  if (view.type === 'tehillim_day') {
    const { day } = view;
    const chapters = TEHILLIM_CHAPTERS.filter(
      (c) => c.num >= day.from && c.num <= day.to,
    );
    return (
      <Screen padded>
        <View style={styles.header}>
          <Pressable
            onPress={() => setView({ type: 'tehillim_days' })}
            style={styles.backBtn}
            hitSlop={10}
          >
            <Ionicons name="chevron-forward" size={22} color={theme.primary} />
            <Text style={styles.backText}>ספר תהילים</Text>
          </Pressable>
          <Text style={styles.headerTitle}>
            {day.emoji} {day.longDay}
          </Text>
          <View style={{ width: 60 }} />
        </View>

        <Text style={styles.dayRange}>
          פרקים {numToHebrew(day.from)}–{numToHebrew(day.to)}
        </Text>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.chapterList}>
            {chapters.map((ch) => (
              <Pressable
                key={ch.num}
                style={({ pressed }) => [
                  styles.chapterRow,
                  pressed && styles.pressed,
                ]}
                onPress={() =>
                  setView({ type: 'tehillim_chapter', chapterNum: ch.num, day })
                }
              >
                <View style={styles.chapterNumBox}>
                  <Text style={styles.chapterNumText}>{numToHebrew(ch.num)}</Text>
                </View>
                <View style={styles.chapterInfo}>
                  <Text style={styles.chapterTheme} numberOfLines={1}>
                    {ch.theme}
                  </Text>
                  <Text style={styles.chapterDesc} numberOfLines={2}>
                    {ch.desc}
                  </Text>
                </View>
                <Ionicons name="chevron-back" size={16} color={theme.textMuted} />
              </Pressable>
            ))}
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </Screen>
    );
  }

  // ── Tehillim: chapter reader ──────────────────────────────────────────────
  if (view.type === 'tehillim_chapter') {
    const { chapterNum, day } = view;
    const meta = TEHILLIM_CHAPTERS.find((c) => c.num === chapterNum);
    const textData = TEHILLIM_TEXT.find((c) => c.num === chapterNum);
    const verses = textData?.verses ?? [];

    const prevNum = chapterNum > 1 ? chapterNum - 1 : null;
    const nextNum = chapterNum < 150 ? chapterNum + 1 : null;

    const navToChapter = (num: number) => {
      const newDayIdx = getDayForChapter(num);
      const newDay = TEHILLIM_WEEKLY[newDayIdx] ?? day;
      setView({ type: 'tehillim_chapter', chapterNum: num, day: newDay });
    };

    return (
      <Screen padded>
        <View style={styles.header}>
          <Pressable
            onPress={() => setView({ type: 'tehillim_day', day })}
            style={styles.backBtn}
            hitSlop={10}
          >
            <Ionicons name="chevron-forward" size={22} color={theme.primary} />
            <Text style={styles.backText}>{day.longDay}</Text>
          </Pressable>
          <Text style={styles.headerTitle}>פרק {numToHebrew(chapterNum)}</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.chapterContent}
        >
          {/* Chapter explanation */}
          {meta ? (
            <View style={styles.descBox}>
              <Text style={styles.descTheme}>{meta.theme}</Text>
              <Text style={styles.descBody}>{meta.desc}</Text>
            </View>
          ) : null}

          {/* Full chapter text */}
          {verses.length > 0 ? (
            <View style={styles.versesBox}>
              {verses.map((v, i) => (
                <View key={i} style={styles.verseRow}>
                  <Text style={styles.verseNum}>{numToHebrew(i + 1)}</Text>
                  <Text style={styles.verseText}>{v}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noTextBox}>
              <Text style={styles.noTextMsg}>
                הטקסט עדיין לא נטען.{'\n'}הרץ:{'\n'}
                <Text style={styles.noTextCode}>
                  node scripts/fetch-tehillim-data.mjs
                </Text>
              </Text>
            </View>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>

        {/* Prev / Next navigation */}
        <View style={styles.navBar}>
          <Pressable
            style={[styles.navBtn, !nextNum && styles.navBtnDisabled]}
            onPress={() => nextNum && navToChapter(nextNum)}
            disabled={!nextNum}
          >
            <Ionicons
              name="chevron-back"
              size={18}
              color={nextNum ? theme.primary : theme.textFaint}
            />
            <Text
              style={[styles.navBtnText, !nextNum && styles.navBtnTextDisabled]}
            >
              {nextNum ? `פרק ${numToHebrew(nextNum)}` : 'סוף הספר'}
            </Text>
          </Pressable>

          <View style={styles.navDivider} />

          <Pressable
            style={[styles.navBtn, !prevNum && styles.navBtnDisabled]}
            onPress={() => prevNum && navToChapter(prevNum)}
            disabled={!prevNum}
          >
            <Text
              style={[styles.navBtnText, !prevNum && styles.navBtnTextDisabled]}
            >
              {prevNum ? `פרק ${numToHebrew(prevNum)}` : 'תחילת הספר'}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={prevNum ? theme.primary : theme.textFaint}
            />
          </Pressable>
        </View>
      </Screen>
    );
  }

  // ── Main list view ────────────────────────────────────────────────────────

  return <TfilaListView
    query={query}
    setQuery={setQuery}
    todayIndex={todayIndex}
    nusach={nusach}
    onChangeNusach={() => setView({ type: 'global_nusach_picker' })}
    onBlessing={(b) =>
      b.hasIgeret
        ? setView({ type: 'igeret_picker', blessing: b })
        : setView({ type: 'text', blessing: b })
    }
    onTehillim={() => setView({ type: 'tehillim_days' })}
    onChapter={(num, day) =>
      setView({ type: 'tehillim_chapter', chapterNum: num, day })
    }
  />;
}

// ─── Global nusach picker sub-view ────────────────────────────────────────────

interface GNPProps {
  canGoBack: boolean;
  onSelect: (n: Nusach) => void;
  onBack: () => void;
}

function GlobalNusachPickerView({ canGoBack, onSelect, onBack }: GNPProps) {
  const theme = useTheme();
  const styles = useStyles();
  const OPTIONS: { nusach: Nusach; emoji: string; title: string; sub: string }[] = [
    { nusach: 'ashkenaz', emoji: '🕍', title: 'נוסח אשכנז', sub: 'מנהג קהילות אשכנז ומזרח אירופה' },
    { nusach: 'sfarad', emoji: '🕌', title: 'נוסח ספרד', sub: 'מנהג החסידים ויוצאי ספרד' },
    { nusach: 'edot_hamizrach', emoji: '✡️', title: 'נוסח עדות המזרח', sub: 'מנהג ספרדים ועדות המזרח (שמ"ץ)' },
  ];
  return (
    <>
      {canGoBack ? (
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backBtn} hitSlop={10}>
            <Ionicons name="chevron-forward" size={22} color={theme.primary} />
            <Text style={styles.backText}>תפילה</Text>
          </Pressable>
          <Text style={styles.headerTitle}>בחירת נוסח</Text>
          <View style={{ width: 60 }} />
        </View>
      ) : null}
      <Text style={styles.gnpTitle}>מה הנוסח שלך?</Text>
      <Text style={styles.gnpSub}>
        הבחירה תשפיע על כל הנוסחים בתפילה.{'\n'}אפשר לשנות בכל עת.
      </Text>
      <View style={styles.nusachCards}>
        {OPTIONS.map((opt) => (
          <Pressable
            key={opt.nusach}
            style={styles.nusachCard}
            onPress={() => onSelect(opt.nusach)}
          >
            <View style={styles.nusachIcon}>
              <Text style={styles.emoji}>{opt.emoji}</Text>
            </View>
            <View style={styles.nusachTextBox}>
              <Text style={styles.nusachTitle}>{opt.title}</Text>
              <Text style={styles.nusachSub}>{opt.sub}</Text>
            </View>
            <Ionicons name="chevron-back" size={18} color={theme.textMuted} />
          </Pressable>
        ))}
      </View>
    </>
  );
}

// ─── List / Search view ───────────────────────────────────────────────────────

interface ListProps {
  query: string;
  setQuery: (q: string) => void;
  todayIndex: number;
  nusach: Nusach | null;
  onChangeNusach: () => void;
  onBlessing: (b: Blessing) => void;
  onTehillim: () => void;
  onChapter: (num: number, day: TehillimDay) => void;
}

function TfilaListView({
  query,
  setQuery,
  todayIndex,
  nusach,
  onChangeNusach,
  onBlessing,
  onTehillim,
  onChapter,
}: ListProps) {
  const theme = useTheme();
  const styles = useStyles();
  const allBlessings = useMemo(
    () => BRACHOT_CATEGORIES.flatMap((c) => c.blessings),
    [],
  );

  const searchResults = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.trim().toLowerCase();

    const blessings = allBlessings.filter(
      (b) =>
        b.title.includes(q) || (b.subtitle ?? '').includes(q),
    );

    const chapters = TEHILLIM_CHAPTERS.filter(
      (c) =>
        c.theme.includes(q) ||
        c.desc.includes(q) ||
        String(c.num) === q.trim(),
    );

    return { blessings, chapters };
  }, [query, allBlessings]);

  return (
    <Screen padded>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color={theme.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="חיפוש בתפילה ותהילים…"
          placeholderTextColor={theme.textFaint}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
          textAlign="right"
        />
      </View>

      {searchResults ? (
        /* ── Search results ── */
        <ScrollView showsVerticalScrollIndicator={false}>
          {searchResults.blessings.length === 0 &&
          searchResults.chapters.length === 0 ? (
            <Text style={styles.emptySearch}>אין תוצאות עבור &quot;{query}&quot;</Text>
          ) : null}

          {searchResults.blessings.length > 0 ? (
            <>
              <Text style={styles.searchSectionLabel}>ברכות</Text>
              <View style={styles.cards}>
                {searchResults.blessings.map((b) => (
                  <Pressable
                    key={b.id}
                    style={({ pressed }) => [styles.card, pressed && styles.pressed]}
                    onPress={() => onBlessing(b)}
                  >
                    <View style={styles.cardIcon}>
                      <Text style={styles.emoji}>{b.emoji}</Text>
                    </View>
                    <View style={styles.cardText}>
                      <Text style={styles.cardTitle}>{b.title}</Text>
                      {b.subtitle ? (
                        <Text style={styles.cardSub}>{b.subtitle}</Text>
                      ) : null}
                    </View>
                    <Ionicons name="chevron-back" size={16} color={theme.textMuted} />
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          {searchResults.chapters.length > 0 ? (
            <>
              <Text style={[styles.searchSectionLabel, { marginTop: 16 }]}>
                תהילים
              </Text>
              <View style={styles.chapterList}>
                {searchResults.chapters.map((ch) => {
                  const dayIdx = getDayForChapter(ch.num);
                  const day = TEHILLIM_WEEKLY[dayIdx];
                  return (
                    <Pressable
                      key={ch.num}
                      style={({ pressed }) => [
                        styles.chapterRow,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => onChapter(ch.num, day)}
                    >
                      <View style={styles.chapterNumBox}>
                        <Text style={styles.chapterNumText}>{numToHebrew(ch.num)}</Text>
                      </View>
                      <View style={styles.chapterInfo}>
                        <Text style={styles.chapterTheme} numberOfLines={1}>
                          {ch.theme}
                        </Text>
                        <Text style={styles.chapterDesc} numberOfLines={2}>
                          {ch.desc}
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-back"
                        size={16}
                        color={theme.textMuted}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        /* ── Normal list ── */
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.nusachBadgeRow}>
            <Text style={styles.nusachBadgeText}>
              {nusach ? NUSACH_LABEL[nusach] : ''}
            </Text>
            <Pressable onPress={onChangeNusach} hitSlop={8}>
              <Text style={styles.nusachChangeBtn}>שנה נוסח</Text>
            </Pressable>
          </View>

          <Text style={styles.screenTitle}>תפילה</Text>

          {/* ── Tehillim section ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ספר תהילים</Text>
            <View style={styles.cards}>
              <Pressable
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
                onPress={onTehillim}
              >
                <View style={[styles.cardIcon, { backgroundColor: theme.accent.indigo.tint }]}>
                  <Text style={styles.emoji}>📜</Text>
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>ספר תהילים</Text>
                  <Text style={styles.cardSub}>
                    {TEHILLIM_WEEKLY[todayIndex]
                      ? `${TEHILLIM_WEEKLY[todayIndex].liDay} — פרקים ${numToHebrew(TEHILLIM_WEEKLY[todayIndex].from)}–${numToHebrew(TEHILLIM_WEEKLY[todayIndex].to)}`
                      : '150 פרקים, חלוקה שבועית'}
                  </Text>
                </View>
                <Ionicons name="chevron-back" size={16} color={theme.textMuted} />
              </Pressable>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* ── Brachot section ── */}
          {BRACHOT_CATEGORIES.map((cat) => (
            <View key={cat.id} style={styles.section}>
              <Text style={styles.sectionTitle}>{cat.title}</Text>
              <View style={styles.cards}>
                {cat.blessings.map((blessing) => (
                  <Pressable
                    key={blessing.id}
                    style={({ pressed }) => [styles.card, pressed && styles.pressed]}
                    onPress={() => onBlessing(blessing)}
                  >
                    <View style={styles.cardIcon}>
                      <Text style={styles.emoji}>{blessing.emoji}</Text>
                    </View>
                    <View style={styles.cardText}>
                      <Text style={styles.cardTitle}>{blessing.title}</Text>
                      {blessing.subtitle ? (
                        <Text style={styles.cardSub}>{blessing.subtitle}</Text>
                      ) : null}
                    </View>
                    <Ionicons
                      name="chevron-back"
                      size={16}
                      color={theme.textMuted}
                    />
                  </Pressable>
                ))}
              </View>
            </View>
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </Screen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const useStyles = makeStyles((t) => ({
  // Nusach badge row (in list view)
  nusachBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 2,
    marginBottom: 4,
  },
  nusachBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: t.textMuted,
  },
  nusachChangeBtn: {
    fontSize: 13,
    fontWeight: '700',
    color: t.primary,
  },

  // Global nusach picker
  gnpTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: t.text,
    textAlign: 'right',
    marginTop: spacing.xl,
    marginBottom: 6,
  },
  gnpSub: {
    fontSize: 15,
    color: t.textMuted,
    textAlign: 'right',
    marginBottom: spacing.xxl,
    lineHeight: 22,
  },

  // Screen title
  screenTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: t.text,
    textAlign: 'right',
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },

  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.surface,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    borderColor: t.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    gap: 8,
    marginBottom: spacing.lg,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: t.text,
    padding: 0,
  },
  emptySearch: {
    textAlign: 'center',
    color: t.textMuted,
    fontSize: 15,
    marginTop: spacing.xxl,
  },
  searchSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: t.textMuted,
    textAlign: 'right',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Section
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: t.textMuted,
    textAlign: 'right',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: {
    height: 0.5,
    backgroundColor: t.border,
    marginBottom: spacing.xl,
  },

  // Tehillim intro
  tehillimIntroCard: {
    backgroundColor: t.accent.indigo.tint,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 0.5,
    borderColor: t.accent.indigo.border,
  },
  tehillimIntroText: {
    fontSize: 13,
    lineHeight: 20,
    color: t.accent.indigo.fg,
    textAlign: 'right',
  },

  // Days grid (used in tehillim_days view)
  daysGrid: {
    gap: 8,
  },
  dayCardFull: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: t.surface,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderWidth: 0.5,
    borderColor: t.border,
  },
  dayCardToday: {
    borderColor: t.primary,
    backgroundColor: t.primaryLight,
  },
  dayCardInfo: {
    flex: 1,
  },
  dayEmoji: { fontSize: 26 },
  dayName: {
    fontSize: 16,
    fontWeight: '700',
    color: t.text,
    textAlign: 'right',
  },
  dayNameToday: { color: t.primary },
  dayRange2: {
    fontSize: 12,
    color: t.textMuted,
    textAlign: 'right',
    marginTop: 2,
  },
  todayBadge: {
    backgroundColor: t.primary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  todayBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: t.textInverse,
  },

  // Chapter list
  chapterList: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: t.border,
  },
  chapterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: t.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: t.border,
  },
  chapterNumBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: t.accent.indigo.tint,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  chapterNumText: {
    fontSize: 13,
    fontWeight: '800',
    color: t.accent.violet.fg,
  },
  chapterInfo: { flex: 1 },
  chapterTheme: {
    fontSize: 14,
    fontWeight: '700',
    color: t.text,
    textAlign: 'right',
  },
  chapterDesc: {
    fontSize: 11,
    color: t.textMuted,
    textAlign: 'right',
    marginTop: 2,
    lineHeight: 16,
  },

  // Day range label (in day view)
  dayRange: {
    fontSize: 13,
    color: t.textMuted,
    textAlign: 'right',
    marginBottom: spacing.md,
  },

  // Chapter reader
  chapterContent: {
    paddingBottom: 20,
  },
  descBox: {
    backgroundColor: t.accent.indigo.tint,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 0.5,
    borderColor: t.accent.indigo.border,
    gap: 6,
  },
  descTheme: {
    fontSize: 14,
    fontWeight: '800',
    color: t.accent.indigo.fg,
    textAlign: 'right',
  },
  descBody: {
    fontSize: 14,
    lineHeight: 22,
    color: t.accent.indigo.fg,
    textAlign: 'right',
  },
  versesBox: {
    gap: 12,
  },
  verseRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  verseNum: {
    fontSize: 11,
    fontWeight: '700',
    color: t.textFaint,
    marginTop: 5,
    width: 20,
    textAlign: 'center',
    flexShrink: 0,
  },
  verseText: {
    flex: 1,
    fontSize: 20,
    lineHeight: 36,
    color: t.text,
    textAlign: 'right',
  },
  noTextBox: {
    backgroundColor: t.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: t.border,
  },
  noTextMsg: {
    fontSize: 14,
    color: t.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  noTextCode: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: t.text,
  },

  // Prev/Next nav bar
  navBar: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: t.border,
    backgroundColor: t.surface,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    gap: 0,
  },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  navBtnDisabled: { opacity: 0.4 },
  navBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: t.primary,
  },
  navBtnTextDisabled: { color: t.textFaint },
  navDivider: {
    width: 0.5,
    backgroundColor: t.border,
    alignSelf: 'stretch',
  },

  // Back header (used in all sub-views)
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
    color: t.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: t.text,
  },

  // Nusach picker
  nusachLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: t.primary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  nusachCards: {
    gap: 10,
    marginTop: spacing.md,
  },
  nusachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: t.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 0.5,
    borderColor: t.border,
  },
  nusachIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: t.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nusachTextBox: { flex: 1 },
  nusachTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: t.text,
    textAlign: 'right',
  },
  nusachSub: {
    fontSize: 12,
    color: t.textMuted,
    textAlign: 'right',
    marginTop: 2,
  },

  // Brachot cards
  cards: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: t.border,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: t.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: t.border,
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: t.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 20 },
  cardText: { flex: 1 },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: t.text,
    textAlign: 'right',
  },
  cardSub: {
    fontSize: 12,
    color: t.textMuted,
    textAlign: 'right',
    marginTop: 2,
  },

  // Blessing text reader
  textContent: { paddingBottom: 20 },
  para: { marginBottom: spacing.xl },
  paraTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: t.primary,
    textAlign: 'right',
    marginBottom: 8,
    borderRightWidth: 3,
    borderRightColor: t.primary,
    paddingRight: 8,
  },
  paraText: {
    fontSize: 19,
    lineHeight: 34,
    color: t.text,
    textAlign: 'right',
  },

  pressed: { opacity: 0.75 },

  // Bakasha entry card (in tehillim_days)
  bakashahCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.accent.indigo.tint,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    borderColor: t.accent.indigo.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: 12,
  },
  bakashahLeft: { flex: 1 },
  bakashahTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: t.accent.indigo.fg,
    textAlign: 'right',
  },
  bakashahSub: {
    fontSize: 12,
    color: t.accent.violet.fg,
    textAlign: 'right',
    marginTop: 3,
  },

  // Bakasha screen — shabbat/yom tov note
  bakashaNoteCard: {
    backgroundColor: t.warningSurface,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: t.warningBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xl,
  },
  bakashaNoteText: {
    fontSize: 13,
    lineHeight: 20,
    color: t.warningText,
    textAlign: 'right',
  },
}));
