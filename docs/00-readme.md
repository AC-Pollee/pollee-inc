# Pollee — Constituency Device Build Documents

**Status:** Draft v0.1 — 2026-09-30
**Authority:** *AI in Democracy Now: Supporting Brief*; *Democracy Now* (Chambers) §2.6, §3.4, §3.7, §3.7.1, §3.14.5, §3.14.6, §3.14.7; Annexure F.

This folder is the build set for a **separate project**: the constituency
device — a member-owned edge board that is the sole processor of vote binding,
record signing, and three-way transmission (bank, user, receiver). The Pollee
web app (this repository) is the thin client; the device is the constitutional
layer.

## Documents

| # | Document | Purpose |
|---|---|---|
| 01 | `01-api-contract.md` | The binding contract between web app and device |
| 02 | `02-architecture.md` | Device software architecture and module layout |
| 03 | `03-record-format.md` | Canonical poll record schema + immutability rules |
| 04 | `04-transmission-protocols.md` | Bank / user / receiver transmission specs |

## Reading order

1. Start with `01-api-contract.md` — it defines the surface between the two
   projects and is the anti-lock-in guarantee (§3.14.5 substitutability).
2. Then `02-architecture.md` for what lives on the device.
3. Then `03` and `04` for the data and protocol details.

## What this is not

- Not a replacement for the web app. The web app stays the client.
- Not the member's Dedicated Ledger Device (§2.6) — that is separate hardware.
- Not a solution to the cultivation-stage capture risk (§3.14.7) — that is a
  governance problem, not a software one.

## Next steps

1. Stand up the device repository against `02-architecture.md`.
2. Implement the `/v1` surface from `01-api-contract.md`.
3. Slim the web app's vote flow to call the device (remove local binding logic
   from `TransactionForm.jsx`).
4. Define discovery: how the app finds the franchise's device base URL.