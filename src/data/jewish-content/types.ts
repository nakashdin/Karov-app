export type ContentType =
  | 'halacha'
  | 'pasuk'
  | 'mussar'
  | 'thought'
  | 'blessing'
  | 'saying'
  | 'study';

export type Topic =
  | 'emunah'
  | 'bitachon'
  | 'middot'
  | 'tefilla'
  | 'teshuva'
  | 'lashon_hara'
  | 'ben_adam_lachavero'
  | 'shabbat'
  | 'moadim'
  | 'parnasa'
  | 'simcha'
  | 'hakarat_hatov'
  | 'kaas'
  | 'savlanut'
  | 'anavah'
  | 'kinah'
  | 'yirat_shamayim'
  | 'ahavat_hashem'
  | 'ahavat_yisrael'
  | 'shalom_bayit'
  | 'chessed'
  | 'tzedaka'
  | 'talmud_torah';

export const TOPIC_LABELS: Record<Topic, string> = {
  emunah: 'אמונה',
  bitachon: 'ביטחון בה\'',
  middot: 'מידות',
  tefilla: 'תפילה',
  teshuva: 'תשובה',
  lashon_hara: 'שמירת הלשון',
  ben_adam_lachavero: 'בין אדם לחברו',
  shabbat: 'שבת',
  moadim: 'מועדים',
  parnasa: 'פרנסה והשתדלות',
  simcha: 'שמחה',
  hakarat_hatov: 'הכרת הטוב',
  kaas: 'כעס',
  savlanut: 'סבלנות',
  anavah: 'ענווה',
  kinah: 'קנאה',
  yirat_shamayim: 'יראת שמים',
  ahavat_hashem: 'אהבת ה\'',
  ahavat_yisrael: 'אהבת ישראל',
  shalom_bayit: 'שלום בית',
  chessed: 'חסד',
  tzedaka: 'צדקה',
  talmud_torah: 'לימוד תורה',
};

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  halacha: 'הלכה',
  pasuk: 'פסוק',
  mussar: 'מוסר',
  thought: 'מחשבה',
  blessing: 'ברכה',
  saying: 'אמרת חז"ל',
  study: 'לימוד קצר',
};

export type LicenseStatus =
  | 'public_domain'
  | 'cc0'
  | 'cc_by'
  | 'cc_by_sa'
  | 'permission_granted'
  | 'karov_original'
  | 'needs_review';

export type ReviewStatus =
  | 'draft'
  | 'source_verified'
  | 'content_reviewed'
  | 'published'
  | 'rejected';

export type HalachicReviewStatus =
  | 'not_required'
  | 'required'
  | 'reviewed';

export interface SourceWork {
  title: string;
  author?: string;
}

export interface SourceVersion {
  edition?: string;
  sourceUrl?: string;
  licenseStatus: LicenseStatus;
  licenseName?: string;
  copyrightBasis?: string;
  licenseEvidence?: string;
  attribution?: string;
  commercialUseAllowed?: boolean;
  modificationAllowed?: boolean;
  checkedAt?: string;
  checkedBy?: string;
}

export interface SourceRef {
  work: SourceWork;
  section?: string;
  chapter?: string;
  paragraph?: string;
  verse?: string;
  reference: string;
  version: SourceVersion;
}

export interface JewishContentItem {
  id: string;
  contentType: ContentType;
  topics: Topic[];
  title: string;
  subtitle?: string;
  source: SourceRef;
  originalText?: string;
  karovSummary: string;
  karovExplanation?: string;
  dailyTakeaway?: string;
  reflectionQuestion?: string;
  tags?: string[];
  difficulty?: 'basic' | 'intermediate' | 'advanced';
  readingTimeMinutes?: number;
  seriesId?: string;
  seriesOrder?: number;
  reviewStatus: ReviewStatus;
  halachicReviewStatus?: HalachicReviewStatus;
  reviewedBy?: string;
  createdAt?: string;
  updatedAt?: string;

  // Marks the 100 items migrated from the original hook.
  // These bypass new publish validation rules because they were already live.
  // New content must never set this field.
  isLegacyMigrated?: true;

  // UI development only — placeholder items that must never reach production.
  isPlaceholder?: true;
}

// ─── History ─────────────────────────────────────────────────────────────────

export interface ContentHistoryRecord {
  contentId: string;
  firstShownAt: string;
  lastShownAt: string;
  showCount: number;
  lastOpenedAt?: string;
  openCount?: number;
  savedAt?: string;
}

export interface ContentHistory {
  entries: Record<string, ContentHistoryRecord>;
}

// ─── Feed ─────────────────────────────────────────────────────────────────────

export interface DailyFeedOptions {
  deviceId: string;
  date: string;
  selectedTopics?: Topic[];
  history: ContentHistory;
  limit?: number;
}

export interface DailyItemOptions {
  deviceId: string;
  date: string;
  history: ContentHistory;
}
