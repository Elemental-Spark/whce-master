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
  polling: false
};
localStorage.setItem('wce.mp.clientId', state.clientId);
function show(id){ screens.forEach(s => { const el=$(s); if(el) el.classList.toggle('hidden', s !== id); }); }
function visible(id){ const el=$(id); return el && !el.classList.contains('hidden'); }
function setErr(text){ if($('nameError')) $('nameError').textContent = text || ''; }
function escapeHtml(s){ return String(s||'').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }
function participants(room){ return (room && Array.isArray(room.participants) && room.participants.length) ? room.participants : ((room && room.players) || []); }
function isHost(room=state.room){ return !!room && room.hostId === state.clientId; }
async function api(action, payload={}){
  const body = { action, clientId:state.clientId, lastSeq:state.lastSeq, ...payload };
  const res = await fetch('api.php', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body), cache:'no-store' });
  const json = await res.json();
  if(!json.ok && json.message) throw new Error(json.message);
  handleApi(json);
  return json;
}
function renderChat(el, chat=[]){ if(!el) return; el.innerHTML = chat.map(m => m.system ? `<div class="msg system">${escapeHtml(m.text)}</div>` : `<div class="msg"><b>${escapeHtml(m.name||'Pilot')}:</b> ${escapeHtml(m.text)}</div>`).join(''); el.scrollTop = el.scrollHeight; }
function renderLobby(lobby){
  state.lobby = lobby || state.lobby;
  if($('connStatus')) $('connStatus').textContent = 'Connected through website host · PHP polling';
  const rooms = $('rooms'); const list = (state.lobby && state.lobby.rooms) || [];
  if(rooms){
    if(!list.length){ rooms.classList.add('empty'); rooms.textContent='No rooms yet.'; }
    else{
      rooms.classList.remove('empty');
      rooms.innerHTML = list.map(r => `<div class="row"><div><b>${escapeHtml(r.name)}</b><div class="sub">${r.players.length}/${r.maxPlayers} humans · ${r.bots} bots · ${r.state}</div></div><button data-join="${escapeHtml(r.id)}" ${r.state==='lobby'?'':'disabled'}>JOIN</button></div>`).join('');
      rooms.querySelectorAll('[data-join]').forEach(b => b.onclick = () => api('joinRoom', { roomId:b.dataset.join }).catch(alertErr));
    }
  }
  renderChat($('lobbyChat'), (state.lobby && state.lobby.chat) || []);
}
function renderRoom(room, chat){
  if(!room) return;
  state.room = room;
  const parts = participants(room);
  state.mySlot = parts.findIndex(p => p.clientId === state.clientId);
  if(state.mySlot < 0) state.mySlot = (room.players || []).findIndex(p => p.clientId === state.clientId);
  state.currentTurn = room.turn || 0;
  if($('roomTitle')) $('roomTitle').textContent = room.name;
  if($('roomInfo')) $('roomInfo').textContent = `${(room.players||[]).length}/${room.maxPlayers} humans · ${room.bots} bots · ${room.turnLength}s turns · ${room.physics}`;
  if($('players')) $('players').innerHTML = (room.players||[]).map(p => `<div class="row"><div><b>${escapeHtml(p.name)}</b><div class="sub">Human Slot ${p.slot+1}${p.clientId===room.hostId?' · HOST':''}</div></div><span class="tag">${p.ready?'READY':'WAITING'}</span></div>`).join('') + (room.state==='running' && parts.some(p=>p.bot) ? parts.filter(p=>p.bot).map(p=>`<div class="row"><div><b>${escapeHtml(p.name)}</b><div class="sub">Bot Slot ${p.slot+1}</div></div><span class="tag">BOT</span></div>`).join('') : '');
  if($('startRoom')) $('startRoom').style.display = isHost(room) && room.state === 'lobby' ? '' : 'none';
  if($('closeRoom')) $('closeRoom').style.display = isHost(room) ? '' : 'none';
  if($('hostOptions')) $('hostOptions').innerHTML = isHost(room) && room.state === 'lobby' ? `
    <label class="field">Humans<select id="cfgPlayers">${Array.from({length:16},(_,i)=>`<option>${i+1}</option>`).join('')}</select></label>
    <label class="field">Bots<select id="cfgBots">${Array.from({length:9},(_,i)=>`<option>${i}</option>`).join('')}</select></label>
    <label class="field">Turns<select id="cfgTurn"><option>60</option><option>90</option><option>120</option></select></label>
    <label class="field">Missed<select id="cfgPhysics"><option value="bounce">Wall Bounce</option><option value="teleport">Teleport Wrap</option></select></label>
    <button id="applyCfg">APPLY</button>` : `<div class="sub">Host controls room settings before launch.</div>`;
  if($('cfgPlayers')) $('cfgPlayers').value = String(room.maxPlayers);
  if($('cfgBots')) $('cfgBots').value = String(room.bots);
  if($('cfgTurn')) $('cfgTurn').value = String(room.turnLength);
  if($('cfgPhysics')) $('cfgPhysics').value = room.physics;
  if($('applyCfg')) $('applyCfg').onclick = () => api('roomConfig', { maxPlayers:+$('cfgPlayers').value, bots:+$('cfgBots').value, turnLength:+$('cfgTurn').value, physics:$('cfgPhysics').value }).catch(alertErr);
  renderChat($('roomChat'), chat || []);
  if(room.state === 'running') {
    if(!visible('gameScreen')) startGame(room);
    else updateTurnOverlay();
  } else if(!visible('gameScreen')) show('roomScreen');
}
function startGame(room){
  if(!room) return;
  state.room = room; state.currentTurn = room.turn || 0;
  show('gameScreen');
  const iframe = $('gameFrame');
  state.bridgeReady = false;
  state.waitingForShot = false;
  state.lastBotKey = '';
  state.gameRoomId = room.id;
  iframe.src = `game/WarHeads%20Classic%20Enhanced%20Multiplayer.html?mp=1&room=${encodeURIComponent(room.id)}&mpSeed=${encodeURIComponent(room.seed)}`;
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
  const locked = !mine || state.waitingForShot || !state.bridgeReady;
  if($('turnBadge')) $('turnBadge').textContent = bot ? `BOT TURN · ${active.name}` : (mine ? (state.waitingForShot ? `SHOT SENT · ${active.name}` : `YOUR TURN · ${active.name}`) : `WAITING · ${active ? active.name : 'Pilot'} is aiming`);
  const b = bridge(); if(b && b.setControlLock) b.setControlLock(locked);
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
  if(json.client && json.client.name){ state.name = json.client.name; localStorage.setItem('wce.mp.name', state.name); }
  if(json.lobby) renderLobby(json.lobby);
  if(json.room) renderRoom(json.room, json.chat || []);
  if(json.message) console.log('[WCE-MP]', json.message);
  (json.events || []).forEach(handleEvent);
}
function handleEvent(ev){
  if(ev.seq && ev.seq <= state.lastSeq) return;
  if(ev.seq){ state.lastSeq = ev.seq; }
  switch(ev.type){
    case 'room': if(ev.room) renderRoom(ev.room, ev.chat || []); break;
    case 'chat': if(ev.scope === 'room') renderChat($('roomChat'), ev.chat || []); else renderChat($('lobbyChat'), ev.chat || []); break;
    case 'startGame': startGame(ev.room || state.room); break;
    case 'shot': {
      state.waitingForShot = true; updateTurnOverlay();
      const b = bridge(); if(b && b.applyShot) b.applyShot(ev.input || {});
      break;
    }
    case 'stateSync': {
      state.waitingForShot = false;
      if(ev.room) state.room = ev.room;
      state.currentTurn = ev.turn || 0;
      if(state.room) state.room.turn = state.currentTurn;
      const b = bridge(); if(b && b.importState && ev.state) b.importState(ev.state);
      state.lastBotKey = '';
      updateTurnOverlay();
      break;
    }
    case 'roomEnded': alert(ev.message || 'Room closed.'); state.room=null; state.gameRoomId=''; $('gameFrame').src='about:blank'; show('lobbyScreen'); break;
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
  const m = ev.data || {}; if(m.source !== 'WCE_MP_GAME') return;
  if(m.type === 'bridgeReady') { state.bridgeReady = true; const b = bridge(); if(b && state.room) b.start(state.room, state.mySlot); updateTurnOverlay(); }
  if(m.type === 'ready') updateTurnOverlay();
  if(m.type === 'localShot') {
    const active = activeParticipant();
    if(active && !active.bot && active.clientId === state.clientId && !state.waitingForShot){ state.waitingForShot = true; updateTurnOverlay(); api('shot', { input:m.payload.input }).catch(e => { state.waitingForShot=false; updateTurnOverlay(); alertErr(e); }); }
  }
  if(m.type === 'turnFinished') {
    const active = activeParticipant();
    const allowed = active && ((!active.bot && active.clientId === state.clientId) || (active.bot && isHost()));
    if(allowed) api('turnFinished', { state:m.payload.state }).catch(alertErr);
  }
  if(m.type === 'gameOver') api('gameOver', { title:m.payload.title || 'Game over' }).catch(alertErr);
  if(m.type === 'error') console.warn(m.payload && m.payload.message);
});
$('enterLobby').onclick = async () => { try{ const j=await api('hello', { name:$('nameInput').value }); if(j.ok){ setErr(''); show('lobbyScreen'); } }catch(e){ setErr(e.message); } };
$('nameInput').value = state.name || '';
$('nameInput').addEventListener('keydown', e => { if(e.key === 'Enter') $('enterLobby').click(); });
$('refreshLobby').onclick = () => poll();
if($('resetSession')) $('resetSession').onclick = () => { if(confirm('Reset your multiplayer session and return to the lobby?')) { state.room=null; state.gameRoomId=''; state.waitingForShot=false; state.bridgeReady=false; state.lastBotKey=''; $('gameFrame').src='about:blank'; api('resetSession').catch(console.warn); show('lobbyScreen'); } };
$('createRoom').onclick = () => api('createRoom', { name:$('roomName').value || `${state.name || 'Pilot'}'s Game`, maxPlayers:+$('roomPlayers').value, bots:+$('roomBots').value, turnLength:+$('roomTurn').value, physics:$('roomPhysics').value }).catch(alertErr);
$('leaveRoom').onclick = () => { api('leaveRoom').catch(console.warn); show('lobbyScreen'); };
if($('closeRoom')) $('closeRoom').onclick = () => { if(confirm('Close this room for everyone?')) api('closeRoom').catch(alertErr); };
$('startRoom').onclick = () => api('startRoom').catch(alertErr);
$('readyBtn').onclick = () => { state.ready = !state.ready; api('setReady', { ready:state.ready }).catch(alertErr); $('readyBtn').textContent = state.ready ? 'UNREADY' : 'READY'; };
$('sendLobbyChat').onclick = () => { let i=$('lobbyChatInput'); api('chat', { text:i.value }).catch(alertErr); i.value=''; };
$('sendRoomChat').onclick = () => { let i=$('roomChatInput'); api('chat', { text:i.value }).catch(alertErr); i.value=''; };
$('lobbyChatInput').addEventListener('keydown', e => { if(e.key === 'Enter') $('sendLobbyChat').click(); });
$('roomChatInput').addEventListener('keydown', e => { if(e.key === 'Enter') $('sendRoomChat').click(); });
$('mpLeave').onclick = () => { if(confirm('Leave this multiplayer game?')) { api('leaveRoom').catch(console.warn); $('gameFrame').src='about:blank'; state.room=null; state.gameRoomId=''; show('lobbyScreen'); } };
setInterval(poll, 1000);
show('nameScreen');
poll();
