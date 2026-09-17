<div align="center"><h1>Shivam Tamboli — Portfolio</h1></div>


<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-18-149ECA?logo=react&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-blue?logo=typescript&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-Bundler-646CFF?logo=vite&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase&logoColor=white" />
  <img alt="Framer Motion" src="https://img.shields.io/badge/Framer_Motion-Animation-0055FF?logo=framer&logoColor=white" />
  <img alt="Deployed on Vercel" src="https://img.shields.io/badge/Deployed_on-Vercel-000000?logo=vercel&logoColor=white" />
</p>

<p align="center">
  <img alt="GitHub last commit" src="https://img.shields.io/github/last-commit/LordCrateis/shivam-tamboli-portfolio" />
  <img alt="GitHub repo size" src="https://img.shields.io/github/repo-size/LordCrateis/shivam-tamboli-portfolio" />
  <img alt="GitHub issues" src="https://img.shields.io/github/issues/LordCrateis/shivam-tamboli-portfolio" />
  <img alt="GitHub stars" src="https://img.shields.io/github/stars/LordCrateis/shivam-tamboli-portfolio?style=social" />
</p>

This repository contains the source code for [Shivam Tamboli's portfolio](https://shivam-tamboli-portfolio.vercel.app), a responsive React and TypeScript site for presenting his work as an ML Engineer. The site combines an editorial visual system with a Supabase-backed project catalogue, an interactive blog, project ratings and media, dark mode, and an embedded AI portfolio companion named Flamolina.

> Building machine intelligence at the intersection of rigorous research and pragmatic engineering.

**🔗 Live site:** [shivam-tamboli-portfolio.vercel.app](https://shivam-tamboli-portfolio.vercel.app)

---

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Supabase Setup](#supabase-setup)
  - [Admin Authentication](#admin-authentication)
  - [Schema Compatibility Note](#schema-compatibility-note)
- [Available Scripts](#available-scripts)
- [Application Routes](#application-routes)
- [Flamolina Integration](#flamolina-integration)
- [Project Structure](#project-structure)
- [Deployment](#deployment)
- [Security Considerations](#security-considerations)
- [Contributing](#contributing)
- [References](#references)

---

## Features

| Area | Functionality |
| --- | --- |
| **Portfolio homepage** | Hero, About, Projects, Stack, and Contact sections with responsive navigation and animated transitions. |
| **Editorial visual design** | Cream-and-ink color system, typography-led layouts, dark mode, grain/noise overlay, custom cursor, preloader, and reduced-motion support. |
| **Project catalogue** | Supabase-backed project records with search, pagination, bespoke live actions, GitHub links, detailed case-study pages, screenshot galleries, media, and visitor ratings. |
| **Blog and journal** | Public blog listing and detail pages with hash-based routing, category support, search, pagination, and Markdown/rich-text content. |
| **Blog interactions** | Likes, aliases, comments, replies, comment reports, copy actions, admin pinning, and self-service editing/deletion for commenters. |
| **Admin content management** | Google OAuth-based admin flow for creating, editing, publishing, and deleting blog posts and projects, plus report review. |
| **Flamolina assistant** | A modal or full-screen chat interface that sends conversation history to a separate backend and renders Markdown/GFM replies. |
| **Graceful preview mode** | The site can render without Supabase credentials; data-backed sections show their existing empty or error states until configured. |

## Technology Stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, PostCSS, custom CSS variables |
| Animation and interaction | Framer Motion, Lucide React, Simplex Noise, custom browser interactions |
| Content rendering | React Markdown with GitHub-Flavored Markdown support through `remark-gfm` |
| Data and authentication | Supabase JavaScript client and Supabase Auth with Google OAuth |
| Media | Three.js and Vidstack React integrations |
| Deployment | Vercel-compatible Vite build; the repository currently links to a Vercel deployment |

The dependency and script definitions are maintained in [`package.json`](https://github.com/LordCrateis/shivam-tamboli-portfolio/blob/main/package.json).

## Getting Started

### Prerequisites

You will need **Node.js 18 or newer**, npm, and access to a Supabase project if you want to enable projects, blogs, ratings, comments, reports, or admin features. The public preview can still be started without Supabase values because the client falls back to placeholder configuration.

### Installation

Clone the repository and install the locked dependency tree:

```bash
git clone https://github.com/LordCrateis/shivam-tamboli-portfolio.git
cd shivam-tamboli-portfolio
npm ci
```

For local development, copy the environment template:

```bash
cp .env.example .env
```

Then start Vite:

```bash
npm run dev
```

The development server normally opens at `http://localhost:5173`.

## Environment Variables

The browser bundle only needs public Supabase credentials and the URL of the Flamolina backend. Vite exposes variables prefixed with `VITE_` to client-side code, so **never place a Supabase service-role key or other private credential in this file**.

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Required for data-backed features | Supabase project URL. |
| `VITE_SUPABASE_ANON_KEY` | Required for data-backed features | Supabase anonymous/public key. This is intended for browser use and must be protected by Supabase RLS policies. |
| `VITE_FLAMOLINA_API_URL` | Optional | Flamolina chat endpoint. Defaults to `http://localhost:8000/chat`. |
| `VITE_ADMIN_ROUTE` | Required for the secret admin trigger route | Hash-route segment used by the application to trigger the admin OAuth flow. This variable is read by `src/App.tsx` but is not currently included in `.env.example`; add it explicitly when enabling admin access. |

A local configuration may look like this:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_FLAMOLINA_API_URL=http://localhost:8000/chat
VITE_ADMIN_ROUTE=studio-admin
```

## Supabase Setup

The SQL bootstrap in [`supabase/blogs.sql`](https://github.com/LordCrateis/shivam-tamboli-portfolio/blob/main/supabase/blogs.sql) creates the tables and policies used by the portfolio. Run it in the Supabase SQL Editor before enabling the data-backed features.

| Database object | Purpose |
| --- | --- |
| `blogs` | Blog titles, slugs, excerpts, rich content, categories, publication state, dates, and like counts. |
| `projects` | Project metadata including slug, category, date, summary, Markdown case study, technology stack, live and GitHub URLs, action label, status, visibility, and ordering. |
| `project_media` | Ordered project screenshots and videos with captions and accessible descriptions. |
| `project_collaborators` | Ordered project collaborators with names and GitHub profiles used to resolve profile photos. |
| `blog_comments` | Visitor comments attached to blog posts. |
| `blog_comment_replies` | Replies to comments, including optional admin avatar metadata. |
| `blog_comment_reports` | Reports submitted for comment moderation. |
| `project_ratings` | Public 1–5 project ratings. |
| `increment_blog_like(uuid)` | Security-definer function used to increment a blog's like count. |

The SQL enables **row-level security** and permits public reads only where appropriate. Published blogs are publicly readable, projects are publicly readable, comments and replies can be publicly read/inserted, ratings can be publicly read/inserted, and administrative operations are restricted through an email-based policy.

### Admin Authentication

The admin interface uses Google OAuth through Supabase Auth. The frontend allowlist and SQL policies use the same single-admin email defined for this portfolio.

For a deployed site, add the production origin and OAuth callback URL to the Supabase Auth URL configuration. The application also uses the current browser origin when constructing the Google OAuth redirect.

### Schema Compatibility Note

> ⚠️ The frontend calls the `increment_blog_like` RPC with both `blog_uuid` and a client fingerprint, while the supplied SQL function currently declares only a `blog_uuid` parameter. If likes fail after applying the SQL, reconcile the function signature and frontend call before production use — either remove the extra argument from the frontend call, or update the function and its safeguards to support fingerprint-aware rate limiting.

## Available Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server with hot module replacement. |
| `npm run build` | Type-check through the Vite build pipeline and generate the production bundle in `dist/`. |
| `npm run preview` | Serve the production build locally. Run `npm run build` first. |
| `npm run lint` | Run ESLint across the project. |
| `npm run typecheck` | Run TypeScript without emitting files. |

Before opening a pull request, run the following validation sequence:

```bash
npm run lint
npm run typecheck
npm run build
```

## Application Routes

The application uses hash-based navigation rather than a separate router dependency.

| Route | Purpose |
| --- | --- |
| `#/` | Main portfolio homepage. |
| `#/blog` | Blog listing. |
| `#/blog/roles` | Blog role-selection view. |
| `#/blog/visitor` | Visitor blog mode. |
| `#/blog/team` | Team/admin-oriented blog mode. |
| `#/blog/<slug>` | Individual blog post. |
| `#/projects/<slug>` | Individual project case study and screenshot gallery. |
| `#/profile` | Profile view. |
| `#/reports` | Admin report view. |
| `#/<VITE_ADMIN_ROUTE>` | Ephemeral admin OAuth trigger route configured through the environment. |

The primary route selection and authentication synchronization are implemented in [`src/App.tsx`](https://github.com/LordCrateis/shivam-tamboli-portfolio/blob/main/src/App.tsx).

## Flamolina Integration

Flamolina is intentionally separated from the portfolio frontend. The portfolio only supplies the chat interface and calls the backend configured by `VITE_FLAMOLINA_API_URL`; the model, retrieval pipeline, and external tools live in the companion [Flamolina chatbot repository](https://github.com/LordCrateis/flamolina-chatbot).

Each message is sent as a `POST` request with JSON in this shape:

```json
{
  "message": "Walk me through your best projects",
  "history": [
    {
      "role": "assistant",
      "content": "Ask me about Shivam's work, process, or anything that caught your eye."
    }
  ]
}
```

The backend is expected to expose `POST /chat` and return an object containing an `answer` string. The frontend renders assistant responses with Markdown and GitHub-Flavored Markdown support, including links, tables, lists, and code blocks. If the request fails, the interface displays a local message instructing the developer to start the Flamolina backend and verify the endpoint.

For local development, run the backend separately and keep the frontend variable pointed at its chat route:

```env
VITE_FLAMOLINA_API_URL=http://localhost:8000/chat
```

## Project Structure

```
.
├── public/
│   ├── avatar.png             # Portfolio and Flamolina avatar asset
│   └── ...
├── src/
│   ├── components/
│   │   ├── About.tsx
│   │   ├── Blog.tsx
│   │   ├── BlogInteractions.tsx
│   │   ├── BlogReports.tsx
│   │   ├── Contact.tsx
│   │   ├── FlamolinaChat.tsx
│   │   ├── Hero.tsx
│   │   ├── Projects.tsx
│   │   ├── ProjectPage.tsx
│   │   ├── ProjectGallery.tsx
│   │   ├── ProjectMedia.tsx
│   │   ├── ProjectRatings.tsx
│   │   ├── Stack.tsx
│   │   ├── ThemeToggle.tsx
│   │   └── ...
│   ├── hooks/
│   │   └── useTheme.tsx
│   ├── lib/
│   │   ├── admin.ts             # Admin email allowlist and avatar helper
│   │   ├── projectContent.ts     # Project routes, CTAs, repositories, and case-study defaults
│   │   └── supabase.ts          # Browser Supabase client
│   ├── App.tsx                  # Page routing, auth state, and layout
│   ├── index.css                # Tailwind layers and global visual system
│   └── main.tsx                 # React entrypoint
├── supabase/
│   └── blogs.sql                # Database tables, policies, and RPC
├── .env.example
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## Deployment

The project is a standard Vite application and can be deployed to Vercel or another static hosting provider that supports Node-based builds.

1. Import the repository into the hosting provider.
2. Use `npm ci` as the install command.
3. Use `npm run build` as the build command.
4. Publish the `dist` directory.
5. Add the `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_FLAMOLINA_API_URL`, and `VITE_ADMIN_ROUTE` environment variables in the deployment settings.
6. Configure the deployed origin in Supabase Auth if Google OAuth is enabled.
7. Confirm that Supabase RLS policies match the intended admin account before exposing content-management routes.

The public deployment link shown by the repository is Vercel-based, but no provider-specific configuration file is required by the current source tree.

## Security Considerations

The browser should receive only the Supabase URL and anonymous key. RLS policies are the security boundary for public data access and admin operations; do not place a Supabase service-role key in `.env`, `VITE_*` variables, or frontend code.

The current SQL uses permissive public insert policies for comments, replies, reports, and project ratings. Before production use, consider adding server-side validation, abuse prevention, rate limiting, CAPTCHA or bot protection, stricter input constraints, and moderation monitoring.

The frontend contains the admin email in source code, and the SQL contains the same kind of allowlist in policy definitions. Treat this as a lightweight single-admin portfolio CMS rather than a general multi-user authorization system.

## Contributing

When changing a data-backed feature, update the React component, SQL schema or policy, and environment documentation together. Keep the public site usable without optional integrations, preserve keyboard and reduced-motion behavior, and run linting, type checking, and the production build before submitting changes.

## References

| # | Resource |
| --- | --- |
| [1] | [Shivam Tamboli portfolio repository](https://github.com/LordCrateis/shivam-tamboli-portfolio) |
| [2] | [Portfolio package manifest](https://github.com/LordCrateis/shivam-tamboli-portfolio/blob/main/package.json) |
| [3] | [Supabase browser client](https://github.com/LordCrateis/shivam-tamboli-portfolio/blob/main/src/lib/supabase.ts) |
| [4] | [Supabase schema and policies](https://github.com/LordCrateis/shivam-tamboli-portfolio/blob/main/supabase/blogs.sql) |
| [5] | [Frontend admin allowlist](https://github.com/LordCrateis/shivam-tamboli-portfolio/blob/main/src/lib/admin.ts) |
| [6] | [Application shell and hash routes](https://github.com/LordCrateis/shivam-tamboli-portfolio/blob/main/src/App.tsx) |
| [7] | [Flamolina chatbot backend](https://github.com/LordCrateis/flamolina-chatbot) |

---

<p align="center">
  Built by <a href="https://github.com/LordCrateis">Shivam Tamboli</a>
</p>
# Generated resume

The admin project editor can keep resume-specific project copy separate from portfolio copy. A project can be toggled into the resume from its card or editor, with a dedicated title, up to three bullets, tech stack, and ordering value.

Static resume content (contact details, education, experience, and skills) is managed from the admin Profile page. Saving either project or static content invokes the `generate-resume` Supabase Edge Function. The function fills the locked Jake's Resume template and dispatches the `Generate portfolio resume` GitHub Actions workflow. GitHub compiles the PDF, uploads it to `resume-files/generated/shivam-tamboli-resume.pdf`, and updates `profile.resume_url`.

Setup order:

1. Apply `supabase/resume_generation.sql`.
2. Deploy `supabase/functions/generate-resume` with JWT verification enabled.
3. Add `GITHUB_DISPATCH_TOKEN` and `GITHUB_REPOSITORY` as Supabase Edge Function secrets.
4. Add `PORTFOLIO_SUPABASE_URL` and `PORTFOLIO_SUPABASE_SECRET_KEY` as GitHub Actions repository secrets.

The workflow is stored in `.github/workflows/generate-resume.yml`; the publishing script is `scripts/publish-generated-resume.mjs`.
