import React from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { makeStyles, radius, spacing } from '../theme';

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

    // A class component cannot call hooks, so styling — which now needs the
    // colour scheme — lives in a functional child instead.
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
  const styles = useStyles();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.emoji}>🛠️</Text>
        <Text style={styles.title}>משהו השתבש</Text>
        <Text style={styles.body}>
          אירעה תקלה בלתי צפויה. אפשר לנסות שוב — ואם זה חוזר, נשמח לדיווח.
        </Text>

        <Pressable
          style={styles.button}
          onPress={onReset}
          accessibilityRole="button"
          accessibilityLabel="נסה שוב"
        >
          <Text style={styles.buttonText}>נסה שוב</Text>
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

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.background,
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    backgroundColor: t.surface,
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
    color: t.text,
    writingDirection: 'rtl',
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: t.textMuted,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: spacing.xl,
  },
  button: {
    minWidth: 160,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: t.primary,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: t.textInverse,
  },
  details: {
    maxHeight: 220,
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: t.surfaceMuted,
  },
  detailsText: {
    fontSize: 11,
    color: t.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
}));
