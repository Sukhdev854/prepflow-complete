import { useState, useEffect, useRef } from 'react';
import {
  Zap, BookOpen, TrendingUp, Target, Flame, BarChart2,
  CheckCircle, ArrowRight, ChevronRight, Star, Award,
  Clock, Users, FileText, Sparkles
} from 'lucide-react';

interface Props {
  onGetStarted: () => void;
}

// ─── Animated counter ─────────────────────────────────────────────────────────
function Counter({ to, suffix = '', duration = 1800 }: { to: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !started.current) {
        started.current = true;
        const start = Date.now();
        const tick = () => {
          const elapsed = Date.now() - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.round(eased * to));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to, duration]);
  return <div ref={ref} className="landing-stat">{count.toLocaleString()}{suffix}</div>;
}

// ─── Fake dashboard preview ───────────────────────────────────────────────────
function DashboardPreview() {
  const bars = [73, 80, 65, 88, 70, 76, 82, 69, 91, 74, 78, 85];
  const subjects = [
    { name: 'Economics', grade: 'A', pct: 82, color: '#7c3aed' },
    { name: 'Mathematics', grade: 'A*', pct: 91, color: '#06b6d4' },
    { name: 'Business', grade: 'B', pct: 71, color: '#10b981' },
    { name: 'Accounting', grade: 'A', pct: 80, color: '#f59e0b' },
  ];
  return (
    <div style={{ background:'#0f0f1a', borderRadius:16, border:'1px solid rgba(255,255,255,0.08)', overflow:'hidden', boxShadow:'0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.15)', fontFamily:'DM Sans, sans-serif' }}>
      {/* Mock topbar */}
      <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:'#ef4444' }} />
        <div style={{ width:8, height:8, borderRadius:'50%', background:'#f59e0b' }} />
        <div style={{ width:8, height:8, borderRadius:'50%', background:'#10b981' }} />
        <div style={{ marginLeft:12, fontSize:11, color:'rgba(255,255,255,0.3)', fontFamily:'monospace' }}>prepflow.app — Dashboard</div>
      </div>
      <div style={{ padding:16, display:'flex', flexDirection:'column', gap:12 }}>
        {/* Stats row */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
          {[
            { label:'Papers Done', val:'24', icon:'📝', color:'#7c3aed' },
            { label:'Avg Grade', val:'A', icon:'🎯', color:'#10b981' },
            { label:'Day Streak', val:'12', icon:'🔥', color:'#f59e0b' },
            { label:'Total XP', val:'1,200', icon:'⚡', color:'#06b6d4' },
          ].map(s => (
            <div key={s.label} style={{ padding:'10px 10px', borderRadius:10, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', textAlign:'center' }}>
              <div style={{ fontSize:16 }}>{s.icon}</div>
              <div style={{ fontSize:14, fontWeight:700, color:s.color, marginTop:2 }}>{s.val}</div>
              <div style={{ fontSize:9, color:'rgba(255,255,255,0.35)', marginTop:1 }}>{s.label}</div>
            </div>
          ))}
        </div>
        {/* Subjects */}
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {subjects.map(s => (
            <div key={s.name} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:8, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:s.color, flexShrink:0 }} />
              <span style={{ fontSize:12, color:'rgba(255,255,255,0.8)', flex:1 }}>{s.name}</span>
              <div style={{ flex:2, height:4, borderRadius:99, background:'rgba(255,255,255,0.06)', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${s.pct}%`, background:`linear-gradient(90deg, ${s.color}, ${s.color}80)`, borderRadius:99, transition:'width 1s ease' }} />
              </div>
              <span style={{ fontSize:12, fontWeight:700, color:s.color, width:24, textAlign:'right', flexShrink:0 }}>{s.grade}</span>
            </div>
          ))}
        </div>
        {/* Mini bar chart */}
        <div style={{ borderRadius:8, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)', padding:'10px 12px' }}>
          <div style={{ fontSize:9, color:'rgba(255,255,255,0.3)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.06em' }}>Score trend</div>
          <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:40 }}>
            {bars.map((h, i) => (
              <div key={i} style={{ flex:1, height:`${h}%`, borderRadius:'3px 3px 0 0', background: i === bars.length-1 ? 'linear-gradient(180deg, #7c3aed, #a855f7)' : 'rgba(124,58,237,0.35)', transition:'height 0.5s ease' }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Threshold preview ────────────────────────────────────────────────────────
function ThresholdPreview() {
  const rows = [
    { subject:'Mathematics 9709', paper:'11', year:'W25', diff:'Standard', a:55, max:75, score:62 },
    { subject:'Economics 9708',   paper:'12', year:'W25', diff:'Hard',     a:22, max:30, score:20 },
    { subject:'Business 9609',    paper:'13', year:'W25', diff:'Very Hard', a:19, max:30, score:16 },
  ];
  const diffColor: Record<string, string> = { 'Standard':'#06b6d4', 'Hard':'#f59e0b', 'Very Hard':'#ef4444' };
  return (
    <div style={{ background:'#0f0f1a', borderRadius:16, border:'1px solid rgba(255,255,255,0.08)', overflow:'hidden', boxShadow:'0 24px 60px rgba(0,0,0,0.5)' }}>
      <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', gap:8 }}>
        <Flame size={14} color="#ef4444" />
        <span style={{ fontSize:12, fontWeight:700, color:'#ef4444' }}>Hardest Papers</span>
      </div>
      <div style={{ padding:'0' }}>
        <div style={{ display:'grid', gridTemplateColumns:'2fr 60px 60px 80px 60px', gap:0, padding:'8px 14px', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
          {['Subject','Paper','Year','Difficulty','A Grade'].map(h => (
            <div key={h} style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</div>
          ))}
        </div>
        {rows.map((r, i) => (
          <div key={i} style={{ display:'grid', gridTemplateColumns:'2fr 60px 60px 80px 60px', gap:0, padding:'10px 14px', borderBottom: i < rows.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none', alignItems:'center' }}>
            <div style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.85)' }}>{r.subject}</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)' }}>{r.paper}</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)' }}>{r.year}</div>
            <div style={{ padding:'3px 8px', borderRadius:99, fontSize:9, fontWeight:700, background:`${diffColor[r.diff]}18`, color:diffColor[r.diff], width:'fit-content' }}>{r.diff}</div>
            <div style={{ fontSize:12, fontWeight:700, color:'#10b981' }}>{r.a}/{r.max}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Record preview ───────────────────────────────────────────────────────────
function RecordPreview() {
  const papers = [
    { subject:'Economics', paper:'11', year:'W25', grade:'A', pct:82, color:'#7c3aed' },
    { subject:'Mathematics', paper:'12', year:'S25', grade:'A*', pct:91, color:'#06b6d4' },
    { subject:'Business', paper:'13', year:'W24', grade:'B', pct:71, color:'#10b981' },
    { subject:'Accounting', paper:'22', year:'M25', grade:'A', pct:80, color:'#f59e0b' },
  ];
  const gradeColor: Record<string, string> = { 'A*':'#10b981', 'A':'#10b981', 'B':'#06b6d4', 'C':'#f59e0b', 'U':'#ef4444' };
  return (
    <div style={{ background:'#0f0f1a', borderRadius:16, border:'1px solid rgba(255,255,255,0.08)', overflow:'hidden', boxShadow:'0 24px 60px rgba(0,0,0,0.5)' }}>
      <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <BookOpen size={14} color="#7c3aed" />
          <span style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.8)' }}>Progress Tracker</span>
        </div>
        <div style={{ padding:'4px 10px', borderRadius:99, background:'linear-gradient(135deg, #7c3aed, #6d28d9)', fontSize:10, fontWeight:700, color:'#fff' }}>+ Log Paper</div>
      </div>
      {papers.map((p, i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderBottom: i < papers.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
          <div style={{ width:3, height:34, borderRadius:99, background:p.color, flexShrink:0 }} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.85)' }}>{p.subject} — Paper {p.paper}</div>
            <div style={{ height:4, borderRadius:99, background:'rgba(255,255,255,0.07)', marginTop:5, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${p.pct}%`, background:`linear-gradient(90deg, ${p.color}, ${p.color}80)`, borderRadius:99 }} />
            </div>
          </div>
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <div style={{ fontSize:14, fontWeight:800, color:gradeColor[p.grade] || '#fff', fontFamily:'Syne, sans-serif' }}>{p.grade}</div>
            <div style={{ fontSize:9, color:'rgba(255,255,255,0.35)' }}>{p.year}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export function WelcomePage({ onGetStarted }: Props) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const FEATURES = [
    {
      icon: <BookOpen size={22} color="#7c3aed" />,
      bg: 'rgba(124,58,237,0.12)', border: 'rgba(124,58,237,0.2)',
      title: 'Track Every Paper',
      desc: 'Log all your IGCSE and A Level past papers with scores, status and difficulty. See your progress at a glance in list or grid view.',
    },
    {
      icon: <Target size={22} color="#10b981" />,
      bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.2)',
      title: 'Real Grade Thresholds',
      desc: 'Get your actual Cambridge grade based on real marking thresholds — not just percentages. Know exactly where you stand.',
    },
    {
      icon: <Flame size={22} color="#ef4444" />,
      bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.2)',
      title: 'Hardest Papers Database',
      desc: 'Find the hardest papers for any subject using real threshold data. Sort by difficulty, filter by year and session.',
    },
    {
      icon: <TrendingUp size={22} color="#06b6d4" />,
      bg: 'rgba(6,182,212,0.12)', border: 'rgba(6,182,212,0.2)',
      title: 'Predicted Grades',
      desc: 'See predicted grades for each subject based on your historical performance. Set targets and track improvement over time.',
    },
    {
      icon: <FileText size={22} color="#f59e0b" />,
      bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.2)',
      title: 'Pending Papers Tracker',
      desc: 'Never lose track of papers to do, mark or review. Drag between columns in Kanban view or use the list view.',
    },
    {
      icon: <Award size={22} color="#ec4899" />,
      bg: 'rgba(236,72,153,0.12)', border: 'rgba(236,72,153,0.2)',
      title: 'Streaks & Achievements',
      desc: 'Stay motivated with daily study streaks, XP points and achievement badges. Gamify your exam prep.',
    },
  ];

  const STATS = [
    { label: 'Subjects Tracked', to: 40, suffix: '+' },
    { label: 'Papers in Database', to: 2500, suffix: '+' },
    { label: 'Grade Thresholds', to: 1800, suffix: '+' },
    { label: 'Years of Data', to: 9, suffix: ' yrs' },
  ];

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-void)', color:'var(--text-primary)', overflowX:'hidden' }}>
      <div className="app-bg"><div className="app-bg-grid" /></div>

      {/* ── Navbar ── */}
      <nav style={{
        position:'fixed', top:0, left:0, right:0, zIndex:100,
        padding:'0 32px', height:64, display:'flex', alignItems:'center', justifyContent:'space-between',
        background: scrolled ? 'rgba(5,5,7,0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
        transition:'all 0.3s ease',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg, var(--accent-violet), #4c1d95)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 20px var(--glow-violet)' }}>
            <Zap size={18} color="#fff" />
          </div>
          <span style={{ fontFamily:'var(--font-display)', fontSize:'1.2rem', fontWeight:800, color:'var(--text-primary)' }}>PrepFlow</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={onGetStarted} className="btn-ghost" style={{ fontSize:14 }}>Sign In</button>
          <button onClick={onGetStarted} className="btn-primary" style={{ padding:'9px 20px', fontSize:14 }}>
            Get Started Free <ArrowRight size={14} />
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'100px 24px 60px', position:'relative', zIndex:1 }}>
        {/* Glow blob */}
        <div style={{ position:'absolute', top:'30%', left:'50%', transform:'translate(-50%,-50%)', width:700, height:500, background:'radial-gradient(ellipse, rgba(124,58,237,0.15) 0%, transparent 65%)', pointerEvents:'none' }} />

        <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'6px 14px', borderRadius:99, background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.25)', fontSize:12, fontWeight:600, color:'var(--accent-violet-bright)', marginBottom:28, animation:'fade-up 0.5s both' }}>
          <Sparkles size={12} /> Cambridge IGCSE & A Level Prep Tool
        </div>

        <h1 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(2.4rem,6vw,4.5rem)', fontWeight:800, lineHeight:1.06, letterSpacing:'-0.03em', maxWidth:820, marginBottom:22, animation:'fade-up 0.6s 0.05s both' }}>
          The smarter way to{' '}
          <span className="gradient-text">ace your exams</span>
        </h1>

        <p style={{ fontSize:'clamp(1rem,2vw,1.2rem)', color:'var(--text-secondary)', maxWidth:580, lineHeight:1.7, marginBottom:36, animation:'fade-up 0.6s 0.1s both' }}>
          Track past papers, see real grade thresholds, find the hardest papers and predict your grades — all in one place.
        </p>

        <div style={{ display:'flex', gap:12, flexWrap:'wrap', justifyContent:'center', marginBottom:60, animation:'fade-up 0.6s 0.15s both' }}>
          <button onClick={onGetStarted} className="btn-primary" style={{ padding:'14px 30px', fontSize:16, borderRadius:12 }}>
            Start Tracking Free <ArrowRight size={16} />
          </button>
          <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior:'smooth' })} className="btn-ghost" style={{ padding:'14px 24px', fontSize:15 }}>
            See Features <ChevronRight size={15} />
          </button>
        </div>

        {/* Dashboard preview */}
        <div style={{ width:'100%', maxWidth:720, animation:'fade-up 0.8s 0.25s both', position:'relative', zIndex:1 }}>
          <div style={{ position:'absolute', inset:'-1px', borderRadius:17, background:'linear-gradient(135deg, rgba(124,58,237,0.4), rgba(6,182,212,0.2), transparent)', zIndex:-1, filter:'blur(1px)' }} />
          <DashboardPreview />
        </div>
      </section>

      {/* ── Stats ── */}
      <section style={{ padding:'80px 24px', position:'relative', zIndex:1, borderTop:'1px solid rgba(255,255,255,0.05)', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth:900, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:32, textAlign:'center' }}>
          {STATS.map((s, i) => (
            <div key={i} style={{ animation:`fade-up 0.5s ${0.1*i}s both` }}>
              <Counter to={s.to} suffix={s.suffix} />
              <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ padding:'100px 24px', position:'relative', zIndex:1 }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:64 }}>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(1.8rem,4vw,2.8rem)', fontWeight:800, letterSpacing:'-0.02em', marginBottom:14 }}>
              Everything you need to{' '}
              <span className="gradient-text">prepare smarter</span>
            </h2>
            <p style={{ fontSize:16, color:'var(--text-muted)', maxWidth:520, margin:'0 auto' }}>
              Built specifically for Cambridge students. Every feature is designed around how IGCSE and A Level prep actually works.
            </p>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(310px,1fr))', gap:20 }}>
            {FEATURES.map((f, i) => (
              <div key={i} className="landing-card" style={{ padding:'24px 24px', animation:`fade-up 0.5s ${0.06*i}s both` }}>
                <div style={{ width:44, height:44, borderRadius:12, background:f.bg, border:`1px solid ${f.border}`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16 }}>
                  {f.icon}
                </div>
                <h3 style={{ fontFamily:'var(--font-display)', fontSize:'1rem', fontWeight:700, color:'var(--text-primary)', marginBottom:8 }}>{f.title}</h3>
                <p style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature spotlights ── */}
      <section style={{ padding:'80px 24px', position:'relative', zIndex:1, background:'rgba(255,255,255,0.015)', borderTop:'1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', display:'flex', flexDirection:'column', gap:80 }}>

          {/* Spotlight 1: Hardest papers */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:48, alignItems:'center' }}>
            <div>
              <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'5px 12px', borderRadius:99, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', fontSize:11, fontWeight:700, color:'#ef4444', marginBottom:18 }}>
                <Flame size={11} /> HARDEST PAPERS
              </div>
              <h2 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(1.4rem,3vw,2rem)', fontWeight:800, letterSpacing:'-0.02em', marginBottom:14, lineHeight:1.2 }}>
                Find the papers that <span className="gradient-text">actually challenge you</span>
              </h2>
              <p style={{ fontSize:14, color:'var(--text-muted)', lineHeight:1.75, marginBottom:20 }}>
                Browse real Cambridge grade boundaries sorted by difficulty. The lower the A-grade threshold as a percentage, the harder the paper was. Filter by subject, year and session to target your weak spots.
              </p>
              {['Sort lowest to highest A threshold','Filter by subject, level and year','Direct QP and MS download links','Covers IGCSE and A Level subjects'].map((item, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'var(--text-secondary)', marginBottom:8 }}>
                  <CheckCircle size={14} color="var(--accent-emerald)" style={{ flexShrink:0 }} /> {item}
                </div>
              ))}
            </div>
            <div><ThresholdPreview /></div>
          </div>

          {/* Spotlight 2: Record progress */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:48, alignItems:'center' }}>
            <div style={{ order: 2 }}>
              <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'5px 12px', borderRadius:99, background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.2)', fontSize:11, fontWeight:700, color:'var(--accent-violet-bright)', marginBottom:18 }}>
                <BarChart2 size={11} /> RECORD PROGRESS
              </div>
              <h2 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(1.4rem,3vw,2rem)', fontWeight:800, letterSpacing:'-0.02em', marginBottom:14, lineHeight:1.2 }}>
                Log papers in seconds, <span className="gradient-text">see trends instantly</span>
              </h2>
              <p style={{ fontSize:14, color:'var(--text-muted)', lineHeight:1.75, marginBottom:20 }}>
                A clean 3-step flow to log any past paper. Enter your score and instantly see your grade based on real thresholds — not a rough percentage guess. View all your papers in list or grid view.
              </p>
              {['Guided 3-step logging flow','Grade from real Cambridge boundaries','List view and visual grid view','Filter, sort and search your history'].map((item, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'var(--text-secondary)', marginBottom:8 }}>
                  <CheckCircle size={14} color="var(--accent-emerald)" style={{ flexShrink:0 }} /> {item}
                </div>
              ))}
            </div>
            <div style={{ order: 1 }}><RecordPreview /></div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding:'100px 24px', position:'relative', zIndex:1, textAlign:'center' }}>
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:600, height:400, background:'radial-gradient(ellipse, rgba(124,58,237,0.12) 0%, transparent 65%)', pointerEvents:'none' }} />
        <div style={{ maxWidth:600, margin:'0 auto', position:'relative' }}>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(1.8rem,4vw,2.8rem)', fontWeight:800, letterSpacing:'-0.02em', marginBottom:16 }}>
            Ready to <span className="gradient-text">start preparing smarter?</span>
          </h2>
          <p style={{ fontSize:15, color:'var(--text-muted)', marginBottom:32, lineHeight:1.7 }}>
            Free to use. No credit card needed. Just sign up and start tracking.
          </p>
          <button onClick={onGetStarted} className="btn-primary" style={{ padding:'15px 36px', fontSize:17, borderRadius:13, boxShadow:'0 0 40px var(--glow-violet)' }}>
            Create Free Account <ArrowRight size={16} />
          </button>
          <p style={{ fontSize:12, color:'var(--text-dim)', marginTop:16 }}>Cambridge IGCSE · A Level · 2017–2026 papers</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ padding:'28px 32px', borderTop:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, position:'relative', zIndex:1 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:26, height:26, borderRadius:7, background:'linear-gradient(135deg, var(--accent-violet), #4c1d95)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Zap size={13} color="#fff" />
          </div>
          <span style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>PrepFlow</span>
        </div>
        <p style={{ fontSize:12, color:'var(--text-dim)' }}>© 2026 PrepFlow · Built for Cambridge students</p>
        <button onClick={onGetStarted} style={{ fontSize:12, color:'var(--accent-violet-bright)', background:'none', border:'none', cursor:'pointer' }}>Sign In →</button>
      </footer>
    </div>
  );
}
