import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export const PDF_URL = '/notes.pdf';

export const PDF_FALLBACK = {
  answer:
    "I couldn't find that in the notes. Try rephrasing, or ask about a term that appears on one of the pages.",
  sources: [{ title: 'notes.pdf — full text', snippet: 'No matching passage found.' }],
};

const STOPWORDS = new Set([
  'the', 'and', 'for', 'are', 'you', 'can', 'with', 'from', 'that', 'this', 'your',
  'about', 'explain', 'tell', 'give', 'which', 'how', 'why', 'what', 'whats',
  'does', 'not', 'but', 'have', 'has', 'was', 'were', 'will', 'would', 'could',
  'should', 'there', 'their', 'then', 'than', 'also', 'when', 'where', 'into',
  'over', 'under', 'other', 'some', 'such', 'just', 'know', 'dont', 'same', 'out',
  'who', 'whom', 'only', 'like', 'get', 'got', 'way', 'make', 'made', 'see',
  'look', 'ask', 'said', 'say', 'let', 'may', 'might', 'need', 'one', 'two',
]);

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function pageRefFor(question) {
  const m = question.toLowerCase().match(/\b(?:page|p)\.?\s*(\d+)(?:\s*[-–—]\s*(\d+))?\b/);
  if (!m) return null;
  const start = parseInt(m[1], 10);
  const end = m[2] ? parseInt(m[2], 10) : start;
  return { start, end };
}

function isHeading(line) {
  if (line.length < 3 || line.length > 60) return false;
  if (line.endsWith(':')) return true;
  if (/^(?:chapter|section|lecture|part|topic|unit)\b/i.test(line) && line.split(/\s+/).length <= 6) return true;
  return /^[A-Z0-9][A-Z0-9 &+\-–—./'()%:]{1,50}$/.test(line);
}

function mergeLines(lines) {
  const out = [];
  let cur = '';
  lines.forEach((line) => {
    cur = cur ? `${cur} ${line}` : line;
    if (/[.!?:;"”’)]$/.test(line)) {
      out.push(cur);
      cur = '';
    }
  });
  if (cur) out.push(cur);
  return out;
}

export function extractSections(text) {
  const lines = text
    .split(/\n+/)
    .map((s) => s.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean);

  const sections = [];
  let current = null;

  lines.forEach((line) => {
    if (isHeading(line)) {
      if (current) sections.push(current);
      current = { title: line, body: [] };
    } else {
      if (!current) current = { title: null, body: [] };
      current.body.push(line);
    }
  });
  if (current) sections.push(current);

  if (sections.length === 0) {
    const flat = text.replace(/\s+/g, ' ').trim();
    if (flat) sections.push({ title: null, body: [flat] });
  }

  return sections.map((s) => ({ ...s, body: mergeLines(s.body) }));
}

export async function loadLecture(url) {
  const doc = await pdfjsLib.getDocument(url).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let text = '';
    content.items.forEach((item) => {
      text += 'str' in item ? item.str : ' ';
      if (item.hasEOL) text += '\n';
    });
    pages.push({ page: i, text });
  }
  await doc.destroy();
  return pages;
}

function preview(text, max = 170) {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return t.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

export function answerFromPages(pages, question) {
  const pageRef = pageRefFor(question);

  let target = null;
  if (pageRef) {
    target = pages.find((p) => p.page >= pageRef.start && p.page <= pageRef.end);
  } else {
    const qTokens = tokenize(question).filter((t) => !STOPWORDS.has(t));
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
      .sort((a, b) => b.score - a.score || a.page - b.page);

    const best = ranked[0];
    if (!best || qTokens.length === 0 || best.score < 1) return null;
    target = pages.find((p) => p.page === best.page);
  }

  if (!target || !target.text.trim()) return null;

  const sections = extractSections(target.text);
  const lead = preview(target.text);
  const answer = pageRef
    ? `Sure — page ${target.page} of the notes covers: I've laid out the full content for you below.`
    : `I searched the notes and found the most relevant content on page ${target.page}. It discusses: “${lead}”. Here's the full passage below.`;

  return {
    answer,
    sources: [{ title: `notes.pdf — page ${target.page}`, sections }],
  };
}
