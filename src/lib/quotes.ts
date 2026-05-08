export const QUOTES: { text: string; author: string }[] = [
  { text: "The more that you read, the more things you will know.", author: "Dr. Seuss" },
  { text: "A reader lives a thousand lives before he dies.", author: "George R.R. Martin" },
  { text: "Once you learn to read, you will be forever free.", author: "Frederick Douglass" },
  { text: "I have always imagined that paradise will be a kind of library.", author: "Jorge Luis Borges" },
  { text: "There is no friend as loyal as a book.", author: "Ernest Hemingway" },
  { text: "Books are a uniquely portable magic.", author: "Stephen King" },
  { text: "Curiosity is the wick in the candle of learning.", author: "William Arthur Ward" },
  { text: "The cure for boredom is curiosity. There is no cure for curiosity.", author: "Dorothy Parker" },
  { text: "I am not a teacher, but an awakener.", author: "Robert Frost" },
  { text: "Wonder is the beginning of wisdom.", author: "Socrates" },
  { text: "We are all apprentices in a craft where no one ever becomes a master.", author: "Ernest Hemingway" },
  { text: "The world is a book, and those who do not travel read only one page.", author: "Saint Augustine" },
  { text: "Knowing yourself is the beginning of all wisdom.", author: "Aristotle" },
  { text: "I have no special talent. I am only passionately curious.", author: "Albert Einstein" },
  { text: "A house without books is like a room without windows.", author: "Heinrich Mann" },
];

export function quoteOfTheMoment(): { text: string; author: string } {
  // changes every ~30 minutes
  const bucket = Math.floor(Date.now() / (1000 * 60 * 30));
  return QUOTES[bucket % QUOTES.length];
}
