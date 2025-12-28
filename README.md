# One Word

A precision instrument for exploring AI latent space via single-word completions.

## What is this?

One Word lets you probe how different AI models complete a prompt with a single word. By sampling hundreds or thousands of completions across different models, temperatures, and top-k values, you can visualize the probability distributions that shape AI language.

**BYOK (Bring Your Own Keys)** — Your API keys are stored locally in your browser. They never touch our servers.

## Features

- **Multi-provider support** — Anthropic (Claude), OpenAI (GPT-4o, o1, o3-mini), Kimi (Moonshot)
- **Parameter sweeps** — Test single values or ranges of temperature (0-2) and top-k (1-100)
- **Real-time visualization** — Watch words emerge as the experiment runs
- **Statistical analysis** — Entropy, word frequency distributions, per-model breakdowns
- **Local-first** — All experiment data stored in IndexedDB, exportable as JSON
- **Community insights** — Anonymous aggregate data shared to discover patterns

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Running the API Server

The community data collection API runs on Bun:

```bash
cd api
bun run server.ts
```

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Storage**: IndexedDB (local), SQLite (community API)
- **Providers**: Anthropic, OpenAI, Moonshot APIs

## How It Works

1. **Enter a stimulus** — Any text prompt that you want models to complete
2. **Configure parameters** — Choose models, temperature range, top-k range, samples per config
3. **Run the experiment** — Watch as hundreds of single-word completions stream in
4. **Analyze results** — See word frequencies, entropy, and per-model/temperature breakdowns

## Privacy

- API keys stored in browser localStorage only
- No PII collected
- Community data is anonymous (stimulus text + aggregate word counts)

## License

MIT
