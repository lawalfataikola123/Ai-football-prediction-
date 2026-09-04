import { router, json } from '@appdeploy/sdk';
import { ai } from '@appdeploy/sdk';

type Pick = { market: string; selection: string; odds: number; analysisSupported: boolean };
type Game = { id: number; league: string; home: string; away: string; picks: Pick[]; confidence: string; analysisScore: number; analysisEvidence: string; h2hEvidence: string; sources: string[]; fixtureDate: string };
type Source = { name: string; urls: (today: string) => string[] };
const sources: Source[] = [
  { name: 'Footballzz 1X2', urls: today => [`https://footballzz.co.uk/full-time-1X2-football-predictions-and-statistics/${today}`] },
  { name: 'Footballzz Goals', urls: today => [`https://footballzz.co.uk/over-under-goals-football-predictions-and-statistics/${today}`] },
  { name: 'Footballzz BTTS', urls: today => [`https://footballzz.co.uk/both-teams-to-score-football-predictions-and-statistics/${today}`] },
  { name: 'Footballzz Streaks', urls: today => [`https://footballzz.co.uk/win-draw-lose-team-streaks-performance-football-predictions-and-statistics/${today}`] },
  { name: 'Footballzz First Half', urls: today => [`https://footballzz.co.uk/over-under-first-half-goals-football-predictions-and-statistics/${today}`] },
  { name: 'Futbol24 Desktop', urls: () => ['https://www.futbol24.com/All-Matches/'] },
  { name: 'Futbol24 Mobile', urls: () => ['https://futbol24.mobi/live'] },
  { name: 'Soccerway', urls: () => ['https://www.soccerway.com/'] },
  { name: 'Flashscore Club Friendly', urls: () => ['https://www.flashscore.com/football/world/club-friendly/fixtures/'] },
  { name: 'Flashscore Ligue 3', urls: () => ['https://www.flashscore.com/football/france/ligue-3/fixtures/'] },
  { name: 'SoccerZZ', urls: () => ['https://www.soccerzz.com/'] },
  { name: 'FBref', urls: today => [`https://fbref.com/en/matches/${today}`] },
  { name: 'Ontour Football', urls: today => [`https://ontourfootball.com/fixtures?date=${today}`] },
  { name: 'Playmakerstats', urls: () => ['https://www.playmakerstats.com/football/all-games'] },
  { name: 'FootballInfo', urls: () => ['https://www.footballinfo.net/'] },
  { name: 'Footballwood', urls: () => ['https://www.footballwood.com/fixtures/'] },
  { name: 'SoccerStats247', urls: today => [`https://www.soccerstats247.com/matches/${today}/`] },
  { name: 'RotaScore', urls: () => ['https://www.rotascore.com/'] }
];
const allowed = ['HW','AW','HTS','ATS','GG','O1.5','O2.5'];
const priority = ['O1.5','GG','HW','AW','HTS','ATS','O2.5'];
function lagosToday() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
function normalizeOdds(value: unknown) { const n = Number(value); return Number.isFinite(n) && n >= 1.2 ? Number(n.toFixed(2)) : null; }
function normalizeFixtureDate(value: unknown) { const raw = String(value ?? '').trim(); const m = raw.match(/(\d{4}-\d{2}-\d{2})/); return m?.[1] ?? raw; }
export const handler = router({
  'GET /api/_healthcheck': [async () => json({ message: 'Success' })],
  'POST /api/research': [async ({ body }) => {
    const limit = Math.min(40, Math.max(1, Number((body as { limit?: number })?.limit ?? 40)));
    const today = lagosToday();
    const jobs = sources.flatMap(source => source.urls(today).map(url => ({ name: source.name, url })));
    const collected = (await Promise.all(jobs.map(async source => {
      try { const page = await ai.scrape({ url: source.url }); return page.status >= 200 && page.status < 400 && page.text ? { ...source, text: page.text.slice(0, 50000) } : null; }
      catch (e) { console.warn(`Scrape failed: ${source.name}`, e); return null; }
    }))).filter((x): x is { name: string; url: string; text: string } => x !== null);
    if (!collected.length) return json({ games: [], date: today, status: `The football sources could not be reached. No games were invented. Lagos date: ${today}.`, diagnostics: { attemptedSources: jobs.length, reachedSources: 0, extractedGroups: 0 } });
    const extractedGroups = (await Promise.all(collected.map(async source => {
      try {
        const prompt = `Today is ${today} in Africa/Lagos. Source: ${source.name}. Extract ONLY real football fixtures explicitly scheduled for ${today}. IMPORTANT: search broadly through the source and include minor, lower, reserve, youth, women, regional, semi-professional and obscure leagues, not only top leagues. Do not stop after finding famous leagues. Never invent dates or fixtures. Extract explicit odds only for HW, AW, HTS, ATS, GG, O1.5 and O2.5; never calculate or estimate odds. For each fixture use recent form, scoring/conceding trends, home/away performance, team news and H2H evidence only when actually present. Return JSON with games containing fixtureDate, league, home, away, dateEvidence, sourceName, analysisScore, analysisEvidence, h2hEvidence and picks. For odds 1.20-1.60 the pick is eligible. Above 1.60 is eligible only when BOTH analysis and H2H support that exact market and analysisSupported=true. Prefer breadth across leagues while retaining only fixtures with enough explicit market odds for at least two qualifying picks. SOURCE TEXT:\n${source.text}`;
        const result = await ai.generate({ prompt, maxTokens: 8192, temperature: 0, thinkingMode: 'FAST', schema: { type: 'object', properties: { games: { type: 'array', items: { type: 'object', properties: { fixtureDate: { type: 'string' }, league: { type: 'string' }, home: { type: 'string' }, away: { type: 'string' }, dateEvidence: { type: 'string' }, sourceName: { type: 'string' }, analysisScore: { type: 'number' }, analysisEvidence: { type: 'string' }, h2hEvidence: { type: 'string' }, picks: { type: 'array', items: { type: 'object', properties: { market: { type: 'string' }, selection: { type: 'string' }, odds: { type: 'number' }, analysisSupported: { type: 'boolean' } }, required: ['market','selection','odds','analysisSupported'] } } }, required: ['fixtureDate','league','home','away','dateEvidence','sourceName','analysisScore','analysisEvidence','h2hEvidence','picks'] } } }, required: ['games'] } });
        try { return JSON.parse(result.text); } catch { return JSON.parse(result.text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()); }
      } catch (e) { console.warn(`Extraction failed: ${source.name}`, e); return null; }
    }))).filter((x): x is { games?: unknown[] } => x !== null);
    const merged = new Map<string, Game>();
    for (const group of extractedGroups) for (const item of group.games ?? []) {
      const x = item as { fixtureDate?: unknown; league?: unknown; home?: unknown; away?: unknown; dateEvidence?: unknown; sourceName?: unknown; picks?: unknown[]; analysisScore?: unknown; analysisEvidence?: unknown; h2hEvidence?: unknown };
      const fixtureDate = normalizeFixtureDate(x.fixtureDate); const home = String(x.home ?? '').trim(); const away = String(x.away ?? '').trim(); const league = String(x.league ?? '').trim(); const dateEvidence = String(x.dateEvidence ?? '').trim(); const analysisScore = Number(x.analysisScore ?? 0); const analysisEvidence = String(x.analysisEvidence ?? '').trim(); const h2hEvidence = String(x.h2hEvidence ?? '').trim();
      if (fixtureDate !== today || !home || !away || !league || !dateEvidence || !Number.isFinite(analysisScore)) continue;
      const fixtureKey = `${home.toLowerCase().replace(/[^a-z0-9]+/g,'')}__${away.toLowerCase().replace(/[^a-z0-9]+/g,'')}`;
      const rawPicks = Array.isArray(x.picks) ? x.picks : [];
      const picks = rawPicks.map(p => { const y = p as { market?: unknown; selection?: unknown; odds?: unknown; analysisSupported?: unknown }; const market = String(y.market ?? ''); const odds = normalizeOdds(y.odds); const analysisSupported = y.analysisSupported === true; if (!allowed.includes(market) || odds === null) return null; if (odds > 1.6 && (!analysisSupported || analysisScore < 70 || !analysisEvidence || !h2hEvidence)) return null; return { market, selection: String(y.selection ?? market), odds, analysisSupported }; }).filter((p): p is Pick => p !== null);
      if (!merged.has(fixtureKey)) merged.set(fixtureKey, { id: 0, league, home, away, picks: [], confidence: `${Math.round(analysisScore)}% analysis confidence`, analysisScore, analysisEvidence, h2hEvidence, sources: [], fixtureDate: today });
      const game = merged.get(fixtureKey)!; game.picks.push(...picks); game.sources = [...new Set([...game.sources, String(x.sourceName ?? '')].filter(Boolean))]; if (analysisScore > game.analysisScore) { game.analysisScore = analysisScore; game.confidence = `${Math.round(analysisScore)}% analysis confidence`; } if (analysisEvidence.length > game.analysisEvidence.length) game.analysisEvidence = analysisEvidence; if (h2hEvidence.length > game.h2hEvidence.length) game.h2hEvidence = h2hEvidence;
    }
    const unique = [...merged.values()].map(g => ({ ...g, picks: g.picks.filter((p,i,a) => a.findIndex(q => q.market === p.market) === i).sort((a,b) => priority.indexOf(a.market)-priority.indexOf(b.market)) })).filter(g => g.picks.length >= 2).slice(0, limit).map((g,i) => ({ ...g, id: i + 1 }));
    const sourceNames = [...new Set(collected.map(s => s.name))].join(', ');
    return json({ games: unique, date: today, status: unique.length ? `Verified ${unique.length} qualifying fixtures for ${today} in Lagos time across ${collected.length} sources, with broad minor/lower-league coverage.` : `Sources were reached (${sourceNames}), but no fixture survived the explicit odds and two-pick rules for ${today}.`, diagnostics: { attemptedSources: jobs.length, reachedSources: collected.length, extractedGroups: extractedGroups.length, qualifyingGames: unique.length } });
  }]
});