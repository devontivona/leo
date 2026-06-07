# Leo

A little private website for our son Leo — a playful place to track his days and
keep his photos.

The conceit: it's **Leo's own computer**, a 90s machine sitting in his room that
he uses to run his life (he can't, he's a baby — that's the joke). So everything
is written from his point of view: it's *My Schedule*, not "the baby tracker."
The whole thing looks and feels like a **Mac OS 9 Platinum** desktop — app icons
sit on the desktop, and each one opens in its own classic window.

## Apps

- **My Schedule** — a unified timeline of sleep, feeding, and diaper events, with
  quick-add buttons for each.
- **Photo Albums** — upload and browse photos of Leo.
- **Milestones** — firsts and growth (weight, height, first smile, …).

## Stack

- [Next.js](https://nextjs.org/) (App Router)
- [Neon](https://neon.tech/) serverless Postgres, reached only through a
  server-only data layer via Server Actions — no DB credentials in the browser.
- Private to the two of us — no public access.

## Develop

Requires Node ≥20.9 (`.nvmrc` pins 22). Put your Neon connection string in
`.env.local`:

```bash
echo 'DATABASE_URL=postgres://…' > .env.local
npm install
npm run db:migrate   # create the schema (idempotent)
npm run dev
```

Then open http://localhost:3000.
