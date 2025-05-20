import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://eeooammrtydsidlegygr.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlb29hbW1ydHlkc2lkbGVneWdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2MjM3MjEsImV4cCI6MjA2MjE5OTcyMX0.sKicaCtYo1Kwn6vavWGp7NjSU3yAXK7me7wnAPFzuug";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
