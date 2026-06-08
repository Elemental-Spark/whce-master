'use strict';
const $ = id => document.getElementById(id);
const screens = ['nameScreen','lobbyScreen','roomScreen','gameScreen'];
const state = {
  clientId: localStorage.getItem('wce.mp.clientId') || ('client-' + Math.random().toString(16).slice(2) + Date.now().toString(16)),
  name: localStorage.getItem('wce.mp.name') || '',
  room: null,
  lobby: null,
  ready: false,
  mySlot: -1,
  currentTurn: 0,
  bridgeReady: false,
  waitingForShot: false,
  gameRoomId: '',
  lastBotKey: '',
  lastSeq: 0,
  lastStateToken: 0,
  lastShotToken: 0,
  spectating: false,
  polling: false,
  roomConfigDirty: false,
  roomConfigEditing: false,
  serverTime: 0,
  serverReceivedAt: 0,
  gameLoadingRoomId: '',
  pendingStateSync: null,
  pendingStateSyncAt: 0,
  pageId: 'page-' + Math.random().toString(16).slice(2) + Date.now().toString(16),
  openRoomDetails: Object.create(null),
  explicitExitInProgress: false,
  serverAdvancedOpen: false,
  serverMenuOpen: false,
  serverMenuMode: 'room',
  focusResumeBusy: false,
  shotRequestBusy: false,
  optimisticShotEchoPending: false,
  chat: [],
  lastFocusResumeAt: 0,
  lastAuthoritativeTurnToken: 0,
  recoverBusy: false,
  lastRecoverAt: 0
};
localStorage.setItem('wce.mp.clientId', state.clientId);
const WCE_MP_BUSY_SYNC_GRACE_MS = 900;
const WARHEADS_EXIT_URL = 'https://elementalspark.com/#warheads';
const WARHEADS_MENU_URL = new URL('../../index.html#warheads', window.location.href).href;
function clearLocalGameSession(){
  try{ const frame=$('gameFrame'); if(frame) frame.src='about:blank'; }catch(e){}
  state.room=null; state.gameRoomId=''; state.gameLoadingRoomId=''; state.waitingForShot=false; state.bridgeReady=false;
  state.pendingStateSync=null; state.pendingStateSyncAt=0; state.lastBotKey=''; state.lastShotToken=0; state.lastStateToken=0; state.spectating=false; state.mySlot=-1;
  state.lastSeq=0; state.serverTime=0; state.serverReceivedAt=0;
}
function replaceLocation(url){
  try{ window.location.replace(url); }
  catch(e){ window.location.href = url; }
}
async function returnToWarheadsMenuOrFallback(){
  clearLocalGameSession();
  // Normal exit target is the WarHeads game main menu. The public website hash is only the fallback.
  try{
    const res = await fetch(WARHEADS_MENU_URL.split('#')[0], { method:'GET', cache:'no-store', credentials:'same-origin' });
    if(res && res.ok){ replaceLocation(WARHEADS_MENU_URL); return; }
  }catch(e){}
  replaceLocation(WARHEADS_EXIT_URL);
}
function hardExitToWarheads(){ returnToWarheadsMenuOrFallback(); }
async function explicitLeaveToMenu(){
  if(state.explicitExitInProgress) return;
  state.explicitExitInProgress = true;
  clearLocalGameSession();
  try{ await api('resetSession', { explicit:true }); }catch(e){ console.warn(e); }
  try{ sessionStorage.removeItem('wce.mp.roomId'); sessionStorage.removeItem('wce.mp.activeRoomId'); sessionStorage.removeItem('wce.mp.launch'); }catch(e){}
  await returnToWarheadsMenuOrFallback();
}
function show(id){ screens.forEach(s => { const el=$(s); if(el) el.classList.toggle('hidden', s !== id); }); }
function visible(id){ const el=$(id); return el && !el.classList.contains('hidden'); }
function setErr(text){ if($('nameError')) $('nameError').textContent = text || ''; }
function escapeHtml(s){ return String(s||'').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }
function participants(room){ return (room && Array.isArray(room.participants) && room.participants.length) ? room.participants : ((room && room.players) || []); }
function isHost(room=state.room){ return !!room && room.hostId === state.clientId; }
function serverNow(){ return state.serverTime ? state.serverTime + ((Date.now() - state.serverReceivedAt) / 1000) : (Date.now()/1000); }
function roomTimeLeft(room=state.room){ if(!room) return 0; const start=+room.turnStartedAt||0; const len=+room.turnLength||120; return start ? Math.max(0, len - (serverNow() - start)) : len; }

function noteActiveRoom(room){
  try{ if(room && room.id){ sessionStorage.setItem('wce.mp.roomId', room.id); sessionStorage.setItem('wce.mp.activeRoomId', room.id); } }catch(e){}
}
function lastKnownRoomId(){
  try{ return (state.room&&state.room.id) || state.gameRoomId || state.gameLoadingRoomId || sessionStorage.getItem('wce.mp.activeRoomId') || sessionStorage.getItem('wce.mp.roomId') || ''; }
  catch(e){ return (state.room&&state.room.id) || state.gameRoomId || state.gameLoadingRoomId || ''; }
}
async function recoverRoomSession(reason='recover'){
  if(state.explicitExitInProgress) return false;
  const rid=lastKnownRoomId();
  if(!rid) return false;
  const now=Date.now();
  if(state.recoverBusy || now-(state.lastRecoverAt||0)<1200) return true;
  state.recoverBusy=true; state.lastRecoverAt=now;
  try{
    const j=await api('recoverRoom',{roomId:rid, reason});
    if(j && j.room){ renderRoom(j.room, j.chat||[]); if(j.room.state==='running') startGame(j.room); updateTurnOverlay(); return true; }
    // Stay inside multiplayer instead of dumping mobile browsers to the public main menu.
    if(!visible('lobbyScreen') && !visible('roomScreen') && !visible('gameScreen')) show('lobbyScreen');
    return false;
  }catch(e){ console.warn('[WCE-MP] room recover failed', e); return false; }
  finally{ state.recoverBusy=false; }
}

function parseJsonSafe(raw, fallback={}){
  try{ const v=JSON.parse(raw||'null'); return v && typeof v==='object' && !Array.isArray(v) ? v : fallback; }
  catch(e){ return fallback; }
}
const WCE_MP_DEFAULTS_KEY='wce.mp.hostServerDefaults.v2';
function hostAdvancedSettings(){
  let m=parseJsonSafe(localStorage.getItem('warheads.modSettings'), {});
  const num=(k,d)=>{ const v=Number(m[k]); return Number.isFinite(v) ? v : d; };
  return {
    ...m,
    cleanupIntervalMs:num('cleanupIntervalMs',4500),
    cleanupMaxPlanetHoles:num('cleanupMaxPlanetHoles',54),
    cleanupMaxPlanetChunks:num('cleanupMaxPlanetChunks',36),
    oatDelayMs:num('oatDelayMs',220),
    oatPayloadStage:num('oatPayloadStage',1),
    maxLiveShots:num('maxLiveShots',128),
    warheadsPerTurn:num('warheadsPerTurn',156),
    maxParticles:num('maxParticles',900),
    maxBeams:num('maxBeams',170),
    maxTrailPoints:num('maxTrailPoints',58),
    heavySfxCap:num('heavySfxCap',5),
    lightSfxCap:num('lightSfxCap',9),
    planetCapBase:num('planetCapBase',14),
    planetCapPerPlayer:num('planetCapPerPlayer',5),
    planetDestructionScale:num('planetDestructionScale',1),
    planetBuildScale:num('planetBuildScale',1),
    planetRepairScale:num('planetRepairScale',1),
    worldWidthBase:num('worldWidthBase',2800),
    worldHeightBase:num('worldHeightBase',1800),
    gravityStrength:num('gravityStrength',0.22),
    gravityMaxPull:num('gravityMaxPull',0.18),
    maxShotSpeed:num('maxShotSpeed',18),
    softHoming:num('softHoming',0.034),
    homingBoost:num('homingBoost',0.12),
    planetStyle:m.planetStyle || localStorage.getItem('warheads.planetStyle') || 'random'
  };
}
function loadHostServerDefaults(){
  const saved=parseJsonSafe(localStorage.getItem(WCE_MP_DEFAULTS_KEY), {});
  const mods={...hostAdvancedSettings(), ...(saved.modSettings||{})};
  delete mods.oatDelayMs; delete mods.oatPayloadStage;
  const fromSelect=(id,d)=>{ const el=$(id); return el && el.value ? el.value : d; };
  return {
    maxPlayers: Number(saved.maxPlayers || fromSelect('roomPlayers', 2)) || 2,
    bots: Number(saved.bots || fromSelect('roomBots', 0)) || 0,
    turnLength: Number(saved.turnLength || fromSelect('roomTurn', 120)) || 120,
    physics: saved.physics || fromSelect('roomPhysics', 'bounce') || 'bounce',
    allowLateJoin: saved.allowLateJoin !== undefined ? !!saved.allowLateJoin : true,
    allowSpectators: saved.allowSpectators !== undefined ? !!saved.allowSpectators : true,
    modSettings: mods
  };
}
function saveHostServerDefaults(payload){
  try{
    const clean={...payload, modSettings:{...(payload.modSettings||{})}};
    delete clean.modSettings.oatDelayMs; delete clean.modSettings.oatPayloadStage;
    localStorage.setItem(WCE_MP_DEFAULTS_KEY, JSON.stringify(clean));
  }catch(e){}
}
function applyCreateDefaultsToLobbyForm(){
  const d=loadHostServerDefaults();
  if($('roomPlayers')) $('roomPlayers').value=String(Math.max(1,Math.min(16,+d.maxPlayers||2)));
  if($('roomBots')) $('roomBots').value=String(Math.max(0,Math.min(8,+d.bots||0)));
  if($('roomTurn')) $('roomTurn').value=String([60,90,120].includes(+d.turnLength)?+d.turnLength:120);
  if($('roomPhysics')) $('roomPhysics').value=(d.physics==='teleport'?'teleport':'bounce');
}
function serverSummaryHtml(data){
  const mods=(data&&data.modSettings)||{};
  const bits=[`${escapeHtml(data.maxPlayers||2)} Humans`, `${escapeHtml(data.bots||0)} Bots`, `${escapeHtml(data.turnLength||120)}s Turns`, data.physics==='teleport'?'Teleport Wrap':'Wall Bounce'];
  if(data.allowLateJoin) bits.push('Late Join ON'); else bits.push('Late Join OFF');
  if(data.allowSpectators) bits.push('Spectate ON'); else bits.push('Spectate OFF');
  const adv=[];
  if(mods.planetStyle) adv.push(`Planet ${escapeHtml(mods.planetStyle)}`);
  if(mods.cleanupIntervalMs) adv.push(`Cleanup ${escapeHtml(mods.cleanupIntervalMs)}ms`);
  if(mods.maxLiveShots) adv.push(`Shots ${escapeHtml(mods.maxLiveShots)}`);
  if(mods.maxParticles) adv.push(`Particles ${escapeHtml(mods.maxParticles)}`);
  if(mods.planetCapBase) adv.push(`Planets ${escapeHtml(mods.planetCapBase)}`);
  return `<div class="serverSummary"><b>${bits.join(' · ')}</b>${adv.length?`<span>${adv.join(' · ')}</span>`:''}</div>`;
}
function safeRoomMods(room){ return room && room.modSummary ? room.modSummary : 'Gold defaults'; }
function roomDetailsHtml(r){
  const mods=r.modSettings||{};
  const base=`${escapeHtml(r.turnLength)}s turns · ${escapeHtml(r.physics)} · ${r.allowLateJoin?'Late join ON':'Late join OFF'} · ${r.allowSpectators?'Spectate ON':'Spectate OFF'}`;
  const adv=[];
  if(mods.planetStyle) adv.push(`Planet ${escapeHtml(mods.planetStyle)}`);
  if(mods.cleanupIntervalMs) adv.push(`Cleanup ${escapeHtml(mods.cleanupIntervalMs)}ms`);
  if(mods.cleanupMaxPlanetHoles) adv.push(`Max holes ${escapeHtml(mods.cleanupMaxPlanetHoles)}`);
  if(mods.maxLiveShots) adv.push(`Live shots ${escapeHtml(mods.maxLiveShots)}`);
  if(mods.maxParticles) adv.push(`Particles ${escapeHtml(mods.maxParticles)}`);
  if(mods.planetCapBase) adv.push(`Planet cap ${escapeHtml(mods.planetCapBase)}`);
  return `<div class="roomDetails"><b>Server Options</b><br>${base}${adv.length?'<br><b>Advanced</b><br>'+adv.join(' · '):''}<br><b>Mods</b><br>${escapeHtml(safeRoomMods(r))}</div>`;
}
function ensureHostGameControls(){
  const gameScreen=$('gameScreen'); if(!gameScreen) return;
  if(!$('mpHostDrawer')){
    const drawer=document.createElement('div'); drawer.id='mpHostDrawer'; drawer.className='mpHostDrawer hidden';
    drawer.innerHTML='<button id="mpHostDrawerToggle" class="mpHostDrawerToggle" type="button" aria-expanded="false">HOST TOOLS</button><div class="mpHostDrawerPanel" role="group" aria-label="Host tools"><button id="mpTerrainClear" title="Clear messy terrain but keep the match alive">CLEAR TERRAIN</button><label class="mpTerrainBatch">Terrain x <input id="mpTerrainCount" type="range" min="1" max="20" value="8"><span id="mpTerrainCountText">8</span></label><button id="mpTerrainGenerate" title="Generate fresh terrain chunks">GENERATE TERRAIN</button><button id="mpRoomInfo" title="Show active room options and mods">ROOM DETAILS</button></div>';
    gameScreen.appendChild(drawer);
    $('mpHostDrawerToggle').onclick=()=>{ const open=!drawer.classList.contains('open'); drawer.classList.toggle('open',open); $('mpHostDrawerToggle').setAttribute('aria-expanded',open?'true':'false'); };
    const terrainCount=()=>Math.max(1,Math.min(20,parseInt(($('mpTerrainCount')&&$('mpTerrainCount').value)||8,10)||8));
    if($('mpTerrainCount')) $('mpTerrainCount').oninput=()=>{ if($('mpTerrainCountText')) $('mpTerrainCountText').textContent=terrainCount(); };
    $('mpTerrainClear').onclick=()=>{ if(confirm('Host: clear messy terrain for this room?')) { const b=bridge(); if(b&&b.hostTerrain) b.hostTerrain('clear', terrainCount()); else api('hostTerrain',{kind:'clear', count:terrainCount()}).catch(alertErr); } };
    $('mpTerrainGenerate').onclick=()=>{ const n=terrainCount(); if(confirm('Host: generate '+n+' fresh terrain chunks for this room?')) { const b=bridge(); if(b&&b.hostTerrain) b.hostTerrain('generate', n); else api('hostTerrain',{kind:'generate', count:n}).catch(alertErr); } };
    $('mpRoomInfo').onclick=()=>alert(`${state.room?state.room.name:'Room'}\n\nPlayers: ${participants(state.room).length}\nTurn: ${(activeParticipant()||{}).name||'Pilot'}\nMods: ${safeRoomMods(state.room)}\nLate Join: ${state.room&&state.room.allowLateJoin?'ON':'OFF'}\nSpectate: ${state.room&&state.room.allowSpectators?'ON':'OFF'}`);
  }
  const drawer=$('mpHostDrawer');
  const showHost=state.room && isHost() && state.room.state==='running';
  drawer.classList.toggle('hidden',!showHost);
  if(!showHost){ drawer.classList.remove('open'); const t=$('mpHostDrawerToggle'); if(t) t.setAttribute('aria-expanded','false'); }
}

async function api(action, payload={}){
  const body = { action, clientId:state.clientId, lastSeq:state.lastSeq, ...payload };
  const res = await fetch('api.php?v=0.7.69', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body), cache:'no-store' });
  const raw = await res.text();
  let json = null;
  try { json = raw ? JSON.parse(raw) : null; }
  catch(e){ throw new Error('Server returned invalid JSON. The room data file may be damaged or PHP errored. Raw: '+raw.slice(0,180)); }
  if(!json) throw new Error('Server returned a blank response.');
  if(!json.ok && json.message) throw new Error(json.message);
  handleApi(json);
  return json;
}
function renderChat(el, chat=[]){ if(!el) return; el.innerHTML = chat.map(m => m.system ? `<div class="msg system">${escapeHtml(m.text)}</div>` : `<div class="msg"><b>${escapeHtml(m.name||'Pilot')}:</b> ${escapeHtml(m.text)}</div>`).join(''); el.scrollTop = el.scrollHeight; }

function ensureInGameRoomChat(){
  const gameScreen=$('gameScreen'); if(!gameScreen) return null;
  let dock=$('mpGameChatDock');
  if(!dock){
    dock=document.createElement('div'); dock.id='mpGameChatDock'; dock.className='mpGameChatDock closed';
    dock.innerHTML='<button id="mpGameChatToggle" type="button">CHAT</button><div class="mpGameChatPanel"><div class="roomChatSafety"><b>Safety:</b> Never share personal information, addresses, passwords, private accounts, phone numbers, contact details, or real-world plans.</div><div id="mpGameRoomChat" class="chat"></div><div class="chatInput"><input id="mpGameRoomChatInput" maxlength="220" placeholder="Room message"><button id="mpGameSendRoomChat" type="button">SEND</button></div></div>';
    gameScreen.appendChild(dock);
    $('mpGameChatToggle').onclick=()=>{ dock.classList.toggle('closed'); localStorage.setItem('wce.mp.gameChatClosed', dock.classList.contains('closed')?'1':'0'); };
    $('mpGameSendRoomChat').onclick=()=>{ const i=$('mpGameRoomChatInput'); if(!i) return; api('chat',{text:i.value}).catch(alertErr); i.value=''; };
    $('mpGameRoomChatInput').addEventListener('keydown', e=>{ if(e.key==='Enter') $('mpGameSendRoomChat').click(); });
  }
  const enabled=roomChatSlideoutEnabled();
  dock.classList.toggle('hidden', !enabled);
  if(enabled) dock.classList.toggle('closed', localStorage.getItem('wce.mp.gameChatClosed')==='1');
  return dock;
}
function renderRoomChats(chat=[]){
  renderChat($('roomChat'), chat || []);
  ensureInGameRoomChat();
  renderChat($('mpGameRoomChat'), chat || []);
}

function readLocalWeaponPacksForMp(){
  let raw=[];
  try{
    const parsed=JSON.parse(localStorage.getItem('warheads.weaponPacks')||'[]');
    if(Array.isArray(parsed)) raw=parsed;
    else if(parsed && Array.isArray(parsed.packs)) raw=parsed.packs;
    else if(parsed && typeof parsed==='object') raw=Object.values(parsed).filter(v=>v&&typeof v==='object');
  }catch(e){ raw=[]; }
  const out=[
    {id:'gold',name:'Default + My Weapons'},
    {id:'pack:experimental',name:'Experimental'},
    {id:'generated',name:'Generated Chaos + My Weapons'},
    {id:'saved',name:'My Weapons Only'},
    {id:'all',name:'ALL Weapons'}
  ];
  const seen=new Set(out.map(p=>p.id));
  raw.forEach(p=>{
    const id=String((p&&(p.id||p.key||p.name))||'').trim();
    if(id && !seen.has(id)){ seen.add(id); out.push({id,name:String(p.name||p.title||id).slice(0,40)}); }
  });
  return out;
}
function selectedMpPack(){
  const sel=$('mpPlayerPackSelect');
  const val=String((sel&&sel.value)||localStorage.getItem('wce.mp.playerPackChoice')||localStorage.getItem('warheads.playerPackChoice')||'gold');
  try{ localStorage.setItem('wce.mp.playerPackChoice', val); localStorage.setItem('warheads.playerPackChoice', val); }catch(e){}
  return val;
}
function saveSelectedMpPackToServer(){
  const choice=selectedMpPack(), label=selectedMpPackLabel();
  if(state.room){ api('setPlayerPack',{packChoice:choice, packLabel:label}).catch(alertErr); }
}
function selectedMpPackLabel(){
  const id=selectedMpPack();
  const p=readLocalWeaponPacksForMp().find(x=>x.id===id);
  return p ? p.name : id;
}
function populateMpPlayerPrefs(){
  const packSel=$('mpPlayerPackSelect');
  if(packSel){
    const old=packSel.value || localStorage.getItem('wce.mp.playerPackChoice') || localStorage.getItem('warheads.playerPackChoice') || 'gold';
    packSel.innerHTML=readLocalWeaponPacksForMp().map(p=>`<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join('');
    packSel.value=[...packSel.options].some(o=>o.value===old)?old:'gold';
    packSel.onchange=()=>{ selectedMpPack(); saveSelectedMpPackToServer(); syncRoomPersonalPackControl(); };
    selectedMpPack();
  }
  const chatSel=$('mpRoomChatSlideout');
  if(chatSel){
    chatSel.value=(localStorage.getItem('wce.mp.roomChatSlideout')==='off')?'off':'on';
    chatSel.onchange=()=>{ localStorage.setItem('wce.mp.roomChatSlideout', chatSel.value==='off'?'off':'on'); applyRoomChatDock(); };
  }
}
function roomChatSlideoutEnabled(){ return localStorage.getItem('wce.mp.roomChatSlideout') !== 'off'; }
function playerPackLine(p){
  const label=String((p&&(p.packLabel||p.packChoice))||'Default + My Weapons').slice(0,48);
  return `<span class="packTag">Pack: ${escapeHtml(label)}</span>`;
}

function ensureRoomPersonalPackControl(){
  const playersCard = $('players') ? $('players').closest('.card') : null;
  if(!playersCard || $('roomPersonalPackBox')) return;
  const box=document.createElement('div');
  box.id='roomPersonalPackBox';
  box.className='roomPersonalPackBox';
  box.innerHTML='<div><b>Your Weapon Pack</b><span>Stored per-player on this server.</span></div><select id="roomPlayerPackSelect"></select><button id="roomPlayerPackApply" type="button">APPLY PACK</button>';
  playersCard.appendChild(box);
  const sel=$('roomPlayerPackSelect');
  const apply=()=>{
    if($('mpPlayerPackSelect')) $('mpPlayerPackSelect').value=sel.value;
    selectedMpPack();
    saveSelectedMpPackToServer();
  };
  sel.onchange=apply;
  $('roomPlayerPackApply').onclick=apply;
}
function syncRoomPersonalPackControl(room=state.room){
  ensureRoomPersonalPackControl();
  const sel=$('roomPlayerPackSelect'); if(!sel) return;
  const old=sel.value || selectedMpPack();
  sel.innerHTML=readLocalWeaponPacksForMp().map(p=>`<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join('');
  let mine=null;
  const parts=participants(room||{});
  mine=parts.find(p=>p&&p.clientId===state.clientId) || ((room&&room.players)||[]).find(p=>p&&p.clientId===state.clientId) || null;
  const chosen=(mine&&(mine.packChoice||mine.pack)) || old || 'gold';
  sel.value=[...sel.options].some(o=>o.value===chosen)?chosen:'gold';
  if($('mpPlayerPackSelect')) $('mpPlayerPackSelect').value=sel.value;
  try{ localStorage.setItem('wce.mp.playerPackChoice', sel.value); localStorage.setItem('warheads.playerPackChoice', sel.value); }catch(e){}
}
function ensureRoomChatDockControls(){
  const card=document.querySelector('#roomScreen .chatCard'); if(!card) return;
  if(!card.querySelector('.roomChatSafety')){
    const safety=document.createElement('div'); safety.className='roomChatSafety'; safety.innerHTML='<b>Safety:</b> Never share personal information, addresses, passwords, private accounts, phone numbers, contact details, or real-world plans.';
    const chat=card.querySelector('#roomChat'); if(chat) card.insertBefore(safety, chat);
  }
  if(!card.querySelector('.roomChatDockButton')){
    const b=document.createElement('button'); b.type='button'; b.className='roomChatDockButton'; b.textContent='CHAT';
    b.onclick=()=>{ card.classList.toggle('closed'); localStorage.setItem('wce.mp.roomChatDockClosed', card.classList.contains('closed')?'1':'0'); };
    card.insertBefore(b, card.firstChild);
  }
  if($('hostOptions') && !$('toggleRoomChatDock')){
    const row=document.createElement('div'); row.className='chatDockToggleRow'; row.innerHTML='<button type="button" id="toggleRoomChatDock">ROOM CHAT</button>';
    $('hostOptions').appendChild(row);
    row.querySelector('button').onclick=()=>{ localStorage.setItem('wce.mp.roomChatSlideout','on'); if($('mpRoomChatSlideout')) $('mpRoomChatSlideout').value='on'; applyRoomChatDock(false); };
  }
}
function applyRoomChatDock(forceOpen){
  const card=document.querySelector('#roomScreen .chatCard'); if(!card) return;
  ensureRoomChatDockControls();
  const on=roomChatSlideoutEnabled();
  document.body.classList.toggle('roomChatDockDisabled', !on);
  card.classList.toggle('roomChatDocked', on);
  if(on){
    if(forceOpen===true) card.classList.remove('closed');
    else card.classList.toggle('closed', localStorage.getItem('wce.mp.roomChatDockClosed')==='1');
  } else card.classList.remove('closed');
}
async function createHostedRoomStable(ev){
  if(ev){ ev.preventDefault(); ev.stopPropagation(); }
  const btn=$('createRoom'); if(btn && btn.dataset.busy==='1') return;
  const old=btn?btn.textContent:'';
  try{
    if(btn){ btn.dataset.busy='1'; btn.disabled=true; btn.textContent='CREATING...'; }
    const nameEl=$('nameInput');
    const name=String(state.name || (nameEl&&nameEl.value) || localStorage.getItem('wce.mp.name') || 'Pilot').trim().slice(0,20) || 'Pilot';
    await api('hello', {name});
    const preset=loadHostServerDefaults();
    const packChoice=selectedMpPack();
    const payload={
      name:$('roomName').value || `${state.name || name || 'Pilot'}'s Game`,
      maxPlayers:+$('roomPlayers').value || preset.maxPlayers,
      bots:+$('roomBots').value || preset.bots,
      turnLength:+$('roomTurn').value || preset.turnLength,
      physics:$('roomPhysics').value || preset.physics,
      allowLateJoin:!!preset.allowLateJoin,
      allowSpectators:!!preset.allowSpectators,
      modSettings:{...(preset.modSettings||{})},
      packChoice,
      packLabel:selectedMpPackLabel()
    };
    saveHostServerDefaults(payload);
    const j=await api('createRoom', payload);
    if(j && j.message && /set a name|failed|error/i.test(j.message)) throw new Error(j.message);
  }catch(e){ alertErr(e); }
  finally{ if(btn){ btn.dataset.busy='0'; btn.disabled=false; btn.textContent=old || 'CREATE HOSTED GAME'; } }
}

function hostOptionsHtml(){
  const data=state.room ? {maxPlayers:state.room.maxPlayers,bots:state.room.bots,turnLength:state.room.turnLength,physics:state.room.physics,allowLateJoin:state.room.allowLateJoin,allowSpectators:state.room.allowSpectators,modSettings:state.room.modSettings||{}} : loadHostServerDefaults();
  return `
    <div class="serverConfigPanel serverConfigCompact">
      <div class="serverConfigHeader">
        <div><b>Server Setup</b><span>Uses the host's saved defaults. Open Edit Server for the full main-menu style setup.</span></div>
      </div>
      <div id="serverSummaryBox">${serverSummaryHtml(data)}</div>
      <div class="serverActionRow compactActions">
        <button id="openServerEditor" class="primary wideAction" type="button">EDIT SERVER</button>
      </div>
      <div id="cfgStatus" class="sub wide">Server settings loaded from host defaults.</div>
    </div>`;
}
function serverMenuFieldHtml(){
  const opts=(arr)=>arr.map(v=>`<option value="${v[0]}">${v[1]}</option>`).join('');
  return `
    <div class="serverMenuTabs" role="tablist" aria-label="Server edit pages">
      <button type="button" data-server-tab="setup" class="active">Setup</button>
      <button type="button" data-server-tab="planets">Planets</button>
      <button type="button" data-server-tab="physics">Physics</button>
      <button type="button" data-server-tab="chaos">Cleanup / FX</button>
    </div>
    <div class="serverMenuPage open" data-server-page="setup">
      <label class="field">Humans<select id="cfgPlayers">${Array.from({length:16},(_,i)=>`<option>${i+1}</option>`).join('')}</select></label>
      <label class="field">Bots<select id="cfgBots">${Array.from({length:9},(_,i)=>`<option>${i}</option>`).join('')}</select></label>
      <label class="field">Turns<select id="cfgTurn"><option>60</option><option>90</option><option>120</option></select></label>
      <label class="field">Missed Shots<select id="cfgPhysics"><option value="bounce">Wall Bounce</option><option value="teleport">Teleport Wrap</option></select></label>
      <label class="field check"><input id="cfgLateJoin" type="checkbox"> Allow Late Join</label>
      <label class="field check"><input id="cfgSpectate" type="checkbox"> Allow Spectators</label>
      <div class="serverMenuNote">These are the normal room launch controls. They become visible in Server Details for everyone.</div>
    </div>
    <div class="serverMenuPage" data-server-page="planets">
      <label class="field">Planet Style<select id="cfgPlanetStyle">${opts([['random','Random Mix'],['classic','Classic'],['bubble','Bubble Worlds'],['hex','Hex Grid'],['crystal','Crystal Shards'],['eightbit','8-Bit Blocks'],['pixel16','16-Bit Glow'],['future','Futuristic Alloy'],['rings','Orbital Rings'],['lava','Lava Core'],['ice','Ice Crystal'],['desert','Desert Ruins'],['ocean','Oceanic'],['void','Void Neon']])}</select></label>
      <label class="field">Planet Cap Base<input id="cfgPlanetCap" type="number" min="2" max="18" step="1"></label>
      <label class="field">Planet Cap Per Player<input id="cfgPlanetCapPerPlayer" type="number" min="0" max="2.5" step="0.1"></label>
      <label class="field">Destruction Scale<input id="cfgPlanetDestructionScale" type="number" min="0.1" max="6" step="0.05"></label>
      <label class="field">Build / Create Scale<input id="cfgPlanetBuildScale" type="number" min="0.1" max="4" step="0.05"></label>
      <label class="field">Repair Scale<input id="cfgPlanetRepairScale" type="number" min="0.1" max="4" step="0.05"></label>
      <label class="field">World Width Base<input id="cfgWorldWidthBase" type="number" min="1600" max="5200" step="100"></label>
      <label class="field">World Height Base<input id="cfgWorldHeightBase" type="number" min="1000" max="3200" step="100"></label>
    </div>
    <div class="serverMenuPage" data-server-page="physics">
      <label class="field">Gravity Strength<input id="cfgGravityStrength" type="number" min="0" max="1.2" step="0.01"></label>
      <label class="field">Gravity Max Pull<input id="cfgGravityMaxPull" type="number" min="0" max="0.6" step="0.01"></label>
      <label class="field">Max Shot Speed<input id="cfgMaxShotSpeed" type="number" min="4" max="70" step="0.5"></label>
      <label class="field">Soft Homing<input id="cfgSoftHoming" type="number" min="0" max="0.18" step="0.001"></label>
      <label class="field">Homing Boost<input id="cfgHomingBoost" type="number" min="0" max="0.7" step="0.01"></label>
      <div class="serverMenuNote">Physics defaults copy from the host's local Advanced Options and travel with the room.</div>
    </div>
    <div class="serverMenuPage" data-server-page="chaos">
      <label class="field">Cleanup ms<input id="cfgCleanupMs" type="number" min="1000" max="30000" step="250"></label>
      <label class="field">Max Holes<input id="cfgCleanupHoles" type="number" min="18" max="120" step="1"></label>
      <label class="field">Max Chunks<input id="cfgCleanupChunks" type="number" min="4" max="80" step="1"></label>
      <label class="field">Live Shots<input id="cfgMaxShots" type="number" min="16" max="220" step="4"></label>
      <label class="field">Warheads / Turn<input id="cfgWarheads" type="number" min="12" max="260" step="4"></label>
      <label class="field">Particles<input id="cfgParticles" type="number" min="80" max="1400" step="20"></label>
      <label class="field">Max Beams<input id="cfgMaxBeams" type="number" min="4" max="140" step="4"></label>
      <label class="field">Max Trail Points<input id="cfgMaxTrail" type="number" min="8" max="140" step="2"></label>
      <label class="field">Heavy SFX Cap<input id="cfgHeavySfx" type="number" min="1" max="12" step="1"></label>
      <label class="field">Light SFX Cap<input id="cfgLightSfx" type="number" min="2" max="24" step="1"></label>
    </div>`;
}
function ensureServerMenuModal(){
  let modal = $('serverMenuModal');
  if(modal) return modal;
  modal = document.createElement('div');
  modal.id = 'serverMenuModal';
  modal.className = 'serverMenuModal';
  modal.setAttribute('aria-hidden','true');
  modal.innerHTML = `
    <div class="serverMenuBackdrop" data-server-menu-close="1"></div>
    <section class="serverMenuWindow" role="dialog" aria-modal="true" aria-labelledby="serverMenuTitle">
      <button id="serverMenuClose" class="panelX" type="button" aria-label="Close server editor">X</button>
      <div class="panelTitle" id="serverMenuTitle">Server Editor</div>
      <div class="serverMenuLead">Main-menu style room setup. The host's saved defaults load automatically; Apply saves them and updates the room.</div>
      ${serverMenuFieldHtml()}
      <div class="serverMenuActions">
        <button id="applyCfg" class="primary applyServerBtn" type="button">APPLY / SAVE SERVER SETTINGS</button>
        <button id="serverMenuDone" class="secondary" type="button">DONE / CLOSE</button>
      </div>
      <div id="serverMenuStatus" class="sub wide">Server settings loaded.</div>
    </section>`;
  document.body.appendChild(modal);
  return modal;
}
function ensureAdvancedServerModal(){ return ensureServerMenuModal(); }
function setServerStatus(text){ ['cfgStatus','serverMenuStatus'].forEach(id=>{ const el=$(id); if(el) el.textContent=text; }); }
function hostOptionsActive(){
  const panel=$('hostOptions'), modal=$('serverMenuModal'), active=document.activeElement;
  return !!(state.roomConfigDirty || state.roomConfigEditing || state.serverMenuOpen || state.serverAdvancedOpen || (active && ((panel&&panel.contains(active)) || (modal&&modal.contains(active)))));
}
function markHostOptionsDirty(){ state.roomConfigDirty=true; state.roomConfigEditing=true; setServerStatus('Unsaved server setting changes.'); }
function currentEditorSource(room){
  if(room){ return {maxPlayers:room.maxPlayers,bots:room.bots,turnLength:room.turnLength,physics:room.physics,allowLateJoin:room.allowLateJoin,allowSpectators:room.allowSpectators,modSettings:{...hostAdvancedSettings(), ...(room.modSettings||{})}}; }
  return loadHostServerDefaults();
}
function syncHostOptionsFromRoom(room){
  const data=currentEditorSource(room||null);
  const mods=data.modSettings||{};
  const set=(id,val)=>{ const el=$(id); if(el && val!==undefined && val!==null) el.value=String(val); };
  const chk=(id,val)=>{ const el=$(id); if(el) el.checked=!!val; };
  set('cfgPlayers', data.maxPlayers); set('cfgBots', data.bots); set('cfgTurn', data.turnLength); set('cfgPhysics', data.physics);
  chk('cfgLateJoin', data.allowLateJoin); chk('cfgSpectate', data.allowSpectators);
  set('cfgPlanetStyle', mods.planetStyle || 'random'); set('cfgCleanupMs', mods.cleanupIntervalMs || 4500); set('cfgCleanupHoles', mods.cleanupMaxPlanetHoles || 54); set('cfgCleanupChunks', mods.cleanupMaxPlanetChunks || 36);
  set('cfgMaxShots', mods.maxLiveShots || 128); set('cfgWarheads', mods.warheadsPerTurn || 156); set('cfgParticles', mods.maxParticles || 900); set('cfgMaxBeams', mods.maxBeams || 170); set('cfgMaxTrail', mods.maxTrailPoints || 58); set('cfgHeavySfx', mods.heavySfxCap || 5); set('cfgLightSfx', mods.lightSfxCap || 9);
  set('cfgPlanetCap', mods.planetCapBase || 14); set('cfgPlanetCapPerPlayer', mods.planetCapPerPlayer ?? 5); set('cfgPlanetDestructionScale', mods.planetDestructionScale || 1); set('cfgPlanetBuildScale', mods.planetBuildScale || 1); set('cfgPlanetRepairScale', mods.planetRepairScale || 1); set('cfgWorldWidthBase', mods.worldWidthBase || 2800); set('cfgWorldHeightBase', mods.worldHeightBase || 1800);
  set('cfgGravityStrength', mods.gravityStrength ?? 0.22); set('cfgGravityMaxPull', mods.gravityMaxPull ?? 0.18); set('cfgMaxShotSpeed', mods.maxShotSpeed || 18); set('cfgSoftHoming', mods.softHoming ?? 0.034); set('cfgHomingBoost', mods.homingBoost ?? 0.12);
  if($('serverSummaryBox')) $('serverSummaryBox').innerHTML=serverSummaryHtml(data);
  setServerStatus(room ? 'Server settings loaded.' : 'Host defaults loaded.');
}
function readHostOptionsPayload(){
  const source = state.serverMenuMode==='defaults' ? loadHostServerDefaults() : currentEditorSource(state.room||null);
  const mods={...hostAdvancedSettings(), ...(source.modSettings||{})};
  const num=(id,d)=>{ const v=Number($(id)?.value); return Number.isFinite(v) ? v : d; };
  mods.planetStyle = $('cfgPlanetStyle')?.value || mods.planetStyle || 'random';
  mods.cleanupIntervalMs = num('cfgCleanupMs', mods.cleanupIntervalMs || 4500);
  mods.cleanupMaxPlanetHoles = num('cfgCleanupHoles', mods.cleanupMaxPlanetHoles || 54);
  mods.cleanupMaxPlanetChunks = num('cfgCleanupChunks', mods.cleanupMaxPlanetChunks || Math.max(8, Math.min(80, Math.round((mods.cleanupMaxPlanetHoles||54)*0.66))));
  mods.maxLiveShots = num('cfgMaxShots', mods.maxLiveShots || 128);
  mods.warheadsPerTurn = num('cfgWarheads', mods.warheadsPerTurn || 156);
  mods.maxParticles = num('cfgParticles', mods.maxParticles || 900);
  mods.maxBeams = num('cfgMaxBeams', mods.maxBeams || 170);
  mods.maxTrailPoints = num('cfgMaxTrail', mods.maxTrailPoints || 58);
  mods.heavySfxCap = num('cfgHeavySfx', mods.heavySfxCap || 5);
  mods.lightSfxCap = num('cfgLightSfx', mods.lightSfxCap || 9);
  mods.planetCapBase = num('cfgPlanetCap', mods.planetCapBase || 14);
  mods.planetCapPerPlayer = num('cfgPlanetCapPerPlayer', mods.planetCapPerPlayer ?? 5);
  mods.planetDestructionScale = num('cfgPlanetDestructionScale', mods.planetDestructionScale || 1);
  mods.planetBuildScale = num('cfgPlanetBuildScale', mods.planetBuildScale || 1);
  mods.planetRepairScale = num('cfgPlanetRepairScale', mods.planetRepairScale || 1);
  mods.worldWidthBase = num('cfgWorldWidthBase', mods.worldWidthBase || 2800);
  mods.worldHeightBase = num('cfgWorldHeightBase', mods.worldHeightBase || 1800);
  mods.gravityStrength = num('cfgGravityStrength', mods.gravityStrength ?? 0.22);
  mods.gravityMaxPull = num('cfgGravityMaxPull', mods.gravityMaxPull ?? 0.18);
  mods.maxShotSpeed = num('cfgMaxShotSpeed', mods.maxShotSpeed || 18);
  mods.softHoming = num('cfgSoftHoming', mods.softHoming ?? 0.034);
  mods.homingBoost = num('cfgHomingBoost', mods.homingBoost ?? 0.12);
  delete mods.oatDelayMs; delete mods.oatPayloadStage;
  return {
    maxPlayers:+($('cfgPlayers')?.value || source.maxPlayers || 2),
    bots:+($('cfgBots')?.value || source.bots || 0),
    turnLength:+($('cfgTurn')?.value || source.turnLength || 120),
    physics:$('cfgPhysics')?.value || source.physics || 'bounce',
    allowLateJoin:!!$('cfgLateJoin')?.checked,
    allowSpectators:!!$('cfgSpectate')?.checked,
    modSettings:mods
  };
}
function showServerMenuPage(name){
  document.querySelectorAll('[data-server-page]').forEach(p=>p.classList.toggle('open', p.dataset.serverPage===name));
  document.querySelectorAll('[data-server-tab]').forEach(b=>b.classList.toggle('active', b.dataset.serverTab===name));
}
function setServerMenuOpen(open, mode='room'){
  const modal=ensureServerMenuModal();
  state.serverMenuOpen=!!open; state.serverAdvancedOpen=!!open; state.roomConfigEditing=!!open || state.roomConfigEditing; state.serverMenuMode=mode||'room';
  if(open){
    const title=$('serverMenuTitle'); if(title) title.textContent = mode==='defaults' ? 'Server Defaults' : 'Server Editor';
    syncHostOptionsFromRoom(mode==='defaults' ? null : state.room);
    showServerMenuPage('setup');
  }
  modal.classList.toggle('open', !!open); modal.setAttribute('aria-hidden', open?'false':'true');
  document.body.classList.toggle('serverAdvancedIsOpen', !!open);
  if(open){ setTimeout(()=>{ const first=$('cfgPlayers') || $('serverMenuClose'); if(first) first.focus({preventScroll:true}); },20); }
}
function installHostOptionsHandlers(){
  const panel=$('hostOptions');
  ensureServerMenuModal();
  if(panel){
    panel.addEventListener('focusin',()=>{ state.roomConfigEditing=true; });
    panel.addEventListener('focusout',()=>setTimeout(()=>{ if(!state.serverMenuOpen) state.roomConfigEditing=false; },160));
    panel.addEventListener('pointerdown',()=>{ state.roomConfigEditing=true; });
  }
  const editableIds=['cfgPlayers','cfgBots','cfgTurn','cfgPhysics','cfgLateJoin','cfgSpectate','cfgPlanetStyle','cfgCleanupMs','cfgCleanupHoles','cfgCleanupChunks','cfgMaxShots','cfgWarheads','cfgParticles','cfgMaxBeams','cfgMaxTrail','cfgHeavySfx','cfgLightSfx','cfgPlanetCap','cfgPlanetCapPerPlayer','cfgPlanetDestructionScale','cfgPlanetBuildScale','cfgPlanetRepairScale','cfgWorldWidthBase','cfgWorldHeightBase','cfgGravityStrength','cfgGravityMaxPull','cfgMaxShotSpeed','cfgSoftHoming','cfgHomingBoost'];
  function markAllEditable(){ editableIds.forEach(id=>{ const el=$(id); if(!el || el.dataset.wceBound) return; el.dataset.wceBound='1'; el.addEventListener('input',markHostOptionsDirty); el.addEventListener('change',markHostOptionsDirty); }); }
  markAllEditable();
  document.querySelectorAll('[data-server-tab]').forEach(b=>{ if(!b.dataset.bound){ b.dataset.bound='1'; b.addEventListener('click',()=>showServerMenuPage(b.dataset.serverTab)); }});
  const applySettings = () => {
    const payload=readHostOptionsPayload();
    saveHostServerDefaults(payload);
    applyCreateDefaultsToLobbyForm();
    setServerStatus(state.serverMenuMode==='defaults' ? 'Server defaults saved.' : 'Applying server settings...');
    if(state.serverMenuMode==='defaults' || !state.room){ state.roomConfigDirty=false; state.roomConfigEditing=false; if($('serverSummaryBox')) $('serverSummaryBox').innerHTML=serverSummaryHtml(payload); return; }
    api('roomConfig', payload).then(()=>{ state.roomConfigDirty=false; state.roomConfigEditing=false; setServerStatus('Server settings applied and saved as your defaults.'); if($('serverSummaryBox')) $('serverSummaryBox').innerHTML=serverSummaryHtml(payload); }).catch(alertErr);
  };
  const bindClick=(id,fn)=>{ const el=$(id); if(el && !el.dataset.boundClick){ el.dataset.boundClick='1'; el.addEventListener('click',fn); } };
  bindClick('openServerEditor',(ev)=>{ ev.preventDefault(); ev.stopPropagation(); setServerMenuOpen(true,'room'); });
  bindClick('editServerDefaults',(ev)=>{ ev.preventDefault(); ev.stopPropagation(); setServerMenuOpen(true,'defaults'); });
  bindClick('applyCfg', applySettings);
  bindClick('serverMenuDone',(ev)=>{ ev.preventDefault(); ev.stopPropagation(); setServerMenuOpen(false,state.serverMenuMode); });
  bindClick('serverMenuClose',(ev)=>{ ev.preventDefault(); ev.stopPropagation(); setServerMenuOpen(false,state.serverMenuMode); });
  const modal=$('serverMenuModal');
  if(modal && !modal.dataset.wceModalBound){
    modal.dataset.wceModalBound='1';
    modal.querySelectorAll('[data-server-menu-close]').forEach(el=>el.addEventListener('click',(ev)=>{ ev.preventDefault(); ev.stopPropagation(); setServerMenuOpen(false,state.serverMenuMode); }));
  }
  if(!window.__wceServerEscInstalled){ window.__wceServerEscInstalled=true; window.addEventListener('keydown', ev=>{ if(ev.key==='Escape' && state.serverMenuOpen) setServerMenuOpen(false,state.serverMenuMode); }, {capture:true}); }
}

function renderLobby(lobby){
  state.lobby = lobby || state.lobby;
  if($('connStatus')) $('connStatus').textContent = 'Connected through website host · PHP polling';
  const rooms = $('rooms'); const list = (state.lobby && state.lobby.rooms) || [];
  if(rooms){
    if(!list.length){ rooms.classList.add('empty'); rooms.textContent='No rooms yet.'; }
    else{
      rooms.classList.remove('empty');
      const activeIds = Object.create(null);
      list.forEach(r => { activeIds[r.id]=true; });
      Object.keys(state.openRoomDetails || {}).forEach(id => { if(!activeIds[id]) delete state.openRoomDetails[id]; });
      rooms.innerHTML = list.map(r => {
        const q=(r.lateJoiners||[]).length;
        const open=!!state.openRoomDetails[r.id];
        const host=r.hostId===state.clientId;
        const editBtn=host ? `<button type="button" data-edit-server="${escapeHtml(r.id)}">EDIT SERVER</button>` : '';
        return `<div class="row roomRow ${open?'detailsOpen':''}" data-room-row="${escapeHtml(r.id)}"><div><b>${escapeHtml(r.name)}</b><div class="sub">${r.players.length}/${r.maxPlayers} humans · ${r.bots} bots · ${r.state}${q?' · '+q+' late queued':''}</div>${roomDetailsHtml(r)}</div><div class="roomButtons">${editBtn}<button type="button" data-details="${escapeHtml(r.id)}" aria-expanded="${open?'true':'false'}">DETAILS</button><button type="button" data-spec="${escapeHtml(r.id)}" ${r.allowSpectators?'':'disabled'}>SPECTATE</button><button type="button" data-join="${escapeHtml(r.id)}" ${(r.state==='lobby'||r.allowLateJoin)?'':'disabled'}>JOIN</button></div></div>`;
      }).join('');
      rooms.querySelectorAll('[data-join]').forEach(b => b.onclick = (ev) => { ev.preventDefault(); ev.stopPropagation(); const packChoice=selectedMpPack(); api('joinRoom', { roomId:b.dataset.join, packChoice, packLabel:selectedMpPackLabel() }).catch(alertErr); });
      rooms.querySelectorAll('[data-spec]').forEach(b => b.onclick = (ev) => { ev.preventDefault(); ev.stopPropagation(); api('spectateRoom', { roomId:b.dataset.spec }).catch(alertErr); });
      rooms.querySelectorAll('[data-details]').forEach(b => b.onclick = (ev) => { ev.preventDefault(); ev.stopPropagation(); const id=b.dataset.details; state.openRoomDetails[id]=!state.openRoomDetails[id]; const row=b.closest('.roomRow'); const open=!!state.openRoomDetails[id]; if(row) row.classList.toggle('detailsOpen', open); b.setAttribute('aria-expanded', open?'true':'false'); });
      rooms.querySelectorAll('[data-edit-server]').forEach(b => b.onclick = (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        const id=b.dataset.editServer;
        if(state.room && state.room.id===id){ show('roomScreen'); renderRoom(state.room, []); return; }
        api('poll').then(()=>{ if(state.room && state.room.id===id){ show('roomScreen'); renderRoom(state.room, []); } else alertErr(new Error('Open this host room from the same browser session to edit server settings.')); }).catch(alertErr);
      });
    }
  }
  renderChat($('lobbyChat'), (state.lobby && state.lobby.chat) || []);
}

function renderRoom(room, chat){
  if(!room) return;
  state.room = room;
  noteActiveRoom(room);
  const parts = participants(room);
  state.mySlot = parts.findIndex(p => p.clientId === state.clientId);
  const queuedLate = !!((room.lateJoiners||[]).find(q => (q.id||q.clientId) === state.clientId));
  state.spectating = !!(room.spectators && room.spectators[state.clientId]) || queuedLate;
  if(state.mySlot < 0) state.mySlot = (room.players || []).findIndex(p => p.clientId === state.clientId);
  state.currentTurn = room.turn || 0;
  if($('roomTitle')) $('roomTitle').textContent = room.name;
  if($('roomInfo')) { const q=(room.lateJoiners||[]).length; $('roomInfo').textContent = `${(room.players||[]).length}/${room.maxPlayers} humans · ${room.bots} bots · ${room.turnLength}s turns · ${room.physics}${q?' · '+q+' late queued':''}`; }
  if($('players')) $('players').innerHTML = (room.players||[]).map(p => `<div class="row"><div><b>${escapeHtml(p.name)}</b><div class="sub">Human Slot ${p.slot+1}${p.clientId===room.hostId?' · HOST':''}<br>${playerPackLine(p)}</div></div><span class="tag">${p.ready?'READY':'WAITING'}</span>${isHost(room)&&p.clientId!==state.clientId?`<button data-kick="${escapeHtml(p.clientId)}">KICK</button><button data-ban="${escapeHtml(p.clientId)}">BAN</button>`:''}</div>`).join('') + (room.state==='running' && parts.some(p=>p.bot) ? parts.filter(p=>p.bot).map(p=>`<div class="row"><div><b>${escapeHtml(p.name)}</b><div class="sub">Bot Slot ${p.slot+1}</div></div><span class="tag">BOT</span></div>`).join('') : '') + ((room.lateJoiners||[]).length ? (room.lateJoiners||[]).map(q=>`<div class="row"><div><b>${escapeHtml(q.name||'Pilot')}</b><div class="sub">Entering after current turn<br>${playerPackLine(q)}</div></div><span class="tag">LATE QUEUE</span></div>`).join('') : '');
  syncRoomPersonalPackControl(room);
  if($('players')) { $('players').querySelectorAll('[data-kick]').forEach(b=>b.onclick=()=>{ if(confirm('Kick this player?')) api('kickPlayer',{targetId:b.dataset.kick}).catch(alertErr); }); $('players').querySelectorAll('[data-ban]').forEach(b=>b.onclick=()=>{ if(confirm('Ban this player from this room?')) api('banPlayer',{targetId:b.dataset.ban}).catch(alertErr); }); }
  if($('startRoom')) $('startRoom').style.display = isHost(room) && room.state === 'lobby' ? '' : 'none';
  if($('closeRoom')) $('closeRoom').style.display = isHost(room) ? '' : 'none';
  const hostPanel=$('hostOptions');
  const canEditHostOptions=isHost(room) && room.state === 'lobby';
  if(hostPanel){
    if(canEditHostOptions){
      if(!hostPanel.dataset.hostOptionsReady){
        hostPanel.innerHTML=hostOptionsHtml();
        hostPanel.dataset.hostOptionsReady='1';
        installHostOptionsHandlers();
      }
      if(!hostOptionsActive()) syncHostOptionsFromRoom(room);
    } else {
      hostPanel.dataset.hostOptionsReady='';
      hostPanel.innerHTML=`<div class="sub">Host controls room settings before launch.</div>`;
      state.roomConfigDirty=false;
      state.roomConfigEditing=false;
    }
  }
  renderRoomChats(chat || []);
  if(room.state === 'running') {
    if(!visible('gameScreen')) startGame(room);
    else { const b=bridge(); if(b && b.syncRoster) b.syncRoster(room); updateTurnOverlay(); }
  } else if(!visible('gameScreen')) show('roomScreen');
}
function startGame(room){
  if(!room) return;
  state.room = room; state.currentTurn = room.turn || 0; noteActiveRoom(room);
  const startParts = participants(room);
  const startSlot = startParts.findIndex(p => p && p.clientId === state.clientId);
  if(startSlot >= 0) state.mySlot = startSlot;
  show('gameScreen');
  const iframe = $('gameFrame');
  const sameRoom = state.gameRoomId === room.id || state.gameLoadingRoomId === room.id;
  if(sameRoom && iframe && iframe.src && iframe.src !== 'about:blank'){
    ensureHostGameControls();
    updateTurnOverlay();
    return;
  }
  state.bridgeReady = false;
  state.waitingForShot = false;
  state.lastBotKey = '';
  state.gameRoomId = room.id;
  state.gameLoadingRoomId = room.id;
  state.lastShotToken = 0;
  state.lastStateToken = 0;
  const launch = `${state.pageId}-${Date.now()}`;
  iframe.src = `game/WarHeads%20Classic%20Enhanced%20Multiplayer.html?mp=1&room=${encodeURIComponent(room.id)}&mpSeed=${encodeURIComponent(room.seed)}&launch=${encodeURIComponent(launch)}`;
  ensureHostGameControls();
  ensureInGameRoomChat();
  renderRoomChats(state.chat || []);
  updateTurnOverlay();
}
function game(){ return $('gameFrame').contentWindow; }
function bridge(){ try { return game().WCE_MP; } catch { return null; } }
function activeParticipant(){ const parts = participants(state.room); return parts[state.currentTurn] || null; }
function updateTurnOverlay(){
  if(!state.room){ if($('turnBadge')) $('turnBadge').textContent = 'No room'; return; }
  if((state.room.turnPhase || 'idle') === 'idle') state.waitingForShot = false;
  if(!state.bridgeReady && bridge()) state.bridgeReady = true;
  const active = activeParticipant();
  const mine = active && !active.bot && active.clientId === state.clientId;
  const bot = active && active.bot;
  const hostBotAuthority = !!(bot && isHost());
  const authority = !!(!state.spectating && (mine || hostBotAuthority));
  const locked = state.spectating || !mine || state.waitingForShot || !state.bridgeReady;
  const left = Math.ceil(roomTimeLeft(state.room));
  const timeText = Number.isFinite(left) && left > 0 ? ` · ${left}s` : '';
  const queuedLate = !!((state.room.lateJoiners||[]).find(q => (q.id||q.clientId) === state.clientId));
  if($('turnBadge')) $('turnBadge').textContent = queuedLate ? `JOINED LATE · entering after current turn${timeText}` : (state.spectating ? `SPECTATING · ${active ? active.name : 'Pilot'} turn${timeText}` : (bot ? `BOT TURN · ${active.name}${timeText}` : (mine ? (state.waitingForShot ? `SHOT SENT · ${active.name}` : `YOUR TURN · ${active.name}${timeText}`) : `WAITING · ${active ? active.name : 'Pilot'} is aiming${timeText}`)));
  const b = bridge();
  if(b && b.setTurnAuthority) b.setTurnAuthority(authority, Math.max(0,left));
  if(b && b.setControlLock) b.setControlLock(locked);
  ensureHostGameControls();
  ensureInGameRoomChat();
  maybeRunHostBotTurn();
}
function maybeRunHostBotTurn(){
  const active = activeParticipant();
  if(!active || !active.bot || !isHost() || !state.bridgeReady || state.waitingForShot) return;
  const key = `${state.room.id}:${state.currentTurn}:${state.room.seed}:${Date.now() >> 12}`;
  if(state.lastBotKey && state.lastBotKey.startsWith(`${state.room.id}:${state.currentTurn}:`)) return;
  state.lastBotKey = key;
  state.waitingForShot = true;
  setTimeout(() => {
    const b = bridge();
    if(!b || !b.forceBotTurn){ state.waitingForShot=false; updateTurnOverlay(); return; }
    try { b.forceBotTurn(); }
    catch(e){ state.waitingForShot=false; api('turnFinished', { state: b.exportState ? b.exportState() : null }).catch(alertErr); }
  }, 850);
}
function handleApi(json){
  if(json.serverTime){ state.serverTime = +json.serverTime; state.serverReceivedAt = Date.now(); }
  if(json.client && json.client.name){ state.name = json.client.name; localStorage.setItem('wce.mp.name', state.name); }
  if(json.client && !json.client.roomId && state.room && (visible('gameScreen') || visible('roomScreen'))){
    // v0.7.66: mobile browsers can briefly lose/refresh their PHP client session during play.
    // Do not dump them to the main menu automatically; try to reclaim/rejoin the running room first.
    if(!state.explicitExitInProgress) recoverRoomSession('client missing room after poll');
    return;
  }
  if(json.lobby) renderLobby(json.lobby);
  if(json.room) {
    renderRoom(json.room, json.chat || []);
    // v0.7.49 focus-resume guard: if the authoritative server says the turn is idle,
    // never leave this browser stuck in SHOT SENT / disabled controls after tabbing away.
    if((json.room.turnPhase || 'idle') === 'idle') state.waitingForShot = false;
    state.currentTurn = json.room.turn || 0;
  }
  if(json.chat){ state.chat=json.chat; renderRoomChats(json.chat); }
  if(json.message) console.log('[WCE-MP]', json.message);
  (json.events || []).forEach(handleEvent);
  if(json.syncBaseline && json.serverSeq) state.lastSeq = Math.max(state.lastSeq, +json.serverSeq || 0);
}

function applyStateSyncEvent(ev){
  state.waitingForShot = false;
  state.shotRequestBusy = false;
  if(ev.room) state.room = ev.room;
  state.currentTurn = ev.turn || 0;
  if(state.room) state.room.turn = state.currentTurn;
  if(ev.state && typeof ev.state === 'object'){
    ev.state.turn = state.currentTurn;
    if(state.room && state.room.turnLength) ev.state.roundLeft = state.room.turnLength;
    ev.state.busy = false;
  }
  const b = bridge();
  if(b && b.clearShotLock) b.clearShotLock();
  if(b && b.importState && ev.state) { b.importState(ev.state); if(b.syncRoster && state.room) b.syncRoster(state.room); }
  else if(ev.state) state.pendingStateSync = ev;
  state.pendingStateSyncAt = 0;
  state.lastBotKey = '';
  updateTurnOverlay();
}
function drainPendingStateSync(force=false){
  const ev = state.pendingStateSync;
  if(!ev || !ev.state) return;
  const b = bridge();
  const waited = Date.now() - (state.pendingStateSyncAt || Date.now());
  // v0.7.66: happy-medium sync. Give slow clients a brief moment to finish the local
  // explosion, but do not let one busy canvas hold everyone in WAIT forever.
  if(!force && b && b.isBusy && b.isBusy() && waited < WCE_MP_BUSY_SYNC_GRACE_MS){
    setTimeout(() => drainPendingStateSync(false), 120);
    return;
  }
  state.pendingStateSync = null;
  state.pendingStateSyncAt = 0;
  applyStateSyncEvent(ev);
}
function handleEvent(ev){
  if(ev.seq && ev.seq <= state.lastSeq) return;
  if(ev.seq){ state.lastSeq = ev.seq; }
  switch(ev.type){
    case 'room': if(ev.room) { renderRoom(ev.room, ev.chat || []); const b=bridge(); if(b && b.syncRoster && ev.room.state==='running') b.syncRoster(ev.room); } break;
    case 'lateJoinQueued': if(ev.room) { renderRoom(ev.room, ev.chat || []); updateTurnOverlay(); } break;
    case 'lateJoinCommit': { if(ev.room) state.room = ev.room; const b=bridge(); if(b && b.syncRoster && ev.room) b.syncRoster(ev.room, true); if(ev.message) console.log('[WCE-MP]', ev.message); if(ev.room) renderRoom(ev.room, ev.chat || []); break; }
    case 'chat': if(ev.scope === 'room') { state.chat=ev.chat||[]; renderRoomChats(state.chat); } else renderChat($('lobbyChat'), ev.chat || []); break;
    case 'startGame': startGame(ev.room || state.room); break;
    case 'shot': {
      if(ev.turnToken && ev.turnToken <= state.lastShotToken) break;
      if(ev.room) state.room = ev.room;
      if(Number.isFinite(+ev.slot)){ state.currentTurn = +ev.slot; if(state.room) state.room.turn = state.currentTurn; }
      if(ev.turnToken) state.lastShotToken = ev.turnToken;
      state.shotRequestBusy = false;
      state.waitingForShot = true; updateTurnOverlay();
      const b = bridge();
      if(ev.from === state.clientId && state.optimisticShotEchoPending){
        state.optimisticShotEchoPending = false;
        break;
      }
      if(b && b.applyShot) b.applyShot(ev.input || {});
      break;
    }
    case 'stateSync': {
      if(ev.turnToken && ev.turnToken <= state.lastStateToken) break;
      if(ev.turnToken) state.lastStateToken = ev.turnToken;
      const b = bridge();
      if(b && b.isBusy && b.isBusy() && !ev.snapshot){
        state.pendingStateSync = ev;
        state.pendingStateSyncAt = Date.now();
        setTimeout(() => drainPendingStateSync(false), 120);
        break;
      }
      applyStateSyncEvent(ev);
      break;
    }
    case 'hostTerrain': { const b=bridge(); if(b && b.hostTerrain) b.hostTerrain(ev.kind || ev.terrainKind || 'clear', ev.count || ev.terrainCount || 8); break; }
    case 'roomEnded': alert(ev.message || 'Room closed.'); try{ api('resetSession').catch(console.warn); }catch(e){} hardExitToWarheads(); break;
  }
}
function alertErr(e){ alert(e && e.message ? e.message : String(e)); }
async function poll(){
  if(state.polling) return;
  state.polling = true;
  try{ await api('poll'); }catch(e){ if($('connStatus')) $('connStatus').textContent = 'Connection problem. Check PHP permissions/upload path.'; console.warn(e); }
  state.polling = false;
}
async function resumeAfterFocus(){
  if(state.explicitExitInProgress) return;
  const now = Date.now();
  if(state.focusResumeBusy || now - (state.lastFocusResumeAt || 0) < 450) return;
  state.focusResumeBusy = true;
  state.lastFocusResumeAt = now;
  try{
    state.polling = false; // fetch/timer throttling can leave the old polling lock set while the tab slept.
    const b = bridge();
    if(b){
      state.bridgeReady = true;
      if(b.resumeFromFocus) b.resumeFromFocus({ room:state.room, slot:state.mySlot });
    }
    if(state.room || visible('gameScreen') || visible('roomScreen')) await api('poll');
    const b2 = bridge();
    if(b2 && state.room){
      if(b2.syncRoster) b2.syncRoster(state.room);
      if(state.pendingStateSync && state.pendingStateSync.state){ drainPendingStateSync(true); }
    }
    if(state.room && (state.room.turnPhase || 'idle') === 'idle') state.waitingForShot = false;
    updateTurnOverlay();
  }catch(e){ console.warn('[WCE-MP] focus resume failed', e); }
  finally{ state.focusResumeBusy = false; }
}
window.addEventListener('focus', resumeAfterFocus);
document.addEventListener('visibilitychange', () => { if(!document.hidden) resumeAfterFocus(); });
window.addEventListener('pagehide', () => { state.polling=false; });
window.addEventListener('pageshow', resumeAfterFocus);
window.addEventListener('message', ev => {
  const frame = $('gameFrame');
  if(frame && frame.contentWindow && ev.source !== frame.contentWindow) return;
  const m = ev.data || {}; if(m.source !== 'WCE_MP_GAME') return;
  if(m.type === 'bridgeReady') { state.bridgeReady = true; state.gameLoadingRoomId=''; const b = bridge(); if(b && state.room) b.start(state.room, state.mySlot); if(b && b.importState && state.pendingStateSync && state.pendingStateSync.state){ b.importState(state.pendingStateSync.state); if(b.syncRoster && state.room) b.syncRoster(state.room); state.pendingStateSync=null; } else if(b && b.syncRoster && state.room){ b.syncRoster(state.room); } updateTurnOverlay(); }
  if(m.type === 'ready') updateTurnOverlay();
  if(m.type === 'localShot') {
    const active = activeParticipant();
    const b = bridge();
    if(active && !active.bot && active.clientId === state.clientId && !state.waitingForShot && !state.shotRequestBusy){
      state.shotRequestBusy = true;
      state.optimisticShotEchoPending = !!(m.payload && m.payload.optimistic);
      state.waitingForShot = true;
      updateTurnOverlay();
      api('shot', { input:m.payload.input }).then(j => {
        if(j && j.message && /not your turn|shot already|not running/i.test(j.message)){
          state.shotRequestBusy=false; state.waitingForShot=false;
          const bb=bridge(); if(bb && bb.clearShotLock) bb.clearShotLock();
          updateTurnOverlay(); alertErr(new Error(j.message));
        } else {
          setTimeout(() => api('poll').catch(console.warn), 120);
        }
      }).catch(e => {
        state.shotRequestBusy=false; state.waitingForShot=false;
        const bb=bridge(); if(bb && bb.clearShotLock) bb.clearShotLock();
        updateTurnOverlay(); alertErr(e);
      });
    } else if(b && b.clearShotLock && (!active || active.clientId !== state.clientId || state.waitingForShot || state.shotRequestBusy)){
      b.clearShotLock();
      updateTurnOverlay();
    }
  }
  if(m.type === 'turnFinished') {
    const active = activeParticipant();
    const allowed = active && ((!active.bot && active.clientId === state.clientId) || (active.bot && isHost()));
    if(allowed) api('turnFinished', { state:m.payload.state, previousTurn:m.payload.previousTurn, turn:m.payload.turn, turnToken: state.room ? state.room.turnToken : 0 }).catch(alertErr);
  }
  if(m.type === 'gameOver') api('gameOver', { title:m.payload.title || 'Game over' }).catch(alertErr);
  if(m.type === 'hostTerrainState') api('hostTerrain', { kind:m.payload.kind || 'terrain', count:m.payload.count || 8, state:m.payload.state || null }).catch(alertErr);
  if(m.type === 'error') console.warn(m.payload && m.payload.message);
});
$('enterLobby').onclick = async () => { try{ const j=await api('hello', { name:$('nameInput').value }); if(j.ok){ setErr(''); show('lobbyScreen'); } }catch(e){ setErr(e.message); } };
$('nameInput').value = state.name || '';
$('nameInput').addEventListener('keydown', e => { if(e.key === 'Enter') $('enterLobby').click(); });
$('refreshLobby').onclick = () => poll();
if($('resetSession')) $('resetSession').onclick = () => { if(confirm('Reset your multiplayer session and return to the WarHeads main menu?')) explicitLeaveToMenu(); };
$('createRoom').onclick = createHostedRoomStable;
$('leaveRoom').onclick = () => { if(confirm('Leave this room and return to the WarHeads main menu?')) explicitLeaveToMenu(); };
if($('closeRoom')) $('closeRoom').onclick = () => { if(confirm('Close this room for everyone?')) api('closeRoom').catch(alertErr); };
$('startRoom').onclick = () => api('startRoom').catch(alertErr);
$('readyBtn').onclick = () => { state.ready = !state.ready; api('setReady', { ready:state.ready }).catch(alertErr); $('readyBtn').textContent = state.ready ? 'UNREADY' : 'READY'; };
$('sendLobbyChat').onclick = () => { let i=$('lobbyChatInput'); api('chat', { text:i.value }).catch(alertErr); i.value=''; };
$('sendRoomChat').onclick = () => { let i=$('roomChatInput'); api('chat', { text:i.value }).catch(alertErr); i.value=''; };
$('lobbyChatInput').addEventListener('keydown', e => { if(e.key === 'Enter') $('sendLobbyChat').click(); });
$('roomChatInput').addEventListener('keydown', e => { if(e.key === 'Enter') $('sendRoomChat').click(); });
$('mpLeave').onclick = () => { if(confirm('Leave this multiplayer game and return to the WarHeads main menu?')) explicitLeaveToMenu(); };

ensureServerMenuModal();
installHostOptionsHandlers();
populateMpPlayerPrefs();
applyCreateDefaultsToLobbyForm();
['roomPlayers','roomBots','roomTurn','roomPhysics'].forEach(id=>{ const el=$(id); if(el) el.addEventListener('change',()=>{ const d=loadHostServerDefaults(); d.maxPlayers=+$('roomPlayers').value||d.maxPlayers; d.bots=+$('roomBots').value||d.bots; d.turnLength=+$('roomTurn').value||d.turnLength; d.physics=$('roomPhysics').value||d.physics; saveHostServerDefaults(d); }); });
setInterval(() => { if(!(state.room && state.room.state==='running')) poll(); }, 1000);
setInterval(() => { if(state.room && state.room.state==='running') poll(); }, 300);
show('nameScreen');
poll();

/* v0.7.66 host pack lock / pack selector hardening */
(function(){
  'use strict';
  if(window.WCE_MP_0758_PACK_LOCK) return;
  window.WCE_MP_0758_PACK_LOCK = true;
  const V='v0.7.69';
  function safe(fn,d){ try{return fn()}catch(e){return d} }
  function normChoice(v){ v=String(v||'').trim(); return v || 'gold'; }
  function getLocalChoice(){ return normChoice(safe(()=>localStorage.getItem('wce.mp.playerPackChoice'), '') || safe(()=>localStorage.getItem('warheads.playerPackChoice'), '') || 'gold'); }
  function packList(){
    let list=[]; try{ list=(typeof readLocalWeaponPacksForMp==='function'?readLocalWeaponPacksForMp():[])||[]; }catch(e){ list=[]; }
    const out=[], seen=new Set();
    function add(id,name){ id=normChoice(id); if(!seen.has(id)){ seen.add(id); out.push({id,name:name||id}); } }
    add('gold','Default + My Weapons'); add('pack:experimental','Experimental'); add('generated','Generated Chaos + My Weapons'); add('saved','My Weapons Only'); add('all','ALL Weapons');
    list.forEach(p=>{ if(p&&p.id) add(p.id, p.name||p.id); });
    return out;
  }
  function labelFor(id){ id=normChoice(id); const p=packList().find(x=>x.id===id); return p ? p.name : (id==='gold'?'Default + My Weapons':id); }
  function fillSelect(sel, desired){
    if(!sel) return;
    const old=normChoice(desired || sel.value || getLocalChoice());
    sel.innerHTML=packList().map(p=>`<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join('');
    sel.value=[...sel.options].some(o=>o.value===old)?old:'gold';
  }
  function remember(choice){
    choice=normChoice(choice);
    try{ localStorage.setItem('wce.mp.playerPackChoice', choice); localStorage.setItem('warheads.playerPackChoice', choice); }catch(e){}
    const a=$('mpPlayerPackSelect'), b=$('roomPlayerPackSelect');
    if(a && [...a.options].some(o=>o.value===choice)) a.value=choice;
    if(b && [...b.options].some(o=>o.value===choice)) b.value=choice;
    return choice;
  }
  let pushBusy=false, lastPushKey='';
  function pushChoice(choice){
    choice=remember(choice);
    if(!state.room || pushBusy) return;
    const key=(state.room.id||'')+'|'+choice+'|'+labelFor(choice);
    if(key===lastPushKey) return;
    lastPushKey=key; pushBusy=true;
    api('setPlayerPack',{packChoice:choice, packLabel:labelFor(choice)}).catch(alertErr).finally(()=>{pushBusy=false;});
  }
  function currentSelectorChoice(){
    const roomSel=$('roomPlayerPackSelect'), lobbySel=$('mpPlayerPackSelect');
    return normChoice((roomSel&&roomSel.value) || (lobbySel&&lobbySel.value) || getLocalChoice());
  }
  try{
    selectedMpPack=function(){ return remember(currentSelectorChoice()); };
    selectedMpPackLabel=function(){ return labelFor(selectedMpPack()); };
  }catch(e){}
  const oldPopulate = typeof populateMpPlayerPrefs==='function' ? populateMpPlayerPrefs : null;
  if(oldPopulate){
    populateMpPlayerPrefs=function(){
      try{ oldPopulate.apply(this, arguments); }catch(e){}
      const desired=getLocalChoice();
      fillSelect($('mpPlayerPackSelect'), desired);
      const sel=$('mpPlayerPackSelect');
      if(sel){ sel.onchange=()=>{ remember(sel.value); pushChoice(sel.value); syncRoomPersonalPackControl(state.room); }; }
      const chatSel=$('mpRoomChatSlideout');
      if(chatSel){ chatSel.value=(localStorage.getItem('wce.mp.roomChatSlideout')==='off')?'off':'on'; chatSel.onchange=()=>{ localStorage.setItem('wce.mp.roomChatSlideout', chatSel.value==='off'?'off':'on'); applyRoomChatDock(); }; }
    };
  }
  const oldSyncRoomPack = typeof syncRoomPersonalPackControl==='function' ? syncRoomPersonalPackControl : null;
  syncRoomPersonalPackControl=function(room=state.room){
    try{ ensureRoomPersonalPackControl(); }catch(e){}
    const sel=$('roomPlayerPackSelect'); if(!sel){ if(oldSyncRoomPack) return oldSyncRoomPack.apply(this, arguments); return; }
    const parts=participants(room||{});
    const mine=parts.find(p=>p&&p.clientId===state.clientId) || ((room&&room.players)||[]).find(p=>p&&p.clientId===state.clientId) || null;
    const serverChoice=normChoice((mine&&(mine.packChoice||mine.pack))||'');
    const localChoice=getLocalChoice();
    const isRoomHost=!!(room && room.hostId===state.clientId);
    // Host's lobby selector is authoritative for the host. Do not let stale server echoes pull it back to Experimental.
    const chosen=(isRoomHost && (!room || room.state!=='running')) ? localChoice : (serverChoice||localChoice);
    fillSelect(sel, chosen);
    fillSelect($('mpPlayerPackSelect'), chosen);
    remember(chosen);
    sel.onchange=()=>{ remember(sel.value); pushChoice(sel.value); };
    const apply=$('roomPlayerPackApply'); if(apply) apply.onclick=()=>pushChoice(sel.value);
    if(isRoomHost && room && room.state!=='running' && serverChoice && serverChoice!==chosen){ pushChoice(chosen); }
  };
  const oldCreate = typeof createHostedRoomStable==='function' ? createHostedRoomStable : null;
  if(oldCreate){
    createHostedRoomStable=async function(ev){
      const choice=remember(($('mpPlayerPackSelect')&&$('mpPlayerPackSelect').value)||getLocalChoice());
      const out=await oldCreate.apply(this, arguments);
      setTimeout(()=>pushChoice(choice),160);
      return out;
    };
    const cr=$('createRoom'); if(cr) cr.onclick=createHostedRoomStable;
  }
  // Repaint selectors after the old startup pass.
  setTimeout(()=>{ try{ if(typeof populateMpPlayerPrefs==='function') populateMpPlayerPrefs(); if(state.room) syncRoomPersonalPackControl(state.room); }catch(e){} }, 30);
})();
