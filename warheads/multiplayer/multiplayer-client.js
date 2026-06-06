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
  pageId: 'page-' + Math.random().toString(16).slice(2) + Date.now().toString(16),
  openRoomDetails: Object.create(null),
  explicitExitInProgress: false
};
localStorage.setItem('wce.mp.clientId', state.clientId);
const WARHEADS_EXIT_URL = 'https://elementalspark.com/#warheads';
const WARHEADS_MENU_URL = new URL('../../index.html#warheads', window.location.href).href;
function clearLocalGameSession(){
  try{ const frame=$('gameFrame'); if(frame) frame.src='about:blank'; }catch(e){}
  state.room=null; state.gameRoomId=''; state.gameLoadingRoomId=''; state.waitingForShot=false; state.bridgeReady=false;
  state.pendingStateSync=null; state.lastBotKey=''; state.lastShotToken=0; state.lastStateToken=0; state.spectating=false; state.mySlot=-1;
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
  try{ sessionStorage.removeItem('wce.mp.roomId'); sessionStorage.removeItem('wce.mp.launch'); }catch(e){}
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

function hostAdvancedSettings(){
  try { return JSON.parse(localStorage.getItem('warheads.modSettings') || '{}') || {}; }
  catch(e){ return {}; }
}
function safeRoomMods(room){ return room && room.modSummary ? room.modSummary : 'Gold defaults'; }
function roomDetailsHtml(r){
  return `<div class="roomDetails"><b>Options</b><br>${escapeHtml(r.turnLength)}s turns · ${escapeHtml(r.physics)} · ${r.allowLateJoin?'Late join ON':'Late join OFF'} · ${r.allowSpectators?'Spectate ON':'Spectate OFF'}<br><b>Mods</b><br>${escapeHtml(safeRoomMods(r))}</div>`;
}
function ensureHostGameControls(){
  const gameScreen=$('gameScreen'); if(!gameScreen) return;
  if(!$('mpHostDrawer')){
    const drawer=document.createElement('div'); drawer.id='mpHostDrawer'; drawer.className='mpHostDrawer hidden';
    drawer.innerHTML='<button id="mpHostDrawerToggle" class="mpHostDrawerToggle" type="button" aria-expanded="false">HOST TOOLS</button><div class="mpHostDrawerPanel" role="group" aria-label="Host tools"><button id="mpTerrainClear" title="Clear messy terrain but keep the match alive">CLEAR TERRAIN</button><button id="mpTerrainGenerate" title="Generate fresh terrain chunks">GENERATE TERRAIN</button><button id="mpRoomInfo" title="Show active room options and mods">ROOM DETAILS</button></div>';
    gameScreen.appendChild(drawer);
    $('mpHostDrawerToggle').onclick=()=>{ const open=!drawer.classList.contains('open'); drawer.classList.toggle('open',open); $('mpHostDrawerToggle').setAttribute('aria-expanded',open?'true':'false'); };
    $('mpTerrainClear').onclick=()=>{ if(confirm('Host: clear messy terrain for this room?')) { const b=bridge(); if(b&&b.hostTerrain) b.hostTerrain('clear'); else api('hostTerrain',{kind:'clear'}).catch(alertErr); } };
    $('mpTerrainGenerate').onclick=()=>{ if(confirm('Host: generate fresh terrain for this room?')) { const b=bridge(); if(b&&b.hostTerrain) b.hostTerrain('generate'); else api('hostTerrain',{kind:'generate'}).catch(alertErr); } };
    $('mpRoomInfo').onclick=()=>alert(`${state.room?state.room.name:'Room'}\n\nPlayers: ${participants(state.room).length}\nTurn: ${(activeParticipant()||{}).name||'Pilot'}\nMods: ${safeRoomMods(state.room)}\nLate Join: ${state.room&&state.room.allowLateJoin?'ON':'OFF'}\nSpectate: ${state.room&&state.room.allowSpectators?'ON':'OFF'}`);
  }
  const drawer=$('mpHostDrawer');
  const showHost=state.room && isHost() && state.room.state==='running';
  drawer.classList.toggle('hidden',!showHost);
  if(!showHost){ drawer.classList.remove('open'); const t=$('mpHostDrawerToggle'); if(t) t.setAttribute('aria-expanded','false'); }
}

async function api(action, payload={}){
  const body = { action, clientId:state.clientId, lastSeq:state.lastSeq, ...payload };
  const res = await fetch('api.php', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body), cache:'no-store' });
  const json = await res.json();
  if(!json.ok && json.message) throw new Error(json.message);
  handleApi(json);
  return json;
}
function renderChat(el, chat=[]){ if(!el) return; el.innerHTML = chat.map(m => m.system ? `<div class="msg system">${escapeHtml(m.text)}</div>` : `<div class="msg"><b>${escapeHtml(m.name||'Pilot')}:</b> ${escapeHtml(m.text)}</div>`).join(''); el.scrollTop = el.scrollHeight; }
function hostOptionsHtml(){
  return `
    <label class="field">Humans<select id="cfgPlayers">${Array.from({length:16},(_,i)=>`<option>${i+1}</option>`).join('')}</select></label>
    <label class="field">Bots<select id="cfgBots">${Array.from({length:9},(_,i)=>`<option>${i}</option>`).join('')}</select></label>
    <label class="field">Turns<select id="cfgTurn"><option>60</option><option>90</option><option>120</option></select></label>
    <label class="field">Missed<select id="cfgPhysics"><option value="bounce">Wall Bounce</option><option value="teleport">Teleport Wrap</option></select></label>
    <label class="field check"><input id="cfgLateJoin" type="checkbox"> Allow Late Join</label>
    <label class="field check"><input id="cfgSpectate" type="checkbox"> Allow Spectators</label>
    <button id="applyCfg" class="primary">APPLY SERVER SETTINGS</button>
    <div id="cfgStatus" class="sub wide">Edit settings, then apply before launch.</div>`;
}
function hostOptionsActive(){
  const panel=$('hostOptions'), active=document.activeElement;
  return !!(panel && (state.roomConfigDirty || state.roomConfigEditing || (active && panel.contains(active))));
}
function markHostOptionsDirty(){ state.roomConfigDirty=true; state.roomConfigEditing=true; if($('cfgStatus')) $('cfgStatus').textContent='Unsaved room setting changes.'; }
function syncHostOptionsFromRoom(room){
  if($('cfgPlayers')) $('cfgPlayers').value = String(room.maxPlayers);
  if($('cfgBots')) $('cfgBots').value = String(room.bots);
  if($('cfgTurn')) $('cfgTurn').value = String(room.turnLength);
  if($('cfgPhysics')) $('cfgPhysics').value = room.physics;
  if($('cfgLateJoin')) $('cfgLateJoin').checked = !!room.allowLateJoin;
  if($('cfgSpectate')) $('cfgSpectate').checked = !!room.allowSpectators;
  if($('cfgStatus')) $('cfgStatus').textContent='Server settings loaded.';
}
function readHostOptionsPayload(){
  return {
    maxPlayers:+($('cfgPlayers')?.value || 4),
    bots:+($('cfgBots')?.value || 0),
    turnLength:+($('cfgTurn')?.value || 120),
    physics:$('cfgPhysics')?.value || 'bounce',
    allowLateJoin:!!$('cfgLateJoin')?.checked,
    allowSpectators:!!$('cfgSpectate')?.checked,
    modSettings:hostAdvancedSettings()
  };
}
function installHostOptionsHandlers(){
  const panel=$('hostOptions'); if(!panel) return;
  panel.addEventListener('focusin',()=>{ state.roomConfigEditing=true; });
  panel.addEventListener('focusout',()=>setTimeout(()=>{ state.roomConfigEditing=false; },160));
  panel.addEventListener('pointerdown',()=>{ state.roomConfigEditing=true; });
  ['cfgPlayers','cfgBots','cfgTurn','cfgPhysics','cfgLateJoin','cfgSpectate'].forEach(id=>{
    const el=$(id); if(!el) return;
    el.addEventListener('input',markHostOptionsDirty);
    el.addEventListener('change',markHostOptionsDirty);
  });
  if($('applyCfg')) $('applyCfg').onclick = () => {
    const payload=readHostOptionsPayload();
    if($('cfgStatus')) $('cfgStatus').textContent='Applying server settings...';
    api('roomConfig', payload).then(()=>{ state.roomConfigDirty=false; state.roomConfigEditing=false; if($('cfgStatus')) $('cfgStatus').textContent='Server settings applied.'; }).catch(alertErr);
  };
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
      rooms.innerHTML = list.map(r => { const q=(r.lateJoiners||[]).length; const open=!!state.openRoomDetails[r.id]; return `<div class="row roomRow ${open?'detailsOpen':''}" data-room-row="${escapeHtml(r.id)}"><div><b>${escapeHtml(r.name)}</b><div class="sub">${r.players.length}/${r.maxPlayers} humans · ${r.bots} bots · ${r.state}${q?' · '+q+' late queued':''}</div>${roomDetailsHtml(r)}</div><div class="roomButtons"><button type="button" data-details="${escapeHtml(r.id)}" aria-expanded="${open?'true':'false'}">DETAILS</button><button type="button" data-spec="${escapeHtml(r.id)}" ${r.allowSpectators?'':'disabled'}>SPECTATE</button><button type="button" data-join="${escapeHtml(r.id)}" ${(r.state==='lobby'||r.allowLateJoin)?'':'disabled'}>JOIN</button></div></div>`; }).join('');
      rooms.querySelectorAll('[data-join]').forEach(b => b.onclick = (ev) => { ev.preventDefault(); ev.stopPropagation(); api('joinRoom', { roomId:b.dataset.join }).catch(alertErr); });
      rooms.querySelectorAll('[data-spec]').forEach(b => b.onclick = (ev) => { ev.preventDefault(); ev.stopPropagation(); api('spectateRoom', { roomId:b.dataset.spec }).catch(alertErr); });
      rooms.querySelectorAll('[data-details]').forEach(b => b.onclick = (ev) => { ev.preventDefault(); ev.stopPropagation(); const id=b.dataset.details; state.openRoomDetails[id]=!state.openRoomDetails[id]; const row=b.closest('.roomRow'); const open=!!state.openRoomDetails[id]; if(row) row.classList.toggle('detailsOpen', open); b.setAttribute('aria-expanded', open?'true':'false'); });
    }
  }
  renderChat($('lobbyChat'), (state.lobby && state.lobby.chat) || []);
}
function renderRoom(room, chat){
  if(!room) return;
  state.room = room;
  const parts = participants(room);
  state.mySlot = parts.findIndex(p => p.clientId === state.clientId);
  const queuedLate = !!((room.lateJoiners||[]).find(q => (q.id||q.clientId) === state.clientId));
  state.spectating = !!(room.spectators && room.spectators[state.clientId]) || queuedLate;
  if(state.mySlot < 0) state.mySlot = (room.players || []).findIndex(p => p.clientId === state.clientId);
  state.currentTurn = room.turn || 0;
  if($('roomTitle')) $('roomTitle').textContent = room.name;
  if($('roomInfo')) { const q=(room.lateJoiners||[]).length; $('roomInfo').textContent = `${(room.players||[]).length}/${room.maxPlayers} humans · ${room.bots} bots · ${room.turnLength}s turns · ${room.physics}${q?' · '+q+' late queued':''}`; }
  if($('players')) $('players').innerHTML = (room.players||[]).map(p => `<div class="row"><div><b>${escapeHtml(p.name)}</b><div class="sub">Human Slot ${p.slot+1}${p.clientId===room.hostId?' · HOST':''}</div></div><span class="tag">${p.ready?'READY':'WAITING'}</span>${isHost(room)&&p.clientId!==state.clientId?`<button data-kick="${escapeHtml(p.clientId)}">KICK</button><button data-ban="${escapeHtml(p.clientId)}">BAN</button>`:''}</div>`).join('') + (room.state==='running' && parts.some(p=>p.bot) ? parts.filter(p=>p.bot).map(p=>`<div class="row"><div><b>${escapeHtml(p.name)}</b><div class="sub">Bot Slot ${p.slot+1}</div></div><span class="tag">BOT</span></div>`).join('') : '') + ((room.lateJoiners||[]).length ? (room.lateJoiners||[]).map(q=>`<div class="row"><div><b>${escapeHtml(q.name||'Pilot')}</b><div class="sub">Queued for next turn cycle</div></div><span class="tag">LATE QUEUE</span></div>`).join('') : '');
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
  renderChat($('roomChat'), chat || []);
  if(room.state === 'running') {
    if(!visible('gameScreen')) startGame(room);
    else { const b=bridge(); if(b && b.syncRoster) b.syncRoster(room); updateTurnOverlay(); }
  } else if(!visible('gameScreen')) show('roomScreen');
}
function startGame(room){
  if(!room) return;
  state.room = room; state.currentTurn = room.turn || 0;
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
  updateTurnOverlay();
}
function game(){ return $('gameFrame').contentWindow; }
function bridge(){ try { return game().WCE_MP; } catch { return null; } }
function activeParticipant(){ const parts = participants(state.room); return parts[state.currentTurn] || null; }
function updateTurnOverlay(){
  if(!state.room){ if($('turnBadge')) $('turnBadge').textContent = 'No room'; return; }
  const active = activeParticipant();
  const mine = active && !active.bot && active.clientId === state.clientId;
  const bot = active && active.bot;
  const hostBotAuthority = !!(bot && isHost());
  const authority = !!(!state.spectating && (mine || hostBotAuthority));
  const locked = state.spectating || !mine || state.waitingForShot || !state.bridgeReady;
  const left = Math.ceil(roomTimeLeft(state.room));
  const timeText = Number.isFinite(left) && left > 0 ? ` · ${left}s` : '';
  const queuedLate = !!((state.room.lateJoiners||[]).find(q => (q.id||q.clientId) === state.clientId));
  if($('turnBadge')) $('turnBadge').textContent = queuedLate ? `JOINED LATE · queued for next cycle${timeText}` : (state.spectating ? `SPECTATING · ${active ? active.name : 'Pilot'} turn${timeText}` : (bot ? `BOT TURN · ${active.name}${timeText}` : (mine ? (state.waitingForShot ? `SHOT SENT · ${active.name}` : `YOUR TURN · ${active.name}${timeText}`) : `WAITING · ${active ? active.name : 'Pilot'} is aiming${timeText}`)));
  const b = bridge();
  if(b && b.setTurnAuthority) b.setTurnAuthority(authority, Math.max(0,left));
  if(b && b.setControlLock) b.setControlLock(locked);
  ensureHostGameControls();
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
  if(json.client && !json.client.roomId && state.room && (visible('gameScreen') || visible('roomScreen'))){ if(!state.explicitExitInProgress) hardExitToWarheads(); return; }
  if(json.lobby) renderLobby(json.lobby);
  if(json.room) renderRoom(json.room, json.chat || []);
  if(json.message) console.log('[WCE-MP]', json.message);
  (json.events || []).forEach(handleEvent);
  if(json.syncBaseline && json.serverSeq) state.lastSeq = Math.max(state.lastSeq, +json.serverSeq || 0);
}
function handleEvent(ev){
  if(ev.seq && ev.seq <= state.lastSeq) return;
  if(ev.seq){ state.lastSeq = ev.seq; }
  switch(ev.type){
    case 'room': if(ev.room) { renderRoom(ev.room, ev.chat || []); const b=bridge(); if(b && b.syncRoster && ev.room.state==='running') b.syncRoster(ev.room); } break;
    case 'lateJoinQueued': if(ev.room) { renderRoom(ev.room, ev.chat || []); updateTurnOverlay(); } break;
    case 'lateJoinCommit': { if(ev.room) state.room = ev.room; const b=bridge(); if(b && b.syncRoster && ev.room) b.syncRoster(ev.room, true); if(ev.message) console.log('[WCE-MP]', ev.message); if(ev.room) renderRoom(ev.room, ev.chat || []); break; }
    case 'chat': if(ev.scope === 'room') renderChat($('roomChat'), ev.chat || []); else renderChat($('lobbyChat'), ev.chat || []); break;
    case 'startGame': startGame(ev.room || state.room); break;
    case 'shot': {
      if(ev.turnToken && ev.turnToken <= state.lastShotToken) break;
      if(ev.turnToken) state.lastShotToken = ev.turnToken;
      state.waitingForShot = true; updateTurnOverlay();
      const b = bridge(); if(b && b.applyShot) b.applyShot(ev.input || {});
      break;
    }
    case 'stateSync': {
      if(ev.turnToken && ev.turnToken <= state.lastStateToken) break;
      if(ev.turnToken) state.lastStateToken = ev.turnToken;
      state.waitingForShot = false;
      if(ev.room) state.room = ev.room;
      state.currentTurn = ev.turn || 0;
      if(state.room) state.room.turn = state.currentTurn;
      const b = bridge();
      if(b && b.importState && ev.state) { b.importState(ev.state); if(b.syncRoster && state.room) b.syncRoster(state.room); }
      else if(ev.state) state.pendingStateSync = ev;
      state.lastBotKey = '';
      updateTurnOverlay();
      break;
    }
    case 'hostTerrain': { const b=bridge(); if(b && b.hostTerrain) b.hostTerrain(ev.kind || 'clear'); break; }
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
window.addEventListener('message', ev => {
  const frame = $('gameFrame');
  if(frame && frame.contentWindow && ev.source !== frame.contentWindow) return;
  const m = ev.data || {}; if(m.source !== 'WCE_MP_GAME') return;
  if(m.type === 'bridgeReady') { state.bridgeReady = true; state.gameLoadingRoomId=''; const b = bridge(); if(b && state.room) b.start(state.room, state.mySlot); if(b && b.importState && state.pendingStateSync && state.pendingStateSync.state){ b.importState(state.pendingStateSync.state); if(b.syncRoster && state.room) b.syncRoster(state.room); state.pendingStateSync=null; } else if(b && b.syncRoster && state.room){ b.syncRoster(state.room); } updateTurnOverlay(); }
  if(m.type === 'ready') updateTurnOverlay();
  if(m.type === 'localShot') {
    const active = activeParticipant();
    if(active && !active.bot && active.clientId === state.clientId && !state.waitingForShot){ state.waitingForShot = true; updateTurnOverlay(); api('shot', { input:m.payload.input }).then(j => { if(j && j.message && /not your turn|shot already|not running/i.test(j.message)){ state.waitingForShot=false; updateTurnOverlay(); alertErr(new Error(j.message)); } }).catch(e => { state.waitingForShot=false; updateTurnOverlay(); alertErr(e); }); }
  }
  if(m.type === 'turnFinished') {
    const active = activeParticipant();
    const allowed = active && ((!active.bot && active.clientId === state.clientId) || (active.bot && isHost()));
    if(allowed) api('turnFinished', { state:m.payload.state }).catch(alertErr);
  }
  if(m.type === 'gameOver') api('gameOver', { title:m.payload.title || 'Game over' }).catch(alertErr);
  if(m.type === 'hostTerrainState') api('hostTerrain', { kind:m.payload.kind || 'terrain', state:m.payload.state || null }).catch(alertErr);
  if(m.type === 'error') console.warn(m.payload && m.payload.message);
});
$('enterLobby').onclick = async () => { try{ const j=await api('hello', { name:$('nameInput').value }); if(j.ok){ setErr(''); show('lobbyScreen'); } }catch(e){ setErr(e.message); } };
$('nameInput').value = state.name || '';
$('nameInput').addEventListener('keydown', e => { if(e.key === 'Enter') $('enterLobby').click(); });
$('refreshLobby').onclick = () => poll();
if($('resetSession')) $('resetSession').onclick = () => { if(confirm('Reset your multiplayer session and return to the WarHeads main menu?')) explicitLeaveToMenu(); };
$('createRoom').onclick = () => api('createRoom', { name:$('roomName').value || `${state.name || 'Pilot'}'s Game`, maxPlayers:+$('roomPlayers').value, bots:+$('roomBots').value, turnLength:+$('roomTurn').value, physics:$('roomPhysics').value, allowLateJoin:false, allowSpectators:true, modSettings:hostAdvancedSettings() }).catch(alertErr);
$('leaveRoom').onclick = () => { if(confirm('Leave this room and return to the WarHeads main menu?')) explicitLeaveToMenu(); };
if($('closeRoom')) $('closeRoom').onclick = () => { if(confirm('Close this room for everyone?')) api('closeRoom').catch(alertErr); };
$('startRoom').onclick = () => api('startRoom').catch(alertErr);
$('readyBtn').onclick = () => { state.ready = !state.ready; api('setReady', { ready:state.ready }).catch(alertErr); $('readyBtn').textContent = state.ready ? 'UNREADY' : 'READY'; };
$('sendLobbyChat').onclick = () => { let i=$('lobbyChatInput'); api('chat', { text:i.value }).catch(alertErr); i.value=''; };
$('sendRoomChat').onclick = () => { let i=$('roomChatInput'); api('chat', { text:i.value }).catch(alertErr); i.value=''; };
$('lobbyChatInput').addEventListener('keydown', e => { if(e.key === 'Enter') $('sendLobbyChat').click(); });
$('roomChatInput').addEventListener('keydown', e => { if(e.key === 'Enter') $('sendRoomChat').click(); });
$('mpLeave').onclick = () => { if(confirm('Leave this multiplayer game and return to the WarHeads main menu?')) explicitLeaveToMenu(); };
setInterval(poll, 1000);
show('nameScreen');
poll();
