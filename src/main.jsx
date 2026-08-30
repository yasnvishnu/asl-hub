import React, { useMemo, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Home, Shield, Trophy, CalendarDays, Upload, Settings, Plus, Trash2, ChevronRight, X, Menu, BarChart2 } from "lucide-react";
import "./style.css";

const INITIAL_TEAMS = [
  { id: "1", name: "BizSiz FC", group: "A" },
  { id: "2", name: "Hamam Zalisko", group: "A" },
  { id: "3", name: "Metospor FK", group: "A" },
  { id: "4", name: "Winchester City FC", group: "A" },
  { id: "5", name: "Relentless", group: "B" },
  { id: "6", name: "Noroshi", group: "B" },
  { id: "7", name: "Abyss FK", group: "B" },
  { id: "8", name: "Nexorian", group: "B" }
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

function App() {
  const [page, setPage] = useState("home");
  const [open, setOpen] = useState(false);
  const [activeMatchId, setActiveMatchId] = useState(null);

  const [teams, setTeams] = useState(() => {
    const saved = localStorage.getItem("asl_teams");
    return saved ? JSON.parse(saved) : INITIAL_TEAMS;
  });

  const [fixtures, setFixtures] = useState(() => {
    const saved = localStorage.getItem("asl_fixtures");
    return saved ? JSON.parse(saved) : INITIAL_FIXTURES;
  });

  const [matches, setMatches] = useState(() => {
    const saved = localStorage.getItem("asl_matches");
    return saved ? JSON.parse(saved) : INITIAL_MATCHES;
  });

  useEffect(() => { localStorage.setItem("asl_teams", JSON.stringify(teams)); }, [teams]);
  useEffect(() => { localStorage.setItem("asl_fixtures", JSON.stringify(fixtures)); }, [fixtures]);
  useEffect(() => { localStorage.setItem("asl_matches", JSON.stringify(matches)); }, [matches]);

  // Otomatik Puan Durumu Hesaplama
  const standings = useMemo(() => {
    const stats = {};
    teams.forEach(t => {
      stats[t.name] = { name: t.name, group: t.group, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
    });

    Object.values(matches).forEach(m => {
      const h = stats[m.homeTeam] || { name: m.homeTeam, group: "-", played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
      const a = stats[m.awayTeam] || { name: m.awayTeam, group: "-", played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, gd: 0, pts: 0 };

      h.played += 1;
      a.played += 1;
      h.gf += m.homeScore;
      h.ga += m.awayScore;
      a.gf += m.awayScore;
      a.ga += m.homeScore;

      if (m.homeScore > m.awayScore) {
        h.wins += 1; h.pts += 3;
        a.losses += 1;
      } else if (m.homeScore < m.awayScore) {
        a.wins += 1; a.pts += 3;
        h.losses += 1;
      } else {
        h.draws += 1; h.pts += 1;
        a.draws += 1; a.pts += 1;
      }

      h.gd = h.gf - h.ga;
      a.gd = a.gf - a.ga;

      stats[m.homeTeam] = h;
      stats[m.awayTeam] = a;
    });

    return Object.values(stats).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  }, [teams, matches]);

  const nav = [
    ["home", "Ana Sayfa", Home],
    ["teams", "Takımlar", Shield],
    ["standings", "Puan Durumu", Trophy],
    ["fixtures", "Fikstür", CalendarDays],
    ["admin", "Yönetim", Settings]
  ];

  const go = p => {
    setPage(p);
    setOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleMatchUpload = (parsedMatch) => {
    setMatches(prev => ({ ...prev, [parsedMatch.id]: parsedMatch }));

    setFixtures(prev => {
      const existingIdx = prev.findIndex(
        f => (f.home === parsedMatch.homeTeam && f.away === parsedMatch.awayTeam) ||
             (f.home === parsedMatch.awayTeam && f.away === parsedMatch.homeTeam)
      );

      if (existingIdx !== -1) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          status: `${parsedMatch.homeScore} - ${parsedMatch.awayScore}`,
          matchId: parsedMatch.id,
          date: "Tamamlandı"
        };
        return updated;
      } else {
        return [
          {
            id: `f_${Date.now()}`,
            date: "Tamamlandı",
            home: parsedMatch.homeTeam,
            away: parsedMatch.awayTeam,
            status: `${parsedMatch.homeScore} - ${parsedMatch.awayScore}`,
            matchId: parsedMatch.id
          },
          ...prev
        ];
      }
    });

    setActiveMatchId(parsedMatch.id);
    go("matchDetail");
  };

  return (
    <div className="app">
      <header>
        <div className="nav wrap">
          <button className="brand" onClick={() => go("home")}>
            <span className="brandMark">ASL</span>
            <span><b>ASL Hub</b><small>Anadolu Strikers Ligi</small></span>
          </button>
          <button className="mobile" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
          <nav className={open ? "show" : ""}>{nav.map(([id, label, Icon]) =>
            <button className={page === id ? "active" : ""} onClick={() => go(id)} key={id}><Icon size={17} />{label}</button>
          )}</nav>
        </div>
      </header>

      <main className="wrap">
        {page === "home" && <HomePage go={go} />}

        {page === "teams" && (
          <Section title="Takımlar" subtitle="Anadolu Strikers Ligi'nde mücadele eden ekipler.">
            <div className="teamGrid">{teams.map(t => <TeamCard key={t.id} team={t} />)}</div>
          </Section>
        )}

        {page === "standings" && (
          <Section title="Puan Durumu" subtitle="Oynanan maçlara göre otomatik güncellenen lig sıralaması.">
            <div className="tableCard">
              <div className="tableScroll">
                <table>
                  <thead><tr><th>#</th><th>Takım</th><th>O</th><th>G</th><th>B</th><th>M</th><th>AG</th><th>YG</th><th>AV</th><th>PTS</th></tr></thead>
                  <tbody>{standings.map((t, i) => (
                    <tr key={t.name}>
                      <td>{i + 1}</td>
                      <td><b>{t.name}</b></td>
                      <td>{t.played}</td>
                      <td>{t.wins}</td>
                      <td>{t.draws}</td>
                      <td>{t.losses}</td>
                      <td>{t.gf}</td>
                      <td>{t.ga}</td>
                      <td>{t.gd}</td>
                      <td><strong>{t.pts}</strong></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          </Section>
        )}

        {page === "fixtures" && (
          <Section title="Fikstür & Sonuçlar" subtitle="Maç programı ve detaylı maç istatistikleri.">
            <div className="fixtureGrid">
              {fixtures.map((f, i) => (
                <div className={`fixture ${f.matchId ? "clickable" : ""}`} key={f.id || i} onClick={() => {
                  if (f.matchId) {
                    setActiveMatchId(f.matchId);
                    go("matchDetail");
                  }
                }}>
                  <span className="date">{f.date}</span>
                  <div className="match">
                    <b>{f.home}</b>
                    <span className="scoreBadge">{f.status}</span>
                    <b>{f.away}</b>
                  </div>
                  {f.matchId && <span className="detailBtn"><BarChart2 size={14} /> İstatistikleri Gör</span>}
                </div>
              ))}
            </div>
          </Section>
        )}

        {page === "admin" && (
          <AdminPanel
            teams={teams}
            setTeams={setTeams}
            fixtures={fixtures}
            setFixtures={setFixtures}
            onUpload={handleMatchUpload}
          />
        )}

        {page === "matchDetail" && activeMatchId && matches[activeMatchId] && (
          <MatchDetail match={matches[activeMatchId]} goBack={() => go("fixtures")} />
        )}
      </main>

      <footer><div className="wrap">© 2026 Anadolu Strikers Ligi <span>ASL Hub</span></div></footer>
    </div>
  );
}

// ANA SAYFA
function HomePage({ go }) {
  return (
    <section className="hero">
      <div className="heroText">
        <div className="pill">⚽ TÜRKİYE MERKEZLİ STRIKERS LİGİ</div>
        <h1>Anadolu<br /><span>Strikers Ligi</span></h1>
        <p>ASL, Strikers topluluğunun Türkiye merkezli rekabet ortamıdır. Maçları, takımları, fikstürü ve istatistikleri tek yerde takip et.</p>
        <div className="actions">
          <button className="primary" onClick={() => go("fixtures")}>Fikstürü Görüntüle <ChevronRight size={18} /></button>
          <button onClick={() => go("admin")}>Maç İstatistiği Yükle <Upload size={18} /></button>
        </div>
      </div>
      <div className="heroCard">
        <div className="orb">ASL</div>
        <div><b>ANADOLU STRIKERS LİGİ</b><small>SEZON 2026</small></div>
      </div>
    </section>
  );
}

// YÖNETİM & DOSYA YÜKLEME PANELİ
function AdminPanel({ teams, setTeams, fixtures, setFixtures, onUpload }) {
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamGroup, setNewTeamGroup] = useState("A");

  const [fixHome, setFixHome] = useState("");
  const [fixAway, setFixAway] = useState("");
  const [fixDate, setFixDate] = useState("");

  // HTML İstatistik Dosyası Parsing Fonksiyonu
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const htmlContent = evt.target.result;
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, "text/html");

        const stadium = doc.querySelector(".sb-stadium")?.textContent?.trim() || "Stadyum";
        const homeTeam = doc.querySelector(".sb-team.home .sb-team-name")?.textContent?.trim() || "Ev Sahibi";
        const awayTeam = doc.querySelector(".sb-team.away .sb-team-name")?.textContent?.trim() || "Deplasman";
        const homeScore = parseInt(doc.querySelector(".sb-digits .h")?.textContent?.trim() || "0", 10);
        const awayScore = parseInt(doc.querySelector(".sb-digits .a")?.textContent?.trim() || "0", 10);
        const resultText = doc.querySelector(".sb-result")?.textContent?.trim() || "";

        const periodEls = doc.querySelectorAll(".period-chip");
        const periods = Array.from(periodEls).map(el => {
          const txt = el.textContent.trim();
          const parts = txt.split(" ");
          return { label: parts[0] || "", score: parts[1] || txt };
        });

        const leaderEls = doc.querySelectorAll(".leader-card");
        const leaders = Array.from(leaderEls).map(el => ({
          type: el.classList.contains("h-home") ? "h-home" : "h-away",
          label: el.querySelector(".lc-label")?.textContent?.trim() || "",
          formula: el.querySelector(".lc-formula")?.textContent?.trim() || "",
          value: el.querySelector(".lc-value")?.textContent?.trim() || "0",
          name: el.querySelector(".lc-name")?.textContent?.trim() || "",
          team: el.querySelector(".lc-team")?.textContent?.trim() || ""
        }));

        const parseTable = (selector) => {
          const rows = doc.querySelectorAll(`${selector} tbody tr`);
          return Array.from(rows).map(r => {
            const tds = r.querySelectorAll("td");
            return {
              name: tds[0]?.textContent?.trim() || "",
              g: parseInt(tds[1]?.textContent || "0", 10) || 0,
              a: parseInt(tds[2]?.textContent || "0", 10) || 0,
              pass: parseInt(tds[3]?.textContent || "0", 10) || 0,
              foot: tds[4]?.textContent?.trim() || "0/0",
              slide: tds[5]?.textContent?.trim() || "0/0",
              def: parseInt(tds[6]?.textContent || "0", 10) || 0,
              catch: parseInt(tds[7]?.textContent || "0", 10) || 0
            };
          });
        };

        const homePlayers = parseTable(".team-panel.home");
        const awayPlayers = parseTable(".team-panel.away");

        const parsedMatch = {
          id: `match_${Date.now()}`,
          stadium, homeTeam, awayTeam, homeScore, awayScore, resultText,
          periods, leaders, homePlayers, awayPlayers
        };

        onUpload(parsedMatch);
      } catch (err) {
        alert("Dosya okunurken hata oluştu. Lütfen geçerli bir maç istatistik HTML dosyası yükleyin.");
      }
    };
    reader.readAsText(file);
  };

  const addTeam = (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    setTeams([...teams, { id: String(Date.now()), name: newTeamName.trim(), group: newTeamGroup }]);
    setNewTeamName("");
  };

  const deleteTeam = (id) => {
    setTeams(teams.filter(t => t.id !== id));
  };

  const addFixture = (e) => {
    e.preventDefault();
    if (!fixHome || !fixAway) return;
    setFixtures([...fixtures, {
      id: String(Date.now()),
      date: fixDate || "Yakında",
      home: fixHome,
      away: fixAway,
      status: "Yakında"
    }]);
    setFixHome(""); setFixAway(""); setFixDate("");
  };

  return (
    <Section title="Yönetim Paneli" subtitle="Maç dosyalarını yükle, takımları ve fikstürü düzenle.">
      <div className="adminGrid">
        {/* HTML DOSYASI YÜKLEME */}
        <div className="adminCard uploadCard">
          <h3><Upload size={20} /> Maç İstatistiği Dosyası Yükle</h3>
          <p>Oynanan maçın HTML istatistik raporunu yükleyin. Skorlar ve istatistikler anında işlenecektir.</p>
          <label className="fileInputLabel">
            <input type="file" accept=".html,.htm" onChange={handleFileUpload} />
            <span>Dosya Seç veya Sürükle (HTML)</span>
          </label>
        </div>

        {/* TAKIM EKLEME */}
        <div className="adminCard">
          <h3><Shield size={20} /> Takım Yönetimi</h3>
          <form onSubmit={addTeam} className="formInline">
            <input type="text" placeholder="Takım Adı" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} />
            <select value={newTeamGroup} onChange={e => setNewTeamGroup(e.target.value)}>
              <option value="A">Grup A</option>
              <option value="B">Grup B</option>
            </select>
            <button type="submit" className="primary"><Plus size={16} /> Ekle</button>
          </form>
          <div className="adminList">
            {teams.map(t => (
              <div key={t.id} className="adminListItem">
                <span><b>{t.name}</b> <small>(Grup {t.group})</small></span>
                <button onClick={() => deleteTeam(t.id)} className="danger"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>

        {/* FİKSTÜR EKLEME */}
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
            <input type="text" placeholder="Tarih / Durum (Örn: 12 Mayıs)" value={fixDate} onChange={e => setFixDate(e.target.value)} />
            <button type="submit" className="primary"><Plus size={16} /> Fikstüre Ekle</button>
          </form>
        </div>
      </div>
    </Section>
  );
}

// MAÇ DETAY & İSTATİSTİK SAYFASI (Görsel Tasarım Birebir Entegre Edildi)
function MatchDetail({ match, goBack }) {
  return (
    <div className="matchDetailView">
      <button className="backBtn" onClick={goBack}>← Fikstüre Dön</button>

      <div className="scoreboard">
        <div className="sb-stadium">{match.stadium}</div>
        <div className="sb-main">
          <div className="sb-team home">
            <div className="sb-team-name">{match.homeTeam}</div>
            <div className="sb-team-tag">Ev Sahibi</div>
          </div>
          <div className="sb-score">
            <div className="sb-digits">
              <span className="h">{match.homeScore}</span>
              <span className="sep">–</span>
              <span className="a">{match.awayScore}</span>
            </div>
            <div className="sb-result">{match.resultText}</div>
          </div>
          <div className="sb-team away">
            <div className="sb-team-name">{match.awayTeam}</div>
            <div className="sb-team-tag">Deplasman</div>
          </div>
        </div>
        <div className="sb-periods">
          {match.periods.map((p, i) => (
            <div className="period-chip" key={i}>
              {p.label} <b>{p.score}</b>
            </div>
          ))}
        </div>
      </div>

      {match.leaders && match.leaders.length > 0 && (
        <div className="leaders">
          {match.leaders.map((l, i) => (
            <div key={i} className={`leader-card ${l.type}`}>
              <div className="lc-top">
                <span className="lc-label">{l.label}</span>
                <span className="lc-formula">{l.formula}</span>
              </div>
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
      <div className="team-panel-head">
        <h3>{teamName}</h3>
        <span className="team-panel-count">{players.length} oyuncu</span>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Oyuncu</th>
              <th>G</th>
              <th>A</th>
              <th>Pas</th>
              <th>Ayak M.</th>
              <th>Kayma M.</th>
              <th>Defans</th>
              <th>Yakalama</th>
            </tr>
          </thead>
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

function TeamCard({ team }) {
  return (
    <article className="team">
      <div className="logo">{team.name.split(" ").map(x => x[0]).join("").slice(0, 3)}</div>
      <div>
        <h3>{team.name}</h3>
        <span>Grup {team.group}</span>
      </div>
      <ChevronRight />
    </article>
  );
}

createRoot(document.getElementById("root")).render(<App />);