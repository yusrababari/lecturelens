import { useEffect, useRef, useState } from 'react';
import {
  PDF_URL,
  PDF_FALLBACK,
  answerFromDemo,
  answerFromPages,
  loadLecture,
} from './lectureIndex';

const SUGGESTIONS = [
  { label: 'Overview', text: 'What is this lecture about?' },
  { label: 'Key terms', text: 'What are the most important terms and definitions?' },
  { label: 'Summary', text: 'Summarize the main takeaways.' },
  { label: 'Example', text: 'Give me an example from the notes.' },
];

let nextId = 1;

export default function App() {
  const [messages, setMessages] = useState(() => [
    {
      id: 0,
      role: 'bot',
      text: 'Loading lecture notes… ask me anything once indexing is done.',
    },
  ]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('Loading lecture notes...');
  const [thinking, setThinking] = useState(false);
  const [lecture, setLecture] = useState(null);
  const listRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    loadLecture(PDF_URL)
      .then((pages) => {
        if (cancelled) return;
        setLecture(pages);
        setStatus(`Ready — ${pages.length} pages indexed`);
        setMessages((m) => [
          {
            id: 0,
            role: 'bot',
            text: `I've indexed notes.pdf (${pages.length} pages). Ask me anything from the lecture and I'll quote the source passage.`,
          },
        ]);
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('Ready — demo mode (add public/notes.pdf)');
        setMessages((m) => [
          {
            id: 0,
            role: 'bot',
            text: 'No notes.pdf found yet. I’m running in demo mode — drop your PDF into public/notes.pdf and refresh.',
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

    let result;
    if (lecture) {
      result = answerFromPages(lecture, text) ?? PDF_FALLBACK;
    } else {
      result = answerFromDemo(text);
    }

    setThinking(false);
    setMessages((m) => [...m, { id: nextId++, role: 'bot', text: result.answer, sources: result.sources }]);
  }

  return (
    <main className="app-shell">
      <div className="app-panel">
        <div className="app-body">
          <aside className="brand-rail" aria-label="LectureLens overview">
            <div>
              <p className="eyebrow">Lecture RAG</p>
              <h1>LectureLens</h1>
              <p className="brand-copy">
                A study companion that answers questions from your lecture notes with cited sources.
              </p>
            </div>
            <div className="lecture-stack" aria-hidden="true">
              <div className="lecture-card lecture-card-one"><span>Machine Learning</span></div>
              <div className="lecture-card lecture-card-two"><span>Operating Systems</span></div>
              <div className="lecture-card lecture-card-three"><span>Algorithms</span></div>
            </div>
            <div className="rail-footer">
              <span className="rail-dot"></span>
              Grounded answers with source snippets
            </div>
          </aside>

          <section className="chat-panel" aria-label="LectureLens study chatbot">
            <header className="chat-header">
              <div>
                <p className="eyebrow">LectureLens — Now in session</p>
                <h2>{lecture ? 'notes.pdf' : 'Lecture Notes'}</h2>
              </div>
              <div className={`status ${status.startsWith('Ready') ? 'ready' : ''}`}>{status}</div>
            </header>

            <div className="messages" ref={listRef} aria-live="polite">
              {messages.map((msg) => (
                <article className={`message ${msg.role}`} key={msg.id}>
                  <div className="avatar" aria-hidden="true">{msg.role === 'bot' ? 'L' : 'You'}</div>
                  <div className="bubble">
                    {msg.text}
                    {msg.sources && (
                      <div className="sources">
                        {msg.sources.map((s) => (
                          <div className="source" key={s.title}>
                            <strong>{s.title}</strong>
                            {s.snippet}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              ))}
              {thinking && (
                <article className="message bot thinking">
                  <div className="avatar" aria-hidden="true">L</div>
                  <div className="bubble">
                    <span className="thinking-dot"></span>
                    <span className="thinking-dot"></span>
                    <span className="thinking-dot"></span>
                  </div>
                </article>
              )}
            </div>

            <div className="suggestions" aria-label="Suggested questions">
              {SUGGESTIONS.map((s) => (
                <button type="button" key={s.label} onClick={() => send(s.text)}>{s.label}</button>
              ))}
            </div>

            <form className="composer" onSubmit={(e) => { e.preventDefault(); send(); }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                type="text"
                autoComplete="off"
                placeholder="Ask a question about your lectures..."
              />
              <button type="submit" disabled={!input.trim() || thinking}>Send</button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
