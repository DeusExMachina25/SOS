# Site rehearsal scripts

Headless-Chromium walkthroughs of the public site. They never touch the real backend (Supabase and Google Fonts requests are blocked).

```bash
npm run build && npx next start -p 3113        # in one terminal
BASE=http://localhost:3113 SHOTS=./rehearsal-shots node scripts/rehearsal/choreography.mjs   # home scroll beats x 4 screen sizes, clipping/overlap/hazard report
BASE=http://localhost:3113 SHOTS=./rehearsal-shots node scripts/rehearsal/flows.mjs          # overflow, tab order, theme, login errors, mobile-menu focus
BASE=http://localhost:3113 node scripts/rehearsal/back-platter-a11y.mjs                      # back button, pie -> profile, a11y basics
```
