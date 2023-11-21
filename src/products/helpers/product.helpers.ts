import { customAlphabet } from 'nanoid';

export {
  removeNonAlphanumeric,
  getRandomString,
  calculateMarkup,
  isValidNumber,
};

function removeNonAlphanumeric(str: string) {
  return str.replace(/[^a-zA-Z0-9 ]/g, '');
}

function getRandomString({ length }: { length: number }) {
  const alphabet: string = 'abcdefghijklmnopqrstuvwxyz';
  const nanoid = customAlphabet(alphabet, length);
  return nanoid();
}

function calculateMarkup({ cost, markup }: { cost: number; markup: number }) {
  return cost * (1 + markup / 100);
}

function isValidNumber(str: string | undefined) {
  if (!str) return true;
  const num = parseFloat(str);
  return !isNaN(num) && isFinite(num) && num >= 0;
}
