// Oyun içi dışa aktarılan "Maç İstatistiği" HTML raporunu ayrıştırır.
// Beklenen yapı: .sb-stadium, .sb-team.home/.away .sb-team-name,
// .sb-digits .h/.a, .sb-result, .period-chip, .leader-card, .team-panel.home/.away

export function parseMatchHTML(htmlContent) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, "text/html");

  const stadium = doc.querySelector(".sb-stadium")?.textContent?.trim() || "Bilinmeyen Stadyum";
  const homeTeam = doc.querySelector(".sb-team.home .sb-team-name")?.textContent?.trim() || "Ev Sahibi";
  const awayTeam = doc.querySelector(".sb-team.away .sb-team-name")?.textContent?.trim() || "Deplasman";
  const homeScore = parseInt(doc.querySelector(".sb-digits .h")?.textContent?.trim() || "0", 10) || 0;
  const awayScore = parseInt(doc.querySelector(".sb-digits .a")?.textContent?.trim() || "0", 10) || 0;
  const resultText = doc.querySelector(".sb-result")?.textContent?.trim() || "";

  const periods = Array.from(doc.querySelectorAll(".period-chip")).map(el => {
    const txt = el.textContent.replace(/\s+/g, " ").trim();
    const parts = txt.split(" ");
    return { label: parts[0] || "", score: parts.slice(1).join(" ") || txt };
  });

  const leaders = Array.from(doc.querySelectorAll(".leader-card")).map(el => ({
    type: el.classList.contains("h-home") ? "h-home" : "h-away",
    label: el.querySelector(".lc-label")?.textContent?.trim() || "",
    formula: el.querySelector(".lc-formula")?.textContent?.trim() || "",
    value: el.querySelector(".lc-value")?.textContent?.trim() || "0",
    name: el.querySelector(".lc-name")?.textContent?.trim() || "",
    team: el.querySelector(".lc-team")?.textContent?.trim() || ""
  }));

  const parseTable = selector => {
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

  if (!homeTeam || !awayTeam || (homeScore === 0 && awayScore === 0 && homePlayers.length === 0)) {
    throw new Error("Dosyada tanınabilir bir maç istatistiği bulunamadı.");
  }

  return {
    id: `match_${Date.now()}`,
    stadium,
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    resultText,
    periods,
    leaders,
    homePlayers,
    awayPlayers
  };
}

// Bir maçın oyuncu satırından başarılı müdahale sayısını çıkarır ("3/21" -> 3)
export function successCount(value) {
  return parseInt(String(value || "0").split("/")[0], 10) || 0;
}
