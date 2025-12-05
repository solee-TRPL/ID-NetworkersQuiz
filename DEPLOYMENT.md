# Tech Stack & Deployment Guide

This document outlines the technology stack used in this interactive quiz application and provides instructions for deploying it.

## 🚀 Tech Stack

-   **Frontend:**
    -   **React:** A JavaScript library for building user interfaces.
    -   **TypeScript:** A typed superset of JavaScript that compiles to plain JavaScript.
    -   **Tailwind CSS:** A utility-first CSS framework for rapid UI development.
    -   **React Router:** For client-side routing.
    -   **Lucide React:** For icons.
    -   **DiceBear:** For generating SVG avatars.

-   **Backend & Database (BaaS - Backend as a Service):**
    -   **Supabase:** An open-source Firebase alternative.
        -   **PostgreSQL Database:** For storing all application data (quizzes, players, rooms, etc.).
        -   **Supabase Auth:** For user authentication (host login).
        -   **Supabase Realtime:** For real-time updates in game lobbies and during gameplay, using PostgreSQL's logical replication.
        -   **Postgres Functions (RPC):** Used for complex server-side logic like calculating scores (`submit_player_answer`).

-   **Development Environment:**
    -   The project is configured to run in an environment that uses **import maps** (`index.html`), allowing it to use modules directly from a CDN without a local `node_modules` folder or a complex build step (like Vite or Create React App).

## ☁️ Deployment Instructions

To deploy this application, you need to set up the backend (Supabase) and the frontend (a static site host).

### 1. Supabase Setup (Backend)

1.  **Create a Supabase Project:**
    -   Go to [supabase.com](https://supabase.com) and create a new project.
    -   Choose a strong database password and save it securely.

2.  **Get API Credentials:**
    -   In your Supabase project dashboard, navigate to **Project Settings** > **API**.
    -   You will find your **Project URL** and your `anon` **Public Key**.

3.  **Configure Supabase Client:**
    -   Open the `services/supabaseClient.ts` file in your project.
    -   Replace the placeholder values for `supabaseUrl` and `supabaseAnonKey` with the credentials you copied from your Supabase project.

    ```typescript
    // services/supabaseClient.ts
    import { createClient } from '@supabase/supabase-js';

    // REPLACE WITH YOUR SUPABASE CREDENTIALS
    const supabaseUrl = 'YOUR_SUPABASE_URL';
    const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';

    export const supabase = createClient(supabaseUrl, supabaseAnonKey);
    ```

4.  **Set up the Database Schema:**
    -   Navigate to the **SQL Editor** in your Supabase dashboard.
    -   Click **"New query"**.
    -   Copy the **entire content** of the `sql.txt` file from the project.
    -   Paste the content into the SQL Editor.
    -   Click **"RUN"**. This will create all the necessary tables, functions, policies (for security), and database triggers.

Your backend is now ready!

### 2. Frontend Deployment

This is a client-side rendered React application. You can host the static files (`index.html`, `index.tsx`, `assets/`, etc.) on any static hosting provider.

Popular choices include **Vercel**, **Netlify**, or **GitHub Pages**.

**General Steps (using Vercel/Netlify as an example):**

1.  **Push to a Git Repository:**
    -   Make sure your project code is pushed to a GitHub, GitLab, or Bitbucket repository.

2.  **Connect Your Git Repository:**
    -   Sign up for Vercel or Netlify and connect your Git account.
    -   Select the repository containing your project.

3.  **Configure Build Settings:**
    -   **Build Command:** Since this project doesn't have a traditional build step (like `npm run build`), you can often leave this blank.
    -   **Output Directory / Publish Directory:** Set this to the root directory (`./`) where your `index.html` is located.
    -   **Install Command:** Can be left blank as there are no `package.json` dependencies to install.

4.  **Deploy:**
    -   Click the "Deploy" button. The hosting service will pull your code and deploy it to a live URL.

Your quiz application is now live! Anyone with the URL can access the home page to join a game or log in as a host.
