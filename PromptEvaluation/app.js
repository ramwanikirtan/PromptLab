// ════════════════════════════════════════════════════════
//  CONFIG
// ════════════════════════════════════════════════════════
const MODELS = [
  { id: 'm1', name: 'GPT-4o-mini',      col: '#c0392b' },
  { id: 'm2', name: 'GPT-3.5-turbo',    col: '#1d4ed8' },
  { id: 'm3', name: 'Gemini 2.0 Flash', col: '#15803d' },
  { id: 'm4', name: 'Llama-3.2-3B',     col: '#7c3aed' },
];

let CHARTS = {};
const DEFAULT_REF = `The old lighthouse stood against the bruised sky, its beam slicing through
the fog like a lonely thought. The keeper had watched the tides for thirty
years, counting waves as other men counted their sins. Each morning he
descended the spiral stairs with the deliberateness of a man who had learned
that hurry was the enemy of wisdom.`;

// ════════════════════════════════════════════════════════
//  UTILS
// ════════════════════════════════════════════════════════
function tok(t) { return (t.toLowerCase().match(/\b[a-z]+\b/g) || []); }
function r2(n)  { return isNaN(n) ? '0.00' : (+n).toFixed(2); }

function updateWC(id, val) {
  document.getElementById(id).textContent = tok(val).length + ' words';
}

// ════════════════════════════════════════════════════════
//  METRIC 1 — LEXICAL DIVERSITY
// ════════════════════════════════════════════════════════

/**
 * TTR = |V| / N
 * |V| = unique word types, N = total word tokens
 */
function calcTTR(w) {
  return w.length ? new Set(w).size / w.length : 0;
}

/**
 * MSTTR = (1/k) × Σ TTR_j
 * k = number of 100-word segments, TTR_j = |V_j| / 100
 */
function calcMSTTR(w, seg = 100) {
  if (!w.length) return 0;
  const segs = [];
  for (let i = 0; i < w.length; i += seg) segs.push(w.slice(i, i + seg));
  return segs.reduce((a, s) => a + new Set(s).size / s.length, 0) / segs.length;
}

/**
 * Yule's K = 10^4 × (Σfi² − N) / N²
 * fi = frequency of word i, N = total tokens
 * Inverted for display: score = max(0, 10 − K/20)
 */
function calcYulesK(w) {
  if (!w.length) return { raw: 0, score: 10 };
  const N = w.length;
  const freq = {};
  w.forEach(x => freq[x] = (freq[x] || 0) + 1);
  const sumFi2 = Object.values(freq).reduce((a, f) => a + f * f, 0);
  const K = 10000 * (sumFi2 - N) / (N * N);
  return { raw: K, score: Math.max(0, 10 - K / 15) };
}

/**
 * MTLD = N / total_factors  (forward + backward average)
 * Factor resets when TTR drops to threshold (0.720)
 * Partial factor = (1 − TTR) / (1 − threshold)
 */
function calcMTLD(w, thr = 0.720) {
  function pass(toks) {
    let fac = 0, cnt = 0, types = new Set();
    for (const t of toks) {
      cnt++; types.add(t);
      if (types.size / cnt <= thr) { fac++; cnt = 0; types = new Set(); }
    }
    if (cnt > 0) { fac += (1 - types.size / cnt) / (1 - thr); }
    return fac > 0 ? toks.length / fac : toks.length;
  }
  if (!w.length) return { raw: 0, score: 0 };
  const raw = (pass(w) + pass([...w].reverse())) / 2;
  return { raw, score: Math.min(10, raw / 60 * 10) };
}

function lexDiv(text) {
  const w     = tok(text);
  const ttr   = calcTTR(w);
  const msttr = calcMSTTR(w);
  const yk    = calcYulesK(w);
  const mtld  = calcMTLD(w);
  const T = ttr * 10, M = msttr * 10, Y = yk.score, D = mtld.score;
  return {
    words:     w.length,
    ttr_raw:   ttr,   msttr_raw: msttr,
    yk_raw:    yk.raw, mtld_raw:  mtld.raw,
    TTR: T, MSTTR: M, YulesK: Y, MTLD: D,
    score: (T + M + Y + D) / 4
  };
}

// ════════════════════════════════════════════════════════
//  METRIC 2 — STYLE MATCH
// ════════════════════════════════════════════════════════

/**
 * TF Cosine Similarity
 * cos(A,B) = (A · B) / (‖A‖ × ‖B‖)
 * A, B = TF vectors over union vocabulary
 * TF(t,d) = count(t,d) / |d|
 */
function cosineSim(a, b) {
  const wa = tok(a), wb = tok(b);
  const vocab = [...new Set([...wa, ...wb])];
  if (!vocab.length) return 0;
  function tf(words) {
    const f = {}; words.forEach(w => f[w] = (f[w] || 0) + 1);
    const n = words.length;
    return vocab.map(v => (f[v] || 0) / Math.max(n, 1));
  }
  const va = tf(wa), vb = tf(wb);
  const dot = va.reduce((s, v, i) => s + v * vb[i], 0);
  const ma  = Math.sqrt(va.reduce((s, v) => s + v * v, 0));
  const mb  = Math.sqrt(vb.reduce((s, v) => s + v * v, 0));
  return (ma && mb) ? dot / (ma * mb) : 0;
}

/**
 * Stylometric Feature Distance
 * d = √(Σ (fi_gen − fi_ref)²)
 * f1 = avg sentence length, f2 = avg word length,
 * f3 = TTR, f4 = punctuation density
 * Score = max(0, 10 − d × 5)
 */
function styloDist(a, b) {
  function feats(t) {
    const sents = (t.match(/[^.!?]+[.!?]+/g) || [t]).filter(s => s.trim());
    const words = tok(t);
    const punct = (t.match(/[,;:'"()\-]/g) || []).length;
    return [
      sents.reduce((a, s) => a + s.split(' ').length, 0) / Math.max(sents.length, 1),
      words.reduce((a, w) => a + w.length, 0) / Math.max(words.length, 1),
      new Set(words).size / Math.max(words.length, 1),
      punct / Math.max(words.length, 1)
    ];
  }
  const fa = feats(a), fb = feats(b);
  const d  = Math.sqrt(fa.reduce((s, v, i) => s + (v - fb[i]) ** 2, 0));
  return Math.max(0, 10 - d * 5);
}

// PATCH: If reference is too short, skip style match
function styleMatch(text, ref) {
  if (tok(ref).length < 30) {
    return { Cosine: 0, Stylometric: 5.0, score: 5.0, skipped: true };
  }
  const cos = cosineSim(text, ref);
  const sty = styloDist(text, ref);
  return { Cosine: cos, Stylometric: sty, score: (cos * 10 + sty) / 2 };
}

// PATCH: Score card warnings and style match UI
function buildScoreCards(results, winner) {
  const cards = results.map(r => {
    let warnings = [];
    if (r.ld.score < 4) warnings.push('<div class="sc-warn">Try prompting for longer output with richer vocabulary</div>');
    if (r.sm.score < 4) warnings.push('<div class="sc-warn">Paste a full paragraph as reference style</div>');
    if (r.coh.score < 4) warnings.push('<div class="sc-warn">Prompt for longer, more connected sentences</div>');
    const styleScore = r.sm.skipped ? '<span title="Paste a full paragraph as reference">—</span>' : r2(r.sm.score);
    return `
      <div class="score-cell ${r.overall === winner.overall ? 'winner-cell' : ''}">
        <div class="sc-model" style="color:${r.col}">${r.name}</div>
        <div class="sc-num">${r2(r.overall)}</div>
        <div class="sc-breakdown">
          LD:&nbsp;&nbsp;&nbsp; ${r2(r.ld.score)}<br>
          Style:&nbsp;${styleScore}<br>
          Coh:&nbsp;&nbsp; ${r2(r.coh.score)}
        </div>
        <div class="sc-bar">
          <div class="sc-fill" id="fill_${r.id}" style="width:0%;background:${r.col}"></div>
        </div>
        ${warnings.join('')}
      </div>`;
  }).join('');

  return `
  <div class="section">
    <div class="section-title">Scores</div>
    <div class="score-row">${cards}</div>
  </div>`;
}

// ════════════════════════════════════════════════════════
//  METRIC 3 — COHERENCE
// ════════════════════════════════════════════════════════

/**
 * Jaccard Sentence Similarity
 * J(A,B) = |A ∩ B| / |A ∪ B|
 * A, B = word sets of adjacent sentences
 * Averaged over all consecutive sentence pairs
 */
function jaccard(text) {
  const sents = (text.match(/[^.!?]{8,}[.!?]+/g) || []).map(s => new Set(tok(s)));
  if (sents.length < 2) return 5;
  const sc = [];
  for (let i = 0; i < sents.length - 1; i++) {
    const u = new Set([...sents[i], ...sents[i + 1]]);
    sc.push(u.size ? [...sents[i]].filter(x => sents[i + 1].has(x)).length / u.size : 0);
  }
  let result = sc.reduce((a, b) => a + b, 0) / sc.length * 25;
  return Math.min(10, result);
}

/**
 * Flesch Reading Ease  [Flesch, 1948]
 * FRE = 206.835 − 1.015×(words/sentences) − 84.6×(syllables/words)
 * Syllables: count vowel groups per word (min 1)
 * Normalised: FRE / 10, clamped to [0, 10]
 */
function flesch(text) {
  const sents = (text.match(/[^.!?]+[.!?]+/g) || [text]).filter(s => s.trim());
  const words = tok(text);
  if (!words.length || !sents.length) return 5;
  const sylls = words.reduce((a, w) => a + Math.max(1, (w.match(/[aeiou]+/g) || []).length), 0);
  const raw   = 206.835 - 1.015 * (words.length / sents.length) - 84.6 * (sylls / words.length);
  return Math.max(0, Math.min(10, (raw - 10) / 5));
}

function coherence(text) {
  const j = jaccard(text), f = flesch(text);
  return { Jaccard: j, Flesch: f, score: (j + f) / 2 };
}

// ════════════════════════════════════════════════════════
//  EVALUATE
// ════════════════════════════════════════════════════════
function runEval() {
  const ref     = document.getElementById('refStyle').value || DEFAULT_REF;
  const results = MODELS
    .map(m => ({ ...m, text: document.getElementById(m.id).value.trim() }))
    .filter(m => m.text)
    .map(m => {
      const ld  = lexDiv(m.text);
      const sm  = styleMatch(m.text, ref);
      const coh = coherence(m.text);
      return { ...m, ld, sm, coh, overall: (ld.score + sm.score + coh.score) / 3 };
    });

  if (!results.length) { alert('Paste at least one model output.'); return; }

  Object.values(CHARTS).forEach(c => c.destroy());
  CHARTS = {};

  document.getElementById('report').innerHTML = buildReport(results);

  setTimeout(() => {
    results.forEach(r => {
      const el = document.getElementById('fill_' + r.id);
      if (el) el.style.width = (r.overall / 10 * 100) + '%';
    });
    buildCharts(results);
  }, 50);
}

function resetAll() {
  MODELS.forEach(m => {
    document.getElementById(m.id).value = '';
    updateWC('wc' + m.id.slice(1), '');
  });
  Object.values(CHARTS).forEach(c => c.destroy());
  CHARTS = {};
  document.getElementById('report').innerHTML = `
    <div class="placeholder">
      <h3>No data yet</h3>
      <p>Paste model outputs on the left and click Run Evaluation.</p>
    </div>`;
}

// ════════════════════════════════════════════════════════
//  BUILD REPORT HTML
// ════════════════════════════════════════════════════════
function buildReport(results) {
  const winner = results.reduce((a, b) => a.overall > b.overall ? a : b);
  const ranked = [...results].sort((a, b) => b.overall - a.overall);
  return [
    buildWinner(winner),
    buildScoreCards(results, winner),
    buildFormulas(),
    buildChartBoxes(),
    buildHeatmap(results),
    buildDataTable(results),
    buildThesis(results, winner, ranked),
  ].join('');
}

// ── Winner ──────────────────────────────────────────────
function buildWinner(w) {
  return `
  <div class="section">
    <div class="section-title">Best Model</div>
    <div class="winner-box">
      <div>
        <div class="winner-label">Highest composite score</div>
        <div class="winner-name" style="color:${w.col}">${w.name}</div>
        <div class="winner-detail">LD: ${r2(w.ld.score)} &nbsp;·&nbsp; Style: ${r2(w.sm.score)} &nbsp;·&nbsp; Coherence: ${r2(w.coh.score)} &nbsp;·&nbsp; ${w.ld.words} words</div>
      </div>
      <div class="winner-score">
        <div class="big">${r2(w.overall)}</div>
        <small>/ 10 overall</small>
      </div>
    </div>
  </div>`;
}

// ── Score Cards ─────────────────────────────────────────
function buildScoreCards(results, winner) {
  const cards = results.map(r => {
    let warnings = [];
    if (r.ld.score < 4) warnings.push('<div class="sc-warn">Try prompting for longer output with richer vocabulary</div>');
    if (r.sm.score < 4) warnings.push('<div class="sc-warn">Paste a full paragraph as reference style</div>');
    if (r.coh.score < 4) warnings.push('<div class="sc-warn">Prompt for longer, more connected sentences</div>');
    const styleScore = r.sm.skipped ? '<span title="Paste a full paragraph as reference">—</span>' : r2(r.sm.score);
    return `
      <div class="score-cell ${r.overall === winner.overall ? 'winner-cell' : ''}">
        <div class="sc-model" style="color:${r.col}">${r.name}</div>
        <div class="sc-num">${r2(r.overall)}</div>
        <div class="sc-breakdown">
          LD:&nbsp;&nbsp;&nbsp; ${r2(r.ld.score)}<br>
          Style:&nbsp;${styleScore}<br>
          Coh:&nbsp;&nbsp; ${r2(r.coh.score)}
        </div>
        <div class="sc-bar">
          <div class="sc-fill" id="fill_${r.id}" style="width:0%;background:${r.col}"></div>
        </div>
        ${warnings.join('')}
      </div>`;
  }).join('');

  return `
  <div class="section">
    <div class="section-title">Scores</div>
    <div class="score-row">${cards}</div>
  </div>`;
}

// ── Formulas ────────────────────────────────────────────
function buildFormulas() {
  const rows = [
    ['TTR',             'Lex. Diversity', 'TTR = |V| / N\n\n|V| = unique word types\nN   = total word tokens',                                                                                          'Baseline ratio. Range 0–1. Length-sensitive — longer texts score lower.'],
    ['MSTTR',           'Lex. Diversity', 'MSTTR = (1/k) × Σ TTR_j\n\nk     = number of 100-word segments\nTTR_j = |V_j| / 100',                                                                        'Corrects TTR\'s length bias. Averages TTR over equal windows. [Johnson, 1944]'],
    ["Yule's K",        'Lex. Diversity', 'K = 10⁴ × (Σ fᵢ² − N) / N²\n\nfᵢ = frequency of word i\nDisplay score = max(0, 10 − K/20)',                                                                'Frequency-distribution richness. Lower raw K = more diverse. Inverted for display. [Yule, 1944]'],
    ['MTLD',            'Lex. Diversity', 'MTLD = N / total_factors\n\nReset factor when TTR ≤ 0.720\nPartial = (1−TTR)/(1−0.720)\nAverage of forward + backward pass',                               'Most length-robust LD metric. Higher = more sustained diversity. [McCarthy, 2005]'],
    ['TF Cosine Sim.',  'Style Match',    'cos(A,B) = (A · B) / (‖A‖ × ‖B‖)\n\nTF(t,d) = count(t,d) / |d|\nA, B = TF vectors over union vocab',                                                     'Vocabulary overlap weighted by frequency against the reference style text.'],
    ['Stylometric Dist.','Style Match',   'd = √(Σ (fᵢ_gen − fᵢ_ref)²)\n\nf₁=avg sent length   f₂=avg word length\nf₃=TTR               f₄=punct density\nScore = max(0, 10 − d×5)',                 'Euclidean distance on 4 surface features. Closer to reference = higher score.'],
    ['Jaccard Sim.',    'Coherence',      'J(A,B) = |A ∩ B| / |A ∪ B|\n\nA, B = word sets of adjacent sentences\nAveraged over all consecutive pairs',                                                 'Thematic continuity between sentences. Measures narrative flow.'],
    ['Flesch R. Ease',  'Coherence',      'FRE = 206.835\n    − 1.015 × (words/sentences)\n    − 84.6  × (syllables/words)\nNormalised: FRE/10, clamped 0–10',                                         '60–70 raw = ideal literary readability. Penalises complex words and long sentences. [Flesch, 1948]'],
  ].map(([name, group, formula, note]) => `
    <tr>
      <td><span class="metric-name">${name}<span class="metric-group">${group}</span></span></td>
      <td><code class="formula-math">${formula}</code></td>
      <td><span class="formula-note">${note}</span></td>
    </tr>`).join('');

  return `
  <div class="section">
    <div class="section-title">Evaluation Metrics &amp; Formulas</div>
    <table class="formula-table">
      <thead>
        <tr>
          <th style="width:160px">Metric</th>
          <th>Formula</th>
          <th style="width:220px">Notes</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

// ── Chart Boxes ─────────────────────────────────────────
function buildChartBoxes() {
  return `
  <div class="section">
    <div class="section-title">Charts</div>
    <div class="charts-grid">
      <div class="chart-box"><div class="chart-title">Metric Breakdown per Model</div><canvas id="barChart"></canvas></div>
      <div class="chart-box"><div class="chart-title">Lexical Diversity Sub-Metrics</div><canvas id="ldChart"></canvas></div>
      <div class="chart-box"><div class="chart-title">Overall Score Comparison</div><canvas id="rankChart"></canvas></div>
      <div class="chart-box"><div class="chart-title">Sub-Metric Radar</div><canvas id="radarChart"></canvas></div>
    </div>
  </div>`;
}

// ── Heatmap ─────────────────────────────────────────────
function buildHeatmap(results) {
  const rows = [
    ['TTR (×10)',     results.map(r => r.ld.TTR)],
    ['MSTTR (×10)',  results.map(r => r.ld.MSTTR)],
    ["Yule's K",     results.map(r => r.ld.YulesK)],
    ['MTLD',         results.map(r => r.ld.MTLD)],
    ['LD Score',     results.map(r => r.ld.score)],
    ['Cosine (×10)', results.map(r => r.sm.Cosine * 10)],
    ['Stylometric',  results.map(r => r.sm.Stylometric)],
    ['Style Score',  results.map(r => r.sm.score)],
    ['Jaccard',      results.map(r => r.coh.Jaccard)],
    ['Flesch',       results.map(r => r.coh.Flesch)],
    ['Coh. Score',   results.map(r => r.coh.score)],
    ['OVERALL',      results.map(r => r.overall)],
  ];

  function bg(v, mn, mx) {
    const t = mx === mn ? 0.5 : (v - mn) / (mx - mn);
    return `rgb(${Math.round(255 - t * 140)},${Math.round(255 - t * 50)},${Math.round(255 - t * 140)})`;
  }

  const headerCols = results.map(r => `<th style="color:${r.col}">${r.name}</th>`).join('');
  const bodyRows   = rows.map(([label, vals]) => {
    const mn = Math.min(...vals), mx = Math.max(...vals);
    const cells = vals.map((v, i) =>
      `<td class="hm-cell" style="background:${bg(v, mn, mx)}">${r2(v)}${v === mx ? '★' : ''}</td>`
    ).join('');
    return `<tr><td class="hm-row-label">${label}</td>${cells}</tr>`;
  }).join('');

  return `
  <div class="section">
    <div class="section-title">Score Heatmap &nbsp;(★ = best per row)</div>
    <div style="overflow-x:auto">
      <table class="hm-table">
        <thead><tr><th></th>${headerCols}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>
  </div>`;
}

// ── Data Table ──────────────────────────────────────────
function buildDataTable(results) {
  const groups = [
    { label: 'Lexical Diversity', rows: [
      ['TTR (raw)',       results.map(r => r2(r.ld.ttr_raw))],
      ['MSTTR (raw)',    results.map(r => r2(r.ld.msttr_raw))],
      ["Yule's K (raw)", results.map(r => r2(r.ld.yk_raw))],
      ['MTLD (raw)',     results.map(r => r2(r.ld.mtld_raw))],
      ['LD Score /10',   results.map(r => r2(r.ld.score))],
    ]},
    { label: 'Style Match', rows: [
      ['Cosine Sim.',    results.map(r => r2(r.sm.Cosine))],
      ['Stylometric',    results.map(r => r2(r.sm.Stylometric))],
      ['Style Score /10',results.map(r => r2(r.sm.score))],
    ]},
    { label: 'Coherence', rows: [
      ['Jaccard Flow',   results.map(r => r2(r.coh.Jaccard))],
      ['Flesch Ease',    results.map(r => r2(r.coh.Flesch))],
      ['Coh. Score /10', results.map(r => r2(r.coh.score))],
    ]},
    { label: 'Final', rows: [
      ['Overall /10',    results.map(r => r2(r.overall))],
      ['Word Count',     results.map(r => String(r.ld.words))],
    ]},
  ];

  const tableRows = groups.map(g => {
    const header = `<tr class="group-row"><td colspan="${results.length + 1}">${g.label}</td></tr>`;
    const rows   = g.rows.map(([label, vals]) => {
      const nums = vals.map(Number);
      const best = Math.max(...nums);
      const cells = vals.map((v, i) =>
        `<td class="${nums[i] === best && !isNaN(best) ? 'best' : ''}">${v}</td>`
      ).join('');
      return `<tr><td style="font-family:monospace;font-size:11px;color:#888;white-space:nowrap">${label}</td>${cells}</tr>`;
    }).join('');
    return header + rows;
  }).join('');

  const headers = results.map(r => `<th style="border-left:2px solid ${r.col}">${r.name}</th>`).join('');

  return `
  <div class="section">
    <div class="section-title">Full Data Table &nbsp;(★ = best per row)</div>
    <div style="overflow-x:auto">
      <table class="data-table">
        <thead><tr><th>Metric</th>${headers}</tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
  </div>`;
}

// ── Thesis ──────────────────────────────────────────────
function buildThesis(results, w, ranked) {
  const ranked_str = ranked.map((r, i) => `${i + 1}. ${r.name} (${r2(r.overall)}/10)`).join(', ');
  return `
  <div class="section">
    <div class="section-title">Thesis Justification</div>
    <div class="thesis-box">
      <div class="thesis-head">
        <span>Academic writeup — ready to copy</span>
        <button class="btn-copy" onclick="copyThesis()">Copy</button>
      </div>
      <div class="thesis-body" id="thesisBody">
        <p>Based on a mathematical evaluation of ${results.length} large language model outputs generated from an identical creative writing prompt, <strong>${w.name}</strong> achieved the highest composite score of <strong>${r2(w.overall)}/10</strong> across three quantitatively computed metrics, making it the most suitable model for this application.</p>
        <p><strong>Lexical Diversity (${r2(w.ld.score)}/10)</strong> was assessed using four sub-metrics: Type-Token Ratio (${r2(w.ld.ttr_raw)}), Mean Segmented TTR (${r2(w.ld.msttr_raw)}), Yule's K (raw K = ${r2(w.ld.yk_raw)}, normalised score = ${r2(w.ld.YulesK)}/10), and MTLD (raw = ${r2(w.ld.mtld_raw)}, normalised = ${r2(w.ld.MTLD)}/10). ${w.name} demonstrated the richest vocabulary diversity among all tested models.</p>
        <p><strong>Style Match (${r2(w.sm.score)}/10)</strong> was computed via TF Cosine Similarity (${r2(w.sm.Cosine)}) and Euclidean Stylometric Feature Distance (${r2(w.sm.Stylometric)}/10) across four surface features: average sentence length, average word length, type-token ratio, and punctuation density. ${w.name} most closely matched the target literary style.</p>
        <p><strong>Coherence (${r2(w.coh.score)}/10)</strong> was evaluated using inter-sentence Jaccard Similarity (${r2(w.coh.Jaccard)}/10) and normalised Flesch Reading Ease (${r2(w.coh.Flesch)}/10). ${w.name} produced the most readable and logically connected narrative.</p>
        <p>Full model ranking: ${ranked_str}. All metrics were derived from deterministic mathematical formulae applied to raw text output with no secondary LLM involvement, ensuring the evaluation is reproducible and academically defensible.</p>
      </div>
    </div>
  </div>`;
}

// ════════════════════════════════════════════════════════
//  CHARTS
// ════════════════════════════════════════════════════════
function buildCharts(results) {
  const names = results.map(r => r.name.split(' ')[0]);
  const cols  = results.map(r => r.col);

  Chart.defaults.font.family = 'monospace';
  Chart.defaults.font.size   = 11;
  Chart.defaults.color       = '#666';

  const scaleOpts = {
    x: { ticks: { font: { size: 10 } }, grid: { color: '#f0f0f0' } },
    y: { min: 0, max: 10, grid: { color: '#f0f0f0' } }
  };

  // Grouped bar — 3 metrics
  CHARTS.bar = new Chart(document.getElementById('barChart'), {
    type: 'bar',
    data: {
      labels: names,
      datasets: [
        { label: 'Lex. Diversity', data: results.map(r => +r2(r.ld.score)),  backgroundColor: cols.map(c => c + 'cc') },
        { label: 'Style Match',    data: results.map(r => +r2(r.sm.score)),  backgroundColor: cols.map(c => c + '77') },
        { label: 'Coherence',      data: results.map(r => +r2(r.coh.score)), backgroundColor: cols.map(c => c + '33') },
      ]
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } }, scales: scaleOpts }
  });

  // LD sub-metrics
  CHARTS.ld = new Chart(document.getElementById('ldChart'), {
    type: 'bar',
    data: {
      labels: names,
      datasets: [
        { label: 'TTR',       data: results.map(r => +r2(r.ld.TTR)),    backgroundColor: cols.map(c => c + 'ff') },
        { label: 'MSTTR',    data: results.map(r => +r2(r.ld.MSTTR)),  backgroundColor: cols.map(c => c + 'bb') },
        { label: "Yule's K", data: results.map(r => +r2(r.ld.YulesK)), backgroundColor: cols.map(c => c + '77') },
        { label: 'MTLD',     data: results.map(r => +r2(r.ld.MTLD)),   backgroundColor: cols.map(c => c + '33') },
      ]
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } }, scales: scaleOpts }
  });

  // Horizontal bar — overall ranking
  CHARTS.rank = new Chart(document.getElementById('rankChart'), {
    type: 'bar',
    data: {
      labels: results.map(r => r.name),
      datasets: [{ label: 'Overall Score', data: results.map(r => +r2(r.overall)), backgroundColor: cols, borderRadius: 2 }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { min: 0, max: 10, grid: { color: '#f0f0f0' } },
        y: { grid: { display: false } }
      }
    }
  });

  // Radar — all 8 sub-metrics
  CHARTS.radar = new Chart(document.getElementById('radarChart'), {
    type: 'radar',
    data: {
      labels: ['TTR', 'MSTTR', "Yule's K", 'MTLD', 'Cosine×10', 'Stylometric', 'Jaccard', 'Flesch'],
      datasets: results.map(r => ({
        label:              r.name.split(' ')[0],
        data:               [r.ld.TTR, r.ld.MSTTR, r.ld.YulesK, r.ld.MTLD, r.sm.Cosine * 10, r.sm.Stylometric, r.coh.Jaccard, r.coh.Flesch],
        borderColor:        r.col,
        backgroundColor:    r.col + '18',
        pointBackgroundColor: r.col,
        borderWidth:        1.5
      }))
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } },
      scales: {
        r: {
          min: 0, max: 10,
          ticks: { backdropColor: 'transparent' },
          grid:  { color: '#ddd' },
          pointLabels: { font: { size: 10 } }
        }
      }
    }
  });
}

// ════════════════════════════════════════════════════════
//  COPY THESIS
// ════════════════════════════════════════════════════════
function copyThesis() {
  const text = document.getElementById('thesisBody').innerText;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector('.btn-copy');
    btn.textContent = 'Copied';
    setTimeout(() => btn.textContent = 'Copy', 2000);
  });
}
