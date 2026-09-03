RCM WEB TEST v1
================

Purpose
- Browser-hosted test of the existing RCM FIX13 interface.
- Uses the SAME Rodriguez Supabase project, Auth users, RLS, tables, and edit-lock RPCs.
- Does NOT contain the Supabase service-role/secret key.
- The original desktop FIX13 build/source is not modified by this test package.

GitHub Pages
1. Put the CONTENTS of this web folder at the root of a NEW private/public test repo as appropriate.
2. Enable GitHub Pages for the repo/root branch.
3. Open login.html (or the Pages URL ending in /login.html) and sign in with an existing RCM test account.

First test
- Login
- Dashboard loads
- Open a test client
- Confirm edit lock/read-only collision using two browsers/computers
- Make one harmless test edit and confirm it appears after refresh on the other computer
- Sign out

Known web-test limitations
- Legacy SQLite import remains desktop-only.
- Arbitrary Windows local document paths cannot be newly linked/opened by a browser.
- PDF Save opens the browser print dialog; choose "Save as PDF" there.
- Existing Supabase data is live. Use dummy/test records for the first test.

Security
- The publishable Supabase key is intentionally browser-visible and is protected by Supabase RLS.
- Never add a service-role/secret key to this repo or browser JavaScript.

RCM v3.7: Calendar detail rows show date + calendar emoji + time; cache key bumped to mobile37 for PC/mobile refresh.
