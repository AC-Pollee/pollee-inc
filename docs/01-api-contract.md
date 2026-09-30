# Constituency Device — API Contract

**Status:** Draft v0.1 — 2026-09-30
**Between:** Pollee web app (client) ↔ Constituency device (processor)
**Authority:** *Democracy Now* §2.6, §3.4, §3.7.1, §3.14.5, §3.14.6

This is the binding contract between the two projects. The web app is a thin
client; the constituency device is the sole processor of binding, signing and
transmission. The contract is intentionally narrow: the app sends a **choice**,
the device returns a **receipt**. Everything constitutional happens on the
device.

---

## 1. Transport

| | |
|---|---|
| **Protocol** | HTTPS / TLS 1.3 |
| **Auth** | mTLS — device cert per constituency; app presents member session token |
| **Encoding** | JSON (UTF-8) |
| **Idempotency** | Every request carries `request_id` (UUIDv7); device dedupes for 24h |
| **Base URL** | `https://<constituency-device-local>/v1` — resolved per franchise, not a global host |

The device is **local to the franchise**, not a cloud endpoint. Discovery is
out of scope for this contract (see `02-architecture.md`), but the app must
treat the base URL as franchise-specific configuration, never hardcode it.

---

## 2. Endpoints

### 2.1 `POST /v1/vote` — cast a vote

The only write path. The app sends the member's choice; the device does
everything else and returns a receipt.

**Request**
```json
{
  "request_id": "0192a7f3-...-uuidv7",
  "poll_id": "poll_8f3c...",
  "option_id": "opt_2",
  "voter": {
    "voter_id": "V-...",
    "voter_name": "Jane Doe",
    "session_token": "eyJ..."
  },
  "delegation": {
    "status": "direct",
    "delegated_votes_count": 1,
    "delegation_ids": []
  },
  "device_id": "dev-2001-...",
  "submitted_at": "2026-09-30T13:04:22Z"
}
```

The app sends **no account info, no amount, no binding**. The device resolves
the binding from the franchise's accounts, computes the payment breakdown, and
signs the record.

**Response — 202 Accepted** (processing started; transmissions async)
```json
{
  "request_id": "0192a7f3-...",
  "status": "accepted",
  "record_hash": "sha256:9f2c...",
  "record_id": "rec_7b1e...",
  "receipt_url": "/v1/receipt/rec_7b1e..."
}
```

**Response — 409 Conflict** (duplicate request_id)
```json
{ "request_id": "...", "status": "duplicate", "record_id": "rec_7b1e..." }
```

**Response — 422** (choice invalid, poll closed, voter ineligible)
```json
{ "error": "poll_closed", "detail": "Poll 8f3c closed 2026-09-29T23:59Z" }
```

### 2.2 `GET /v1/receipt/:record_id` — fetch receipt

Returns the member's audit copy. Must match the archive, byte-for-byte on
`record_hash`.

```json
{
  "record_id": "rec_7b1e...",
  "record_hash": "sha256:9f2c...",
  "poll_id": "poll_8f3c...",
  "option_id": "opt_2",
  "option_label": "No",
  "account_binding": "no",
  "destination_account_bsb": "062000",
  "destination_account_number": "12345678",
  "transaction_amount": 0.55,
  "payment_breakdown": { "infomarian": 0.30, "pollee_incorporated": 0.10, "local_franchise": 0.10, "gst": 0.05 },
  "transmissions": {
    "bank": { "status": "sent", "reference": "TXN-..." },
    "user":  { "status": "delivered", "channel": "email" },
    "receiver": { "status": "credited", "reference": "CR-..." }
  },
  "signed_at": "2026-09-30T13:04:23Z",
  "device_signature": "ed25519:..."
}
```

### 2.3 `GET /v1/health` — device liveness

The "watch" duty (§3.7.1) depends on this. The app polls it; a silent device
raises the lost-ledger alarm.

```json
{
  "device_id": "dev-2001-...",
  "franchise_id": "fr_...",
  "status": "ok",
  "uptime_s": 1209600,
  "last_recovery_rehearsal": "2026-09-15T00:00Z",
  "archive_tail": "rec_7b1e..."
}
```

### 2.4 `POST /v1/cultivate` — proposition assistance (AI, §3.14.5)

Local AI on the device. Input: a discussion transcript + instruction. Output:
a summary, a draft revision, a translation, or a flag. **Never** a proposition
drafted as if by the moderator (§3.14.6 falsification test).

```json
{ "request_id": "...", "discussion_id": "...", "task": "summarise", "transcript": "..." }
```
```json
{ "summary": "...", "attributions": [ { "participant": "P-12", "claim": "..." } ] }
```

---

## 3. Error model

| Code | Meaning | App action |
|---|---|---|
| `400` | Malformed request | Fail fast, show error |
| `409` | Duplicate request_id | Treat as success, fetch receipt |
| `422` | Choice invalid (closed/ineligible) | Show user-facing reason |
| `451` | Device in recovery / key-watch tripped | Halt writes, alert |
| `5xx` | Device fault | Queue locally on mobile, retry with backoff |

---

## 4. Versioning

- URL-versioned (`/v1/`). Breaking changes bump the prefix.
- The contract is **substitutable** (§3.14.5): a competing device must implement
  the same `/v1` surface. The contract is the anti-lock-in guarantee.
- Non-breaking additions are allowed; the app must ignore unknown response keys.

---

## 5. Security boundaries

- The app **never** sees the member's key material (§3.7.1). Custody and
  monitoring are structurally separate.
- The app **never** sends the raw ballot to the bank. The device emits a
  payment instruction; the bank sees a transaction, not a ballot.
- The `record_hash` is the integrity anchor: all three transmissions (bank,
  user, receiver) must reference the same hash.