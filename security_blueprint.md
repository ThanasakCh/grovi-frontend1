# 🚀 Technical Implementation Plan (Sprint 1)

This is the ultimate, rigorously hardened Implementation Plan. It integrates Zero-Downtime Migration principles, explicit Cryptographic lookup rules, and exhaustive Security Regression testing before deployment.

---

## 🟣 Step 0: Pre-Implementation Gate (Security Freeze)
- [ ] **Database Snapshot**: Run `pg_dump` on production.
- [ ] **Git Tag & Branching**: 
  - Tag stable state: `git tag before-auth-migration`.
  - **Create a new branch**: `git checkout -b feature/auth-hardening-sprint1` to isolate all changes and prevent accidental breakage on the main branch.

---

## 📂 1. Folder Structure Updates (Core Modularization)
```text
backend/
├── core/
│   ├── auth.py          # Main dependency entrypoints (verify_token)
│   ├── tokens.py        # SHA-256 Hash lookup & Token logic
│   ├── permissions.py   # RBAC RequireRole logic
│   ├── csrf.py          # Double Submit Cookie logic
│   ├── audit.py         # Hash Chain & Security Logging logic
```

---

## 🗄️ 2. Database Schema & Hardening Constraints

### `refresh_tokens`
- **Lookup Cryptography**: Use **SHA-256** (`hash(raw_token)` -> hex digest) for `token_hash`. 
- **Token Family Active Constraint**: Business logic must enforce that exactly `1` active token (`revoked=false`) exists per `family_id` at any given time.
- **Transaction Boundary**: The `/refresh` flow MUST be wrapped in a strict transaction (`BEGIN` -> `SELECT FOR UPDATE` -> check -> revoke -> create -> `COMMIT`).

### `security_logs`
- **Hash Input Integrity**: The hash chain input must strictly be `previous_hash + timestamp + event_type + user_id + request_id` to prevent log collisions.

### Zero-Downtime Migration Strategy (Expand → Migrate → Contract)
- **Phase A (Expand)**: Add the new Auth tables/columns without dropping old ones.
- **Phase B (Migrate)**: Implement Dual Auth temporarily, then switch traffic.
- **Phase C (Contract)**: After testing, run contract migration to drop legacy columns.

---

## 🌐 3. Security Policies & Accepted Risks

### Accepted Risk: Stateless Access Tokens
> [!WARNING]
> **Accepted Risk**: Since `access_token` validation is purely stateless (to conserve DB performance), a token will remain valid until its natural 15-minute expiration, even after a successful logout. 

---

## 🧪 4. Final Security Regression Testing Gate

Before migrating to Phase C (Contract), these tests must pass:
1. **Refresh Race Condition Test**: Fire 10 parallel `/refresh` requests. **Expected**: Exactly 1 succeeds, 9 fail. Strict Transaction Boundaries hold.
2. **Replay Attack Test**: Attempt to use an old, rotated refresh token. **Expected**: 401, entire token family killed, `CRITICAL` log.
3. **Old JWT Behavior**: Attempt to use an old `access_token` immediately after logout. **Expected**: SUCCEEDS until 15m expiration.
4. **Expired Refresh Token Test**: Send an expired refresh token. **Expected**: 401.
5. **CSRF Missing Test**: Omit `X-CSRF-Token` header. **Expected**: 403.

---

## Lead Engineer Sign-Off
> [!IMPORTANT]
> **STATUS: AUTH HARDENING SPRINT 1 APPROVED**
> **GO: Step 1 Core Modularization**
