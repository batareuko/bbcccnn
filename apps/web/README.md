# PostFlow (робоча назва) — планувальник публікацій у соцмережах

SaaS для планування та автопублікації контенту: календар (місяць / тиждень / день з drag & drop),
планувальник, автопостинг з WordPress і RSS, AI-рерайт під кожну мережу та AI контент-план.
Інтерфейс і лендінг — українською та англійською.

> ⚠️ Назва «PostFlow» вже використовується іншим сервісом (postflow.app). Перед запуском оберіть іншу —
> бренд зібраний у `src/lib/site.ts`, `src/i18n/dict.ts`, `src/components/Landing.tsx`.

## Швидкий старт

```bash
cd apps/web
npm install
cp .env.example .env          # заповніть ключі
npx prisma db push            # створює SQLite-базу
npm run dev                   # http://localhost:3000
npm run worker                # в окремому терміналі: публікує пости за розкладом
```

## Що є

| Розділ | Опис |
|---|---|
| `/`, `/en` | Лендінг UA/EN: піксельна анімація, тарифи, FAQ, SEO (sitemap, robots, OpenGraph, JSON-LD, hreflang) |
| `/app` | Календар: місяць / тиждень / день, перетягування постів, фільтр каналів, метрики, гарячі клавіші `← → T M W D` |
| `/app/posts` | Список постів з фільтром за статусом |
| `/app/posts/new` | Редактор: канали, медіа, час (у часовому поясі простору), окремий текст для кожного каналу, AI-рерайт |
| `/app/channels` | Підключення Telegram, Facebook-сторінки, Instagram Business (+ тестовий mock-канал) |
| `/app/sources` | Автопостинг з WordPress (REST API) або будь-якої RSS/Atom стрічки за шаблоном |
| `/app/ai` | AI контент-план (агент просування): серія SEO-постів одразу в календар |
| `/app/settings` | Назва простору, **часовий пояс**, мова, баланс AI-кредитів |

## Архітектура

- **Next.js 15 (App Router) + TypeScript**, **Prisma** (SQLite для розробки → PostgreSQL у продакшені).
- **REST API** `/api/*` — один і той самий для вебу та майбутніх застосунків Android/iOS.
  Авторизація: httpOnly cookie (веб) або `Authorization: Bearer <token>` (мобільні; токен повертають `/api/auth/login|register`).
- **Мультиорендність**: User → Membership → Workspace; усі дані прив'язані до робочого простору.
- **Тарифи** (`src/lib/plans.ts`): 14-денний trial з лімітами Pro → після завершення режим лише для читання,
  планування/публікація призупиняються до вибору тарифу (Starter / Pro / Agency). Оплата підключається пізніше — вона лише змінює `Workspace.plan`.
- **AI — окрема плата**: кредити `Workspace.aiCredits` + журнал `AiUsage`. 1 рерайт = 1 кредит, AI-план = 1 кредит/пост,
  автоматичне повернення при помилці. Trial дає 30 кредитів.
- **AI «під капотом»** (`src/lib/ai/providers.ts`): `AI_PROVIDER=gemini` (за замовчуванням), `deepseek` або `anthropic`.
  Клієнт не бачить, яка модель працює.
- **Публікатори** (`src/lib/publishers/*`): спільний інтерфейс `Publisher` — нова соцмережа = новий файл.
- **Планувальник**: `npm run worker` (постійний процес) або `GET /api/cron` з `Authorization: Bearer $CRON_SECRET` щохвилини (Vercel Cron тощо).
  Захоплення поста атомарне — подвійної публікації не буде.

## Змінні середовища

Див. `.env.example`.

## Далі (roadmap)

1. Нові мережі: X, LinkedIn, Threads, TikTok, Pinterest, YouTube Shorts; OAuth-підключення замість ручних токенів.
2. Шифрування токенів каналів у базі (KMS / libsodium).
3. Оплата (Stripe / WayForPay / LiqPay): тарифи + пакети AI-кредитів.
4. Мобільні застосунки (Expo / React Native) на тому ж API.
5. Завантаження медіа (S3/R2) замість URL, команда та ролі, аналітика.
