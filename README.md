# Dashboard

An ambient, always-on personal dashboard built as a Next.js route. Designed for a wall-mounted Raspberry Pi display but works in any browser.

![Dashboard](screenshot.png)

## Widgets

**Weather** — Current conditions, 3-day forecast, feels-like, wind, humidity, and precipitation alerts. Nearby art gallery exhibits listed below.

**Today** — Google Calendar events with time blocks, free-gap detection between events, and a "Free for Xh Ym" indicator when no event is active.

**Subway** — Real-time MTA arrivals for configurable lines and station. Uptown/Downtown split with alert banners. Nearby NYC events listed below.

**Now Showing** — Movies currently in theaters via TMDB, sorted by audience heat. Auto-scrolling credits-style list with poster art, genre tags, and ratings. "Quiet Only" filter removes Action/Horror/Thriller.

**To-Do** — Personal and work task lists pulled from Notion. Inline add (`+ add`), tap-to-complete with optimistic updates, per-column progress bars, daily streak tracking with tally marks, and confetti on 100% completion.

**Books** — NYT Bestsellers with cover art, yearly read count from Goodreads, and last-read title. Letterboxd watchlist posters below with streaming availability highlights, yearly film count, and total hours watched.

**News Ticker** — Scrolling headlines from Hacker News, market data, and NYT. Links open in browser on desktop; on Raspberry Pi, tapping sends the link to a Discord channel instead.

**Pomodoro Timer** — Footer bar with 25m work / 5m break / 15m long break cycling. Circular SVG progress ring, session counter, and a red screen flash on phase transitions.

## Architecture

The dashboard is a single `page.tsx` client component mounted at `/dashboard` inside a larger Next.js app. API routes under `/dashboard/api/*` handle all data fetching server-side with ISR caching:

| Route | Source | Refresh |
|---|---|---|
| `/api/weather` | Open-Meteo + BigDataCloud | 30 min |
| `/api/calendar` | Google Calendar | 5 min |
| `/api/subway` | MTA GTFS-RT | 30 sec |
| `/api/movies` | TMDB | 6 hr |
| `/api/letterboxd` | Letterboxd RSS + TMDB | 1 hr |
| `/api/goodreads` | Goodreads RSS | 1 hr |
| `/api/trending-books` | NYT Books API | 24 hr |
| `/api/todo` | Notion Blocks API | 10 min |
| `/api/news` | HN, NYT, Market APIs | 15 min |
| `/api/events` | NYC event sources | 1 hr |
| `/api/galleries` | Chelsea gallery listings | 24 hr |
| `/api/fun-fact` | Gemini | 1 hr |
| `/api/share` | Discord Webhook | on-demand |

Client-side polling via SWR with `refreshWhenHidden: true` so the display stays current even when the browser tab is backgrounded.

## Configuration

All personal settings live in `lib/config.json`:

```json
{
  "address": "241 W 24th St, New York, NY 10011",
  "subwayLines": ["C", "E", "1", "F", "M"],
  "subwayStation": "23 St",
  "letterboxd": "shubert",
  "goodreads": "32783670-shubham-gupte",
  "timezones": [
    { "label": "NYC", "tz": "America/New_York" },
    { "label": "UTC", "tz": "UTC" },
    { "label": "SF", "tz": "America/Los_Angeles" }
  ],
  "streamingProviders": {
    "netflix": true,
    "prime": true,
    "max": true
  }
}
```

## Environment Variables

| Variable | Purpose |
|---|---|
| `TMDB_API_KEY` | Movie data + posters |
| `GOOGLE_CALENDAR_ID` | Calendar events |
| `NYT_BOOKS_API_KEY` | Bestseller lists |
| `NOTION_API_KEY` | Todo read/write |
| `NOTION_TODO_DB` | Notion page ID (personal) |
| `NOTION_WORK_DB` | Notion page ID (work) |
| `DISCORD_WEBHOOK_URL` | Pi share-to-Discord |
| `FUN_FACT_API_KEY` | Daily fun fact |
| `NEXT_PUBLIC_BDC_API_KEY` | BigDataCloud geocoding |

## Running

The dashboard is a route inside the [chintu](https://github.com/Shubham-Gupte/chintu) monorepo. From the project root:

```sh
docker compose up frontend
```

Then open `http://localhost:8080/dashboard`.
