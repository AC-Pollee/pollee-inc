# Constituency Device — Architecture

**Status:** Draft v0.1 — 2026-09-30
**Authority:** *Democracy Now* §2.6, §3.4, §3.7, §3.7.1, §3.14.5, §3.14.6, §3.14.7; Annexure F

Separate project from the Pollee web app. This document scopes the device
software only.

---

## 1. What the device is

A member-owned, commodity edge board (Annexure F "Recommended" tier:
NVIDIA Jetson Orin Nano Super-class, 67 TOPS, 7–25W, ~€300–400) running the
constitutional layer of the vote pipeline. It is the **sole processor** of:

1. Option → account binding (Yes / No / RTS)
2. Payment breakdown (0.30 / 0.10 / 0.10 / 0.05)
3. Canonical record assembly + signing
4. Three-way transmission (bank, user, receiver)
5. Local AI cultivation + identity watch (§3.14.5, §3.7.1)

It is **not** a cloud server. It is not the web app. It is not a phone.

## 2. Why it is separate

§3.7.1: "The identity infrastructure of a democracy is the one place where a
vendor lock-in ceases to be a commercial inconvenience and becomes a
constitutional fact." Running the binding/signing on a cloud platform would
make the platform the de-facto sovereign. The device keeps that sovereignty on
member-owned hardware, and the contract (`01-api-contract.md`) keeps it
substitutable.

## 3. Software stack (proposed)

| Layer | Choice | Rationale |
|---|---|---|
| OS | Linux (minimal, immutable root) | Auditable, no vendor lock-in |
| Runtime | Python 3 + Rust core | Python for AI; Rust for signing/protocol |
| Local LLM | Small open model (e.g. Llama 3.2 3B / Qwen) | Substitutable, local |
| Crypto | libsodium / ed25519 | Standard, audited |
| Storage | SQLite (archive) + append-only log | §3.4 immutability |
| Bank SDK | Per-institution, pluggable | Substitutable |
| Transport | HTTPS + mTLS | See contract |
| Power | 7–25W, no dedicated cooling | Annexure F |

## 4. Modules

```
constituency-device/
├── api/            # /v1 endpoints (contract surface)
├── binding/        # option→account resolution + payment breakdown
├── record/         # canonical record assembly + signing + hash
├── transmit/
│   ├── bank/       # payment instruction to bank
│   ├── user/       # receipt delivery (email/in-app)
│   └── receiver/   # credit to bound constituency account
├── cultivate/      # local AI: summarise, draft, translate, flag
├── watch/          # identity-watch: ledger silence, recovery rehearsal, custodian change
├── archive/        # append-only record store (§3.4)
└── keys/           # key custody boundary — WATCH ONLY, never holds the key
```

## 5. Data flow (single vote)

1. App sends `POST /v1/vote` with choice only.
2. `binding/` resolves option index → Yes/No/RTS account from franchise config.
3. `record/` assembles canonical record, computes `record_hash`, signs it.
4. `archive/` appends record (immutable, §3.4).
5. `transmit/bank` emits signed payment instruction (0.55 AUD to bound account).
6. `transmit/receiver` credits the bound constituency account with reference.
7. `transmit/user` delivers receipt (email/in-app) with `record_hash`.
8. App polls `GET /v1/receipt/:id` for status.

All three transmissions reference the same `record_hash`.

## 6. The key custody boundary (§3.7.1)

The device **never holds the member's key**. It holds only the **watch**:
- notices the ledger stopped reporting
- notices a recovery rehearsal is overdue
- notices a nominated custodian changed

Custody lives on the member's Dedicated Ledger Device (§2.6); the constituency
device monitors. This separation is structural and must not be blurred.

## 7. Falsification guard (§3.14.6)

Every proposition development record must keep attributions to identifiable
participants. The `cultivate/` module must output `attributions[]` with every
summary/draft. A proposition whose reasoning is not attributable fails the
falsification test — "the office would have become a rubber stamp on an
automated agenda."

## 8. Resilience

- Local power: device survives a grid blip (small UPS or battery headroom).
- Local storage: archive is on-device; a silent device does not lose history.
- Recovery rehearsal: `watch/` enforces a periodic rehearsal; overdue → alarm.
- Lost device = lost franchise (§3.7). The protocol includes recovery, not just
  prevention. This is an unresolved governance problem (§3.14.7), not a
  hardware one.

## 9. Environmental (brief, cost slide)

7–25W draw, no dedicated cooling, footprint visible at the point of use. The
requirement is that the footprint stays **auditable by the member**, not
reported by a vendor. E-waste is dispersed; aggregate audit is harder, per the
brief's honest caveat.

## 10. Out of scope for this project

- The web app (this Pollee project remains the client).
- The member's Dedicated Ledger Device (separate hardware spec, §2.6).
- Governance of the cultivation stage (§3.14.7) — a governance problem, not a
  software one.