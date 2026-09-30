# Transmission Protocols — Bank, User, Receiver

**Status:** Draft v0.1 — 2026-09-30
**Authority:** *Democracy Now* §3.14.5, §3.7.1

The constituency device emits three transmissions per vote, all referencing the
same `record_hash`. None of the three carries the raw ballot to a party that
should not see one.

---

## 1. To the bank — payment instruction

**What:** A signed instruction to move 0.55 AUD to the bound constituency
account. The bank sees a **transaction**, not a ballot.

**Payload (device → bank):**
```json
{
  "instruction_id": "rec_7b1e...",
  "record_hash": "sha256:9f2c...",
  "amount": 0.55,
  "currency": "AUD",
  "destination": { "bsb": "062000", "number": "12345678" },
  "reference": "POLLEE rec_7b1e...",
  "device_signature": "ed25519:...",
  "submitted_at": "..."
}
```

**Requirements:**
- Idempotent: a retransmit after a dropped connection must not create a second
  charge. `instruction_id` (= `record_id`) is the dedup key.
- The bank receives **no option label, no voter identity**. Only the amount,
  the bound destination, and the record reference.
- Protocol adapter is pluggable (substitutable, §3.14.5): per-institution SDK
  behind a common interface.

## 2. To the user — receipt

**What:** The member's audit copy. Must match the archive on `record_hash`.

**Channels:**
- In-app: the web app fetches `GET /v1/receipt/:record_id` and renders it.
- Email: device sends via the Pollee web app's `SendEmail` integration (for
  registered members) — the app exposes a thin relay endpoint the device calls.
  Non-registered recipients are subject to the platform's email rules (paid
  plan + custom domain + content screening).

**Receipt contents:** see `03-record-format.md` §1, minus `device.signature`
internals — the member sees the hash, the binding, the destination, and the
transmission statuses, enough to verify independently.

**Requirement:** the receipt is the member's evidence that the vote landed
where they intended. It must be reproducible from the archive, not a separate
summary.

## 3. To the receiver — constituency account credit

**What:** The bound account (Yes / No / RTS) receives the credited amount and a
reference to the record. The "receiver" is the franchise account the vote
binds to — already modelled on the Vote entity (`account_binding`,
`destination_account_bsb`, `destination_account_number`).

**Payload (device → receiver institution):**
```json
{
  "credit_id": "rec_7b1e...",
  "record_hash": "sha256:9f2c...",
  "amount": 0.55,
  "to_account": { "bsb": "062000", "number": "12345678" },
  "reference": "POLLEE rec_7b1e...",
  "device_signature": "ed25519:..."
}
```

**Requirements:**
- The receiver never sees the raw ballot — only the bound credit.
- Binding is resolved on the device from the franchise's stored accounts
  (yes/no/rts). The app never sends the destination; it sends only the choice.
- One credit per record. A failed credit retries with the same `credit_id`.

## 4. Ordering and atomicity

The device signs the record **before** any transmission. Transmissions are
async but ordered: bank → receiver → user. A failure on any leg does not roll
back the archive (§3.4 immutability); it sets `transmissions.<leg>.status` to
`failed` and the device retries. The `record_hash` is the integrity anchor
across all three legs — a mismatch is a tamper signal.

## 5. What no transmission carries

- The member's private key (§3.7.1) — never leaves the Dedicated Ledger Device.
- A raw ballot to the bank or receiver — they see transactions/credits.
- A summary that replaces the archive (§3.14.5) — the record beneath is always
  queryable.