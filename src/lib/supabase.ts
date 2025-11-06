import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { env } from '../config/env';

// Use validated environment variables from config
const supabaseUrl = env.supabase.url;
const supabaseAnonKey = env.supabase.anonKey;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
