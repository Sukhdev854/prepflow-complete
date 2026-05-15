import { useState, useMemo } from 'react';
import { StudentProfile, ProgressEntry } from '../App';
import { getSubjectByCode } from '../data/subjects';
import { getSubjectColor } from '../utils/subjectColors';
import {
  Download, ExternalLink, CheckCircle, Circle, Clock,
  BookOpen, Filter, ChevronDown, ChevronUp, Search, X,
  FileText, Target, Layers, Star
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Props {
  profile: StudentProfile;
  progress: ProgressEntry[];
  onUpdateProgress: (entries: ProgressEntry[]) => void;
}

interface Paper {
  subjectName: string;
  subjectCode: string;
  component: string;
  year: number;
  session: string;
  completed: boolean;
  entry?: ProgressEntry;
}

type KanbanCol = 'todo' | 'in-progress' | 'to-mark' | 'done';

const SESSION_LABELS: Record<string, string> = { m: 'March', s: 'May/June', w: 'Oct/Nov' };
const SESSION_SHORT:  Record<string, string> = { m: 'Mar',   s: 'M/J',     w: 'O/N' };

const COL_CONFIG: Record<KanbanCol, { label: string; color: string; bg: string; icon: React.ReactNode; desc: string }> = {
  'todo':        { label: 'To Do',       color: 'var(--text-muted)',           bg: 'rgba(255,255,255,0.04)', icon: <Circle size={14} />,      desc: 'Not started yet' },
  'in-progress': { label: 'In Progress', color: 'var(--accent-cyan)',          bg: 'rgba(6,182,212,0.1)',    icon: <Clock size={14} />,       desc: 'Currently working on' },
  'to-mark':     { label: 'To Mark',     color: 'var(--accent-violet-bright)', bg: 'rgba(168,85,247,0.1)',  icon: <BookOpen size={14} />,    desc: 'Done, needs marking' },
  'done':        { label: 'Done',        color: 'var(--accent-emerald)',       bg: 'rgba(16,185,129,0.1)',  icon: <CheckCircle size={14} />, desc: 'Fully completed' },
};

function gradeFromPct(pct: number) {
  if (pct >= 90) return 'A*';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  if (pct >= 40) return 'E';
  return 'U';
}
function gradeColor(g: string) {
  if (g === 'A*' || g === 'A') return 'var(--accent-emerald)';
  if (g === 'B') return 'var(--accent-cyan)';
  if (g === 'C') return 'var(--accent-amber)';
  return 'var(--accent-red)';
}

function getPaperLink(code: string, year: number, session: string, component: string, type: 'qp' | 'ms') {
  const yy = String(year).slice(-2);
  const levelPath = parseInt(code) >= 9000 ? 'cambridge-international-a-level' : 'cambridge-igcse';
  const subjectSlugs: Record<string, string> = {
    '9706':'accounting-9706','9609':'business-9609','9708':'economics-9708',
    '9709':'mathematics-9709','9702':'physics-9702','9701':'chemistry-9701',
    '9700':'biology-9700','9389':'history-9389','9093':'english-language-9093',
    '0455':'economics-0455','0450':'business-studies-0450','0580':'mathematics-0580',
    '0610':'biology-0610','0620':'chemistry-0620','0625':'physics-0625',
    '0500':'english-first-language-0500','0606':'additional-mathematics-0606',
  };
  const slug = subjectSlugs[code] || `subject-${code}`;
  return `https://bestexamhelp.com/exam/${levelPath}/${slug}/${year}/${code}_${session}${yy}_${type}_${component}.pdf`;
}

// Feb/March: only variant-2 components (ending in 2: 12, 22, 32, 42...)
function filterComponentsForSession(components: string[], session: string): string[] {
  if (session === 'm') return components.filter(c => c.endsWith('2'));
  return components;
}

// ─── Paper Card ───────────────────────────────────────────────────────────────
function PaperCard({
  paper, onMove, currentCol,
}: {
  paper: Paper;
  currentCol: KanbanCol;
  onMove: (col: KanbanCol) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const color = getSubjectColor(paper.subjectCode).hex;
  const pct = paper.entry && paper.entry.maxScore > 0
    ? (paper.entry.score / paper.entry.maxScore) * 100 : null;
  const grade = pct !== null ? gradeFromPct(pct) : null;
  const cfg = COL_CONFIG[currentCol];

  const COLS: KanbanCol[] = ['todo', 'in-progress', 'to-mark', 'done'];

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-dim)',
        borderRadius: 12,
        overflow: 'hidden',
        transition: 'all 0.2s',
        boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = `${color}40`;
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 6px 24px rgba(0,0,0,0.4), 0 0 0 1px ${color}20`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-dim)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.3)';
      }}
    >
      {/* Top accent line */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${color}, ${color}40)` }} />

      <div style={{ padding: '12px 14px' }}>
        {/* Subject + component */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {paper.subjectName.split(' ').slice(0, 3).join(' ')}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
              Paper {paper.component} · {paper.year} {SESSION_SHORT[paper.session]}
            </div>
          </div>
          {grade !== null && (
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 800, color: gradeColor(grade), flexShrink: 0 }}>
              {grade}
            </span>
          )}
        </div>

        {/* Score bar if done */}
        {pct !== null && (
          <div style={{ marginBottom: 10 }}>
            <div className="progress-track" style={{ height: 4 }}>
              <div className="progress-fill" style={{
                width: `${pct}%`,
                background: pct >= 70 ? 'var(--accent-emerald)' : pct >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)',
              }} />
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
              {paper.entry?.score}/{paper.entry?.maxScore} ({pct.toFixed(0)}%)
            </div>
          </div>
        )}

        {/* Links row */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <a href={getPaperLink(paper.subjectCode, paper.year, paper.session, paper.component, 'qp')}
            target="_blank" rel="noopener noreferrer"
            style={{
              flex: 1, padding: '6px 0', borderRadius: 7, fontSize: 11, fontWeight: 600,
              background: 'rgba(124,58,237,0.15)', color: 'var(--accent-violet-bright)',
              border: '1px solid rgba(124,58,237,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              textDecoration: 'none', transition: 'all 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.25)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.15)')}
          >
            <Download size={11} /> QP
          </a>
          <a href={getPaperLink(paper.subjectCode, paper.year, paper.session, paper.component, 'ms')}
            target="_blank" rel="noopener noreferrer"
            style={{
              flex: 1, padding: '6px 0', borderRadius: 7, fontSize: 11, fontWeight: 600,
              background: 'rgba(16,185,129,0.12)', color: '#34d399',
              border: '1px solid rgba(16,185,129,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              textDecoration: 'none', transition: 'all 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.22)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.12)')}
          >
            <Download size={11} /> MS
          </a>
        </div>

        {/* Move to column buttons */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {COLS.filter(c => c !== currentCol).map(col => {
            const c = COL_CONFIG[col];
            return (
              <button key={col} onClick={() => onMove(col)}
                style={{
                  padding: '4px 9px', borderRadius: 99, fontSize: 10, fontWeight: 600,
                  background: c.bg, color: c.color,
                  border: `1px solid ${c.color}30`,
                  cursor: 'pointer', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 3,
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                → {c.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────
function KanbanColumn({
  col, papers, onMove, filterSubject,
}: {
  col: KanbanCol;
  papers: Paper[];
  onMove: (paper: Paper, col: KanbanCol) => void;
  filterSubject: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const cfg = COL_CONFIG[col];
  const visible = filterSubject === 'all' ? papers : papers.filter(p => p.subjectCode === filterSubject);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', minWidth: 260, flex: '1 1 260px', maxWidth: 340,
    }}>
      {/* Column header */}
      <div
        style={{
          padding: '14px 16px',
          background: cfg.bg,
          border: `1px solid ${cfg.color}30`,
          borderRadius: collapsed ? 12 : '12px 12px 0 0',
          display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onClick={() => setCollapsed(c => !c)}
      >
        <span style={{ color: cfg.color }}>{cfg.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>{cfg.label}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{cfg.desc}</div>
        </div>
        <div style={{
          minWidth: 24, height: 24, borderRadius: 99, fontSize: 11, fontWeight: 700,
          background: `${cfg.color}20`, color: cfg.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {visible.length}
        </div>
        <span style={{ color: 'var(--text-muted)' }}>
          {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </span>
      </div>

      {/* Cards */}
      {!collapsed && (
        <div style={{
          flex: 1, padding: '10px 10px 10px 10px',
          background: 'rgba(255,255,255,0.015)',
          border: `1px solid ${cfg.color}20`,
          borderTop: 'none',
          borderRadius: '0 0 12px 12px',
          display: 'flex', flexDirection: 'column', gap: 8,
          minHeight: 80,
          maxHeight: 600, overflowY: 'auto',
        }}>
          {visible.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-dim)', fontSize: 12 }}>
              Nothing here yet
            </div>
          ) : (
            visible.map((paper, i) => (
              <div key={`${paper.subjectCode}-${paper.component}-${paper.year}-${paper.session}`}
                style={{ animation: `fade-up 0.3s ${i * 0.04}s both` }}>
                <PaperCard
                  paper={paper}
                  currentCol={col}
                  onMove={(newCol) => onMove(paper, newCol)}
                />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export function PendingPapers({ profile, progress, onUpdateProgress }: Props) {
  const [filterSubject, setFilterSubject] = useState('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');

  // Build the full paper matrix from profile
  const allPapers: Paper[] = useMemo(() => {
    const papers: Paper[] = [];
    profile.subjects.forEach(subject => {
      const subjectData = getSubjectByCode(subject.code);
      if (!subjectData) return;
      const years = Array.from(
        { length: subject.yearsRange.to - subject.yearsRange.from + 1 },
        (_, i) => subject.yearsRange.from + i
      );
      subject.components.forEach(componentCode => {
        years.forEach(year => {
          ['m', 's', 'w'].forEach(session => {
            // Feb/March: skip components not ending in 2
            if (filterComponentsForSession([componentCode], session).length === 0) return;
            const entry = progress.find(p =>
              p.subjectCode === subject.code &&
              p.component === componentCode &&
              p.year === year &&
              p.session === session
            );
            papers.push({
              subjectName: subject.name,
              subjectCode: subject.code,
              component: componentCode,
              year, session,
              completed: !!entry && entry.status === 'done',
              entry,
            });
          });
        });
      });
    });
    return papers;
  }, [profile, progress]);

  // Classify into kanban columns
  const colPapers: Record<KanbanCol, Paper[]> = useMemo(() => {
    const cols: Record<KanbanCol, Paper[]> = { todo: [], 'in-progress': [], 'to-mark': [], done: [] };
    allPapers
      .filter(p => {
        if (search) {
          const q = search.toLowerCase();
          return p.subjectName.toLowerCase().includes(q) || p.component.includes(q) || String(p.year).includes(q);
        }
        return true;
      })
      .forEach(paper => {
        const status = paper.entry?.status;
        if (!paper.entry || !status || status === 'not-started') {
          cols.todo.push(paper);
        } else if (status === 'in-progress') {
          cols['in-progress'].push(paper);
        } else if (status === 'to-mark' || status === 'to-review') {
          cols['to-mark'].push(paper);
        } else {
          cols.done.push(paper);
        }
      });
    return cols;
  }, [allPapers, search]);

  // Stats
  const total = allPapers.length;
  const done = allPapers.filter(p => p.completed).length;
  const completionPct = total > 0 ? (done / total) * 100 : 0;

  // Move a paper to a column (update its status in progress)
  const handleMove = (paper: Paper, newCol: KanbanCol) => {
    const statusMap: Record<KanbanCol, ProgressEntry['status']> = {
      'todo': 'not-started', 'in-progress': 'in-progress',
      'to-mark': 'to-mark', 'done': 'done',
    };
    const newStatus = statusMap[newCol];

    if (!paper.entry) {
      // No entry yet — create a placeholder with 0 score
      const subjData = getSubjectByCode(paper.subjectCode);
      const compData = subjData?.components.find(c => c.code === paper.component);
      if (!compData) return;
      const newEntry: ProgressEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        subjectCode: paper.subjectCode, component: paper.component,
        year: paper.year, session: paper.session as any,
        score: 0, maxScore: compData.maxMarks,
        date: new Date().toISOString(),
        status: newStatus,
      };
      onUpdateProgress([...progress, newEntry]);
    } else {
      const updated = progress.map(e =>
        e.id === paper.entry!.id ? { ...e, status: newStatus } : e
      );
      onUpdateProgress(updated);
    }
  };

  return (
    <div style={{ padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 1300 }}>

      {/* ── Header ── */}
      <div className="animate-fade-up" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Pending Papers
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: 14 }}>
            {total - done} remaining · {done} completed · {total} total
          </p>
        </div>
        {/* View toggle */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-dim)', borderRadius: 10, padding: 4, gap: 4 }}>
          {(['kanban', 'table'] as const).map(mode => (
            <button key={mode} onClick={() => setViewMode(mode)}
              style={{
                padding: '7px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                background: viewMode === mode ? 'linear-gradient(135deg, var(--accent-violet), #6d28d9)' : 'transparent',
                color: viewMode === mode ? '#fff' : 'var(--text-muted)',
                boxShadow: viewMode === mode ? '0 0 16px var(--glow-violet)' : 'none',
              }}>
              {mode === 'kanban' ? '⊞ Kanban' : '☰ Table'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Overall progress bar ── */}
      <div className="glass gradient-border animate-fade-up stagger-1" style={{
        padding: '20px 24px', borderRadius: 'var(--radius-lg)',
        background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(6,182,212,0.05))',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {completionPct.toFixed(0)}% Complete
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              {done} of {total} papers done
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {Object.entries(COL_CONFIG).map(([col, cfg]) => (
              <div key={col} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <span style={{ color: cfg.color }}>{cfg.icon}</span>
                <span style={{ color: 'var(--text-muted)' }}>{cfg.label}:</span>
                <span style={{ fontWeight: 700, color: cfg.color }}>{colPapers[col as KanbanCol].length}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="progress-track" style={{ height: 8 }}>
          <div className="progress-fill" style={{ width: `${completionPct}%` }} />
        </div>
      </div>

      {/* ── Subject filter pills + search ── */}
      <div className="animate-fade-up stagger-2" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 280 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search papers..." className="input-field" style={{ paddingLeft: 34, padding: '9px 12px 9px 34px', fontSize: 13 }} />
        </div>

        {/* All pill */}
        <button onClick={() => setFilterSubject('all')}
          style={{
            padding: '8px 16px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
            background: filterSubject === 'all' ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)',
            color: filterSubject === 'all' ? 'var(--accent-violet-bright)' : 'var(--text-muted)',
            outline: filterSubject === 'all' ? '1px solid rgba(124,58,237,0.4)' : '1px solid var(--border-dim)',
            transition: 'all 0.15s',
          }}>
          All Subjects
        </button>

        {profile.subjects.map(s => {
          const color = getSubjectColor(s.code).hex;
          const active = filterSubject === s.code;
          return (
            <button key={s.code} onClick={() => setFilterSubject(active ? 'all' : s.code)}
              style={{
                padding: '8px 16px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: active ? `${color}22` : 'rgba(255,255,255,0.04)',
                color: active ? color : 'var(--text-muted)',
                outline: active ? `1px solid ${color}50` : '1px solid var(--border-dim)',
                transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
              {s.name.split(' ')[0]}
            </button>
          );
        })}

        {(filterSubject !== 'all' || search) && (
          <button className="btn-ghost" style={{ padding: '8px 12px', fontSize: 12 }}
            onClick={() => { setFilterSubject('all'); setSearch(''); }}>
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* ── Kanban board ── */}
      {viewMode === 'kanban' && (
        <div className="animate-fade-up stagger-3" style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
          {(Object.keys(COL_CONFIG) as KanbanCol[]).map(col => (
            <KanbanColumn
              key={col}
              col={col}
              papers={colPapers[col]}
              onMove={handleMove}
              filterSubject={filterSubject}
            />
          ))}
        </div>
      )}

      {/* ── Table view ── */}
      {viewMode === 'table' && (
        <div className="glass glow-card animate-fade-up stagger-3" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 100px 90px 90px 80px 110px 110px',
            padding: '12px 20px', borderBottom: '1px solid var(--border-dim)',
            fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)',
          }}>
            <span>Subject / Paper</span>
            <span>Year</span>
            <span>Session</span>
            <span>Score</span>
            <span>Grade</span>
            <span style={{ textAlign: 'center' }}>Question Paper</span>
            <span style={{ textAlign: 'center' }}>Mark Scheme</span>
          </div>

          {allPapers
            .filter(p => {
              if (filterSubject !== 'all' && p.subjectCode !== filterSubject) return false;
              if (search) { const q = search.toLowerCase(); return p.subjectName.toLowerCase().includes(q) || p.component.includes(q) || String(p.year).includes(q); }
              return true;
            })
            .sort((a, b) => a.subjectCode.localeCompare(b.subjectCode) || b.year - a.year)
            .map((paper, i) => {
              const color = getSubjectColor(paper.subjectCode).hex;
              const pct = paper.entry && paper.entry.maxScore > 0
                ? (paper.entry.score / paper.entry.maxScore) * 100 : null;
              const grade = pct !== null ? gradeFromPct(pct) : '—';
              const statusKey = paper.entry?.status || 'not-started';
              const isCompleted = statusKey === 'done';

              return (
                <div key={`${paper.subjectCode}-${paper.component}-${paper.year}-${paper.session}`}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr 100px 90px 90px 80px 110px 110px',
                    padding: '13px 20px',
                    borderBottom: '1px solid var(--border-dim)',
                    alignItems: 'center',
                    transition: 'background 0.15s',
                    animation: `fade-up 0.3s ${Math.min(i * 0.025, 0.3)}s both`,
                    opacity: isCompleted ? 0.6 : 1,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 4, height: 32, borderRadius: 99, background: color, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: isCompleted ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                        {paper.subjectName}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Paper {paper.component}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{paper.year}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{SESSION_LABELS[paper.session]}</span>
                  <span style={{ fontSize: 13, color: pct !== null ? 'var(--text-primary)' : 'var(--text-dim)', fontWeight: pct !== null ? 600 : 400 }}>
                    {pct !== null ? `${pct.toFixed(0)}%` : '—'}
                  </span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: grade !== '—' ? gradeColor(grade) : 'var(--text-dim)' }}>
                    {grade}
                  </span>
                  <div style={{ textAlign: 'center' }}>
                    <a href={getPaperLink(paper.subjectCode, paper.year, paper.session, paper.component, 'qp')}
                      target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600, textDecoration: 'none', background: 'rgba(124,58,237,0.15)', color: 'var(--accent-violet-bright)', border: '1px solid rgba(124,58,237,0.25)', transition: 'all 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.28)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.15)')}
                    >
                      <Download size={11} /> QP
                    </a>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <a href={getPaperLink(paper.subjectCode, paper.year, paper.session, paper.component, 'ms')}
                      target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600, textDecoration: 'none', background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)', transition: 'all 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.24)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.12)')}
                    >
                      <Download size={11} /> MS
                    </a>
                  </div>
                </div>
              );
            })}

          {allPapers.filter(p => filterSubject === 'all' || p.subjectCode === filterSubject).length === 0 && (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <FileText size={32} color="var(--text-dim)" style={{ marginBottom: 12 }} />
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No papers found</p>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {total === 0 && (
        <div className="glass animate-fade-up" style={{ padding: '60px 24px', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: 8 }}>
            No subjects configured
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Add subjects in Settings to see your pending papers here
          </p>
        </div>
      )}
    </div>
  );
}
