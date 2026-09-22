# Nutrition Tracker

A self-hosted meal planner and nutrition tracker with an AI coach that reasons
over what you actually ate — not over generic advice.

You log meals and supplements, the app rolls them into daily and weekly nutrient
totals, compares those against targets you set, and surfaces the gaps. A coach
feature then reads your real logged history to make specific recommendations.

> **Status: early.** The schema and scaffolding are being built. Nothing here is
> usable yet.

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
