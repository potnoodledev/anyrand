# LottoPGF V1 frontend

This is the frontend for LottoPGF's V1 protocol. It allows to run a basic number lottery.

## Installation

```bash
# If not yet installed, install pnpm via `corepack`
$ corepack install
# Install dependencies
$ pnpm install
```

## Configuration

1. Copy [`.env.example`](./.env.example) to `.env.local` (or set them in your deployment) and update the values.
2. Update [`config.tsx`](./src/config.tsx) and [`fundraisers.tsx`](./src/fundraisers.tsx) with your values.
3. (Optional) Update [`globals.css`](./src/globals.css) with your theme and do any other customization.

## Development

This app is a nextjs app and will run on port `3000` by default.

```bash
$ pnpm dev
```

## Deployment

This app is designed to be deployed on Vercel. As it is a regular nextjs 15 app it should work on any other platform that supports it.

Make sure that your environment variables are set up on your deployment platform and `config.ts` are configured correctly.
