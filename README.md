# Finixar - Investment Management Platform

A comprehensive React-based investment management platform for tracking projects, investors, subscriptions, payments, and coupons. Built with React, TypeScript, Vite, and Supabase.

## Features

- **Project Management**: Create and manage investment projects with detailed financial tracking
- **Investor Portal**: Manage investor profiles, RIB documents, and investment history
- **Subscription Tracking**: Track investor subscriptions across projects and tranches
- **Payment Processing**: Handle coupon payments with proof upload and validation
- **Advanced Filtering**: Multi-select filters, date ranges, saved presets, and analytics
- **Real-time Updates**: Live data synchronization across all users
- **Role-Based Access**: Super admin, organization admin, and member roles
- **Multi-organization**: Support for multiple organizations with isolated data

## Tech Stack

- **Frontend**: React 18.3 + TypeScript 5.5
- **Build Tool**: Vite 5.4
- **Styling**: Tailwind CSS 3.4
- **Routing**: React Router DOM 7.9
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Icons**: Lucide React
- **File Processing**: XLSX, PDF.js

## Prerequisites

- **Node.js**: v18.x or higher (recommended: v20.x)
- **npm**: v9.x or higher
- **Supabase Account**: Required for backend services
- **Git**: For version control

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd newapp
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy the example environment file and configure it with your Supabase credentials:

```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

See `.env.example` for all available configuration options.

### 4. Database Setup

Run the Supabase migrations to set up your database schema:

```bash
# Using Supabase CLI
supabase db push

# Or manually run migrations from supabase/migrations/ in your Supabase dashboard
```

### 5. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Available Scripts

- **`npm run dev`** - Start development server with hot reload
- **`npm run build`** - Build for production
- **`npm run preview`** - Preview production build locally
- **`npm run lint`** - Run ESLint for code quality
- **`npm run typecheck`** - Type check with TypeScript compiler
- **`npm test`** - Run tests with Vitest
- **`npm run test:ui`** - Run tests with interactive UI

## Project Structure

```
newapp/
├── .bolt/                    # Bolt.new configuration
├── src/
│   ├── components/           # React components (43 components)
│   │   ├── filters/          # Advanced filter components
│   │   ├── Dashboard.tsx     # Main dashboard
│   │   ├── Projects.tsx      # Projects management
│   │   ├── Investors.tsx     # Investor management
│   │   ├── Payments.tsx      # Payment processing
│   │   └── ...
│   ├── hooks/                # Custom React hooks (8 hooks)
│   │   ├── useAuth.ts        # Authentication hook
│   │   ├── useAdvancedFilters.ts  # Advanced filtering
│   │   └── ...
│   ├── utils/                # Utility functions (9 utilities)
│   │   ├── validators.ts     # Input validation
│   │   ├── formatters.ts     # Data formatting
│   │   ├── errorMessages.ts  # User-friendly error messages
│   │   └── ...
│   ├── lib/                  # Third-party integrations
│   │   ├── supabase.ts       # Supabase client
│   │   └── database.types.ts # Database type definitions
│   ├── config/               # Configuration files
│   ├── pages/                # Page components
│   ├── App.tsx               # Root component
│   └── main.tsx              # Application entry point
├── supabase/
│   ├── functions/            # Supabase Edge Functions (5 functions)
│   └── migrations/           # Database migrations (9 migrations)
├── public/                   # Static assets
└── ...config files
```

## Key Features Documentation

### Advanced Filtering System

The application includes a comprehensive filtering system with:
- Multi-select filters for projects, tranches, statuses, etc.
- Date range pickers for time-based filtering
- Saved filter presets for quick access
- Recently used filters tracking
- Filter usage analytics

See `FEATURES_IMPLEMENTED.md` for detailed documentation.

### Authentication & Authorization

- Email/password authentication via Supabase Auth
- Role-based access control (Super Admin, Org Admin, Member)
- Organization-based data isolation
- Invitation system for new users

### Real-time Data

- Live updates using Supabase Realtime
- Automatic cache invalidation
- Optimistic UI updates

## Database Schema

Key tables:
- **organizations**: Multi-tenant organization management
- **memberships**: User-organization relationships with roles
- **projects**: Investment projects
- **tranches**: Project funding tranches
- **investors**: Investor profiles
- **subscriptions**: Investor subscriptions to tranches
- **payments**: Coupon payment tracking
- **profiles**: User profile information

## Deployment

### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Deploy to Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod
```

### Environment Variables

Ensure all environment variables from `.env.example` are configured in your hosting platform.

## Testing

The project uses Vitest for unit and integration testing:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run tests with UI
npm run test:ui
```

## Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make your changes and commit: `git commit -m "feat: add my feature"`
3. Push to the branch: `git push origin feature/my-feature`
4. Create a Pull Request

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

## Troubleshooting

### Development Server Won't Start

- Ensure Node.js version is 18.x or higher: `node --version`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check for port conflicts on port 5173

### Supabase Connection Issues

- Verify environment variables are set correctly
- Check Supabase project status in dashboard
- Ensure anon key has proper permissions

### Build Errors

- Run type check: `npm run typecheck`
- Clear build cache: `rm -rf dist node_modules/.vite`
- Ensure all dependencies are installed

## Support

For issues and questions:
- Create an issue in the GitHub repository
- Contact support: support@finixar.com

## License

[Add your license here]

## Acknowledgments

- React Team for React
- Supabase for backend infrastructure
- Lucide for icon library
- Tailwind CSS for styling utilities
