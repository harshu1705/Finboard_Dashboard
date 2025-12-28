# Finance Dashboard

Production-ready finance dashboard built with Next.js 14, TypeScript, and Tailwind CSS.

## Tech Stack

- **Next.js 14** - App Router with React Server Components
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **Dark Theme** - Default dark mode

## Getting Started

### Install Dependencies

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## Deployment

### Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Deploy (automatic)

### AWS

1. Build: `npm run build`
2. Deploy `.next` folder to AWS Amplify, CloudFront, or EC2
3. The `standalone` output mode ensures compatibility

## Project Structure

```
/app              # Next.js App Router pages
/components       # React components (to be added)
/hooks            # Custom React hooks (to be added)
/lib              # Utility functions (to be added)
/config           # Configuration files (to be added)
```

## Environment Variables

Create `.env.local` for local development:

```env
# API Keys (will use NEXT_PUBLIC_ prefix for client-side access)
NEXT_PUBLIC_API_KEY_EXAMPLE=your_key_here
```

## Tests & Developer Notes

- Tests are included using Vitest + Testing Library. To run tests, install dev dependencies (see `package.json`) and run:

```bash
npm run test
```

- Widget reordering can be toggled from the header ("Reorder: On/Off"). You will be asked to confirm when enabling/disabling reordering; the setting is persisted to localStorage.


