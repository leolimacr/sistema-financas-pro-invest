export declare const PRODUCT_TIMEZONE = "America/Sao_Paulo";
export declare const STABLE_SP_OFFSET_HOURS = 3;
export declare const STABLE_SP_OFFSET_MS: number;
export declare const MAX_OCCURRENCES = 366;
export declare const DEFAULT_RECURRENCE_HORIZON_DAYS = 180;
export interface YMD {
    y: number;
    m0: number;
    d: number;
}
export type WeekdayNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type RecurrenceFreq = 'daily' | 'weekly' | 'monthly';
export interface DateResolution {
    iso: string;
    confidence: 'high' | 'low';
}
export interface RecurrenceExpansion {
    occurrences: string[];
    truncated: boolean;
    first?: string;
    last?: string;
}
export declare function ymdToIso(ymd: YMD): string;
export declare function isoToYmd(iso: string): YMD;
export declare function isoFromDateMs(dateMs: number): string;
export declare function weekdayOf(ymd: YMD): WeekdayNumber;
export declare function todayYmdInProductTimezone(now?: Date): YMD;
export declare function nextWeekday(anchor: YMD, weekday: WeekdayNumber, opts?: {
    allowToday?: boolean;
}): YMD;
export declare function lastWeekdayOfMonth(year: number, m0: number, weekday: WeekdayNumber): YMD;
export declare function firstWeekdayOfMonth(year: number, m0: number, weekday: WeekdayNumber): YMD;
export declare function weekdayNameToNumber(raw: string): WeekdayNumber | null;
export declare function monthNameToNumber(raw: string): number | null;
export declare function resolveDateExpression(raw: string, today: YMD): DateResolution | null;
export declare function resolveWindowExpression(raw: string, today: YMD): string | null;
export declare function expandRecurrence(opts: {
    freq: RecurrenceFreq;
    startIso: string;
    untilIso?: string;
}, maxOccurrences?: number): RecurrenceExpansion;
export declare function saoPauloDayRangeMillis(ymd: YMD): {
    startMs: number;
    endMs: number;
};
export declare function resolvePeriodRange(raw: string, today: YMD): {
    startMs: number;
    endMs: number;
} | null;
export declare function sha1Hex(input: string): string;
export declare function generateSeriesId(title: string, startIso: string): string;
export declare function generateCommitmentId(seriesId: string | null, dateIso: string, time: string): string;
export declare function generateCommitmentToken(input: string): string;
