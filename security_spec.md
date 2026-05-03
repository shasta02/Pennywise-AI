# Security Specification for PennyWise

## Data Invariants
1. A transaction MUST belong to a valid user (`userId` matches the current user's UID).
2. A budget MUST belong to a valid user.
3. Users can only read and write their own data.
4. `amount` and `date` are immutable once created for Plaid transactions, but `adjustedAmount` and `category` can be updated.
5. In this PoC, we let users write their own profiles.

## The Dirty Dozen Payloads

### 1. Identity Spoofing (Transaction)
```json
{
  "userId": "attacker_id",
  "amount": 100,
  "name": "Stolen",
  "date": "2024-05-01"
}
```
*Expected Result:* `PERMISSION_DENIED` (UID mismatch)

### 2. State Shortcutting (Immutable Field Update)
```json
// Attempting to change the original amount of a transaction
{
  "amount": 0.01
}
```
*Expected Result:* `PERMISSION_DENIED` (Original amount should be immutable for imported txs)

### 3. Resource Poisoning (Massive String)
```json
{
  "name": "A".repeat(2000)
}
```
*Expected Result:* `PERMISSION_DENIED` (Size check failure)

### 4. Orphaned Record (Invalid User ID)
```json
{
  "userId": "non_existent_user"
}
```
*Expected Result:* `PERMISSION_DENIED` (Exists check failure)

### 5. PII Breach (Reading other user)
*Expected Result:* `PERMISSION_DENIED` (Owner check failure)

... (and others)

## Test Plan
I will implement `firestore.rules.test.ts` to verify these.
