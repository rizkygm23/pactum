import { createClient } from '@supabase/supabase-js';

// Accept either env name so the demo works with both naming conventions.
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export const supabase = createClient(supabaseUrl as string, supabaseKey);
