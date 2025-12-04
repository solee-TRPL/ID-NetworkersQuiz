import { createClient } from '@supabase/supabase-js';

// Konfigurasi Supabase dengan kredensial yang diberikan
const supabaseUrl = 'https://zhxggapwdkrrjcbirfiy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoeGdnYXB3ZGtycmpjYmlyZml5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Mjk0NTMsImV4cCI6MjA3ODQwNTQ1M30.y_pXSpq-T4v8tprQQJTTSaUZk9shAZa6VO84fQMnhag';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
