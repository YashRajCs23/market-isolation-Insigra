**# 🔐 Marketing Isolation Dashboard**



A secure multi-tenant marketing dashboard where **Company A can never see Company B's data**. Tenant isolation is enforced at the PostgreSQL database layer with Supabase Row Level Security (RLS), not by frontend filtering.



Built for the **\*\*Insigra Reports Junior Developer Internship practical assignment\*\***.



\| | |

\|---|---|

\| **\*\*Live app\*\***   | https://market-isolation-insigra.vercel.app/ |

\| **\*\*Repository\*\*** | https://github.com/YashRajCs23/market-isolation-Insigra |

\| **\*\*Test users\*\*** | \`alpha\@test.com\` (Alpha Ltd), \`beta\@test.com\` (Beta Ltd). Passwords were sent to Insigra separately and are not stored in this repo. |



**---**



**## ✅ Assignment Requirements Checklist**



\| # | Requirement | Status | Where |

\|---|---|:-:|---|

\| 1 | Supabase project | ✅ | Supabase dashboard |

\| 2 | \`profiles\` and \`campaign_data\` tables | ✅ | [Database schema]\(#-database-schema) |

\| 3 | 5 rows each for Alpha Ltd and Beta Ltd | ✅ | [Seed data]\(#seed-data) |

\| 4 | Two test users linked to their companies | ✅ | \`auth.users\` + \`profiles\` |

\| 5 | RLS enabled with a company-matching policy | ✅ | [Security]\(#-security-row-level-security) |

\| 6 | Login page (email + password) | ✅ | Supabase Auth |

\| 7 | Table of the logged-in company's data | ✅ | Dashboard |

\| 8 | Chart: leads by channel | ✅ | Dashboard (Recharts) |

\| 9 | Tested as Alpha and as Beta | ✅ | [Testing]\(#-testing) |

\| 10 | Bonus: Shopify automation | ✅ | [Shopify bonus]\(#-bonus-shopify-payment--automatic-access) |



**\*\*One deliberate deviation:\*\*** the brief used a \`company_name\` text column. I used a \`companies\` table with a UUID \`company_id\` instead. Names can be renamed or mistyped; IDs can't, and a foreign key lets the database reject orphaned rows.



**---**



**## ✨ Features**



\- Email/password login with Supabase Auth

\- Company-based multi-tenant isolation using PostgreSQL RLS

\- KPI cards: company name, total leads, number of channels, top channel

\- Campaign performance table

\- Leads-by-channel bar chart

\- Built-in RLS isolation test with PASS/FAIL result

\- Refresh and logout

\- Responsive layout, Vercel-ready



**## 🛠️ Tech Stack**



\| Layer | Technology |

\|---|---|

\| Frontend | React + Vite, CSS |

\| Charts | Recharts |

\| Auth | Supabase Auth |

\| Database | PostgreSQL (Supabase) |

\| Security | Row Level Security |

\| Hosting | Vercel |



**---**



**## 🔐 Security at a Glance

The security model has three layers:

- **Authentication:** Supabase Auth identifies the signed-in user.
- **Tenant mapping:** `profiles.company_id` associates that user with exactly one company.
- **Authorization:** PostgreSQL RLS compares `campaign_data.company_id` with the authenticated user's company.

This means a client cannot bypass isolation simply by changing a query parameter or modifying frontend code.

---

## 🏗️ Architecture**



\`\`\`text

Browser (React)

   │  email + password

   ▼

Supabase Auth ──► JWT (contains the user id)

   │

   ▼

PostgREST API ──► PostgreSQL

                     │  auth.uid() = id from the JWT

                     ▼

                  profiles ──► company_id

                     │

                     ▼

              RLS policy on campaign_data

                     │

        ┌────────────┴────────────┐

   Alpha user sees           Beta user sees

   Alpha rows only           Beta rows only

\`\`\`



The frontend sends the same query for every user. The database decides which rows come back.



**---**



**## 🗄️ Database Schema**



\`\`\`sql

\-- Companies

create table companies (

  id   uuid primary key default gen_random_uuid(),

  name text not null unique

);



\-- Maps each login to exactly one company

create table profiles (

  id         uuid primary key references auth.users(id) on delete cascade,

  company_id uuid not null references companies(id)

);



\-- Marketing data

create table campaign_data (

  id         bigint generated always as identity primary key,

  company_id uuid not null references companies(id),

  channel    text not null,

  leads      integer not null check (leads >= 0)

);



create index on campaign_data (company_id);

\`\`\`



**### Seed data**



\`\`\`sql

insert into companies (name) values ('Alpha Ltd'), ('Beta Ltd');



insert into campaign_data (company_id, channel, leads)

select c.id, v.channel, v.leads

from companies c

join (values

  ('Alpha Ltd','Google',120), ('Alpha Ltd','Meta',95),  ('Alpha Ltd','LinkedIn',60),

  ('Alpha Ltd','YouTube',80), ('Alpha Ltd','Email',45),

  ('Beta Ltd','Google',75),   ('Beta Ltd','Meta',130),  ('Beta Ltd','LinkedIn',55),

  ('Beta Ltd','YouTube',90),  ('Beta Ltd','Email',35)

) as v(company, channel, leads) on v.company = c.name;



\-- Link the two test users (created in Authentication → Users)

insert into profiles (id, company_id)

select u.id, c.id

from auth.users u

join companies c on (u.email = 'alpha\@test.com' and c.name = 'Alpha Ltd')

                 or (u.email = 'beta\@test.com'  and c.name = 'Beta Ltd');

\`\`\`



\| Alpha Ltd | Leads | | Beta Ltd | Leads |

\|---|--:|---|---|--:|

\| Google | 120 | | Google | 75 |

\| Meta | 95 | | Meta | 130 |

\| LinkedIn | 60 | | LinkedIn | 55 |

\| YouTube | 80 | | YouTube | 90 |

\| Email | 45 | | Email | 35 |

\| **\*\*Total\*\*** | **\*\*400\*\*** | | **\*\*Total\*\*** | **\*\*385\*\*** |



**---**



**## 🔒 Security: Row Level Security**



\`\`\`sql

\-- 1. Turn RLS on (with RLS on and no policy, nobody can read anything)

alter table companies     enable row level security;

alter table profiles      enable row level security;

alter table campaign_data enable row level security;



\-- 2. Table privileges (RLS filters rows; GRANT controls table access at all)

grant select on companies, profiles, campaign_data to authenticated;



\-- 3. Policies

create policy "Users can read their own profile"

on profiles for select to authenticated

using (id = auth.uid());



create policy "Users can read their own company"

on companies for select to authenticated

using (id = (select company_id from profiles where id = auth.uid()));



create policy "Users can view their company campaign data"

on campaign_data for select to authenticated

using (

  company_id = (

    select company_id from profiles where profiles.id = auth.uid()

  )

);

\`\`\`



**### How the rule works, in plain words**



1\. \`auth.uid()\` returns the ID of the logged-in user, taken from their verified login token.

2\. The policy looks that user up in \`profiles\` to find their \`company_id\`.

3\. PostgreSQL keeps only the \`campaign_data\` rows whose \`company_id\` matches.

4\. No policy allows \`INSERT\`, \`UPDATE\` or \`DELETE\`, so those are denied for normal users. The \`anon\` role has no grants at all, so logged-out visitors get nothing.



**### Why not just filter in React?**



\`\`\`js

// ❌ Not security: the browser already received every company's rows

data.filter(row => row\.company_id === myCompanyId)



// ✅ Security: the database never returns other companies' rows

supabase.from('campaign_data').select('\*')

\`\`\`



A user can open dev tools, edit the request, or call the API directly, so only a database-level rule is a real boundary.



**---**



**## 🧪 Testing & Verification**



**### Manual**



\| Step | Expected result |

\|---|---|

\| Log in as \`alpha\@test.com\` password : alpha\@123 | Header shows **\*\*Alpha Ltd\*\***, 5 rows, 400 total leads, top channel Google |

\| Log in as \`beta\@test.com\` password : beta\@123 | Header shows **\*\*Beta Ltd\*\***, 5 rows, 385 total leads, top channel Meta |

\| Wrong password | Error message, no dashboard |

\| Logout | Back to login screen |



**### In-app RLS isolation test**



The **\*\*Run RLS Isolation Test\*\*** button queries \`campaign_data\` **\*\*without any company filter\*\*** and checks that every returned row belongs to the user's own company. Expected result for both users:



\`\`\`text

RLS PASS: 5 rows returned and only this company's data is visible.

\`\`\`



**### Direct SQL check (Supabase SQL editor)**



\`\`\`sql

\-- Pretend to be the Alpha user for this transaction

begin;

set local role authenticated;

select set_config('request.jwt.claims',

  json_build_object('sub', (select id from auth.users where email='alpha\@test.com'))::text, true);



select company_id, count(\*) from campaign_data group by company_id;

\-- Expected: exactly one company_id, count = 5

rollback;

\`\`\`



**---**



**## ⚙️ Local Setup**



\`\`\`bash

git clone https\://github.com/YOUR-USERNAME/marketing-isolation-app.git

cd marketing-isolation-app

npm install

cp .env.example .env     # then fill in your values

npm run dev              # http\://localhost:5173

\`\`\`



\`.env\`:



\`\`\`env

VITE_SUPABASE_URL=https\://YOUR_PROJECT.supabase.co

VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY

\`\`\`



To set up your own Supabase project, run the SQL from [Database schema]\(#-database-schema) and [Security]\(#-security-row-level-security) in the SQL editor, then create the two users under **\*\*Authentication → Users\*\***.



\| Command | Purpose |

\|---|---|

\| \`npm run dev\` | Development server |

\| \`npm run build\` | Production build into \`dist/\` |

\| \`npm run preview\` | Preview the production build |



**## ☁️ Deployment (Vercel)**



1\. Push to GitHub and import the repo into Vercel.

2\. Build command \`npm run build\`, output directory \`dist\`.

3\. Add \`VITE_SUPABASE_URL\` and \`VITE_SUPABASE_PUBLISHABLE_KEY\` as environment variables.

4\. Deploy, then add the Vercel URL under **\*\*Supabase → Authentication → URL Configuration\*\*** (Site URL and Redirect URLs).



**## 🔑 Secrets**



\- The publishable/anon key is designed to be public. It is safe in the frontend **\*\*only because RLS is on\*\***.

\- Never put the \`service_role\` key or the database password in the frontend or in Git.

\- \`.env\` is listed in \`.gitignore\`; only \`.env.example\` is committed.



**---**



**## 📁 Project Structure**



\`\`\`text

marketing-isolation-app/

├── public/

├── screenshots/

├── src/

│   ├── lib/supabase.js      # Supabase client

│   ├── App.jsx              # Login, dashboard, table, chart, RLS test

│   ├── App.css

│   ├── index.css

│   └── main.jsx

├── .env.example

├── .gitignore

├── index.html

├── package.json

├── vite.config.js

└── README.md

\`\`\`



**---**



**## 🎬 Reviewer Quick Tour (about 2 minutes)**



1\. Open the live app and log in as Alpha. Note the company name, the 5 rows, and the chart.

2\. Click **\*\*Run RLS Isolation Test\*\*** and confirm **\*\*PASS\*\***.

3\. Log out and log in as Beta. The numbers and chart change completely.

4\. In Supabase, open **\*\*Authentication → Policies\*\*** and read the \`campaign_data\` policy.



**---**



**## 🧠 Reflection & Takeaways**



**\*\*What was difficult?\*\***

Telling apart PostgreSQL *\*privileges\** from *\*Row Level Security\**. At first my queries failed with a permission error. RLS only filters rows; the \`authenticated\` role also needed \`GRANT SELECT\` before the policy could take effect.



**\*\*What I would improve\*\***

Role-based access within a company (admin vs viewer), date filters and trends, more metrics (conversion rate, cost per lead), audit logging, loading/error states, and automated tests that assert Alpha can never read Beta's rows.



**\*\*What I learned\*\***

Authentication answers *\*who are you?\**; authorization answers *\*what may you see?\**. Tenant isolation belongs as close to the data as possible.



**---**



**## 🛍️ Bonus: Shopify Payment → Automatic Access**



1\. Shopify sends an \`orders/paid\` webhook to a small backend (e.g. a Supabase Edge Function).

2\. The backend verifies the webhook's HMAC signature, so only real Shopify events are accepted.

3\. Using the \`service_role\` key (server-side only), it creates or finds the company, creates the Supabase user, and inserts the \`profiles\` row with the right \`company_id\`.

4\. The customer receives an invite/password-setup email and logs in.

5\. RLS then limits them to their own company. The customer never chooses their own \`company_id\`, and the webhook is idempotent so duplicate events don't create duplicates.



**---**



**## 🔮 Future Improvements**



\- Role-based access control and an admin view

\- Date-range filtering and trend charts

\- CSV/PDF export

\- Audit logs

\- Automated RLS integration tests

\- Shopify webhook integration



**---**


## 👨‍💻 Author**



**\*\*Yash Raj Srivastava\*\***

B.Tech Computer Science, GLA University, Mathura (graduating June 2027)



\> **\*\*Core guarantee:\*\*** a logged-in user can only retrieve campaign data belonging to their own company, enforced by PostgreSQL Row Level Security rather than by the frontend.
