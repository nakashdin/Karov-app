/**
 * `applyHeeboFont` patches `Component.render`, which only exists on a
 * `React.forwardRef` exotic component. React Native 0.86's own Text/TextInput
 * dropped forwardRef for Flow's `component(...)` syntax, so the patch
 * silently no-ops on native — see the long comment on the function itself.
 *
 * `targets` is injectable specifically so these tests can drive both shapes
 * directly, instead of depending on whichever shape `react-native` happens to
 * ship today (and fighting jest-expo's own react-native mocking to get there).
 */

function loadFonts() {
  jest.resetModules();
  return require('../fonts');
}

function makeComponent(hasRender: boolean) {
  const fn: any = (props: unknown) => props;
  if (hasRender) fn.render = () => null;
  return fn;
}

describe('applyHeeboFont', () => {
  const originalError = console.error;
  beforeEach(() => {
    console.error = jest.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  it('patches Component.render when it exists (react-native-web shape)', () => {
    const { applyHeeboFont } = loadFonts();
    const Text = makeComponent(true);
    const before = Text.render;

    applyHeeboFont([Text]);

    expect(Text.render).not.toBe(before);
    expect(typeof Text.render).toBe('function');
    expect(console.error).not.toHaveBeenCalled();
  });

  it(
    'reports loudly instead of silently no-op-ing when .render does not exist ' +
      '(the RN 0.86 native shape) — this is the exact regression: every Heebo ' +
      'weight still loads and blocks first paint, and native ships the system ' +
      'font with nobody the wiser unless this is logged',
    () => {
      const { applyHeeboFont } = loadFonts();
      const Text = makeComponent(false);

      applyHeeboFont([Text]);

      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('applyHeeboFont'));
    },
  );

  it('reports loudly if only SOME targets lack .render — do not let one working target mask another silently broken one', () => {
    const { applyHeeboFont } = loadFonts();
    // Mirrors the real regression exactly: neither Text nor TextInput has
    // .render on native, so "at least one patched" must not be the bar.
    const Text = makeComponent(false);
    const TextInput = makeComponent(false);

    applyHeeboFont([Text, TextInput]);

    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it('is idempotent — a second call does not re-patch or re-report', () => {
    const { applyHeeboFont } = loadFonts();
    const Text = makeComponent(false);

    applyHeeboFont([Text]);
    applyHeeboFont([Text]);

    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it(
    'defaults to the real react-native Text/TextInput when called with no arguments — ' +
      'currently logs, documenting that the patch is broken against the RN version ' +
      "actually installed right now, not just a simulated shape. If this starts " +
      'failing because console.error stops firing, RN has restored a patchable ' +
      'shape (or something else changed) — update this alongside a real device check, ' +
      "don't just delete the assertion.",
    () => {
      const { applyHeeboFont } = loadFonts();
      // Must never throw either way — see the comment on applyHeeboFont
      // explaining why it cannot throw here (this runs before ErrorBoundary
      // mounts, on every platform, including ones where the patch works).
      expect(() => applyHeeboFont()).not.toThrow();
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('applyHeeboFont'));
    },
  );
});
