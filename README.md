# Perplexity Fast Chat 🚀

A modern web interface to interact with Perplexity AI and OpenAI models, featuring a unique deep research mode.

## Features ✨

- 🤖 Support for multiple Perplexity AI models:
  - Sonar Reasoning Pro
  - Sonar Reasoning
  - Sonar Pro
  - Sonar
  - R1-1776
- 🔍 Exclusive Deep Research mode
  - Automatic breakdown of complex questions
  - Multi-step in-depth research
  - Final synthesis of results
- 💬 Modern chat interface
  - Conversation history
  - Markdown support
  - Citations and references
  - "Thinking" mode with animations
- 🎨 Sleek design
  - Responsive interface
  - Dark mode
  - Smooth animations
  - Support for links and references

## Installation 🛠️

1. Clone the repository:
```bash
git clone https://github.com/your-username/perplexity-fast-chat.git
cd perplexity-fast-chat
```

2. Install dependencies:
```bash
pnpm install
```

3. Create a `.env` file at the project root:
```env
PERPLEXITY_API_KEY=your_perplexity_api_key
OPENAI_API_KEY=your_openai_api_key
```

4. Start the development server:
```bash
pnpm dev
```

## Technologies Used 🧰

- [SvelteKit](https://kit.svelte.dev/) - Web framework
- [TailwindCSS](https://tailwindcss.com/) - CSS framework
- [Perplexity AI API](https://docs.perplexity.ai/) - Chat API
- [OpenAI API](https://platform.openai.com/) - API for Deep Research mode
- [Marked](https://marked.js.org/) - Markdown parsing
- [Lucide Icons](https://lucide.dev/) - Icon set

## Project Structure 📁

- `/src/routes` - Application routes
  - `+page.svelte` - Main page
  - `/api` - API endpoints
    - `/chat` - Standard chat endpoint
    - `/deep-research` - Deep Research endpoint
    - `/name` - Name generation endpoint
- `/src/lib` - Components and utilities
  - `/components` - Svelte components
  - `/stores` - Svelte stores
  - `/types` - TypeScript types

## Deep Research Mode 🔬

The Deep Research mode is a unique feature that:
1. Analyzes your question using GPT-4
2. Breaks it down into 4-10 relevant sub-questions
3. Researches each aspect using Perplexity AI
4. Synthesizes the results into a comprehensive answer

## Contribution 🤝

Contributions are welcome! Feel free to:
1. Fork the project
2. Create a branch (`git checkout -b feature/improvement`)
3. Commit your changes (`git commit -m 'Added feature'`)
4. Push to the branch (`git push origin feature/improvement`)
5. Open a Pull Request

## License 📄

MIT - See the [LICENSE](LICENSE) file for details.