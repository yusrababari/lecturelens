import { useEffect, useRef, useState } from 'react';

const SUGGESTIONS = [
  { label: 'Perceptrons', text: 'What is a perceptron in machine learning?' },
  { label: 'Gradient descent', text: 'Explain gradient descent with an example.' },
  { label: 'Deadlocks', text: 'What conditions are required for a deadlock?' },
  { label: 'Backpropagation', text: 'Walk me through how backpropagation works.' },
];

const KNOWLEDGE = [
  {
    match: ['perceptron'],
    answer:
      'A perceptron is the simplest artificial neuron. It takes weighted inputs, adds a bias, and passes the sum through an activation function to output 0 or 1. It is the building block of the single-layer neural networks covered in the ML lecture. Note: a single perceptron can only learn linearly separable patterns.',
    sources: [
      { title: 'CS230 — Intro to Neural Networks', snippet: 'Slide 14: a perceptron computes y = step(w·x + b).' },
      { title: 'ML Notes — Linear Classifiers', snippet: 'A perceptron separates the feature space with a decision boundary.' },
    ],
  },
  {
    match: ['gradient', 'descent'],
    answer:
      'Gradient descent is an optimization loop. We compute the gradient of the loss with respect to the weights, then take a step in the opposite direction scaled by a learning rate. Repeating this lowers the loss toward a local minimum. The lecture compares batch, stochastic, and mini-batch variants.',
    sources: [
      { title: 'CS229 — Gradient Descent', snippet: 'w := w − α∇w L(w), updated per batch.' },
      { title: 'DL Notes — Optimizers', snippet: 'The learning rate α controls step size; too large diverges.' },
    ],
  },
  {
    match: ['deadlock'],
    answer:
      'A deadlock occurs when a set of processes blocks forever, each holding a resource another needs. Four conditions must hold: mutual exclusion, hold-and-wait, no preemption, and circular wait. The OS lecture covers prevention, avoidance (the banker’s algorithm), detection, and recovery.',
    sources: [
      { title: 'CS162 — Deadlocks', snippet: 'Coffman conditions: mutual exclusion, hold & wait, no preemption, circular wait.' },
      { title: 'OS Notes — Resource Allocation', snippet: "The banker's algorithm avoids unsafe states." },
    ],
  },
  {
    match: ['backprop', 'backpropagation'],
    answer:
      'Backpropagation computes gradients for every weight by applying the chain rule from the loss backward through the network. First a forward pass records activations, then a backward pass accumulates error terms layer by layer. Those gradients feed gradient descent.',
    sources: [
      { title: 'CS230 — Backpropagation', snippet: '∂L/∂w = δ · activation, with δ propagated backward.' },
      { title: 'DL Notes — Training Loop', snippet: 'Forward pass → loss → backward pass → weight update.' },
    ],
  },
  {
    match: ['binary search', 'search tree'],
    answer:
      'Binary search repeatedly halves a sorted array, comparing the target to the middle element, giving O(log n) time. Binary search trees store keys so that left < node < right, enabling fast search, insert, and delete.',
    sources: [
      { title: 'CS106B — Searching & Sorting', snippet: 'Binary search requires sorted input; O(log n) comparisons.' },
      { title: 'Data Structures Notes — BSTs', snippet: 'In-order traversal yields sorted output.' },
    ],
  },
  {
    match: ['paging', 'virtual memory', 'page'],
    answer:
      'Paging splits memory into fixed-size frames and pages. The CPU issues virtual addresses, and a page table maps them to physical frames; a TLB caches recent mappings to keep it fast. A page fault occurs when the mapping is absent and the OS must fetch the page from disk.',
    sources: [
      { title: 'CS162 — Virtual Memory', snippet: 'Page table + TLB translate virtual to physical addresses.' },
      { title: 'OS Notes — Paging', snippet: 'Page faults trigger demand paging from secondary storage.' },
    ],
  },
];

const FALLBACK = {
  answer:
    "I don't have a lecture snippet for that yet, but I'm grounded in the notes I was trained on. Try one of the suggestions, or rephrase your question.",
  sources: [
    { title: 'LectureLens — Note Index', snippet: 'No matching passage found in the current corpus.' },
  ],
};

function answerFor(text) {
  const t = text.toLowerCase();
  const hit = KNOWLEDGE.find((k) => k.match.some((m) => t.includes(m)));
  return hit || FALLBACK;
}

let nextId = 1;

export default function App() {
  const [messages, setMessages] = useState(() => [
    {
      id: 0,
      role: 'bot',
      text: 'Ask me about anything from your lecture notes — machine learning, operating systems, data structures, or algorithms.',
    },
  ]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('Checking workspace...');
  const [thinking, setThinking] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setStatus('Ready'), 900);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, thinking]);

  function send(raw) {
    const text = (raw ?? input).trim();
    if (!text || thinking) return;
    setInput('');
    setMessages((m) => [...m, { id: nextId++, role: 'user', text }]);
    setThinking(true);
    setTimeout(() => {
      const { answer, sources } = answerFor(text);
      setThinking(false);
      setMessages((m) => [...m, { id: nextId++, role: 'bot', text: answer, sources }]);
    }, 700 + Math.random() * 600);
  }

  return (
    <main className="app-shell">
      <aside className="brand-rail" aria-label="LectureLens overview">
        <div className="brand-mark" aria-hidden="true">L</div>
        <div>
          <p className="eyebrow">Lecture RAG</p>
          <h1>LectureLens</h1>
          <p className="brand-copy">
            A study companion that answers questions from your lecture notes with cited sources — machine learning, operating systems, and beyond.
          </p>
        </div>
        <div className="lecture-stack" aria-hidden="true">
          <div className="lecture-card lecture-card-one"><span>Deep Learning</span></div>
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
            <h2>CS Lecture Notes</h2>
          </div>
          <div className={`status ${status === 'Ready' ? 'ready' : ''}`}>{status}</div>
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
    </main>
  );
}
