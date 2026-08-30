import React, { useMemo, useState, useEffect } from "react";
import {
  Home, Shield, Trophy, CalendarDays, Upload, Settings, Plus, Trash2,
  ChevronRight, X, Menu, BarChart2, Crosshair, Share2, Hand,
  ShieldCheck, RotateCcw, Radio
} from "lucide-react";
import { parseMatchHTML, successCount } from "./lib/parseMatch.js";

// Kod her güncellendiğinde bu sürümü artır — tarayıcıdaki eski localStorage
// verisi otomatik temizlenir ve yeni demo veriler yüklenir.
const DATA_VERSION = "4";

const INITIAL_TEAMS = [
  { id: "1", name: "BizSiz FC" },
  { id: "2", name: "Hamam Zalisko" },
  { id: "3", name: "Metospor FK" },
  { id: "4", name: "Winchester City FC" },
  { id: "5", name: "Relentless" },
  { id: "6", name: "Noroshi" },
  { id: "7", name: "Abyss FK" },
  { id: "8", name: "Nexorian" }
];

const INITIAL_FIXTURES = [
  { id: "f1", date: "Tamamlandı", home: "BizSiz FC", away: "Hamam Zalisko", status: "Tamamlandı", matchId: "sample-1" },
  { id: "f2", date: "Yakında", home: "Metospor FK", away: "Winchester City FC", status: "Yakında" },
  { id: "f3", date: "Yakında", home: "Relentless", away: "Noroshi", status: "Yakında" },
  { id: "f4", date: "Yakında", home: "Abyss FK", away: "Nexorian", status: "Yakında" }
];

const INITIAL_MATCHES = {
  "sample-1": {
    id: "sample-1",
    stadium: "L_OddshotStadium_Large",
    homeTeam: "BizSiz FC",
    awayTeam: "Hamam Zalisko",
    homeScore: 8,
    awayScore: 6,
    resultText: "BIZSIZ FC KAZANDI",
    periods: [
      { label: "1Y", score: "3-2" },
      { label: "2Y", score: "5-4" },
      { label: "Süre", score: "20:00" }
    ],
    leaders: [
      { type: "h-home", label: "Gol Kralı", formula: "En çok gol", value: "6", name: "Olise", team: "BizSiz FC" },
      { type: "h-away", label: "Asist Lideri", formula: "En çok asist", value: "5", name: "shade", team: "Hamam Zalisko" },
      { type: "h-away", label: "En İyi Defans", formula: "Ayak + kayma müdahale (başarılı)", value: "3", name: "coknogayim", team: "Hamam Zalisko" },
      { type: "h-away", label: "En İyi Kaleci", formula: "Defans + yakalama", value: "6", name: "Lyrinx03", team: "Hamam Zalisko" }
    ],
    homePlayers: [
      { name: "Olise", g: 6, a: 2, pass: 22, foot: "1/20", slide: "0/1", def: 0, catch: 0 },
      { name: "Artvinli Leandro Trossard", g: 1, a: 4, pass: 7, foot: "0/20", slide: "0/4", def: 0, catch: 0 },
      { name: "Keyne", g: 1, a: 0, pass: 3, foot: "1/5", slide: "0/0", def: 0, catch: 0 },
      { name: "Wonky", g: 0, a: 2, pass: 21, foot: "0/36", slide: "0/4", def: 0, catch: 0 },
      { name: "dirois", g: 0, a: 0, pass: 20, foot: "0/18", slide: "0/5", def: 0, catch: 0 },
      { name: "SoulN1", g: 0, a: 0, pass: 11, foot: "0/28", slide: "0/6", def: 0, catch: 0 },
      { name: "B1UESTR", g: 0, a: 0, pass: 12, foot: "0/0", slide: "0/0", def: 1, catch: 4 }
    ],
    awayPlayers: [
      { name: "AlienAstro", g: 4, a: 0, pass: 16, foot: "2/12", slide: "0/1", def: 0, catch: 0 },
      { name: "xaron", g: 2, a: 0, pass: 14, foot: "1/24", slide: "0/1", def: 0, catch: 0 },
      { name: "coknogayim", g: 0, a: 0, pass: 17, foot: "3/21", slide: "0/0", def: 0, catch: 0 },
      { name: "shade", g: 0, a: 5, pass: 22, foot: "0/13", slide: "2/19", def: 0, catch: 0 },
      { name: "yixzy", g: 0, a: 1, pass: 7, foot: "3/18", slide: "0/5", def: 0, catch: 0 },
      { name: "Lyrinx03", g: 0, a: 0, pass: 13, foot: "0/0", slide: "0/0", def: 4, catch: 2 }
    ]
  }
};

// ---------- Depolama yardımcıları ----------
function bootstrapStorage() {
  try {
    if (localStorage.getItem("asl_version") !== DATA_VERSION) {
      ["asl_teams", "asl_fixtures", "asl_matches"].forEach(k => localStorage.removeItem(k));
      localStorage.setItem("asl_version", DATA_VERSION);
    }
  } catch { /* localStorage kullanılamıyorsa sessizce geç */ }
}

function readStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

// ---------- Ana uygulama ----------
export default function App() {
  bootstrapStorage();

  const [page, setPage] = useState("home");
  const [open, setOpen] = useState(false);
  const [activeMatchId, setActiveMatchId] = useState(null);

  const [teams, setTeams] = useState(() => readStorage("asl_teams", INITIAL_TEAMS));
  const [fixtures, setFixtures] = useState(() => readStorage("asl_fixtures", INITIAL_FIXTURES));
  const [matches, setMatches] = useState(() => readStorage("asl_matches", INITIAL_MATCHES));

  useEffect(() => { localStorage.setItem("asl_teams", JSON.stringify(teams)); }, [teams]);
  useEffect(() => { localStorage.setItem("asl_fixtures", JSON.stringify(fixtures)); }, [fixtures]);
  useEffect(() => { localStorage.setItem("asl_matches", JSON.stringify(matches)); }, [matches]);

  // ---- Puan durumu (otomatik) ----
  const standings = useMemo(() => {
    const stats = {};
    teams.forEach(t => {
      stats[t.name] = { name: t.name, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
    });
    Object.values(matches).forEach(m => {
      const h = stats[m.homeTeam] || (stats[m.homeTeam] = { name: m.homeTeam, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, gd: 0, pts: 0 });
      const a = stats[m.awayTeam] || (stats[m.awayTeam] = { name: m.awayTeam, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, gd: 0, pts: 0 });
      h.played += 1; a.played += 1;
      h.gf += m.homeScore; h.ga += m.awayScore;
      a.gf += m.awayScore; a.ga += m.homeScore;
      if (m.homeScore > m.awayScore) { h.wins += 1; h.pts += 3; a.losses += 1; }
      else if (m.homeScore < m.awayScore) { a.wins += 1; a.pts += 3; h.losses += 1; }
      else { h.draws += 1; h.pts += 1; a.draws += 1; a.pts += 1; }
      h.gd = h.gf - h.ga; a.gd = a.gf - a.ga;
    });
    return Object.values(stats).sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf);
  }, [teams, matches]);

  // ---- Oyuncu istatistikleri (tüm maçlar toplanarak, otomatik) ----
  const playerStats = useMemo(() => {
    const map = {};
    Object.values(matches).forEach(m => {
      const addAll = (players, team) => (players || []).forEach(p => {
        const key = `${p.name}__${team}`;
        if (!map[key]) map[key] = { name: p.name, team, mp: 0, g: 0, a: 0, tackles: 0, saves: 0 };
        const r = map[key];
        r.mp += 1;
        r.g += p.g || 0;
        r.a += p.a || 0;
        r.tackles += successCount(p.foot) + successCount(p.slide);
        r.saves += (p.def || 0) + (p.catch || 0);
      });
      addAll(m.homePlayers, m.homeTeam);
      addAll(m.awayPlayers, m.awayTeam);
    });
    return Object.values(map);
  }, [matches]);

  const nav = [
    ["home", "Ana Sayfa", Home],
    ["teams", "Takımlar", Shield],
    ["standings", "Puan Durumu", Trophy],
    ["fixtures", "Fikstür", CalendarDays],
    ["stats", "Oyuncu İstatistikleri", BarChart2],
    ["admin", "Yönetim", Settings]
  ];

  const go = p => { setPage(p); setOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const handleMatchUpload = parsedMatch => {
    setMatches(prev => ({ ...prev, [parsedMatch.id]: parsedMatch }));
    setFixtures(prev => {
      const idx = prev.findIndex(f =>
        (f.home === parsedMatch.homeTeam && f.away === parsedMatch.awayTeam) ||
        (f.home === parsedMatch.awayTeam && f.away === parsedMatch.homeTeam)
      );
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], status: `${parsedMatch.homeScore} - ${parsedMatch.awayScore}`, matchId: parsedMatch.id, date: "Tamamlandı" };
        return updated;
      }
      return [{ id: `f_${Date.now()}`, date: "Tamamlandı", home: parsedMatch.homeTeam, away: parsedMatch.awayTeam, status: `${parsedMatch.homeScore} - ${parsedMatch.awayScore}`, matchId: parsedMatch.id }, ...prev];
    });
    setActiveMatchId(parsedMatch.id);
    go("matchDetail");
  };

  const resetAllData = () => {
    if (!window.confirm("Tüm takımlar, fikstür ve maç verileri silinip demo veriyle değiştirilecek. Emin misin?")) return;
    localStorage.removeItem("asl_teams");
    localStorage.removeItem("asl_fixtures");
    localStorage.removeItem("asl_matches");
    setTeams(INITIAL_TEAMS);
    setFixtures(INITIAL_FIXTURES);
    setMatches(INITIAL_MATCHES);
  };

  return (
    <div className="app">
      <header>
        <div className="nav wrap">
          <button className="brand" onClick={() => go("home")}>
            <img className="brandMark" src="/logo.png" alt="ASL amblemi" />
            <span><b>ASL Hub</b><small>Anadolu Strikers Ligi</small></span>
          </button>
          <button className="mobile" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
          <nav className={open ? "show" : ""}>
            {nav.map(([id, label, Icon]) => (
              <button className={page === id ? "active" : ""} onClick={() => go(id)} key={id}><Icon size={16} />{label}</button>
            ))}
          </nav>
        </div>
      </header>

      <main className="wrap">
        {page === "home" && (
          <HomePage go={go} teams={teams} fixtures={fixtures} matches={matches} standings={standings} playerStats={playerStats} />
        )}

        {page === "teams" && <TeamsPage teams={teams} standings={standings} />}

        {page === "standings" && <StandingsPage standings={standings} />}

        {page === "fixtures" && (
          <FixturesPage fixtures={fixtures} onOpenMatch={id => { setActiveMatchId(id); go("matchDetail"); }} />
        )}

        {page === "stats" && <PlayerStatsPage playerStats={playerStats} />}

        {page === "admin" && (
          <AdminPanel teams={teams} setTeams={setTeams} fixtures={fixtures} setFixtures={setFixtures} onUpload={handleMatchUpload} onReset={resetAllData} />
        )}

        {page === "matchDetail" && activeMatchId && matches[activeMatchId] && (
          <MatchDetail match={matches[activeMatchId]} goBack={() => go("fixtures")} />
        )}
      </main>

      <footer><div className="wrap">© 2026 Anadolu Strikers Ligi <span>ASL Hub</span></div></footer>
    </div>
  );
}

// ---------- Canlı skor şeridi (imza öğesi) ----------
function Ticker({ fixtures }) {
  const finished = fixtures.filter(f => f.matchId || /\d+\s*-\s*\d+/.test(f.status || ""));
  if (!finished.length) return null;
  const loop = [...finished, ...finished, ...finished];
  return (
    <div className="ticker">
      <div className="tickerLabel"><Radio size={12} /> SON SONUÇLAR</div>
      <div className="tickerTrack">
        {loop.map((f, i) => (
          <span className="tickerItem" key={i}>
            <b>{f.home}</b><em>{f.status}</em><b>{f.away}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------- Ana sayfa ----------
function HomePage({ go, teams, fixtures, matches, standings, playerStats }) {
  const matchList = Object.values(matches);
  const totalGoals = matchList.reduce((s, m) => s + m.homeScore + m.awayScore, 0);
  const topScorer = [...playerStats].sort((a, b) => b.g - a.g)[0];
  const upcoming = fixtures.filter(f => !f.matchId && !/\d+\s*-\s*\d+/.test(f.status || "")).slice(0, 3);

  return (
    <>
      <section className="hero">
        <div className="heroText">
          <div className="pill">⚽ TÜRKİYE MERKEZLİ STRIKERS LİGİ · SEZON 2026</div>
          <h1>Anadolu<br /><span>Strikers Ligi</span></h1>
          <p>ASL, Strikers topluluğunun Türkiye merkezli rekabet ortamıdır. Maçları, takımları, fikstürü ve oyuncu istatistiklerini tek yerde takip et.</p>
          <div className="actions">
            <button className="primary" onClick={() => go("fixtures")}>Fikstürü Görüntüle <ChevronRight size={18} /></button>
            <button onClick={() => go("stats")}>Oyuncu İstatistikleri <BarChart2 size={18} /></button>
          </div>
        </div>
        <div className="heroCard">
          <img className="heroCrest" src="/logo.png" alt="Anadolu Strikers Ligi amblemi" />
          <div><b>ANADOLU STRIKERS LİGİ</b><small>SEZON 2026</small></div>
        </div>
      </section>

      <Ticker fixtures={fixtures} />

      <section className="quickStats">
        <div className="qs"><b>{teams.length}</b><span>Takım</span></div>
        <div className="qs"><b>{matchList.length}</b><span>Oynanan Maç</span></div>
        <div className="qs"><b>{totalGoals}</b><span>Toplam Gol</span></div>
        <div className="qs"><b>{topScorer ? topScorer.g : "–"}</b><span>{topScorer ? `Gol Kralı: ${topScorer.name}` : "Gol Kralı"}</span></div>
      </section>

      <section className="homeGrid">
        <div className="homeCol">
          <div className="homeColHead"><h2>Puan Durumu</h2><button className="linkBtn" onClick={() => go("standings")}>Tümünü Gör <ChevronRight size={14} /></button></div>
          <div className="tableCard">
            <div className="tableScroll">
              <table>
                <thead><tr><th>#</th><th>Takım</th><th>O</th><th>AV</th><th>PTS</th></tr></thead>
                <tbody>
                  {standings.slice(0, 5).map((t, i) => (
                    <tr key={t.name}><td>{i + 1}</td><td><b>{t.name}</b></td><td>{t.played}</td><td>{t.gd}</td><td><strong>{t.pts}</strong></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="homeCol">
          <div className="homeColHead"><h2>Yaklaşan Maçlar</h2><button className="linkBtn" onClick={() => go("fixtures")}>Tümünü Gör <ChevronRight size={14} /></button></div>
          <div className="fixtureGrid">
            {upcoming.length === 0 && <p className="emptyNote">Şu an planlanmış yaklaşan maç yok.</p>}
            {upcoming.map(f => (
              <div className="fixture" key={f.id}>
                <span className="date">{f.date}</span>
                <div className="match"><b>{f.home}</b><span className="scoreBadge">{f.status}</span><b>{f.away}</b></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

// ---------- Takımlar ----------
function TeamsPage({ teams, standings }) {
  const byName = useMemo(() => Object.fromEntries(standings.map(s => [s.name, s])), [standings]);
  return (
    <Section title="Takımlar" subtitle="Anadolu Strikers Ligi'nde mücadele eden ekipler.">
      <div className="teamGrid">
        {teams.map(t => <TeamCard key={t.id} team={t} record={byName[t.name]} />)}
      </div>
    </Section>
  );
}

function TeamCard({ team, record }) {
  return (
    <article className="team">
      <div className="logo">{team.name.split(" ").map(x => x[0]).join("").slice(0, 3)}</div>
      <div className="teamInfo">
        <h3>{team.name}</h3>
        {record
          ? <span>{record.played} maç · {record.wins}G {record.draws}B {record.losses}M</span>
          : <span>Henüz maç oynanmadı</span>}
      </div>
      <ChevronRight />
    </article>
  );
}

// ---------- Puan durumu ----------
function StandingsPage({ standings }) {
  return (
    <Section title="Puan Durumu" subtitle="Oynanan maçlara göre otomatik güncellenen lig sıralaması.">
      <div className="tableCard">
        <div className="tableScroll">
          <table>
            <thead><tr><th>#</th><th>Takım</th><th>O</th><th>G</th><th>B</th><th>M</th><th>AG</th><th>YG</th><th>AV</th><th>PTS</th></tr></thead>
            <tbody>
              {standings.map((t, i) => (
                <tr key={t.name}>
                  <td>{i + 1}</td><td><b>{t.name}</b></td><td>{t.played}</td><td>{t.wins}</td><td>{t.draws}</td><td>{t.losses}</td>
                  <td>{t.gf}</td><td>{t.ga}</td><td>{t.gd}</td><td><strong>{t.pts}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Section>
  );
}

// ---------- Fikstür ----------
function FixturesPage({ fixtures, onOpenMatch }) {
  const [filter, setFilter] = useState("Tümü");
  const isDone = f => Boolean(f.matchId) || /\d+\s*-\s*\d+/.test(f.status || "");
  const rows = fixtures.filter(f => filter === "Tümü" ? true : filter === "Tamamlanan" ? isDone(f) : !isDone(f));

  return (
    <Section title="Fikstür & Sonuçlar" subtitle="Maç programı ve detaylı maç istatistikleri.">
      <div className="tabRow">
        {["Tümü", "Tamamlanan", "Yaklaşan"].map(f => (
          <button key={f} className={filter === f ? "tab active" : "tab"} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>
      <div className="fixtureGrid">
        {rows.length === 0 && <p className="emptyNote">Bu filtreye uyan maç yok.</p>}
        {rows.map((f, i) => (
          <div className={`fixture ${f.matchId ? "clickable" : ""}`} key={f.id || i} onClick={() => f.matchId && onOpenMatch(f.matchId)}>
            <span className="date">{f.date}</span>
            <div className="match"><b>{f.home}</b><span className="scoreBadge">{f.status}</span><b>{f.away}</b></div>
            {f.matchId && <span className="detailBtn"><BarChart2 size={14} /> İstatistikleri Gör</span>}
          </div>
        ))}
      </div>
    </Section>
  );
}

// ---------- Oyuncu istatistikleri ----------
function PlayerStatsPage({ playerStats }) {
  const topGoals = [...playerStats].sort((a, b) => b.g - a.g).slice(0, 5);
  const topAssists = [...playerStats].sort((a, b) => b.a - a.a).slice(0, 5);
  const topTackles = [...playerStats].sort((a, b) => b.tackles - a.tackles).slice(0, 5);
  const topSaves = [...playerStats].sort((a, b) => b.saves - a.saves).slice(0, 5);
  const all = [...playerStats].sort((a, b) => b.g - a.g || b.a - a.a);

  if (playerStats.length === 0) {
    return (
      <Section title="Oyuncu İstatistikleri" subtitle="Tüm maçlardan otomatik hesaplanan gol, asist, müdahale ve kurtarış sıralamaları.">
        <p className="emptyNote">Henüz işlenmiş bir maç yok. Yönetim panelinden bir maç istatistiği HTML dosyası yükleyince sıralamalar burada otomatik oluşacak.</p>
      </Section>
    );
  }

  return (
    <Section title="Oyuncu İstatistikleri" subtitle="Tüm maçlardan otomatik hesaplanan gol, asist, müdahale ve kurtarış sıralamaları.">
      <div className="leaderRow">
        <LeaderList icon={Crosshair} title="Gol Kralı" data={topGoals} field="g" />
        <LeaderList icon={Share2} title="Asist Kralı" data={topAssists} field="a" />
        <LeaderList icon={ShieldCheck} title="Defans Lideri" data={topTackles} field="tackles" />
        <LeaderList icon={Hand} title="Kaleci Lideri" data={topSaves} field="saves" />
      </div>

      <div className="sectionHead" style={{ marginTop: 36 }}>
        <div><div className="eyebrow">TÜM OYUNCULAR</div><h1 style={{ fontSize: 28 }}>Genel Tablo</h1></div>
      </div>
      <div className="tableCard">
        <div className="tableScroll">
          <table>
            <thead><tr><th>Oyuncu</th><th>Takım</th><th>Maç</th><th>Gol</th><th>Asist</th><th>Müdahale</th><th>Kurtarış</th></tr></thead>
            <tbody>
              {all.map(p => (
                <tr key={`${p.name}__${p.team}`}>
                  <td><b>{p.name}</b></td><td>{p.team}</td><td>{p.mp}</td>
                  <td className={p.g === 0 ? "zero" : ""}>{p.g}</td>
                  <td className={p.a === 0 ? "zero" : ""}>{p.a}</td>
                  <td className={p.tackles === 0 ? "zero" : ""}>{p.tackles}</td>
                  <td className={p.saves === 0 ? "zero" : ""}>{p.saves}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Section>
  );
}

function LeaderList({ icon: Icon, title, data, field }) {
  return (
    <div className="leaderList">
      <div className="leaderListHead"><Icon size={16} /> {title}</div>
      {data.length === 0 && <p className="emptyNote small">Veri yok</p>}
      {data.map((p, i) => (
        <div className="leaderRowItem" key={`${p.name}__${p.team}`}>
          <span className="rank">{i + 1}</span>
          <span className="lname">{p.name}<small>{p.team}</small></span>
          <span className="lval">{p[field]}</span>
        </div>
      ))}
    </div>
  );
}

// ---------- Yönetim paneli ----------
function AdminPanel({ teams, setTeams, fixtures, setFixtures, onUpload, onReset }) {
  const [newTeamName, setNewTeamName] = useState("");
  const [fixHome, setFixHome] = useState("");
  const [fixAway, setFixAway] = useState("");
  const [fixDate, setFixDate] = useState("");
  const [uploadError, setUploadError] = useState("");

  const handleFileUpload = e => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadError("");
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        onUpload(parseMatchHTML(evt.target.result));
      } catch (err) {
        setUploadError("Dosya okunurken hata oluştu. Lütfen geçerli bir maç istatistik HTML dosyası yükleyin.");
      }
    };
    reader.onerror = () => setUploadError("Dosya okunamadı.");
    reader.readAsText(file);
    e.target.value = "";
  };

  const addTeam = e => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    setTeams([...teams, { id: String(Date.now()), name: newTeamName.trim() }]);
    setNewTeamName("");
  };

  const deleteTeam = id => setTeams(teams.filter(t => t.id !== id));

  const addFixture = e => {
    e.preventDefault();
    if (!fixHome || !fixAway || fixHome === fixAway) return;
    setFixtures([...fixtures, { id: String(Date.now()), date: fixDate || "Yakında", home: fixHome, away: fixAway, status: "Yakında" }]);
    setFixHome(""); setFixAway(""); setFixDate("");
  };

  const deleteFixture = id => setFixtures(fixtures.filter(f => f.id !== id));

  return (
    <Section title="Yönetim Paneli" subtitle="Maç dosyalarını yükle, takımları ve fikstürü düzenle.">
      <div className="adminGrid">
        <div className="adminCard">
          <h3><Upload size={20} /> Maç İstatistiği Dosyası Yükle</h3>
          <p>Oynanan maçın HTML istatistik raporunu yükle. Skorlar, gol/asist/kurtarış istatistikleri ve puan durumu anında güncellenir.</p>
          <label className="fileInputLabel">
            <input type="file" accept=".html,.htm" onChange={handleFileUpload} />
            <span>Dosya Seç veya Sürükle (HTML)</span>
          </label>
          {uploadError && <p className="errorNote">{uploadError}</p>}
        </div>

        <div className="adminCard">
          <h3><Shield size={20} /> Takım Yönetimi</h3>
          <form onSubmit={addTeam} className="formInline">
            <input type="text" placeholder="Takım Adı" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} />
            <button type="submit" className="primary"><Plus size={16} /> Ekle</button>
          </form>
          <div className="adminList">
            {teams.map(t => (
              <div key={t.id} className="adminListItem">
                <span><b>{t.name}</b></span>
                <button onClick={() => deleteTeam(t.id)} className="danger"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="adminCard">
          <h3><CalendarDays size={20} /> Yeni Maç Ekle</h3>
          <form onSubmit={addFixture} className="formStack">
            <select value={fixHome} onChange={e => setFixHome(e.target.value)}>
              <option value="">Ev Sahibi Seç</option>
              {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
            <select value={fixAway} onChange={e => setFixAway(e.target.value)}>
              <option value="">Deplasman Seç</option>
              {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
            <input type="text" placeholder="Tarih / Not (Örn: 12 Mayıs)" value={fixDate} onChange={e => setFixDate(e.target.value)} />
            <button type="submit" className="primary"><Plus size={16} /> Fikstüre Ekle</button>
          </form>
          <div className="adminList">
            {fixtures.map(f => (
              <div key={f.id} className="adminListItem">
                <span><b>{f.home}</b> vs <b>{f.away}</b> <small>({f.status})</small></span>
                <button onClick={() => deleteFixture(f.id)} className="danger"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="adminCard dangerCard">
          <h3><RotateCcw size={20} /> Verileri Sıfırla</h3>
          <p>Tüm takımlar, fikstür ve maç istatistiklerini siler, örnek demo verilerle değiştirir. Bu işlem geri alınamaz.</p>
          <button className="danger outline" onClick={onReset}><RotateCcw size={14} /> Tüm Verileri Sıfırla</button>
        </div>
      </div>
    </Section>
  );
}

// ---------- Maç detay & istatistik sayfası ----------
function MatchDetail({ match, goBack }) {
  return (
    <div className="matchDetailView">
      <button className="backBtn" onClick={goBack}>← Fikstüre Dön</button>

      <div className="scoreboard">
        <div className="sb-stadium">{match.stadium}</div>
        <div className="sb-main">
          <div className="sb-team home"><div className="sb-team-name">{match.homeTeam}</div><div className="sb-team-tag">Ev Sahibi</div></div>
          <div className="sb-score">
            <div className="sb-digits"><span className="h">{match.homeScore}</span><span className="sep">–</span><span className="a">{match.awayScore}</span></div>
            <div className="sb-result">{match.resultText}</div>
          </div>
          <div className="sb-team away"><div className="sb-team-name">{match.awayTeam}</div><div className="sb-team-tag">Deplasman</div></div>
        </div>
        <div className="sb-periods">
          {match.periods.map((p, i) => <div className="period-chip" key={i}>{p.label} <b>{p.score}</b></div>)}
        </div>
      </div>

      {match.leaders && match.leaders.length > 0 && (
        <div className="leaders">
          {match.leaders.map((l, i) => (
            <div key={i} className={`leader-card ${l.type}`}>
              <div className="lc-top"><span className="lc-label">{l.label}</span><span className="lc-formula">{l.formula}</span></div>
              <div className="lc-value">{l.value}</div>
              <div className="lc-name">{l.name}</div>
              <div className="lc-team">{l.team}</div>
            </div>
          ))}
        </div>
      )}

      <div className="team-tables">
        <PlayerTable teamName={match.homeTeam} players={match.homePlayers} type="home" />
        <PlayerTable teamName={match.awayTeam} players={match.awayPlayers} type="away" />
      </div>
    </div>
  );
}

function PlayerTable({ teamName, players = [], type }) {
  return (
    <div className={`team-panel ${type}`}>
      <div className="team-panel-head"><h3>{teamName}</h3><span className="team-panel-count">{players.length} oyuncu</span></div>
      <div className="table-scroll">
        <table>
          <thead><tr><th>Oyuncu</th><th>G</th><th>A</th><th>Pas</th><th>Ayak M.</th><th>Kayma M.</th><th>Defans</th><th>Yakalama</th></tr></thead>
          <tbody>
            {players.map((p, i) => (
              <tr key={i}>
                <td>{p.name}</td>
                <td className={p.g === 0 ? "zero" : ""}>{p.g}</td>
                <td className={p.a === 0 ? "zero" : ""}>{p.a}</td>
                <td className={p.pass === 0 ? "zero" : ""}>{p.pass}</td>
                <td>{p.foot}</td>
                <td>{p.slide}</td>
                <td className={p.def === 0 ? "zero" : ""}>{p.def}</td>
                <td className={p.catch === 0 ? "zero" : ""}>{p.catch}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- Ortak bileşenler ----------
function Section({ title, subtitle, children }) {
  return (
    <section className="section">
      <div className="sectionHead">
        <div>
          <div className="eyebrow">ASL HUB</div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
