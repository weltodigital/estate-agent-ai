# Privacy notice — DRAFT for legal review

> Draft written from how Privett actually works (October 2026). It is not legal advice. Have it checked before publishing.
> Items marked **[CHECK]** need a fact or a decision from you.

**Last updated:** [CHECK: date of publication]

## Who we are

Privett is run by **Welto Limited** [CHECK: company number, registered office address], a company registered in England and Wales. We are the **controller** of the personal data described here. If you have any questions, email **ed@useprivett.com**.

[CHECK: ICO registration number, if registered]

## What Privett does

Privett asks AI assistants (ChatGPT, Perplexity, Gemini and Claude) the questions people ask about estate and letting agents in a town. It then records which agencies are named and suggests improvements. It's a service for businesses. Most of what we handle is information about agencies, not about individuals.

## What we collect, and why

| What | Examples | Why | Lawful basis |
|---|---|---|---|
| **Account details** | Your email address, your name if you give it, the organisation you belong to and your role | To create your account, sign you in and let your team work together | Contract |
| **Branch details** | Agency and branch names, website, town, neighbourhoods, postcode, the questions you track | To run your scans | Contract |
| **Billing details** | Your plan and subscription status, and a reference to your Stripe customer record. **We never see or store your card details**; Stripe handles them | To charge for your plan | Contract; legal obligation (accounting records) |
| **Free scan details** | The email address you give, agency name, website and town, plus a scrambled (one-way hashed) version of your IP address. We never store the IP address itself | To run the scan, email you the results and limit free scans to one per agency | Legitimate interests (providing the scan you asked for and preventing abuse) |
| **Sign-in emails and service emails** | Sign-in links, free scan results | To give you access and send what you asked for | Contract / legitimate interests |
| **Scan results** | The questions we asked, the AI assistants' answers, the agencies named and the websites they cited | This is the service. The answers are about businesses, not individuals | Contract |
| **Technical data** | Basic logs from our hosting providers (for example, request times and errors) | To keep the service secure and working | Legitimate interests |

We don't sell personal data, and we don't use it for advertising.

### The website tracking snippet

If you add our snippet to your website, it records a visit **only when the visitor arrives from an AI assistant**. It records which assistant it was, the page they landed on (without any query string) and the time. **It sets no cookies, and it stores no IP addresses, device identifiers or other personal data about your visitors.** [CHECK: whether you want to tell agencies to mention it in their own privacy notice; with no personal data collected, it's likely unnecessary]

## Cookies and similar technologies

We use only what's needed to run the service:
- **Sign-in cookies,** which keep you signed in (set by our authentication provider, Supabase).
- **An organisation cookie,** which remembers which agency you're viewing if you belong to more than one.
- **A theme setting** stored in your browser (light or dark).

We don't use analytics, advertising or tracking cookies. Because these are all strictly necessary, we don't ask for cookie consent. [CHECK: revisit if you add analytics]

## Who we share data with

We use these service providers to run Privett. They process data for us under contract:

| Provider | What for | Where |
|---|---|---|
| Supabase | Database and sign-in | EU (Ireland) |
| Vercel | Hosting the website and app | [CHECK: region / global edge] |
| Railway | Running scans | [CHECK: region] |
| Stripe | Payments | UK, EU and US |
| Resend | Sending emails | [CHECK: region] |
| OpenAI, Perplexity, Google (Gemini), Anthropic (Claude) | Answering the questions in your scans, and (Anthropic) reading the answers | US |
| Google (Places) | Reading public Google Business Profile ratings for agencies | US |

**What we send to the AI providers** is the questions (for example, "best estate agent in Farnham") and, for reading answers, the AI answer text. **We don't send your email address, name or account details to them.** We use their business APIs. [CHECK: confirm each provider's API terms say API data isn't used to train their models; at the time of writing, OpenAI, Anthropic and Google's paid API state this by default]

## International transfers

Some providers are in the US. Where personal data leaves the UK, we rely on appropriate safeguards, such as the UK–US Data Bridge for certified companies or the UK International Data Transfer Agreement / Addendum. [CHECK]

## How long we keep data

- **Account and branch data:** while your account is open. When you close it, we delete or anonymise it within [CHECK: e.g. 90 days], except billing records we must keep for 6 years.
- **Free scans:** [CHECK: choose a period, e.g. 12 months, after which we delete the email address. **This isn't automated yet; tell us the period and we'll build it.**]
- **Scan results:** these are about businesses. We keep them to show trends over time and may use them in **aggregated or anonymised** form (see below).

## Aggregated and anonymised data

We use scan results across all agencies, which are about businesses rather than people, to improve our recommendations and to publish **town league tables**: how often AI names each agency in a town. These don't contain personal data. [CHECK: confirm you're comfortable publishing these about agencies, including non-customers. The data is about businesses and comes from public AI answers]

## Your rights

You can ask us to:
- **give you a copy** of your personal data;
- **correct** it;
- **delete** it;
- **restrict** or **object** to how we use it;
- **move** it to another service.

Email **ed@useprivett.com** and we'll respond within a month. If you're unhappy with how we've handled your data, you can complain to the **Information Commissioner's Office** (ico.org.uk, 0303 123 1113).

## Changes

If we change this notice, we'll update the date at the top. If the changes are significant, we'll tell account holders by email.
