import { useState, useEffect } from 'react';
import { StudentProfile, SelectedSubject } from '../App';
import { getSubjectsByLevel, getSubjectByCode, SubjectData } from '../data/subjects';
import {
  User, BookOpen, Target, Save, Plus, X, Check,
  ChevronRight, ChevronLeft, GraduationCap, Search,
  Trash2, Palette, Type, Layout, Monitor
} from 'lucide-react';

interface Props {
  profile: StudentProfile | null;
  onUpdateProfile: (profile: StudentProfile) => void;
  username: string;
  onPrefsChange?: () => void;
}

// No AS Level
const LEVELS = ['IGCSE', 'A Level'] as const;
type Level = typeof LEVELS[number];
const GRADES = ['A*', 'A', 'B', 'C', 'D', 'E'];
const YEARS = Array.from({ length: 2026 - 2017 + 1 }, (_, i) => 2017 + i);

// ─── Customization options ────────────────────────────────────────────────────
const THEMES = [
  { id:'violet',  label:'Violet',  color:'#7c3aed' },
  { id:'cyan',    label:'Cyan',    color:'#0891b2' },
  { id:'emerald', label:'Emerald', color:'#059669' },
  { id:'rose',    label:'Rose',    color:'#e11d48' },
  { id:'amber',   label:'Amber',   color:'#d97706' },
];
const FONTS = [
  { id:'default', label:'Default (Syne)' },
  { id:'inter',   label:'Inter' },
  { id:'mono',    label:'Monospace' },
  { id:'rounded', label:'Rounded (Nunito)' },
];
const DEFAULT_VIEWS = [
  { id:'list', label:'List' },
  { id:'grid', label:'Grid' },
];

interface Prefs { theme: string; font: string; defaultView: string; compact: boolean; }

function loadPrefs(): Prefs {
  try { return { theme:'violet', font:'default', defaultView:'list', compact:false, ...JSON.parse(localStorage.getItem('prepflow_prefs') || '{}') }; }
  catch { return { theme:'violet', font:'default', defaultView:'list', compact:false }; }
}

// Apply theme by setting CSS variables directly on :root
function applyPrefs(prefs: Prefs) {
  const THEME_VARS: Record<string, [string, string, string]> = {
    violet:  ['#7c3aed', '#a855f7', 'rgba(124,58,237,0.35)'],
    cyan:    ['#0891b2', '#22d3ee', 'rgba(6,182,212,0.35)'],
    emerald: ['#059669', '#34d399', 'rgba(16,185,129,0.35)'],
    rose:    ['#e11d48', '#fb7185', 'rgba(244,63,94,0.35)'],
    amber:   ['#d97706', '#fbbf24', 'rgba(245,158,11,0.35)'],
  };
  const root = document.documentElement;
  const [v, vb, glow] = THEME_VARS[prefs.theme] || THEME_VARS.violet;
  root.style.setProperty('--accent-violet',        v);
  root.style.setProperty('--accent-violet-bright', vb);
  root.style.setProperty('--glow-violet',          glow);

  const body = document.body;
  body.classList.remove('font-inter', 'font-mono', 'font-rounded');
  if (prefs.font && prefs.font !== 'default') body.classList.add(`font-${prefs.font}`);

  if (prefs.compact) body.classList.add('compact-mode');
  else body.classList.remove('compact-mode');
}

function savePrefs(prefs: Prefs) {
  localStorage.setItem('prepflow_prefs', JSON.stringify(prefs));
  applyPrefs(prefs);
}

// ─── Subject Picker (inline, not popup) ──────────────────────────────────────
function SubjectPickerPanel({
  level, existing, onAdd, onClose,
}: {
  level: Level; existing: SelectedSubject[];
  onAdd: (s: SelectedSubject) => void; onClose: () => void;
}) {
  const [search, setSearch]       = useState('');
  const [selected, setSelected]   = useState<SubjectData | null>(null);
  const [components, setComponents] = useState<string[]>([]);
  const [yearFrom, setYearFrom]   = useState(2021);
  const [yearTo,   setYearTo]     = useState(2026);

  const subjects = getSubjectsByLevel(level).filter(s =>
    !existing.find(e => e.code === s.code) &&
    (!search || s.name.toLowerCase().includes(search.toLowerCase()) || s.code.includes(search))
  );

  const toggleComp = (code: string) =>
    setComponents(cs => cs.includes(code) ? cs.filter(c => c !== code) : [...cs, code]);

  const handleAdd = () => {
    if (!selected || components.length === 0) return;
    onAdd({ name: selected.name, code: selected.code, components, yearsRange: { from: yearFrom, to: yearTo } });
    onClose();
  };

  return (
    <div style={{ padding:'18px 20px', borderRadius:'var(--radius-lg)', background:'rgba(124,58,237,0.06)', border:'1px solid rgba(124,58,237,0.2)', display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <h3 style={{ fontFamily:'var(--font-display)', fontSize:'1rem', fontWeight:700, color:'var(--text-primary)' }}>
          {selected ? `Configure: ${selected.name}` : 'Add a Subject'}
        </h3>
        <button onClick={onClose} style={{ background:'none', border:'1px solid var(--border-dim)', borderRadius:7, padding:6, cursor:'pointer', color:'var(--text-muted)' }}><X size={14}/></button>
      </div>

      {!selected ? (
        <>
          <div style={{ position:'relative' }}>
            <Search size={13} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${level} subjects…`} className="input-field" style={{ paddingLeft:32, fontSize:13 }} autoFocus />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px,1fr))', gap:7, maxHeight:260, overflowY:'auto' }}>
            {subjects.map(s => (
              <button key={s.code} onClick={() => { setSelected(s); setComponents([]); }}
                style={{ padding:'11px 13px', borderRadius:9, cursor:'pointer', border:'1px solid var(--border-dim)', background:'rgba(255,255,255,0.03)', textAlign:'left', transition:'all 0.15s', display:'flex', justifyContent:'space-between', alignItems:'center' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor='var(--accent-violet)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor='var(--border-dim)')}>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)' }}>{s.name}</div>
                  <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:1 }}>{s.code}</div>
                </div>
                <ChevronRight size={13} color="var(--text-muted)"/>
              </button>
            ))}
            {subjects.length === 0 && <p style={{ color:'var(--text-muted)', fontSize:13, gridColumn:'1/-1' }}>No subjects found</p>}
          </div>
        </>
      ) : (
        <>
          <button onClick={() => setSelected(null)} style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:12 }}>
            <ChevronLeft size={13}/> Back to list
          </button>

          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)', marginBottom:8 }}>Select Papers</label>
            <div style={{ display:'flex', flexDirection:'column', gap:5, maxHeight:200, overflowY:'auto' }}>
              {selected.components.map(c => {
                const on = components.includes(c.code);
                return (
                  <button key={c.code} onClick={() => toggleComp(c.code)}
                    style={{ padding:'9px 12px', borderRadius:8, cursor:'pointer', border:'none', textAlign:'left', background: on ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)', outline: on ? '2px solid rgba(124,58,237,0.4)' : '1px solid var(--border-dim)', transition:'all 0.15s', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ fontSize:12, color:'var(--text-primary)', fontWeight: on ? 600 : 400 }}>
                      Paper {c.code} — {c.name} <span style={{ color:'var(--text-muted)', fontWeight:400 }}>/{c.maxMarks}</span>
                    </span>
                    {on && <Check size={13} color="var(--accent-violet-bright)"/>}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)', marginBottom:6 }}>Papers From</label>
              <select value={yearFrom} onChange={e => setYearFrom(Number(e.target.value))} className="input-field">
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)', marginBottom:6 }}>Papers To</label>
              <select value={yearTo} onChange={e => setYearTo(Number(e.target.value))} className="input-field">
                {YEARS.filter(y => y >= yearFrom).map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <button className="btn-primary" disabled={components.length === 0} onClick={handleAdd}
            style={{ opacity: components.length === 0 ? 0.5 : 1 }}>
            <Check size={14}/> <span>Add {selected.name}</span>
          </button>
        </>
      )}
    </div>
  );
}

// ─── MAIN SETTINGS PAGE ───────────────────────────────────────────────────────
export function SettingsPage({ profile, onUpdateProfile, username, onPrefsChange }: Props) {
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [saved, setSaved]                         = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Profile form
  const [name,        setName]     = useState(profile?.name || '');
  const [level,       setLevel]    = useState<Level>((profile?.level as Level) || 'A Level');
  const [subjects,    setSubjects] = useState<SelectedSubject[]>(profile?.subjects || []);
  const [targetGrade, setTarget]   = useState(profile?.targetGrade || 'A*');
  const [yearFrom,    setYearFrom] = useState(profile?.yearsRange?.from || 2021);
  const [yearTo,      setYearTo]   = useState(profile?.yearsRange?.to || 2026);

  // Customization
  const stored = loadPrefs();
  const [theme,       setTheme]       = useState(stored.theme       || 'violet');
  const [font,        setFont]        = useState(stored.font         || 'default');
  const [defaultView, setDefaultView] = useState(stored.defaultView || 'list');
  const [compact,     setCompact]     = useState(stored.compact      || false);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setLevel((profile.level as Level) || 'A Level');
      setSubjects(profile.subjects);
      setTarget(profile.targetGrade);
      setYearFrom(profile.yearsRange?.from || 2021);
      setYearTo(profile.yearsRange?.to || 2026);
    }
  }, [profile]);

  const handleSave = () => {
    onUpdateProfile({ name: name || username, level, subjects, targetGrade, yearsRange: { from: yearFrom, to: yearTo } });
    const prefs: Prefs = { theme, font, defaultView, compact };
    savePrefs(prefs);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  const handleThemeChange = (t: string) => {
    setTheme(t);
    applyPrefs({ theme: t, font, defaultView, compact });
    onPrefsChange?.();
  };
  const handleFontChange = (f: string) => {
    setFont(f);
    applyPrefs({ theme, font: f, defaultView, compact });
    onPrefsChange?.();
  };
  const handleCompactChange = (c: boolean) => {
    setCompact(c);
    applyPrefs({ theme, font, defaultView, compact: c });
    onPrefsChange?.();
  };

  const removeSubject = (code: string) => {
    setSubjects(ss => ss.filter(s => s.code !== code));
    setShowDeleteConfirm(null);
  };

  const SECTION = (icon: React.ReactNode, title: string, subtitle?: string) => (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
      <div style={{ width:34, height:34, borderRadius:9, background:'rgba(124,58,237,0.12)', border:'1px solid rgba(124,58,237,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>{icon}</div>
      <div>
        <div style={{ fontFamily:'var(--font-display)', fontSize:'1rem', fontWeight:700, color:'var(--text-primary)' }}>{title}</div>
        {subtitle && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>{subtitle}</div>}
      </div>
    </div>
  );

  return (
    <div style={{ padding:'32px 28px', display:'flex', flexDirection:'column', gap:20, maxWidth:780 }}>

      {/* Header */}
      <div className="animate-fade-up" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(1.5rem,3vw,2rem)', fontWeight:800, color:'var(--text-primary)', letterSpacing:'-0.02em' }}>Settings</h1>
          <p style={{ color:'var(--text-muted)', marginTop:4, fontSize:14 }}>@{username}</p>
        </div>
        <button className="btn-primary" onClick={handleSave} style={{ padding:'11px 22px' }}>
          {saved ? <><Check size={15}/> <span>Saved!</span></> : <><Save size={15}/> <span>Save Changes</span></>}
        </button>
      </div>

      {/* ── Profile ── */}
      <div className="glass glow-card animate-fade-up stagger-1" style={{ padding:24, borderRadius:'var(--radius-lg)' }}>
        {SECTION(<User size={16} color="var(--accent-violet-bright)"/>, 'Profile')}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)', marginBottom:7 }}>Display Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder={username} className="input-field" />
          </div>
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)', marginBottom:7 }}>Level</label>
            <div style={{ display:'flex', gap:8 }}>
              {LEVELS.map(l => (
                <button key={l} onClick={() => { setLevel(l); setSubjects([]); }}
                  style={{ flex:1, padding:'10px 0', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', border:'none', background: level===l ? 'linear-gradient(135deg, var(--accent-violet), #6d28d9)' : 'rgba(255,255,255,0.04)', color: level===l ? '#fff' : 'var(--text-muted)', outline: level===l ? 'none' : '1px solid var(--border-dim)', transition:'all 0.2s', boxShadow: level===l ? '0 0 16px var(--glow-violet)' : 'none' }}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginTop:14 }}>
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)', marginBottom:7 }}>Default Year From</label>
            <select value={yearFrom} onChange={e => setYearFrom(Number(e.target.value))} className="input-field">
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)', marginBottom:7 }}>Default Year To</label>
            <select value={yearTo} onChange={e => setYearTo(Number(e.target.value))} className="input-field">
              {YEARS.filter(y => y >= yearFrom).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Target Grade ── */}
      <div className="glass glow-card animate-fade-up stagger-2" style={{ padding:24, borderRadius:'var(--radius-lg)' }}>
        {SECTION(<Target size={16} color="var(--accent-cyan)"/>, 'Target Grade')}
        <div style={{ display:'flex', gap:8 }}>
          {GRADES.map(g => (
            <button key={g} onClick={() => setTarget(g)}
              style={{ flex:1, padding:'13px 0', borderRadius:10, cursor:'pointer', border:'none', fontFamily:'var(--font-display)', fontSize:15, fontWeight:800, background: targetGrade===g ? 'linear-gradient(135deg, var(--accent-violet), #6d28d9)' : 'rgba(255,255,255,0.04)', color: targetGrade===g ? '#fff' : 'var(--text-muted)', outline: targetGrade===g ? 'none' : '1px solid var(--border-dim)', boxShadow: targetGrade===g ? '0 0 18px var(--glow-violet)' : 'none', transition:'all 0.2s' }}>
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* ── Subjects ── */}
      <div className="glass glow-card animate-fade-up stagger-3" style={{ padding:24, borderRadius:'var(--radius-lg)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:9, background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <BookOpen size={16} color="var(--accent-amber)"/>
            </div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'1rem', fontWeight:700, color:'var(--text-primary)' }}>
              Subjects <span style={{ fontSize:12, color:'var(--text-muted)', fontWeight:400 }}>({subjects.length})</span>
            </div>
          </div>
          {!showSubjectPicker && (
            <button className="btn-ghost" onClick={() => setShowSubjectPicker(true)} style={{ padding:'8px 14px', fontSize:12 }}>
              <Plus size={13}/> Add Subject
            </button>
          )}
        </div>

        {/* Inline subject picker */}
        {showSubjectPicker && (
          <div style={{ marginBottom:16 }}>
            <SubjectPickerPanel
              level={level} existing={subjects}
              onAdd={s => setSubjects(ss => [...ss, s])}
              onClose={() => setShowSubjectPicker(false)}
            />
          </div>
        )}

        {subjects.length === 0 ? (
          <div style={{ padding:'28px 0', textAlign:'center' }}>
            <GraduationCap size={34} color="var(--text-dim)" style={{ marginBottom:10 }} />
            <p style={{ color:'var(--text-muted)', fontSize:13 }}>No subjects yet — add some above</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {subjects.map(s => (
              <div key={s.code} style={{ padding:'13px 16px', borderRadius:10, background:'rgba(255,255,255,0.03)', border:'1px solid var(--border-dim)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{s.name}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
                    {s.code} · Papers: {s.components.join(', ')} · {s.yearsRange.from}–{s.yearsRange.to}
                  </div>
                </div>
                {showDeleteConfirm === s.code ? (
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    <span style={{ fontSize:12, color:'var(--accent-amber)' }}>Remove?</span>
                    <button onClick={() => removeSubject(s.code)} style={{ padding:'5px 10px', borderRadius:7, background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)', color:'var(--accent-red)', fontSize:12, cursor:'pointer' }}>Yes</button>
                    <button onClick={() => setShowDeleteConfirm(null)} style={{ padding:'5px 10px', borderRadius:7, background:'rgba(255,255,255,0.06)', border:'1px solid var(--border-dim)', color:'var(--text-muted)', fontSize:12, cursor:'pointer' }}>No</button>
                  </div>
                ) : (
                  <button onClick={() => setShowDeleteConfirm(s.code)} style={{ background:'none', border:'1px solid transparent', borderRadius:8, padding:7, cursor:'pointer', color:'var(--text-dim)', transition:'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.color='var(--accent-red)'; e.currentTarget.style.borderColor='rgba(239,68,68,0.2)'; e.currentTarget.style.background='rgba(239,68,68,0.08)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color='var(--text-dim)'; e.currentTarget.style.borderColor='transparent'; e.currentTarget.style.background='none'; }}>
                    <Trash2 size={14}/>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Customization ── */}
      <div className="glass glow-card animate-fade-up stagger-4" style={{ padding:24, borderRadius:'var(--radius-lg)' }}>
        {SECTION(<Palette size={16} color="#ec4899"/>, 'Customization', 'Personalise your PrepFlow experience')}

        {/* Theme */}
        <div style={{ marginBottom:20 }}>
          <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)', marginBottom:10 }}>Accent Colour</label>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {THEMES.map(t => (
              <button key={t.id} onClick={() => handleThemeChange(t.id)}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 14px', borderRadius:10, cursor:'pointer', border:'none', background: theme===t.id ? `${t.color}20` : 'rgba(255,255,255,0.04)', outline: theme===t.id ? `2px solid ${t.color}` : '1px solid var(--border-dim)', transition:'all 0.2s' }}>
                <div style={{ width:14, height:14, borderRadius:'50%', background:t.color, boxShadow: theme===t.id ? `0 0 8px ${t.color}` : 'none' }} />
                <span style={{ fontSize:13, fontWeight:600, color: theme===t.id ? 'var(--text-primary)' : 'var(--text-muted)' }}>{t.label}</span>
                {theme===t.id && <Check size={12} color={t.color}/>}
              </button>
            ))}
          </div>
        </div>

        {/* Font */}
        <div style={{ marginBottom:20 }}>
          <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)', marginBottom:10 }}>Font Style</label>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {FONTS.map(f => (
              <button key={f.id} onClick={() => handleFontChange(f.id)}
                style={{ padding:'9px 14px', borderRadius:10, cursor:'pointer', border:'none', fontSize:13, fontWeight:600, background: font===f.id ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.04)', color: font===f.id ? 'var(--accent-violet-bright)' : 'var(--text-muted)', outline: font===f.id ? '2px solid var(--accent-violet)' : '1px solid var(--border-dim)', transition:'all 0.2s' }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Default view */}
        <div style={{ marginBottom:20 }}>
          <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)', marginBottom:10 }}>Default Record View</label>
          <div style={{ display:'flex', gap:8 }}>
            {DEFAULT_VIEWS.map(v => (
              <button key={v.id} onClick={() => setDefaultView(v.id)}
                style={{ padding:'9px 18px', borderRadius:10, cursor:'pointer', border:'none', fontSize:13, fontWeight:600, background: defaultView===v.id ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.04)', color: defaultView===v.id ? 'var(--accent-violet-bright)' : 'var(--text-muted)', outline: defaultView===v.id ? '2px solid var(--accent-violet)' : '1px solid var(--border-dim)', transition:'all 0.2s' }}>
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Compact mode */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderRadius:10, background:'rgba(255,255,255,0.03)', border:'1px solid var(--border-dim)' }}>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>Compact Mode</div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>Smaller text and tighter spacing</div>
          </div>
          <button onClick={() => handleCompactChange(!compact)}
            style={{ width:48, height:26, borderRadius:99, cursor:'pointer', border:'none', background: compact ? 'var(--accent-violet)' : 'rgba(255,255,255,0.1)', transition:'background 0.2s', position:'relative', boxShadow: compact ? '0 0 12px var(--glow-violet)' : 'none' }}>
            <div style={{ width:18, height:18, borderRadius:'50%', background:'#fff', position:'absolute', top:4, left: compact ? 26 : 4, transition:'left 0.2s', boxShadow:'0 1px 4px rgba(0,0,0,0.3)' }} />
          </button>
        </div>
      </div>

      {/* Save button (bottom) */}
      <div className="animate-fade-up stagger-5">
        <button className="btn-primary" onClick={handleSave} style={{ width:'100%', padding:'13px 0', fontSize:15 }}>
          {saved ? <><Check size={16}/> <span>Changes Saved!</span></> : <><Save size={16}/> <span>Save All Changes</span></>}
        </button>
      </div>
    </div>
  );
}
