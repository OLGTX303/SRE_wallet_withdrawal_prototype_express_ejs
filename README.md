# SRE-Inspired Wallet Withdrawal & Fraud Control (Express + EJS)

This project is a **high-fidelity prototype** (not a real banking system) to demonstrate:
- **Use Case:** UC-007 Withdraw Funds to Bank
- **Misuse Case:** MUC-003 Perform Fraudulent Withdrawal
- **Security Use Case (Mitigation):** UC-010 Fraud & AML Screening (plus limit check behavior)

## 1) Install & Run
```bash
npm install
npm start
```
Open: `http://localhost:3000`

## 2) Demo Controls (Scenario Switching)
This prototype uses a `scenario` query parameter to branch outcomes for demos:

- `success` (default): screening pass + within limit + bank ACK
- `insufficient`: insufficient balance (triggered automatically if amount > balance)
- `hold`: screening -> under review (hold)
- `blocked`: screening -> blocked
- `limit`: limit check -> exceeded
- `nack`: bank declines (NACK)
- `timeout`: bank timeout

Example:
- `http://localhost:3000/withdraw?scenario=success`
- `http://localhost:3000/withdraw?scenario=blocked`
- `http://localhost:3000/withdraw?scenario=timeout`

## 3) Route Map (Full)
### Core user flow (Normal + Exceptions)
- `GET /dashboard` — Wallet Dashboard
- `GET /withdraw` — Withdraw Form
- `POST /withdraw` — Save form and go to confirm
- `GET /withdraw/confirm` — Review & Confirm
- `POST /withdraw/confirm` — Pre-check balance, then proceed
- `GET /withdraw/insufficient` — Exception: insufficient balance
- `GET /withdraw/screening` — Fraud & AML Screening loading
- `GET /withdraw/screening/result` — Branch to pass/hold/blocked
- `GET /withdraw/under-review` — Hold outcome (manual review)
- `GET /withdraw/blocked` — Blocked outcome
- `GET /withdraw/limit-check` — Transaction limit check loading
- `GET /withdraw/limit-check/result` — Branch to exceeded or proceed
- `GET /withdraw/limit-exceeded` — Exception: limit exceeded
- `GET /withdraw/bank-processing` — Bank processing loading
- `GET /withdraw/bank-processing/result` — Branch to success/nack/timeout
- `GET /withdraw/bank-declined` — Exception: bank declined (NACK)
- `GET /withdraw/timeout` — Exception: timeout (no wallet debit)
- `GET /withdraw/success` — Success receipt (wallet debited here)
- `GET /security/tips` — Secure account tips

### Misuse flow (Fraud attempt + mitigation)
- `GET /misuse/fraud-withdrawal` — Misuse start page
- `GET /misuse/add-bank` — Add new bank (mock)
- `POST /misuse/add-bank` — Adds new bank and triggers blocked scenario
- `GET /misuse/security-alert` — Security alert + freeze toggle
- `POST /misuse/freeze` — Mock freeze withdrawals
- `POST /misuse/unfreeze` — Mock unfreeze

### Utilities
- `GET /reset` — Reset current withdrawal
- `GET /health` — Health check JSON

## 4) SRE-ETIQA-Inspired UI Style
- Yellow/Black primary theme, card-based layout, sticky bottom CTA
- Clear status chips: success / warning / error
- Loading states for screening, limit checks, and bank processing

## 5) Notes
- This is a prototype: no real banking, no real authentication, no DB.
- State is stored in server session (in-memory).
