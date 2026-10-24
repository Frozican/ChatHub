# ChatHub

Discord-inspired responsive chat starter for GitHub Pages and Supabase.

## Setup
1. Create a Supabase project.
2. Run supabase/schema.sql in Supabase SQL Editor.
3. Edit config.js with your project URL and public anon/publishable key. Never use a service_role key in frontend code.
4. In Supabase Auth URL Configuration, set the site URL to https://Frozican.github.io/ChatHub/ and add it to allowed redirects.
5. In GitHub, open Settings > Pages and enable Deploy from a branch, main, /(root).
6. Test with two separate accounts.

## Status
Includes responsive dark UI, email auth wiring, server/channel UI, live message subscriptions and local demo mode. Friend requests by exact display name, accepting incoming requests, joining servers by server ID, and private admin moderation are implemented. Direct messages, voice/video, secure invitation codes and private attachment handling are not implemented yet. The schema includes some tables for future work.

## Security
Only the public anon/publishable key belongs in config.js. Never commit service_role keys or database passwords. RLS is required. The starter SQL allows self-joining a server for testing; replace this with invite-code/approval logic before public launch. Test every policy with separate accounts.