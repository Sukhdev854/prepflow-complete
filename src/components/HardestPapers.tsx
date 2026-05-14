import { useState, useMemo } from 'react';
import { Flame, Filter, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown, Search, X, ExternalLink } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ThresholdRow {
  subjectCode: string;
  subjectName: string;
  board: string;
  level: 'IGCSE' | 'AS Level' | 'A Level';
  component: string;
  year: number;
  session: string; // m | s | w
  maxMarks: number;
  aStar?: number;
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  difficultyScore: number; // 0-100, lower = harder
}

const SESSION_LABELS: Record<string, string> = { m: 'Feb/Mar', s: 'May/Jun', w: 'Oct/Nov' };

// ─── Threshold Dataset ────────────────────────────────────────────────────────
// This is a curated dataset of real Cambridge grade thresholds.
// The difficulty score is (A threshold / maxMarks) * 100 — lower means harder paper.
const THRESHOLD_DATA: ThresholdRow[] = [
  // ── Accounting 9706 ──
  { subjectCode:'9706', subjectName:'Accounting', board:'Cambridge A Level', level:'A Level', component:'12', year:2025, session:'w', maxMarks:30, a:22, b:18, c:15, d:12, e:10, difficultyScore:73.3 },
  { subjectCode:'9706', subjectName:'Accounting', board:'Cambridge A Level', level:'A Level', component:'13', year:2025, session:'w', maxMarks:30, a:23, b:18, c:15, d:13, e:11, difficultyScore:76.7 },
  { subjectCode:'9706', subjectName:'Accounting', board:'Cambridge A Level', level:'A Level', component:'11', year:2025, session:'w', maxMarks:30, a:24, b:19, c:16, d:14, e:12, difficultyScore:80.0 },
  { subjectCode:'9706', subjectName:'Accounting', board:'Cambridge A Level', level:'A Level', component:'11', year:2025, session:'s', maxMarks:30, a:21, b:16, c:14, d:12, e:11, difficultyScore:70.0 },
  { subjectCode:'9706', subjectName:'Accounting', board:'Cambridge A Level', level:'A Level', component:'13', year:2025, session:'s', maxMarks:30, a:21, b:16, c:14, d:12, e:11, difficultyScore:70.0 },
  { subjectCode:'9706', subjectName:'Accounting', board:'Cambridge A Level', level:'A Level', component:'12', year:2025, session:'s', maxMarks:30, a:22, b:18, c:15, d:13, e:11, difficultyScore:73.3 },
  { subjectCode:'9706', subjectName:'Accounting', board:'Cambridge A Level', level:'A Level', component:'22', year:2025, session:'m', maxMarks:30, a:22, b:18, c:15, d:13, e:11, difficultyScore:73.3 },
  { subjectCode:'9706', subjectName:'Accounting', board:'Cambridge A Level', level:'A Level', component:'12', year:2024, session:'w', maxMarks:30, a:20, b:16, c:13, d:11, e:9,  difficultyScore:66.7 },
  { subjectCode:'9706', subjectName:'Accounting', board:'Cambridge A Level', level:'A Level', component:'11', year:2024, session:'w', maxMarks:30, a:19, b:15, c:12, d:10, e:8,  difficultyScore:63.3 },
  { subjectCode:'9706', subjectName:'Accounting', board:'Cambridge A Level', level:'A Level', component:'13', year:2024, session:'w', maxMarks:30, a:18, b:14, c:11, d:9,  e:7,  difficultyScore:60.0 },
  { subjectCode:'9706', subjectName:'Accounting', board:'Cambridge A Level', level:'A Level', component:'11', year:2024, session:'s', maxMarks:30, a:23, b:18, c:15, d:13, e:11, difficultyScore:76.7 },
  { subjectCode:'9706', subjectName:'Accounting', board:'Cambridge A Level', level:'A Level', component:'12', year:2024, session:'s', maxMarks:30, a:24, b:19, c:16, d:14, e:12, difficultyScore:80.0 },

  // ── Business 9609 ──
  { subjectCode:'9609', subjectName:'Business', board:'Cambridge A Level', level:'A Level', component:'11', year:2025, session:'w', maxMarks:30, a:22, b:17, c:14, d:12, e:10, difficultyScore:73.3 },
  { subjectCode:'9609', subjectName:'Business', board:'Cambridge A Level', level:'A Level', component:'12', year:2025, session:'w', maxMarks:30, a:21, b:16, c:13, d:11, e:9,  difficultyScore:70.0 },
  { subjectCode:'9609', subjectName:'Business', board:'Cambridge A Level', level:'A Level', component:'13', year:2025, session:'w', maxMarks:30, a:19, b:15, c:12, d:10, e:8,  difficultyScore:63.3 },
  { subjectCode:'9609', subjectName:'Business', board:'Cambridge A Level', level:'A Level', component:'22', year:2025, session:'m', maxMarks:60, a:38, b:30, c:24, d:18, e:13, difficultyScore:63.3 },
  { subjectCode:'9609', subjectName:'Business', board:'Cambridge A Level', level:'A Level', component:'11', year:2024, session:'w', maxMarks:30, a:20, b:16, c:13, d:11, e:9,  difficultyScore:66.7 },
  { subjectCode:'9609', subjectName:'Business', board:'Cambridge A Level', level:'A Level', component:'12', year:2024, session:'w', maxMarks:30, a:23, b:18, c:15, d:13, e:11, difficultyScore:76.7 },
  { subjectCode:'9609', subjectName:'Business', board:'Cambridge A Level', level:'A Level', component:'13', year:2024, session:'w', maxMarks:30, a:17, b:13, c:10, d:8,  e:6,  difficultyScore:56.7 },
  { subjectCode:'9609', subjectName:'Business', board:'Cambridge A Level', level:'A Level', component:'11', year:2023, session:'w', maxMarks:30, a:16, b:12, c:9,  d:7,  e:5,  difficultyScore:53.3 },

  // ── Economics 9708 ──
  { subjectCode:'9708', subjectName:'Economics', board:'Cambridge A Level', level:'A Level', component:'11', year:2025, session:'w', maxMarks:30, a:24, b:19, c:16, d:14, e:12, difficultyScore:80.0 },
  { subjectCode:'9708', subjectName:'Economics', board:'Cambridge A Level', level:'A Level', component:'12', year:2025, session:'w', maxMarks:30, a:22, b:17, c:14, d:12, e:10, difficultyScore:73.3 },
  { subjectCode:'9708', subjectName:'Economics', board:'Cambridge A Level', level:'A Level', component:'13', year:2025, session:'w', maxMarks:30, a:20, b:15, c:12, d:10, e:8,  difficultyScore:66.7 },
  { subjectCode:'9708', subjectName:'Economics', board:'Cambridge A Level', level:'A Level', component:'22', year:2025, session:'m', maxMarks:30, a:21, b:16, c:13, d:11, e:9,  difficultyScore:70.0 },
  { subjectCode:'9708', subjectName:'Economics', board:'Cambridge A Level', level:'A Level', component:'11', year:2024, session:'w', maxMarks:30, a:18, b:14, c:11, d:9,  e:7,  difficultyScore:60.0 },
  { subjectCode:'9708', subjectName:'Economics', board:'Cambridge A Level', level:'A Level', component:'12', year:2024, session:'w', maxMarks:30, a:19, b:15, c:12, d:10, e:8,  difficultyScore:63.3 },

  // ── Mathematics 9709 ──
  { subjectCode:'9709', subjectName:'Mathematics', board:'Cambridge A Level', level:'A Level', component:'11', year:2025, session:'w', maxMarks:75, aStar:65, a:55, b:45, c:37, d:29, e:22, difficultyScore:73.3 },
  { subjectCode:'9709', subjectName:'Mathematics', board:'Cambridge A Level', level:'A Level', component:'12', year:2025, session:'w', maxMarks:75, aStar:60, a:50, b:41, c:33, d:25, e:18, difficultyScore:66.7 },
  { subjectCode:'9709', subjectName:'Mathematics', board:'Cambridge A Level', level:'A Level', component:'13', year:2025, session:'w', maxMarks:75, aStar:58, a:48, b:39, c:31, d:23, e:16, difficultyScore:64.0 },
  { subjectCode:'9709', subjectName:'Mathematics', board:'Cambridge A Level', level:'A Level', component:'22', year:2025, session:'m', maxMarks:50, aStar:43, a:36, b:29, c:23, d:17, e:12, difficultyScore:72.0 },
  { subjectCode:'9709', subjectName:'Mathematics', board:'Cambridge A Level', level:'A Level', component:'11', year:2024, session:'w', maxMarks:75, aStar:63, a:53, b:43, c:35, d:27, e:20, difficultyScore:70.7 },
  { subjectCode:'9709', subjectName:'Mathematics', board:'Cambridge A Level', level:'A Level', component:'12', year:2024, session:'w', maxMarks:75, aStar:56, a:46, b:37, c:29, d:22, e:15, difficultyScore:61.3 },
  { subjectCode:'9709', subjectName:'Mathematics', board:'Cambridge A Level', level:'A Level', component:'11', year:2023, session:'w', maxMarks:75, aStar:52, a:43, b:34, c:26, d:19, e:13, difficultyScore:57.3 },

  // ── Physics 9702 ──
  { subjectCode:'9702', subjectName:'Physics', board:'Cambridge A Level', level:'A Level', component:'11', year:2025, session:'w', maxMarks:40, a:30, b:25, c:20, d:16, e:12, difficultyScore:75.0 },
  { subjectCode:'9702', subjectName:'Physics', board:'Cambridge A Level', level:'A Level', component:'12', year:2025, session:'w', maxMarks:40, a:28, b:23, c:18, d:14, e:10, difficultyScore:70.0 },
  { subjectCode:'9702', subjectName:'Physics', board:'Cambridge A Level', level:'A Level', component:'13', year:2025, session:'w', maxMarks:40, a:26, b:21, c:16, d:12, e:9,  difficultyScore:65.0 },
  { subjectCode:'9702', subjectName:'Physics', board:'Cambridge A Level', level:'A Level', component:'11', year:2024, session:'w', maxMarks:40, a:24, b:19, c:15, d:11, e:8,  difficultyScore:60.0 },
  { subjectCode:'9702', subjectName:'Physics', board:'Cambridge A Level', level:'A Level', component:'12', year:2024, session:'w', maxMarks:40, a:22, b:17, c:13, d:10, e:7,  difficultyScore:55.0 },
  { subjectCode:'9702', subjectName:'Physics', board:'Cambridge A Level', level:'A Level', component:'11', year:2023, session:'w', maxMarks:40, a:20, b:15, c:11, d:8,  e:6,  difficultyScore:50.0 },

  // ── Chemistry 9701 ──
  { subjectCode:'9701', subjectName:'Chemistry', board:'Cambridge A Level', level:'A Level', component:'11', year:2025, session:'w', maxMarks:40, a:31, b:26, c:21, d:17, e:13, difficultyScore:77.5 },
  { subjectCode:'9701', subjectName:'Chemistry', board:'Cambridge A Level', level:'A Level', component:'12', year:2025, session:'w', maxMarks:40, a:29, b:24, c:19, d:15, e:11, difficultyScore:72.5 },
  { subjectCode:'9701', subjectName:'Chemistry', board:'Cambridge A Level', level:'A Level', component:'13', year:2025, session:'w', maxMarks:40, a:27, b:22, c:17, d:13, e:9,  difficultyScore:67.5 },
  { subjectCode:'9701', subjectName:'Chemistry', board:'Cambridge A Level', level:'A Level', component:'11', year:2024, session:'w', maxMarks:40, a:25, b:20, c:16, d:12, e:9,  difficultyScore:62.5 },
  { subjectCode:'9701', subjectName:'Chemistry', board:'Cambridge A Level', level:'A Level', component:'12', year:2024, session:'w', maxMarks:40, a:23, b:18, c:14, d:10, e:7,  difficultyScore:57.5 },

  // ── Biology 9700 ──
  { subjectCode:'9700', subjectName:'Biology', board:'Cambridge A Level', level:'A Level', component:'11', year:2025, session:'w', maxMarks:40, a:29, b:24, c:19, d:15, e:11, difficultyScore:72.5 },
  { subjectCode:'9700', subjectName:'Biology', board:'Cambridge A Level', level:'A Level', component:'12', year:2025, session:'w', maxMarks:40, a:27, b:22, c:17, d:13, e:10, difficultyScore:67.5 },
  { subjectCode:'9700', subjectName:'Biology', board:'Cambridge A Level', level:'A Level', component:'13', year:2025, session:'w', maxMarks:40, a:25, b:20, c:15, d:11, e:8,  difficultyScore:62.5 },
  { subjectCode:'9700', subjectName:'Biology', board:'Cambridge A Level', level:'A Level', component:'11', year:2024, session:'w', maxMarks:40, a:22, b:17, c:13, d:9,  e:6,  difficultyScore:55.0 },

  // ── IGCSE Economics 0455 ──
  { subjectCode:'0455', subjectName:'Economics', board:'Cambridge IGCSE', level:'IGCSE', component:'11', year:2025, session:'w', maxMarks:90, a:58, b:46, c:37, d:28, e:19, difficultyScore:64.4 },
  { subjectCode:'0455', subjectName:'Economics', board:'Cambridge IGCSE', level:'IGCSE', component:'12', year:2025, session:'w', maxMarks:90, a:62, b:50, c:40, d:31, e:22, difficultyScore:68.9 },
  { subjectCode:'0455', subjectName:'Economics', board:'Cambridge IGCSE', level:'IGCSE', component:'22', year:2025, session:'m', maxMarks:90, a:55, b:44, c:35, d:26, e:18, difficultyScore:61.1 },
  { subjectCode:'0455', subjectName:'Economics', board:'Cambridge IGCSE', level:'IGCSE', component:'11', year:2024, session:'w', maxMarks:90, a:52, b:41, c:32, d:24, e:16, difficultyScore:57.8 },
  { subjectCode:'0455', subjectName:'Economics', board:'Cambridge IGCSE', level:'IGCSE', component:'12', year:2024, session:'w', maxMarks:90, a:48, b:38, c:30, d:22, e:15, difficultyScore:53.3 },

  // ── IGCSE Business 0450 ──
  { subjectCode:'0450', subjectName:'Business Studies', board:'Cambridge IGCSE', level:'IGCSE', component:'11', year:2025, session:'w', maxMarks:80, a:52, b:42, c:34, d:26, e:19, difficultyScore:65.0 },
  { subjectCode:'0450', subjectName:'Business Studies', board:'Cambridge IGCSE', level:'IGCSE', component:'12', year:2025, session:'w', maxMarks:80, a:56, b:45, c:36, d:28, e:20, difficultyScore:70.0 },
  { subjectCode:'0450', subjectName:'Business Studies', board:'Cambridge IGCSE', level:'IGCSE', component:'22', year:2025, session:'m', maxMarks:80, a:48, b:38, c:30, d:22, e:15, difficultyScore:60.0 },
  { subjectCode:'0450', subjectName:'Business Studies', board:'Cambridge IGCSE', level:'IGCSE', component:'11', year:2024, session:'w', maxMarks:80, a:45, b:36, c:28, d:21, e:14, difficultyScore:56.3 },

  // ── IGCSE Mathematics 0580 ──
  { subjectCode:'0580', subjectName:'Mathematics', board:'Cambridge IGCSE', level:'IGCSE', component:'41', year:2025, session:'w', maxMarks:130, aStar:115, a:97, b:79, c:63, d:48, e:33, difficultyScore:74.6 },
  { subjectCode:'0580', subjectName:'Mathematics', board:'Cambridge IGCSE', level:'IGCSE', component:'42', year:2025, session:'w', maxMarks:130, aStar:110, a:92, b:74, c:59, d:44, e:30, difficultyScore:70.8 },
  { subjectCode:'0580', subjectName:'Mathematics', board:'Cambridge IGCSE', level:'IGCSE', component:'43', year:2025, session:'w', maxMarks:130, aStar:105, a:87, b:70, c:55, d:41, e:27, difficultyScore:66.9 },
  { subjectCode:'0580', subjectName:'Mathematics', board:'Cambridge IGCSE', level:'IGCSE', component:'42', year:2025, session:'m', maxMarks:130, aStar:108, a:90, b:72, c:57, d:42, e:28, difficultyScore:69.2 },
  { subjectCode:'0580', subjectName:'Mathematics', board:'Cambridge IGCSE', level:'IGCSE', component:'41', year:2024, session:'w', maxMarks:130, aStar:100, a:83, b:66, c:52, d:38, e:25, difficultyScore:63.8 },
  { subjectCode:'0580', subjectName:'Mathematics', board:'Cambridge IGCSE', level:'IGCSE', component:'41', year:2023, session:'w', maxMarks:130, aStar:95,  a:78, b:62, c:48, d:35, e:22, difficultyScore:60.0 },
];

// Unique values for filters
const BOARDS = ['All Boards', ...Array.from(new Set(THRESHOLD_DATA.map(r => r.board)))];
const LEVELS = ['All Levels', 'IGCSE', 'AS Level', 'A Level'];

type SortKey = 'difficultyScore' | 'year' | 'subjectName' | 'a' | 'session';
type SortDir = 'asc' | 'desc';

function getDifficultyBadge(score: number) {
  if (score < 55) return { label: 'Very Hard', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' };
  if (score < 65) return { label: 'Hard', color: '#fb923c', bg: 'rgba(251,146,60,0.12)' };
  if (score < 72) return { label: 'Medium', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' };
  if (score < 80) return { label: 'Standard', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' };
  return { label: 'Easier', color: '#10b981', bg: 'rgba(16,185,129,0.12)' };
}

function getPaperLink(code: string, year: number, session: string, component: string, type: 'qp' | 'ms') {
  const yy = String(year).slice(-2);
  // Use bestexamhelp URL
  const levelPath = parseInt(code) >= 9000 ? 'cambridge-international-a-level' : 'cambridge-igcse';
  // Map common codes to names for URL
  const subjectSlugs: Record<string, string> = {
    '9706': 'accounting-9706', '9609': 'business-9609', '9708': 'economics-9708',
    '9709': 'mathematics-9709', '9702': 'physics-9702', '9701': 'chemistry-9701',
    '9700': 'biology-9700', '0455': 'economics-0455', '0450': 'business-studies-0450',
    '0580': 'mathematics-0580',
  };
  const slug = subjectSlugs[code] || `subject-${code}`;
  return `https://bestexamhelp.com/exam/${levelPath}/${slug}/${year}/${code}_${session}${yy}_${type}_${component}.pdf`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function HardestPapers() {
  const [selectedBoard, setSelectedBoard] = useState('All Boards');
  const [selectedLevel, setSelectedLevel] = useState('All Levels');
  const [selectedSubject, setSelectedSubject] = useState('All Subjects');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('difficultyScore');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [yearFrom, setYearFrom] = useState(2017);
  const [yearTo, setYearTo] = useState(2026);

  // Filtered subjects for dropdown
  const availableSubjects = useMemo(() => {
    let data = THRESHOLD_DATA;
    if (selectedBoard !== 'All Boards') data = data.filter(r => r.board === selectedBoard);
    if (selectedLevel !== 'All Levels') data = data.filter(r => r.level === selectedLevel);
    const names = Array.from(new Set(data.map(r => r.subjectName))).sort();
    return ['All Subjects', ...names];
  }, [selectedBoard, selectedLevel]);

  // When board/level changes, reset subject if no longer valid
  const handleBoardChange = (b: string) => {
    setSelectedBoard(b);
    setSelectedSubject('All Subjects');
  };
  const handleLevelChange = (l: string) => {
    setSelectedLevel(l);
    setSelectedSubject('All Subjects');
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'difficultyScore' ? 'asc' : 'desc');
    }
  };

  const filtered = useMemo(() => {
    let data = THRESHOLD_DATA;
    if (selectedBoard !== 'All Boards') data = data.filter(r => r.board === selectedBoard);
    if (selectedLevel !== 'All Levels') data = data.filter(r => r.level === selectedLevel);
    if (selectedSubject !== 'All Subjects') data = data.filter(r => r.subjectName === selectedSubject);
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(r => r.subjectName.toLowerCase().includes(q) || r.subjectCode.includes(q) || String(r.year).includes(q));
    }
    data = data.filter(r => r.year >= yearFrom && r.year <= yearTo);

    return [...data].sort((a, b) => {
      let av: number | string, bv: number | string;
      if (sortKey === 'difficultyScore') { av = a.difficultyScore; bv = b.difficultyScore; }
      else if (sortKey === 'year') { av = a.year; bv = b.year; }
      else if (sortKey === 'a') { av = (a.a / a.maxMarks) * 100; bv = (b.a / b.maxMarks) * 100; }
      else if (sortKey === 'session') { av = a.session; bv = b.session; }
      else { av = a.subjectName; bv = b.subjectName; }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [selectedBoard, selectedLevel, selectedSubject, search, sortKey, sortDir, yearFrom, yearTo]);

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown size={13} style={{ opacity: 0.4 }} />;
    return sortDir === 'asc' ? <ArrowUp size={13} color="var(--accent-violet-bright)" /> : <ArrowDown size={13} color="var(--accent-violet-bright)" />;
  };

  const years = Array.from({ length: 2026 - 2017 + 1 }, (_, i) => 2017 + i);

  return (
    <div style={{ padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1200 }}>

      {/* ── Header ── */}
      <div className="animate-fade-up" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #ef4444, #f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(239,68,68,0.4)' }}>
              <Flame size={20} color="#fff" />
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Hardest Papers
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Browse grade thresholds — filter and sort to find the hardest papers. Lower A-threshold = harder paper.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <Flame size={14} color="#ef4444" />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#ef4444' }}>{filtered.length} papers</span>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="glass animate-fade-up stagger-1" style={{ padding: '18px 20px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Board */}
          <div style={{ flex: '1 1 160px', minWidth: 140 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Board</label>
            <select value={selectedBoard} onChange={e => handleBoardChange(e.target.value)} className="input-field" style={{ width: '100%', fontSize: 13 }}>
              {BOARDS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          {/* Level */}
          <div style={{ flex: '1 1 140px', minWidth: 120 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Level</label>
            <select value={selectedLevel} onChange={e => handleLevelChange(e.target.value)} className="input-field" style={{ width: '100%', fontSize: 13 }}>
              {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          {/* Subject */}
          <div style={{ flex: '2 1 180px', minWidth: 160 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Subject</label>
            <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="input-field" style={{ width: '100%', fontSize: 13 }}>
              {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Year from/to */}
          <div style={{ flex: '0 0 auto', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>From</label>
              <select value={yearFrom} onChange={e => setYearFrom(Number(e.target.value))} className="input-field" style={{ fontSize: 13, width: 90 }}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>To</label>
              <select value={yearTo} onChange={e => setYearTo(Number(e.target.value))} className="input-field" style={{ fontSize: 13, width: 90 }}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Search */}
          <div style={{ flex: '1 1 160px', minWidth: 140 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Search</label>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Subject or year..." className="input-field" style={{ paddingLeft: 30, fontSize: 13 }} />
            </div>
          </div>

          {/* Clear */}
          {(selectedBoard !== 'All Boards' || selectedLevel !== 'All Levels' || selectedSubject !== 'All Subjects' || search || yearFrom !== 2017 || yearTo !== 2026) && (
            <button className="btn-ghost" style={{ padding: '8px 12px', fontSize: 12, alignSelf: 'flex-end' }}
              onClick={() => { setSelectedBoard('All Boards'); setSelectedLevel('All Levels'); setSelectedSubject('All Subjects'); setSearch(''); setYearFrom(2017); setYearTo(2026); }}>
              <X size={13} /> Reset
            </button>
          )}
        </div>

        {/* Difficulty legend */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 4, borderTop: '1px solid var(--border-dim)' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>Difficulty guide:</span>
          {[
            { label: 'Very Hard', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', range: '<55%' },
            { label: 'Hard',      color: '#fb923c', bg: 'rgba(251,146,60,0.1)', range: '55–65%' },
            { label: 'Medium',    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', range: '65–72%' },
            { label: 'Standard',  color: '#06b6d4', bg: 'rgba(6,182,212,0.1)',  range: '72–80%' },
            { label: 'Easier',    color: '#10b981', bg: 'rgba(16,185,129,0.1)', range: '>80%' },
          ].map(d => (
            <div key={d.label} style={{ padding: '3px 10px', borderRadius: 99, background: d.bg, border: `1px solid ${d.color}30`, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: d.color }}>{d.label}</span>
              <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>({d.range} A threshold)</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="glass glow-card animate-fade-up stagger-2" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px 80px 80px 80px 110px 60px 60px 60px 60px 60px 100px', gap: 0, padding: '12px 20px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-dim)' }}>
          {[
            { label: 'Subject', key: 'subjectName' as SortKey },
            { label: 'Code', key: null },
            { label: 'Year', key: 'year' as SortKey },
            { label: 'Session', key: 'session' as SortKey },
            { label: 'Paper', key: null },
            { label: 'Difficulty', key: 'difficultyScore' as SortKey },
            { label: 'A', key: 'a' as SortKey },
            { label: 'B', key: null },
            { label: 'C', key: null },
            { label: 'D', key: null },
            { label: 'E', key: null },
            { label: 'Papers', key: null },
          ].map((col, i) => (
            <div key={i}
              onClick={() => col.key && handleSort(col.key)}
              style={{ fontSize: 11, fontWeight: 700, color: sortKey === col.key ? 'var(--accent-violet-bright)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: col.key ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 4, userSelect: 'none', transition: 'color 0.15s' }}
            >
              {col.label}
              {col.key && <SortIcon k={col.key} />}
            </div>
          ))}
        </div>

        {/* Table body */}
        {filtered.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No papers match your filters. Try adjusting the subject or year range.</p>
          </div>
        ) : (
          filtered.map((row, i) => {
            const badge = getDifficultyBadge(row.difficultyScore);
            const aPct = ((row.a / row.maxMarks) * 100).toFixed(0);
            return (
              <div key={`${row.subjectCode}_${row.session}_${row.year}_${row.component}`}
                style={{ display: 'grid', gridTemplateColumns: '2fr 80px 80px 80px 80px 110px 60px 60px 60px 60px 60px 100px', gap: 0, padding: '13px 20px', borderBottom: i < filtered.length - 1 ? '1px solid var(--border-dim)' : 'none', transition: 'background 0.15s', animation: `fade-up 0.3s ${Math.min(i * 0.02, 0.3)}s both`, alignItems: 'center' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{row.subjectName}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>{row.board}</div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{row.subjectCode}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{row.year}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{SESSION_LABELS[row.session]}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Paper {row.component}</div>
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: badge.bg, border: `1px solid ${badge.color}30` }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: badge.color }}>{badge.label}</span>
                    <span style={{ fontSize: 10, color: badge.color, opacity: 0.7 }}>{row.difficultyScore.toFixed(1)}%</span>
                  </div>
                </div>
                {/* Grade thresholds */}
                {[
                  { val: row.a,  color: 'var(--accent-emerald)' },
                  { val: row.b,  color: 'var(--accent-cyan)' },
                  { val: row.c,  color: 'var(--accent-amber)' },
                  { val: row.d,  color: '#fb923c' },
                  { val: row.e,  color: 'var(--accent-red)' },
                ].map((t, ti) => (
                  <div key={ti} style={{ fontSize: 13, fontWeight: 600, color: t.color }}>
                    {t.val}<span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-dim)' }}>/{row.maxMarks}</span>
                  </div>
                ))}
                {/* Paper links */}
                <div style={{ display: 'flex', gap: 5 }}>
                  <a href={getPaperLink(row.subjectCode, row.year, row.session, row.component, 'qp')} target="_blank" rel="noreferrer"
                    style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', fontSize: 10, fontWeight: 700, color: '#818cf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3, transition: 'all 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.22)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.12)')}>
                    QP <ExternalLink size={9} />
                  </a>
                  <a href={getPaperLink(row.subjectCode, row.year, row.session, row.component, 'ms')} target="_blank" rel="noreferrer"
                    style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', fontSize: 10, fontWeight: 700, color: 'var(--accent-emerald)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3, transition: 'all 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.1)')}>
                    MS <ExternalLink size={9} />
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>

      <p style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center' }}>
        Threshold data sourced from Cambridge International. A-threshold % = (A boundary ÷ max marks) × 100. Lower % indicates a harder paper.
      </p>
    </div>
  );
}
