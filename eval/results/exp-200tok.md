# Retrieval evaluation — `exp-200tok`

Run 2026-11-12 17:01 · model `thenlper/gte-base` · top-k 5 · 14 in-scope + 3 out-of-scope questions

## Summary (in-scope)

| Metric | @1 | @3 | @5 |
|---|---|---|---|
| Document hit rate | 100% | 100% | 100% |
| Page hit rate | 79% | 100% | 100% |

MRR (document): **1.000**

## Per question

| ID | Question | Expected | Top-1 score | Doc rank | Page rank |
|---|---|---|---|---|---|
| q01 | Is a foreign employee who works in Malaysia for less than 60 days taxed on their employment income? | pr-2-2026-tax-treatment-of-f… p.[10, 11] | 0.923 | 1 | 1 |
| q02 | What tax rate applies to a foreign national who is not tax resident in Malaysia? | pr-2-2026-tax-treatment-of-f… p.[9, 10] | 0.925 | 1 | 1 |
| q03 | What is the maximum value of each asset that qualifies for the small value asset special allowance? | PR-No.4_2026-Special-Allowan… p.[6, 7] | 0.929 | 1 | 1 |
| q04 | Can I claim the special allowance for small value assets bought on hire purchase? | PR-No.4_2026-Special-Allowan… p.[13] | 0.934 | 1 | 1 |
| q05 | What does PR No. 4/2026 say about hire purchase? | PR-No.4_2026-Special-Allowan… p.[13] | 0.851 | 1 | 1 |
| q06 | How much tax relief can I claim for a child under 18? | 20261104-PR-5_Taxation-Of-A-… p.[58, 59] | 0.876 | 1 | 1 |
| q07 | What purchases qualify for lifestyle relief? | 20261104-PR-5_Taxation-Of-A-… p.[36, 37] | 0.885 | 1 | 1 |
| q08 | What conditions must be met to claim tax relief for breastfeeding equipment? | 20261104-PR-5_Taxation-Of-A-… p.[38, 39] | 0.917 | 1 | 1 |
| q09 | How long does a buyer have to reject an e-invoice after it has been validated? | IRBM-e-Invoice-Guideline.pdf… p.[25, 26] | 0.924 | 1 | 1 |
| q10 | When must businesses with annual turnover between RM5 million and RM25 million start issuing e-invoices? | IRBM-e-Invoice-Guideline.pdf… p.[12, 13] | 0.926 | 1 | 2 |
| q11 | How much service tax is charged on a credit card? | Guide On Financial Service  … p.[8, 9] | 0.867 | 1 | 2 |
| q12 | Is service tax charged on financial services imported from a foreign provider? | Guide On Financial Service  … p.[12, 13] | 0.911 | 1 | 1 |
| q13 | Which private education providers are subject to service tax from 1 July 2025? | 3. GUIDE ON PRIVATE EDUCATIO… p.[14] | 0.926 | 1 | 3 |
| q14 | Do Malaysian students pay service tax on private university fees? | 3. GUIDE ON PRIVATE EDUCATIO… p.[11, 12] | 0.938 | 1 | 1 |
| o01 | What is the GST rate in Singapore? | *(refuse)* | 0.846 | — | — |
| o02 | How do I calculate real property gains tax when I sell my house? | *(refuse)* | 0.809 | — | — |
| o03 | What is the best recipe for nasi lemak? | *(refuse)* | 0.765 | — | — |

## Similarity threshold analysis (guard 1)

In-scope top-1 scores: min **0.851**, max 0.938. Out-of-scope top-1 scores: max **0.846**.

| Threshold | In-scope passed (want 100%) | Out-of-scope blocked (want 100%) |
|---|---|---|
| 0.75 | 100% | 0% |
| 0.78 | 100% | 33% |
| 0.80 | 100% | 33% |
| 0.82 | 100% | 67% |
| 0.84 | 100% | 67% |
| 0.86 | 93% | 100% |
