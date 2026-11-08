// Real Cambridge grade thresholds.
// The numbers live in thresholds.generated.json, which is created automatically by
// scripts/update_thresholds.py (run by the "Update Cambridge thresholds" GitHub Action).
// Do not edit the JSON by hand.
import raw from './thresholds.generated.json';
import { subjectsDatabase } from './subjects';

type RawData = {
  generatedAt: string | null;
  // components[subjectCode]["2025-w"][componentCode] = [max, A, B, C, D, E] or [max, A..G]
  components: Record<string, Record<string, Record<string, number[]>>>;
};
const DATA = raw as unknown as RawData;

export interface ComponentThreshold {
  maxMarks: number;
  a: number; b: number; c: number; d: number; e: number;
  f?: number; g?: number;
  typical?: boolean; // true = average of other years (no exact table for this series)
}

const fromArray = (arr: number[]): ComponentThreshold | null => {
  if (!arr || (arr.length !== 6 && arr.length !== 8)) return null;
  const [maxMarks, a, b, c, d, e, f, g] = arr;
  return { maxMarks, a, b, c, d, e, ...(arr.length === 8 ? { f, g } : {}) };
};

export const thresholdsGeneratedAt = (): string | null => DATA.generatedAt;
export const hasThresholdData = (): boolean => Object.keys(DATA.components || {}).length > 0;

// Exact table for this subject / year / session / paper (or null)
export function lookupThreshold(code: string, session: string, year: number, comp: string): ComponentThreshold | null {
  const arr = DATA.components?.[code]?.[`${year}-${session}`]?.[comp];
  return arr ? fromArray(arr) : null;
}

// If there is no exact table (e.g. a session Cambridge has not published yet), use the
// average of the same paper in other series. Returns null if we know nothing about it.
export function lookupTypicalThreshold(code: string, comp: string): ComponentThreshold | null {
  const bySeries = DATA.components?.[code];
  if (!bySeries) return null;
  const rows: number[][] = [];
  Object.values(bySeries).forEach(series => { const r = series[comp]; if (r && (r.length === 6 || r.length === 8)) rows.push(r); });
  if (rows.length === 0) return null;
  const len = rows[0].length;
  const same = rows.filter(r => r.length === len);
  const avg = same[0].map((_, i) => Math.round(same.reduce((s, r) => s + r[i], 0) / same.length));
  avg[0] = same[0][0]; // keep the real maximum mark
  const t = fromArray(avg);
  return t ? { ...t, typical: true } : null;
}

export function getBestThreshold(code: string, session: string, year: number, comp: string): ComponentThreshold | null {
  return lookupThreshold(code, session, year, comp) ?? lookupTypicalThreshold(code, comp);
}

// Cambridge's "percentage uniform mark" idea: E = 40, D = 50, C = 60, B = 70, A = 80,
// full marks = 100 (and G = 20, F = 30 for IGCSE). A* is 90 on this scale.
// This turns a raw mark into a number that means the same thing in every paper and every year.
export function uniformPercent(t: ComponentThreshold, rawScore: number, rawMax: number): number {
  const score = rawMax > 0 ? (rawScore / rawMax) * t.maxMarks : 0;
  const knots: [number, number][] = [[0, 0]];
  if (t.g !== undefined) knots.push([t.g, 20]);
  if (t.f !== undefined) knots.push([t.f, 30]);
  knots.push([t.e, 40], [t.d, 50], [t.c, 60], [t.b, 70], [t.a, 80], [t.maxMarks, 100]);
  // drop knots that are out of order (very small papers can have tied thresholds)
  const pts = knots.filter((k, i) => i === 0 || k[0] > knots[i - 1][0]);
  if (score <= 0) return 0;
  if (score >= t.maxMarks) return 100;
  for (let i = 1; i < pts.length; i++) {
    if (score <= pts[i][0]) {
      const [x0, y0] = pts[i - 1]; const [x1, y1] = pts[i];
      return y0 + ((score - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return 100;
}

export type PctSource = 'exact' | 'typical' | 'raw';
export function uniformPctForEntry(p: { subjectCode: string; session: string; year: number; component: string; score: number; maxScore: number }): { pct: number; source: PctSource } {
  const exact = lookupThreshold(p.subjectCode, p.session, p.year, p.component);
  if (exact) return { pct: uniformPercent(exact, p.score, p.maxScore), source: 'exact' };
  const typical = lookupTypicalThreshold(p.subjectCode, p.component);
  if (typical) return { pct: uniformPercent(typical, p.score, p.maxScore), source: 'typical' };
  return { pct: p.maxScore > 0 ? (p.score / p.maxScore) * 100 : 0, source: 'raw' };
}

// ── Rows for the Hardest Papers page (built from the data, nothing typed by hand) ──
export interface ThresholdRow {
  subjectCode: string; subjectName: string; board: string;
  level: 'IGCSE' | 'AS Level' | 'A Level';
  component: string; year: number; session: string; maxMarks: number;
  a: number; b: number; c: number; d: number; e: number;
  difficultyScore: number; // (A threshold / max) x 100 — lower = harder
}
export function buildThresholdRows(): ThresholdRow[] {
  const rows: ThresholdRow[] = [];
  Object.entries(DATA.components || {}).forEach(([code, bySeries]) => {
    const subj = subjectsDatabase.find(s => s.code === code);
    if (!subj) return;
    Object.entries(bySeries).forEach(([series, comps]) => {
      const [yearStr, session] = series.split('-');
      Object.entries(comps).forEach(([comp, arr]) => {
        const t = fromArray(arr);
        if (!t || t.maxMarks <= 0) return;
        rows.push({
          subjectCode: code, subjectName: subj.name,
          board: subj.level === 'IGCSE' ? 'Cambridge IGCSE' : 'Cambridge A Level',
          level: subj.level, component: comp, year: Number(yearStr), session,
          maxMarks: t.maxMarks, a: t.a, b: t.b, c: t.c, d: t.d, e: t.e,
          difficultyScore: Math.round((t.a / t.maxMarks) * 1000) / 10,
        });
      });
    });
  });
  return rows;
}
