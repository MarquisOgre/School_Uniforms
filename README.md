# School Uniform Portal

A multi-school Indian school-uniform e-commerce platform.

## Core rule

Students/parents select their school on the login page and authenticate with credentials created by an administrator. After authentication, the account can access only the catalog, packages, prices, inventory and orders belonging to its assigned school.

## Architecture

- React + TypeScript + Vite
- Supabase Auth + PostgreSQL + Row Level Security
- School-scoped catalog
- Master individual products and variants
- Reusable uniform packages composed from individual products
- School-specific product/package availability and pricing
- Shared inventory between individual products and bundles

## Development

1. Copy `.env.example` to `.env.local`.
2. Add the Supabase URL and publishable key.
3. Install dependencies with `npm install`.
4. Run `npm run dev`.

The SQL foundation is in `supabase/migrations/001_initial_schema.sql`.
