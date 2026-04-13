import { createClient } from '@supabase/supabase-js';

// Edge-compatible Supabase client using fetch API
// Works on Cloudflare Workers/Edge runtime

// Hardcoded fallback values for deployment (can be overridden by env vars)
const DEFAULT_SUPABASE_URL = 'https://wtnnvlibowwffgtjzoou.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0bm52bGlib3d3ZmZndGp6b291Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzODM2MzgsImV4cCI6MjA4ODk1OTYzOH0.XxR1BNfFpVhId1nOSMfmvxvcVPi5SBE3JQG-BZJIvwU';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

// For Edge runtime, we use direct REST calls instead of the default client
// to avoid any Node.js dependencies

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          password_hash: string;
          full_name: string;
          no_induk: string;
          role: string;
          is_verified: boolean;
          refresh_token: string | null;
          refresh_token_expiry_time: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          password_hash: string;
          full_name: string;
          no_induk: string;
          role?: string;
          is_verified?: boolean;
          refresh_token?: string | null;
          refresh_token_expiry_time?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          password_hash?: string;
          full_name?: string;
          no_induk?: string;
          role?: string;
          is_verified?: boolean;
          refresh_token?: string | null;
          refresh_token_expiry_time?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      bahan_bakus: {
        Row: {
          id: number;
          tipe: string;
          product_slug: string;
          perusahaan_id: number | null;
          tanggal: string;
          jenis: string;
          nama_bahan: string;
          kuantum: number;
          dokumen: string;
          keterangan: string;
          satuan: string;
        };
        Insert: {
          id?: number;
          tipe: string;
          product_slug: string;
          perusahaan_id?: number | null;
          tanggal: string;
          jenis: string;
          nama_bahan: string;
          kuantum: number;
          dokumen: string;
          keterangan: string;
          satuan?: string;
        };
        Update: {
          id?: number;
          tipe?: string;
          product_slug?: string;
          perusahaan_id?: number | null;
          tanggal?: string;
          jenis?: string;
          nama_bahan?: string;
          kuantum?: number;
          dokumen?: string;
          keterangan?: string;
          satuan?: string;
        };
      };
      produksis: {
        Row: {
          id: number;
          product_slug: string;
          produksi_tab_id: number;
          tanggal: string;
          bs: number;
          pg: number;
          kumulatif: number;
          stok_akhir: number;
          coa: number;
          keterangan: string;
          ps: number;
          batch_kode: string;
          ps_batch_kode: string;
          coa_batch_kode: string;
        };
        Insert: {
          id?: number;
          product_slug: string;
          produksi_tab_id: number;
          tanggal: string;
          bs: number;
          pg: number;
          kumulatif: number;
          stok_akhir: number;
          coa: number;
          keterangan: string;
          ps?: number;
          batch_kode?: string;
          ps_batch_kode?: string;
          coa_batch_kode?: string;
        };
        Update: {
          id?: number;
          product_slug?: string;
          produksi_tab_id?: number;
          tanggal?: string;
          bs?: number;
          pg?: number;
          kumulatif?: number;
          stok_akhir?: number;
          coa?: number;
          keterangan?: string;
          ps?: number;
          batch_kode?: string;
          ps_batch_kode?: string;
          coa_batch_kode?: string;
        };
      };
      // Add other tables as needed based on schema.prisma
    };
  };
}

// Helper function to make REST calls to Supabase
async function supabaseFetch<T = any>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: any;
    headers?: Record<string, string>;
  } = {}
): Promise<{ data: T | null; error: any }> {
  if (!supabaseUrl || !supabaseKey) {
    return {
      data: null,
      error: { message: 'Missing Supabase configuration' }
    };
  }

  const url = `${supabaseUrl}/rest/v1/${endpoint}`;
  const headers: Record<string, string> = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: 'no-store',
    });

    // Handle 204 No Content
    if (response.status === 204) {
      return { data: null, error: null };
    }

    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      data = text;
    }

    if (!response.ok) {
      return { data: null, error: data || { message: response.statusText } };
    }

    return { data: data as T, error: null };
  } catch (error) {
    return { data: null, error: { message: String(error) } };
  }
}

// Database query helpers for Edge runtime
export const db = {
  // SELECT * FROM table WHERE column = value
  from: <T>(table: string) => ({
    select: (columns: string = '*') => ({
      eq: (column: string, value: any) => ({
        single: async (): Promise<{ data: T | null; error: any }> => {
          const query = `${table}?${column}=eq.${encodeURIComponent(String(value))}&select=${columns}&limit=1`;
          const result = await supabaseFetch<T[]>(query);
          return { data: result.data?.[0] || null, error: result.error };
        },
        order: (column: string, opts: { ascending?: boolean } = {}) => {
          const dir = opts.ascending === false ? '.desc' : '';
          return {
            execute: async (): Promise<{ data: T[]; error: any }> => {
              const query = `${table}?${column}=eq.${encodeURIComponent(String(value))}&select=${columns}&order=${column}${dir}`;
              const res = await supabaseFetch<T[]>(query);
              return { data: res.data || [], error: res.error };
            },
          };
        },
        execute: async (): Promise<{ data: T[]; error: any }> => {
          const query = `${table}?${column}=eq.${encodeURIComponent(String(value))}&select=${columns}`;
          const res = await supabaseFetch<T[]>(query);
          return { data: res.data || [], error: res.error };
        },
      }),
      // Order without filter
      order: (column: string, opts: { ascending?: boolean } = {}) => ({
        execute: async (): Promise<{ data: T[]; error: any }> => {
          const dir = opts.ascending === false ? '.desc' : '';
          const query = `${table}?select=${columns || '*'}&order=${column}${dir}`;
          const res = await supabaseFetch<T[]>(query);
          return { data: res.data || [], error: res.error };
        },
      }),
      // Execute without filter
      execute: async (): Promise<{ data: T[]; error: any }> => {
        const query = `${table}?select=${columns}`;
        const res = await supabaseFetch<T[]>(query);
        return { data: res.data || [], error: res.error };
      },
    }),

    // INSERT INTO table VALUES (...)
    insert: async (data: Partial<T>): Promise<{ data: T | null; error: any }> => {
      const result = await supabaseFetch<T[]>(table, {
        method: 'POST',
        body: data,
        headers: { 'Prefer': 'return=representation' },
      });
      // When inserting with return=representation, Supabase returns an array
      // We want to return the first element or null
      if (result.error) {
        return { data: null, error: result.error };
      }
      const insertedArray = result.data as T[];
      return { data: insertedArray?.[0] || null, error: null };
    },

    // UPDATE table SET ... WHERE ...
    update: (data: Partial<T>) => ({
      eq: async (column: string, value: any): Promise<{ data: T | null; error: any }> => {
        const query = `${table}?${column}=eq.${encodeURIComponent(String(value))}`;
        const result = await supabaseFetch<T[]>(query, {
          method: 'PATCH',
          body: data,
          headers: { 'Prefer': 'return=representation' },
        });
        if (result.error) {
          return { data: null, error: result.error };
        }
        const updatedArray = result.data as T[];
        return { data: updatedArray?.[0] || null, error: null };
      },
    }),

    // DELETE FROM table WHERE ...
    delete: () => ({
      eq: async (column: string, value: any): Promise<{ error: any }> => {
        const query = `${table}?${column}=eq.${encodeURIComponent(String(value))}`;
        const result = await supabaseFetch(query, { method: 'DELETE' });
        return { error: result.error };
      },
    }),
  }),
};

// Legacy export for compatibility
export const supabase = createClient(supabaseUrl!, supabaseKey!, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export default supabase;
