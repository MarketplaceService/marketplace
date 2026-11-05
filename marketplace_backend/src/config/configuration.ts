import appConfig from './app/app.config';
import databaseConfig from './database/database.config';
import supabaseConfig from './supabase/supabase.config';
import throttlerConfig from './throttler/throttler.config';

export const allConfig = [
  throttlerConfig,
  appConfig,
  databaseConfig,
  supabaseConfig,
];
