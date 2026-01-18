# ?? sre-etiqa Wallet Reinvestment & Fraud Control (Express + EJS)

This project is a **high-fidelity prototype** (not a real banking system) to demonstrate:
- ? **Use Case:** UC-008 Reinvest Funds
- ?? **Misuse Case:** MUC-003 Perform Fraudulent Transaction Attempt
- ??? **Security Use Case (Mitigation):** UC-010 Fraud & AML Screening
- ? **Eligibility Check:** UC-009 (mocked)

## ?? 1) Install & Run
- ?? Install dependencies:
  ```bash
  npm install
  ```
- ?? Start the server:
  ```bash
  npm start
  ```
- ?? Open: `http://localhost:3000`

## ??? 2) Demo Controls (Scenario Switching)
This prototype uses a `scenario` query parameter to branch outcomes for demos:

- ? `success` (default): eligibility pass + screening pass + success
- ?? `insufficient`: insufficient balance (auto if amount > balance)
- ? `noteligible`: eligibility check fails
- ?? `hold`: screening -> blocked (treated as blocked for UC-008)
- ? `blocked`: screening -> blocked

Examples:
- `http://localhost:3000/reinvest?scenario=success`
- `http://localhost:3000/reinvest?scenario=blocked`
- `http://localhost:3000/reinvest?scenario=noteligible`

## ??? 3) Route Map (Full)
### ? Core user flow (Normal + Exceptions)
- ?? `GET /dashboard` - Wallet Dashboard
- ?? `GET /reinvest` - Reinvest Form
- ?? `POST /reinvest` - Save form and go to confirm
- ? `GET /reinvest/confirm` - Review & Confirm
- ? `POST /reinvest/confirm` - Pre-check balance, then proceed
- ?? `GET /reinvest/insufficient` - Exception: insufficient balance
- ?? `GET /reinvest/eligibility` - Eligibility check loading
- ?? `GET /reinvest/eligibility/result` - Branch to eligible or not eligible
- ? `GET /reinvest/not-eligible` - Exception: not eligible
- ??? `GET /reinvest/screening` - Fraud & AML Screening loading
- ??? `GET /reinvest/screening/result` - Branch to pass or blocked
- ? `GET /reinvest/blocked` - Blocked outcome
- ?? `GET /reinvest/success` - Success receipt (wallet debited here)
- ?? `GET /security/tips` - Secure account tips
- ?? `GET /admin/audit` - UC-014 audit evidence

### ?? Misuse flow (Fraud attempt + mitigation)
- ?? `GET /misuse/fraud-withdrawal` - Misuse start page
- ? `GET /misuse/add-bank` - Add new bank (mock)
- ? `POST /misuse/add-bank` - Adds new bank and triggers blocked scenario
- ?? `GET /misuse/security-alert` - Security alert + freeze toggle
- ?? `POST /misuse/freeze` - Mock freeze withdrawals
- ?? `POST /misuse/unfreeze` - Mock unfreeze

### ?? Utilities
- ?? `GET /reset` - Reset current reinvest session
- ?? `GET /health` - Health check JSON

## ?? 4) sre-etiqa UI Style
- ?? Yellow/Black primary theme, card-based layout, sticky bottom CTA
- ? Clear status chips: success / warning / error
- ? Loading states for eligibility and screening

## ?? 5) Notes
- ?? Prototype only: no real banking, no real authentication, no DB.
- ?? State is stored in server session (in-memory).
