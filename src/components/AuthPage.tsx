import { useState, useEffect, useRef } from 'react';
import {
  AtSign, Lock, Eye, EyeOff, Loader, ArrowRight, Zap, CheckCircle,
  User, Mail, ChevronLeft, ChevronRight, GraduationCap, Search, X
} from 'lucide-react';
import { signUp, signIn, AuthSession } from '../utils/cloudAuth';
import { subjectsDatabase } from '../data/subjects';

interface AuthPageProps {
  onAuthSuccess: (session: AuthSession) => void;
}

// ─── Particle background ──────────────────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    let animId: number;
    const COLORS = ['rgba(124,58,237,','rgba(6,182,212,','rgba(168,85,247,','rgba(236,72,153,'];
    const particles = Array.from({ length: 55 }, () => ({
      x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight,
      size: Math.random() * 2 + 0.5, speedX: (Math.random()-0.5)*0.4, speedY: (Math.random()-0.5)*0.4,
      opacity: Math.random()*0.45+0.1, color: COLORS[Math.floor(Math.random()*COLORS.length)],
    }));
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < particles.length; i++) for (let j = i+1; j < particles.length; j++) {
        const dx = particles[i].x-particles[j].x, dy = particles[i].y-particles[j].y;
        const d = Math.sqrt(dx*dx+dy*dy);
        if (d < 110) { ctx.beginPath(); ctx.strokeStyle=`rgba(124,58,237,${0.07*(1-d/110)})`; ctx.lineWidth=0.5; ctx.moveTo(particles[i].x,particles[i].y); ctx.lineTo(particles[j].x,particles[j].y); ctx.stroke(); }
      }
      particles.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
        ctx.fillStyle=`${p.color}${p.opacity})`; ctx.fill();
        p.x+=p.speedX; p.y+=p.speedY;
        if (p.x<0||p.x>canvas.width) p.speedX*=-1;
        if (p.y<0||p.y>canvas.height) p.speedY*=-1;
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none' }} />;
}

function useTypewriter(texts: string[], speed=65, pause=2000) {
  const [displayed, setDisplayed] = useState('');
  const [textIdx, setTextIdx]     = useState(0);
  const [charIdx, setCharIdx]     = useState(0);
  const [deleting, setDeleting]   = useState(false);
  useEffect(() => {
    const current = texts[textIdx];
    let t: ReturnType<typeof setTimeout>;
    if (!deleting) {
      if (charIdx < current.length) t = setTimeout(() => setCharIdx(i=>i+1), speed);
      else t = setTimeout(() => setDeleting(true), pause);
    } else {
      if (charIdx > 0) t = setTimeout(() => setCharIdx(i=>i-1), speed/2.5);
      else { setDeleting(false); setTextIdx(i=>(i+1)%texts.length); }
    }
    setDisplayed(current.slice(0, charIdx));
    return () => clearTimeout(t);
  }, [charIdx, deleting, textIdx, texts, speed, pause]);
  return displayed;
}

// ─── SIGN UP FLOW ─────────────────────────────────────────────────────────────
// Level choices: IGCSE and A Level only (no AS Level)
const LEVELS = ['IGCSE', 'A Level'] as const;
type Level = typeof LEVELS[number];

interface SignUpData {
  name: string; username: string; email: string; password: string;
  level: Level; selectedSubjects: string[];
}

function SignUpFlow({ onSuccess, onBack }: { onSuccess: (s: AuthSession) => void; onBack: () => void }) {
  const [step, setStep]   = useState<1|2|3>(1);
  const [data, setData]   = useState<SignUpData>({ name:'', username:'', email:'', password:'', level:'A Level', selectedSubjects:[] });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const subjectsByLevel = subjectsDatabase.filter(s => s.level === data.level);
  const visibleSubjects = search
    ? subjectsByLevel.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.code.includes(search))
    : subjectsByLevel;

  const toggle = (code: string) =>
    setData(d => ({ ...d, selectedSubjects: d.selectedSubjects.includes(code) ? d.selectedSubjects.filter(c=>c!==code) : [...d.selectedSubjects, code] }));

  const handleAccountNext = () => {
    if (!data.name.trim())                             { setError('Please enter your name'); return; }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(data.username))  { setError('Username: 3–20 chars, letters/numbers/underscores'); return; }
    if (!data.email.includes('@'))                     { setError('Enter a valid email address'); return; }
    if (data.password.length < 6)                      { setError('Password must be at least 6 characters'); return; }
    setError(''); setStep(2);
  };

  const handleFinish = async () => {
    setLoading(true); setError('');
    const result = await signUp(data.username, data.password, data.email, data.name);
    if (result.success && result.session) {
      setStep(3);
      setTimeout(() => onSuccess(result.session!), 1200);
    } else {
      setError(result.error || 'Failed to create account'); setLoading(false);
    }
  };

  const STEP_LABELS = ['Account', 'Subjects', 'Done'];
  const stepIdx = step - 1;

  return (
    <div style={{ width:'100%', maxWidth:660, margin:'0 auto', position:'relative', zIndex:1 }}>
      <button onClick={onBack} className="btn-ghost" style={{ marginBottom:20, display:'flex', alignItems:'center', gap:6, fontSize:13 }}>
        <ChevronLeft size={15}/> Back to Sign In
      </button>

      <div className="glass-bright gradient-border" style={{ padding:'32px 36px', boxShadow:'0 24px 80px rgba(0,0,0,0.55)' }}>
        {/* Step bar */}
        <div style={{ display:'flex', gap:6, marginBottom:28 }}>
          {STEP_LABELS.map((label,i) => (
            <div key={label} style={{ flex:1, display:'flex', flexDirection:'column', gap:4 }}>
              <div style={{ height:3, borderRadius:99, background: i<=stepIdx ? 'linear-gradient(90deg, var(--accent-violet), var(--accent-cyan))' : 'rgba(255,255,255,0.08)', transition:'background 0.4s' }} />
              <span style={{ fontSize:10, fontWeight: i===stepIdx ? 700 : 400, color: i<=stepIdx ? 'var(--text-secondary)' : 'var(--text-dim)' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* ── Step 1: Account ── */}
        {step === 1 && (
          <div style={{ display:'flex', flexDirection:'column', gap:14, animation:'fade-up 0.3s both' }}>
            <div>
              <h2 style={{ fontFamily:'var(--font-display)', fontSize:'1.4rem', fontWeight:800, color:'var(--text-primary)', marginBottom:4 }}>Create your account</h2>
              <p style={{ fontSize:13, color:'var(--text-muted)' }}>Your progress syncs across all devices automatically.</p>
            </div>
            {[
              { label:'Full Name',     type:'text',     val:data.name,     set:(v:string)=>setData(d=>({...d,name:v})),     ph:'Your full name',         icon:<User size={14}/> },
              { label:'Username',      type:'text',     val:data.username, set:(v:string)=>setData(d=>({...d,username:v})), ph:'3–20 chars, no spaces',  icon:<AtSign size={14}/> },
              { label:'Email Address', type:'email',    val:data.email,    set:(v:string)=>setData(d=>({...d,email:v})),    ph:'your@email.com',         icon:<Mail size={14}/> },
            ].map(f => (
              <div key={f.label}>
                <label style={{ display:'block', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)', marginBottom:6 }}>{f.label}</label>
                <div style={{ position:'relative' }}>
                  <div style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}>{f.icon}</div>
                  <input type={f.type} value={f.val} onChange={e=>f.set(e.target.value)} placeholder={f.ph} className="input-field" style={{ paddingLeft:36 }} />
                </div>
              </div>
            ))}
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)', marginBottom:6 }}>Password</label>
              <div style={{ position:'relative' }}>
                <Lock size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
                <input type={showPw?'text':'password'} value={data.password} onChange={e=>setData(d=>({...d,password:e.target.value}))} placeholder="Min 6 characters" className="input-field" style={{ paddingLeft:36, paddingRight:40 }} />
                <button type="button" onClick={()=>setShowPw(!showPw)} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:4 }}>
                  {showPw ? <EyeOff size={14}/> : <Eye size={14}/>}
                </button>
              </div>
            </div>
            {error && <div style={{ padding:'10px 13px', borderRadius:'var(--radius-md)', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', fontSize:13, color:'#f87171' }}>{error}</div>}
            <button className="btn-primary" onClick={handleAccountNext} style={{ width:'100%', padding:'13px 0', marginTop:4 }}>
              Continue to Subjects <ChevronRight size={15}/>
            </button>
          </div>
        )}

        {/* ── Step 2: Subjects ── */}
        {step === 2 && (
          <div style={{ display:'flex', flexDirection:'column', gap:14, animation:'fade-up 0.3s both' }}>
            <div>
              <h2 style={{ fontFamily:'var(--font-display)', fontSize:'1.4rem', fontWeight:800, color:'var(--text-primary)', marginBottom:4 }}>Pick your subjects</h2>
              <p style={{ fontSize:13, color:'var(--text-muted)' }}>Select all subjects you're studying. You can update this anytime in Settings.</p>
            </div>

            {/* Level selector — IGCSE and A Level only */}
            <div style={{ display:'flex', gap:8 }}>
              {LEVELS.map(l => (
                <button key={l} onClick={()=>setData(d=>({...d,level:l,selectedSubjects:[]}))}
                  style={{ flex:1, padding:'10px 0', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', border:'none', transition:'all 0.2s', background: data.level===l ? 'linear-gradient(135deg, var(--accent-violet), #6d28d9)' : 'rgba(255,255,255,0.04)', color: data.level===l ? '#fff' : 'var(--text-muted)', outline: data.level===l ? 'none' : '1px solid var(--border-dim)', boxShadow: data.level===l ? '0 0 20px var(--glow-violet)' : 'none' }}>
                  {l}
                </button>
              ))}
            </div>

            {/* Search */}
            <div style={{ position:'relative' }}>
              <Search size={13} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={`Search ${data.level} subjects…`} className="input-field" style={{ paddingLeft:32, fontSize:13 }} />
              {search && <button onClick={()=>setSearch('')} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:2 }}><X size={13}/></button>}
            </div>

            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--text-muted)' }}>
              <span>{visibleSubjects.length} subjects</span>
              {data.selectedSubjects.length > 0 && <span style={{ fontWeight:700, color:'var(--accent-emerald)' }}>✓ {data.selectedSubjects.length} selected</span>}
            </div>

            {/* Subject grid */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(190px,1fr))', gap:8, maxHeight:300, overflowY:'auto', paddingRight:4 }}>
              {visibleSubjects.map(s => {
                const sel = data.selectedSubjects.includes(s.code);
                return (
                  <button key={s.code} onClick={()=>toggle(s.code)}
                    style={{ padding:'11px 13px', borderRadius:10, cursor:'pointer', border:'none', textAlign:'left', background: sel ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)', outline: sel ? '2px solid var(--accent-violet)' : '1px solid var(--border-dim)', transition:'all 0.15s', display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:7, height:7, borderRadius:'50%', background: sel ? 'var(--accent-violet-bright)' : 'var(--text-dim)', flexShrink:0, transition:'background 0.15s' }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.name}</div>
                      <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:1 }}>{s.code}</div>
                    </div>
                    {sel && <CheckCircle size={13} color="var(--accent-violet-bright)" style={{ flexShrink:0 }} />}
                  </button>
                );
              })}
            </div>

            {error && <div style={{ padding:'10px 13px', borderRadius:'var(--radius-md)', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', fontSize:13, color:'#f87171' }}>{error}</div>}

            <div style={{ display:'flex', gap:10, marginTop:4 }}>
              <button className="btn-ghost" onClick={()=>setStep(1)} style={{ flex:1 }}><ChevronLeft size={15}/> Back</button>
              <button className="btn-primary" onClick={handleFinish} disabled={loading} style={{ flex:2, opacity:loading?0.8:1 }}>
                {loading ? <><Loader size={14} style={{ animation:'spin 1s linear infinite' }}/> Creating…</> : <><CheckCircle size={14}/> Create Account</>}
              </button>
            </div>
            <p style={{ fontSize:11, color:'var(--text-dim)', textAlign:'center' }}>You can skip subject selection — update it later in Settings</p>
          </div>
        )}

        {/* ── Step 3: Done ── */}
        {step === 3 && (
          <div style={{ textAlign:'center', padding:'28px 0', animation:'scale-in 0.3s both' }}>
            <div style={{ width:72, height:72, borderRadius:'50%', background:'rgba(16,185,129,0.15)', border:'2px solid var(--accent-emerald)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
              <CheckCircle size={32} color="var(--accent-emerald)"/>
            </div>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:'1.5rem', fontWeight:800, color:'var(--text-primary)', marginBottom:8 }}>Account created! 🎉</h2>
            <p style={{ fontSize:14, color:'var(--text-muted)' }}>Welcome to PrepFlow, {data.name.split(' ')[0]}. Taking you to your dashboard…</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN AUTH PAGE ───────────────────────────────────────────────────────────
export function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [mode, setMode]         = useState<'signin'|'signup'>('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const tagline = useTypewriter(['Track every paper.','Crush your targets.','Hit that A*.','Study smarter.']);

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
      <div style={{ minHeight:'100vh', background:'var(--bg-void)', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px 16px', position:'relative', overflow:'hidden' }}>
        <div className="app-bg"><div className="app-bg-grid"/></div>
        <ParticleCanvas/>
        <div style={{ width:'100%', maxWidth:700, position:'relative', zIndex:1 }}>
          <SignUpFlow onSuccess={onAuthSuccess} onBack={()=>{ setMode('signin'); setError(''); }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-void)', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px 16px', position:'relative', overflow:'hidden' }}>
      <div className="app-bg"><div className="app-bg-grid"/></div>
      <ParticleCanvas/>

      <div style={{ display:'flex', alignItems:'center', gap:64, width:'100%', maxWidth:920, position:'relative', zIndex:1, flexWrap:'wrap' }}>
        {/* Branding */}
        <div style={{ flex:'1 1 340px', display:'flex', flexDirection:'column', gap:22 }} className="animate-fade-up">
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:46, height:46, borderRadius:13, background:'linear-gradient(135deg, var(--accent-violet), #4c1d95)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 28px var(--glow-violet)' }}>
              <Zap size={22} color="#fff"/>
            </div>
            <span style={{ fontFamily:'var(--font-display)', fontSize:'1.5rem', fontWeight:800, color:'var(--text-primary)' }}>PrepFlow</span>
          </div>
          <div>
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(1.8rem,4vw,2.8rem)', fontWeight:800, lineHeight:1.1, letterSpacing:'-0.03em', color:'var(--text-primary)', marginBottom:12 }}>
              Your exam prep,<br/><span className="gradient-text">on another level.</span>
            </h1>
            <div style={{ fontSize:'1rem', color:'var(--text-secondary)', minHeight:'1.6em', display:'flex', alignItems:'center', gap:2 }}>
              <span>{tagline}</span>
              <span style={{ display:'inline-block', width:2, height:'1em', background:'var(--accent-violet-bright)', animation:'blink 1s step-end infinite', borderRadius:1 }} />
            </div>
          </div>
          {['Track every IGCSE & A-Level paper','Sync across all your devices','Real grade thresholds, not just %','Gamified streaks to keep you going'].map((f,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, fontSize:13, color:'var(--text-secondary)', animation:`fade-up 0.5s ${0.1+i*0.07}s both` }}>
              <CheckCircle size={14} color="var(--accent-emerald)" style={{ flexShrink:0 }}/>{f}
            </div>
          ))}
        </div>

        {/* Sign in form */}
        <div style={{ flex:'0 0 390px', width:'100%' }}>
          <div className="glass-bright gradient-border animate-scale-in" style={{ padding:30, boxShadow:'0 24px 80px rgba(0,0,0,0.5)' }}>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:'1.2rem', fontWeight:700, color:'var(--text-primary)', marginBottom:4 }}>Welcome back</h2>
            <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:22 }}>Sign in to continue your prep journey</p>

            <form onSubmit={handleSignIn} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)', marginBottom:6 }}>Username or Email</label>
                <div style={{ position:'relative' }}>
                  <AtSign size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
                  <input type="text" value={username} onChange={e=>setUsername(e.target.value)} required placeholder="Username or email" className="input-field" style={{ paddingLeft:36 }} />
                </div>
              </div>
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)', marginBottom:6 }}>Password</label>
                <div style={{ position:'relative' }}>
                  <Lock size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
                  <input type={showPw?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} required placeholder="Your password" className="input-field" style={{ paddingLeft:36, paddingRight:40 }} />
                  <button type="button" onClick={()=>setShowPw(!showPw)} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:4 }}>
                    {showPw?<EyeOff size={14}/>:<Eye size={14}/>}
                  </button>
                </div>
              </div>
              {error   && <div style={{ padding:'10px 13px', borderRadius:'var(--radius-md)', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', fontSize:13, color:'#f87171' }}>{error}</div>}
              {success && <div style={{ padding:'10px 13px', borderRadius:'var(--radius-md)', background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.25)', fontSize:13, color:'#34d399', display:'flex', alignItems:'center', gap:8 }}><CheckCircle size={13}/>{success}</div>}
              <button type="submit" disabled={loading||!!success} className="btn-primary" style={{ width:'100%', padding:'13px 0', marginTop:4 }}>
                {loading ? <><Loader size={14} style={{ animation:'spin 1s linear infinite' }}/> Signing in…</> : <>Sign In <ArrowRight size={14}/></>}
              </button>
            </form>

            <div style={{ marginTop:18, paddingTop:18, borderTop:'1px solid var(--border-dim)', textAlign:'center' }}>
              <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:10 }}>Don't have an account?</p>
              <button onClick={()=>{setMode('signup');setError('');setSuccess('');}} className="btn-ghost" style={{ width:'100%', padding:'11px 0', fontSize:14, fontWeight:600 }}>
                <GraduationCap size={14}/> Create Free Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
