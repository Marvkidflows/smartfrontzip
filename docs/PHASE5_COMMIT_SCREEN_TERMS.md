# Phase 5: investment terms on the commit screen

FINDING (confirmed by reading the code): `RankPlanTermsSection.jsx` was used ONLY on the rank page (`InvestorRank.jsx`). Neither screen where an
investor commits money showed any terms: `InvestorInvestments.jsx` (inline "Invest Now" form, Confirm calls `storeInvestment`) and
`InvestorSectors.jsx` (the same form). The backend endpoint made for this moment, `GET /investor-investment/rank/plan-terms/{plan}`
("BEFORE committing to a plan"), existed and was tested, but nothing called it.

IMPLEMENTED (frontend only; NOT EXECUTED until you run `npm install && npm test && npm run build`):
* `src/components/PlanCommitTerms.jsx` loads the plan's terms from that endpoint and shows, inside the open Invest form, before Confirm: the contractual return and duration, whether a rank incentive applies (only if SSI approved and activated it; otherwise "none applies"), and the two server notices (rank does not change the return; the terms are recorded with the investment).
* Added to both commit forms (one import and one line each). A failed load shows nothing and never blocks investing.
* `src/components/PlanCommitTerms.test.jsx`: 4 tests (terms shown, incentive only when returned, silent on error, reload on plan change).

NOT CHANGED: backend, return calculations, the amount rules, the Confirm action. No incentive is ever displayed unless the server returns it
(master switch on + ACTIVE term + the investor's rank + the plan + inside its dates; none by default).

ALREADY IN PLACE (backend, tested earlier): the plan return, expected profit and dates are recorded on the investment when it is created and kept as
recorded (RankBenefitsPhase2Test: "investment records keep the terms recorded at creation").

DECISION NEEDED (not implemented on purpose): an explicit "I have read these terms" tick box and a stored acknowledgement version/timestamp.
The directive says "where legally required"; that is a legal/Management call, and adding a mandatory tick box changes the investing flow for every investor.
If Management wants it, it needs: a terms version on the plan terms, a column on the investment (or a small acknowledgement table), a required checkbox,
and a backend rule that refuses an investment without it.
