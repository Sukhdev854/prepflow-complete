import { useState, useEffect, useRef } from 'react';
import {
  AtSign, Lock, Eye, EyeOff, Loader, ArrowRight, Zap, CheckCircle,
  User, Mail, ChevronLeft, ChevronRight, BookOpen, GraduationCap, X
} from 'lucide-react';
import { signUp, signIn, AuthSession } from '../utils/cloudAuth';
import { subjectsDatabase } from '../data/subjects';

interface AuthPageProps {
  onAuthSuccess: (session: AuthSession) => void;
}

interface Particle {
  id: number; x: number; y: number; size: number;
  speedX: number; speedY: number; opacity: number; color: string;
}

function useTypewriter(texts: string[], speed = 65, pause = 2000) {
  const [displayed, setDisplayed] = useState('');
  const [textIdx, setTextIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    const current = texts[textIdx];
    let timeout: ReturnType<typeof setTimeout>;
    if (!deleting) {
      if (charIdx < current.length) timeout = setTimeout(() => setCharIdx(i => i + 1), speed);
      else timeout = setTimeout(() => setDeleting(true), pause);
    } else {
      if (charIdx > 0) timeout = setTimeout(() => setCharIdx(i => i - 1), speed / 2.5);
      else { setDeleting(false); setTextIdx(i => (i + 1) % texts.length); }
    }
    setDisplayed(current.slice(0, charIdx));
    return () => clearTimeout(timeout);
  }, [charIdx, deleting, textIdx, texts, speed, pause]);
  return displayed;
}

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    let animId: number;
    const COLORS = ['rgba(124,58,237,', 'rgba(6,182,212,', 'rgba(168,85,247,', 'rgba(236,72,153,'];
    const particles: Particle[] = [];
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    for (let i = 0; i < 60; i++) {
      particles.push({ id: i, x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, size: Math.random() * 2 + 0.5, speedX: (Math.random() - 0.5) * 0.4, speedY: (Math.random() - 0.5) * 0.4, opacity: Math.random() * 0.5 + 0.1, color: COLORS[Math.floor(Math.random() * COLORS.length)] });
    }
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) { ctx.beginPath(); ctx.strokeStyle = `rgba(124,58,237,${0.08 * (1 - dist / 120)})`; ctx.lineWidth = 0.5; ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y); ctx.stroke(); }
        }
      }
      particles.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${p.opacity})`; ctx.fill();
        p.x += p.speedX; p.y += p.speedY;
        if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
        if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />;
}

// ─── Sign Up Multi-Step Page ──────────────────────────────────────────────────
type SignUpStep = 'account' | 'subjects' | 'done';

interface SignUpData {
  name: string;
  username: string;
  email: string;
  password: string;
  level: 'IGCSE' | 'AS Level' | 'A Level';
  selectedSubjects: string[]; // subject codes
}

function SignUpFlow({ onSuccess, onBack }: { onSuccess: (session: AuthSession) => void; onBack: () => void }) {
  const [step, setStep] = useState<SignUpStep>('account');
  const [data, setData] = useState<SignUpData>({
    name: '', username: '', email: '', password: '',
    level: 'A Level', selectedSubjects: [],
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const subjectsByLevel = subjectsDatabase.filter(s => s.level === data.level);

  const toggleSubject = (code: string) => {
    setData(d => ({
      ...d,
      selectedSubjects: d.selectedSubjects.includes(code)
        ? d.selectedSubjects.filter(c => c !== code)
        : [...d.selectedSubjects, code],
    }));
  };

  const handleAccountNext = () => {
    if (!data.name.trim()) { setError('Please enter your name'); return; }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(data.username)) { setError('Username: 3–20 chars, letters/numbers/underscores only'); return; }
    if (!data.email.includes('@')) { setError('Please enter a valid email address'); return; }
    if (data.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setError('');
    setStep('subjects');
  };

  const handleFinish = async () => {
    setLoading(true); setError('');
    const result = await signUp(data.username, data.password, data.email, data.name);
    if (result.success && result.session) {
      setStep('done');
      setTimeout(() => onSuccess(result.session!), 1200);
    } else {
      setError(result.error || 'Failed to create account');
      setLoading(false);
    }
  };

  const STEP_LABELS = ['Account', 'Subjects', 'Done'];
  const stepIdx = step === 'account' ? 0 : step === 'subjects' ? 1 : 2;

  return (
    <div style={{ width: '100%', maxWidth: 660, margin: '0 auto', position: 'relative', zIndex: 1 }}>
      {/* Back button */}
      <button onClick={onBack} className="btn-ghost" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
        <ChevronLeft size={15} /> Back to Sign In
      </button>

      <div className="glass-bright gradient-border" style={{ padding: '36px 40px', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}>
        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
          {STEP_LABELS.map((label, i) => (
            <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ height: 3, borderRadius: 99, background: i <= stepIdx ? 'linear-gradient(90deg, var(--accent-violet), var(--accent-cyan))' : 'rgba(255,255,255,0.08)', transition: 'background 0.4s' }} />
              <span style={{ fontSize: 10, fontWeight: i === stepIdx ? 700 : 400, color: i <= stepIdx ? 'var(--text-secondary)' : 'var(--text-dim)' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* ── Step 1: Account details ── */}
        {step === 'account' && (
          <div style={{ animation: 'fade-up 0.3s both' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>Create your account</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 28 }}>Your data will sync across all your devices automatically.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Name */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 7 }}>Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type="text" value={data.name} onChange={e => setData(d => ({ ...d, name: e.target.value }))} placeholder="Your full name" className="input-field" style={{ paddingLeft: 38 }} />
                </div>
              </div>

              {/* Username */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 7 }}>Username</label>
                <div style={{ position: 'relative' }}>
                  <AtSign size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type="text" value={data.username} onChange={e => setData(d => ({ ...d, username: e.target.value }))} placeholder="Choose a unique username" className="input-field" style={{ paddingLeft: 38 }} />
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 5 }}>3–20 characters, letters / numbers / underscores only</p>
              </div>

              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 7 }}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type="email" value={data.email} onChange={e => setData(d => ({ ...d, email: e.target.value }))} placeholder="your@email.com" className="input-field" style={{ paddingLeft: 38 }} />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 7 }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type={showPassword ? 'text' : 'password'} value={data.password} onChange={e => setData(d => ({ ...d, password: e.target.value }))} placeholder="Minimum 6 characters" className="input-field" style={{ paddingLeft: 38, paddingRight: 42 }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{ padding: '10px 13px', borderRadius: 'var(--radius-md)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', fontSize: 13, color: '#f87171' }}>
                  {error}
                </div>
              )}

              <button className="btn-primary" onClick={handleAccountNext} style={{ width: '100%', padding: '13px 0', marginTop: 4 }}>
                Continue to Subjects <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Pick subjects ── */}
        {step === 'subjects' && (
          <div style={{ animation: 'fade-up 0.3s both' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>Choose your subjects</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Select all subjects you're studying. You can always change these in Settings.</p>

            {/* Level selector */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
              {(['IGCSE', 'AS Level', 'A Level'] as const).map(l => (
                <button key={l} onClick={() => { setData(d => ({ ...d, level: l, selectedSubjects: [] })); }}
                  style={{ flex: 1, padding: '9px 0', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.2s', background: data.level === l ? 'linear-gradient(135deg, var(--accent-violet), #6d28d9)' : 'rgba(255,255,255,0.04)', color: data.level === l ? '#fff' : 'var(--text-muted)', outline: data.level === l ? 'none' : '1px solid var(--border-dim)', boxShadow: data.level === l ? '0 0 20px var(--glow-violet)' : 'none' }}>
                  {l}
                </button>
              ))}
            </div>

            {/* Selected count */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {subjectsByLevel.length} subjects available for {data.level}
              </span>
              {data.selectedSubjects.length > 0 && (
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-emerald)' }}>
                  ✓ {data.selectedSubjects.length} selected
                </span>
              )}
            </div>

            {/* Subjects grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8, maxHeight: 340, overflowY: 'auto', paddingRight: 4, marginBottom: 20 }}>
              {subjectsByLevel.map(s => {
                const sel = data.selectedSubjects.includes(s.code);
                return (
                  <button key={s.code} onClick={() => toggleSubject(s.code)}
                    style={{ padding: '12px 14px', borderRadius: 10, cursor: 'pointer', border: 'none', textAlign: 'left', background: sel ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)', outline: sel ? '2px solid var(--accent-violet)' : '1px solid var(--border-dim)', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: sel ? 'var(--accent-violet-bright)' : 'var(--text-dim)', flexShrink: 0, transition: 'background 0.15s' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{s.code}</div>
                    </div>
                    {sel && <CheckCircle size={14} color="var(--accent-violet-bright)" style={{ flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>

            {error && (
              <div style={{ padding: '10px 13px', borderRadius: 'var(--radius-md)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', fontSize: 13, color: '#f87171', marginBottom: 12 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-ghost" onClick={() => setStep('account')} style={{ flex: 1 }}>
                <ChevronLeft size={15} /> Back
              </button>
              <button className="btn-primary" onClick={handleFinish} disabled={loading} style={{ flex: 2, opacity: loading ? 0.8 : 1 }}>
                {loading
                  ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Creating account…</>
                  : <><CheckCircle size={15} /> Create Account</>
                }
              </button>
            </div>

            <p style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', marginTop: 10 }}>
              You can skip subject selection and set it up later in Settings
            </p>
          </div>
        )}

        {/* ── Step 3: Done ── */}
        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '24px 0', animation: 'scale-in 0.3s both' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '2px solid var(--accent-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', animation: 'scale-in 0.4s both' }}>
              <CheckCircle size={32} color="var(--accent-emerald)" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>Account created! 🎉</h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Welcome to PrepFlow, {data.name.split(' ')[0]}. Taking you to your dashboard…</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main AuthPage ────────────────────────────────────────────────────────────
export function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mounted, setMounted] = useState(false);

  const tagline = useTypewriter(['Track every paper.', 'Crush your targets.', 'Hit that A*.', 'Study smarter.']);

  useEffect(() => { setTimeout(() => setMounted(true), 80); }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    const result = await signIn(username, password);
    if (result.success && result.session) {
      setSuccess('Welcome back!');
      setTimeout(() => onAuthSuccess(result.session!), 600);
    } else {
      setError(result.error || 'Incorrect credentials');
    }
    setLoading(false);
  };

  if (mode === 'signup') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-void)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
        <div className="app-bg"><div className="app-bg-grid" /></div>
        <ParticleCanvas />
        <div style={{ width: '100%', maxWidth: 700, position: 'relative', zIndex: 1 }}>
          <SignUpFlow
            onSuccess={onAuthSuccess}
            onBack={() => { setMode('signin'); setError(''); }}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <div className="app-bg"><div className="app-bg-grid" /></div>
      <ParticleCanvas />
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(124,58,237,0.07) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 72, width: '100%', maxWidth: 960, position: 'relative', zIndex: 1, opacity: mounted ? 1 : 0, transition: 'opacity 0.5s ease', flexWrap: 'wrap' }}>

        {/* Left: branding */}
        <div style={{ flex: '1 1 360px', display: 'flex', flexDirection: 'column', gap: 24 }} className="animate-fade-up">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, var(--accent-violet), #4c1d95)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px var(--glow-violet)' }}>
              <Zap size={24} color="#fff" />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>PrepFlow</span>
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem,4vw,3rem)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', color: 'var(--text-primary)', marginBottom: 14 }}>
              Your exam prep,<br /><span className="gradient-text">on another level.</span>
            </h1>
            <div style={{ fontSize: '1rem', color: 'var(--text-secondary)', minHeight: '1.6em', display: 'flex', alignItems: 'center', gap: 2 }}>
              <span>{tagline}</span>
              <span style={{ display: 'inline-block', width: 2, height: '1em', background: 'var(--accent-violet-bright)', animation: 'blink 1s step-end infinite', borderRadius: 1 }} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              'Track every IGCSE & A-Level paper',
              'Sync across all your devices',
              'Real grade thresholds, not just %',
              'Gamified streaks to keep you going',
            ].map((feat, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-secondary)', animation: `fade-up 0.5s ${0.1 + i * 0.07}s both` }}>
                <CheckCircle size={14} color="var(--accent-emerald)" style={{ flexShrink: 0 }} />
                {feat}
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-dim)' }}>© 2026 PrepFlow · Data synced securely to the cloud</p>
        </div>

        {/* Right: sign in form */}
        <div style={{ flex: '0 0 400px', width: '100%' }}>
          <div className="glass-bright gradient-border animate-scale-in" style={{ padding: 32, boxShadow: '0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)' }}>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Welcome back</h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Sign in to continue your prep journey</p>
            </div>

            <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 7 }}>Username or Email</label>
                <div style={{ position: 'relative' }}>
                  <AtSign size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type="text" value={username} onChange={e => setUsername(e.target.value)} required autoComplete="username" placeholder="Your username or email" className="input-field" style={{ paddingLeft: 38 }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 7 }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={6} autoComplete="current-password" placeholder="Your password" className="input-field" style={{ paddingLeft: 38, paddingRight: 42 }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{ padding: '10px 13px', borderRadius: 'var(--radius-md)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', fontSize: 13, color: '#f87171', animation: 'scale-in 0.2s both' }}>
                  {error}
                </div>
              )}
              {success && (
                <div style={{ padding: '10px 13px', borderRadius: 'var(--radius-md)', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', fontSize: 13, color: '#34d399', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={14} /> {success}
                </div>
              )}

              <button type="submit" disabled={loading || !!success} className="btn-primary" style={{ width: '100%', padding: '13px 0', marginTop: 4 }}>
                {loading
                  ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Signing in…</>
                  : <>Sign In <ArrowRight size={15} /></>
                }
              </button>
            </form>

            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border-dim)', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Don't have an account?</p>
              <button
                onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}
                className="btn-ghost"
                style={{ width: '100%', padding: '11px 0', fontSize: 14, fontWeight: 600 }}
              >
                <GraduationCap size={15} /> Create Free Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
