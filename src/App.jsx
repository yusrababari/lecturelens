import { useEffect, useRef, useState } from 'react';
import {
  PDF_URL,
  PDF_FALLBACK,
  answerFromPages,
  loadLecture,
} from './lectureIndex';

let nextId = 1;

export default function App() {
  const [messages, setMessages] = useState(() => [
    {
      id: 0,
      role: 'bot',
      text: 'Organising lecture notes… ask me anything once ready.',
    },
  ]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('booting: parsing notes.pdf');
  const [thinking, setThinking] = useState(false);
  const [lecture, setLecture] = useState(null);
  const listRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    loadLecture(PDF_URL)
      .then((pages) => {
        if (cancelled) return;
        setLecture(pages);
        setStatus(`ready — ${pages.length} pages indexed`);
        setMessages((m) => [
          {
            id: 0,
            role: 'bot',
            text: `Analysed notes.pdf (${pages.length} pages).Ask me anything from the lecture and I'll quote the source passage.`,
          },
        ]);
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('ready — add public/notes.pdf');
        setMessages((m) => [
          {
            id: 0,
            role: 'bot',
            text: 'no notes.pdf found yet. drop your pdf into public/notes.pdf and refresh.',
          },
        ]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, thinking]);

  async function send(raw) {
    const text = (raw ?? input).trim();
    if (!text || thinking) return;
    setInput('');
    setMessages((m) => [...m, { id: nextId++, role: 'user', text }]);
    setThinking(true);

    await new Promise((r) => setTimeout(r, 650 + Math.random() * 500));

    const result = lecture ? answerFromPages(lecture, text) ?? PDF_FALLBACK : PDF_FALLBACK;

    setThinking(false);
    setMessages((m) => [...m, { id: nextId++, role: 'bot', text: result.answer, sources: result.sources }]);
  }

  function openPdf() {
    if (lecture) window.open(PDF_URL, '_blank', 'noopener,noreferrer');
  }

  return (
    <main className="app-shell">
      <div className="app-panel">
        <div className="term-bar">
          <span className="term-dots" aria-hidden="true">
            <i className="dot dot-a"></i>
            <i className="dot dot-b"></i>
            <i className="dot dot-c"></i>
          </span>
          <span className="term-title">lecturelens@notes:~/cs</span>
          <span className="term-meta">{lecture ? `${lecture.length} pages loaded` : 'waiting for notes.pdf'}</span>
        </div>

        <div className="app-body">
          <aside className="brand-rail" aria-label="LectureLens overview">
            <div className="brand-top">
              <div className="brand-mark" aria-hidden="true">&gt;_</div>
              <div className="brand-head">
                <p className="eyebrow">// lecture summary</p>
                <h2>Lecture<span>Lens</span></h2>
                <p className="brand-copy">
                  &gt; study tool<br />
                  &gt; reliable answers, real sources
                </p>
              </div>
            </div>

            <div className="rail-divider" aria-hidden="true"></div>

<div className="lecture-stack">
              <button type="button" className="lecture-card lecture-card-one" onClick={openPdf}>
                <span className="card-index">01</span>
                <span className="card-title">notes.pdf</span>
                <span className="card-meta">operating systems</span>
                <span className="card-meta">CLICK TO OPEN</span>
                <span className="card-open">open ↗</span>
              </button>

            </div>

            <div className="corpus-stats">
              <div className="stat">
                <strong>{lecture ? lecture.length : '…'}</strong>
                <span>pages indexed</span>
              </div>
              <div className="stat stat-blue">
                <strong>local</strong>
                <span>no cloud needed</span>
              </div>
            </div>

            <div className="rail-footer">
              <span className="rail-dot"></span>
              SYSTEM READY · answers are based on the lecture notes you provide
            </div>
          </aside>

          <section className="chat-panel" aria-label="LectureLens study chatbot">
            <header className="chat-header">
              <div>
                <p className="eyebrow">// now in session</p>
                <h2>{lecture ? 'notes.pdf' : 'lecture notes'}</h2>
              </div>
              <div className={`status ${status.startsWith('ready') ? 'ready' : ''}`}>{status}</div>
            </header>

            <div className="messages" ref={listRef} aria-live="polite">
              {messages.map((msg) => (
                <article className={`message ${msg.role}`} key={msg.id}>
                  <div className="avatar" aria-hidden="true">{msg.role === 'bot' ? '>' : '$'}</div>
                  <div className="bubble">
                    {msg.text}
                    {msg.sources && (
                      <div className="sources">
                        {msg.sources.map((s) => (
                          <div className="source" key={s.title}>
                            <strong>{s.title}</strong>
                            {s.sections ? (
                              s.sections.map((sec, i) => (
                                <div className="source-section" key={i}>
                                  {sec.title && <strong className="section-title">{sec.title}</strong>}
                                  {sec.body.map((para, j) => (
                                    <p key={j}>{para}</p>
                                  ))}
                                </div>
                              ))
                            ) : (
                              s.snippet
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              ))}
              {thinking && (
                <article className="message bot thinking">
                  <div className="avatar" aria-hidden="true">&gt;</div>
                  <div className="bubble">
                    <span className="thinking-dot"></span>
                    <span className="thinking-dot"></span>
                    <span className="thinking-dot"></span>
                  </div>
                </article>
              )}
            </div>

            <form className="composer" onSubmit={(e) => { e.preventDefault(); send(); }}>
              <div className="prompt-line">
                <span className="prompt" aria-hidden="true">$</span>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  type="text"
                  autoComplete="off"
                  placeholder="ask a question about your lectures…"
                />
              </div>
              <button type="submit" disabled={!input.trim() || thinking}>send</button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
