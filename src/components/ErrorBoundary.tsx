import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { useLanguage } from '../context/LanguageContext';

interface Props {
  children: React.ReactNode;
  /** Hook for a crash reporter (Sentry et al) once one is wired up. */
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface State {
  error: Error | null;
  info: React.ErrorInfo | null;
}

/**
 * Catches render-time exceptions so a single bad component cannot take the
 * whole app down to a blank screen — which is exactly what happened before,
 * on all three platforms, because nothing caught them at all.
 *
 * The reset path re-mounts the subtree. That is enough for a transient failure
 * (a malformed record, a missing field); a deterministic crash will surface
 * again immediately, which is the honest outcome.
 *
 * ── Why this can't use `useTheme()` ──────────────────────────────────────────
 * This wraps `ThemeProvider` in App.tsx, deliberately outermost so a provider
 * blowing up is caught too. That means an error ANYWHERE in the tree —
 * including inside ThemeProvider itself — unmounts ThemeProvider along with
 * everything else and renders the fallback below in its place. A fallback
 * that called `useTheme()` would throw "must be used inside <ThemeProvider>"
 * while rendering the very screen meant to catch failures, crashing to blank
 * with nothing left to catch it. It uses the static `colors` export instead
 * (light-only, no hook, no provider dependency) — see `src/theme/colors.ts`.
 * `useLanguage()` is safe here because its context has a default value and
 * never throws without a provider — but that safety is a property of
 * LanguageContext.tsx, not of this file. `LanguageProvider` sits INSIDE
 * `ThemeProvider` in App.tsx, so this fallback is rendered outside its own
 * provider too, same as ThemeProvider. It only works because
 * `createContext(defaultValue)` there doesn't throw on a missing provider,
 * unlike ThemeContext's `createContext(null)` + explicit throw. If
 * LanguageContext is ever changed to throw the same way (e.g. "tidied" to
 * match ThemeContext's pattern), this fallback breaks the same way the
 * `useTheme()` version did — check here first.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ info });
    this.props.onError?.(error, info);
    // Until a crash reporter is wired up, the console is the only record.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private reset = () => this.setState({ error: null, info: null });

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    // A class component cannot call hooks, so the fallback lives in a
    // functional child instead.
    return <ErrorFallback error={error} info={info} onReset={this.reset} />;
  }
}

function ErrorFallback({
  error,
  info,
  onReset,
}: {
  error: Error;
  info: React.ErrorInfo | null;
  onReset: () => void;
}) {
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.emoji}>🛠️</Text>
        <Text style={styles.title}>{t.errorBoundary.title}</Text>
        <Text style={styles.body}>{t.errorBoundary.body}</Text>

        <Pressable
          style={styles.button}
          onPress={onReset}
          accessibilityRole="button"
          accessibilityLabel={t.errorBoundary.retryLabel}
        >
          <Text style={styles.buttonText}>{t.errorBoundary.retry}</Text>
        </Pressable>

        {__DEV__ && (
          <ScrollView style={styles.details}>
            <Text style={styles.detailsText}>{error.message}</Text>
            {!!info?.componentStack && (
              <Text style={styles.detailsText}>{info.componentStack}</Text>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
  },
  emoji: {
    fontSize: 40,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    writingDirection: 'rtl',
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: spacing.xl,
  },
  button: {
    minWidth: 160,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textInverse,
  },
  details: {
    maxHeight: 220,
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  detailsText: {
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
