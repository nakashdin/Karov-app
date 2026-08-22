import { parashaPageUrl, topicUrl, topicSummary } from '../sefaria';

describe('parashaPageUrl', () => {
  it('builds a Hebrew-language Sefaria reading link', () => {
    expect(parashaPageUrl('Vayelech')).toBe('https://www.sefaria.org/Parashat_Vayelech?lang=he');
  });

  it('joins multi-word names with underscores', () => {
    expect(parashaPageUrl('Ki Tavo')).toBe('https://www.sefaria.org/Parashat_Ki_Tavo?lang=he');
  });

  it('does not double the prefix when Hebcal already includes it', () => {
    expect(parashaPageUrl('Parashat Nitzavim')).toBe(
      'https://www.sefaria.org/Parashat_Nitzavim?lang=he',
    );
  });

  it('keeps hyphenated double parshiyot intact', () => {
    expect(parashaPageUrl('Matot-Masei')).toBe(
      'https://www.sefaria.org/Parashat_Matot-Masei?lang=he',
    );
  });
});

describe('topicUrl', () => {
  it('encodes the slug', () => {
    expect(topicUrl('parashat-ki-tavo')).toBe('https://www.sefaria.org/api/topics/parashat-ki-tavo');
  });
});

describe('topicSummary', () => {
  it('prefers the Hebrew description', () => {
    expect(topicSummary({ description: { he: 'תיאור', en: 'description' } })).toBe('תיאור');
  });

  it('falls back to English', () => {
    expect(topicSummary({ description: { en: 'description' } })).toBe('description');
  });

  it('strips HTML tags', () => {
    expect(topicSummary({ description: { he: '<b>מודגש</b> טקסט' } })).toBe('מודגש טקסט');
  });

  it('clips to the requested length', () => {
    expect(topicSummary({ description: { he: 'א'.repeat(500) } }, 10)).toHaveLength(10);
  });

  it('returns null when there is nothing to show', () => {
    expect(topicSummary(null)).toBeNull();
    expect(topicSummary({})).toBeNull();
    expect(topicSummary({ description: { he: '   ' } })).toBeNull();
  });
});
