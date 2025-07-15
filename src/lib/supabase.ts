import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://grvdwaxsyoynyvcpldda.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdydmR3YXhzeW95bnl2Y3BsZGRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwMDY1MjcsImV4cCI6MjA2NTU4MjUyN30.NAuccVyC2rjtr4gxBBkGAs7YMmcr9YZUJL2xi_AR7bE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 