import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import {
  Activity,
  ArrowLeft,
  Braces,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Code2,
  Copy,
  Database,
  FileJson2,
  Fingerprint,
  Globe2,
  List,
  Inbox,
  LoaderCircle,
  Plus,
  Radio,
  RefreshCw,
  Send,
  Trash2,
  Webhook,
  X,
} from 'lucide-react';

const SERVER_URL = (import.meta.env.VITE_SERVER_URL || 'http://localhost:3001').replace(/\/+$/, '');
const TEST_EVENT = {
  id: 'evt_1Qw5kL2eZvKYlo2Cx7v3qH9a',
  object: 'event',
  api_version: '2024-06-20',
  created: 1733779200,
  type: 'payment_intent.succeeded',
  livemode: false,
  data: {
    object: {
      id: 'pi_3Qw5kL2eZvKYlo2C0Zx7aB9c',
      object: 'payment_intent',
      amount: 2499,
      currency: 'usd',
      status: 'succeeded',
      description: 'Order #10482',
      metadata: { order_id: '10482', customer: 'cus_demo_82' },
    },
  },
};

const METHOD_STYLES = {
  GET: 'text-sky-300 bg-sky-300/10 border-sky-300/20',
  POST: 'text-emerald-300 bg-emerald-300/10 border-emerald-300/20',
  DELETE: 'text-rose-300 bg-rose-300/10 border-rose-300/20',
  PUT: 'text-amber-300 bg-amber-300/10 border-amber-300/20',
  PATCH: 'text-amber-300 bg-amber-300/10 border-amber-300/20',
};

function formatTime(value) {
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(value));
}

function formatBody(body) {
  if (body === null || body === undefined) return 'null';
  if (typeof body === 'string') {
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      return body;
    }
  }
  return JSON.stringify(body, null, 2);
}

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

function App() {
  const [binId, setBinId] = useState('');
  const [requests, setRequests] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [binInput, setBinInput] = useState('');
  const [activeTab, setActiveTab] = useState('body');
  const [isWorking, setIsWorking] = useState(false);
  const [connected, setConnected] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const hookUrl = binId ? `${SERVER_URL}/hook/${binId}` : '';
  const selectedRequest = useMemo(
    () => requests.find((request) => request.id === selectedId) ?? requests[0] ?? null,
    [requests, selectedId],
  );

  useEffect(() => {
    if (!binId) return undefined;

    const socket = io(SERVER_URL);
    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join_bin', binId);
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('webhook_received', (capturedRequest) => {
      setRequests((current) => [capturedRequest, ...current.filter((request) => request.id !== capturedRequest.id)].slice(0, 50));
      setSelectedId(capturedRequest.id);
    });
    socket.on('requests_cleared', () => {
      setRequests([]);
      setSelectedId(null);
    });

    return () => {
      socket.disconnect();
      setConnected(false);
    };
  }, [binId]);

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(''), 2400);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  async function openBin(id) {
    const normalizedId = id.trim();
    if (!normalizedId) return;
    setIsWorking(true);
    setError('');
    try {
      const data = await readResponse(await fetch(`${SERVER_URL}/api/bins/${encodeURIComponent(normalizedId)}`));
      setBinId(data.binId);
      setRequests(data.requests);
      setSelectedId(data.requests[0]?.id ?? null);
      setActiveTab('body');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsWorking(false);
    }
  }

  async function createBin() {
    setIsWorking(true);
    setError('');
    try {
      const data = await readResponse(await fetch(`${SERVER_URL}/api/bins`, { method: 'POST' }));
      setBinId(data.binId);
      setRequests([]);
      setSelectedId(null);
      setActiveTab('body');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsWorking(false);
    }
  }

  async function copyValue(value, message = 'Copied to clipboard') {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(message);
    } catch {
      setError('Clipboard access is unavailable in this browser context.');
    }
  }

  async function sendTestWebhook() {
    setIsWorking(true);
    setError('');
    try {
      await readResponse(await fetch(hookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Inspector-Test': 'true' },
        body: JSON.stringify(TEST_EVENT),
      }));
      setNotice('Test webhook sent');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsWorking(false);
    }
  }

  async function clearRequests() {
    setIsWorking(true);
    setError('');
    try {
      await readResponse(await fetch(`${SERVER_URL}/api/bins/${encodeURIComponent(binId)}/requests`, { method: 'DELETE' }));
      setRequests([]);
      setSelectedId(null);
      setNotice('Requests cleared');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsWorking(false);
    }
  }

  function goHome() {
    setBinId('');
    setRequests([]);
    setSelectedId(null);
    setError('');
  }

  const tabContent = selectedRequest
    ? activeTab === 'body'
      ? formatBody(selectedRequest.body)
      : activeTab === 'headers'
        ? selectedRequest.headers
        : selectedRequest.query
    : null;
  const bodyText = selectedRequest ? formatBody(selectedRequest.body) : '';
  const curlSnippet = `curl -X POST '${hookUrl}' \\\n  -H 'Content-Type: application/json' \\\n  -d '{"event":"hello","source":"your-app"}'`;

  if (!binId) {
    return (
      <main className="landing-shell min-h-screen text-white">
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
          <button className="brand-mark" onClick={goHome} aria-label="Relaybox home">
            <span className="brand-icon"><Webhook size={19} strokeWidth={2.2} /></span>
            <span>relaybox<span className="brand-period">.</span></span>
          </button>
          <div className="top-status"><span className="status-pulse" /> All systems operational</div>
        </header>

        <section className="landing-content mx-auto grid w-full max-w-6xl items-center gap-14 px-5 pb-20 pt-14 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20 lg:pb-28 lg:pt-20">
          <div className="landing-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> REQUESTS, IN FULL VIEW</div>
            <h1>Every request.<br /><span>Right where you need it.</span></h1>
            <p className="landing-description">A quiet place to catch webhooks, inspect payloads, and see what your services are really sending.</p>
            <div className="landing-points">
              <div><Radio size={16} /><span>Live delivery stream</span></div>
              <div><Braces size={16} /><span>Readable payloads</span></div>
              <div><Fingerprint size={16} /><span>Ephemeral, in-memory bins</span></div>
            </div>
          </div>

          <div className="entry-panel">
            <div className="panel-cap"><span>01 / START LISTENING</span><Activity size={16} /></div>
            <h2>Create a webhook endpoint</h2>
            <p>Get a unique URL and watch requests arrive in real time.</p>
            <button className="primary-button w-full" onClick={createBin} disabled={isWorking}>
              {isWorking ? <LoaderCircle className="animate-spin" size={18} /> : <Plus size={18} />}
              Create new endpoint
              <ChevronRight className="ml-auto" size={17} />
            </button>
            <div className="divider-label"><span /> OR INSPECT AN EXISTING BIN <span /></div>
            <form className="join-form" onSubmit={(event) => { event.preventDefault(); openBin(binInput); }}>
              <label htmlFor="bin-id">Bin ID</label>
              <div className="join-row">
                <input id="bin-id" value={binInput} onChange={(event) => setBinInput(event.target.value)} placeholder="e.g. a8Kp3Qx" autoComplete="off" />
                <button className="icon-button enter-button" type="submit" disabled={isWorking || !binInput.trim()} aria-label="Inspect bin"><ArrowLeft size={18} /></button>
              </div>
            </form>
            {error && <div className="error-message"><CircleHelp size={15} />{error}</div>}
            <div className="entry-foot"><Clock3 size={14} /> Bins are held in memory and clear on restart</div>
          </div>
        </section>
        <footer className="landing-footer mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <span>RELAYBOX / HTTP INSPECTOR</span><span>BUILT FOR THE MOMENT A REQUEST ARRIVES</span>
        </footer>
        {notice && <div className="toast"><Check size={15} />{notice}</div>}
      </main>
    );
  }

  return (
    <main className="dashboard-shell flex h-screen min-h-[620px] flex-col text-white">
      <header className="dash-header">
        <div className="flex min-w-0 items-center gap-4">
          <button className="brand-mark compact-brand" onClick={goHome} aria-label="Back to home">
            <span className="brand-icon"><Webhook size={17} strokeWidth={2.2} /></span>
            <span>relaybox<span className="brand-period">.</span></span>
          </button>
          <span className="header-divider" />
          <div className="crumb"><span>ENDPOINT</span><ChevronRight size={13} /><strong>{binId}</strong></div>
        </div>
        <div className="header-actions">
          <span className={`connection-state ${connected ? 'is-live' : ''}`}><span />{connected ? 'Live' : 'Connecting'}</span>
          <button className="quiet-button new-bin-button" onClick={createBin} disabled={isWorking}><Plus size={15} /> New bin</button>
        </div>
      </header>

      <section className="endpoint-bar">
        <div className="endpoint-icon"><Globe2 size={16} /></div>
        <div className="endpoint-info"><span>YOUR LISTENING URL</span><code>{hookUrl}</code></div>
        <div className="endpoint-actions">
          <button className="copy-url-button" onClick={() => copyValue(hookUrl, 'Endpoint URL copied')}><Copy size={15} /><span>Copy URL</span></button>
          <button className="test-button" onClick={sendTestWebhook} disabled={isWorking}><Send size={15} /><span>Send test webhook</span></button>
          <button className="quiet-button clear-button" onClick={clearRequests} disabled={isWorking || requests.length === 0}><Trash2 size={15} /><span>Clear requests</span></button>
        </div>
      </section>

      {error && <div className="dashboard-error"><CircleHelp size={15} />{error}<button onClick={() => setError('')} aria-label="Dismiss error"><X size={15} /></button></div>}

      <section className="inspector-grid min-h-0 flex-1">
        <aside className="feed-panel">
          <div className="feed-heading">
            <div><div className="section-label">INCOMING TRAFFIC</div><h2>Request feed <span>{requests.length}</span></h2></div>
            <button className="small-icon-button" onClick={() => openBin(binId)} title="Refresh requests" aria-label="Refresh requests"><RefreshCw size={15} /></button>
          </div>
          <div className="feed-subline"><span className="mini-live" /> Listening for requests <span className="feed-limit">MAX 50</span></div>
          <div className="request-list">
            {requests.length === 0 ? (
              <div className="feed-empty"><Inbox size={20} /><span>Nothing here yet</span><small>New requests will appear in this feed.</small></div>
            ) : requests.map((request) => (
              <button key={request.id} className={`request-row ${selectedRequest?.id === request.id ? 'selected' : ''}`} onClick={() => setSelectedId(request.id)}>
                <div className="request-row-top"><span className={`method-badge ${METHOD_STYLES[request.method] || 'text-slate-300 bg-slate-300/10 border-slate-300/20'}`}>{request.method}</span><span className="request-time">{formatTime(request.timestamp)}</span></div>
                <div className="request-row-bottom"><span className="request-id">{request.id.slice(0, 8)}</span><span className="request-size">{request.contentLength} B</span></div>
              </button>
            ))}
          </div>
          <div className="feed-footer"><Database size={14} /> In-memory storage <span className="feed-footer-dot" /> {requests.length} / 50</div>
        </aside>

        <section className="details-panel">
          {selectedRequest ? (
            <>
              <div className="details-heading">
                <div className="details-title"><span className={`method-badge large-method ${METHOD_STYLES[selectedRequest.method] || 'text-slate-300 bg-slate-300/10 border-slate-300/20'}`}>{selectedRequest.method}</span><div><h2>Request details</h2><p>{selectedRequest.id}</p></div></div>
                <div className="details-meta"><span><Clock3 size={14} />{new Date(selectedRequest.timestamp).toLocaleString()}</span><span><Globe2 size={14} />{selectedRequest.ip}</span></div>
              </div>
              <div className="detail-tabs" role="tablist" aria-label="Request details">
                <button className={activeTab === 'body' ? 'active' : ''} onClick={() => setActiveTab('body')} role="tab"><FileJson2 size={15} /> Body <span>{selectedRequest.body == null ? '0' : formatBody(selectedRequest.body).length}</span></button>
                <button className={activeTab === 'headers' ? 'active' : ''} onClick={() => setActiveTab('headers')} role="tab"><List size={15} /> Headers <span>{Object.keys(selectedRequest.headers || {}).length}</span></button>
                <button className={activeTab === 'query' ? 'active' : ''} onClick={() => setActiveTab('query')} role="tab"><Code2 size={15} /> Query <span>{Object.keys(selectedRequest.query || {}).length}</span></button>
                <div className="tab-spacer" />
                {activeTab === 'body' && <button className="copy-detail" onClick={() => copyValue(bodyText, 'Body copied')}><Copy size={14} /><span>Copy body</span></button>}
              </div>
              <div className="detail-content">
                {activeTab === 'body' && <pre className="body-code"><code>{tabContent}</code></pre>}
                {activeTab !== 'body' && (Object.keys(tabContent || {}).length > 0 ? (
                  <div className="kv-table">
                    {Object.entries(tabContent).map(([key, value]) => <div className="kv-row" key={key}><span className="kv-key">{key}</span><span className="kv-value">{typeof value === 'string' ? value : JSON.stringify(value)}</span></div>)}
                  </div>
                ) : <div className="no-fields">No {activeTab === 'headers' ? 'headers' : 'query parameters'} captured.</div>)}
              </div>
              <div className="request-footnote"><span>CONTENT LENGTH <strong>{selectedRequest.contentLength} bytes</strong></span><span>REMOTE ADDRESS <strong>{selectedRequest.ip}</strong></span></div>
            </>
          ) : (
            <div className="waiting-state">
              <div className="waiting-mark"><Activity size={22} /></div>
              <div className="section-label">ENDPOINT READY</div>
              <h2>Waiting for a request</h2>
              <p>Send anything to your endpoint. The details will show up here as soon as it lands.</p>
              <div className="curl-card">
                <div className="curl-card-heading"><span><Code2 size={15} /> QUICK START</span><button onClick={() => copyValue(curlSnippet, 'cURL command copied')}><Copy size={14} /> Copy</button></div>
                <pre><code>{curlSnippet}</code></pre>
              </div>
              <button className="waiting-test" onClick={sendTestWebhook} disabled={isWorking}><Send size={15} />Send a sample request</button>
            </div>
          )}
        </section>
      </section>
      <footer className="dashboard-footer"><span><span className="footer-led" /> SERVER {SERVER_URL}</span><span>RELAYBOX <span className="footer-slash">/</span> LIVE REQUEST INSPECTOR</span></footer>
      {notice && <div className="toast"><Check size={15} />{notice}</div>}
    </main>
  );
}

export default App;
