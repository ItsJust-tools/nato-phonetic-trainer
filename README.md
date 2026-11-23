# NATO Phonetic Alphabet Codeword Trainer

Learn and drill the NATO phonetic alphabet with quizzes and a converter for any text.

**Live:** [nato-phonetic-trainer.itsjust.tools](https://nato-phonetic-trainer.itsjust.tools)

## Features

- Convert any text to NATO phonetic codewords (Alfa, Bravo, …) with per-character chips
- Numbers and common punctuation mapped to NATO pronunciations (9 is "Niner", period is "Stop")
- Flashcard quiz mode: show a letter/code, type or pick the correct codeword
- Score tracking with streak and accuracy stats, plus best-streak tracking
- Copy converted output as plain text or one-per-line format
- Spelled-out word helper: type a word and see it spoken in NATO terms
- Reference table of all 26 codewords plus digits with pronunciation notes
- Shareable state via URL (sample text and quiz progress), `.itsjust.json` import/export and image/PDF export
- 100% client-side — no data ever leaves your browser

## Quiz scoring

Every answered question updates `answered`, `correct`, the current streak and the best streak.
Accuracy is the rounded percentage of correct answers; a wrong answer resets the streak but keeps totals.

## Development

```bash
npm install
npm run build -w @itsjust/core   # build shared core first
npm run dev
npm test
```

## Deployment

```bash
docker build -t nato-phonetic-trainer .
docker run -p 3000:3000 nato-phonetic-trainer
```

## License

MIT
