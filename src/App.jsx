import React, { useMemo, useState, useEffect } from "react";
import {
  Home, Shield, Trophy, CalendarDays, Upload, Settings, Plus, Trash2,
  ChevronRight, X, Menu, BarChart2, Crosshair, Share2, Hand,
  ShieldCheck, RotateCcw, Radio, CreditCard, Image as ImageIcon, Lock, LogOut
} from "lucide-react";
import { parseMatchHTML, parseMatchJSON, successCount } from "./lib/parseMatch.js";

// Yönetim paneli şifresi artık kodda YOK. Şifre, Vercel projesinin
// ortam değişkenlerinde (ADMIN_PASSWORD) tutulur ve doğrulama
// /api/login üzerinden sunucu tarafında yapılır — tarayıcıya asla
// gönderilmez. Değiştirmek istersen Vercel > Settings > Environment
// Variables kısmından güncelleyip yeniden deploy etmen yeterli.

const INITIAL_TEAMS = [
  { id: "3", name: "Metospor FK" },
  { id: "4", name: "Winchester City FC" },
  { id: "5", name: "Relentless" },
  { id: "6", name: "Noroshi" },
  { id: "7", name: "Abyss FK" },
  { id: "8", name: "Nexorian" }
];

const INITIAL_FIXTURES = [
  { id: "f2", date: "Yakında", home: "Metospor FK", away: "Winchester City FC", status: "Yakında" },
  { id: "f3", date: "Yakında", home: "Relentless", away: "Noroshi", status: "Yakında" },
  { id: "f4", date: "Yakında", home: "Abyss FK", away: "Nexorian", status: "Yakında" }
];

const INITIAL_MATCHES = {};

// ---------- Kart sistemi: overall hesaplama ----------
// Herkes 50 overall'dan başlar. Her istatistik türünün kendi "katsayısı"
// vardır ve oyuncu maç oynadıkça TOPLAM (kariyer boyu biriken) istatistiği
// bu katsayılarla çarpılıp overall'a eklenir — yani bir golün, bir asistin
// ve bir kurtarışın overall'a katkısı sabittir
//   1 GOL      = 0.8 puan
//   1 ASİST    = 0.6 puan
//   1 KURTARIŞ = 0.3 puan
//   1 MÜDAHALE = 0.1 puan
// Bu "ham etki puanı" doğrudan overall'a eklenmez; kareköküyle yumuşatılıp
// (x3.2 ile ölçeklenip) eklenir. Böylece kart, insan gibi kademeli kademeli
// yükselir: az istatistikte hızlı görünür bir artış olur, oyuncu efsane
// istatistiklere ulaştıkça artış giderek yavaşlar (örn. toplamda 10 gollük
// bir etki ~ +10 overall gibi görünür, ama 100 gollük etki +32 civarındadır,
// +100 değil). Ayrıca uzun süredir aktif oynayan oyuncular için küçük
// (en fazla +4) bir "tecrübe" bonusu vardır. Üst sınır 99, alt sınır 50'dir.
const OVERALL_COEF = { goal: 0.8, assist: 0.6, save: 0.3, tackle: 0.1 };
const OVERALL_SCALE = 3.2;

function computeOverall(p) {
  const mp = p.mp || 0;
  if (mp === 0) return 50;
  const rawImpact =
    (p.g || 0) * OVERALL_COEF.goal +
    (p.a || 0) * OVERALL_COEF.assist +
    (p.saves || 0) * OVERALL_COEF.save +
    (p.tackles || 0) * OVERALL_COEF.tackle;
  const impact = Math.sqrt(rawImpact) * OVERALL_SCALE;
  const experienceBonus = Math.min(4, Math.floor(mp / 6));
  return Math.max(50, Math.min(99, Math.round(50 + impact + experienceBonus)));
}

// Bir oyuncuyu tekil olarak tanımlamak için kullanılan anahtar. İsimdeki
// büyük/küçük harf ve baştaki/sondaki boşluk farkları aynı oyuncuyu iki
// farklı kişi gibi göstermesin diye normalize edilir.
function playerKey(name, team) {
  return `${(name || "").trim().toLowerCase()}__${team}`;
}

function tierInfo(overall) {
  if (overall >= 90) return { key: "icon", label: "İKON" };
  if (overall >= 80) return { key: "elite", label: "ELİT" };
  if (overall >= 70) return { key: "gold", label: "ALTIN" };
  if (overall >= 60) return { key: "silver", label: "GÜMÜŞ" };
  return { key: "bronze", label: "BRONZ" };
}

// ---------- Dosya okuma yardımcısı: BOM'a bakarak UTF-8/UTF-16 otomatik algılar ----------
// Oyunun dışa aktardığı JSON dosyaları bazen UTF-16 kodlamasıyla geliyor;
// düz readAsText bunu bozuk karakterlere çevirebiliyor, bu yüzden dosyayı
// ham byte olarak okuyup doğru kodlamayla çözüyoruz.
function readFileText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const bytes = new Uint8Array(reader.result);
      let encoding = "utf-8";
      if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) encoding = "utf-16le";
      else if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) encoding = "utf-16be";
      try {
        resolve(new TextDecoder(encoding).decode(reader.result));
      } catch {
        resolve(new TextDecoder("utf-8").decode(reader.result));
      }
    };
    reader.onerror = () => reject(new Error("Dosya okunamadı."));
    reader.readAsArrayBuffer(file);
  });
}

// ---------- Görsel yardımcı: takım logosunu sıkıştırıp base64'e çevirir ----------
function resizeImageFile(file, maxSize = 240) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height) {
          if (width > maxSize) { height = Math.round(height * (maxSize / width)); width = maxSize; }
        } else if (height > maxSize) {
          width = Math.round(width * (maxSize / height)); height = maxSize;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => reject(new Error("Görsel okunamadı."));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error("Dosya okunamadı."));
    reader.readAsDataURL(file);
  });
}

// ---------- Ana uygulama ----------
export default function App() {
  const [page, setPage] = useState("home");
  const [open, setOpen] = useState(false);
  const [activeMatchId, setActiveMatchId] = useState(null);

  const [teams, setTeams] = useState(INITIAL_TEAMS);
  const [fixtures, setFixtures] = useState(INITIAL_FIXTURES);
  const [matches, setMatches] = useState(INITIAL_MATCHES);
  const [manualPlayers, setManualPlayers] = useState([]);
  // Yönetimin "silinsin" dediği oyuncu kartları (yanlış/istenmeyen kayıtlar
  // dahil). Maç verisi silinmez, sadece bu kart listelerden gizlenir —
  // istenirse admin panelinden geri getirilebilir.
  const [hiddenPlayers, setHiddenPlayers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [kvConfigured, setKvConfigured] = useState(true);
  const [saveError, setSaveError] = useState("");
  const [adminUnlocked, setAdminUnlocked] = useState(false);

  const loadedRef = React.useRef(false);
  const saveTimer = React.useRef(null);

  // İlk açılışta herkesin gördüğü ortak veriyi ve admin oturum durumunu
  // sunucudan çek. Artık kaynak localStorage değil, /api/state.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [stateRes, sessionRes] = await Promise.all([
          fetch("/api/state"),
          fetch("/api/session")
        ]);
        const stateData = await stateRes.json();
        const sessionData = await sessionRes.json().catch(() => ({}));
        if (cancelled) return;
        setTeams(stateData.teams || INITIAL_TEAMS);
        setFixtures(stateData.fixtures || INITIAL_FIXTURES);
        setMatches(stateData.matches || INITIAL_MATCHES);
        setManualPlayers(stateData.manualPlayers || []);
        setHiddenPlayers(stateData.hiddenPlayers || []);
        setKvConfigured(stateData.kvConfigured !== false);
        setAdminUnlocked(Boolean(sessionData.authenticated));
      } catch {
        // Sunucuya ulaşılamadı — demo veriyle devam ediyoruz.
      } finally {
        if (!cancelled) {
          loadedRef.current = true;
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const unlockAdmin = () => setAdminUnlocked(true);
  const lockAdmin = () => {
    fetch("/api/logout", { method: "POST" }).catch(() => {});
    setAdminUnlocked(false);
  };

  // Admin veri değiştirdikçe ortak sunucuya kaydet (kısa bir gecikmeyle,
  // her tuş vuruşunda ayrı istek atmamak için).
  useEffect(() => {
    if (!loadedRef.current || !adminUnlocked) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teams, fixtures, matches, manualPlayers, hiddenPlayers })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setSaveError(err.error || "Kaydedilemedi.");
          if (res.status === 401) setAdminUnlocked(false);
        } else {
          setSaveError("");
        }
      } catch {
        setSaveError("Sunucuya ulaşılamadı.");
      }
    }, 600);
    return () => clearTimeout(saveTimer.current);
  }, [teams, fixtures, matches, manualPlayers, hiddenPlayers, adminUnlocked]);

  // Yönetici olmayan ziyaretçiler için: sayfa açıkken periyodik olarak
  // sunucudaki en güncel veriyi çek, böylece maç/skor güncellemelerini
  // sayfayı yenilemeden görürler.
  useEffect(() => {
    if (adminUnlocked) return;
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/state");
        const data = await res.json();
        setTeams(data.teams || INITIAL_TEAMS);
        setFixtures(data.fixtures || INITIAL_FIXTURES);
        setMatches(data.matches || INITIAL_MATCHES);
        setManualPlayers(data.manualPlayers || []);
        setHiddenPlayers(data.hiddenPlayers || []);
      } catch { /* geç */ }
    }, 12000);
    return () => clearInterval(id);
  }, [adminUnlocked]);

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

  // Yönetimin gizlediği (sildiği) oyuncu kartlarının anahtar seti.
  const hiddenKeySet = useMemo(
    () => new Set(hiddenPlayers.map(h => h.key)),
    [hiddenPlayers]
  );

  // ---- Oyuncu istatistikleri (tüm maçlar toplanarak, otomatik) ----
  // Not: isim eşleştirmesi büyük/küçük harf ve boşluk farkına duyarsızdır,
  // böylece aynı oyuncu farklı yazımlarla iki ayrı kart olarak görünmez.
  const playerStatsAll = useMemo(() => {
    const map = {};
    Object.values(matches).forEach(m => {
      const addAll = (players, team) => (players || []).forEach(p => {
        const key = playerKey(p.name, team);
        if (!map[key]) map[key] = { name: (p.name || "").trim() || "Oyuncu", team, mp: 0, g: 0, a: 0, tackles: 0, saves: 0 };
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

  // Herkese görünen (gizlenmemiş) oyuncu istatistikleri.
  const playerStats = useMemo(
    () => playerStatsAll.filter(p => !hiddenKeySet.has(playerKey(p.name, p.team))),
    [playerStatsAll, hiddenKeySet]
  );

  // ---- Kart sistemi: istatistik bazlı kartlar + henüz maç oynamamış "yeni" kartlar ----
  // (Gizlenenler dahil TÜM kartlar — admin panelinde yönetmek için.)
  const playerCardsAll = useMemo(() => {
    const map = {};
    playerStatsAll.forEach(p => {
      const key = playerKey(p.name, p.team);
      map[key] = {
        key, name: p.name, team: p.team, mp: p.mp, g: p.g, a: p.a,
        tackles: p.tackles, saves: p.saves,
        overall: computeOverall(p), isNew: false
      };
    });
    manualPlayers.forEach(mp => {
      const key = playerKey(mp.name, mp.team);
      if (!map[key]) {
        map[key] = { key, name: mp.name, team: mp.team, mp: 0, g: 0, a: 0, tackles: 0, saves: 0, overall: 50, isNew: true };
      }
    });
    return Object.values(map);
  }, [playerStatsAll, manualPlayers]);

  // Herkese görünen (gizlenmemiş) oyuncu kartları.
  const playerCards = useMemo(
    () => playerCardsAll.filter(p => !hiddenKeySet.has(p.key)),
    [playerCardsAll, hiddenKeySet]
  );

  const hidePlayerCard = (name, team) => {
    const key = playerKey(name, team);
    setHiddenPlayers(prev => prev.some(h => h.key === key) ? prev : [...prev, { key, name, team }]);
  };
  const restorePlayerCard = key => setHiddenPlayers(prev => prev.filter(h => h.key !== key));

  const nav = [
    ["home", "Ana Sayfa", Home],
    ["teams", "Takımlar", Shield],
    ["standings", "Puan Durumu", Trophy],
    ["fixtures", "Fikstür", CalendarDays],
    ["stats", "Oyuncu İstatistikleri", BarChart2],
    ["cards", "Kartlar", CreditCard],
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

  const deleteMatch = matchId => {
    if (!window.confirm("Bu maç istatistiği silinsin mi? Skor ve oyuncu istatistikleri kaldırılacak.")) return;
    setMatches(prev => {
      const updated = { ...prev };
      delete updated[matchId];
      return updated;
    });
    setFixtures(prev => prev.map(f =>
      f.matchId === matchId
        ? { ...f, status: "Yakında", date: "Yakında", matchId: undefined }
        : f
    ));
    if (activeMatchId === matchId) {
      setActiveMatchId(null);
      go("fixtures");
    }
  };

  const resetAllData = () => {
    if (!window.confirm("Tüm takımlar, fikstür ve maç verileri silinip demo veriyle değiştirilecek. Emin misin?")) return;
    setTeams(INITIAL_TEAMS);
    setFixtures(INITIAL_FIXTURES);
    setMatches(INITIAL_MATCHES);
    setManualPlayers([]);
    setHiddenPlayers([]);
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
        {loading && (
          <div className="emptyNote" style={{ textAlign: "center", padding: "60px 0" }}>
            Yükleniyor...
          </div>
        )}

        {!loading && page === "home" && (
          <HomePage go={go} teams={teams} fixtures={fixtures} matches={matches} standings={standings} playerStats={playerStats} />
        )}

        {!loading && page === "teams" && <TeamsPage teams={teams} standings={standings} />}

        {!loading && page === "standings" && <StandingsPage standings={standings} />}

        {!loading && page === "fixtures" && (
          <FixturesPage fixtures={fixtures} onOpenMatch={id => { setActiveMatchId(id); go("matchDetail"); }} />
        )}

        {!loading && page === "stats" && <PlayerStatsPage playerStats={playerStats} />}

        {!loading && page === "cards" && <CardsPage playerCards={playerCards} teams={teams} />}

        {!loading && page === "admin" && (
          <>
            {!kvConfigured && (
              <div className="errorNote" style={{ marginBottom: 16 }}>
                ⚠️ Ortak veritabanı (Vercel KV) henüz bağlı değil — yaptığın değişiklikler kalıcı olarak
                kaydedilmeyecek, sadece bu tarayıcı oturumunda görünecek. Kurulum için Vercel projende
                Storage &gt; Create Database &gt; KV adımlarını takip et ve projeye bağla.
              </div>
            )}
            {saveError && (
              <div className="errorNote" style={{ marginBottom: 16 }}>⚠️ {saveError}</div>
            )}
            {adminUnlocked ? (
              <AdminPanel
                teams={teams} setTeams={setTeams}
                fixtures={fixtures} setFixtures={setFixtures}
                manualPlayers={manualPlayers} setManualPlayers={setManualPlayers}
                matches={matches} onDeleteMatch={deleteMatch}
                onUpload={handleMatchUpload} onReset={resetAllData}
                onLock={lockAdmin}
                playerCardsAll={playerCardsAll}
                hiddenPlayers={hiddenPlayers}
                onHidePlayer={hidePlayerCard}
                onRestorePlayer={restorePlayerCard}
              />
            ) : (
              <AdminGate onUnlock={unlockAdmin} />
            )}
          </>
        )}

        {!loading && page === "matchDetail" && activeMatchId && matches[activeMatchId] && (
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
      <div className={`logo ${team.logo ? "hasImg" : ""}`}>
        {team.logo
          ? <img src={team.logo} alt={`${team.name} logosu`} />
          : team.name.split(" ").map(x => x[0]).join("").slice(0, 3)}
      </div>
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

// ---------- Kart sistemi ----------
function CardsPage({ playerCards, teams = [] }) {
  const newPlayers = playerCards.filter(p => p.isNew);
  const active = [...playerCards.filter(p => !p.isNew)].sort((a, b) => b.overall - a.overall || b.g - a.g || b.a - a.a);
  const crestByTeam = useMemo(() => {
    const map = {};
    teams.forEach(t => { if (t.logo) map[t.name] = t.logo; });
    return map;
  }, [teams]);

  return (
    <Section title="Oyuncu Kartları" subtitle="Herkes 50 overall'dan başlar. Gol, asist, kurtarış ve müdahalenin kendi katsayısı vardır; kart, biriken istatistiklere göre kademeli olarak yükselir — tek maçta atılan tek bir gol kartı asla 99'a fırlatmaz.">
      {newPlayers.length > 0 && (
        <>
          <div className="sectionHead" style={{ marginBottom: 16 }}>
            <div><div className="eyebrow">HENÜZ MAÇ OYNAMADI</div><h1 style={{ fontSize: 26 }}>Yeni Oyuncular</h1></div>
          </div>
          <div className="cardGrid">
            {newPlayers.map(p => <PlayerCard key={`${p.name}__${p.team}`} player={p} crest={crestByTeam[p.team]} />)}
          </div>
        </>
      )}

      <div className="sectionHead" style={{ marginTop: newPlayers.length ? 44 : 0, marginBottom: 16 }}>
        <div><div className="eyebrow">KADRO</div><h1 style={{ fontSize: 26 }}>Tüm Kartlar</h1></div>
      </div>

      {active.length === 0 ? (
        <p className="emptyNote">Henüz kart oluşturacak oyuncu verisi yok. Bir maç yükleyince veya Yönetim panelinden oyuncu ekleyince burada görünecek.</p>
      ) : (
        <div className="cardGrid">
          {active.map(p => <PlayerCard key={`${p.name}__${p.team}`} player={p} crest={crestByTeam[p.team]} />)}
        </div>
      )}
    </Section>
  );
}

// Gerçek pozisyon verisi tutulmadığı için, FUT tarzı kartlardaki kısa
// pozisyon rozetini (ST, GK, CM...) maç başına performansa bakarak kabaca
// tahmin ediyoruz — sadece görsel bir dokunuş, istatistiği etkilemez.
function roleTag(p) {
  const mp = p.mp || 0;
  if (mp === 0) return "OYN";
  const perG = (p.g || 0) / mp;
  const perA = (p.a || 0) / mp;
  const perS = (p.saves || 0) / mp;
  if (perS > perG && perS > perA && perS > 0.2) return "KLC";
  if (perG >= perA) return "FRV";
  return "OSA";
}

function initialsOf(name) {
  return (name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0])
    .join("")
    .toUpperCase();
}

function PlayerCard({ player, crest }) {
  const tier = tierInfo(player.overall);
  const role = roleTag(player);
  return (
    <div className={`pcard tier-${tier.key}`}>
      <div className="pcard-shine" />
      <div className="pcard-pattern" />
      {player.isNew && <span className="pcard-newTag">YENİ</span>}
      <div className="pcard-inner">
        <div className="pcard-head">
          <div className="pcard-rating">
            <span className="pcard-overall">{player.overall}</span>
            <span className="pcard-role">{role}</span>
            <span className="pcard-crest">
              {crest ? <img src={crest} alt="" /> : <span className="pcard-crestDot" />}
            </span>
          </div>
          <div className="pcard-photo"><span>{initialsOf(player.name)}</span></div>
        </div>

        <div className="pcard-nameplate">
          <div className="pcard-name">{player.name}</div>
          <div className="pcard-teamRow">
            <span className="pcard-teamDot" />
            <span className="pcard-team">{player.team}</span>
          </div>
        </div>

        <div className="pcard-divider" />

        <div className="pcard-stats">
          <div><b>{player.g}</b><span>GOL</span></div>
          <div><b>{player.a}</b><span>AST</span></div>
          <div><b>{player.saves}</b><span>KRT</span></div>
          <div><b>{player.mp}</b><span>MAÇ</span></div>
        </div>
      </div>
    </div>
  );
}

// ---------- Yönetim paneli: şifre kapısı ----------
function AdminGate({ onUnlock }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw })
      });
      if (res.ok) {
        onUnlock();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Şifre yanlış. Tekrar dene.");
        setPw("");
      }
    } catch {
      setError("Sunucuya ulaşılamadı. Bağlantını kontrol et.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section title="Yönetim Paneli" subtitle="Bu alan şifreyle korunuyor.">
      <div className="adminGate">
        <div className="adminGateIcon"><Lock size={26} /></div>
        <h3>Devam etmek için şifreyi gir</h3>
        <p>Bu sayfa sadece yetkili kişilerin takım, fikstür, maç ve oyuncu kartlarını yönetmesi için korunuyor.</p>
        <form onSubmit={submit} className="adminGateForm">
          <input
            type="password"
            placeholder="Şifre"
            value={pw}
            onChange={e => { setPw(e.target.value); setError(""); }}
            autoFocus
            disabled={busy}
          />
          <button type="submit" className="primary" disabled={busy}>
            {busy ? "Kontrol ediliyor..." : "Giriş Yap"}
          </button>
        </form>
        {error && <p className="errorNote">{error}</p>}
      </div>
    </Section>
  );
}

// ---------- Yönetim paneli ----------
function AdminPanel({
  teams, setTeams, fixtures, setFixtures, manualPlayers, setManualPlayers, matches, onDeleteMatch,
  onUpload, onReset, onLock, playerCardsAll, hiddenPlayers, onHidePlayer, onRestorePlayer
}) {
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamLogo, setNewTeamLogo] = useState(null);
  const [teamLogoError, setTeamLogoError] = useState("");
  const [fixHome, setFixHome] = useState("");
  const [fixAway, setFixAway] = useState("");
  const [fixDate, setFixDate] = useState("");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerTeam, setNewPlayerTeam] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [pendingJson, setPendingJson] = useState(null);
  const [jsonHome, setJsonHome] = useState("");
  const [jsonAway, setJsonAway] = useState("");

  const handleFileUpload = async e => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadError("");
    const isJson = file.name.toLowerCase().endsWith(".json");
    let text;
    try {
      text = await readFileText(file);
    } catch {
      setUploadError("Dosya okunamadı.");
      e.target.value = "";
      return;
    }
    if (isJson) {
      try {
        const data = JSON.parse(text);
        if (!Array.isArray(data.players)) throw new Error("Geçersiz JSON yapısı.");
        setPendingJson(data);
        setJsonHome("");
        setJsonAway("");
      } catch {
        setUploadError("Dosya okunurken hata oluştu. Lütfen geçerli bir maç istatistik JSON dosyası yükleyin.");
      }
    } else {
      try {
        onUpload(parseMatchHTML(text));
      } catch {
        setUploadError("Dosya okunurken hata oluştu. Lütfen geçerli bir maç istatistik HTML dosyası yükleyin.");
      }
    }
    e.target.value = "";
  };

  const confirmJsonImport = () => {
    if (!jsonHome || !jsonAway || jsonHome === jsonAway) {
      setUploadError("Ev sahibi ve deplasman için farklı iki takım seç.");
      return;
    }
    try {
      onUpload(parseMatchJSON(pendingJson, jsonHome, jsonAway));
      setPendingJson(null);
      setJsonHome("");
      setJsonAway("");
      setUploadError("");
    } catch (err) {
      setUploadError(err.message || "İçe aktarılamadı.");
    }
  };

  const cancelJsonImport = () => {
    setPendingJson(null);
    setJsonHome("");
    setJsonAway("");
    setUploadError("");
  };

  const handleNewTeamLogo = async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageFile(file, 240);
      setNewTeamLogo(dataUrl);
      setTeamLogoError("");
    } catch {
      setTeamLogoError("Logo yüklenemedi. Lütfen bir görsel dosyası seçin.");
    }
    e.target.value = "";
  };

  const handleExistingTeamLogo = async (id, e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageFile(file, 240);
      setTeams(teams.map(t => t.id === id ? { ...t, logo: dataUrl } : t));
    } catch {
      window.alert("Logo yüklenemedi. Lütfen bir görsel dosyası seçin.");
    }
    e.target.value = "";
  };

  const addTeam = e => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    setTeams([...teams, { id: String(Date.now()), name: newTeamName.trim(), logo: newTeamLogo || undefined }]);
    setNewTeamName("");
    setNewTeamLogo(null);
  };

  const deleteTeam = id => setTeams(teams.filter(t => t.id !== id));

  const addFixture = e => {
    e.preventDefault();
    if (!fixHome || !fixAway || fixHome === fixAway) return;
    setFixtures([...fixtures, { id: String(Date.now()), date: fixDate || "Yakında", home: fixHome, away: fixAway, status: "Yakında" }]);
    setFixHome(""); setFixAway(""); setFixDate("");
  };

  const deleteFixture = id => setFixtures(fixtures.filter(f => f.id !== id));

  const addPlayer = e => {
    e.preventDefault();
    if (!newPlayerName.trim() || !newPlayerTeam) return;
    setManualPlayers([...manualPlayers, { id: String(Date.now()), name: newPlayerName.trim(), team: newPlayerTeam }]);
    setNewPlayerName(""); setNewPlayerTeam("");
  };

  const deletePlayer = id => setManualPlayers(manualPlayers.filter(p => p.id !== id));

  return (
    <Section title="Yönetim Paneli" subtitle="Maç dosyalarını yükle, takımları, kartları ve fikstürü düzenle.">
      <div className="adminTopBar">
        <span className="adminTopBarNote"><Lock size={13} /> Bu alan şifreyle korunuyor</span>
        <button className="lockBtn" onClick={onLock}><LogOut size={14} /> Kilitle</button>
      </div>
      <div className="adminGrid">
        <div className="adminCard">
          <h3><Upload size={20} /> Maç İstatistiği Dosyası Yükle</h3>
          <p>Oynanan maçın HTML ya da JSON istatistik raporunu yükle. Skorlar, gol/asist/kurtarış istatistikleri, puan durumu ve oyuncu kartları anında güncellenir.</p>
          <label className="fileInputLabel">
            <input type="file" accept=".html,.htm,.json" onChange={handleFileUpload} />
            <span>Dosya Seç veya Sürükle (HTML / JSON)</span>
          </label>
          {pendingJson && (
            <div className="formStack" style={{ marginTop: 12 }}>
              <p className="emptyNote small">
                JSON okundu — {pendingJson.players.length} oyuncu, skor{" "}
                {pendingJson.score?.home ?? 0} - {pendingJson.score?.away ?? 0}.
                Bu veride "home" / "away" olarak geçen taraflar gerçekte hangi takımlar?
              </p>
              <select value={jsonHome} onChange={e => setJsonHome(e.target.value)}>
                <option value="">Ev Sahibi Takımı Seç</option>
                {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
              <select value={jsonAway} onChange={e => setJsonAway(e.target.value)}>
                <option value="">Deplasman Takımını Seç</option>
                {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
              <div className="adminTopBar">
                <button type="button" className="primary" onClick={confirmJsonImport}>İçe Aktar</button>
                <button type="button" className="lockBtn" onClick={cancelJsonImport}>Vazgeç</button>
              </div>
            </div>
          )}
          {uploadError && <p className="errorNote">{uploadError}</p>}
        </div>

        <div className="adminCard">
          <h3><Shield size={20} /> Takım Yönetimi</h3>
          <form onSubmit={addTeam} className="formStack">
            <input type="text" placeholder="Takım Adı" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} />
            <label className="logoPickLabel">
              <input type="file" accept="image/*" onChange={handleNewTeamLogo} />
              {newTeamLogo
                ? <img src={newTeamLogo} alt="Logo önizleme" />
                : <span><ImageIcon size={16} /> Takım Logosu Yükle (opsiyonel)</span>}
            </label>
            {teamLogoError && <p className="errorNote">{teamLogoError}</p>}
            <button type="submit" className="primary"><Plus size={16} /> Ekle</button>
          </form>
          <div className="adminList">
            {teams.map(t => (
              <div key={t.id} className="adminListItem">
                <span className="adminTeamRow">
                  <span className="adminTeamLogo">
                    {t.logo ? <img src={t.logo} alt="" /> : t.name.split(" ").map(x => x[0]).join("").slice(0, 3)}
                  </span>
                  <b>{t.name}</b>
                </span>
                <span className="adminTeamActions">
                  <label className="tinyUpload" title="Logo değiştir">
                    <input type="file" accept="image/*" onChange={e => handleExistingTeamLogo(t.id, e)} />
                    <ImageIcon size={13} />
                  </label>
                  <button onClick={() => deleteTeam(t.id)} className="danger"><Trash2 size={14} /></button>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="adminCard">
          <h3><CreditCard size={20} /> Yeni Oyuncu Kartı Ekle</h3>
          <p>50 overall'dan başlayan bir kart oluşturur. Oyuncu bir maç istatistiğinde görünmeye başladığında kartı otomatik olarak gol/asist/kurtarış/müdahale katsayılarına göre kademeli şekilde güncellenir ve "Yeni Oyuncular" listesinden çıkar.</p>
          <form onSubmit={addPlayer} className="formInline">
            <input type="text" placeholder="Oyuncu Adı" value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)} />
            <select value={newPlayerTeam} onChange={e => setNewPlayerTeam(e.target.value)}>
              <option value="">Takım Seç</option>
              {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
            <button type="submit" className="primary"><Plus size={16} /> Ekle</button>
          </form>
          <div className="adminList">
            {manualPlayers.length === 0 && <p className="emptyNote small">Henüz manuel eklenmiş oyuncu yok.</p>}
            {manualPlayers.map(p => (
              <div key={p.id} className="adminListItem">
                <span><b>{p.name}</b> <small>({p.team})</small></span>
                <button onClick={() => deletePlayer(p.id)} className="danger"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="adminCard">
          <h3><CreditCard size={20} /> Kart Yönetimi</h3>
          <p>
            Yanlış görünen, istenmeyen ya da hatalı bir oyuncu kartı mı var? (Örn. bir takım adının
            oyuncu gibi listelenmesi.) Aşağıdan istediğin kartı gizleyebilirsin — maç verisi silinmez,
            kart sadece herkesin gördüğü listeden kaldırılır ve istersen tekrar geri getirebilirsin.
          </p>
          <div className="adminList">
            {playerCardsAll.filter(p => !hiddenPlayers.some(h => h.key === p.key)).length === 0 && (
              <p className="emptyNote small">Gösterilecek kart yok.</p>
            )}
            {playerCardsAll
              .filter(p => !hiddenPlayers.some(h => h.key === p.key))
              .sort((a, b) => a.name.localeCompare(b.name, "tr"))
              .map(p => (
                <div key={p.key} className="adminListItem">
                  <span><b>{p.name}</b> <small>({p.team} · {p.overall} OVR)</small></span>
                  <button onClick={() => onHidePlayer(p.name, p.team)} className="danger" title="Kartı gizle">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
          </div>
          {hiddenPlayers.length > 0 && (
            <>
              <h3 style={{ marginTop: 22 }}><RotateCcw size={18} /> Gizlenen Kartlar</h3>
              <div className="adminList">
                {hiddenPlayers.map(h => (
                  <div key={h.key} className="adminListItem">
                    <span><b>{h.name}</b> <small>({h.team})</small></span>
                    <button onClick={() => onRestorePlayer(h.key)} className="lockBtn" title="Geri getir">
                      <RotateCcw size={14} /> Geri Getir
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="adminCard">
          <h3><Trash2 size={20} /> Yüklenen Maçlar</h3>
          <p>Hatalı yüklenen ya da kaldırılmak istenen bir maç istatistiğini buradan silebilirsin. Silinince ilgili fikstür maddesi otomatik olarak "Yakında" durumuna döner, puan durumu ve oyuncu kartları da güncellenir.</p>
          <div className="adminList">
            {Object.keys(matches).length === 0 && <p className="emptyNote small">Henüz yüklenmiş bir maç yok.</p>}
            {Object.values(matches).map(m => (
              <div key={m.id} className="adminListItem">
                <span><b>{m.homeTeam}</b> {m.homeScore} - {m.awayScore} <b>{m.awayTeam}</b></span>
                <button onClick={() => onDeleteMatch(m.id)} className="danger"><Trash2 size={14} /></button>
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
          <p>Tüm takımlar, fikstür, maç istatistikleri ve oyuncu kartlarını siler, örnek demo verilerle değiştirir. Bu işlem geri alınamaz.</p>
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
