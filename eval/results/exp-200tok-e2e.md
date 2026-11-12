# End-to-end evaluation — `exp-200tok`

Run 2026-11-12 17:04 through `/api/ask`

| Metric | Result |
|---|---|
| In-scope answered | 14/14 (100%) |
| In-scope answered **and** cited the expected document | 14/14 (100%) |
| Out-of-scope correctly refused | 3/3 |
| Errors (LLM unavailable etc.) | 0 |
| Median latency | 4.1s |

| ID | Status | Reason | Cited expected doc? | Model | Seconds |
|---|---|---|---|---|---|
| q01 | answered |  | ✅ | gemini-3.6-flash | 8.1 |
| q02 | answered |  | ✅ | gemini-3.6-flash | 8.7 |
| q03 | answered |  | ✅ | gemini-3.6-flash | 8.7 |
| q04 | answered |  | ✅ | gemini-3.6-flash | 10.3 |
| q05 | answered |  | ✅ | gemini-3.6-flash | 4.1 |
| q06 | answered |  | ✅ | gemini-3.5-flash-lite | 42.2 |
| q07 | answered |  | ✅ | gemini-3.5-flash-lite | 25.3 |
| q08 | answered |  | ✅ | gemini-3.5-flash-lite | 2.4 |
| q09 | answered |  | ✅ | gemini-3.5-flash-lite | 1.6 |
| q10 | answered |  | ✅ | gemini-3.5-flash-lite | 3.8 |
| q11 | answered |  | ✅ | gemini-3.5-flash-lite | 2.3 |
| q12 | answered |  | ✅ | gemini-3.5-flash-lite | 2.1 |
| q13 | answered |  | ✅ | gemini-3.5-flash-lite | 4.2 |
| q14 | answered |  | ✅ | gemini-3.5-flash-lite | 4.4 |
| o01 | not_found | llm_declined | ✅ refused | gemini-3.5-flash-lite | 1.9 |
| o02 | not_found | llm_declined | ✅ refused | gemini-3.5-flash-lite | 1.7 |
| o03 | not_found | below_threshold | ✅ refused | - | 0.5 |

## Answers

**q01. Is a foreign employee who works in Malaysia for less than 60 days taxed on their employment income?**  
*Expected:* Exempt if employment period in Malaysia does not exceed 60 days (para 21, Schedule 6 ITA).  
*Got (answered):* No, employment income derived by a non-resident individual from exercising employment in Malaysia is generally exempt from tax pursuant to paragraph 21 of Schedule 6 of the ITA if the employment period or periods together do not exceed 60 days in a basis year for a year of assessment [1][3]. However, the tax exemption will not apply if the employment period in Malaysia amounts to more than 60 days in a basis year, or if a continuous period exceeding 60 days overlaps two successive basis periods [5]. For this purpose, the 60-day period refers to the period of employment in Malaysia rather than physical presence [2].

**q02. What tax rate applies to a foreign national who is not tax resident in Malaysia?**  
*Expected:* Section 4.5: residents taxed at scale rates with reliefs; non-residents at a flat rate without reliefs.  
*Got (answered):* Non-resident individuals are subject to tax at a flat rate of 30% on every ringgit of the chargeable income, as specified in paragraph 1A, Part 1 of Schedule 1 to the ITA [1]. Special tax rates for an individual under certain incentives may also apply as specified in Part XIV and XVIII of Schedule 1 to the ITA [1].

**q03. What is the maximum value of each asset that qualifies for the small value asset special allowance?**  
*Expected:* Each asset must not exceed RM2,000.  
*Got (answered):* Based on the provided excerpts, the maximum value of each small value asset includes: - For YA 2006 to YA 2008, a value not exceeding RM1,000 [3]. - In Step 4 of excerpt [5], an asset exceeding RM2,000 does not qualify for the small value asset special allowance and must claim normal capital allowance instead [5]. Note: The complete table of maximum asset values for other years of assessment (such as YA 2009–YA 2019 and effective from YA 2020) is cut off in the provided text and not fully covered [1][3].

**q04. Can I claim the special allowance for small value assets bought on hire purchase?**  
*Expected:* No — section 13: special allowances do not apply to assets acquired on hire purchase; normal capital allowance instead.  
*Got (answered):* No, the special allowances under paragraph 19A of Schedule 3 of the ITA are not applicable to small value assets acquired on hire purchase [1]. However, a person can make a normal capital allowance claim under paragraphs 10 and 15 of Schedule 3 of the ITA for such small value assets [1].

**q05. What does PR No. 4/2026 say about hire purchase?**  
*Expected:* Same fact as q04, but asked by ruling number — tests identifier matching (known weakness of dense retrieval).  
*Got (answered):* According to PR No. 4/2026, special allowances under paragraph 19A of Schedule 3 of the ITA are not applicable to small value assets acquired on hire purchase [1]. Instead, a person can make a normal capital allowance claim under paragraphs 10 and 15 of Schedule 3 of the ITA for such small value assets [1].

**q06. How much tax relief can I claim for a child under 18?**  
*Expected:* RM2,000 per child under 18 (section 6.20).  
*Got (answered):* You can claim a deduction of RM2,000 for an unmarried child who at any time in the basis year is under the age of 18 years [3][5].

**q07. What purchases qualify for lifestyle relief?**  
*Expected:* Section 6.11: books/journals/magazines/newspapers, personal computer/smartphone/tablet, internet subscription, skills courses.  
*Got (answered):* Under paragraph 46(1)(p) of the ITA, lifestyle relief qualifies for expenses incurred by an individual for the use of himself, his spouse, or children for: (a) the purchase of books, journals, magazines, newspapers, and other similar publications (including school textbooks, e-books, periodicals, and comics, whether local or overseas, but excluding banned reading materials) for enhancing knowledge [4]; (b) the purchase of a personal computer, smartphone, or tablet (not used for business purposes) [4]; (c) the payment of monthly internet subscription bills registered under the individual's name or the use of their spouse or child [2]; and (d) effective from YA 2024, self-enrichment course fees (limited to courses attended by the individual only, encouraging skills unrelated to their job such as hobbies, religion, or languages) [2]. Expenses for gym memberships and tennis rackets are not eligible under this lifestyle relief provision [5].

**q08. What conditions must be met to claim tax relief for breastfeeding equipment?**  
*Expected:* Section 6.12.3: breastfeeding mother, child up to 2 years, equipment for own use, receipts.  
*Got (answered):* To claim a tax deduction for the purchase of breastfeeding equipment, an individual must meet the following conditions: (a) be a breastfeeding mother [1]; (b) breastfeed her child aged up to 2 years [1]; (c) expend on the purchase of breastfeeding equipment for her own use [1]; and (d) make a claim evidenced by receipts issued in respect of the purchase [1]. Additionally, for the case of a combined assessment, the deduction is allowed where the assessment is made in the name of the wife [2]. The deduction is allowed once in every two YAs [1][3].

**q09. How long does a buyer have to reject an e-invoice after it has been validated?**  
*Expected:* Within 72 hours from validation, via MyInvois Portal.  
*Got (answered):* A buyer has 72 hours from the time of validation to request a rejection of an e-Invoice [1][4].

**q10. When must businesses with annual turnover between RM5 million and RM25 million start issuing e-invoices?**  
*Expected:* 1 July 2025.  
*Got (answered):* Taxpayers with an annual turnover or revenue of more than RM5 million and up to RM25 million must start issuing e-invoices on 1 July 2025 [2].

**q11. How much service tax is charged on a credit card?**  
*Expected:* RM25 per card on activation and every 12 months thereafter.  
*Got (answered):* The rate of service tax for the provision of credit line facility or shariah compliance financing services through the activation or renewal of a primary credit card, primary charge card, supplementary credit card, or supplementary charge card is RM25.00 for each card, applicable on the date the card is activated and every 12 months thereafter or part thereof [2]. This service tax of RM25 per card activation or annual card renewal applies regardless of whether any annual card fee is imposed [3].

**q12. Is service tax charged on financial services imported from a foreign provider?**  
*Expected:* Imported taxable financial services section (paragraph 28 onwards).  
*Got (answered):* Yes, recipients in Malaysia are obligated to account for and pay service tax on imported taxable services (including financial advisory services) if the services are used for the purpose of their business and are taxable when made in Malaysia [1][4]. The foreign service provider is not required to charge the service tax; instead, the tax responsibility is shifted to the recipient in Malaysia [5]. However, financial services acquired from abroad by registered financial service providers are eligible for tax exemption [2].

**q13. Which private education providers are subject to service tax from 1 July 2025?**  
*Expected:* Paragraph 22: private playschools, kindergartens, primary and secondary schools, tuition and learning centres, international and expatriate schools.  
*Got (answered):* Service tax is imposed from 1 July 2025 on education services for private playschools, private kindergartens, private primary schools, private secondary schools, tuition centres, learning centres, international schools, and expatriate schools [3]. Additionally, service tax is imposed on non-Malaysian citizens who acquire education services in Malaysia from private universities, colleges, university colleges, and language centres [3].

**q14. Do Malaysian students pay service tax on private university fees?**  
*Expected:* No — higher education is taxed only for non-Malaysian students.  
*Got (answered):* Service tax on higher education services in Malaysia is imposed on non-Malaysian students studying at private higher education institutions [3]. The provided documents do not state that Malaysian students pay service tax on private university fees; rather, service tax is specifically imposed on non-Malaysian citizens acquiring education services from private universities, colleges, and university colleges [2][3].

**o01. What is the GST rate in Singapore?**  
*Expected:* Out of scope, tax-related (near-domain).  
*Got (not_found):* The provided documents do not cover the GST rate in Singapore.

**o02. How do I calculate real property gains tax when I sell my house?**  
*Expected:* Out of scope, Malaysian tax but not in these documents (near-domain).  
*Got (not_found):* The provided documents do not cover how to calculate real property gains tax when selling a house.

**o03. What is the best recipe for nasi lemak?**  
*Expected:* Out of scope, unrelated.  
*Got (not_found):* I couldn't find an answer to that in the tax documents I have access to. Try rephrasing, or check the official LHDN / JKDM sources.

