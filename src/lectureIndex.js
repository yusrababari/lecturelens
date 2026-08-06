import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export const PDF_URL = '/notes.pdf';

const DEMO_KNOWLEDGE = [
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
  {
    match: ['overview', 'lecture about'],
    answer:
      'This lecture index covers the core of a machine-learning course: perceptrons and neural networks, gradient descent, backpropagation, plus operating-system topics like deadlocks, paging, and virtual memory. Ask about any of these for a deeper dive.',
    sources: [
      { title: 'LectureLens — Demo Index', snippet: 'Topics: ML, OS, data structures, algorithms.' },
    ],
  },
  {
    match: ['terms', 'definitions'],
    answer:
      'Key terms in this corpus: perceptron (single artificial neuron), gradient descent (loss-minimizing optimization loop), backpropagation (chain-rule gradient computation), deadlock (permanent process blocking), and paging (fixed-size virtual memory).',
    sources: [
      { title: 'LectureLens — Glossary', snippet: 'Collected from the lecture notes in the index.' },
    ],
  },
  {
    match: ['summary', 'takeaways'],
    answer:
      'Main takeaways: models learn by optimizing a loss with gradient descent; backpropagation supplies the gradients; operating systems avoid deadlocks using the four Coffman conditions and manage memory with paging.',
    sources: [
      { title: 'LectureLens — Summary', snippet: 'Synthesized from indexed lecture passages.' },
    ],
  },
  {
    match: ['example'],
    answer:
      'Example from the notes: a single-layer perceptron that separates two classes with a straight decision boundary, e.g., classifying a point (x1, x2) as A or B by checking whether w1·x1 + w2·x2 + b > 0. Because the boundary is linear, XOR cannot be learned by one perceptron alone.',
    sources: [
      { title: 'LectureLens — Example', snippet: 'Perceptron decision boundary worked example.' },
    ],
  },
];

const DEMO_FALLBACK = {
  answer:
    "I don't have a lecture snippet for that yet, but I'm grounded in the notes I was trained on. Try one of the suggestions, or rephrase your question.",
  sources: [
    { title: 'LectureLens — Note Index', snippet: 'No matching passage found in the current corpus.' },
  ],
};

export const PDF_FALLBACK = {
  answer:
    "I couldn't find that in the notes. Try rephrasing, or ask about a term that appears on one of the pages.",
  sources: [{ title: 'notes.pdf — full text', snippet: 'No matching passage found.' }],
};

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

export async function loadLecture(url) {
  const doc = await pdfjsLib.getDocument(url).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item) => ('str' in item ? item.str : ' ')).join(' ');
    pages.push({ page: i, text });
  }
  await doc.destroy();
  return pages;
}

export function answerFromPages(pages, question) {
  const qTokens = tokenize(question);
  const chunks = [];
  pages.forEach(({ page, text }) => {
    text
      .split(/\n+/)
      .map((s) => s.replace(/\s+/g, ' ').trim())
      .filter((s) => s.length > 40)
      .forEach((clean) => chunks.push({ page, text: clean }));
  });

  const ranked = chunks
    .map((chunk) => {
      const textTokens = new Set(tokenize(chunk.text));
      const score = qTokens.reduce((acc, t) => acc + (textTokens.has(t) ? 1 : 0), 0);
      return { ...chunk, score };
    })
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (!best || best.score < 1) return null;

  const snippet = best.text.length > 420 ? best.text.slice(0, 420) + '…' : best.text;
  return {
    answer: snippet,
    sources: [{ title: `notes.pdf — page ${best.page}`, snippet }],
  };
}

export function answerFromDemo(question) {
  const t = question.toLowerCase();
  const hit = DEMO_KNOWLEDGE.find((k) => k.match.some((m) => t.includes(m)));
  return hit || DEMO_FALLBACK;
}
