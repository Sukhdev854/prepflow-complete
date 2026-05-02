import { useState, useEffect } from 'react';
import { StudentProfile, SelectedSubject } from '../App';
import { getSubjectsByLevel, getSubjectByCode, SubjectData } from '../data/subjects';
import {
  User, BookOpen, Target, Save, Plus, X, Check,
  ChevronRight, ChevronLeft, GraduationCap, Search,
  Trash2, AlertTriangle, Zap, Settings as SettingsIcon
} from 'lucide-react';

interface Props {
  profile: StudentProfile | null;
  onUpdateProfile: (profile: StudentProfile) => void;
  username: string;
}

const LEVELS = ['IGCSE', 'AS Level', 'A Level'] as const;
const GRADES = ['A*', 'A', 'B', 'C', 'D', 'E'];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 12 }, (_, i) => CURRENT_YEAR - 8 + i);

// ─── Step indicators ──────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Profile',   icon: User,          desc: 'Your name & level' },
  { id: 2, label: 'Subjects',  icon: BookOpen,       desc: 'Subjects you study' },
  { id: 3, label: 'Targets',   icon: Target,         desc: 'Grade goals' },
];

// ─── Subject picker dialog ────────────────────────────────────────────────────
function SubjectPickerModal({
  level, existing, onAdd, onClose,
}: {
  level: string;
  existing: SelectedSubject[];
  onAdd: (s: SelectedSubject) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<SubjectData | null>(null);
  const [components, setComponents] = useState<string[]>([]);
  const [yearFrom, setYearFrom] = useState(CURRENT_YEAR - 3);
  const [yearTo, setYearTo]   = useState(CURRENT_YEAR);

  const subjects = getSubjectsByLevel(level as any).filter(s =>
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
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 400, backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div className="glass-bright animate-scale-in" style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '100%', maxWidth: 540, zIndex: 500, borderRadius: 'var(--radius-xl)',
        padding: 28, maxHeight: '88vh', overflowY: 'auto',
        boxShadow: '0 32px 100px rgba(0,0,0,0.6)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>Add Subject</h3>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-dim)', borderRadius: 8, padding: 7, cursor: 'pointer', color: 'var(--text-muted)' }}><X size={15} /></button>
        </div>

        {!selected ? (
          <>
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search subjects..." className="input-field" style={{ paddingLeft: 34 }} autoFocus />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
              {subjects.map(s => (
                <button key={s.code} onClick={() => { setSelected(s); setComponents([]); }}
                  style={{ padding: '12px 14px', borderRadius: 10, cursor: 'pointer', border: '1px solid var(--border-dim)', background: 'rgba(255,255,255,0.03)', textAlign: 'left', transition: 'all 0.15s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-violet)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-dim)')}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{s.code} · {s.components.length} components</div>
                  </div>
                  <ChevronRight size={14} color="var(--text-muted)" />
                </button>
              ))}
              {subjects.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: '12px 0' }}>No subjects found</p>}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <button onClick={() => setSelected(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13 }}>
              <ChevronLeft size={14} /> Back
            </button>
            <div style={{ padding: '14px 16px', borderRadius: 10, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{selected.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{selected.code}</div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
                Select Papers / Components
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                {selected.components.map(c => {
                  const on = components.includes(c.code);
                  return (
                    <button key={c.code} onClick={() => toggleComp(c.code)}
                      style={{
                        padding: '10px 13px', borderRadius: 9, cursor: 'pointer', border: 'none', textAlign: 'left',
                        background: on ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)',
                        outline: on ? '2px solid rgba(124,58,237,0.4)' : '1px solid var(--border-dim)',
                        transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}>
                      <div>
                        <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: on ? 600 : 400 }}>
                          Paper {c.code} — {c.name}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>/{c.maxMarks} marks</span>
                      </div>
                      {on && <Check size={14} color="var(--accent-violet-bright)" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Papers From</label>
                <select value={yearFrom} onChange={e => setYearFrom(Number(e.target.value))} className="input-field">
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Papers To</label>
                <select value={yearTo} onChange={e => setYearTo(Number(e.target.value))} className="input-field">
                  {YEARS.filter(y => y >= yearFrom).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <button className="btn-primary" disabled={components.length === 0} onClick={handleAdd}
              style={{ width: '100%', opacity: components.length === 0 ? 0.5 : 1 }}>
              <span>Add {selected.name}</span> <Check size={15} />
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export function SettingsPage({ profile, onUpdateProfile, username }: Props) {
  const isFirstTime = !profile || profile.subjects.length === 0;
  const [step, setStep] = useState(isFirstTime ? 1 : 0); // 0 = editing mode, 1-3 = wizard
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [name, setName]           = useState(profile?.name || '');
  const [level, setLevel]         = useState<typeof LEVELS[number]>(profile?.level || 'IGCSE');
  const [subjects, setSubjects]   = useState<SelectedSubject[]>(profile?.subjects || []);
  const [targetGrade, setTarget]  = useState(profile?.targetGrade || 'A*');
  const [yearFrom, setYearFrom]   = useState(profile?.yearsRange.from || CURRENT_YEAR - 3);
  const [yearTo, setYearTo]       = useState(profile?.yearsRange.to || CURRENT_YEAR);

  useEffect(() => {
    if (profile) {
      setName(profile.name); setLevel(profile.level);
      setSubjects(profile.subjects); setTarget(profile.targetGrade);
      setYearFrom(profile.yearsRange.from); setYearTo(profile.yearsRange.to);
    }
  }, [profile]);

  const handleSave = () => {
    onUpdateProfile({ name: name || username, level, subjects, targetGrade, yearsRange: { from: yearFrom, to: yearTo } });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    if (step > 0) setStep(0);
  };

  const removeSubject = (code: string) => {
    setSubjects(ss => ss.filter(s => s.code !== code));
    setShowDeleteConfirm(null);
  };

  const wizardValid = [
    !!(name || username),
    subjects.length > 0,
    !!targetGrade,
  ];

  // ── WIZARD MODE ───────────────────────────────────────────────────────────
  if (step > 0) {
    return (
      <div style={{ padding: '40px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '80vh', gap: 0 }}>

        {/* Step indicators */}
        <div className="animate-fade-up" style={{ display: 'flex', gap: 0, marginBottom: 48, width: '100%', maxWidth: 560 }}>
          {STEPS.map((s, i) => {
            const done = step > s.id;
            const active = step === s.id;
            const Icon = s.icon;
            return (
              <div key={s.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, position: 'relative' }}>
                {i < STEPS.length - 1 && (
                  <div style={{ position: 'absolute', top: 18, left: '60%', right: '-40%', height: 2, background: done ? 'var(--accent-violet)' : 'var(--border-dim)', transition: 'background 0.4s', zIndex: 0 }} />
                )}
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', zIndex: 1,
                  background: done ? 'var(--accent-emerald)' : active ? 'linear-gradient(135deg, var(--accent-violet), #6d28d9)' : 'var(--bg-elevated)',
                  border: `2px solid ${done ? 'var(--accent-emerald)' : active ? 'var(--accent-violet)' : 'var(--border-dim)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.3s',
                  boxShadow: active ? '0 0 20px var(--glow-violet)' : done ? '0 0 10px rgba(16,185,129,0.4)' : 'none',
                }}>
                  {done ? <Check size={16} color="#fff" /> : <Icon size={16} color={active ? '#fff' : 'var(--text-muted)'} />}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: active ? 'var(--text-primary)' : done ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>{s.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{s.desc}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Step cards */}
        <div className="glass-bright gradient-border animate-scale-in" style={{ width: '100%', maxWidth: 520, padding: 32, borderRadius: 'var(--radius-xl)', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}>

          {/* Step 1: Profile */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, animation: 'fade-up 0.3s both' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>What's your name?</h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>This is just for personalising your dashboard</p>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Display Name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder={username} className="input-field" style={{ fontSize: 16 }} autoFocus />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Qualification Level</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {LEVELS.map(l => (
                    <button key={l} onClick={() => { setLevel(l); setSubjects([]); }}
                      style={{
                        flex: 1, padding: '12px 8px', borderRadius: 10, cursor: 'pointer', border: 'none', fontSize: 13, fontWeight: 600,
                        background: level === l ? 'linear-gradient(135deg, var(--accent-violet), #6d28d9)' : 'rgba(255,255,255,0.04)',
                        color: level === l ? '#fff' : 'var(--text-muted)',
                        outline: level === l ? 'none' : '1px solid var(--border-dim)',
                        boxShadow: level === l ? '0 0 20px var(--glow-violet)' : 'none',
                        transition: 'all 0.2s',
                      }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Subjects */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fade-up 0.3s both' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Add your subjects</h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Select the {level} subjects you're studying</p>
              </div>
              {subjects.length === 0 ? (
                <div style={{ padding: '32px 0', textAlign: 'center' }}>
                  <GraduationCap size={40} color="var(--text-dim)" style={{ marginBottom: 12 }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>No subjects added yet</p>
                  <button className="btn-primary" onClick={() => setShowSubjectPicker(true)}><Plus size={15} /><span>Add Subject</span></button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {subjects.map(s => (
                      <div key={s.code} style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                            {s.code} · {s.components.length} papers · {s.yearsRange.from}–{s.yearsRange.to}
                          </div>
                        </div>
                        <button onClick={() => removeSubject(s.code)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6, transition: 'color 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-red)')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                          <X size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button className="btn-ghost" onClick={() => setShowSubjectPicker(true)} style={{ width: '100%' }}>
                    <Plus size={14} /> Add another subject
                  </button>
                </>
              )}
            </div>
          )}

          {/* Step 3: Targets */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, animation: 'fade-up 0.3s both' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Set your target</h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>What grade are you aiming for overall?</p>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Target Grade</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {GRADES.map(g => (
                    <button key={g} onClick={() => setTarget(g)}
                      style={{
                        flex: 1, padding: '14px 0', borderRadius: 10, cursor: 'pointer', border: 'none',
                        fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800,
                        background: targetGrade === g ? `linear-gradient(135deg, ${g === 'A*' ? '#a855f7' : g === 'A' ? 'var(--accent-emerald)' : g === 'B' ? 'var(--accent-cyan)' : 'var(--accent-amber)'}, #00000040)` : 'rgba(255,255,255,0.04)',
                        color: targetGrade === g ? '#fff' : 'var(--text-muted)',
                        outline: targetGrade === g ? 'none' : '1px solid var(--border-dim)',
                        transition: 'all 0.2s',
                        boxShadow: targetGrade === g ? '0 0 20px rgba(124,58,237,0.4)' : 'none',
                      }}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div style={{ padding: '16px', borderRadius: 12, background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Summary</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Name</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{name || username}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Level</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{level}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Subjects</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{subjects.length} added</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Target</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--accent-violet-bright)' }}>{targetGrade}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
            {step > 1 && (
              <button className="btn-ghost" onClick={() => setStep(s => s - 1)} style={{ flex: 1 }}>
                <ChevronLeft size={15} /> Back
              </button>
            )}
            {step < 3 ? (
              <button className="btn-primary" onClick={() => setStep(s => s + 1)}
                disabled={step === 2 && subjects.length === 0}
                style={{ flex: 2, opacity: step === 2 && subjects.length === 0 ? 0.5 : 1 }}>
                <span>Continue</span> <ChevronRight size={15} />
              </button>
            ) : (
              <button className="btn-primary" onClick={handleSave} style={{ flex: 2 }}>
                <span>Save & Get Started</span> <Zap size={15} />
              </button>
            )}
          </div>
        </div>

        {showSubjectPicker && (
          <SubjectPickerModal
            level={level} existing={subjects}
            onAdd={s => setSubjects(ss => [...ss, s])}
            onClose={() => setShowSubjectPicker(false)}
          />
        )}
      </div>
    );
  }

  // ── SETTINGS EDIT MODE ────────────────────────────────────────────────────
  return (
    <div style={{ padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 760 }}>

      {/* Header */}
      <div className="animate-fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Settings</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: 14 }}>@{username}</p>
        </div>
        <button className="btn-primary" onClick={handleSave} style={{ padding: '11px 22px' }}>
          {saved ? <><Check size={15} /> <span>Saved!</span></> : <><Save size={15} /> <span>Save Changes</span></>}
        </button>
      </div>

      {/* Profile card */}
      <div className="glass glow-card animate-fade-up stagger-1" style={{ padding: 24, borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <User size={18} color="var(--accent-violet-bright)" />
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Profile</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Display Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder={username} className="input-field" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Level</label>
            <select value={level} onChange={e => { setLevel(e.target.value as any); setSubjects([]); }} className="input-field">
              {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Target grade */}
      <div className="glass glow-card animate-fade-up stagger-2" style={{ padding: 24, borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Target size={18} color="var(--accent-cyan)" />
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Target Grade</h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {GRADES.map(g => (
            <button key={g} onClick={() => setTarget(g)}
              style={{
                flex: 1, padding: '13px 0', borderRadius: 10, cursor: 'pointer', border: 'none',
                fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 800,
                background: targetGrade === g ? 'linear-gradient(135deg, var(--accent-violet), #6d28d9)' : 'rgba(255,255,255,0.04)',
                color: targetGrade === g ? '#fff' : 'var(--text-muted)',
                outline: targetGrade === g ? 'none' : '1px solid var(--border-dim)',
                boxShadow: targetGrade === g ? '0 0 18px var(--glow-violet)' : 'none',
                transition: 'all 0.2s',
              }}>
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Subjects */}
      <div className="glass glow-card animate-fade-up stagger-3" style={{ padding: 24, borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BookOpen size={18} color="var(--accent-amber)" />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Subjects <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>({subjects.length})</span>
            </h2>
          </div>
          <button className="btn-ghost" onClick={() => setShowSubjectPicker(true)} style={{ padding: '8px 14px', fontSize: 12 }}>
            <Plus size={13} /> Add Subject
          </button>
        </div>

        {subjects.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center' }}>
            <GraduationCap size={36} color="var(--text-dim)" style={{ marginBottom: 10 }} />
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No subjects yet — add some above</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {subjects.map(s => (
              <div key={s.code} style={{ padding: '14px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-dim)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {s.code} · Papers: {s.components.join(', ')} · {s.yearsRange.from}–{s.yearsRange.to}
                  </div>
                </div>

                {showDeleteConfirm === s.code ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--accent-amber)' }}>Remove?</span>
                    <button onClick={() => removeSubject(s.code)} style={{ padding: '5px 10px', borderRadius: 7, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--accent-red)', fontSize: 12, cursor: 'pointer' }}>Yes</button>
                    <button onClick={() => setShowDeleteConfirm(null)} style={{ padding: '5px 10px', borderRadius: 7, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-dim)', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}>No</button>
                  </div>
                ) : (
                  <button onClick={() => setShowDeleteConfirm(s.code)} style={{ background: 'none', border: '1px solid transparent', borderRadius: 8, padding: 7, cursor: 'pointer', color: 'var(--text-dim)', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-red)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'none'; }}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Re-run wizard button */}
      <div className="animate-fade-up stagger-4">
        <button className="btn-ghost" onClick={() => setStep(1)} style={{ width: '100%', padding: '12px 0', justifyContent: 'center' }}>
          <SettingsIcon size={14} /> Re-run Setup Wizard
        </button>
      </div>

      {showSubjectPicker && (
        <SubjectPickerModal
          level={level} existing={subjects}
          onAdd={s => setSubjects(ss => [...ss, s])}
          onClose={() => setShowSubjectPicker(false)}
        />
      )}
    </div>
  );
}
