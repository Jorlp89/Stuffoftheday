import { facts, kanji, words } from "./content.js";

export function tokyoDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = type => parts.find(p => p.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function hash(value) {
  let h = 2166136261;
  for (const char of value) { h ^= char.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function pick(items, date, salt) {
  return items[hash(`${date}:${salt}`) % items.length];
}

export function maths(date) {
  const seed = hash(`${date}:maths`);
  const kind = seed % 4;
  if (kind === 0) {
    const a = 12 + (seed % 29), b = 3 + ((seed >>> 5) % 12);
    return { question: `A rectangle has area ${a * b} cm² and width ${b} cm. What is its perimeter?`, answer: `${2 * (a + b)} cm`, explanation: `Length = ${a * b} ÷ ${b} = ${a} cm, so perimeter = 2 × (${a} + ${b}).` };
  }
  if (kind === 1) {
    const start = 4 + (seed % 8), step = 3 + ((seed >>> 4) % 7);
    return { question: `The sequence is ${start}, ${start + step}, ${start + 2 * step}, … What is its 15th term?`, answer: `${start + 14 * step}`, explanation: `Add ${step} fourteen times: ${start} + 14 × ${step}.` };
  }
  if (kind === 2) {
    const red = 2 + (seed % 5), blue = 3 + ((seed >>> 4) % 6), total = red + blue;
    const numerator = red * blue, denominator = total * (total - 1);
    const gcd = (a, b) => b ? gcd(b, a % b) : a;
    const divisor = gcd(numerator, denominator);
    return { question: `A bag holds ${red} red and ${blue} blue counters. What is the probability of drawing red, then blue, without replacement?`, answer: `${numerator / divisor}/${denominator / divisor}`, explanation: `${red}/${total} × ${blue}/${total - 1} = ${numerator}/${denominator}, which simplifies to ${numerator / divisor}/${denominator / divisor}.` };
  }
  const n = 20 + (seed % 31), pct = [15, 20, 25, 30][(seed >>> 6) % 4];
  return { question: `After a ${pct}% increase, a quantity is ${n * (100 + pct) / 100}. What was the original quantity?`, answer: `${n}`, explanation: `Divide by ${1 + pct / 100}: ${n * (100 + pct) / 100} ÷ ${1 + pct / 100} = ${n}.` };
}

export function localDaily(date) {
  return { date, word: pick(words, date, "word"), kanji: pick(kanji, date, "kanji"), fact: pick(facts, date, "fact"), maths: maths(date) };
}
