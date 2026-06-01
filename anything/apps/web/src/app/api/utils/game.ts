export const CATEGORIES = [
  'Nombre',
  'Apellido',
  'País',
  'Ciudad',
  'Animal',
  'Color',
  'Comida',
  'Marca',
  'Profesión',
  'Película',
  'Serie',
  'Canción',
  'Famoso',
  'Deporte',
  'Objeto/Cosa',
  'Fruta',
  'Verdura',
] as const;

export const LETTERS = 'ABCDEFGHIJLMNOPRSTUV'.split('');

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function generatePlayerId(): string {
  return 'p_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function pickRandomLetter(exclude: string[] = []): string {
  const available = LETTERS.filter((l) => !exclude.includes(l));
  const pool = available.length > 0 ? available : LETTERS;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function normalizeWord(word: string | null | undefined): string {
  if (!word) return '';
  return word
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function startsWithLetter(word: string, letter: string): boolean {
  const n = normalizeWord(word);
  if (!n) return false;
  const l = normalizeWord(letter);
  return n.charAt(0) === l;
}
