import { kv } from "@vercel/kv";
import { isAdminRequest } from "./_auth.js";

const KEY = "asl_state_v1";

// Vercel KV hiç bağlanmadıysa veya henüz hiç kayıt yapılmadıysa
// herkesin göreceği başlangıç (demo) verisi.
const SEED = {
  teams: [
    { id: "3", name: "Metospor FK" },
    { id: "4", name: "Winchester City FC" },
    { id: "5", name: "Relentless" },
    { id: "6", name: "Noroshi" },
    { id: "7", name: "Abyss FK" },
    { id: "8", name: "Nexorian" }
  ],
  fixtures: [
    { id: "f2", date: "Yakında", home: "Metospor FK", away: "Winchester City FC", status: "Yakında" },
    { id: "f3", date: "Yakında", home: "Relentless", away: "Noroshi", status: "Yakında" },
    { id: "f4", date: "Yakında", home: "Abyss FK", away: "Nexorian", status: "Yakında" }
  ],
  matches: {},
  manualPlayers: [],
  hiddenPlayers: []
};

export default async function handler(req, res) {
  const kvConfigured = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

  if (req.method === "GET") {
    if (!kvConfigured) {
      return res.status(200).json({ ...SEED, kvConfigured: false });
    }
    try {
      const saved = await kv.get(KEY);
      return res.status(200).json({ ...(saved || SEED), kvConfigured: true });
    } catch {
      return res.status(200).json({ ...SEED, kvConfigured: false });
    }
  }

  if (req.method === "POST") {
    if (!isAdminRequest(req)) {
      return res.status(401).json({ error: "Yetkisiz. Lütfen tekrar giriş yap." });
    }
    if (!kvConfigured) {
      return res.status(500).json({
        error: "Vercel KV bağlı değil. Depolama ayarlanmadan veriler kalıcı olarak kaydedilemez."
      });
    }

    const { teams, fixtures, matches, manualPlayers, hiddenPlayers } = req.body || {};
    if (!teams || !fixtures || !matches || !manualPlayers) {
      return res.status(400).json({ error: "Eksik veri." });
    }

    try {
      await kv.set(KEY, { teams, fixtures, matches, manualPlayers, hiddenPlayers: hiddenPlayers || [] });
      return res.status(200).json({ ok: true });
    } catch {
      return res.status(500).json({ error: "Kaydedilemedi. Lütfen tekrar dene." });
    }
  }

  return res.status(405).json({ error: "Yöntem desteklenmiyor." });
}
