import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import "./App.css";

function App() {
  const [session, setSession] = useState(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [campaignData, setCampaignData] = useState([]);
  const [companyName, setCompanyName] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function getSession() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    setSession(session);
  }

  async function login(e) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
    }

    setLoading(false);
  }

  async function logout() {
    await supabase.auth.signOut();

    setCampaignData([]);
    setCompanyName("");
    setMessage("");
  }

  async function loadDashboard() {
    if (!session) return;

    setLoading(true);
    setMessage("");

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", session.user.id)
      .single();

    if (profileError) {
      setMessage(profileError.message);
      setLoading(false);
      return;
    }

    const {
      data: company,
      error: companyError,
    } = await supabase
      .from("companies")
      .select("name")
      .eq("id", profile.company_id)
      .single();

    if (companyError) {
      setMessage(companyError.message);
      setLoading(false);
      return;
    }

    setCompanyName(company.name);

    const {
      data: campaigns,
      error: campaignError,
    } = await supabase
      .from("campaign_data")
      .select("id, company_id, channel, leads")
      .order("id");

    if (campaignError) {
      setMessage(campaignError.message);
      setLoading(false);
      return;
    }

    setCampaignData(campaigns || []);

    setLoading(false);
  }

  async function runRlsTest() {
    setMessage("Running RLS isolation test...");

    const {
      data,
      error,
    } = await supabase
      .from("campaign_data")
      .select("id, company_id, channel, leads");

    if (error) {
      setMessage(`RLS test failed: ${error.message}`);
      return;
    }

    const returnedCompanyIds = [
      ...new Set(data.map((row) => row.company_id)),
    ];

    const ownCompanyId = campaignData[0]?.company_id;

    if (
      returnedCompanyIds.length === 1 &&
      returnedCompanyIds[0] === ownCompanyId &&
      data.length === 5
    ) {
      setMessage(
        "RLS PASS: 5 rows returned and only this company's data is visible."
      );
    } else {
      setMessage(
        `RLS CHECK: ${data.length} rows returned across ${returnedCompanyIds.length} company IDs.`
      );
    }
  }

  useEffect(() => {
    if (session) {
      loadDashboard();
    }
  }, [session]);

  /* =========================
     LOGIN
  ========================= */

  if (!session) {
    return (
      <div className="login-page">
        <div className="login-card">

          <div className="login-logo">
            M
          </div>

          <h1>Marketing Isolation</h1>

          <p className="login-subtitle">
            Secure multi-company marketing analytics
            powered by Supabase Row Level Security.
          </p>

          <form
            className="login-form"
            onSubmit={login}
          >
            <label>Email</label>

            <input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label>Password</label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button
              className="login-button"
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {message && (
            <p className="error">
              {message}
            </p>
          )}

          <div className="login-footer">
            Protected by Supabase authentication & RLS
          </div>

        </div>
      </div>
    );
  }

  /* =========================
     DASHBOARD CALCULATIONS
  ========================= */

  const totalLeads = campaignData.reduce(
    (sum, row) => sum + row.leads,
    0
  );

  const topChannel =
    campaignData.length > 0
      ? [...campaignData].sort(
          (a, b) => b.leads - a.leads
        )[0]
      : null;

  const averageLeads =
    campaignData.length > 0
      ? Math.round(totalLeads / campaignData.length)
      : 0;

  /* =========================
     DASHBOARD
  ========================= */

  return (
    <div className="dashboard">

      {/* NAVBAR */}

      <nav className="navbar">

        <div className="brand">

          <div className="brand-icon">
            M
          </div>

          <div className="brand-text">
            <span className="brand-name">
              Marketing Isolation
            </span>

            <span className="brand-caption">
              Multi-tenant analytics
            </span>
          </div>

        </div>

        <div className="nav-right">

          <div className="company-badge">

            <span className="company-dot"></span>

            {companyName}

          </div>

          <button
            className="logout"
            onClick={logout}
          >
            Logout
          </button>

        </div>

      </nav>


      {/* MAIN */}

      <main className="dashboard-content">

        <div className="page-heading">

          <h1>
            Marketing Overview
          </h1>

          <p>
            Monitor campaign performance across your
            marketing channels.
          </p>

        </div>


        {/* ACTIONS */}

        <div className="actions">

          <button
            className="primary-button"
            onClick={loadDashboard}
          >
            {loading ? "Refreshing..." : "Refresh Data"}
          </button>

          <button
            className="secondary-button"
            onClick={runRlsTest}
          >
            🔐 Run RLS Test
          </button>

        </div>


        {/* MESSAGE */}

        {message && (
          <div className="message">
            {message}
          </div>
        )}


        {/* STATS */}

        <div className="stats-grid">

          <div className="stat-card">

            <div className="stat-label">
              Total Leads
            </div>

            <div className="stat-value">
              {totalLeads}
            </div>

            <div className="stat-description">
              Across all active channels
            </div>

          </div>


          <div className="stat-card">

            <div className="stat-label">
              Channels
            </div>

            <div className="stat-value">
              {campaignData.length}
            </div>

            <div className="stat-description">
              Marketing channels tracked
            </div>

          </div>


          <div className="stat-card">

            <div className="stat-label">
              Top Channel
            </div>

            <div className="stat-value">
              {topChannel?.channel || "-"}
            </div>

            <div className="stat-description">
              {topChannel
                ? `${topChannel.leads} leads`
                : "No data"}
            </div>

          </div>

        </div>


        {/* TABLE */}

        <section className="dashboard-card">

          <div className="card-header">

            <div>

              <h2 className="card-title">
                Campaign Performance
              </h2>

              <p className="card-description">
                Leads generated by marketing channel
              </p>

            </div>

          </div>

          <div className="table-wrapper">

            <table>

              <thead>

                <tr>
                  <th>Channel</th>
                  <th>Leads</th>
                </tr>

              </thead>

              <tbody>

                {campaignData.map((row) => (

                  <tr key={row.id}>

                    <td>

                      <div className="channel-cell">

                        <span className="channel-dot"></span>

                        {row.channel}

                      </div>

                    </td>

                    <td>

                      <span className="leads-value">
                        {row.leads}
                      </span>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </section>


        {/* CHART */}

        <section className="dashboard-card">

          <div className="card-header">

            <div>

              <h2 className="card-title">
                Leads by Channel
              </h2>

              <p className="card-description">
                Visual comparison of campaign performance
              </p>

            </div>

          </div>

          <div className="chart-container">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <BarChart
                data={campaignData}
                margin={{
                  top: 10,
                  right: 10,
                  left: -20,
                  bottom: 5,
                }}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e5e7eb"
                />

                <XAxis
                  dataKey="channel"
                  tick={{
                    fill: "#64748b",
                    fontSize: 12,
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  tick={{
                    fill: "#64748b",
                    fontSize: 12,
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip />

                <Bar
                  dataKey="leads"
                  fill="#2563eb"
                  radius={[6, 6, 0, 0]}
                  barSize={48}
                />

              </BarChart>

            </ResponsiveContainer>

          </div>

        </section>


        {/* SECURITY */}

        <section className="security-card">

          <div className="security-icon">
            🔐
          </div>

          <div className="security-content">

            <h3>
              Row Level Security Active
            </h3>

            <p>
              Your data is isolated at the PostgreSQL
              database level using Supabase RLS.
            </p>

          </div>

          <div className="rls-pass">
            {campaignData.length} rows visible
          </div>

        </section>

      </main>

    </div>
  );
}

export default App;