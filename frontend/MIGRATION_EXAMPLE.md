# API Route Migration: Prisma → Supabase

## Example: Users Route

### Before (Prisma) - src/app/api/users/route.ts
```typescript
export const dynamic = 'force-dynamic';
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const users = await prisma.users.findMany({
            select: {
                Id: true,
                Email: true,
                FullName: true,
                NoInduk: true,
                Role: true,
                IsVerified: true,
                CreatedAt: true,
                UpdatedAt: true
            }
        });
        return NextResponse.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
```

### After (Supabase) - src/app/api/users/route.ts
```typescript
export const dynamic = 'force-dynamic';
export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function GET() {
    try {
        const { data: users, error } = await db
            .from<{
                Id: string;
                Email: string;
                FullName: string;
                NoInduk: string;
                Role: string;
                IsVerified: boolean;
                CreatedAt: string;
                UpdatedAt: string;
            }>('users')
            .select('id,email,full_name,no_induk,role,is_verified,created_at,updated_at')
            .execute();

        if (error) {
            console.error('Error fetching users:', error);
            return NextResponse.json({ message: 'Error fetching users' }, { status: 500 });
        }

        // Map to camelCase to match original Prisma output
        const mappedUsers = (users || []).map(u => ({
            Id: u.Id,
            Email: u.Email,
            FullName: u.FullName,
            NoInduk: u.NoInduk,
            Role: u.Role,
            IsVerified: u.IsVerified,
            CreatedAt: u.CreatedAt,
            UpdatedAt: u.UpdatedAt
        }));

        return NextResponse.json(mappedUsers);
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
```

## Key Differences

| Aspect | Prisma | Supabase |
|--------|--------|----------|
| Query Builder | `prisma.table.method()` | `db.from('table').select().method()` |
| Case Sensitive | PascalCase (`Id`, `Email`) | lowercase (`id`, `email`) |
| Returns | Direct data | `{ data, error }` object |
| Relations | `.include()` | Manual JOINs or multiple queries |

## Migration Steps for All 49 Routes

1. **Replace import**: `import prisma from '@/lib/prisma'` → `import { db } from '@/lib/supabase'`
2. **Update query syntax**: Convert Prisma queries to Supabase REST calls
3. **Handle response**: Unwrap `{ data, error }` from Supabase
4. **Map field names**: Convert snake_case to PascalCase if needed

## Environment Variables Needed

Add these to your `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Batch Migration Script

A script can be created to automate this conversion for all 49 routes.
