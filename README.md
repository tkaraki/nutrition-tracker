# Nutrition Tracker

A self-hosted meal planner and nutrition tracker with an AI coach that reasons
over what you actually ate — not over generic advice.

You log meals and supplements, the app rolls them into daily and weekly nutrient
totals, compares those against targets you set, and surfaces the gaps. A coach
feature then reads your real logged history to make specific recommendations.

> **Status: early.** CRUD is in for ingredients, recipes (with their
> ingredient lists), and meal planning/logging. There is no auth yet —
> every request is attributed to a single seeded dev user, clearly
> marked in code, until the auth step replaces it. Nutrient
> aggregation, supplements, LLM parsing, and the coach are still ahead.

## Planned features

- **Recipes** — store recipes with ingredients and quantities
- **Ingredient nutrition** — a normalized table of calories, macros, fiber, and
  key micronutrients, sourced from USDA FoodData Central
- **Meal planning** — assign recipes to days and meal types, and record what was
  actually eaten versus planned
- **Supplements** — track supplement products and daily doses through the same
  nutrient pipeline as food, so totals are unified
- **Nutrient totals** — daily and weekly aggregation across food *and*
  supplements, measured against personal targets
- **LLM recipe parsing** — paste a recipe as text or a URL and get structured
  ingredients extracted into the database
- **AI coach** — grounded in the last seven days of your own logged data and
  your targets, rather than generic nutrition advice
- **Multi-user** — accounts, sessions, and per-user targets

## Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js |
| API | Express |
| Database | PostgreSQL |
| LLM | Ollama (local) or Gemini Flash (hosted) — both to be evaluated |
| Hosting | Self-hosted, exposed via Tailscale Funnel |
| Process manager | PM2 |

## Repository conventions

This repository is **public**. Two rules follow from that, and they are not
negotiable:

1. **No secrets are ever committed.** Configuration comes from environment
   variables. `.env` is gitignored; `.env.example` documents the required keys
   with placeholder values. A credential pushed here is compromised the moment
   it lands and must be rotated, not reverted.
2. **No real personal health data is ever committed.** Actual meal logs,
   supplement history, and nutrition records live only in a local database.
   Any fixture or seed data in this repository is synthetic.

## License

[MIT](LICENSE)

## Local development

```bash
brew install postgresql@17          # once
brew services start postgresql@17

cp .env.example .env                # then fill in DATABASE_URL, SESSION_SECRET, etc.
npm install
npm run migrate:up
npm run seed                        # creates the dev user routes run as, until auth exists
npm run dev                         # http://localhost:3000/health
```
