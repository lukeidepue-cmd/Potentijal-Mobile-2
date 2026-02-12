-- Schedule the trial-ending-soon Edge Function to run daily at 09:00 UTC.
-- Requires: pg_cron and pg_net enabled; Vault secrets 'project_url' and 'anon_key' created (see plan doc Step 4 Option A).
-- Optional: create Vault secret 'cron_secret' and uncomment the x-cron-secret header below if you use CRON_SECRET.

select cron.schedule(
  'trial-ending-soon-daily',
  '0 9 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/trial-ending-soon',
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
      -- If you use CRON_SECRET, add a Vault secret named 'cron_secret' and uncomment:
      -- , 'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    )
  ) as request_id;
  $$
);
