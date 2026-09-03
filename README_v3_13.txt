RCM v3.13 Settings + Security Cleanup

- Disabled accounts now receive: “This account has been disabled. Access has been revoked.” and are returned to login.
- Account status is rechecked every 60 seconds and when returning to the RCM tab/window. Supabase RLS remains the actual data-access enforcement.
- 10xLABZ system_admin is hidden from User Management lists.
- Firm Information is collapsed by default, always displays the current saved/effective firm info, and requires an explicit Edit Firm Information action before fields can be changed.
- Blank firm settings safely display the established Rodriguez Law Firm defaults rather than empty fields.
- Web login uses a 12-hour workday session cap; no short inactivity logout was added. Existing 15-minute edit-lock behavior remains separate.
