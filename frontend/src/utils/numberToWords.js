/**
 * Convert a number to Indian currency words in UPPERCASE
 * e.g. 2600 -> "TWO THOUSAND SIX HUNDRED"
 * e.g. 668 -> "SIX HUNDRED SIXTY EIGHT"
 */
export function convertNumberToIndianWords(num) {
  if (!num || isNaN(num) || Number(num) === 0) return 'ZERO';
  const n = Math.round(Number(num));
  const ones = [
    '', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE',
    'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN',
    'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'
  ];
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

  const convertLessThanOneThousand = (val) => {
    let current = '';
    if (val >= 100) {
      current += ones[Math.floor(val / 100)] + ' HUNDRED ';
      val %= 100;
    }
    if (val >= 20) {
      current += tens[Math.floor(val / 10)] + (val % 10 !== 0 ? ' ' + ones[val % 10] : '');
    } else if (val > 0) {
      current += ones[val];
    }
    return current.trim();
  };

  let word = '';
  const crore = Math.floor(n / 10000000);
  let rem = n % 10000000;
  const lakh = Math.floor(rem / 100000);
  rem = rem % 100000;
  const thousand = Math.floor(rem / 1000);
  rem = rem % 1000;

  if (crore > 0) word += convertLessThanOneThousand(crore) + ' CRORE ';
  if (lakh > 0) word += convertLessThanOneThousand(lakh) + ' LAKH ';
  if (thousand > 0) word += convertLessThanOneThousand(thousand) + ' THOUSAND ';
  if (rem > 0) word += convertLessThanOneThousand(rem);

  return word.trim();
}
