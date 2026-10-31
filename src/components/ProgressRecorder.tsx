import { useState, useRef, useMemo } from 'react';
import { StudentProfile, ProgressEntry } from '../App';
import { getSubjectByCode, getComponentData, getExtraComponents, isExtraVariant } from '../data/subjects';
import { getSubjectColor } from '../utils/subjectColors';
import {
  Plus, Trash2, ChevronRight, ChevronLeft, CheckCircle,
  Search, X, LayoutGrid, List, ArrowLeft, Lock
} from 'lucide-react';

interface Props {
  profile: StudentProfile; progress: ProgressEntry[];
  onAddProgress: (entry: ProgressEntry) => void;
  onUpdateProgress: (entries: ProgressEntry[]) => void;
}
type Status = 'done'|'in-progress'|'to-mark'|'to-review'|'not-started';
type Difficulty = 1|2|3|4|5;

// ── Thresholds ──────────────────────────────────────────────────────────────
export interface GradeThreshold {
  subjectCode:string;component:string;year:number;session:string;
  maxMarks:number;aStar?:number;a:number;b:number;c:number;d:number;e:number;
}
const THRESHOLDS:Record<string,GradeThreshold>={
  '9706_w_2025_12':{subjectCode:'9706',component:'12',year:2025,session:'w',maxMarks:30,a:22,b:18,c:15,d:12,e:10},
  '9706_w_2025_13':{subjectCode:'9706',component:'13',year:2025,session:'w',maxMarks:30,a:23,b:18,c:15,d:13,e:11},
  '9706_w_2025_11':{subjectCode:'9706',component:'11',year:2025,session:'w',maxMarks:30,a:24,b:19,c:16,d:14,e:12},
  '9706_s_2025_11':{subjectCode:'9706',component:'11',year:2025,session:'s',maxMarks:30,a:21,b:16,c:14,d:12,e:11},
  '9706_s_2025_12':{subjectCode:'9706',component:'12',year:2025,session:'s',maxMarks:30,a:22,b:18,c:15,d:13,e:11},
  '9706_m_2025_22':{subjectCode:'9706',component:'22',year:2025,session:'m',maxMarks:30,a:22,b:18,c:15,d:13,e:11},
  '9609_w_2025_11':{subjectCode:'9609',component:'11',year:2025,session:'w',maxMarks:30,a:22,b:17,c:14,d:12,e:10},
  '9709_w_2025_11':{subjectCode:'9709',component:'11',year:2025,session:'w',maxMarks:75,aStar:65,a:55,b:45,c:37,d:29,e:22},
};
export function getThreshold(c:string,s:string,y:number,comp:string):GradeThreshold|null{return THRESHOLDS[`${c}_${s}_${y}_${comp}`]||null;}
export function gradeFromThreshold(score:number,t:GradeThreshold):string{
  if(t.aStar!==undefined&&score>=t.aStar)return'A*';
  if(score>=t.a)return'A';if(score>=t.b)return'B';if(score>=t.c)return'C';if(score>=t.d)return'D';if(score>=t.e)return'E';return'U';
}
export function gradeFromPct(pct:number):string{
  if(pct>=90)return'A*';if(pct>=80)return'A';if(pct>=70)return'B';if(pct>=60)return'C';if(pct>=50)return'D';if(pct>=40)return'E';return'U';
}
export function gradeColor(g:string):string{
  if(g==='A*'||g==='A')return'var(--accent-emerald)';if(g==='B')return'var(--accent-cyan)';if(g==='C')return'var(--accent-amber)';return'var(--accent-red)';
}

const SESSION_LABELS:Record<string,string>={m:'Mar',s:'Jun',w:'Nov'};
const SESSIONS:Array<'m'|'s'|'w'>=['m','s','w'];
function isSessionAvailable(component:string,session:string):boolean{return session==='m'?component.endsWith('2'):true;}
const FM_CODES=new Set(['9231']);
function isFMUnavailable(sc:string,comp:string):boolean{return FM_CODES.has(sc)&&!comp.endsWith('2');}

function getCellColors(pct:number):{bg:string;text:string;border:string}{
  if(pct>=80)return{bg:'rgba(16,185,129,0.18)',text:'#34d399',border:'rgba(16,185,129,0.4)'};
  if(pct>=70)return{bg:'rgba(16,185,129,0.10)',text:'#6ee7b7',border:'rgba(16,185,129,0.25)'};
  if(pct>=60)return{bg:'rgba(245,158,11,0.15)',text:'#fbbf24',border:'rgba(245,158,11,0.35)'};
  if(pct>=50)return{bg:'rgba(245,158,11,0.08)',text:'#f59e0b',border:'rgba(245,158,11,0.2)'};
  if(pct>=40)return{bg:'rgba(239,68,68,0.12)',text:'#f87171',border:'rgba(239,68,68,0.3)'};
  return{bg:'rgba(239,68,68,0.20)',text:'#ef4444',border:'rgba(239,68,68,0.5)'};
}

const STATUS_CONFIG:Record<Status,{label:string;color:string;bg:string;icon:string}>={
  'done':{label:'Done',color:'var(--accent-emerald)',bg:'rgba(16,185,129,0.12)',icon:'✓'},
  'in-progress':{label:'In Progress',color:'var(--accent-cyan)',bg:'rgba(6,182,212,0.12)',icon:'⟳'},
  'to-mark':{label:'To Mark',color:'var(--accent-violet-bright)',bg:'rgba(168,85,247,0.12)',icon:'📝'},
  'to-review':{label:'To Review',color:'var(--accent-amber)',bg:'rgba(245,158,11,0.12)',icon:'👀'},
  'not-started':{label:'Not Started',color:'var(--text-muted)',bg:'rgba(255,255,255,0.04)',icon:'○'},
};
const DIFFICULTY_CONFIG=[
  {value:1 as Difficulty,emoji:'😊',label:'Very Easy',color:'var(--accent-emerald)'},
  {value:2 as Difficulty,emoji:'🙂',label:'Easy',color:'#86efac'},
  {value:3 as Difficulty,emoji:'😐',label:'Medium',color:'var(--accent-amber)'},
  {value:4 as Difficulty,emoji:'😰',label:'Hard',color:'#fb923c'},
  {value:5 as Difficulty,emoji:'😱',label:'Very Hard',color:'var(--accent-red)'},
];

// ── Log Paper Page ──────────────────────────────────────────────────────────
function LogPaperPage({profile,progress,onAdd,onBack}:{
  profile:StudentProfile;progress:ProgressEntry[];onAdd:(e:ProgressEntry)=>void;onBack:()=>void;
}){
  const [step,setStep]=useState(1);
  const [subjectCode,setSubject]=useState('');
  const [component,setComponent]=useState('');
  const [year,setYear]=useState(2025);
  const [session,setSession]=useState<'m'|'s'|'w'>('s');
  const [score,setScore]=useState('');
  const [status,setStatus]=useState<Status>('done');
  const [difficulty,setDiff]=useState<Difficulty|undefined>();
  const [saved,setSaved]=useState(false);
  const [overrideDup,setOverride]=useState(false);
  const [showV4,setShowV4]=useState(false);

  const subj=profile.subjects.find(s=>s.code===subjectCode);
  const subjData=subjectCode?getSubjectByCode(subjectCode):null;
  const compData=subjectCode?getComponentData(subjectCode,component):undefined;
  const baseAvail=subjData?.components.filter(c=>subj?.components.includes(c.code)).filter(c=>isSessionAvailable(c.code,session)&&!isFMUnavailable(subjectCode,c.code))||[];
  // Rare variant 4 papers (14, 24, 34...) — optional, not counted in progress
  const allExtras=subj&&subjectCode?getExtraComponents(subjectCode,subj.components):[];
  const avail=[...baseAvail,...(showV4?allExtras:[])].sort((a,b)=>a.code.localeCompare(b.code));

  // Subject-specific year range
  const subjYearFrom=subj?.yearsRange?.from??2017;
  const subjYearTo=subj?.yearsRange?.to??2026;
  const subjYears=Array.from({length:subjYearTo-subjYearFrom+1},(_,i)=>subjYearFrom+i);

  const handleSubjectSelect=(code:string)=>{
    const s=profile.subjects.find(s=>s.code===code);
    setSubject(code);setComponent('');setOverride(false);setShowV4(false);
    setYear(s?.yearsRange?.to??2025);setStep(2);
  };

  const existingEntry=useMemo(()=>
    subjectCode&&component&&year&&session
      ?progress.find(p=>p.subjectCode===subjectCode&&p.component===component&&p.year===year&&p.session===session)
      :undefined,
    [subjectCode,component,year,session,progress]
  );
  const isDuplicate=!!existingEntry&&!overrideDup;

  const scoreNum=parseFloat(score);
  const maxMarks=compData?.maxMarks??100;
  const pct=!isNaN(scoreNum)&&maxMarks>0?Math.min((scoreNum/maxMarks)*100,100):0;
  const threshold=subjectCode&&component?getThreshold(subjectCode,session,year,component):null;
  const grade=!isNaN(scoreNum)?(threshold?gradeFromThreshold(scoreNum,threshold):gradeFromPct(pct)):'';
  const color=subjectCode?getSubjectColor(subjectCode).hex:'var(--accent-violet)';
  const canStep2=!!component&&!isDuplicate;
  const canStep3=!!score&&!isNaN(scoreNum)&&scoreNum>=0&&scoreNum<=maxMarks;

  const handleSave=()=>{
    if(!canStep3||!compData)return;
    onAdd({id:`${subjectCode}_${component}_${year}_${session}_${Date.now()}`,subjectCode,component,year,session,score:scoreNum,maxScore:maxMarks,date:new Date().toISOString(),status,difficulty});
    setSaved(true);setTimeout(onBack,1800);
  };

  if(saved)return(
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'60vh',gap:16,padding:32,textAlign:'center'}}>
      <div style={{fontSize:72}}>🎉</div>
      <h2 style={{fontFamily:'var(--font-display)',fontSize:'1.8rem',fontWeight:800,color:'var(--text-primary)'}}>Paper Logged!</h2>
      {grade&&<div style={{fontFamily:'var(--font-display)',fontSize:'3rem',fontWeight:900,color:gradeColor(grade)}}>{grade}</div>}
      <p style={{color:'var(--text-muted)',fontSize:14}}>{score}/{maxMarks} · {pct.toFixed(1)}%</p>
    </div>
  );

  const LABELS=['Subject','Details','Score'];
  return(
    <div className="log-paper-page">
      <div style={{display:'flex',alignItems:'center',gap:14}}>
        <button className="btn-ghost" onClick={onBack}><ArrowLeft size={15}/> Back</button>
        <div>
          <h1 style={{fontFamily:'var(--font-display)',fontSize:'1.6rem',fontWeight:800,color:'var(--text-primary)'}}>Log a Paper</h1>
          <p style={{color:'var(--text-muted)',fontSize:13}}>Step {step} of 3 — {LABELS[step-1]}</p>
        </div>
      </div>
      <div style={{display:'flex',gap:6}}>
        {LABELS.map((l,i)=>(
          <div key={l} style={{flex:1,display:'flex',flexDirection:'column',gap:5}}>
            <div style={{height:3,borderRadius:99,background:i<step?`linear-gradient(90deg,${color},var(--accent-cyan))`:'rgba(255,255,255,0.08)',transition:'background 0.4s'}}/>
            <span style={{fontSize:10,color:i<step?'var(--text-secondary)':'var(--text-dim)',fontWeight:i+1===step?700:400}}>{l}</span>
          </div>
        ))}
      </div>
      <div className="glass-bright" style={{borderRadius:'var(--radius-xl)',padding:28}}>
        {/* Step 1: Subject */}
        {step===1&&(
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <p style={{fontSize:14,fontWeight:600,color:'var(--text-primary)',marginBottom:4}}>Choose the subject</p>
            {profile.subjects.map(s=>{
              const c=getSubjectColor(s.code).hex;const sel=subjectCode===s.code;
              return(
                <button key={s.code} onClick={()=>handleSubjectSelect(s.code)}
                  style={{padding:'14px 16px',borderRadius:12,cursor:'pointer',border:'none',textAlign:'left',background:sel?`${c}18`:'rgba(255,255,255,0.03)',outline:sel?`2px solid ${c}`:'1px solid var(--border-dim)',transition:'all 0.15s',display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:10,height:10,borderRadius:'50%',background:c,flexShrink:0}}/>
                  <div>
                    <div style={{fontSize:14,fontWeight:600,color:'var(--text-primary)'}}>{s.name}</div>
                    <div style={{fontSize:11,color:'var(--text-muted)'}}>{s.code} · {s.yearsRange?.from}–{s.yearsRange?.to}</div>
                  </div>
                  <ChevronRight size={15} color="var(--text-muted)" style={{marginLeft:'auto'}}/>
                </button>
              );
            })}
          </div>
        )}
        {/* Step 2: Details */}
        {step===2&&(
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div>
                <label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-muted)',marginBottom:8}}>Year</label>
                <select value={year} onChange={e=>{setYear(Number(e.target.value));setOverride(false);}} className="input-field">
                  {subjYears.map(y=><option key={y} value={y}>{y}</option>)}
                </select>
                <div style={{fontSize:10,color:'var(--text-dim)',marginTop:4}}>{subjYearFrom}–{subjYearTo} (your range)</div>
              </div>
              <div>
                <label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-muted)',marginBottom:8}}>Session</label>
                <select value={session} onChange={e=>{setSession(e.target.value as any);setOverride(false);if(!isExtraVariant(component)&&!isSessionAvailable(component,e.target.value))setComponent('');}} className="input-field">
                  <option value="m">Feb/March</option>
                  <option value="s">May/June</option>
                  <option value="w">Oct/Nov</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-muted)',marginBottom:8}}>
                Component {session==='m'&&<span style={{marginLeft:6,fontSize:10,fontWeight:400,color:'var(--accent-amber)'}}>⚠ Feb/March: variant 2 only</span>}
              </label>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {avail.length===0
                  ?<div style={{padding:12,borderRadius:10,background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',fontSize:13,color:'var(--accent-amber)'}}>No components available for this session</div>
                  :avail.map(c=>{const sel=component===c.code;return(
                    <button key={c.code} onClick={()=>{setComponent(c.code);setOverride(false);}}
                      style={{padding:'11px 14px',borderRadius:10,cursor:'pointer',border:'none',textAlign:'left',background:sel?`${color}18`:'rgba(255,255,255,0.03)',outline:sel?`2px solid ${color}`:'1px solid var(--border-dim)',transition:'all 0.15s',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span style={{fontSize:13,color:'var(--text-primary)',fontWeight:sel?600:400}}>Paper {c.code} — {c.name}{isExtraVariant(c.code)&&<span style={{marginLeft:8,fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:99,background:'rgba(6,182,212,0.15)',color:'var(--accent-cyan)'}}>Variant 4 · bonus</span>}</span>
                      <span style={{fontSize:11,color:'var(--text-muted)'}}>/{c.maxMarks}</span>
                    </button>
                  );})}
              </div>
              {allExtras.length>0&&(
                <button onClick={()=>{const next=!showV4;setShowV4(next);if(!next&&isExtraVariant(component))setComponent('');setOverride(false);}}
                  style={{marginTop:10,padding:'8px 14px',borderRadius:99,fontSize:12,fontWeight:600,cursor:'pointer',border:'1px dashed rgba(6,182,212,0.4)',background:showV4?'rgba(6,182,212,0.15)':'transparent',color:'var(--accent-cyan)'}}>
                  {showV4?'✓ Showing variant 4 papers (tap to hide)':'+ Add a variant 4 paper (rare)'}
                </button>
              )}
              {showV4&&<div style={{fontSize:11,color:'var(--text-dim)',marginTop:6}}>Variant 4 papers are bonus — they don't count towards your paper-completion progress.</div>}
            </div>
            {/* Duplicate warning */}
            {existingEntry&&(
              <div style={{padding:'12px 16px',borderRadius:12,background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.3)',display:'flex',flexDirection:'column',gap:8}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontSize:18}}>⚠️</span>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:'var(--accent-amber)'}}>Already logged!</div>
                    <div style={{fontSize:12,color:'var(--text-muted)'}}>Previous score: {existingEntry.score}/{existingEntry.maxScore} ({((existingEntry.score/existingEntry.maxScore)*100).toFixed(0)}%)</div>
                  </div>
                </div>
                {!overrideDup
                  ?<button onClick={()=>setOverride(true)} style={{padding:'7px 14px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',border:'1px solid rgba(245,158,11,0.4)',background:'rgba(245,158,11,0.1)',color:'var(--accent-amber)',width:'fit-content'}}>Overwrite with new score</button>
                  :<div style={{fontSize:12,color:'var(--accent-emerald)',fontWeight:600}}>✓ Will overwrite previous score</div>
                }
              </div>
            )}
          </div>
        )}
        {/* Step 3: Score */}
        {step===3&&(
          <div style={{display:'flex',flexDirection:'column',gap:20}}>
            {canStep3&&grade&&(
              <div style={{padding:'16px 20px',borderRadius:14,background:`linear-gradient(135deg,${color}15,${color}05)`,border:`1px solid ${color}30`,display:'flex',alignItems:'center',justifyContent:'space-between',position:'relative',overflow:'hidden'}}>
                <div>
                  <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:3}}>{threshold?'📊 Real thresholds':'📐 % estimate'}</div>
                  <div style={{fontFamily:'var(--font-display)',fontSize:'2.2rem',fontWeight:900,color:gradeColor(grade)}}>{grade}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontFamily:'var(--font-display)',fontSize:'1.4rem',fontWeight:700,color:'var(--text-primary)'}}>{pct.toFixed(1)}%</div>
                  <div style={{fontSize:12,color:'var(--text-muted)'}}>{score}/{maxMarks}</div>
                </div>
                <div style={{position:'absolute',left:0,bottom:0,height:3,background:`linear-gradient(90deg,${color},var(--accent-cyan))`,width:`${pct}%`}}/>
              </div>
            )}
            {threshold&&(
              <div style={{padding:'12px 16px',borderRadius:12,background:'rgba(255,255,255,0.03)',border:'1px solid var(--border-dim)'}}>
                <div style={{fontSize:10,fontWeight:700,color:'var(--text-muted)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Grade Thresholds</div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {threshold.aStar!==undefined&&<div style={{padding:'3px 9px',borderRadius:7,background:'rgba(16,185,129,0.15)',border:'1px solid rgba(16,185,129,0.3)',fontSize:11,fontWeight:700,color:'var(--accent-emerald)'}}>A* ≥{threshold.aStar}</div>}
                  {[{g:'A',v:threshold.a,c:'var(--accent-emerald)'},{g:'B',v:threshold.b,c:'var(--accent-cyan)'},{g:'C',v:threshold.c,c:'var(--accent-amber)'},{g:'D',v:threshold.d,c:'#fb923c'},{g:'E',v:threshold.e,c:'var(--accent-red)'}].map(t=>(
                    <div key={t.g} style={{padding:'3px 9px',borderRadius:7,background:`${t.c}18`,border:`1px solid ${t.c}40`,fontSize:11,fontWeight:600,color:t.c}}>{t.g} ≥{t.v}</div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-muted)',marginBottom:8}}>Score (out of {maxMarks})</label>
              <input type="number" min={0} max={maxMarks} value={score} onChange={e=>setScore(e.target.value)} className="input-field" placeholder={`0 – ${maxMarks}`} style={{fontSize:22,fontWeight:700,textAlign:'center'}} autoFocus/>
              <input type="range" min={0} max={maxMarks} value={isNaN(scoreNum)?0:scoreNum} onChange={e=>setScore(e.target.value)} style={{width:'100%',accentColor:color,cursor:'pointer',marginTop:10}}/>
            </div>
            <div>
              <label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-muted)',marginBottom:8}}>Status</label>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {(Object.entries(STATUS_CONFIG) as [Status,typeof STATUS_CONFIG[Status]][]).map(([val,cfg])=>(
                  <button key={val} onClick={()=>setStatus(val)}
                    style={{padding:'8px 12px',borderRadius:99,fontSize:12,fontWeight:600,cursor:'pointer',border:'none',background:status===val?cfg.bg:'rgba(255,255,255,0.04)',color:status===val?cfg.color:'var(--text-muted)',outline:status===val?`2px solid ${cfg.color}60`:'1px solid var(--border-dim)',transition:'all 0.15s'}}>
                    {cfg.icon} {cfg.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        <div style={{display:'flex',gap:10,marginTop:24}}>
          {step>1&&<button className="btn-ghost" onClick={()=>setStep(s=>s-1)} style={{flex:1}}><ChevronLeft size={16}/> Back</button>}
          {step<3
            ?<button className="btn-primary" disabled={step===2&&!canStep2} onClick={()=>setStep(s=>s+1)} style={{flex:2,opacity:step===2&&!canStep2?0.5:1}}>Continue <ChevronRight size={16}/></button>
            :<button className="btn-primary" disabled={!canStep3} onClick={handleSave} style={{flex:2,opacity:!canStep3?0.5:1}}>Save Paper <CheckCircle size={16}/></button>
          }
        </div>
      </div>
    </div>
  );
}

// ── Grid Cell ───────────────────────────────────────────────────────────────
interface CellProps{
  subjectCode:string;component:string;year:number;session:'m'|'s'|'w';
  maxMarks:number;entry:ProgressEntry|undefined;greyed:boolean;
  onSave:(score:number)=>void;onClear:()=>void;
}
function GridCell({subjectCode,component,year,session,maxMarks,entry,greyed,onSave,onClear}:CellProps){
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState('');
  const inputRef=useRef<HTMLInputElement>(null);
  if(greyed)return(
    <td style={{padding:'5px 3px',textAlign:'center',borderRight:'1px solid rgba(255,255,255,0.03)'}}>
      <div style={{width:56,height:52,margin:'0 auto',borderRadius:8,background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.03)',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <Lock size={10} color="rgba(255,255,255,0.15)"/>
      </div>
    </td>
  );
  const startEdit=()=>{setDraft(entry?String(entry.score):'');setEditing(true);setTimeout(()=>inputRef.current?.focus(),30);};
  const commit=()=>{setEditing(false);const v=parseFloat(draft);if(!isNaN(v)&&v>=0&&v<=maxMarks)onSave(v);else if(draft===''&&entry)onClear();};
  if(editing)return(
    <td style={{padding:'5px 3px',textAlign:'center',borderRight:'1px solid rgba(255,255,255,0.03)'}}>
      <div style={{position:'relative',width:56,margin:'0 auto'}}>
        <input ref={inputRef} type="number" min={0} max={maxMarks} value={draft}
          onChange={e=>{const v=e.target.value;if(v===''||(parseFloat(v)>=0&&parseFloat(v)<=maxMarks))setDraft(v);}}
          onBlur={commit} onKeyDown={e=>{if(e.key==='Enter')commit();if(e.key==='Escape')setEditing(false);}}
          style={{width:56,height:52,textAlign:'center',fontSize:14,fontWeight:700,background:'rgba(124,58,237,0.18)',border:'2px solid var(--accent-violet)',borderRadius:8,color:'var(--text-primary)',outline:'none',boxShadow:'0 0 14px var(--glow-violet)'}}/>
        <div style={{position:'absolute',bottom:-13,left:0,right:0,textAlign:'center',fontSize:9,color:'var(--text-dim)',whiteSpace:'nowrap'}}>max {maxMarks}</div>
      </div>
    </td>
  );
  if(entry){
    const pct=(entry.score/maxMarks)*100;
    const threshold=getThreshold(subjectCode,session,year,component);
    const grade=threshold?gradeFromThreshold(entry.score,threshold):gradeFromPct(pct);
    const colors=getCellColors(pct);
    return(
      <td onClick={startEdit} tabIndex={0} onKeyDown={e=>{if(e.key==='Delete'||e.key==='Backspace')onClear();}}
        style={{padding:'5px 3px',textAlign:'center',borderRight:'1px solid rgba(255,255,255,0.03)',cursor:'pointer'}}
        title={`${entry.score}/${maxMarks} · ${pct.toFixed(0)}% · ${grade} — click to edit, Del to clear`}>
        <div style={{width:56,height:52,margin:'0 auto',borderRadius:8,background:colors.bg,border:`1.5px solid ${colors.border}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:1,transition:'transform 0.15s',boxShadow:`inset 0 0 8px ${colors.bg}`}}
          onMouseEnter={e=>{const d=e.currentTarget as HTMLDivElement;d.style.transform='scale(1.1)';d.style.zIndex='4';d.style.position='relative';}}
          onMouseLeave={e=>{const d=e.currentTarget as HTMLDivElement;d.style.transform='scale(1)';d.style.zIndex='auto';}}>
          <span style={{fontSize:14,fontWeight:900,color:colors.text,lineHeight:1,fontFamily:'var(--font-display)'}}>{grade}</span>
          <span style={{fontSize:9,color:colors.text,opacity:0.9,lineHeight:1}}>{entry.score}/{maxMarks}</span>
          <span style={{fontSize:9,color:colors.text,opacity:0.7,lineHeight:1}}>{pct.toFixed(0)}%</span>
        </div>
      </td>
    );
  }
  return(
    <td onClick={startEdit} tabIndex={0} title="Click to enter score"
      style={{padding:'5px 3px',textAlign:'center',borderRight:'1px solid rgba(255,255,255,0.03)',cursor:'pointer'}}>
      <div style={{width:56,height:52,margin:'0 auto',borderRadius:8,background:'rgba(255,255,255,0.02)',border:'1px dashed rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.15s'}}
        onMouseEnter={e=>{const d=e.currentTarget as HTMLDivElement;d.style.background='rgba(124,58,237,0.1)';d.style.borderColor='rgba(124,58,237,0.35)';d.style.borderStyle='solid';}}
        onMouseLeave={e=>{const d=e.currentTarget as HTMLDivElement;d.style.background='rgba(255,255,255,0.02)';d.style.borderColor='rgba(255,255,255,0.08)';d.style.borderStyle='dashed';}}>
        <span style={{fontSize:18,color:'rgba(255,255,255,0.1)',lineHeight:1}}>+</span>
      </div>
    </td>
  );
}

// ── Subject Grid Table ──────────────────────────────────────────────────────
function SubjectGridTable({subject,progress,onSave,onClear,yearRange}:{
  subject:{name:string;code:string;components:string[]};progress:ProgressEntry[];
  onSave:(e:ProgressEntry)=>void;onClear:(sc:string,comp:string,year:number,session:string)=>void;
  yearRange:{from:number;to:number};
}){
  const [manualV4,setManualV4]=useState(false);
  const subjData=getSubjectByCode(subject.code);
  if(!subjData)return null;
  const color=getSubjectColor(subject.code).hex;
  // Expand year range to include any years that already have logged entries,
  // so data logged under a previous yearsRange setting remains visible in the grid.
  const entryYears=progress.filter(p=>p.subjectCode===subject.code).map(p=>Number(p.year));
  const effectiveFrom=entryYears.length>0?Math.min(yearRange.from,...entryYears):yearRange.from;
  const effectiveTo=entryYears.length>0?Math.max(yearRange.to,...entryYears):yearRange.to;
  const columns:{year:number;session:'m'|'s'|'w'}[]=[];
  for(let y=effectiveFrom;y<=effectiveTo;y++)SESSIONS.forEach(s=>columns.push({year:y,session:s}));
  const baseRows=subjData.components.filter(c=>subject.components.includes(c.code));
  // Optional variant 4 rows (14, 24, 34...). Auto-shown if you've already logged one.
  const extraRows=getExtraComponents(subject.code,subject.components);
  const hasExtraEntries=progress.some(p=>p.subjectCode===subject.code&&isExtraVariant(p.component));
  const showV4=manualV4||hasExtraEntries;
  const rows=(showV4?[...baseRows,...extraRows]:baseRows).sort((a,b)=>a.code.localeCompare(b.code));
  const getEntry=(comp:string,year:number,session:string)=>progress.find(p=>p.subjectCode===subject.code&&p.component===comp&&Number(p.year)===year&&String(p.session)===String(session));
  const doneEntries=progress.filter(p=>p.subjectCode===subject.code);
  const avgPct=doneEntries.length>0?(doneEntries.reduce((a,p)=>a+p.score,0)/doneEntries.reduce((a,p)=>a+p.maxScore,0))*100:0;
  const avgGrade=doneEntries.length>0?gradeFromPct(avgPct):null;
  return(
    <div style={{marginBottom:36}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10,padding:'10px 16px',borderRadius:'var(--radius-md)',background:`${color}10`,border:`1px solid ${color}25`}}>
        <div style={{width:10,height:10,borderRadius:'50%',background:color,boxShadow:`0 0 8px ${color}`,flexShrink:0}}/>
        <h3 style={{fontFamily:'var(--font-display)',fontSize:'1rem',fontWeight:700,color:'var(--text-primary)',flex:1}}>{subject.name}</h3>
        <span style={{fontSize:11,color:'var(--text-muted)',fontFamily:'monospace'}}>{subject.code}</span>
        {avgGrade&&<><span style={{fontSize:11,color:'var(--text-muted)'}}>Avg:</span><span style={{fontFamily:'var(--font-display)',fontSize:14,fontWeight:800,color:gradeColor(avgGrade)}}>{avgGrade}</span><span style={{fontSize:11,color:'var(--text-muted)'}}>({avgPct.toFixed(0)}%)</span></>}
        <span style={{fontSize:11,color:'var(--text-muted)',marginLeft:8}}>{doneEntries.length} logged</span>
        {extraRows.length>0&&(
          <button onClick={()=>{if(!hasExtraEntries)setManualV4(v=>!v);}} disabled={hasExtraEntries}
            title={hasExtraEntries?'Hidden rows can\'t be removed while variant 4 scores are logged':'Show/hide rare variant 4 papers (not counted in progress)'}
            style={{padding:'4px 10px',borderRadius:99,fontSize:10,fontWeight:700,cursor:hasExtraEntries?'default':'pointer',border:'1px dashed rgba(6,182,212,0.45)',background:showV4?'rgba(6,182,212,0.15)':'transparent',color:'var(--accent-cyan)'}}>
            {showV4?'✓ Variant 4':'+ Variant 4'}
          </button>
        )}
        <div style={{display:'flex',gap:6,alignItems:'center',marginLeft:12,fontSize:10,color:'var(--text-dim)'}}>
          {[{c:'#34d399',l:'A/A*'},{c:'#fbbf24',l:'B/C'},{c:'#ef4444',l:'D/E/U'}].map(x=>(
            <span key={x.l} style={{display:'flex',alignItems:'center',gap:3}}><span style={{width:8,height:8,borderRadius:2,background:`${x.c}40`,border:`1px solid ${x.c}`,display:'inline-block'}}/>{x.l}</span>
          ))}
        </div>
      </div>
      <div style={{overflowX:'auto',borderRadius:'var(--radius-lg)',border:'1px solid var(--border-dim)',background:'var(--bg-card)'}}>
        <table style={{borderCollapse:'collapse',width:'max-content',minWidth:'100%',tableLayout:'fixed'}}>
          <thead>
            <tr style={{background:'rgba(255,255,255,0.03)',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
              <th style={{position:'sticky',left:0,zIndex:3,background:'#13131f',width:72,minWidth:72,padding:'10px 12px',textAlign:'center',borderRight:'2px solid rgba(255,255,255,0.08)',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em'}}>Paper</th>
              {Array.from(new Set(columns.map(c=>c.year))).map(yr=>(
                <th key={yr} colSpan={3} style={{padding:'8px 4px',textAlign:'center',borderLeft:'1px solid rgba(255,255,255,0.08)',fontSize:12,fontWeight:700,color:'var(--text-secondary)',letterSpacing:'0.02em',minWidth:180}}>{yr}</th>
              ))}
            </tr>
            <tr style={{background:'rgba(255,255,255,0.015)',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
              <th style={{position:'sticky',left:0,zIndex:3,background:'#13131f',borderRight:'2px solid rgba(255,255,255,0.08)'}}/>
              {columns.map((col,i)=>(
                <th key={i} style={{padding:'5px 3px',textAlign:'center',width:62,minWidth:62,fontSize:9,fontWeight:600,color:col.session==='m'?'rgba(245,158,11,0.6)':col.session==='s'?'rgba(6,182,212,0.6)':'rgba(168,85,247,0.6)',textTransform:'uppercase',letterSpacing:'0.04em',borderLeft:col.session==='m'?'1px solid rgba(255,255,255,0.06)':undefined,borderRight:'1px solid rgba(255,255,255,0.03)'}}>
                  {SESSION_LABELS[col.session]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((comp,rowIdx)=>{
              const isGreyed=!isExtraVariant(comp.code)&&isFMUnavailable(subject.code,comp.code);
              return(
                <tr key={comp.code} style={{borderBottom:rowIdx<rows.length-1?'1px solid rgba(255,255,255,0.04)':'none',transition:'background 0.1s'}}
                  onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.012)')}
                  onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                  <td style={{position:'sticky',left:0,zIndex:2,background:'#13131f',padding:'6px 8px',borderRight:'2px solid rgba(255,255,255,0.08)',textAlign:'center',verticalAlign:'middle',width:72,minWidth:72}}>
                    <div style={{fontSize:14,fontWeight:700,color:isGreyed?'rgba(255,255,255,0.18)':'var(--text-primary)',lineHeight:1}}>{comp.code}</div>
                    <div style={{fontSize:9,color:'var(--text-dim)',marginTop:2}}>/{comp.maxMarks}</div>
                    {isGreyed&&<div style={{fontSize:8,color:'rgba(245,158,11,0.5)',marginTop:1}}>unavail</div>}
                    {isExtraVariant(comp.code)&&<div style={{fontSize:8,color:'var(--accent-cyan)',marginTop:1,fontWeight:700}}>BONUS</div>}
                  </td>
                  {columns.map((col,ci)=>{
                    const cellGreyed=isGreyed||(!isExtraVariant(comp.code)&&!isSessionAvailable(comp.code,col.session));
                    return(
                      <GridCell key={ci} subjectCode={subject.code} component={comp.code} year={col.year} session={col.session} maxMarks={comp.maxMarks}
                        entry={getEntry(comp.code,col.year,col.session)} greyed={cellGreyed}
                        onSave={score=>onSave({id:`${subject.code}_${comp.code}_${col.year}_${col.session}`,subjectCode:subject.code,component:comp.code,year:col.year,session:col.session,score,maxScore:comp.maxMarks,date:new Date().toISOString(),status:'done'})}
                        onClear={()=>onClear(subject.code,comp.code,col.year,col.session)}/>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export function ProgressRecorder({profile,progress,onAddProgress,onUpdateProgress}:Props){
  const [showLogPage,setShowLogPage]=useState(false);
  const [search,setSearch]=useState('');
  const [filterSubject,setFilterSubject]=useState('all');
  const [filterStatus,setFilterStatus]=useState<Status|'all'>('all');
  const [sortBy,setSortBy]=useState<'date'|'score'|'subject'>('date');
  const [viewMode,setViewMode]=useState<'list'|'grid'>('list');
  const [listStyle,setListStyle]=useState<'rows'|'blocks'>('rows');

  const getEntryGrade=(e:ProgressEntry)=>{
    const pct=e.maxScore>0?(e.score/e.maxScore)*100:0;
    const th=getThreshold(e.subjectCode,e.session,e.year,e.component);
    return th?gradeFromThreshold(e.score,th):gradeFromPct(pct);
  };

  const handleGridSave=(entry:ProgressEntry)=>{
    const updated=[...progress.filter(e=>!(e.subjectCode===entry.subjectCode&&e.component===entry.component&&e.year===entry.year&&e.session===entry.session)),entry];
    onUpdateProgress(updated);
  };
  const handleGridClear=(sc:string,comp:string,year:number,session:string)=>{
    onUpdateProgress(progress.filter(e=>!(e.subjectCode===sc&&e.component===comp&&e.year===year&&e.session===session)));
  };

  const filtered=useMemo(()=>progress
    .filter(e=>{
      const s=profile.subjects.find(s=>s.code===e.subjectCode);
      if(!s)return false;
      if(filterSubject!=='all'&&e.subjectCode!==filterSubject)return false;
      if(filterStatus!=='all'&&e.status!==filterStatus)return false;
      if(search){const q=search.toLowerCase();return s.name.toLowerCase().includes(q)||e.component.includes(q)||String(e.year).includes(q);}
      return true;
    })
    .sort((a,b)=>{
      if(sortBy==='date')return new Date(b.date).getTime()-new Date(a.date).getTime();
      if(sortBy==='score')return(b.score/b.maxScore)-(a.score/a.maxScore);
      return a.subjectCode.localeCompare(b.subjectCode);
    }),[progress,filterSubject,filterStatus,search,sortBy,profile.subjects]);

  const bySubject=profile.subjects.map(s=>{
    const sp=progress.filter(p=>p.subjectCode===s.code);
    const done=sp.filter(p=>p.status==='done');
    const avgPct=done.length>0?(done.reduce((a,p)=>a+p.score,0)/done.reduce((a,p)=>a+p.maxScore,0))*100:0;
    return{...s,count:sp.length,done:done.length,avgPct,color:getSubjectColor(s.code).hex};
  });

  const globalYearRange={from:profile.yearsRange?.from||2017,to:profile.yearsRange?.to||2026};

  if(showLogPage)return(
    <LogPaperPage profile={profile} progress={progress} onAdd={e=>{onAddProgress(e);setShowLogPage(false);}} onBack={()=>setShowLogPage(false)}/>
  );

  return(
    <div style={{padding:'32px 28px',display:'flex',flexDirection:'column',gap:24,maxWidth:viewMode==='grid'?'none':1100}}>

      {/* Header */}
      <div className="animate-fade-up" style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:16}}>
        <div>
          <h1 style={{fontFamily:'var(--font-display)',fontSize:'clamp(1.5rem,3vw,2rem)',fontWeight:800,color:'var(--text-primary)',letterSpacing:'-0.02em'}}>Record Progress</h1>
          <p style={{color:'var(--text-muted)',marginTop:4,fontSize:14}}>{progress.length} papers logged · {progress.filter(p=>p.status==='done').length} completed</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <div style={{display:'flex',background:'rgba(255,255,255,0.04)',border:'1px solid var(--border-dim)',borderRadius:10,padding:4,gap:4}}>
            {(['list','grid'] as const).map(mode=>(
              <button key={mode} onClick={()=>setViewMode(mode)}
                style={{padding:'7px 12px',borderRadius:7,fontSize:12,fontWeight:600,cursor:'pointer',border:'none',transition:'all 0.2s',background:viewMode===mode?'linear-gradient(135deg,var(--accent-violet),#6d28d9)':'transparent',color:viewMode===mode?'#fff':'var(--text-muted)',boxShadow:viewMode===mode?'0 0 16px var(--glow-violet)':'none',display:'flex',alignItems:'center',gap:5}}>
                {mode==='list'?<List size={14}/>:<LayoutGrid size={14}/>}
                {mode==='list'?'List':'Grid'}
              </button>
            ))}
          </div>
          {viewMode==='list'&&<button className="btn-primary" onClick={()=>setShowLogPage(true)} style={{padding:'12px 22px'}}><Plus size={16}/><span>Log a Paper</span></button>}
        </div>
      </div>

      {/* Subject chips — list view only */}
      {viewMode==='list'&&bySubject.length>0&&(
        <div className="animate-fade-up stagger-1" style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          {bySubject.map((s,i)=>(
            <div key={s.code} style={{padding:'10px 16px',borderRadius:12,cursor:'pointer',background:filterSubject===s.code?`${s.color}18`:'rgba(255,255,255,0.03)',border:`1px solid ${filterSubject===s.code?s.color+'50':'var(--border-dim)'}`,transition:'all 0.2s',animation:`fade-up 0.4s ${0.04*i}s both`}}
              onClick={()=>setFilterSubject(filterSubject===s.code?'all':s.code)}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:s.color}}/>
                <span style={{fontSize:13,fontWeight:600,color:'var(--text-primary)'}}>{s.name.split(' ')[0]}</span>
                <span style={{fontSize:10,padding:'1px 7px',borderRadius:99,background:s.done>0?'rgba(16,185,129,0.15)':'rgba(124,58,237,0.12)',color:s.done>0?'var(--accent-emerald)':'var(--accent-violet-bright)',fontWeight:600}}>{s.done}/{s.count}</span>
                {s.done>0&&<span style={{fontSize:11,fontWeight:700,color:gradeColor(gradeFromPct(s.avgPct))}}>{gradeFromPct(s.avgPct)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* GRID VIEW */}
      {viewMode==='grid'&&(
        <div className="animate-fade-up stagger-2">
          {profile.subjects.length===0?(
            <div className="glass" style={{padding:'60px 24px',textAlign:'center',borderRadius:'var(--radius-lg)'}}>
              <div style={{fontSize:48,marginBottom:16}}>📊</div>
              <h3 style={{fontFamily:'var(--font-display)',fontSize:'1.2rem',color:'var(--text-primary)',marginBottom:8}}>No subjects yet</h3>
              <p style={{color:'var(--text-muted)',fontSize:14}}>Add subjects in Settings to use the grid</p>
            </div>
          ):(
            <>
              <div style={{marginBottom:18,padding:'10px 16px',borderRadius:10,background:'rgba(124,58,237,0.06)',border:'1px solid rgba(124,58,237,0.15)',fontSize:13,color:'var(--text-secondary)',display:'flex',gap:16,alignItems:'center',flexWrap:'wrap'}}>
                <span>💡 <strong>Click</strong> empty cell to enter score · <strong>Click</strong> filled cell to edit · <strong>Delete</strong> to clear · 🔒 = not available</span>
              </div>
              {profile.subjects.map(subj=>(
                <SubjectGridTable key={subj.code} subject={subj} progress={progress}
                  onSave={handleGridSave} onClear={handleGridClear}
                  yearRange={{from:subj.yearsRange?.from||globalYearRange.from,to:subj.yearsRange?.to||globalYearRange.to}}/>
              ))}
            </>
          )}
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode==='list'&&(
        <>
          {progress.length>0&&(
            <div className="glass animate-fade-up stagger-2" style={{padding:'14px 18px',borderRadius:'var(--radius-md)',display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
              <div style={{position:'relative',flex:'1 1 180px',minWidth:140}}>
                <Search size={14} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)'}}/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." className="input-field" style={{paddingLeft:34}}/>
              </div>
              <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value as any)} className="input-field" style={{flex:'0 0 auto',width:'auto',padding:'9px 12px',fontSize:13}}>
                <option value="all">All Statuses</option>
                {(Object.entries(STATUS_CONFIG) as [Status,typeof STATUS_CONFIG[Status]][]).map(([val,cfg])=>(
                  <option key={val} value={val}>{cfg.icon} {cfg.label}</option>
                ))}
              </select>
              <select value={sortBy} onChange={e=>setSortBy(e.target.value as any)} className="input-field" style={{flex:'0 0 auto',width:'auto',padding:'9px 12px',fontSize:13}}>
                <option value="date">Date</option>
                <option value="score">Score</option>
                <option value="subject">Subject</option>
              </select>
              {/* Rows / Blocks sub-toggle */}
              <div style={{display:'flex',background:'rgba(255,255,255,0.04)',border:'1px solid var(--border-dim)',borderRadius:8,padding:3,gap:2}}>
                {(['rows','blocks'] as const).map(s=>(
                  <button key={s} onClick={()=>setListStyle(s)}
                    style={{padding:'5px 11px',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer',border:'none',background:listStyle===s?'rgba(124,58,237,0.25)':'transparent',color:listStyle===s?'var(--accent-violet-bright)':'var(--text-muted)',transition:'all 0.15s'}}>
                    {s==='rows'?'≡ Rows':'⊞ Blocks'}
                  </button>
                ))}
              </div>
              {(filterSubject!=='all'||filterStatus!=='all'||search)&&(
                <button className="btn-ghost" style={{padding:'8px 12px',fontSize:12}} onClick={()=>{setFilterSubject('all');setFilterStatus('all');setSearch('');}}><X size={13}/> Clear</button>
              )}
              <span style={{fontSize:12,color:'var(--text-muted)',marginLeft:'auto'}}>{filtered.length} result{filtered.length!==1?'s':''}</span>
            </div>
          )}

          {filtered.length>0?(
            listStyle==='rows'?(
              <div className="glass glow-card animate-fade-up stagger-3" style={{borderRadius:'var(--radius-lg)',overflow:'hidden'}}>
                {filtered.map((entry,i)=>{
                  const subj=profile.subjects.find(s=>s.code===entry.subjectCode);
                  const color=getSubjectColor(entry.subjectCode).hex;
                  const pct=entry.maxScore>0?(entry.score/entry.maxScore)*100:0;
                  const grade=getEntryGrade(entry);
                  const scfg=STATUS_CONFIG[entry.status as Status]||STATUS_CONFIG['done'];
                  return(
                    <div key={entry.id} style={{display:'flex',alignItems:'center',gap:16,padding:'14px 20px',borderBottom:i<filtered.length-1?'1px solid var(--border-dim)':'none',transition:'background 0.15s'}}
                      onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.025)')}
                      onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                      <div style={{width:4,height:40,borderRadius:99,background:color,flexShrink:0,boxShadow:`0 0 8px ${color}80`}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
                          <span style={{fontSize:14,fontWeight:600,color:'var(--text-primary)'}}>{subj?.name||entry.subjectCode}</span>
                          <span style={{fontSize:11,color:'var(--text-muted)'}}>Paper {entry.component}</span>
                          <span style={{fontSize:11,color:'var(--text-muted)'}}>{entry.year} · {SESSION_LABELS[entry.session]||entry.session}</span>
                          <span style={{padding:'2px 8px',borderRadius:99,fontSize:10,fontWeight:600,background:scfg.bg,color:scfg.color}}>{scfg.icon} {scfg.label}</span>
                        </div>
                        <div style={{width:'100%',maxWidth:180}}>
                          <div className="progress-track" style={{height:4}}>
                            <div className="progress-fill" style={{width:`${pct}%`,background:pct>=70?'var(--accent-emerald)':pct>=50?'var(--accent-amber)':'var(--accent-red)'}}/>
                          </div>
                        </div>
                      </div>
                      <div style={{textAlign:'right',flexShrink:0}}>
                        <div style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:800,color:gradeColor(grade)}}>{grade}</div>
                        <div style={{fontSize:11,color:'var(--text-muted)'}}>{entry.score}/{entry.maxScore} ({pct.toFixed(0)}%)</div>
                        <div style={{fontSize:10,color:'var(--text-dim)',marginTop:2}}>{new Date(entry.date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'2-digit'})}</div>
                      </div>
                      <button onClick={()=>onUpdateProgress(progress.filter(e=>e.id!==entry.id))}
                        style={{background:'none',border:'1px solid transparent',borderRadius:8,padding:8,cursor:'pointer',color:'var(--text-dim)',transition:'all 0.15s',flexShrink:0}}
                        onMouseEnter={e=>{e.currentTarget.style.color='var(--accent-red)';e.currentTarget.style.borderColor='rgba(239,68,68,0.2)';e.currentTarget.style.background='rgba(239,68,68,0.08)';}}
                        onMouseLeave={e=>{e.currentTarget.style.color='var(--text-dim)';e.currentTarget.style.borderColor='transparent';e.currentTarget.style.background='none';}}>
                        <Trash2 size={15}/>
                      </button>
                    </div>
                  );
                })}
              </div>
            ):(
              /* BLOCK VIEW */
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:14}} className="animate-fade-up stagger-3">
                {filtered.map((entry,i)=>{
                  const subj=profile.subjects.find(s=>s.code===entry.subjectCode);
                  const color=getSubjectColor(entry.subjectCode).hex;
                  const pct=entry.maxScore>0?(entry.score/entry.maxScore)*100:0;
                  const grade=getEntryGrade(entry);
                  const scfg=STATUS_CONFIG[entry.status as Status]||STATUS_CONFIG['done'];
                  const colors=getCellColors(pct);
                  return(
                    <div key={entry.id} className="grid-card" style={{animationDelay:`${Math.min(i*0.025,0.25)}s`,animation:'fade-up 0.35s both'}}>
                      <div className="grid-card-inner">
                        <div style={{height:3,background:`linear-gradient(90deg,${color},${color}60)`}}/>
                        <div style={{padding:'13px 13px 11px',background:'var(--bg-card)',display:'flex',flexDirection:'column',gap:8}}>
                          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8}}>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:12,fontWeight:700,color:'var(--text-primary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                                {subj?.name?.split(' ').slice(0,3).join(' ')||entry.subjectCode}
                              </div>
                              <div style={{fontSize:10,color:'var(--text-muted)',marginTop:1}}>
                                Paper {entry.component} · {entry.year} · {(SESSION_LABELS[entry.session]||entry.session).slice(0,3)}
                              </div>
                            </div>
                            <div style={{width:38,height:38,borderRadius:9,flexShrink:0,background:colors.bg,border:`1px solid ${colors.border}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                              <span style={{fontFamily:'var(--font-display)',fontSize:15,fontWeight:900,color:colors.text,lineHeight:1}}>{grade}</span>
                            </div>
                          </div>
                          <div>
                            <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'var(--text-muted)',marginBottom:3}}>
                              <span>{entry.score}/{entry.maxScore}</span>
                              <span style={{fontWeight:700,color:colors.text}}>{pct.toFixed(0)}%</span>
                            </div>
                            <div className="progress-track" style={{height:4}}>
                              <div className="progress-fill" style={{width:`${pct}%`,background:colors.text,borderRadius:99}}/>
                            </div>
                          </div>
                          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                            <span style={{padding:'2px 7px',borderRadius:99,fontSize:9,fontWeight:600,background:scfg.bg,color:scfg.color}}>{scfg.icon} {scfg.label}</span>
                            <button onClick={()=>onUpdateProgress(progress.filter(e=>e.id!==entry.id))}
                              style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-dim)',padding:2,lineHeight:1,transition:'color 0.15s'}}
                              onMouseEnter={e=>(e.currentTarget.style.color='var(--accent-red)')}
                              onMouseLeave={e=>(e.currentTarget.style.color='var(--text-dim)')}>
                              <Trash2 size={12}/>
                            </button>
                          </div>
                          <div style={{fontSize:9,color:'var(--text-dim)'}}>{new Date(entry.date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'2-digit'})}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ):(
            <div className="glass animate-fade-up stagger-3" style={{padding:'60px 24px',textAlign:'center',borderRadius:'var(--radius-lg)'}}>
              <div style={{fontSize:48,marginBottom:16}}>📝</div>
              <h3 style={{fontFamily:'var(--font-display)',fontSize:'1.2rem',color:'var(--text-primary)',marginBottom:8}}>
                {progress.length===0?'No papers logged yet':'No papers match your filter'}
              </h3>
              <p style={{color:'var(--text-muted)',fontSize:14,marginBottom:20}}>
                {progress.length===0?'Use Grid view to fill in scores, or Log a Paper above':'Try clearing the filters'}
              </p>
              {progress.length===0&&(
                <div style={{display:'flex',gap:10,justifyContent:'center'}}>
                  <button className="btn-primary" onClick={()=>setShowLogPage(true)}><Plus size={16}/><span>Log a Paper</span></button>
                  <button className="btn-ghost" onClick={()=>setViewMode('grid')}><LayoutGrid size={16}/><span>Grid View</span></button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
