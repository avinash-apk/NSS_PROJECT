# CivicConnect - Project Submission

## 🌐 Live Application Links
- **Citizen Portal / Public Dashboard:** [Insert Vercel URL here]
- **Admin Portal:** [Insert Vercel URL here]/admin
- **Backend API Base URL:** [Insert Railway URL here]

## 🔐 Evaluator Admin Access
To test the admin functionalities (managing issues, updating SLA statuses, tracking citizen reports), please log in with the following credentials at the `/admin` portal:
- **Admin Email:** `evaluator@civicconnect.local`
- **Admin Password:** `[Insert the password you created]`

*(Note to team: Make sure you go to `/register` on your live Vercel link and create this account before submitting!)*

## 📦 Deliverables Included
1. **Functional Prototype:** Full end-to-end flow from Citizen Report -> Public Tracking Dashboard -> Admin Resolution.
2. **Data-Privacy Policy (DPDP Aligned):** Included in `POLICY.md`. Citizen reports explicitly track DPDP consent timestamps and privacy policy versions.
3. **Escalation Policy (SLA):** Automated SLA deadlines (12h to 72h depending on issue severity) built into the system with dashboard flagging.
4. **Usability / User Flow:** Mockup-level UI built for cross-device responsiveness and accessibility.

## 🛠 Tech Stack
- **Frontend:** Next.js (React), Tailwind CSS
- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL (Hosted on Railway)
- **Deployment:** Vercel (Client) & Railway (Server + DB)
