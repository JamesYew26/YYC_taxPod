# End-to-end evaluation — `baseline-350tok`

Run 2026-11-12 17:00 through `/api/ask`

| Metric | Result |
|---|---|
| In-scope answered | 13/14 (93%) |
| In-scope answered **and** cited the expected document | 13/14 (93%) |
| Out-of-scope correctly refused | 3/3 |
| Errors (LLM unavailable etc.) | 0 |
| Median latency | 6.2s |

| ID | Status | Reason | Cited expected doc? | Model | Seconds |
|---|---|---|---|---|---|
| q01 | answered |  | ✅ | gemini-3.6-flash | 9.1 |
| q02 | answered |  | ✅ | gemini-3.5-flash | 7.5 |
| q03 | answered |  | ✅ | gemini-3.5-flash | 6.2 |
| q04 | answered |  | ✅ | gemini-3.5-flash | 5.4 |
| q05 | not_found | llm_declined | ❌ | gemini-3.5-flash | 3.7 |
| q06 | answered |  | ✅ | gemini-3.5-flash | 7.8 |
| q07 | answered |  | ✅ | gemini-3.5-flash-lite | 11.3 |
| q08 | answered |  | ✅ | gemini-3.5-flash-lite | 2.6 |
| q09 | answered |  | ✅ | gemini-3.5-flash-lite | 1.9 |
| q10 | answered |  | ✅ | gemini-3.5-flash-lite | 5.6 |
| q11 | answered |  | ✅ | gemini-3.5-flash-lite | 26.2 |
| q12 | answered |  | ✅ | gemini-3.5-flash-lite | 20.8 |
| q13 | answered |  | ✅ | gemini-3.5-flash-lite | 21.0 |
| q14 | answered |  | ✅ | gemini-3.5-flash-lite | 9.4 |
| o01 | not_found | llm_declined | ✅ refused | gemini-3.5-flash-lite | 1.9 |
| o02 | not_found | below_threshold | ✅ refused | - | 0.2 |
| o03 | not_found | below_threshold | ✅ refused | - | 0.6 |

## Answers

**q01. Is a foreign employee who works in Malaysia for less than 60 days taxed on their employment income?**  
*Expected:* Exempt if employment period in Malaysia does not exceed 60 days (para 21, Schedule 6 ITA).  
*Got (answered):* A foreign employee whose period of employment in Malaysia does not exceed 60 days is generally exempted from tax on their employment income [1][4][5]. Under paragraph 21 of Schedule 6 of the ITA, this 60-day limit refers to the total period of employment in Malaysia rather than physical presence [3]. However, the employee will not qualify for the tax exemption if their total employment periods in Malaysia (including multiple stints, employment across different employers, or periods performing incidental duties outside Malaysia) exceed 60 days in a year of assessment [1][2][3].

**q02. What tax rate applies to a foreign national who is not tax resident in Malaysia?**  
*Expected:* Section 4.5: residents taxed at scale rates with reliefs; non-residents at a flat rate without reliefs.  
*Got (answered):* A foreign national who is not a tax resident in Malaysia is subject to income tax at a flat rate of 30% on every ringgit of their chargeable income, as specified in paragraph 1A, Part 1 of Schedule 1 to the Income Tax Act (ITA) [1]. They are not entitled to claim any personal tax reliefs [1]. However, special tax rates apply for an individual under certain incentives as specified in Part XIV and XVIII of Schedule 1 to the ITA [1].

**q03. What is the maximum value of each asset that qualifies for the small value asset special allowance?**  
*Expected:* Each asset must not exceed RM2,000.  
*Got (answered):* Effective from the Year of Assessment (YA) 2020, subparagraph 19A(1) of Schedule 3 of the ITA provides that the value of each small value asset does not exceed RM2,000 [5]. There have been changes in the value of small value assets across YAs [1]; for instance, from YA 2006 to YA 2008, the stated threshold was not exceeding 1,000 [3] (complete figures for YA 2009 to YA 2019 are not fully provided in the excerpts [3][5]).

**q04. Can I claim the special allowance for small value assets bought on hire purchase?**  
*Expected:* No — section 13: special allowances do not apply to assets acquired on hire purchase; normal capital allowance instead.  
*Got (answered):* No, special allowances under paragraph 19A of Schedule 3 of the ITA are not applicable to small value assets acquired on hire purchase [1]. However, a person can make a normal capital allowance claim under paragraphs 10 and 15 of Schedule 3 of the ITA for such small value assets [1].

**q05. What does PR No. 4/2026 say about hire purchase?**  
*Expected:* Same fact as q04, but asked by ruling number — tests identifier matching (known weakness of dense retrieval).  
*Got (not_found):* The provided documents do not contain information about PR No. 4/2026 or hire purchase.

**q06. How much tax relief can I claim for a child under 18?**  
*Expected:* RM2,000 per child under 18 (section 6.20).  
*Got (answered):* The allowable tax deduction for a child who is under 18 years of age is RM2,000 [1]. 

However, if two or more individuals are entitled to claim a deduction for payments in respect of the same child, the deduction allowed to each individual is 50% of the allowable deduction (i.e., RM1,000) [1].

**q07. What purchases qualify for lifestyle relief?**  
*Expected:* Section 6.11: books/journals/magazines/newspapers, personal computer/smartphone/tablet, internet subscription, skills courses.  
*Got (answered):* Under paragraph 46(1)(p) of the ITA, lifestyle relief includes expenses for the purchase of books, e-books, and newspapers [2], the purchase of a laptop or smartphone [1][2], payment of monthly internet subscription bills [2], and payment of self-enrichment course fees (such as courses related to hobbies, religion, or languages) attended by the individual [2]. Effective from YA 2024, self-enrichment course fees are included, provided they are not courses under subparagraph 46(1)(f)(iii) of the ITA [2].

**q08. What conditions must be met to claim tax relief for breastfeeding equipment?**  
*Expected:* Section 6.12.3: breastfeeding mother, child up to 2 years, equipment for own use, receipts.  
*Got (answered):* To claim a tax deduction for breastfeeding equipment, the individual must meet the following conditions: (a) be an exclusive working woman and a breastfeeding mother [2]; (b) breastfeed her child aged up to 2 years [1][2]; (c) expend money on the purchase of breastfeeding equipment for her own use [1][2]; (d) make a claim evidenced by receipts issued for the purchase [1]; (e) make the claim for equipment that qualifies, which includes a breast pump kit, an ice pack, breast milk collection and storage equipment, and a cooler set or cooler bag [1]; (f) the deduction is limited to a maximum of RM1,000 expended in that basis year and is allowed once in every two YAs [2]; and (g) in the case of a combined assessment, the deduction is allowed where the assessment is made in the name of the wife [1][3].

**q09. How long does a buyer have to reject an e-invoice after it has been validated?**  
*Expected:* Within 72 hours from validation, via MyInvois Portal.  
*Got (answered):* A buyer is able to request a rejection of an e-invoice within 72 hours from the time of validation [1][3].

**q10. When must businesses with annual turnover between RM5 million and RM25 million start issuing e-invoices?**  
*Expected:* 1 July 2025.  
*Got (answered):* Taxpayers with an annual turnover or revenue of more than RM5 million and up to RM25 million must start issuing e-invoices on 1 July 2025 [1].

**q11. How much service tax is charged on a credit card?**  
*Expected:* RM25 per card on activation and every 12 months thereafter.  
*Got (answered):* For the provision of a credit line facility or shariah compliance financing services through the activation or renewal of a primary credit card, primary charge card, supplementary credit card, or supplementary charge card, the service tax rate is RM25.00 for each card, applicable on the date the card is activated and every 12 months thereafter or part thereof after the card is activated [1]. Additionally, annual fees related to credit line facility services or shariah-compliant financing through the activation or renewal of a primary or additional credit or charge card are excluded from service tax [4].

**q12. Is service tax charged on financial services imported from a foreign provider?**  
*Expected:* Imported taxable financial services section (paragraph 28 onwards).  
*Got (answered):* A foreign service provider that provides financial services to a recipient in Malaysia is not required to charge service tax [1][2]. Instead, the responsibility for the tax is shifted to the recipient in Malaysia, who is obligated to account for and pay service tax on the imported taxable services if the services are used for the purpose of any business carried on by them and the services are taxable when made in Malaysia [1]. Additionally, services provided by a financial service provider from overseas to businesses in Designated Areas (DA) or Special Areas (SA) are also subject to service tax [3]. Registered financial service providers acquiring financial services from abroad are eligible for tax exemption if they meet specified conditions, and financial service providers in Labuan are exempted from payment of service tax on imported services subject to fulfilling conditions [2][3].

**q13. Which private education providers are subject to service tax from 1 July 2025?**  
*Expected:* Paragraph 22: private playschools, kindergartens, primary and secondary schools, tuition and learning centres, international and expatriate schools.  
*Got (answered):* Private education providers subject to service tax from 1 July 2025 include: (1) Private educational institutions registered under the Education Act 1996 (excluding special schools and language centres) that provide pre-school, primary, lower secondary, upper secondary, or post-secondary education services and charge fees exceeding RM60,000 per student for each academic year, which covers private playschools, private kindergartens, private primary schools, private secondary schools, tuition centres, learning centres, international schools, expatriate schools, religious primary/secondary schools, and Chinese private secondary schools [1][2]; (2) Higher education institutions registered under the Universities and University Colleges Act 1971, private higher education institutions registered under the Private Higher Educational Institutional Act 1996, and higher education institutions or teacher education institutes registered under the Education Act 1996 that provide education services to non-Malaysian citizens [1][2]; and (3) Language centres registered under the Education Act 1996 that provide services to non-citizen students [2][3].

**q14. Do Malaysian students pay service tax on private university fees?**  
*Expected:* No — higher education is taxed only for non-Malaysian students.  
*Got (answered):* No, the provision of education services to Malaysian citizens pursuing studies at private higher education institutions is not subject to service tax [3]. Additionally, Malaysian citizens who hold a valid Disabled Persons (OKU) card are also given service tax exemption for education services provided by private educational institutions [1].

**o01. What is the GST rate in Singapore?**  
*Expected:* Out of scope, tax-related (near-domain).  
*Got (not_found):* The provided documents do not cover the GST rate in Singapore.

**o02. How do I calculate real property gains tax when I sell my house?**  
*Expected:* Out of scope, Malaysian tax but not in these documents (near-domain).  
*Got (not_found):* I couldn't find an answer to that in the tax documents I have access to. Try rephrasing, or check the official LHDN / JKDM sources.

**o03. What is the best recipe for nasi lemak?**  
*Expected:* Out of scope, unrelated.  
*Got (not_found):* I couldn't find an answer to that in the tax documents I have access to. Try rephrasing, or check the official LHDN / JKDM sources.

