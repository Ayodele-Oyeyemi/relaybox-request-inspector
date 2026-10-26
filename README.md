# Relaybox Request Inspector

Relaybox is a real-time webhook and HTTP request inspector. Create an endpoint, send requests to its URL, and inspect captured headers, query parameters, request bodies, source IP, and timestamps in a live dashboard.

## Architecture

- `server/` is an Express API and catch-all webhook receiver, with Socket.IO for live updates. Bins and their latest 50 requests live in memory and are cleared when the server restarts.
- `client/` is a React application built with Vite, Tailwind CSS, and Lucide icons. Socket.IO subscriptions update the request feed without polling.
- The root npm workspace runs both packages together for local development.

## Requirements

- Node.js 20 or later
- npm 10 or later

## Local setup

```sh
npm install
```

Copy `server/.env.example` to `server/.env` and `client/.env.example` to `client/.env` if you need to customize the defaults. The server listens on port `3001`; the client uses `http://localhost:3001` unless `VITE_SERVER_URL` is set.

Run both applications:

```sh
npm run dev
```

Open the Vite URL printed in the terminal, usually `http://localhost:5173`. To run either service separately, use `npm run dev --workspace=server` or `npm run dev --workspace=client`.

Build the client for deployment with:

```sh
npm run build
```

Start the API in production with:

```sh
npm start
```

Set `PORT` and `CLIENT_URL` in the server environment when deploying. `CLIENT_URL` defaults to `*` to support external webhook senders and local development. Set `VITE_SERVER_URL` at client build time to the publicly reachable server URL.

## API

- `POST /api/bins` creates a unique seven-character bin ID.
- `GET /api/bins/:binId` returns bin metadata and captured requests.
- `DELETE /api/bins/:binId/requests` clears the request list.
- `ALL /hook/:binId` captures any HTTP method and responds with `{ "status": "captured", "binId": "..." }`.
- `GET /api/health` provides a basic server health check.

The webhook receiver accepts JSON, URL-encoded, text, and other raw payloads. Malformed JSON is retained as raw text instead of taking down the request handler. Request bodies are limited to 1 MB.
