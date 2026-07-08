import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { colors, radius, spacing } from '../theme';
import { BRACHOT_CATEGORIES, Blessing } from '../data/brachot';
import { Nusach } from '../data/birkatHamazon';

type ViewState =
  | { type: 'list' }
  | { type: 'nusach'; blessing: Blessing }
  | { type: 'text'; blessing: Blessing; nusach?: Nusach };

export function BrachotScreen() {
  const [view, setView] = useState<ViewState>({ type: 'list' });

  if (view.type === 'text') {
    const { blessing, nusach } = view;
    const paragraphs = nusach
      ? blessing.nusachim![nusach]
      : blessing.paragraphs!;

    return (
      <Screen padded>
        <View style={styles.header}>
          <Pressable
            onPress={() =>
              blessing.hasNusach
                ? setView({ type: 'nusach', blessing })
                : setView({ type: 'list' })
            }
            style={styles.back}
            hitSlop={10}
          >
            <Ionicons name="chevron-forward" size={22} color={colors.primary} />
            <Text style={styles.backText}>
              {blessing.hasNusach ? blessing.title : 'ברכות'}
            </Text>
          </Pressable>
          <Text style={styles.headerTitle}>{blessing.title}</Text>
          <View style={{ width: 60 }} />
        </View>

        {nusach ? (
          <Text style={styles.nusachLabel}>
            {nusach === 'ashkenaz' ? '🕍 נוסח אשכנז' : '🕌 נוסח ספרד'}
          </Text>
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

  if (view.type === 'nusach') {
    const { blessing } = view;
    return (
      <Screen padded>
        <View style={styles.header}>
          <Pressable
            onPress={() => setView({ type: 'list' })}
            style={styles.back}
            hitSlop={10}
          >
            <Ionicons name="chevron-forward" size={22} color={colors.primary} />
            <Text style={styles.backText}>ברכות</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{blessing.title}</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.nusachCards}>
          <Pressable
            style={styles.nusachCard}
            onPress={() => setView({ type: 'text', blessing, nusach: 'ashkenaz' })}
          >
            <View style={styles.nusachIcon}><Text style={styles.emoji}>🕍</Text></View>
            <View style={styles.nusachText}>
              <Text style={styles.nusachTitle}>נוסח אשכנז</Text>
              <Text style={styles.nusachSub}>מנהג אשכנז</Text>
            </View>
            <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
          </Pressable>

          <Pressable
            style={styles.nusachCard}
            onPress={() => setView({ type: 'text', blessing, nusach: 'sfarad' })}
          >
            <View style={styles.nusachIcon}><Text style={styles.emoji}>🕌</Text></View>
            <View style={styles.nusachText}>
              <Text style={styles.nusachTitle}>נוסח ספרד</Text>
              <Text style={styles.nusachSub}>מנהג ספרד ועדות המזרח</Text>
            </View>
            <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>ברכות</Text>

        {BRACHOT_CATEGORIES.map((cat) => (
          <View key={cat.id} style={styles.section}>
            <Text style={styles.sectionTitle}>{cat.title}</Text>

            <View style={styles.cards}>
              {cat.blessings.map((blessing) => (
                <Pressable
                  key={blessing.id}
                  style={styles.card}
                  onPress={() =>
                    blessing.hasNusach
                      ? setView({ type: 'nusach', blessing })
                      : setView({ type: 'text', blessing })
                  }
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
                  <Ionicons name="chevron-back" size={16} color={colors.textMuted} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'right',
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textAlign: 'right',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cards: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 20 },
  cardText: { flex: 1 },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'right',
  },
  cardSub: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 2,
  },

  // Header (text + nusach views)
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  nusachLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },

  // Nusach picker
  nusachCards: {
    gap: 10,
    marginTop: spacing.md,
  },
  nusachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  nusachIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nusachText: { flex: 1 },
  nusachTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'right',
  },
  nusachSub: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 2,
  },

  // Text reader
  textContent: {
    paddingBottom: 20,
  },
  para: {
    marginBottom: spacing.xl,
  },
  paraTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'right',
    marginBottom: 8,
    borderRightWidth: 3,
    borderRightColor: colors.primary,
    paddingRight: 8,
  },
  paraText: {
    fontSize: 19,
    lineHeight: 34,
    color: colors.text,
    textAlign: 'right',
  },
});
