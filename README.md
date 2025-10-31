
# 🎬 MovieFrd: A Social Movie Discovery Hub

[![React Version][react-badge]][react-url]
[![TypeScript][typescript-badge]][typescript-url]
[![Supabase][supabase-badge]][supabase-url]
[![License: MIT][license-badge]][license-url]

**MovieFrd** is a modern, feature-rich web application designed for movie enthusiasts to discover films, track their viewing history, and connect with friends in a vibrant, real-time community. It combines a sleek movie discovery dashboard with a powerful, integrated chat system.

---

## 🎥 Live Demo

> This is where you can embed a GIF or a link to a short video showcasing the app's main features in action. A video is highly effective at demonstrating the real-time chat and smooth UI animations.

*(video placeholder)*

![MovieFrd Live Demo Video](https://via.placeholder.com/800x450.png?text=App+Demo+Video+Here)

---

## ✨ Core Features

### 🍿 Movie Discovery & Tracking
- **Dynamic Dashboard**: View popular, top-rated, and upcoming movies at a glance.
- **Advanced Search**: Instantly search the entire TMDB database, with results sorted by relevance and release date.
- **Rating Filters**: Easily filter search results by TMDB rating (e.g., 7+, 8+).
- **Personal Movie Lists**: Manage your own **Watched List** and **Watchlist**.
- **Interactive Movie Cards**: Sleek card design with hover-to-reveal actions and movie genres.
- **Detailed Movie View**: Click any movie to open a modal with a full synopsis, cast, trailer, and genre tags.

### 👥 Social & Community
- **Friend System**: Find users, send, accept, and manage friend requests.
- **Live Friend Activity**: See what your friends are watching or adding to their watchlist in a real-time feed on your dashboard.
- **User Profiles**: View other users' profiles, including their watched lists, watchlists, and friends.

### 💬 Real-Time Chat & Messaging
- **Integrated Chat Interface**: A dedicated, full-screen chat experience.
- **Direct Messaging (DMs)**: Have private, one-on-one conversations with your friends.
- **Public & Anonymous Rooms**: Join public discussions or create anonymous rooms for spoiler-filled chats.
- **Instant Message Delivery**: Powered by Supabase Realtime, messages appear instantly without needing a page refresh.
- **Online Presence**: See which of your friends are currently online.
- **Typing Indicators**: Know when someone is replying to you in real-time.
- **Message Replies**: Quote and reply to specific messages for threaded conversations.
- **Ephemeral Messages**: DMs and room messages automatically disappear after a set period to keep conversations fresh.
- **Clickable DM Notifications**: Receive rich, interactive toast notifications for new DMs that take you directly to the chat.

### 👤 Authentication & Profile Management
- **Secure Auth**: Email/password authentication managed by Supabase.
- **Personalized Profile**: Manage your username and upload a custom profile picture.
- **Dark/Light Mode**: Toggle between a sleek dark theme and a clean light theme.

---

## 📸 Screenshots

> Replace these placeholders with actual screenshots of your application. Show off the dashboard, chat interface, movie details modal, and profile page.

*(screenshot placeholders)*

| Dashboard | Chat View | Movie Details |
| :---: | :---: | :---: |
| ![Dashboard Screenshot](https://via.placeholder.com/400x300.png?text=Dashboard+View) | ![Chat Screenshot](https://via.placeholder.com/400x300.png?text=Chat+View) | ![Movie Detail Screenshot](https://via.placeholder.com/400x300.png?text=Movie+Detail+Modal) |

---

## 🛠️ Tech Stack

- **Frontend**: [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/)
- **Backend-as-a-Service**: [Supabase](https://supabase.io/)
  - **Authentication**: Supabase Auth
  - **Database**: Supabase (Postgres)
  - **Real-time Engine**: Supabase Realtime Subscriptions
  - **Storage**: Supabase Storage (for user avatars)
- **Movie Data**: [The Movie Database (TMDB) API](https://www.themoviedb.org/documentation/api)

---

## 🚀 Getting Started

Follow these instructions to set up and run the project locally.

### 1. Prerequisites
- [Node.js](https://nodejs.org/) and npm
- A [Supabase](https://supabase.com/) account (free tier is sufficient)
- A [TMDB API Key](https://www.themoviedb.org/settings/api)

### 2. Clone the Repository
```bash
git clone https://github.com/your-username/moviefrd.git
cd moviefrd
```

### 3. Configure Supabase

1.  **Create a New Project**: Go to your Supabase Dashboard and create a new project.
2.  **Run the Schema SQL**:
    - In your Supabase project, navigate to the **SQL Editor**.
    - Click **+ New query**.
    - Copy the entire content of the `schema.sql` file from this repository and paste it into the editor.
    - Click **RUN**. This will create all the necessary tables, relationships, and database functions.
3.  **Set up Storage**:
    - Navigate to the **Storage** section in your Supabase dashboard.
    - Create a new **public bucket** named `avatars`.
    - Go to the bucket's policies and add policies to allow authenticated users to `SELECT`, `INSERT`, and `UPDATE` their own avatars.
4.  **Get Your Credentials**:
    - Go to **Project Settings** > **API**.
    - Find your **Project URL** and `anon` **public key**. You'll need these for the next step.

### 4. Set Up Environment Variables

The project code contains hardcoded keys for development convenience. It's highly recommended to replace them with environment variables. To do this, you would typically modify `supabaseClient.ts` and `api.ts` to read from `process.env`.

For example, in `supabaseClient.ts`:
```typescript
// Replace the hardcoded values with this:
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;
```

You would then need a `.env` file in the root of your project:
```
# .env
VITE_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```
*Note: The current setup reads these variables but falls back to the hardcoded ones if they aren't found.*

### 5. Running the Application

This project is designed to run in a specific web-based development environment that handles the build process automatically. If you were to run it locally with a standard React setup (like Vite), the steps would be:

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

---
## 📄 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

<!-- Badges -->
[react-badge]: https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react
[react-url]: https://reactjs.org/
[typescript-badge]: https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript
[typescript-url]: https://www.typescriptlang.org/
[supabase-badge]: https://img.shields.io/badge/Supabase-green?style=for-the-badge&logo=supabase
[supabase-url]: https://supabase.io
[license-badge]: https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge
[license-url]: https://opensource.org/licenses/MIT
