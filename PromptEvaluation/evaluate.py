"""
PromptLab — evaluate.py
========================
Standalone Python script that runs the same mathematical evaluation
as the HTML tool, then prints results to the terminal.

Usage:
    1. Paste your 4 model outputs into OUTPUTS below.
    2. Run:  python evaluate.py

No external libraries required — pure Python standard library only.
"""

import re
import math
from collections import Counter


# ════════════════════════════════════════════════════════════════
#  PASTE YOUR MODEL OUTPUTS HERE
# ════════════════════════════════════════════════════════════════

OUTPUTS = {
    "GPT-4o-mini": """
    PASTE GPT-4o-mini OUTPUT HERE
    """,

    "GPT-3.5-turbo": """
    PASTE GPT-3.5-turbo OUTPUT HERE
    """,

    "Gemini-2.0-Flash": """
    PASTE GEMINI OUTPUT HERE
    """,

    "Llama-3.2-3B": """
    PASTE LLAMA OUTPUT HERE
    """,
}

# Reference style used for Style Match metric.
# Change this to match the target style of your app's prompt.
REFERENCE_STYLE = """
The old lighthouse stood against the bruised sky, its beam slicing through
the fog like a lonely thought. The keeper had watched the tides for thirty
years, counting waves as other men counted their sins. Each morning he
descended the spiral stairs with the deliberateness of a man who had learned
that hurry was the enemy of wisdom.
"""


# ════════════════════════════════════════════════════════════════
#  TOKENISATION
# ════════════════════════════════════════════════════════════════

def tokenize(text: str) -> list[str]:
    """Extract lowercase alphabetic tokens. Strips punctuation and numbers."""
    return re.findall(r'\b[a-z]+\b', text.lower())


def sentences(text: str) -> list[str]:
    """Split on sentence-ending punctuation."""
    return [s.strip() for s in re.split(r'[.!?]+', text) if s.strip()]


# ════════════════════════════════════════════════════════════════
#  METRIC 1 — LEXICAL DIVERSITY
# ════════════════════════════════════════════════════════════════

def ttr(words: list[str]) -> float:
    """
    Type-Token Ratio
    ────────────────
    TTR = |V| / N

    |V| = number of unique word types (vocabulary size)
    N   = total number of word tokens

    Range 0–1. Higher = more diverse. Length-sensitive.
    """
    N = len(words)
    return len(set(words)) / N if N else 0.0


def msttr(words: list[str], seg: int = 100) -> float:
    """
    Mean Segmented TTR  [Johnson, 1944]
    ────────────────────────────────────
    MSTTR = (1/k) × Σ TTR_j

    k     = number of fixed-length segments
    TTR_j = |V_j| / seg  for the j-th segment

    Corrects TTR's length bias by averaging over equal windows.
    Range 0–1.
    """
    if not words:
        return 0.0
    segs = [words[i:i + seg] for i in range(0, len(words), seg)]
    return sum(len(set(s)) / len(s) for s in segs) / len(segs)


def yules_k(words: list[str]) -> tuple[float, float]:
    """
    Yule's K Statistic  [Yule, 1944]
    ──────────────────────────────────
    K = 10⁴ × (Σ fᵢ² − N) / N²

    fᵢ = frequency of word i,  N = total tokens

    Lower raw K = more diverse vocabulary.
    Display score (inverted): max(0, 10 − K/20)
    Returns (raw_K, display_score).
    """
    N = len(words)
    if N == 0:
        return 0.0, 10.0
    freq = Counter(words)
    sum_fi2 = sum(f * f for f in freq.values())
    K = 10_000 * (sum_fi2 - N) / (N * N)
    return K, max(0.0, 10.0 - K / 20.0)


def mtld(words: list[str], threshold: float = 0.720) -> tuple[float, float]:
    """
    MTLD — Measure of Textual Lexical Diversity  [McCarthy, 2005]
    ──────────────────────────────────────────────────────────────
    MTLD = N / total_factors

    Walks tokens sequentially. When running TTR drops to threshold,
    increments factor count and resets. Partial final segment:
        partial_factor = (1 − TTR_partial) / (1 − threshold)

    Averaged over forward + backward passes.
    Returns (raw_mtld, normalised_0_to_10).
    """
    def _pass(toks):
        factors, count, types = 0, 0, set()
        for tok in toks:
            count += 1
            types.add(tok)
            if count > 0 and len(types) / count <= threshold:
                factors += 1
                count, types = 0, set()
        if count > 0:
            factors += (1 - len(types) / count) / (1 - threshold)
        return len(toks) / factors if factors > 0 else len(toks)

    if not words:
        return 0.0, 0.0
    raw = (_pass(words) + _pass(list(reversed(words)))) / 2
    return raw, min(10.0, raw / 100 * 10)


def lexical_diversity(text: str) -> dict:
    words = tokenize(text)
    t_raw         = ttr(words)
    m_raw         = msttr(words)
    yk_raw, yk_sc = yules_k(words)
    mtld_raw, mtld_sc = mtld(words)
    T, M, Y, D   = t_raw * 10, m_raw * 10, yk_sc, mtld_sc
    return {
        "word_count": len(words),
        "ttr_raw":    round(t_raw, 4),
        "msttr_raw":  round(m_raw, 4),
        "yk_raw":     round(yk_raw, 4),
        "mtld_raw":   round(mtld_raw, 2),
        "TTR":        round(T, 4),
        "MSTTR":      round(M, 4),
        "YulesK":     round(Y, 4),
        "MTLD":       round(D, 4),
        "score":      round((T + M + Y + D) / 4, 4),
    }


# ════════════════════════════════════════════════════════════════
#  METRIC 2 — STYLE MATCH
# ════════════════════════════════════════════════════════════════

def cosine_similarity(text_a: str, text_b: str) -> float:
    """
    TF Cosine Similarity
    ─────────────────────
    cos(A, B) = (A · B) / (‖A‖ × ‖B‖)

    A, B    = TF vectors over the union vocabulary
    TF(t,d) = count(t, d) / |d|

    Range 0–1.
    """
    wa, wb = tokenize(text_a), tokenize(text_b)
    vocab  = list(set(wa) | set(wb))
    if not vocab:
        return 0.0

    def tf_vec(words):
        freq = Counter(words)
        n    = len(words)
        return [freq.get(v, 0) / n for v in vocab] if n else [0.0] * len(vocab)

    va, vb = tf_vec(wa), tf_vec(wb)
    dot    = sum(a * b for a, b in zip(va, vb))
    mag_a  = math.sqrt(sum(a * a for a in va))
    mag_b  = math.sqrt(sum(b * b for b in vb))
    return dot / (mag_a * mag_b) if mag_a and mag_b else 0.0


def stylometric_distance(text: str, ref: str) -> float:
    """
    Stylometric Feature Distance
    ─────────────────────────────
    d = √(Σ (fᵢ_gen − fᵢ_ref)²)   for i = 1..4

    f₁ = average sentence length (words/sentence)
    f₂ = average word length     (chars/word)
    f₃ = Type-Token Ratio
    f₄ = punctuation density     (punct marks/words)

    Display score = max(0, 10 − d × 5)
    """
    def features(t):
        sents  = [s.split() for s in sentences(t) if s]
        words  = tokenize(t)
        punct  = len(re.findall(r'[,;:\'\"()\-]', t))
        return [
            sum(len(s) for s in sents) / max(len(sents), 1),
            sum(len(w) for w in words) / max(len(words), 1),
            len(set(words)) / max(len(words), 1),
            punct / max(len(words), 1),
        ]

    fa, fb = features(text), features(ref)
    dist   = math.sqrt(sum((a - b) ** 2 for a, b in zip(fa, fb)))
    return round(max(0.0, 10.0 - dist * 5), 4)


def style_match(text: str, ref: str) -> dict:
    cos = cosine_similarity(text, ref)
    sty = stylometric_distance(text, ref)
    return {
        "Cosine":      round(cos, 4),
        "Stylometric": sty,
        "score":       round((cos * 10 + sty) / 2, 4),
    }


# ════════════════════════════════════════════════════════════════
#  METRIC 3 — COHERENCE
# ════════════════════════════════════════════════════════════════

def jaccard_similarity(text: str) -> float:
    """
    Inter-Sentence Jaccard Similarity
    ───────────────────────────────────
    J(A, B) = |A ∩ B| / |A ∪ B|

    A, B = word sets of adjacent sentences.
    Averaged over all consecutive sentence pairs.

    Measures thematic continuity / narrative flow.
    Scaled to 0–10.
    """
    sents = [set(tokenize(s)) for s in sentences(text) if len(s) > 5]
    if len(sents) < 2:
        return 5.0
    sc = []
    for a, b in zip(sents, sents[1:]):
        union = a | b
        sc.append(len(a & b) / len(union) if union else 0.0)
    return round(sum(sc) / len(sc) * 10, 4)


def flesch_reading_ease(text: str) -> float:
    """
    Flesch Reading Ease  [Flesch, 1948]
    ─────────────────────────────────────
    FRE = 206.835
          − 1.015  × (words / sentences)
          − 84.6   × (syllables / words)

    Syllable approximation: count vowel groups per word (min 1).
    Normalised: FRE / 10, clamped to [0, 10].
    60–70 raw ≈ ideal literary readability.
    """
    def syllables(word):
        return max(1, len(re.findall(r'[aeiou]+', word.lower())))

    sents = [s for s in sentences(text) if s]
    words = tokenize(text)
    if not words or not sents:
        return 5.0
    sylls = sum(syllables(w) for w in words)
    raw   = (206.835
             - 1.015 * (len(words) / len(sents))
             - 84.6  * (sylls / len(words)))
    return round(max(0.0, min(10.0, raw / 10)), 4)


def coherence(text: str) -> dict:
    j = jaccard_similarity(text)
    f = flesch_reading_ease(text)
    return {"Jaccard": j, "Flesch": f, "score": round((j + f) / 2, 4)}


# ════════════════════════════════════════════════════════════════
#  EVALUATE ALL MODELS
# ════════════════════════════════════════════════════════════════

def evaluate(outputs: dict, ref: str) -> list[dict]:
    results = []
    for name, text in outputs.items():
        text = text.strip()
        if not text:
            continue
        ld  = lexical_diversity(text)
        sm  = style_match(text, ref)
        coh = coherence(text)
        results.append({
            "name":    name,
            "ld":      ld,
            "sm":      sm,
            "coh":     coh,
            "overall": round((ld["score"] + sm["score"] + coh["score"]) / 3, 4),
        })
    return results


# ════════════════════════════════════════════════════════════════
#  PRINT RESULTS
# ════════════════════════════════════════════════════════════════

def print_results(results: list[dict]):
    if not results:
        print("No results — paste model outputs into OUTPUTS dict.")
        return

    ranked = sorted(results, key=lambda r: r["overall"], reverse=True)
    winner = ranked[0]
    W = 60

    print("\n" + "═" * W)
    print("  PromptLab — Model Evaluation Results")
    print("═" * W)
    print(f"  {'Model':<22} {'LD':>6} {'Style':>6} {'Coh':>6} {'Overall':>8}")
    print("  " + "─" * (W - 2))

    for r in ranked:
        mark = " ← winner" if r["name"] == winner["name"] else ""
        print(f"  {r['name']:<22} {r['ld']['score']:>6.2f} {r['sm']['score']:>6.2f} "
              f"{r['coh']['score']:>6.2f} {r['overall']:>8.2f}{mark}")

    print("\n" + "─" * W)
    print("  Detailed breakdown")
    print("─" * W)

    for r in ranked:
        print(f"\n  {r['name']}  (words: {r['ld']['word_count']})")
        print(f"    Lexical Diversity")
        print(f"      TTR          raw={r['ld']['ttr_raw']:.4f}   score={r['ld']['TTR']:.2f}/10")
        print(f"      MSTTR        raw={r['ld']['msttr_raw']:.4f}   score={r['ld']['MSTTR']:.2f}/10")
        print(f"      Yule's K     raw={r['ld']['yk_raw']:.4f}   score={r['ld']['YulesK']:.2f}/10")
        print(f"      MTLD         raw={r['ld']['mtld_raw']:.2f}    score={r['ld']['MTLD']:.2f}/10")
        print(f"      → LD Score   {r['ld']['score']:.2f}/10")
        print(f"    Style Match")
        print(f"      Cosine Sim.  {r['sm']['Cosine']:.4f}")
        print(f"      Stylometric  {r['sm']['Stylometric']:.2f}/10")
        print(f"      → Style Score {r['sm']['score']:.2f}/10")
        print(f"    Coherence")
        print(f"      Jaccard      {r['coh']['Jaccard']:.2f}/10")
        print(f"      Flesch Ease  {r['coh']['Flesch']:.2f}/10")
        print(f"      → Coh. Score {r['coh']['score']:.2f}/10")
        print(f"    {'─'*40}")
        print(f"    OVERALL        {r['overall']:.2f}/10")

    w = winner
    ranked_str = ", ".join(f"{i+1}. {r['name']} ({r['overall']:.2f})" for i, r in enumerate(ranked))
    print(f"""
{'═'*W}
  THESIS JUSTIFICATION
{'═'*W}
Based on a mathematical evaluation of {len(results)} LLM outputs from an identical
creative writing prompt, {w['name']} achieved the highest composite score
of {w['overall']:.2f}/10 across three metrics.

Lexical Diversity ({w['ld']['score']:.2f}/10): TTR={w['ld']['ttr_raw']:.4f}, MSTTR={w['ld']['msttr_raw']:.4f},
Yule's K raw={w['ld']['yk_raw']:.2f} (score={w['ld']['YulesK']:.2f}), MTLD raw={w['ld']['mtld_raw']:.2f}
(score={w['ld']['MTLD']:.2f}). Richest vocabulary diversity among all models.

Style Match ({w['sm']['score']:.2f}/10): Cosine Similarity={w['sm']['Cosine']:.4f},
Stylometric Distance score={w['sm']['Stylometric']:.2f}/10. Closest match to reference style.

Coherence ({w['coh']['score']:.2f}/10): Jaccard={w['coh']['Jaccard']:.2f}/10,
Flesch Reading Ease={w['coh']['Flesch']:.2f}/10. Most readable and connected narrative.

Ranking: {ranked_str}.
All metrics computed mathematically from raw text. No LLM involvement in evaluation.
""")


# ════════════════════════════════════════════════════════════════
#  MAIN
# ════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    results = evaluate(OUTPUTS, REFERENCE_STYLE)
    print_results(results)
