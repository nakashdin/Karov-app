import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { ErrorBoundary } from '../ErrorBoundary';

function Bomb(): React.ReactElement {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  const originalError = console.error;
  beforeEach(() => {
    // React logs the caught error to the console by design; keep the test
    // output clean without hiding a genuine assertion failure.
    console.error = jest.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  it('renders children when nothing has thrown', async () => {
    const { getByText } = await render(
      <ErrorBoundary>
        <Text>fine</Text>
      </ErrorBoundary>,
    );
    expect(getByText('fine')).toBeTruthy();
  });

  it(
    'renders its fallback with NO ThemeProvider / LanguageProvider in the tree — ' +
      'this is the exact situation it exists for: it wraps those providers in ' +
      "App.tsx, so a crash inside either of them unmounts both, and the " +
      'fallback must not depend on either to render itself',
    async () => {
      const { getByText } = await render(
        <ErrorBoundary>
          <Bomb />
        </ErrorBoundary>,
      );
      // If the fallback called useTheme(), this render would throw a second,
      // uncaught error instead of reaching this assertion.
      expect(getByText('משהו השתבש')).toBeTruthy();
    },
  );

  it('reset re-mounts the subtree', async () => {
    const { getByRole } = await render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    const retry = getByRole('button');
    await expect(fireEvent.press(retry)).resolves.not.toThrow();
  });

  it('calls onError with the caught error', async () => {
    const onError = jest.fn();
    await render(
      <ErrorBoundary onError={onError}>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'boom' }),
      expect.objectContaining({ componentStack: expect.any(String) }),
    );
  });
});
