# Canonical Poll Record — Format Specification

**Status:** Draft v0.1 — 2026-09-30
**Authority:** *Democracy Now* §3.4 (archive immutability)

The canonical record is the single source of truth produced on the
constituency device. All three transmissions (bank, user, receiver) reference
the same `record_hash`. The record is append-only; it cannot be edited after
the fact (§3.4).

---

## 1. Schema

```json
{
  "record_id": "rec_7b1e...",
  "record_hash": "sha256:9f2c...",
  "previous_hash": "sha256:3a1d...",
  "poll_id": "poll_8f3c...",
  "option": {
    "id": "opt_2",
    "label": "No",
    "index": 1
  },
  "account_binding": "no",
  "destination_account": {
    "bsb": "062000",
    "number": "12345678"
  },
  "voter": {
    "voter_id": "V-...",
    "voter_name": "Jane Doe"
  },
  "delegation": {
    "status": "direct",
    "delegated_votes_count": 1,
    "delegation_ids": []
  },
  "transaction": {
    "amount": 0.55,
    "currency": "AUD",
    "breakdown": {
      "infomarian": 0.30,
      "pollee_incorporated": 0.10,
      "local_franchise": 0.10,
      "gst": 0.05
    },
    "reference": "TXN-..."
  },
  "transmissions": {
    "bank": { "status": "sent", "reference": "TXN-...", "at": "..." },
    "user": { "status": "delivered", "channel": "email", "at": "..." },
    "receiver": { "status": "credited", "reference": "CR-...", "at": "..." }
  },
  "device": {
    "device_id": "dev-2001-...",
    "franchise_id": "fr_...",
    "signature": "ed25519:..."
  },
  "signed_at": "2026-09-30T13:04:23Z",
  "archive_seq": 48211
}
```

## 2. Field rules

- `record_hash` = SHA-256 over the canonical JSON (fields sorted, no
  `record_hash`, no `transmissions`). Computed before transmission.
- `previous_hash` chains to the prior record (append-only log, §3.4).
- `account_binding` ∈ `{yes, no, rts}` — resolved by position (index 0→yes,
  1→no, 2→rts), never sent by the app.
- `voter.voter_id` is **not** the member's key. The key never leaves the
  Dedicated Ledger Device (§3.7.1).
- `transmissions` is filled in as each leg completes; it is **not** part of the
  hashed canonical body.
- `archive_seq` is the monotonic sequence in the append-only archive.

## 3. Immutability

Once `record_hash` is computed and the record appended, the body is frozen.
Corrections are new records that reference the prior one — never edits. This
is the §3.4 guarantee that "a summary that becomes the only surviving account
of a debate is a censorship with better manners" cannot occur: the archive
beneath any summary is always queryable.

## 4. Verification

Any party can recompute `record_hash` from the canonical body and compare.
A mismatch between the bank's copy, the user's receipt, and the receiver's
credit reference is a tamper signal.