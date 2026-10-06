# Pollee Inc

**Real Democracy, one transaction at a time.**

Pollee is a real-time democratic participation platform. Members vote on polls, debate issues in discussion boards, delegate their vote to trusted peers, and earn reputation for constructive participation. A layered hierarchy of moderators — Infomarians, Constituency Managers (Franchise Managers), and a Master Franchiser — keeps the conversation civil and the process trustworthy.

---

## Live App

The app is published at **https://pollee-app.base44.app** (custom domain: **https://pollee-app.org**).

---

## User Manual

The complete, role-by-role user manual lives in **[USER_MANUAL.md](./USER_MANUAL.md)**. It covers every role and feature:

1. Everyone — Shared Features
2. Members & Voters
3. Public Participants
4. Junior Members (12–17)
5. Infomarians
6. Constituency Managers (Franchise Managers)
7. Master Franchiser
8. Super Admin
9. Account & Registration
10. Reputation System
11. Glossary

Most users only need to read the section for their own role, plus the shared "Everyone" section at the top.

---

## Architecture

Pollee is a thin-client web app (React + Tailwind CSS on Vite) backed by the Base44 platform — authentication, database, integrations, and hosting are all provided by Base44.

### Key Concepts

- **Poll** — a question put to members for a vote (Yes / No / RTS).
- **Constituency (Franchise)** — a geographic unit (by postcode) that owns polls and has its own Infomarians and bank accounts.
- **Infomarian** — a front-line moderator assigned to one or more constituencies, holding a moderation level (local, state, or federal).
- **Constituency Manager (Franchise Manager)** — owns a single constituency and manages its Infomarians and polls.
- **Master Franchiser** — oversees all constituencies, Infomarians, and polls platform-wide.
- **Declaration of Interest** — a disclosure of potential conflicts, required of Infomarians and scanned by AI before poll assignment.
- **Reputation** — a score reflecting a member's contribution; influences privileges and standing.
- **Budget** — a proposal's costed line items and an audited envelope, entered by Infomarians or nominated editors.

### Data Model

Core entities include `Poll`, `Vote`, `Comment`, `Clap`, `Delegation`, `Infomarian`, `Franchise`, `Conversation`, `Message`, `ContentLibraryItem`, `ContentFolder`, `DiscussionEvidence`, `IncidentReport`, `ShareRequest`, and the constitutional budget cycle entities (`Cycle`, `Measure`, `Costing`, `Result`, `ConstitutionalSettings`).

### Integrations

- **Stripe** — payment processing for the $0.55 AUD vote-binding transaction.
- **Google Drive** — policy document sync (changes detected via webhook and surfaced for review).
- **Discord, Facebook, Bluesky** — social channel integrations.
- **Email** — transactional emails (confirmation codes, comment-share consent requests, account confirmation).

---

## License

All Pollee content is licensed under **Creative Commons BY-NC-ND 4.0**.

---

*Pollee Inc — Real Democracy, one transaction at a time.*