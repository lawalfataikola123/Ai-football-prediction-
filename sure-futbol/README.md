# Sure-Futbol

Football prediction dashboard for today's Africa/Lagos fixtures.

## Markets
HW, AW, HTS, ATS, GG, O1.5, O2.5.

## Rules
- Only fixtures explicitly scheduled for today's Lagos date are eligible.
- Explicit odds from 1.20 to 1.60 qualify directly.
- Odds above 1.60 require strong match analysis and H2H evidence for the exact market.
- Every displayed game must have at least one qualifying pick (two preferred).
- No fabricated fallback fixtures.

## Running outside AppDeploy (fixes empty board)

The old frontend statically imported `@appdeploy/client`, which throws outside the
AppDeploy runtime — so "Research Today's Games" always failed and no games ever
showed. The frontend now tries the AppDeploy client first and falls back to
`POST /api/research` on the same origin (local dev uses the `API_PROXY` target
in `vite.config.ts`, default `http://localhost:3000`).

Backend filtering was also relaxed so real fixtures survive: European date formats
(DD.MM.YYYY) and "today" lists are accepted, static-HTML sources were added
(JS-heavy pages often scrape as empty), the hard 2-pick cutoff is now 1+ picks
with 2-pick games sorted first, and drop reasons are returned in `diagnostics`.

The original AppDeploy project is the runtime version; this folder is a GitHub source snapshot.
