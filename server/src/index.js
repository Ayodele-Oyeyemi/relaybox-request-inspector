import { randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { Server } from 'socket.io';

const PORT = Number(process.env.PORT) || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_URL || '*';
const REQUEST_LIMIT = 50;
const BODY_LIMIT = '1mb';
const bins = new Map();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  },
});

app.use(cors({ origin: CLIENT_ORIGIN, preflightContinue: true }));

function captureRawBody(request, response, buffer) {
  request.rawBody = buffer.toString('utf8');
}

app.use(express.json({ limit: BODY_LIMIT, verify: captureRawBody }));
app.use(express.urlencoded({ extended: true, limit: BODY_LIMIT, verify: captureRawBody }));
app.use(express.text({ type: ['text/*', 'application/xml'], limit: BODY_LIMIT, verify: captureRawBody }));
app.use(express.raw({ type: () => true, limit: BODY_LIMIT, verify: captureRawBody }));

app.use((error, request, response, next) => {
  if (error.type === 'entity.parse.failed') {
    request.body = request.rawBody ?? '';
    return next();
  }

  if (error.type === 'entity.too.large') {
    return response.status(413).json({ error: 'Request body exceeds the 1 MB limit.' });
  }

  return next(error);
});

function createBinId() {
  let binId;
  do {
    binId = randomBytes(6).toString('base64url').slice(0, 7);
  } while (bins.has(binId));
  return binId;
}

function getBody(request) {
  const body = request.body;
  const contentLength = request.get('content-length');
  if (contentLength !== undefined && Number(contentLength) === 0) return null;
  if (request.rawBody === undefined && request.get('transfer-encoding') === undefined) return null;
  if (Buffer.isBuffer(body)) return body.toString('utf8');
  if (body !== undefined) return body;
  return request.rawBody ?? null;
}

app.get('/api/health', (request, response) => {
  response.json({ status: 'ok' });
});

app.post('/api/bins', (request, response) => {
  const binId = createBinId();
  const bin = { binId, createdAt: new Date().toISOString(), requests: [] };
  bins.set(binId, bin);
  response.status(201).json({ binId, createdAt: bin.createdAt });
});

app.get('/api/bins/:binId', (request, response) => {
  const bin = bins.get(request.params.binId);
  if (!bin) return response.status(404).json({ error: 'Bin not found.' });
  return response.json(bin);
});

app.delete('/api/bins/:binId/requests', (request, response) => {
  const bin = bins.get(request.params.binId);
  if (!bin) return response.status(404).json({ error: 'Bin not found.' });
  bin.requests = [];
  io.to(bin.binId).emit('requests_cleared');
  return response.json({ status: 'cleared', binId: bin.binId });
});

app.all('/hook/:binId', (request, response) => {
  const bin = bins.get(request.params.binId);
  if (!bin) return response.status(404).json({ error: 'Bin not found.' });

  const rawBody = getBody(request);
  const declaredLength = request.get('content-length');
  const contentLength = declaredLength !== undefined
    ? Number(declaredLength) || 0
    : request.rawBody !== undefined
      ? Buffer.byteLength(request.rawBody)
      : 0;
  const capturedRequest = {
    id: randomUUID(),
    method: request.method,
    timestamp: new Date().toISOString(),
    headers: { ...request.headers },
    query: { ...request.query },
    body: rawBody,
    ip: request.ip,
    contentLength,
  };

  bin.requests.unshift(capturedRequest);
  if (bin.requests.length > REQUEST_LIMIT) bin.requests.length = REQUEST_LIMIT;
  io.to(bin.binId).emit('webhook_received', capturedRequest);

  return response.status(200).json({ status: 'captured', binId: bin.binId });
});

app.use((error, request, response, next) => {
  console.error(error);
  if (response.headersSent) return next(error);
  return response.status(500).json({ error: 'Internal server error.' });
});

io.on('connection', (socket) => {
  socket.on('join_bin', (binId) => {
    if (typeof binId === 'string' && bins.has(binId)) socket.join(binId);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Request Inspector API listening on http://localhost:${PORT}`);
});
