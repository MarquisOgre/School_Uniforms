# School Uniforms

A multi-school Indian school-uniform e-commerce platform.

## Product model

- Public generic landing page.
- School login with **School + Student/Parent ID + Password**.
- Authenticated users are locked to their assigned school and branch.
- Three shopping areas:
  1. Boys Uniform Package
  2. Girls Uniform Package
  3. Individual Products
- Packages are dynamically composed from master individual products.
- Package purchases consume the same variant inventory used by individual-product purchases.
- Parents can be linked to multiple students.
- School-specific catalog visibility and pricing are supported.
- Orders, payments, coupons, addresses and support are included in the foundation.

## Route architecture

```
/                    Public landing
/schools             Public school directory
/how-it-works        Public explainer
/about               Public about page
/contact             Public contact page
/login               School + Student/Parent ID + Password

/app/*               Authenticated school/branch customer portal

/admin/login         Separate admin login
/admin/*             Admin portal
```

## Security model

The selected school in the login form is **not** treated as a security boundary.

After authentication:

- the user's school and branch are stored in `public.profiles`;
- backend operations use the authenticated user's assigned scope;
- PostgreSQL RLS enforces school/branch isolation;
- public users can see only the active-school directory, not private catalogs;
- the Supabase service role is never used in the browser.

Customer login IDs are stored in the profile layer. The eventual Student/Parent ID login flow should resolve the identifier server-side before issuing a Supabase Auth session.

## Database foundation

The baseline migration is:

`supabase/migrations/001_initial_schema.sql`

The live Supabase database was reset to this clean baseline before application data entry. No business data was present at reset time.

Core tables include:

- Schools / Branches
- Profiles / Students / Parent-Student Links
- Product Categories / Products / Product Variants
- Branch Products / Uniform Packages / Package Items / Branch Packages
- Branch Inventory / Inventory Transactions
- Orders / Order Items / Payments
- Coupons / Order Coupons
- Customer Addresses
- Support Conversations / Support Messages

## Development

1. Copy `.env.example` to `.env.local`.
2. Add the Supabase URL and publishable key.
3. Install dependencies with `npm install`.
4. Run `npm run dev`.

Supabase generated TypeScript types are kept in `src/types.ts`, and the typed Supabase client is in `src/lib/supabase.ts`.
