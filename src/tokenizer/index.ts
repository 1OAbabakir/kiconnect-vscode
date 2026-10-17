import vocabulary from './o200k.json';

// o200k_base: gleiche Textsegmentierung und BPE-Ränge wie o200k_harmony (GPT-OSS).
// Quelle und MIT-Lizenz: third_party/TIKTOKEN.md. Sondertoken im Nutzertext bleiben Text.
const contraction = "(?:'[sStTmMdD]|'[rR][eE]|'[vV][eE]|'[lL][lL])?";
const pattern = new RegExp([
  String.raw`[^\r\n\p{L}\p{N}]?[\p{Lu}\p{Lt}\p{Lm}\p{Lo}\p{M}]*[\p{Ll}\p{Lm}\p{Lo}\p{M}]+` + contraction,
  String.raw`[^\r\n\p{L}\p{N}]?[\p{Lu}\p{Lt}\p{Lm}\p{Lo}\p{M}]+[\p{Ll}\p{Lm}\p{Lo}\p{M}]*` + contraction,
  String.raw`\p{N}{1,3}`, String.raw` ?[^\s\p{L}\p{N}]+[\r\n/]*`,
  String.raw`\s*[\r\n]+`, String.raw`\s+(?!\S)`, String.raw`\s+`,
].join('|'), 'gu');
let ranks: Map<string, number> | undefined;

interface Segment { start: number; end: number; previous: number; next: number; active: boolean }
interface Pair { left: number; right: number; leftEnd: number; rightEnd: number; rank: number }

/** Prioritätswarteschlange verhindert quadratische Suche bei langen Codebezeichnern. */
function before(a: Pair, b: Pair): boolean {
  return a.rank < b.rank || (a.rank === b.rank && a.left <= b.left);
}

class Pairs {
  private items: Pair[] = [];
  push(pair: Pair): void {
    let i = this.items.length;
    this.items.push(pair);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (before(this.items[parent], pair)) break;
      this.items[i] = this.items[parent]; i = parent;
    }
    this.items[i] = pair;
  }
  pop(): Pair | undefined {
    const top = this.items[0];
    const last = this.items.pop();
    if (last && this.items.length) {
      let i = 0;
      while (i * 2 + 1 < this.items.length) {
        let child = i * 2 + 1;
        if (child + 1 < this.items.length && before(this.items[child + 1], this.items[child])) child++;
        if (before(last, this.items[child])) break;
        this.items[i] = this.items[child]; i = child;
      }
      this.items[i] = last;
    }
    return top;
  }
}

function countPiece(bytes: string, table: Map<string, number>): number {
  if (table.has(bytes)) return 1;
  const nodes: Segment[] = Array.from(bytes, (_byte, i) => ({ start: i, end: i + 1, previous: i - 1, next: i + 1 < bytes.length ? i + 1 : -1, active: true }));
  const pairs = new Pairs();
  const add = (left: number, right: number) => {
    if (left < 0 || right < 0) return;
    const rank = table.get(bytes.slice(nodes[left].start, nodes[right].end));
    if (rank !== undefined) pairs.push({ left, right, rank, leftEnd: nodes[left].end, rightEnd: nodes[right].end });
  };
  for (let i = 0; i + 1 < nodes.length; i++) add(i, i + 1);
  let count = nodes.length;
  for (let pair = pairs.pop(); pair; pair = pairs.pop()) {
    const left = nodes[pair.left]; const right = nodes[pair.right];
    if (!left.active || !right.active || left.next !== pair.right || left.end !== pair.leftEnd || right.end !== pair.rightEnd) continue;
    left.end = right.end; left.next = right.next; right.active = false; count--;
    if (right.next >= 0) nodes[right.next].previous = pair.left;
    add(left.previous, pair.left); add(pair.left, left.next);
  }
  return count;
}

/** Lokale BPE-Tokenzählung ohne Netzwerk oder Drittanbieteraufrufe. */
export function countTokens(text: string): number {
  if (!text) return 0;
  ranks ??= new Map(vocabulary.map((encoded, rank) => [atob(encoded), rank]));
  let total = 0;
  const encoder = new TextEncoder();
  for (const match of text.matchAll(pattern)) {
    const bytes = Array.from(encoder.encode(match[0]), value => String.fromCharCode(value)).join('');
    total += countPiece(bytes, ranks);
  }
  return total;
}
