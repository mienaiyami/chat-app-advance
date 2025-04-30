# Chat App Advance

A modern chat application built with Next.js, tRPC, and Socket.IO in a Turborepo monorepo.

## Project Overview

This project is a full-featured chat application with real-time messaging capabilities. It utilizes a monorepo structure with Turborepo to manage multiple applications and shared packages.

## What's inside?

This Turborepo includes the following apps and packages:

### Apps

- `web`: A Next.js 15 application with a modern UI built using Radix UI, Tailwind CSS, and React 19. This is the main client interface for the chat application.
- `socket`: A Socket.IO server for handling real-time communication. Built with Express and runs with tsx.

### Packages

- `@repo/api`: tRPC API definitions shared between client and server
- `@repo/auth`: Authentication utilities using NextAuth.js
- `@repo/database`: Database client and schema definitions using Drizzle ORM with PostgreSQL
- `@repo/typescript-config`: Shared TypeScript configurations

## Tech Stack

- **Frontend**: Next.js 15, React 19, TailwindCSS, Radix UI
- **API**: tRPC 11 with React Query
- **Real-time Communication**: Socket.IO
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: NextAuth.js
- **Build Tools**: Turborepo, pnpm
- **Code Quality**: Biome for formatting and linting
- **Languages**: TypeScript

## Getting Started

### Prerequisites

- Node.js v18 or later
- pnpm v9.0.0 or later
- PostgreSQL

### Setting Up the Development Environment

1. Clone the repository
2. Install dependencies:

```
pnpm install
```

3. Set up your environment variables:

```
cp .env.example .env
```

Then edit `.env` with your configuration details.

4. Start the database (if using Docker):

```
# in wsl or linux
./start-database.sh
```

5. Push the database schema:

```
pnpm db:push
```

### Development

To develop all apps and packages, run the following command:

```
pnpm dev
```

### Build

To build all apps and packages, run the following command:

```
pnpm build
```

### Database Tasks

- Generate migrations: `pnpm db:generate`
- Apply migrations: `pnpm db:migrate`
- View database with UI: `pnpm db:studio`
- Push schema changes: `pnpm db:push`

## Useful Commands

- `pnpm format-and-lint` - Check formatting and linting across all packages
- `pnpm format-and-lint:fix` - Fix formatting and linting issues across all packages
- `pnpm typecheck` - Type check all packages
- `pnpm clean` - Clean build artifacts and node_modules

## Useful Links

Learn more about the technologies used:

- [Next.js](https://nextjs.org/)
- [tRPC](https://trpc.io/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Socket.IO](https://socket.io/)
- [Turborepo](https://turbo.build/repo)
- [Tailwind CSS](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/)
