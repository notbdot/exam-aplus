# Interface refinement — 4 November 2026

This pass applies the official [Impeccable](https://impeccable.style/) written `distill`, `clarify` and `polish` guidance. Source: [pbakaus/impeccable](https://github.com/pbakaus/impeccable/tree/5af4319c4e7a7ee3e5e2b9fe899bcfb21c6190cb), unified skill version 4.8.0. It was a manual source/browser review; no automated Impeccable detector, score or overlay is claimed.

## What changed

- Fixed the Today card on phones: inherited lesson-number grid styles had squeezed the product title, next-action text and button into columns. The objective card now stacks its content, has no forced desktop-sized height and uses a contrasting action button.
- Replaced generic motivational headlines with Today, Objectives, Study brief and Sample questions. The current exam code and objective number remain visible.
- Shortened repeated instructions. Moved the study-pack explanation into an accessible native disclosure; content limits, official blueprint links, original-sample scope and separate coverage/practice records remain available.
- Kept core selection and its explicit Switch core action together on phones. Objective rows now put their number alongside the title rather than on a separate decorative line.
- Simplified sign-in/setup presentation and reduced the phone identity panel height. Password-manager autocomplete, validation and the single-account model are unchanged.
- Clearing an empty objective search now returns keyboard focus to its search field.

The cobalt exam identity, two-core selections, notes, coverage, review scheduling, original question/resource packs and all authentication/persistence code are preserved.

## Verification

All 18 Node tests pass on the available local Node 18 runtime. The supported Node 22, Compose configuration, Docker build and fresh-account/restart/backup-restore checks also run in the existing [GitHub Actions workflow](https://github.com/notbdot/exam-aplus/actions/workflows/ci.yml). Consult the run attached to the commit for its result; a local test pass is not a CI claim.

Actual Chromium browser checks used disposable accounts and synthetic notes:

- Desktop 1280×1000 and phone 390×844 light/dark renders; 320×740 Study and sign-in fit without page-wide horizontal scrolling. Core selector/button stayed inside the viewport.
- Core 1 note/coverage remained separate from a fresh Core 2; both notes survived core switches. Current-core context remained accurate.
- A missed/unsure sample result saved and appeared in Review reminders. Resolve/Reopen worked; returning to a question started with no selected answer.
- Search no-results recovery restored the list and focused the search field.
- Study Notes anchor remained below the fixed header. Sign-in retained its required password and current-password autocomplete.

Updated README images are unmodified frames decoded from recordings of the running app with synthetic data. No account password, enrollment link, private materials or real learner notes are included.

## Limits

This is a focused interface pass, not a new curriculum or readiness assessment. No production deployment is included. Physical phones, Safari/Firefox and assistive-technology behavior have not been certified. Existing server/store tests cover save errors, revision conflicts, restart persistence and review semantics; these mechanisms were not changed by this pass.
