"use client";
import { useState, useCallback, useEffect } from "react";
import { signIn, signOut, useSession } from "next-auth/react";

const DAYS = ["月", "火", "水", "木", "金"];

const DEFAULT_MASTER = [
  { period: 1, start: "08:45", end: "09:35" },
  { period: 2, start: "09:45", end: "10:35" },
  { period: 3, start: "10:45", end: "11:35" },
  { period: 4, start: "11:45", end: "12:35" },
  { period: 5, start: "13:25", end: "14:15" },
  { period: 6, start: "14:25", end: "15:15" },
];
const DEFAULT_TIMETABLE = [
  { day: "月", period: 1, title: "数学", location: "1-A教室", colorId: "9" },
  { day: "火", period: 3, title: "総合学習", location: "多目的室", colorId: "2" },
  { day: "水", period: 4, title: "英語", location: "1-B教室", colorId: "6" },
];

// GoogleカレンダーのcolorId対応表
const GCal_COLORS: { id: string; name: string; hex: string }[] = [
  { id: "1",  name: "ラベンダー", hex: "#7986CB" },
  { id: "2",  name: "セージ",     hex: "#33B679" },
  { id: "3",  name: "ぶどう",     hex: "#8E24AA" },
  { id: "4",  name: "フラミンゴ", hex: "#E67C73" },
  { id: "5",  name: "バナナ",     hex: "#F6BF26" },
  { id: "6",  name: "タンジェリン",hex: "#F4511E" },
  { id: "7",  name: "ピーコック", hex: "#039BE5" },
  { id: "8",  name: "グラファイト",hex: "#616161" },
  { id: "9",  name: "ブルーベリー",hex: "#3F51B5" },
  { id: "10", name: "バジル",     hex: "#0B8043" },
  { id: "11", name: "トマト",     hex: "#D50000" },
];

type Master = { period: number; start: string; end: string };
type Lesson = { day: string; period: number; title: string; location: string; colorId: string };
type TermRange = { label: string; start: string; end: string; selected: boolean };

const TERM_PRESETS: Record<string, { label: string; startMD: string; endMD: string; nextYear?: boolean }[]> = {
  "3学期制": [
    { label: "1学期", startMD: "04-07", endMD: "07-19" },
    { label: "2学期", startMD: "09-01", endMD: "12-24" },
    { label: "3学期", startMD: "01-08", endMD: "03-25", nextYear: true },
  ],
  "2学期制": [
    { label: "前期", startMD: "04-07", endMD: "09-30" },
    { label: "後期", startMD: "10-01", endMD: "03-25", nextYear: true },
  ],
};

function calcTermRanges(termType: string, fy: number): TermRange[] {
  return TERM_PRESETS[termType].map((t) => ({
    label: t.label,
    start: `${t.nextYear ? fy + 1 : fy}-${t.startMD}`,
    end: `${t.nextYear ? fy + 1 : (termType === "2学期制" && t.label === "後期" ? fy + 1 : fy)}-${t.endMD}`,
    selected: false,
  }));
}

const STORAGE_KEY = "timetable_saved";

export default function Home() {
  const { data: session } = useSession();
  const [step, setStep] = useState(0);
  const [master, setMaster] = useState<Master[]>(DEFAULT_MASTER);
  const [timetable, setTimetable] = useState<Lesson[]>(DEFAULT_TIMETABLE);
  const [termType, setTermType] = useState("3学期制");
  const [selectedFY, setSelectedFY] = useState(() => {
    const y = new Date().getFullYear();
    const m = new Date().getMonth() + 1;
    return m >= 2 ? y + 1 : y;
  });
  const [termRanges, setTermRanges] = useState<TermRange[]>(() => {
    const y = new Date().getFullYear();
    const m = new Date().getMonth() + 1;
    const fy = m >= 2 ? y + 1 : y;
    return calcTermRanges("3学期制", fy);
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ count: number; errors: string[] } | null>(null);
  const [hasSaved, setHasSaved] = useState(false);

  // 保存済みデータがあるか確認
  useEffect(() => {
    setHasSaved(!!localStorage.getItem(STORAGE_KEY));
  }, []);

  // ログイン後の状態復元
  useEffect(() => {
    const saved = sessionStorage.getItem("timetable_state");
    if (saved) {
      try {
        const s = JSON.parse(saved);
        if (s.step !== undefined) setStep(s.step);
        if (s.master) setMaster(s.master);
        if (s.timetable) setTimetable(s.timetable);
        if (s.termType) setTermType(s.termType);
        if (s.selectedFY) setSelectedFY(s.selectedFY);
        if (s.termRanges) setTermRanges(s.termRanges);
        sessionStorage.removeItem("timetable_state");
      } catch {}
    }
  }, []);

  const saveAndSignIn = useCallback(() => {
    sessionStorage.setItem("timetable_state", JSON.stringify({
      step, master, timetable, termType, selectedFY, termRanges,
    }));
    signIn("google");
  }, [step, master, timetable, termType, selectedFY, termRanges]);

  // 時間割をlocalStorageに保存
  const saveSettings = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ master, timetable, termType }));
    setHasSaved(true);
    alert("✅ 時間割設定を保存しました！次回から読み込めます。");
  }, [master, timetable, termType]);

  // 保存済み設定を読み込む
  const loadSettings = useCallback(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const s = JSON.parse(saved);
      if (s.master) setMaster(s.master);
      if (s.timetable) setTimetable(s.timetable);
      if (s.termType) setTermType(s.termType);
      alert("✅ 保存済みの時間割設定を読み込みました！");
    } catch {}
  }, []);

  const selectedTerms = termRanges.filter(t => t.selected);
  const totalWeeks = selectedTerms.reduce((acc, t) => {
    return acc + Math.max(1, Math.round(
      (new Date(t.end).getTime() - new Date(t.start).getTime()) / (7 * 24 * 60 * 60 * 1000)
    ));
  }, 0);
  const estimatedEvents = timetable.length * totalWeeks;

  const handleRegister = useCallback(async () => {
    if (selectedTerms.length === 0) {
      alert("学期を1つ以上選択してください");
      return;
    }
    setLoading(true);
    setResult(null);
    let totalCount = 0;
    const allErrors: string[] = [];

    for (const term of selectedTerms) {
      try {
        const res = await fetch("/api/register-calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            timeMaster: master,
            holidays: [],
            timetable,
            semesterStart: term.start,
            semesterEnd: term.end,
            accessToken: (session as any)?.accessToken,
          }),
        });
        const data = await res.json();
        totalCount += data.count || 0;
        if (data.errors) allErrors.push(...data.errors);
      } catch {
        allErrors.push(`${term.label}の登録中に通信エラーが発生しました`);
      }
    }
    setResult({ count: totalCount, errors: allErrors });
    setLoading(false);
  }, [master, timetable, selectedTerms, session]);

  const stepLabels = ["時限マスタ", "時間割", "学期選択・登録"];
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const currentFY = currentMonth >= 2 ? currentYear : currentYear - 1;
  const years = [currentFY, currentFY + 1, currentFY + 2];

  return (
    <main style={s.main}>
      <div style={s.container}>

        {/* ヘッダー */}
        <div style={s.header}>
          <div>
            <h1 style={s.title}>時間割カレンダー登録</h1>
            <p style={s.subtitle}>時間割をGoogleカレンダーに一括登録</p>
          </div>
          {session && (
            <div style={s.userRow}>
              <span style={s.userEmail}>{session.user?.email}</span>
              <button style={s.outlineBtn} onClick={() => signOut()}>ログアウト</button>
            </div>
          )}
        </div>

        {/* ステップナビ */}
        <div style={s.stepRow}>
          {stepLabels.map((label, i) => (
            <button key={i}
              style={{ ...s.stepBtn, ...(i === step ? s.stepActive : {}), ...(i < step ? s.stepDone : {}) }}
              onClick={() => setStep(i)}>
              <span style={{ ...s.stepNum, ...(i === step ? s.stepNumActive : {}), ...(i < step ? s.stepNumDone : {}) }}>
                {i < step ? "✓" : i + 1}
              </span>
              <span style={s.stepLabel}>{label}</span>
            </button>
          ))}
        </div>

        {/* STEP 1: 時限マスタ */}
        {step === 0 && (
          <div>
            <div style={s.topBar}>
              <p style={s.note}>各時限の開始・終了時刻を設定してください</p>
              <div style={{display:"flex",gap:8}}>
                {hasSaved && (
                  <button style={s.loadBtn} onClick={loadSettings}>📂 前回の設定を読み込む</button>
                )}
                <button style={s.saveBtn} onClick={saveSettings}>💾 設定を保存</button>
              </div>
            </div>
            <div style={s.card}>
              <table style={s.table}>
                <thead>
                  <tr>{["時限","開始","終了",""].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {master.map((row, i) => (
                    <tr key={i}>
                      <td style={s.td}><span style={s.badge}>{row.period}限</span></td>
                      <td style={s.td}>
                        <input type="time" value={row.start} style={s.timeInput}
                          onChange={e => { const n=[...master]; n[i]={...n[i],start:e.target.value}; setMaster(n); }} />
                      </td>
                      <td style={s.td}>
                        <input type="time" value={row.end} style={s.timeInput}
                          onChange={e => { const n=[...master]; n[i]={...n[i],end:e.target.value}; setMaster(n); }} />
                      </td>
                      <td style={s.td}>
                        <button style={s.removeBtn} onClick={() => setMaster(master.filter((_,j)=>j!==i))}>×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button style={s.addBtn} onClick={() => setMaster([...master,{period:master.length+1,start:"",end:""}])}>
                + 時限を追加
              </button>
            </div>
            <div style={s.navRow}><div/><button style={s.primaryBtn} onClick={()=>setStep(1)}>次へ →</button></div>
          </div>
        )}

        {/* STEP 2: 時間割 */}
        {step === 1 && (
          <div>
            <div style={s.topBar}>
              <p style={s.note}>授業の曜日・時限・名前・場所を入力してください</p>
              <div style={{display:"flex",gap:8}}>
                {hasSaved && (
                  <button style={s.loadBtn} onClick={loadSettings}>📂 前回の設定を読み込む</button>
                )}
                <button style={s.saveBtn} onClick={saveSettings}>💾 設定を保存</button>
              </div>
            </div>
            <div style={s.card}>
              <table style={s.table}>
                <thead>
                  <tr>{["曜日","時限","授業名","場所","色",""].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {timetable.map((row,i) => (
                    <tr key={i}>
                      <td style={s.td}>
                        <select value={row.day} style={s.selectInput}
                          onChange={e=>{const n=[...timetable];n[i]={...n[i],day:e.target.value};setTimetable(n);}}>
                          {DAYS.map(d=><option key={d}>{d}</option>)}
                        </select>
                      </td>
                      <td style={s.td}>
                        <select value={row.period} style={s.selectInput}
                          onChange={e=>{const n=[...timetable];n[i]={...n[i],period:Number(e.target.value)};setTimetable(n);}}>
                          {master.map(m=><option key={m.period} value={m.period}>{m.period}限</option>)}
                        </select>
                      </td>
                      <td style={s.td}><input type="text" value={row.title} placeholder="授業名" style={s.textInput}
                        onChange={e=>{const n=[...timetable];n[i]={...n[i],title:e.target.value};setTimetable(n);}}/></td>
                      <td style={s.td}><input type="text" value={row.location} placeholder="教室" style={s.textInput}
                        onChange={e=>{const n=[...timetable];n[i]={...n[i],location:e.target.value};setTimetable(n);}}/></td>
                      <td style={s.td}>
                        <ColorPicker value={row.colorId} onChange={colorId=>{const n=[...timetable];n[i]={...n[i],colorId};setTimetable(n);}}/>
                      </td>
                      <td style={s.td}><button style={s.removeBtn} onClick={()=>setTimetable(timetable.filter((_,j)=>j!==i))}>×</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button style={s.addBtn} onClick={()=>setTimetable([...timetable,{day:"月",period:1,title:"",location:"",colorId:"7"}])}>
                + 授業を追加
              </button>
            </div>
            <div style={s.navRow}>
              <button style={s.outlineBtn} onClick={()=>setStep(0)}>← 戻る</button>
              <button style={s.primaryBtn} onClick={()=>setStep(2)}>次へ →</button>
            </div>
          </div>
        )}

        {/* STEP 3: 学期選択・登録 */}
        {step === 2 && (
          <div>
            <p style={s.note}>登録する年度と学期を選択してGoogleカレンダーに登録します</p>

            {/* 年度・学期制選択 */}
            <div style={s.card}>
              <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}}>
                <div>
                  <label style={s.label}>学期制</label>
                  <select value={termType} style={s.selectInput}
                    onChange={e => {
                      setTermType(e.target.value);
                      const ranges = calcTermRanges(e.target.value, selectedFY);
                      setTermRanges(ranges);
                    }}>
                    <option>3学期制</option>
                    <option>2学期制</option>
                  </select>
                </div>
                <div>
                  <label style={s.label}>年度</label>
                  <select value={selectedFY} style={s.selectInput}
                    onChange={e => {
                      const fy = Number(e.target.value);
                      setSelectedFY(fy);
                      const ranges = calcTermRanges(termType, fy);
                      setTermRanges(ranges);
                    }}>
                    {years.map(y => <option key={y} value={y}>{y}年度</option>)}
                  </select>
                </div>
              </div>

              {/* 学期チェックボックス */}
              <label style={{...s.label, marginBottom:8}}>登録する学期を選択（複数選択可・期間は手動調整可）</label>
              <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:10}}>
                {termRanges.map((t, i) => (
                  <button key={i}
                    style={{
                      padding:"10px 18px", border:"1.5px solid", borderRadius:8, fontSize:13, cursor:"pointer",
                      borderColor: t.selected ? "#378ADD" : "#e0ddd6",
                      background: t.selected ? "#EBF4FD" : "#fafaf8",
                      color: t.selected ? "#185FA5" : "#555",
                      fontWeight: t.selected ? 500 : 400,
                      textAlign:"left" as const,
                    }}
                    onClick={() => {
                      const n = [...termRanges];
                      n[i] = { ...n[i], selected: !n[i].selected };
                      setTermRanges(n);
                    }}>
                    <div style={{fontWeight:500}}>{t.label}</div>
                    <div style={{fontSize:11,color: t.selected ? "#378ADD" : "#aaa", marginTop:2}}>{t.start} 〜 {t.end}</div>
                  </button>
                ))}
                <button
                  style={{padding:"10px 18px",border:"1px dashed #b5d4f4",borderRadius:8,fontSize:13,cursor:"pointer",background:"none",color:"#378ADD"}}
                  onClick={() => setTermRanges(termRanges.map(t => ({ ...t, selected: true })))}>
                  すべて選択
                </button>
              </div>

              {/* 選択中の学期の期間を手動調整 */}
              {termRanges.some(t => t.selected) && (
                <div style={{borderTop:"1px solid #f0ede6", paddingTop:14, marginTop:4}}>
                  <label style={{...s.label, marginBottom:10}}>選択中の学期の期間を調整</label>
                  {termRanges.filter(t => t.selected).map((t) => {
                    const i = termRanges.findIndex(r => r.label === t.label);
                    return (
                      <div key={t.label} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,flexWrap:"wrap" as const}}>
                        <span style={{...s.badge, minWidth:48, textAlign:"center" as const}}>{t.label}</span>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <input type="date" value={t.start} style={s.dateInput}
                            onChange={e => {
                              const n = [...termRanges];
                              n[i] = { ...n[i], start: e.target.value };
                              setTermRanges(n);
                            }} />
                          <span style={{fontSize:12,color:"#aaa"}}>〜</span>
                          <input type="date" value={t.end} style={s.dateInput}
                            onChange={e => {
                              const n = [...termRanges];
                              n[i] = { ...n[i], end: e.target.value };
                              setTermRanges(n);
                            }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* サマリー */}
            {selectedTerms.length > 0 && (
              <div style={s.summaryGrid}>
                {[
                  { label: "選択学期数", value: selectedTerms.length },
                  { label: "登録予定週数", value: totalWeeks },
                  { label: "登録予定件数", value: estimatedEvents },
                ].map(item => (
                  <div key={item.label} style={s.summaryCard}>
                    <div style={s.summaryNum}>{item.value}</div>
                    <div style={s.summaryLbl}>{item.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* ログイン・登録 */}
            <div style={s.card}>
              {!session ? (
                <>
                  <p style={s.cardNote}>Googleアカウントでログインしてカレンダーに登録します</p>
                  <button style={s.googleBtn} onClick={saveAndSignIn}>
                    <GoogleIcon /> Googleアカウントでログイン
                  </button>
                </>
              ) : (
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={s.greenBadge}>ログイン済み</span>
                  <span style={{fontSize:13,color:"#666"}}>{session.user?.email}</span>
                </div>
              )}
            </div>

            {result && (
              <div style={result.errors.length === 0 ? s.successBox : s.errorBox}>
                {result.errors.length === 0 ? (
                  <p>✅ {result.count}件のイベントを登録しました！Googleカレンダーを確認してください。</p>
                ) : (
                  <>
                    <p>⚠️ {result.count}件登録完了。エラー {result.errors.length}件:</p>
                    {result.errors.map((e,i)=><p key={i} style={{fontSize:12,marginTop:4}}>{e}</p>)}
                  </>
                )}
              </div>
            )}

            <button
              style={{...s.registerBtn,...(!session||loading||selectedTerms.length===0?s.registerDisabled:{})}}
              disabled={!session || loading || selectedTerms.length === 0}
              onClick={handleRegister}>
              {loading ? "登録中..." : `Googleカレンダーに登録する${selectedTerms.length > 1 ? `（${selectedTerms.length}学期分）` : ""}`}
            </button>
            <p style={s.hint}>登録後はGoogleカレンダーアプリから確認できます</p>

            <div style={s.navRow}>
              <button style={s.outlineBtn} onClick={()=>setStep(1)}>← 戻る</button>
              <div/>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}


// カラーピッカーコンポーネント
function ColorPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const current = GCal_COLORS.find(c => c.id === value) || GCal_COLORS[0];

  return (
    <div style={{position:"relative",display:"inline-block"}}>
      <button
        title={current.name}
        onClick={() => setOpen(!open)}
        style={{
          width:28, height:28, borderRadius:"50%",
          background: current.hex,
          border: "2px solid #fff",
          boxShadow: "0 0 0 1.5px " + current.hex,
          cursor:"pointer", display:"block",
        }}
      />
      {open && (
        <div style={{
          position:"absolute", top:34, right:0, left:"auto", zIndex:100,
          background:"#fff", border:"1px solid #e0ddd6",
          borderRadius:10, padding:8,
          display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6,
          boxShadow:"0 4px 16px rgba(0,0,0,0.12)", width:148,
        }}>
          {GCal_COLORS.map(c => (
            <button key={c.id} title={c.name}
              onClick={() => { onChange(c.id); setOpen(false); }}
              style={{
                width:28, height:28, borderRadius:"50%",
                background: c.hex,
                border: value === c.id ? "2px solid #1a1a1a" : "2px solid #fff",
                boxShadow: "0 0 0 1px " + c.hex,
                cursor:"pointer",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" style={{flexShrink:0}}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

const s: Record<string, React.CSSProperties> = {
  main: { minHeight:"100vh", background:"#f5f4f0", fontFamily:"'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif", padding:"2rem 1rem" },
  container: { maxWidth:740, margin:"0 auto" },
  header: { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"2rem" },
  title: { fontSize:26, fontWeight:600, color:"#1a1a1a", letterSpacing:"-0.02em", margin:0 },
  subtitle: { fontSize:14, color:"#888", marginTop:4, marginBottom:0 },
  userRow: { display:"flex", alignItems:"center", gap:10 },
  userEmail: { fontSize:13, color:"#666" },
  stepRow: { display:"flex", marginBottom:"1.75rem", border:"1px solid #e0ddd6", borderRadius:10, overflow:"hidden", background:"#fff" },
  stepBtn: { flex:1, padding:"10px 6px", background:"transparent", border:"none", borderRight:"1px solid #e0ddd6", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6, color:"#aaa", fontSize:13 },
  stepActive: { background:"#fff", color:"#1a1a1a", fontWeight:500 },
  stepDone: { color:"#3B6D11" },
  stepNum: { width:20, height:20, borderRadius:"50%", background:"#e0ddd6", fontSize:11, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:500, color:"#888", flexShrink:0 },
  stepNumActive: { background:"#378ADD", color:"#fff" },
  stepNumDone: { background:"#639922", color:"#fff" },
  stepLabel: { fontSize:13 },
  topBar: { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, flexWrap:"wrap" as const, gap:8 },
  note: { fontSize:13, color:"#888", margin:0 },
  saveBtn: { padding:"6px 14px", background:"#fff", border:"1px solid #e0ddd6", borderRadius:6, fontSize:12, cursor:"pointer", color:"#555" },
  loadBtn: { padding:"6px 14px", background:"#EAF3DE", border:"1px solid #C0DD97", borderRadius:6, fontSize:12, cursor:"pointer", color:"#3B6D11" },
  card: { background:"#fff", border:"1px solid #e0ddd6", borderRadius:12, padding:"1.25rem", marginBottom:"1rem", overflowX:"auto" },
  table: { width:"100%", borderCollapse:"collapse", fontSize:14 },
  th: { fontWeight:500, fontSize:12, color:"#888", textAlign:"left", padding:"6px 8px", borderBottom:"1px solid #f0ede6" },
  td: { padding:"6px 6px", borderBottom:"1px solid #f5f4f0", verticalAlign:"middle" },
  badge: { background:"#EAF3DE", color:"#3B6D11", fontSize:12, padding:"3px 10px", borderRadius:99, fontWeight:500 },
  timeInput: { padding:"6px 8px", border:"1px solid #e0ddd6", borderRadius:6, fontSize:13, background:"#fafaf8", color:"#1a1a1a", width:110 },
  dateInput: { padding:"6px 8px", border:"1px solid #e0ddd6", borderRadius:6, fontSize:13, background:"#fafaf8", color:"#1a1a1a", width:150 },
  textInput: { padding:"6px 8px", border:"1px solid #e0ddd6", borderRadius:6, fontSize:13, background:"#fafaf8", color:"#1a1a1a", width:"100%" },
  selectInput: { padding:"6px 8px", border:"1px solid #e0ddd6", borderRadius:6, fontSize:13, background:"#fafaf8", color:"#1a1a1a" },
  removeBtn: { background:"none", border:"none", color:"#E24B4A", cursor:"pointer", fontSize:16, padding:"0 4px", lineHeight:1 },
  addBtn: { marginTop:10, width:"100%", padding:"8px", background:"none", border:"1px dashed #b5d4f4", borderRadius:6, color:"#378ADD", fontSize:13, cursor:"pointer" },
  navRow: { display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:"1.25rem" },
  primaryBtn: { background:"#378ADD", color:"#fff", border:"none", borderRadius:8, padding:"10px 24px", fontSize:14, fontWeight:500, cursor:"pointer" },
  outlineBtn: { background:"#fff", color:"#666", border:"1px solid #e0ddd6", borderRadius:8, padding:"9px 18px", fontSize:13, cursor:"pointer" },
  label: { fontSize:12, color:"#888", display:"block", marginBottom:4 },
  summaryGrid: { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:"1rem" },
  summaryCard: { background:"#fff", border:"1px solid #e0ddd6", borderRadius:10, padding:"1rem", textAlign:"center" },
  summaryNum: { fontSize:28, fontWeight:600, color:"#1a1a1a" },
  summaryLbl: { fontSize:12, color:"#888", marginTop:3 },
  cardNote: { fontSize:13, color:"#888", marginBottom:12 },
  googleBtn: { display:"flex", alignItems:"center", justifyContent:"center", gap:10, width:"100%", padding:"12px", border:"1px solid #e0ddd6", borderRadius:8, background:"#fff", fontSize:14, fontWeight:500, cursor:"pointer", color:"#1a1a1a" },
  greenBadge: { background:"#EAF3DE", color:"#3B6D11", fontSize:12, padding:"4px 12px", borderRadius:99, fontWeight:500 },
  successBox: { background:"#EAF3DE", border:"1px solid #C0DD97", borderRadius:8, padding:"12px 16px", marginBottom:"1rem", fontSize:14, color:"#3B6D11" },
  errorBox: { background:"#FCEBEB", border:"1px solid #F7C1C1", borderRadius:8, padding:"12px 16px", marginBottom:"1rem", fontSize:14, color:"#A32D2D" },
  registerBtn: { width:"100%", padding:"14px", background:"#378ADD", color:"#fff", border:"none", borderRadius:10, fontSize:15, fontWeight:500, cursor:"pointer" },
  registerDisabled: { background:"#e0ddd6", color:"#aaa", cursor:"not-allowed" },
  hint: { fontSize:12, color:"#aaa", textAlign:"center", marginTop:8 },
};
