import { useState, useEffect, useRef } from 'react';
import { AtSign, Lock, Eye, EyeOff, Loader, ArrowRight, Zap, CheckCircle } from 'lucide-react';
import { signUp, signIn, AuthSession } from '../utils/localAuth';

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
      if (charIdx < current.length) {
        timeout = setTimeout(() => setCharIdx(i => i + 1), speed);
      } else {
        timeout = setTimeout(() => setDeleting(true), pause);
      }
    } else {
      if (charIdx > 0) {
        timeout = setTimeout(() => setCharIdx(i => i - 1), speed / 2.5);
      } else {
        setDeleting(false);
        setTextIdx(i => (i + 1) % texts.length);
      }
    }
    setDisplayed(current.slice(0, charIdx));
    return () => clearTimeout(timeout);
  }, [charIdx, deleting, textIdx, texts, speed, pause]);

  return displayed;
}

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animId: number;
    const COLORS = ['rgba(124,58,237,', 'rgba(6,182,212,', 'rgba(168,85,247,', 'rgba(236,72,153,'];
    const particles: Particle[] = [];

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < 60; i++) {
      particles.push({
        id: i, x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight,
        size: Math.random() * 2 + 0.5, speedX: (Math.random() - 0.5) * 0.4,
        speedY: (Math.random() - 0.5) * 0.4, opacity: Math.random() * 0.5 + 0.1,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(124,58,237,${0.08 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
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

export function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mounted, setMounted] = useState(false);

  const tagline = useTypewriter(['Track every paper.', 'Crush your targets.', 'Hit that A*.', 'Study smarter.']);

  useEffect(() => { setTimeout(() => setMounted(true), 80); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    if (isSignUp) {
      const result = signUp(username, password, username);
      if (result.success && result.session) {
        setSuccess('Account created! Welcome to PrepFlow.');
        setTimeout(() => onAuthSuccess(result.session!), 800);
      } else { setError(result.error || 'Failed to sign up'); }
    } else {
      const result = signIn(username, password);
      if (result.success && result.session) {
        setSuccess('Welcome back!');
        setTimeout(() => onAuthSuccess(result.session!), 600);
      } else { setError(result.error || 'Incorrect credentials'); }
    }
    setLoading(false);
  };

  const switchMode = (toSignUp: boolean) => {
    setIsSignUp(toSignUp); setError(''); setSuccess(''); setUsername(''); setPassword('');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <div className="app-bg"><div className="app-bg-grid" /></div>
      <ParticleCanvas />

      {/* Center orb */}
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
            {['Track every IGCSE & A-Level paper', 'Visualise progress with smart charts', 'Predict your final grades instantly', 'Gamified streaks to keep you going'].map((feat, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-secondary)', animation: `fade-up 0.5s ${0.1 + i * 0.07}s both` }}>
                <CheckCircle size={14} color="var(--accent-emerald)" style={{ flexShrink: 0 }} />
                {feat}
              </div>
            ))}
          </div>

          <p style={{ fontSize: 11, color: 'var(--text-dim)' }}>© 2026 Sukhdev Saxena · Data stored locally on your device</p>
        </div>

        {/* Right: form */}
        <div style={{ flex: '0 0 400px', width: '100%' }}>
          <div className="glass-bright gradient-border animate-scale-in" style={{ padding: 32, boxShadow: '0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)' }}>

            {/* Tab switcher */}
            <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-md)', padding: 4, marginBottom: 24 }}>
              {['Sign In', 'Sign Up'].map((label, i) => {
                const active = (i === 1) === isSignUp;
                return (
                  <button key={label} onClick={() => switchMode(i === 1)} style={{ flex: 1, padding: '9px 0', borderRadius: 9, fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-display)', cursor: 'pointer', border: 'none', transition: 'all 0.25s', background: active ? 'linear-gradient(135deg, var(--accent-violet), #6d28d9)' : 'transparent', color: active ? '#fff' : 'var(--text-muted)', boxShadow: active ? '0 0 20px var(--glow-violet)' : 'none' }}>
                    {label}
                  </button>
                );
              })}
            </div>

            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                {isSignUp ? 'Create your account' : 'Welcome back'}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {isSignUp ? 'Start tracking your past papers today' : 'Sign in to continue your prep journey'}
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 7 }}>Username</label>
                <div style={{ position: 'relative' }}>
                  <AtSign size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type="text" value={username} onChange={e => setUsername(e.target.value)} required autoComplete="username" placeholder={isSignUp ? 'Choose a username' : 'Your username'} className="input-field" style={{ paddingLeft: 38 }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 7 }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={6} autoComplete={isSignUp ? 'new-password' : 'current-password'} placeholder="Your password" className="input-field" style={{ paddingLeft: 38, paddingRight: 42 }} />
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
                <div style={{ padding: '10px 13px', borderRadius: 'var(--radius-md)', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', fontSize: 13, color: '#34d399', display: 'flex', alignItems: 'center', gap: 8, animation: 'scale-in 0.2s both' }}>
                  <CheckCircle size={14} /> {success}
                </div>
              )}

              <button type="submit" disabled={loading || !!success} className="btn-primary" style={{ width: '100%', padding: '13px 0', marginTop: 4 }}>
                {loading
                  ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> {isSignUp ? 'Creating...' : 'Signing in...'}</>
                  : <>{isSignUp ? 'Create Account' : 'Sign In'} <ArrowRight size={15} /></>
                }
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: 'var(--text-muted)' }}>
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              <button onClick={() => switchMode(!isSignUp)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-violet-bright)', fontWeight: 600, fontSize: 13 }}>
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
