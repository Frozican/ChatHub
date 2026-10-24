import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
const ready=SUPABASE_URL.startsWith("https://")&&!SUPABASE_URL.includes("YOUR_PROJECT")&&SUPABASE_ANON_KEY.length>30&&!SUPABASE_ANON_KEY.includes("YOUR_");
const db=ready?createClient(SUPABASE_URL,SUPABASE_ANON_KEY):null;const $=id=>document.getElementById(id);let user=null,profile=null,servers=[],channels=[],serverId=null,channelId=null,messages=[],demo=!ready,signup=false,sub=null;
const demoServer={id:"demo-server",name:"ChatHub Community"};const demoChannels=[{id:"demo-general",server_id:demoServer.id,name:"general",topic:"Talk about anything!"},{id:"demo-projects",server_id:demoServer.id,name:"projects",topic:"Share what you are building."}];
function esc(s=""){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}function name(){return profile?.display_name||user?.email?.split("@")[0]||"User"}function toast(s){$("toast").textContent=s;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2500)}function banner(s){$("notice").textContent=s;$("notice").classList.add("show")}
function render(){ $("who").textContent=user?name():"Not signed in";$("account").textContent=user?"Sign out":"Sign in";$("servers").innerHTML=servers.map(s=>`<button class="server" data-server="${esc(s.id)}" title="${esc(s.name)}">${esc(s.name.slice(0,2).toUpperCase())}</button>`).join("");$("channelList").innerHTML=channels.filter(c=>c.server_id===serverId).map(c=>`<button class="channel ${c.id===channelId?"active":""}" data-channel="${esc(c.id)}"># ${esc(c.name)}</button>`).join("");$("serverTitle").textContent=servers.find(s=>s.id===serverId)?.name||"ChatHub";const c=channels.find(c=>c.id===channelId);$("channelTitle").textContent="# "+(c?.name||"welcome");$("message").placeholder="Message #"+(c?.name||"welcome");$("message").disabled=!user||!c;$("messages").innerHTML=messages.length?messages.map(m=>`<article class="message"><div class="avatar">${esc((m.author||"U").slice(0,1).toUpperCase())}</div><div class="body"><div class="meta">${esc(m.author||"User")} <span class="time">${new Date(m.created_at).toLocaleString()}</span></div><div class="content">${esc(m.content)}</div><div class="actions"><button data-react="${m.id}">👍 ${m.reactions||0}</button><button data-reply="${m.id}">Reply</button></div></div></article>`).join(""):`<div class="welcome"><div class="hash">#</div><h1>Welcome to ChatHub!</h1><p>${demo?"Demo mode is active. Messages stay in this browser. Configure config.js and run the SQL setup for real multi-user chat.":"This is the beginning of this channel."}</p></div>`;$("membersToggle").onclick=()=>{$("members").style.display=$("members").style.display==="block"?"none":"block"};document.querySelectorAll("[data-server]").forEach(b=>b.onclick=()=>selectServer(b.dataset.server));document.querySelectorAll("[data-channel]").forEach(b=>b.onclick=()=>selectChannel(b.dataset.channel));document.querySelectorAll("[data-react]").forEach(b=>b.onclick=()=>react(b.dataset.react));document.querySelectorAll("[data-reply]").forEach(b=>b.onclick=()=>{$("message").value="@"+(messages.find(m=>m.id===b.dataset.reply)?.author||"user")+" ";$("message").focus()});$("messages").scrollTop=$("messages").scrollHeight;}
async function selectServer(id){serverId=id;if(demo)channels=demoChannels;else{const r=await db.from("channels").select("*").eq("server_id",id).order("position");if(r.error)return toast(r.error.message);channels=r.data||[]}channelId=channels.find(c=>c.server_id===id)?.id||null;await loadMessages();render()}
async function selectChannel(id){channelId=id;await loadMessages();render();document.querySelector(".channels")?.classList.remove("open")}
async function loadMessages(){if(sub){await db.removeChannel(sub);sub=null}if(!channelId){messages=[];return}if(demo){messages=JSON.parse(localStorage.getItem("chathub-messages")||"[]").filter(m=>m.channel_id===channelId);return}const r=await db.from("messages").select("*,profiles(display_name)").eq("channel_id",channelId).order("created_at").limit(100);if(r.error){toast(r.error.message);return}messages=(r.data||[]).map(m=>({...m,author:m.profiles?.display_name||"User",reactions:0}));sub=db.channel("chat-"+channelId).on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:"channel_id=eq."+channelId},p=>{if(!messages.some(m=>m.id===p.new.id)){messages.push({...p.new,author:"User",reactions:0});render()}}).subscribe()}
async function react(id){if(demo){const m=messages.find(x=>x.id===id);if(m)m.reactions=(m.reactions||0)+1;const all=JSON.parse(localStorage.getItem("chathub-messages")||"[]");localStorage.setItem("chathub-messages",JSON.stringify(all.map(x=>x.id===id?m:x)));render();return}toast("Persistent reactions need the reaction UI wiring in a future update.")}
$("composer").onsubmit=async e=>{e.preventDefault();const content=$("message").value.trim();if(!content||!user||!channelId)return;$("message").value="";if(demo){const m={id:crypto.randomUUID(),channel_id:channelId,content,author:name(),created_at:new Date().toISOString(),reactions:0};messages.push(m);localStorage.setItem("chathub-messages",JSON.stringify([...JSON.parse(localStorage.getItem("chathub-messages")||"[]"),m]));render();return}const r=await db.from("messages").insert({channel_id:channelId,user_id:user.id,content}).select("*,profiles(display_name)").single();if(r.error)toast(r.error.message);else{messages.push({...r.data,author:r.data.profiles?.display_name||name(),reactions:0});render()}};
$("account").onclick=async()=>{if(user){if(!demo)await db.auth.signOut();user=null;profile=null;servers=[];channels=[];messages=[];render();$("auth").showModal()}else $("auth").showModal()};$("authForm").onsubmit=async e=>{e.preventDefault();const email=$("email").value,password=$("password").value;if(demo){user={id:"demo-user",email};profile={display_name:$("displayName").value||email.split("@")[0]};servers=[demoServer];channels=demoChannels;serverId=demoServer.id;channelId=demoChannels[0].id;await loadMessages();$("auth").close();banner("Demo mode: messages are local to this browser, not shared.");render();return}const r=signup?await db.auth.signUp({email,password,options:{data:{display_name:$("displayName").value||email.split("@")[0]}}}):await db.auth.signInWithPassword({email,password});if(r.error){$("authError").textContent=r.error.message;return}user=r.data.user;profile={display_name:user.user_metadata?.display_name||email.split("@")[0]};if(signup&&!r.data.session){$("authError").textContent="Check your email to confirm your account, then sign in.";return}await loadServers();$("auth").close();banner("Connected to Supabase.");render()};$("switchAuth").onclick=()=>{signup=!signup;$("signIn").textContent=signup?"Create account":"Sign in";$("switchAuth").textContent=signup?"I already have an account":"Create account"};
async function loadServers(){if(demo){servers=[demoServer];channels=demoChannels;serverId=demoServer.id;channelId=demoChannels[0].id;return}const r=await db.from("server_members").select("role,servers(id,name)");if(r.error){toast(r.error.message);return}servers=(r.data||[]).map(x=>x.servers).filter(Boolean);if(servers[0])await selectServer(servers[0].id)}
$("newServer").onclick=async()=>{if(!user){$("auth").showModal();return}const n=await askForName("server");if(!n)return;const serverName=n.trim();if(demo){const s={id:crypto.randomUUID(),name:serverName};servers.push(s);const c={id:crypto.randomUUID(),server_id:s.id,name:"general",topic:""};channels.push(c);serverId=s.id;channelId=c.id;render();toast("Server created.");return}const r=await db.from("servers").insert({name:serverName,owner_id:user.id}).select().single();if(r.error)return toast("Could not create server: "+r.error.message);const channelResult=await db.from("channels").insert({server_id:r.data.id,name:"general"});if(channelResult.error)toast("Server created, but the general channel could not be created: "+channelResult.error.message);await loadServers();await selectServer(r.data.id);render();toast("Server created.")};$("newChannel").onclick=async()=>{if(!user||!serverId)return toast("Sign in and select a server first.");const n=await askForName("channel");if(!n)return;const channelName=n.trim().replace(/\s+/g,"-");if(demo){const c={id:crypto.randomUUID(),server_id:serverId,name:channelName,topic:""};channels.push(c);channelId=c.id;render();toast("Channel created.");return}const r=await db.from("channels").insert({server_id:serverId,name:channelName}).select().single();if(r.error)return toast("Could not create channel: "+r.error.message);channels.push(r.data);channelId=r.data.id;render();toast("Channel created.")};$("mobileMenu").onclick=()=>document.querySelector(".channels").classList.toggle("open");
async function start(){if(demo){banner("Demo mode: configure config.js and supabase/schema.sql for real accounts and shared chat.");render();$("auth").showModal();return}const {data}=await db.auth.getSession();if(data.session){user=data.session.user;profile={display_name:user.user_metadata?.display_name||user.email?.split("@")[0]};await loadServers();await loadMessages();render()}else{$("auth").showModal();render()}db.auth.onAuthStateChange(async(_e,s)=>{if(s&&!user){user=s.user;profile={display_name:user.user_metadata?.display_name||user.email?.split("@")[0]};await loadServers();await loadMessages();render()}})}start();

// Friend requests and server joining.
let friendCache=[];
async function refreshFriends(){
  if(!user||demo){$("friendsStatus").textContent=demo?"Friends require a configured Supabase project.":"Sign in first.";return;}
  const {data,error}=await db.from("friendships").select("requester_id,addressee_id,status,created_at");
  if(error){$("friendsStatus").textContent=error.message;return;}
  const rows=data||[];
  const ids=[...new Set(rows.flatMap(x=>[x.requester_id,x.addressee_id]).filter(id=>id!==user.id))];
  let profiles={};
  if(ids.length){const p=await db.from("profiles").select("id,display_name").in("id",ids);if(p.error){$("friendsStatus").textContent=p.error.message;return;}profiles=Object.fromEntries((p.data||[]).map(x=>[x.id,x]));}
  friendCache=rows;
  const incoming=rows.filter(x=>x.addressee_id===user.id&&x.status==="pending");
  const accepted=rows.filter(x=>x.status==="accepted");
  $("incomingFriends").replaceChildren();
  if(!incoming.length)$("incomingFriends").textContent="No incoming requests.";
  for(const f of incoming){const row=document.createElement("div");row.className="friend-row";const label=document.createElement("span");label.textContent=profiles[f.requester_id]?.display_name||f.requester_id;const accept=document.createElement("button");accept.textContent="Accept";accept.onclick=async()=>{const {error}=await db.from("friendships").update({status:"accepted"}).eq("requester_id",f.requester_id).eq("addressee_id",user.id).eq("status","pending");if(error)toast(error.message);else{toast("Friend request accepted.");await refreshFriends();}};row.append(label,accept);$("incomingFriends").append(row);}
  $("friendList").replaceChildren();
  if(!accepted.length)$("friendList").textContent="No friends yet.";
  for(const f of accepted){const id=f.requester_id===user.id?f.addressee_id:f.requester_id;const row=document.createElement("div");row.className="friend-row";const label=document.createElement("span");label.textContent=profiles[id]?.display_name||id;row.append(label);$("friendList").append(row);}
  $("friendsStatus").textContent="Find another user by their exact display name to send a request.";
}
$("friendsButton").onclick=async()=>{if(!user)return $("auth").showModal();$("friendsDialog").showModal();await refreshFriends();};
$("sendFriendRequest").onclick=async()=>{
  if(!user||demo)return toast("Sign in to Supabase to add friends.");
  const targetName=$("friendSearch").value.trim();if(!targetName)return;
  const found=await db.from("profiles").select("id,display_name").ilike("display_name",targetName).limit(10);
  if(found.error)return toast(found.error.message);
  const target=(found.data||[]).find(p=>p.display_name.toLowerCase()===targetName.toLowerCase()&&p.id!==user.id);
  if(!target)return $("friendsStatus").textContent="No other user with that display name was found.";
  const existing=friendCache.find(f=>(f.requester_id===user.id&&f.addressee_id===target.id)||(f.requester_id===target.id&&f.addressee_id===user.id));
  if(existing)return $("friendsStatus").textContent=existing.status==="accepted"?"You are already friends.":"A request already exists.";
  const {error}=await db.from("friendships").insert({requester_id:user.id,addressee_id:target.id,status:"pending"});
  if(error)return $("friendsStatus").textContent=error.message;
  $("friendsStatus").textContent="Friend request sent to "+target.display_name+".";
  $("friendSearch").value="";await refreshFriends();
};
$("joinServer").onclick=async()=>{
  if(!user)return $("auth").showModal();
  if(demo)return toast("Server joining requires a configured Supabase project.");
  const id=await askForServerId();if(!id)return;
  const check=await db.from("servers").select("id,name").eq("id",id.trim()).maybeSingle();
  if(check.error||!check.data)return toast(check.error?.message||"Server not found. Check the server ID.");
  const join=await db.from("server_members").insert({server_id:check.data.id,user_id:user.id,role:"member"});
  if(join.error){if(join.error.code==="23505")return toast("You are already a member.");return toast(join.error.message);}
  await loadServers();render();toast("Joined "+check.data.name+".");
};


// Custom mobile-friendly dialogs instead of browser-native prompt boxes.
let nameResolve=null, joinResolve=null;
function askForName(kind){
  $("createTitle").textContent=kind==="server"?"Create a server":"Create a channel";
  $("createName").value="";
  $("createName").placeholder=kind==="server"?"e.g. Gaming Community":"e.g. general";
  $("createTopic").closest("label").style.display=kind==="server"?"block":"none";
  $("createDialog").showModal();
  $("createName").focus();
  return new Promise(resolve=>{nameResolve=resolve;});
}
$("createForm").addEventListener("submit",e=>{
  e.preventDefault();const value=$("createName").value.trim();
  if(!value)return;
  const resolve=nameResolve;nameResolve=null;if(resolve)resolve(value);$("createDialog").close();
});
$("createDialog").addEventListener("close",()=>{if(nameResolve){nameResolve(null);nameResolve=null;}});
function askForServerId(){
  $("joinServerId").value="";$("joinError").textContent="";
  $("joinDialog").showModal();$("joinServerId").focus();
  return new Promise(resolve=>{joinResolve=resolve;});
}
$("joinForm").addEventListener("submit",e=>{
  e.preventDefault();const value=$("joinServerId").value.trim();
  if(!value){$("joinError").textContent="Please enter a server ID.";return;}
  const resolve=joinResolve;joinResolve=null;if(resolve)resolve(value);$("joinDialog").close();
});
$("joinDialog").addEventListener("close",()=>{if(joinResolve){joinResolve(null);joinResolve=null;}});
$("menuCreateServer").onclick=()=>{$("serverMenuDialog").close();$("newServer").click();};
$("menuJoinServer").onclick=()=>{$("serverMenuDialog").close();$("joinServer").click();};

// Discord-style navigation shell and mobile drawers.
function showFriends(){if(!user)return $("auth").showModal();$("friendsDialog").showModal();refreshFriends();}
$("openFriendsNav").onclick=showFriends;$("openFriendsSmall").onclick=showFriends;$("friendsButton").onclick=showFriends;
$("openDmsNav").onclick=async()=>{if(!user)return $("auth").showModal();$("dmDialog").showModal();await refreshFriends();renderDmFriends();};
$("homeNav").onclick=()=>{document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.id==="homeNav"));document.querySelector(".channels")?.classList.remove("open");};
$("serverMenu").onclick=()=>{if(!user)return $("auth").showModal();$("serverMenuDialog").showModal();};
function renderDmFriends(){const root=$("dmFriends");root.replaceChildren();const rows=friendCache.filter(f=>f.status==="accepted");if(!rows.length){$("dmStatus").textContent="Add or accept friends first. Direct message conversations need the DM database setup to be enabled.";return;}for(const f of rows){const id=f.requester_id===user.id?f.addressee_id:f.requester_id;const item=document.createElement("div");item.className="friend-row";const label=document.createElement("span");label.textContent="Friend · "+id;const button=document.createElement("button");button.textContent="Open DM";button.onclick=()=>{$("dmStatus").textContent="DM UI selected. The current database schema needs its conversation policies wired before private messages can be sent.";};item.append(label,button);root.append(item);}}
