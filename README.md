# Chat Application

A ChatGPT-like chat application built with Next.js, Tailwind CSS, and shadcn/ui components.

## Features

- 💬 Real-time chat interface
- 📱 Responsive design
- 🗂️ Conversation management
- 🗑️ Delete conversations
- 💾 Persistent chat history
- 🎨 ChatGPT-inspired UI

## Getting Started

1. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

2. **Start the development server:**
   \`\`\`bash
   npm run dev
   \`\`\`

3. **Make sure your FastAPI backend is running on `http://localhost:8000`**

## Backend Integration

This frontend integrates with your FastAPI backend using the following endpoints:

- `POST /chat` - Send messages
- `GET /conversations` - List all conversations
- `GET /conversations/{id}` - Get specific conversation
- `DELETE /conversations/{id}` - Delete conversation

## Configuration

Update the `API_BASE_URL` in `app/page.tsx` if your backend runs on a different port or host:

\`\`\`typescript
const API_BASE_URL = 'http://localhost:8000'
\`\`\`

## Tech Stack

- **Next.js 14** - React framework
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Lucide React** - Icons
- **TypeScript** - Type safety
