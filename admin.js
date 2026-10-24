import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
const $ = (id) => document.getElementById(id);
const db = SUPABASE_URL.startsWith("https://") && SUPABASE_ANON_KEY.length > 30 ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const setStatus = (id, text) => { $(id).textContent = text; };
const escapeText = (value) => String(value ?? "");
function cell(row, value) { const td=document.createElement("td"); td.textContent=escapeText(value); row.append(td); return td; }
function dateText(value) { return value ? new Date(value).toLocaleString() : "—"; }
function showLogin(message="") { $("dashboard").classList.add("hidden"); $("loginPanel").classList.remove("hidden"); setStatus("loginStatus",message); }
function showDashboard(session) { $("loginPanel").classList.add("hidden"); $("dashboard").classList.remove("hidden"); $("adminEmail").textContent=session.user.email || ""; }
async function callRpc(name,args={}) { const {data,error}=await db.rpc(name,args); if(error) throw error; return data; }
async function loadStats() {
  try { const s=await callRpc("admin_dashboard_stats"); $("statUsers").textContent=s.users; $("statServers").textContent=s.servers; $("statMessages").textContent=s.messages; $("statChannels").textContent=s.channels; setStatus("dashStatus","Dashboard data loaded."); }
  catch(e){setStatus("dashStatus","Admin SQL setup is missing or failed: "+e.message);}
}
async function loadUsers() {
 const tbody=$("usersRows"); tbody.replaceChildren(); setStatus("dashStatus","Loading users…");
 try { const rows=await callRpc("admin_list_users"); for(const u of rows){const tr=document.createElement("tr");cell(tr,u.display_name);cell(tr,u.id);cell(tr,dateText(u.created_at));tbody.append(tr);} setStatus("dashStatus",rows.length+" user profiles loaded.");}
 catch(e){setStatus("dashStatus","Could not load users. Run supabase/admin-dashboard.sql in Supabase SQL Editor. "+e.message);}
}
async function loadMessages() {
 const tbody=$("messagesRows"); tbody.replaceChildren(); setStatus("dashStatus","Loading messages…");
 try { const rows=await callRpc("admin_list_messages"); for(const m of rows){const tr=document.createElement("tr");cell(tr,m.content);cell(tr,m.author);cell(tr,m.channel);cell(tr,dateText(m.created_at));const td=document.createElement("td");const b=document.createElement("button");b.className="danger";b.textContent="Delete";b.addEventListener("click",async()=>{if(!confirm("Permanently delete this message?"))return;b.disabled=true;try{await callRpc("admin_delete_message",{target_message_id:m.id});await loadMessages();await loadStats();}catch(e){setStatus("dashStatus","Delete failed: "+e.message);b.disabled=false;}});td.append(b);tr.append(td);tbody.append(tr);} setStatus("dashStatus",rows.length+" messages loaded.");}
 catch(e){setStatus("dashStatus","Could not load messages. Run supabase/admin-dashboard.sql in Supabase SQL Editor. "+e.message);}
}
async function verify(session) {
 if(!session?.user){showLogin();return;}
 const {data,error}=await db.from("admin_users").select("user_id").eq("user_id",session.user.id).maybeSingle();
 if(error){showLogin("Could not verify admin access: "+error.message);return;}
 if(!data){await db.auth.signOut();showLogin("This account is not allowlisted for admin access.");return;}
 showDashboard(session); await loadStats(); await loadUsers();
}
$("loginForm").addEventListener("submit",async e=>{e.preventDefault();if(!db){showLogin("Supabase is not configured in config.js.");return;}setStatus("loginStatus","Checking credentials…");const {data,error}=await db.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});if(error){setStatus("loginStatus",error.message);return;}await verify(data.session);});
$("signOut").addEventListener("click",async()=>{if(db)await db.auth.signOut();showLogin("Signed out.");});
$("refreshUsers").addEventListener("click",loadUsers);$("refreshMessages").addEventListener("click",loadMessages);
document.querySelectorAll("[data-tab]").forEach(button=>button.addEventListener("click",()=>{document.querySelectorAll("[data-tab]").forEach(b=>b.classList.toggle("active",b===button));$("usersPane").classList.toggle("hidden",button.dataset.tab!=="users");$("messagesPane").classList.toggle("hidden",button.dataset.tab!=="messages");if(button.dataset.tab==="messages")loadMessages();}));
async function start(){if(!db){showLogin("Supabase is not configured in config.js.");return;}const {data,error}=await db.auth.getSession();if(error)showLogin(error.message);else if(data.session)await verify(data.session);db.auth.onAuthStateChange((_event,session)=>{if(!session)showLogin();});}
start();
