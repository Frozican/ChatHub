import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const $ = (id) => document.getElementById(id);
const configured = SUPABASE_URL.startsWith("https://")
  && !SUPABASE_URL.includes("YOUR_PROJECT")
  && SUPABASE_ANON_KEY.length > 30
  && !SUPABASE_ANON_KEY.includes("YOUR_");

const loginView = $("loginView");
const adminView = $("adminView");
const status = (message) => { $("loginStatus").textContent = message; };
const db = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

function showAdmin(email) {
  loginView.classList.add("hidden");
  adminView.classList.remove("hidden");
  $("adminEmail").textContent = email || "Signed-in account";
}

function showLogin() {
  adminView.classList.add("hidden");
  loginView.classList.remove("hidden");
}

async function verifyAdmin(session) {
  if (!session?.user) {
    showLogin();
    return false;
  }

  const { data, error } = await db
    .from("admin_users")
    .select("user_id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error) {
    showLogin();
    status("Could not verify admin access. Check that supabase/admin.sql has been run. " + error.message);
    return false;
  }

  if (!data) {
    await db.auth.signOut();
    showLogin();
    status("This account is not authorized for admin access. Ask the project owner to allowlist its user ID in Supabase.");
    return false;
  }

  showAdmin(session.user.email);
  return true;
}

$("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!db) {
    status("Supabase is not configured. Check config.js.");
    return;
  }
  status("Checking credentials…");
  const { data, error } = await db.auth.signInWithPassword({
    email: $("email").value.trim(),
    password: $("password").value
  });
  if (error) {
    status(error.message);
    return;
  }
  await verifyAdmin(data.session);
});

$("signOut").addEventListener("click", async () => {
  if (db) await db.auth.signOut();
  showLogin();
  status("Signed out.");
});

async function start() {
  if (!db) {
    status("Supabase is not configured. Check config.js.");
    return;
  }
  const { data, error } = await db.auth.getSession();
  if (error) status(error.message);
  else if (data.session) await verifyAdmin(data.session);
  db.auth.onAuthStateChange((_event, session) => {
    if (!session) showLogin();
  });
}
start();
