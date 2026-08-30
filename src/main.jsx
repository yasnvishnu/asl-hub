import React, {useMemo, useState} from "react";
import {createRoot} from "react-dom/client";
import {Home, Shield, Trophy, CalendarDays, Menu, X, ChevronRight} from "lucide-react";
import "./style.css";

const teams = [
  {name:"Metospor FK", group:"A", played:0, wins:0, draws:0, losses:0, gd:0, pts:0},
  {name:"Winchester City FC", group:"A", played:0, wins:0, draws:0, losses:0, gd:0, pts:0},
  {name:"Relentless", group:"A", played:0, wins:0, draws:0, losses:0, gd:0, pts:0},
  {name:"Noroshi", group:"A", played:0, wins:0, draws:0, losses:0, gd:0, pts:0},
  {name:"Abyss FK", group:"B", played:0, wins:0, draws:0, losses:0, gd:0, pts:0},
  {name:"Nexorian", group:"B", played:0, wins:0, draws:0, losses:0, gd:0, pts:0},
  {name:"Kemik FC", group:"B", played:0, wins:0, draws:0, losses:0, gd:0, pts:0},
  {name:"Medusa", group:"B", played:0, wins:0, draws:0, losses:0, gd:0, pts:0}
];

const fixtures = [
  {date:"Yakında", home:"Metospor FK", away:"Winchester City FC", status:"Yakında"},
  {date:"Yakında", home:"Relentless", away:"Noroshi", status:"Yakında"},
  {date:"Yakında", home:"Abyss FK", away:"Nexorian", status:"Yakında"},
  {date:"Yakında", home:"Kemik FC", away:"Medusa", status:"Yakında"}
];

function App(){
  const [page,setPage]=useState("home");
  const [open,setOpen]=useState(false);
  const nav=[
    ["home","Ana Sayfa",Home],
    ["teams","Takımlar",Shield],
    ["standings","Puan Durumu",Trophy],
    ["fixtures","Fikstür",CalendarDays]
  ];
  const sorted=useMemo(()=>[...teams].sort((a,b)=>b.pts-a.pts || b.gd-a.gd),[]);
  const go=p=>{setPage(p);setOpen(false);window.scrollTo({top:0,behavior:"smooth"})};

  return <div className="app">
    <header>
      <div className="nav wrap">
        <button className="brand" onClick={()=>go("home")}>
          <span className="brandMark">ASL</span>
          <span><b>ASL Hub</b><small>Anadolu Strikers Ligi</small></span>
        </button>
        <button className="mobile" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button>
        <nav className={open?"show":""}>{nav.map(([id,label,Icon])=>
          <button className={page===id?"active":""} onClick={()=>go(id)} key={id}><Icon size={17}/>{label}</button>
        )}</nav>
      </div>
    </header>

    <main className="wrap">
      {page==="home" && <HomePage go={go}/>}
      {page==="teams" && <Section title="Takımlar" subtitle="Anadolu Strikers Ligi'nde mücadele eden ekipler." >
        <div className="teamGrid">{teams.map(t=><TeamCard key={t.name} team={t}/>)}</div>
      </Section>}
      {page==="standings" && <Section title="Puan Durumu" subtitle="Lig sıralaması ve takım istatistikleri.">
        <div className="tableCard"><div className="tableScroll"><table>
          <thead><tr><th>#</th><th>Takım</th><th>O</th><th>G</th><th>B</th><th>M</th><th>AV</th><th>PTS</th></tr></thead>
          <tbody>{sorted.map((t,i)=><tr key={t.name}><td>{i+1}</td><td><b>{t.name}</b></td><td>{t.played}</td><td>{t.wins}</td><td>{t.draws}</td><td>{t.losses}</td><td>{t.gd}</td><td><strong>{t.pts}</strong></td></tr>)}</tbody>
        </table></div></div>
      </Section>}
      {page==="fixtures" && <Section title="Fikstür" subtitle="Yaklaşan maçlar ve karşılaşma sonuçları.">
        <div className="fixtureGrid">{fixtures.map((f,i)=><div className="fixture" key={i}>
          <span className="date">{f.date}</span><div className="match"><b>{f.home}</b><span>VS</span><b>{f.away}</b></div><em>{f.status}</em>
        </div>)}</div>
      </Section>}
    </main>
    <footer><div className="wrap">© 2026 Anadolu Strikers Ligi <span>ASL Hub</span></div></footer>
  </div>
}

function HomePage({go}){return <section className="hero">
  <div className="heroText"><div className="pill">⚽ TÜRKİYE MERKEZLİ STRIKERS LİGİ</div>
    <h1>Anadolu<br/><span>Strikers Ligi</span></h1>
    <p>ASL, Strikers topluluğunun Türkiye merkezli rekabet ortamıdır. Maçları, takımları, fikstürü ve ligdeki gelişmeleri tek yerde takip et.</p>
    <div className="actions"><button className="primary" onClick={()=>go("fixtures")}>Fikstürü Görüntüle <ChevronRight size={18}/></button><button onClick={()=>go("teams")}>Takımları İncele</button></div>
  </div>
  <div className="heroCard"><div className="orb">ASL</div><div><b>ANADOLU STRIKERS LİGİ</b><small>SEZON 2026</small></div></div>
  <div className="about"><h2>Lig Hakkında</h2><p>Adil rekabet, güçlü takımlar ve unutulmaz maçlar. ASL Hub üzerinden ligin tüm temel bilgilerine hızlıca ulaşabilirsin.</p></div>
</section>}

function Section({title,subtitle,children}){return <section className="section"><div className="sectionHead"><div><div className="eyebrow">ASL HUB</div><h1>{title}</h1><p>{subtitle}</p></div></div>{children}</section>}
function TeamCard({team}){return <article className="team"><div className="logo">{team.name.split(" ").map(x=>x[0]).join("").slice(0,3)}</div><div><h3>{team.name}</h3><span>Grup {team.group}</span></div><ChevronRight/></article>}

createRoot(document.getElementById("root")).render(<App/>);