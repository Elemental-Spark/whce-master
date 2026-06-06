
(function(){
  const qs = new URLSearchParams(location.search);
  const seedText = qs.get('mpSeed');
  if(!seedText) return;
  let seed = 2166136261;
  for(let i=0;i<seedText.length;i++){ seed ^= seedText.charCodeAt(i); seed = Math.imul(seed, 16777619); }
  function next(){ seed = Math.imul(seed ^ (seed >>> 15), 1 | seed); seed ^= seed + Math.imul(seed ^ (seed >>> 7), 61 | seed); return ((seed ^ (seed >>> 14)) >>> 0) / 4294967296; }
  Math.random = next;
  window.__WCE_MP_SEEDED__ = true;
})();


window.addEventListener('error', e => {
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:12px;right:12px;top:72px;z-index:9999;padding:12px;border:1px solid #ff7b55;border-radius:8px;background:#210d0a;color:#ffe9dc;font:700 13px system-ui';
  box.textContent = 'Startup error: ' + e.message;
  document.body.appendChild(box);
});
const app = document.getElementById('app');
const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);
const ui = { pHealth:$('pHealth'), eHealth:$('eHealth'), timerText:$('timerText'), turnText:$('turnText'), pDmg:$('pDmg'), eDmg:$('eDmg'), angle:$('angle'), power:$('power'), angleText:$('angleText'), powerText:$('powerText'), weaponText:$('weaponText'), defenseText:$('defenseText'), zoomText:$('zoomText'), weaponSelect:$('weaponSelect'), defenseSelect:$('defenseSelect'), fire:$('fire'), toast:$('toast'), lab:$('lab'), editName:$('editName'), stageList:$('stageList'), weaponJson:$('weaponJson'), saveStatus:$('saveStatus'), menu:$('menu'), menuPlayers:$('menuPlayers'), menuTurn:$('menuTurn'), menuPhysics:$('menuPhysics'), menuPlayerPack:$('menuPlayerPack'), menuUsePack:$('menuUsePack'), optionsPanel:$('optionsPanel'), menuUfoRate:$('menuUfoRate'), menuUfoMinTime:$('menuUfoMinTime'), menuUfoMaxTime:$('menuUfoMaxTime'), menuUfoMax:$('menuUfoMax'), menuBossChance:$('menuBossChance'), menuAimArc:$('menuAimArc'), menuMusic:$('menuMusic'), menuMusicVolume:$('menuMusicVolume'), menuMusicTrack:$('menuMusicTrack'), centerBanner:$('centerBanner'), centerTitle:$('centerTitle'), centerSub:$('centerSub'), centerButton:$('centerButton') };
const insults = ['Your orbit is expired.','Nice hull, shame about the aim.','Prepare for cosmic paperwork.','I brought extra gravity.','Say hi to the crater.','Your shields look decorative.','This one has your name-ish.','Space called. You lose.','Behold my tiny doom.','Your planet looks flammable.','Plotting your oops.','I tuned this with science.','Duck, star sailor.','Your trajectory is comedy.','Time for a moon nap.','I packed a crater maker.','Your thrusters seem nervous.','Sending a spicy meteor.','Brace for polite violence.','Your orbit owes rent.','I licked this missile for luck.','You are about to be geography.','Hold still, science is blinking.','Your moon warranty is void.','Incoming friendship crater.','This button said do not press.','Tiny ship, huge mistake.','I brought a shovel for your planet.','Your atmosphere looks optional.','This one smells expensive.','Gravity filed a complaint.','I found your weak side.','Blink twice if doomed.','Your map needs more holes.','Here comes the unsubscribe button.','The crater chooses you.','My calculator says boom.','Tell your planet I said sorry.','I hope your insurance covers lasers.','Witness the decorative violence.'];
const defaultWeapons = [
  {id:'sniper',name:'Sniper',type:'sniper',color:'#b9ffd4',stages:[{delay:0,action:'explode',radius:20,damage:36,count:1}]},
  {id:'laserstorm',name:'Laser Storm',type:'staged',color:'#b9ffd4',stages:[{delay:0,action:'laser',radius:72,damage:34,count:5}]},
  {id:'shell',name:'Shell',type:'staged',color:'#ffd15f',stages:[{delay:0,action:'explode',radius:34,damage:30,count:1}]},
  {id:'orbit',name:'Orbit Drop',type:'staged',color:'#cba6ff',stages:[{delay:0,action:'orbit',radius:34,damage:18,count:2},{delay:250,action:'explode',radius:34,damage:24,count:1}]},
  {id:'splitter',name:'Core Splitter',type:'staged',color:'#ff86cf',stages:[{delay:0,action:'splitter',radius:22,damage:16,count:7},{delay:260,action:'dig',radius:26,damage:10,count:1}]},
  {id:'walker',name:'Walker',type:'staged',color:'#d8ff76',stages:[{delay:0,action:'walker',radius:22,damage:18,count:3},{delay:400,action:'explode',radius:30,damage:22,count:1}]},
  {id:'fly',name:'Fly Swarm',type:'staged',color:'#76d8ff',stages:[{delay:0,action:'fly',radius:24,damage:18,count:4},{delay:300,action:'explode',radius:24,damage:16,count:1}]},
  {id:'whiteout',name:'Whiteout',type:'staged',color:'#ffffff',stages:[{delay:0,action:'whiteout',radius:86,damage:72,count:1}]},
  {id:'builder',name:'Terrain Build',type:'staged',color:'#79e39d',stages:[{delay:0,action:'build',radius:42,damage:0,count:1},{delay:180,action:'build',radius:28,damage:0,count:1}]},
  {id:'napalm',name:'Napalm',type:'staged',color:'#ff7b55',stages:[{delay:0,action:'napalm',radius:30,damage:8,count:1},{delay:260,action:'napalm',radius:42,damage:10,count:1},{delay:520,action:'napalm',radius:52,damage:12,count:1}]},
  {id:'magnet',name:'Magnet',type:'staged',color:'#66d9ff',stages:[{delay:0,action:'magnet',radius:180,damage:4,count:1},{delay:260,action:'explode',radius:24,damage:12,count:1}]}
];
const rand=(a,b)=>a+Math.random()*(b-a), clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let W=1,H=1,dpr=1,world={w:2600,h:1600},cam={x:1300,y:800,z:1,target:null},planets=[],ships=[],shots=[],particles=[],beams=[],shockwaves=[],walkers=[],debris=[],ufos=[],boss=null,magnetFields=[],turn=0,turnCount=0,nextUfoAt=0,busy=false,ended=false,selected=0,roundLeft=60,lastTick=performance.now(),wind=0,editing=0,weaponDefs=[],shipDefs=[],shipEditing=0,shipPaint="#66d9ff",shipEditorCells=[],playerShipId=localStorage.getItem("warheads.playerShip")||"",playerWeapons=[],lastDamage=[0,0],roundDamage=[0,0],stars=[],starDrift=0,defenseIndex=0,settings={players:2,localHumans:1,localBots:1,turnLength:120,physics:'bounce',packMode:'gold',playerPackChoice:localStorage.getItem('warheads.playerPackChoice')||'gold',addSavedPack:true,ufoMinutes:15,ufoMinMinutes:15,ufoMaxMinutes:30,bossChance:.02,ufoMax:3,aimArcMin:0,aimArcMax:360,musicOn:localStorage.getItem('warheads.musicOn')!=='off',musicVolume:+(localStorage.getItem('warheads.musicVolume')||35),musicTrack:localStorage.getItem('warheads.musicTrack')||'rotate'},editorType='staged',editorTimer=0,editorTimerOn=false,damageFloaters=[],pendingDamage=[],pendingDeathNotices=[],pendingTurnFinishAt=0,endPauseActive=false,turnStartHp=[],inGame=false,weaponTestMode=false,testEditorWeaponId=null,matchMode='bot';
let weaponEditorCleanState='', shipEditorCleanState='';

const DEFAULT_MOD_SETTINGS={
  maxHealth:300,absorbHits:5,shotMinLifeMs:20000,shotMaxLifeMs:34000,postShotPauseMs:2400,fireDelayMs:1850,
  maxLiveShots:128,warheadsPerTurn:156,walkersPerTurn:12,maxLiveWalkers:20,maxParticles:1500,maxBeams:170,maxShockwaves:78,maxDebris:620,maxTrailPoints:58,
  softHoming:0.034,homingBoost:0.12,gravityStrength:0.22,gravityMaxPull:0.18,maxShotSpeed:18,shotPowerScale:0.18,bounceDamping:0.86,
  planetCapBase:14,planetCapPerPlayer:5,planetFloorBase:1,planetFloorPerPlayer:0.45,planetFloorMax:4,planetDestructionScale:1,planetBuildScale:1,planetRepairScale:1,playfieldMargin:150,
  worldWidthBase:2800,worldWidthPerPlayer:560,worldHeightBase:1800,worldHeightPerPlayer:300,
  botProcWeapons:8,botMutationChance:55,stageCountCap:8,stageDamageCap:160,stageRadiusCap:260,particleScale:1,heavySfxCap:5,lightSfxCap:9
};
function loadModSettings(){try{let raw=JSON.parse(localStorage.getItem('warheads.modSettings')||'{}');return {...DEFAULT_MOD_SETTINGS,...raw}}catch(e){return {...DEFAULT_MOD_SETTINGS}}}
let modSettings=loadModSettings();
function saveModSettings(){try{localStorage.setItem('warheads.modSettings',JSON.stringify(modSettings))}catch(e){}}
function applyModSettings(){
  MAX_HEALTH=clamp(+modSettings.maxHealth||300,50,5000);ABSORB_HITS=clamp(+modSettings.absorbHits||5,1,25);
  SHOT_MIN_LIFE=clamp(+modSettings.shotMinLifeMs||20000,5000,120000);SHOT_MAX_LIFE=clamp(+modSettings.shotMaxLifeMs||34000,SHOT_MIN_LIFE,140000);POST_SHOT_PAUSE=clamp(+modSettings.postShotPauseMs||2400,500,10000);
  MAX_LIVE_SHOTS=clamp(Math.round(+modSettings.maxLiveShots||128),8,1000);MAX_WARHEADS_PER_TURN=clamp(Math.round(+modSettings.warheadsPerTurn||156),8,1500);MAX_WALKERS_PER_TURN=clamp(Math.round(+modSettings.walkersPerTurn||12),0,128);MAX_LIVE_WALKERS=clamp(Math.round(+modSettings.maxLiveWalkers||20),0,256);
  MAX_PARTICLES=clamp(Math.round(+modSettings.maxParticles||1500),100,8000);MAX_BEAMS=clamp(Math.round(+modSettings.maxBeams||170),10,2000);MAX_SHOCKWAVES=clamp(Math.round(+modSettings.maxShockwaves||78),10,1000);MAX_DEBRIS=clamp(Math.round(+modSettings.maxDebris||620),20,4000);MAX_TRAIL_POINTS=clamp(Math.round(+modSettings.maxTrailPoints||58),4,300);SOFT_HOMING=clamp(+modSettings.softHoming||0,0,0.5);PLAYFIELD_MARGIN=clamp(+modSettings.playfieldMargin||150,0,600);
}

const defenses=[{id:'repel',label:'Repel Field'},{id:'bounce',label:'Bounce Field'},{id:'portal',label:'Portal Command'},{id:'absorb',label:'Absorb Field'}];
const defaultShipSprites=[{id:'ships-default-scout',name:'Default Scout',w:16,h:16,userMade:false,custom:true,cells:[{x:7,y:1,c:'#66d9ff'},{x:8,y:1,c:'#66d9ff'},{x:6,y:2,c:'#66d9ff'},{x:7,y:2,c:'#b9ffd4'},{x:8,y:2,c:'#b9ffd4'},{x:9,y:2,c:'#66d9ff'},{x:5,y:3,c:'#244a55'},{x:6,y:3,c:'#66d9ff'},{x:7,y:3,c:'#66d9ff'},{x:8,y:3,c:'#66d9ff'},{x:9,y:3,c:'#66d9ff'},{x:10,y:3,c:'#244a55'},{x:4,y:4,c:'#244a55'},{x:5,y:4,c:'#3b7a86'},{x:6,y:4,c:'#66d9ff'},{x:7,y:4,c:'#ffffff'},{x:8,y:4,c:'#ffffff'},{x:9,y:4,c:'#66d9ff'},{x:10,y:4,c:'#3b7a86'},{x:11,y:4,c:'#244a55'},{x:4,y:5,c:'#3b7a86'},{x:5,y:5,c:'#66d9ff'},{x:6,y:5,c:'#66d9ff'},{x:7,y:5,c:'#1c3036'},{x:8,y:5,c:'#1c3036'},{x:9,y:5,c:'#66d9ff'},{x:10,y:5,c:'#66d9ff'},{x:11,y:5,c:'#3b7a86'},{x:3,y:6,c:'#244a55'},{x:4,y:6,c:'#3b7a86'},{x:5,y:6,c:'#66d9ff'},{x:6,y:6,c:'#66d9ff'},{x:7,y:6,c:'#66d9ff'},{x:8,y:6,c:'#66d9ff'},{x:9,y:6,c:'#66d9ff'},{x:10,y:6,c:'#66d9ff'},{x:11,y:6,c:'#3b7a86'},{x:12,y:6,c:'#244a55'},{x:2,y:7,c:'#1c3036'},{x:3,y:7,c:'#244a55'},{x:4,y:7,c:'#3b7a86'},{x:5,y:7,c:'#66d9ff'},{x:6,y:7,c:'#66d9ff'},{x:7,y:7,c:'#ffb15f'},{x:8,y:7,c:'#ffb15f'},{x:9,y:7,c:'#66d9ff'},{x:10,y:7,c:'#66d9ff'},{x:11,y:7,c:'#3b7a86'},{x:12,y:7,c:'#244a55'},{x:13,y:7,c:'#1c3036'},{x:3,y:8,c:'#244a55'},{x:4,y:8,c:'#3b7a86'},{x:5,y:8,c:'#66d9ff'},{x:6,y:8,c:'#66d9ff'},{x:7,y:8,c:'#66d9ff'},{x:8,y:8,c:'#66d9ff'},{x:9,y:8,c:'#66d9ff'},{x:10,y:8,c:'#66d9ff'},{x:11,y:8,c:'#3b7a86'},{x:12,y:8,c:'#244a55'},{x:4,y:9,c:'#244a55'},{x:5,y:9,c:'#3b7a86'},{x:6,y:9,c:'#66d9ff'},{x:7,y:9,c:'#66d9ff'},{x:8,y:9,c:'#66d9ff'},{x:9,y:9,c:'#66d9ff'},{x:10,y:9,c:'#3b7a86'},{x:11,y:9,c:'#244a55'},{x:5,y:10,c:'#244a55'},{x:6,y:10,c:'#3b7a86'},{x:7,y:10,c:'#66d9ff'},{x:8,y:10,c:'#66d9ff'},{x:9,y:10,c:'#3b7a86'},{x:10,y:10,c:'#244a55'},{x:6,y:11,c:'#ff7b55'},{x:9,y:11,c:'#ff7b55'}]}];
let MAX_HEALTH=300, ABSORB_HITS=5, SHOT_MIN_LIFE=20000, SHOT_MAX_LIFE=34000, POST_SHOT_PAUSE=2400;
let MAX_LIVE_SHOTS=128, MAX_WARHEADS_PER_TURN=156, MAX_WALKERS_PER_TURN=12, MAX_LIVE_WALKERS=20, MAX_PARTICLES=1500, MAX_BEAMS=170, MAX_SHOCKWAVES=78, MAX_DEBRIS=620, MAX_TRAIL_POINTS=58, SOFT_HOMING=.034;
let PLAYFIELD_MARGIN=150;
applyModSettings();
weaponDefs=loadWeapons();
let turnWarheadsCreated=0, turnWalkersCreated=0, activeShotOwner=-1;
function resetShotCaps(){turnWarheadsCreated=0;turnWalkersCreated=0;activeShotOwner=turn}
function safeStageForChild(st={}){let s=normStage(st),a=s.action;if(a==='splitter'){s.count=clamp(Math.round(s.count||3),2,6);s.delay=0;s.radius=clamp(s.radius,10,52);s.damage=clamp(s.damage,4,58);return s}if(a==='split'){s.count=clamp(Math.round(s.count||3),2,7);s.delay=0;s.radius=clamp(s.radius,8,70);s.damage=clamp(s.damage,2,56);return s}if(['wave','spread','shotgun','fly'].includes(a)){s.count=clamp(Math.round(s.count||3),2,7);s.delay=0;s.radius=clamp(s.radius,8,76);s.damage=clamp(s.damage,2,58);return s}if(a==='homing'){s.count=1;s.delay=0;s.radius=clamp(s.radius,8,76);s.damage=clamp(s.damage,2,58);return s}if(a==='cluster'||a==='warburst'||a==='machine'||a==='walker'||a==='orbit')s.action=(a==='walker'||a==='orbit')?'dig':'explode';s.count=1;s.delay=0;s.radius=clamp(s.radius,8,95);s.damage=clamp(s.damage,0,72);return s}
function safeOrbitStageForChild(st={}){let s=safeStageForChild(st);if(s.action==='build'||s.action==='magnet')s.action='explode';s.radius=clamp(s.radius,10,38);s.damage=clamp(s.damage,0,56);s.count=1;s.delay=0;s.orbitSafe=true;return s}
function randomChildStage(){let a=['explode','dig','napalm','magnet','build'][Math.floor(rand(0,5))];return normStage({action:a,delay:0,radius:rand(16,74),damage:a==='build'?0:rand(8,44),count:1})}
function addShot(obj,cost=1){if(!obj||ended)return null;obj.owner=Number.isFinite(obj.owner)?obj.owner:turn;if(busy&&obj.owner!==activeShotOwner)return null;if(shots.length>=MAX_LIVE_SHOTS)return null;if(turnWarheadsCreated+cost>MAX_WARHEADS_PER_TURN)return null;turnWarheadsCreated+=cost;if(!obj.trail)obj.trail=[];obj.maxLife=Math.min(obj.maxLife||SHOT_MAX_LIFE,SHOT_MAX_LIFE);if(obj.spawnDepth==null)obj.spawnDepth=0;Array.prototype.push.call(shots,obj);if(busy)cam.target=obj;return obj}
function addWalker(obj){if(!obj||ended)return null;if(busy&&obj.owner!==activeShotOwner)return null;if(walkers.length>=MAX_LIVE_WALKERS)return null;if(turnWalkersCreated>=MAX_WALKERS_PER_TURN)return null;turnWalkersCreated++;Array.prototype.push.call(walkers,obj);return obj}
function defaultWeaponIds(){return new Set(defaultWeapons.map(w=>w.id))}
function loadStoredWeaponArray(key){try{let s=JSON.parse(localStorage.getItem(key)||'null');return Array.isArray(s)?s:[]}catch(e){return []}}
function loadWeapons(){let raw=[...loadStoredWeaponArray('warheads.weapons'),...loadStoredWeaponArray('warheads.weaponPack')],defs=defaultWeapons.map(normWeapon),defIds=new Set(defs.map(w=>w.id)),list=[];raw.forEach(w=>{if(!w)return;let nw=normWeapon({...w,playerMade:!!w.playerMade||String(w.name||'').startsWith('(P)')||!defIds.has(String(w.id||''))});let idx=list.findIndex(x=>x.id===nw.id);if(idx>=0)list[idx]=nw;else list.push(nw)});defs.forEach(w=>{let i=list.findIndex(x=>x.id===w.id);if(i>=0)list[i]=w;else list.push(w)});let byId=[];list.forEach(w=>{let n=normWeapon(w);if(!defIds.has(n.id))n.playerMade=true;if(n.playerMade&&!n.name.startsWith('(P)'))n.name=('(P) '+n.name).slice(0,20);let i=byId.findIndex(x=>x.id===n.id);if(i>=0)byId[i]=n;else byId.push(n)});let made=byId.filter(w=>w.playerMade&&!defIds.has(w.id)),other=byId.filter(w=>!w.playerMade&&!defIds.has(w.id));return [...defs,...made,...other].slice(0,160)}
function saveWeapons(){let defs=defaultWeaponIds(),clean=weaponDefs.map(normWeapon);localStorage.setItem('warheads.weapons',JSON.stringify(clean));localStorage.setItem('warheads.weaponPack',JSON.stringify(clean.filter(w=>w.playerMade&&!defs.has(w.id))))}
function randomStage(){let actions=['explode','dig','build','napalm','magnet','orbit','splitter','walker','fly','homing','spread','shotgun','warburst','cluster','wave','machine','laser','splitter','splitter','napalm','machine','cluster','warburst'];let a=actions[Math.floor(rand(0,actions.length))];return normStage({action:a,delay:a==='orbit'?rand(7000,15000):rand(0,900),radius:rand(16,86),damage:a==='build'?0:rand(8,52),count:a==='orbit'?rand(1,4):rand(1,6)})}
function makeProcWeapon(){let stages=Array.from({length:Math.floor(rand(1,6))},randomStage);if(!stages.some(s=>s.action==='explode'||s.action==='dig'||s.action==='napalm'))stages.push(normStage({action:'explode',radius:rand(22,58),damage:rand(14,44)}));stages=stages.slice(0,5);return normWeapon({id:'proc-'+Date.now()+'-'+Math.random(),name:procName(stages),type:'staged',color:['#ffd15f','#ff7b55','#76d8ff','#d8ff76','#ff86cf','#ffffff'][Math.floor(rand(0,6))],stages})}
function uniqueWeapons(list){let out=[];(list||[]).forEach(w=>{let n=normWeapon(w),i=out.findIndex(x=>x.id===n.id);if(i>=0)out[i]=n;else out.push(n)});return out}
function savedPlayerWeapons(){let defs=defaultWeaponIds();return uniqueWeapons(weaponDefs.filter(w=>w.playerMade||!defs.has(w.id))).filter(w=>!defs.has(w.id))}
function makeLoadout(includeSaved=false, generated=true){let load=defaultWeapons.map(normWeapon);if(generated)for(let i=0;i<Math.round(+modSettings.botProcWeapons||8);i++)load.push(makeProcWeapon());let saved=savedPlayerWeapons();if(includeSaved||generated)saved.forEach(w=>{if(!load.some(x=>x.id===w.id))load.push(w)});return uniqueWeapons(load).slice(0,128)}
function makeSelectedPlayerLoadout(){let choice=settings.playerPackChoice||settings.packMode||'gold',saved=savedPlayerWeapons();if(choice==='saved'){let load=[normWeapon(defaultWeapons[0]),...saved];return uniqueWeapons(load).slice(0,128)}if(choice==='generated')return makeLoadout(settings.addSavedPack!==false,true);return makeLoadout(true,false)}
function mutateBotWeapon(w){
  let c=normWeapon(JSON.parse(JSON.stringify(w||defaultWeapons[2])));c.id='botmix-'+Date.now()+'-'+Math.floor(rand(0,999999));c.name='(B) '+procName(c.stages||[randomStage()]);c.playerMade=false;c.stages=(c.stages||[randomStage()]).map(st=>normStage({...st,radius:clamp((st.radius||30)*rand(.85,1.45),8,240),damage:clamp((st.damage||18)*rand(.75,1.35),0,150),count:clamp(Math.round((st.count||1)+rand(0,3)),1,8)}));if(Math.random()<clamp((+modSettings.botMutationChance||55)/100,0,1)&&c.stages.length<Math.round(+modSettings.stageCountCap||8))c.stages.push(randomStage());return normWeapon(c)
}
function makeBotLoadout(){let load=defaultWeapons.map(normWeapon);for(let i=0;i<18;i++)load.push(makeProcWeapon());defaultWeapons.forEach(w=>{if(Math.random()<.72)load.push(mutateBotWeapon(w))});savedPlayerWeapons().forEach(w=>{if(!load.some(x=>x.id===w.id))load.push(w);if(Math.random()<.55)load.push(mutateBotWeapon(w))});return uniqueWeapons(load).slice(0,220)}

function ensureAudio(){try{let A=window.AudioContext||window.webkitAudioContext;if(!A)return null;window.audioCtx=window.audioCtx||new A();if(audioCtx.state==='suspended')audioCtx.resume();return audioCtx}catch(e){return null}}
let sfxLimiter={events:[]};
function sfx(type='boom'){
  try{
    let now=performance.now(),heavy=['boom','napalm','drill','splitter','whiteout'].includes(type),windowMs=heavy?210:120,max=heavy?clamp(Math.round(+modSettings.heavySfxCap||5),1,40):clamp(Math.round(+modSettings.lightSfxCap||9),1,60);sfxLimiter.events=sfxLimiter.events.filter(e=>now-e.t<windowMs);if(sfxLimiter.events.filter(e=>!heavy||e.heavy).length>=max)return;sfxLimiter.events.push({t:now,heavy});
    let A=ensureAudio();if(!A)return;
    let o=A.createOscillator(),g=A.createGain(),f=90,dur=.30,vol=.045;
    if(type==='whiteout'){o.type='sine';f=190;dur=.42;vol=.04}
    else if(type==='charge'){o.type='sine';f=260;dur=.52;vol=.025}
    else if(type==='launch'){o.type='sawtooth';f=520;dur=.18;vol=.032}
    else if(type==='build'){o.type='triangle';f=420;dur=.36;vol=.045}
    else if(type==='napalm'){o.type='sawtooth';f=120;dur=.48;vol=.05}
    else if(type==='drill'||type==='splitter'){o.type='square';f=210;dur=.22;vol=.035}
    else{o.type='sawtooth';f=70+Math.random()*90;dur=.34;vol=.05}
    o.frequency.value=f;g.gain.value=vol;o.connect(g);g.connect(A.destination);o.start();
    if(type==='charge')o.frequency.exponentialRampToValueAtTime(820,A.currentTime+dur);
    else if(type==='launch')o.frequency.exponentialRampToValueAtTime(180,A.currentTime+dur);
    else if(type==='build')o.frequency.exponentialRampToValueAtTime(760,A.currentTime+dur);
    else if(type==='napalm')o.frequency.exponentialRampToValueAtTime(38,A.currentTime+dur);
    else if(type==='drill'||type==='splitter')o.frequency.setValueAtTime(f*1.35,A.currentTime+.06);
    else o.frequency.exponentialRampToValueAtTime(34,A.currentTime+dur);
    g.gain.exponentialRampToValueAtTime(.001,A.currentTime+dur+.04);o.stop(A.currentTime+dur+.05)
  }catch(e){}
}
const chipTunes=[
  {name:'Orbit Waltz',tempo:150,wave:'square',bass:[36,36,43,41,36,36,43,48],lead:[60,64,67,72,67,64,60,55,57,60,64,69,67,64,60,55,60,64,67,76,72,67,64,60,57,60,64,71,69,64,60,55]},
  {name:'Pixel Comet',tempo:172,wave:'triangle',bass:[40,47,45,43,40,47,45,50],lead:[64,67,71,76,74,71,67,64,62,66,69,74,71,69,66,62,64,67,71,79,76,74,71,67,62,66,69,76,74,69,66,62]},
  {name:'Deep Space Drift',tempo:118,wave:'sine',bass:[33,33,38,40,36,36,41,43],lead:[57,60,64,67,69,67,64,60,55,59,62,66,67,66,62,59,57,60,64,72,69,67,64,60,55,59,62,69,67,64,62,59]},
  {name:'Victory Static',tempo:160,wave:'square',bass:[43,43,38,41,45,45,40,43],lead:[67,71,74,79,76,74,71,67,69,72,76,81,79,76,72,69,67,71,74,83,79,76,74,71,69,72,76,84,81,79,76,72]},
  {name:'Moonbase Lounge',tempo:126,wave:'triangle',bass:[35,42,39,42,37,44,40,44],lead:[59,62,66,69,71,69,66,62,61,64,68,71,73,71,68,64,59,62,66,74,71,69,66,62,61,64,68,76,73,71,68,64]},
  {name:'Rusty Satellite',tempo:148,wave:'square',bass:[38,45,38,45,41,48,41,48],lead:[62,65,69,74,72,69,65,62,64,67,71,76,74,71,67,64,62,65,69,77,74,72,69,65,64,67,71,79,76,74,71,67]},
  {name:'Alien Arcade',tempo:182,wave:'square',bass:[31,31,43,43,34,34,46,46],lead:[67,70,74,79,82,79,74,70,65,68,72,77,80,77,72,68,67,70,74,86,82,79,74,70,65,68,72,84,80,77,72,68]},
  {name:'Comet Rain',tempo:154,wave:'triangle',bass:[36,43,48,43,38,45,50,45],lead:[60,63,67,72,75,72,67,63,62,65,69,74,77,74,69,65,60,63,67,79,75,72,67,63,62,65,69,81,77,74,69,65]},
  {name:'Nebula Boss',tempo:134,wave:'sawtooth',bass:[32,32,39,39,35,35,42,42],lead:[56,59,63,68,71,68,63,59,58,61,65,70,73,70,65,61,56,59,63,75,71,68,63,59,58,61,65,77,73,70,65,61]},
  {name:'Tiny Doom Parade',tempo:166,wave:'square',bass:[41,41,48,48,44,44,51,51],lead:[65,68,72,77,80,77,72,68,67,70,74,79,82,79,74,70,65,68,72,84,80,77,72,68,67,70,74,86,82,79,74,70]},
  {name:'Soft Starfield',tempo:112,wave:'sine',bass:[29,36,33,36,31,38,35,38],lead:[53,57,60,65,67,65,60,57,55,59,62,67,69,67,62,59,53,57,60,72,67,65,60,57,55,59,62,74,69,67,62,59]},
  {name:'Launch Bay',tempo:176,wave:'triangle',bass:[40,40,47,47,43,43,50,50],lead:[64,68,71,76,80,76,71,68,66,69,73,78,81,78,73,69,64,68,71,83,80,76,71,68,66,69,73,85,81,78,73,69]}
]
let musicState={timer:null,step:0,tune:0,custom:[],audio:null,manifestTried:false};
function midiToFreq(n){return 440*Math.pow(2,(n-69)/12)}
function musicVol(){return clamp((settings.musicVolume??35)/100,0,1)}
function stopMusic(){if(musicState.timer){clearTimeout(musicState.timer);musicState.timer=null}if(musicState.audio){try{musicState.audio.pause();musicState.audio.currentTime=0}catch(e){}musicState.audio=null}}
function musicTone(note,dur,vol=.05,wave='square'){
  let A=ensureAudio();if(!A||!settings.musicOn||musicVol()<=0)return;
  let o=A.createOscillator(),g=A.createGain();o.type=wave;o.frequency.value=midiToFreq(note);g.gain.setValueAtTime(.001,A.currentTime);o.connect(g);g.connect(A.destination);o.start();g.gain.linearRampToValueAtTime(vol*musicVol(),A.currentTime+.025);g.gain.exponentialRampToValueAtTime(.001,A.currentTime+dur);o.stop(A.currentTime+dur+.02)
}
function currentTuneIndex(){let t=String(settings.musicTrack||'rotate');if(t.startsWith('custom:'))return -1;if(t==='rotate')return musicState.tune%chipTunes.length;let n=parseInt(t,10);return Number.isFinite(n)?clamp(n,0,chipTunes.length-1):0}
function playCustomMusic(idx){stopMusic();let tr=musicState.custom[idx];if(!tr||!settings.musicOn)return;try{let a=new Audio(tr.src);musicState.audio=a;a.volume=musicVol();a.onended=()=>{if(settings.musicTrack==='rotate'&&musicState.custom.length){playCustomMusic((idx+1)%musicState.custom.length)}};a.play().catch(()=>{});}catch(e){}}
function musicTick(){if(!settings.musicOn){stopMusic();return}let custom=String(settings.musicTrack||'').match(/^custom:(\d+)$/);if(custom){playCustomMusic(+custom[1]);return}let idx=currentTuneIndex(),t=chipTunes[idx],step=musicState.step++%t.lead.length,beat=60/t.tempo,lead=t.lead[step%t.lead.length],next=t.lead[(step+2)%t.lead.length],bass=t.bass[Math.floor(step/2)%t.bass.length];musicTone(bass,beat*.62,.022,'triangle');if(step%2===0)musicTone(lead,beat*.45,.027,t.wave==='square'?'triangle':t.wave);if(step%4===1)musicTone(next+7,beat*.26,.014,'sine');if(step%8===7)musicTone(lead+12,beat*.30,.018,'triangle');if(step%16===12)musicTone(bass+19,beat*.18,.010,'square');if(musicState.step%160===0&&settings.musicTrack==='rotate')musicState.tune=(musicState.tune+1)%chipTunes.length;musicState.timer=setTimeout(musicTick,beat*520)}
function startMusic(){if(!settings.musicOn){stopMusic();return}if(musicState.timer||musicState.audio)return;musicTick()}
function populateMusicTracks(){let sel=ui.menuMusicTrack;if(!sel)return;let val=settings.musicTrack||'rotate';sel.innerHTML='<option value="rotate">Rotate 12 Chiptunes</option>'+chipTunes.map((t,i)=>`<option value="${i}">${t.name}</option>`).join('')+musicState.custom.map((t,i)=>`<option value="custom:${i}">MUSIC/${t.name||t.src}</option>`).join('');sel.value=[...sel.options].some(o=>o.value===val)?val:'rotate'}
function applyMusicOptions(){if(ui.menuMusic)settings.musicOn=ui.menuMusic.value!=='off';if(ui.menuMusicVolume)settings.musicVolume=+ui.menuMusicVolume.value||0;if(ui.menuMusicTrack)settings.musicTrack=ui.menuMusicTrack.value||'rotate';localStorage.setItem('warheads.musicOn',settings.musicOn?'on':'off');localStorage.setItem('warheads.musicVolume',settings.musicVolume);localStorage.setItem('warheads.musicTrack',settings.musicTrack);if(musicState.audio)musicState.audio.volume=musicVol();stopMusic();startMusic()}
function tryLoadMusicFolder(){if(musicState.manifestTried)return;musicState.manifestTried=true;fetch('MUSIC/playlist.json').then(r=>r.ok?r.json():[]).then(list=>{if(Array.isArray(list)){musicState.custom=list.map(x=>typeof x==='string'?{name:x,src:'MUSIC/'+x}:{name:x.name||x.src,src:x.src&&x.src.includes('/')?x.src:'MUSIC/'+(x.src||x.file||x.name)}).filter(x=>x.src);populateMusicTracks()}}).catch(()=>{})}
function normStage(s={}){let acts=['explode','burst','split','dig','laser','build','napalm','magnet','orbit','splitter','walker','fly','whiteout','homing','spread','shotgun','warburst','cluster','wave','machine'];let action=acts.includes(s.action)?s.action:'explode',count=clamp(Math.round(+s.count||1),1,Math.round(+modSettings.stageCountCap||8));if(action==='orbit')count=clamp(Math.round(+s.count||1),1,4);return{delay:clamp(+s.delay||(action==='orbit'?15000:0),0,20000),action,radius:clamp(+s.radius||30,4,+modSettings.stageRadiusCap||260),damage:clamp(+s.damage||0,0,+modSettings.stageDamageCap||160),count}}
function procName(stages,prefix=''){let main=stages.map(s=>s.action).filter(a=>a!=='explode')[0]||'blast',ad={splitter:'Core',orbit:'Orbit',walker:'Worm',fly:'Scatter',whiteout:'Whiteout',build:'Bulwark',napalm:'Ember',magnet:'Hook',burst:'Cluster',dig:'Drill',laser:'Needle'}[main]||'Nova',noun=['Lance','Bloom','Fang','Drop','Storm','Spark','Maw','Comet'][Math.floor(rand(0,8))];return (prefix+ad+' '+noun).slice(0,20)}
function normWeapon(w={}){let stages=Array.isArray(w.stages)?w.stages.slice(0,10).map(normStage):[normStage({action:'explode',damage:20})],raw=String(w.name||'').trim(),player=w.playerMade||raw.startsWith('(P)');let name=raw||procName(stages,player?'(P) ':'');if(player&&!name.startsWith('(P)'))name='(P) '+name;return{id:String(w.id||'custom-'+Date.now()),name:name.slice(0,20),type:w.type==='sniper'?'sniper':'staged',color:/^#[0-9a-f]{6}$/i.test(w.color||'')?w.color:'#ffd15f',playerMade:!!player,stages}}
function normShipSprite(s={}){let w=clamp(Math.round(+s.w||16),4,32),h=clamp(Math.round(+s.h||16),4,32),cells=Array.isArray(s.cells)?s.cells.map(c=>({x:clamp(Math.round(+c.x||0),0,w-1),y:clamp(Math.round(+c.y||0),0,h-1),c:/^#[0-9a-f]{6}$/i.test(c.c||'')?c.c:'#66d9ff'})).filter((c,i,a)=>a.findIndex(q=>q.x===c.x&&q.y===c.y)===i):[];return{id:String(s.id||'ship-'+Date.now()),name:String(s.name||'Custom Ship').slice(0,20),w,h,cells,userMade:!!s.userMade,custom:!!s.custom||!!s.userMade}}
function loadShips(){let list=[];try{let s=JSON.parse(localStorage.getItem('warheads.ships')||'null');if(Array.isArray(s))list=s.map(normShipSprite).filter(x=>x.cells.length)}catch(e){}defaultShipSprites.map(normShipSprite).forEach(sp=>{if(!list.some(x=>x.id===sp.id))list.push(sp)});return list.slice(0,64)}
if(!Array.isArray(shipDefs)||!shipDefs.length)shipDefs=loadShips();
function saveShips(){localStorage.setItem('warheads.ships',JSON.stringify(shipDefs))}
function userShipSprites(){return shipDefs.filter(s=>s.userMade&&s.cells&&s.cells.length)}
function cloneShipSprite(sp){return normShipSprite(JSON.parse(JSON.stringify(sp)))}
function savedPlayerShip(){return shipDefs.find(s=>s.id===playerShipId&&s.cells&&s.cells.length)||userShipSprites()[0]||null}
function choosePlayerSprite(){let sp=savedPlayerShip();return sp?cloneShipSprite(sp):makeShipSprite()}
function chooseBotSprite(){return makeShipSprite()}
function ensureWeaponInLoadout(load,w){if(!Array.isArray(load))load=[];let idx=load.findIndex(x=>x.id===w.id);if(idx>=0)load[idx]=w;else load.push(w);return load}
function refreshSavedWeaponsInPacks(focusWeapon=null){let saved=savedPlayerWeapons();if(focusWeapon)saved=[normWeapon({...focusWeapon,playerMade:true}),...saved.filter(w=>w.id!==focusWeapon.id)];for(let i=0;i<playerWeapons.length;i++){if(!Array.isArray(playerWeapons[i]))continue;if(i===0){saved.forEach(w=>{playerWeapons[i]=ensureWeaponInLoadout(playerWeapons[i],w)})}else{saved.forEach(w=>{playerWeapons[i]=ensureWeaponInLoadout(playerWeapons[i],w)})}}if(focusWeapon&&playerWeapons[0]){let idx=playerWeapons[0].findIndex(x=>x.id===focusWeapon.id);if(idx>=0)selected=idx}renderWeaponSelect();if(ui.weaponSelect)ui.weaponSelect.value=String(selected)}
function equipSavedWeapon(w){w=normWeapon({...w,playerMade:true});let defs=defaultWeaponIds();if(defs.has(w.id))w.id='custom-'+Date.now();let idx=weaponDefs.findIndex(x=>x.id===w.id);if(idx>=0)weaponDefs[idx]=w;else weaponDefs.push(w);saveWeapons();weaponDefs=loadWeapons();let saved=weaponDefs.find(x=>x.id===w.id)||w;if(playerWeapons.length){for(let i=0;i<playerWeapons.length;i++){if(!playerWeapons[i])playerWeapons[i]=i===0?makeSelectedPlayerLoadout():makeBotLoadout();playerWeapons[i]=ensureWeaponInLoadout(playerWeapons[i],saved)}}else{localStorage.setItem('warheads.pendingWeaponId',saved.id)}refreshSavedWeaponsInPacks(saved);return saved}
function resize(){dpr=Math.min(devicePixelRatio||1,2);W=Math.max(320,document.documentElement.clientWidth||innerWidth);H=Math.max(420,document.documentElement.clientHeight||innerHeight);canvas.width=W*dpr;canvas.height=H*dpr;canvas.style.width='100vw';canvas.style.height='100dvh';ctx.setTransform(dpr,0,0,dpr,0,0);stars=Array.from({length:220},()=>({x:rand(0,world.w),y:rand(0,world.h),r:rand(.7,2.2),a:rand(.18,.85),d:rand(.2,1),c:Math.random()<.08?'#ff4dff':Math.random()<.18?'#00e5ff':'#dfffd1'}));if(ships.length&&!busy)fitCameraToShips();}
function toScreen(p){return{x:(p.x-cam.x)*cam.z+W/2,y:(p.y-cam.y)*cam.z+H/2}} function toWorld(x,y){return{x:(x-W/2)/cam.z+cam.x,y:(y-H/2)/cam.z+cam.y}}
function planetCap(){return Math.max(1,Math.round((+modSettings.planetCapBase||14)+(settings.players||2)*(+modSettings.planetCapPerPlayer||5)))}
function planetFloor(){return Math.max(0,Math.min(+modSettings.planetFloorMax||4,Math.floor((settings.players||2)*(+modSettings.planetFloorPerPlayer||.45))+(+modSettings.planetFloorBase||1)))}
function clampPlanetPosition(x,y,r){r=Number.isFinite(r)?r:120;return{x:clamp(x,PLAYFIELD_MARGIN+r,world.w-PLAYFIELD_MARGIN-r),y:clamp(y,PLAYFIELD_MARGIN+r,world.h-PLAYFIELD_MARGIN-r)}}
function isPlanetBirthSafe(p){return !p?.bornAt||performance.now()-p.bornAt>2600}
function fullPlayfieldZoom(){return clamp(Math.min(W/Math.max(1,world.w),H/Math.max(1,world.h))*.92,.25,1.25)}
function isMobileViewport(){return Math.min(W,H)<760||navigator.maxTouchPoints>1}
function planetTiles(color,r){
  let palettes=[
    ['#526d45','#35472f','#88a46a','#171b14','#c6d193'],
    ['#75523b','#4a3028','#a77b50','#1b1210','#d2b06f'],
    ['#556d7c','#314653','#8aa5ab','#10191d','#c8d7d6'],
    ['#766951','#494234','#a99b72','#16130f','#d6c68c'],
    ['#66615b','#403d38','#938c80','#141312','#c8beb0'],
    ['#5e5177','#3c334e','#8d79a8','#120f18','#b9a4d2'],
    ['#376166','#243d44','#69949a','#0d1619','#aac7c9']
  ];
  let scheme=palettes[Math.floor(rand(0,palettes.length))];
  let patches=[],specks=[],bands=Math.floor(rand(3,7)),phase=rand(0,9);
  let patchCount=Math.floor(clamp(r/10,14,38));
  for(let i=0;i<patchCount;i++){
    let a=rand(0,Math.PI*2),d=Math.sqrt(rand(.02,.86)),sz=rand(.045,.18);
    patches.push({x:Math.cos(a)*d,y:Math.sin(a)*d,w:sz*rand(.75,1.8),h:sz*rand(.45,1.25),c:scheme[Math.floor(rand(0,3))],a:rand(.32,.82)});
  }
  let speckCount=Math.floor(clamp(r/18,6,18));
  for(let i=0;i<speckCount;i++){
    let a=rand(0,Math.PI*2),d=Math.sqrt(rand(.04,.78));
    specks.push({x:Math.cos(a)*d,y:Math.sin(a)*d,s:rand(.012,.03),c:Math.random()<.65?scheme[3]:scheme[4],a:rand(.22,.55)});
  }
  return{scheme,patches,specks,bands,phase};
}
function makePlanet(x=rand(250,world.w-250),y=rand(250,world.h-250),r=rand(90,260),force=false,kind=null){
  let pos=clampPlanetPosition(x,y,r);x=pos.x;y=pos.y;
  if(!force&&planets.length>=planetCap())return nearestPlanet(x,y)||planets[0];
  let ansi=planetTiles('#888',r),meteor=kind==='meteor'||(!kind&&Math.random()<.28);
  let bumpCount=meteor?42:32;
  let p={x,y,r,max:r,integrity:1,craters:[],kind:meteor?'meteor':'planet',bornAt:performance.now(),bumps:Array.from({length:bumpCount},(_,i)=>({a:i/bumpCount*Math.PI*2,off:rand(meteor?-.18:-.075,meteor?.16:.08),w:rand(.55,1.55)})),rings:!meteor&&Math.random()<.13,color:ansi.scheme[0],ansi,tiles:ansi.specks};
  planets.push(p);return p;
}
function canPlaceInitialPlanet(x,y,r,margin=80){
  if(x-r<90||y-r<90||x+r>world.w-90||y+r>world.h-90)return false;
  return !planets.some(p=>Math.hypot(p.x-x,p.y-y)<p.r+r+margin);
}
function makeInitialPlanet(x=null,y=null,r=rand(120,340),kind=null){
  for(let tries=0;tries<120;tries++){
    let rr=clamp(r*rand(.82,1.18),85,360),xx=x==null?rand(220+rr,world.w-220-rr):x,yy=y==null?rand(220+rr,world.h-220-rr):y;
    if(canPlaceInitialPlanet(xx,yy,rr,60))return makePlanet(xx,yy,rr,true,kind);
    x=null;y=null;
  }
  return null;
}
function nearestPlanet(x,y){return planets.reduce((best,p)=>!best||Math.hypot(p.x-x,p.y-y)-p.r<Math.hypot(best.x-x,best.y-y)-best.r?p:best,null)}
function shipSpawnIsClear(p,ang){
  let rr=planetRadiusAt(p,ang)+34,x=p.x+Math.cos(ang)*rr,y=p.y+Math.sin(ang)*rr;
  if(x<70||y<70||x>world.w-70||y>world.h-70)return false;
  return !planets.some(o=>o!==p&&Math.hypot(o.x-x,o.y-y)<planetRadiusAt(o,Math.atan2(y-o.y,x-o.x))+56);
}
function safeShipAngle(p,desired){
  if(shipSpawnIsClear(p,desired))return desired;
  let best=desired,bestScore=-999;
  for(let i=0;i<96;i++){
    let a=i/96*Math.PI*2;
    if(!shipSpawnIsClear(p,a))continue;
    let outward=Math.cos(a-desired),edge=Math.min(p.x+Math.cos(a)*p.r,world.w-(p.x+Math.cos(a)*p.r),p.y+Math.sin(a)*p.r,world.h-(p.y+Math.sin(a)*p.r));
    let score=outward*4+edge/500;
    if(score>bestScore){bestScore=score;best=a}
  }
  return best;
}
function placeShip(s,p,ang){s.planet=p;s.a=ang;let r=planetRadiusAt(p,ang)+34;s.x=p.x+Math.cos(ang)*r;s.y=p.y+Math.sin(ang)*r;s.rot=ang+Math.PI/2}
function snapShipToPlanet(s,p=nearestPlanet(s.x,s.y)){if(!p)return;placeShip(s,p,Math.atan2(s.y-p.y,s.x-p.x))}
function reattachLostShips(){ships.forEach(s=>{if(s.hp<=0)return;let p=nearestPlanet(s.x,s.y);if(!p)return;let d=Math.hypot(s.x-p.x,s.y-p.y),a=Math.atan2(s.y-p.y,s.x-p.x),surface=planetRadiusAt(p,a)+22,lost=!s.planet||s.planet.integrity<=.08||d>surface+135||d<surface-60;if(lost){let now=performance.now();if(!s.lostStartedAt){s.lostStartedAt=now;s.lostGrace=rand(3000,5000)}s.lost=(s.lost||0)+1;let elapsed=now-s.lostStartedAt;if(elapsed<s.lostGrace){s.x+=(s.vx||0);s.y+=(s.vy||0);s.vx=(s.vx||0)*.996;s.vy=(s.vy||0)*.996;return}let desiredX=p.x+Math.cos(a)*surface,desiredY=p.y+Math.sin(a)*surface,pull=clamp((elapsed-s.lostGrace)/5200,.012,.12);s.vx=(s.vx||0)+(desiredX-s.x)*pull*.008;s.vy=(s.vy||0)+(desiredY-s.y)*pull*.008;s.vx*=.985;s.vy*=.985;s.x+=s.vx;s.y+=s.vy;if(elapsed>9200){snapShipToPlanet(s,p);s.vx=s.vy=0;s.lost=0;s.lostStartedAt=0;s.lostGrace=0;toast(`${s.name} drifted back to terrain.`,900)}}else{s.lost=0;s.lostStartedAt=0;s.lostGrace=0;s.vx=(s.vx||0)*.90;s.vy=(s.vy||0)*.90;if(Math.abs(d-surface)<28)snapShipToPlanet(s,p)}})}
function fitCameraToShips(){let alive=ships.filter(s=>s.hp>0);if(!alive.length)return;let pad=360,minX=Math.min(...alive.map(s=>s.x))-pad,maxX=Math.max(...alive.map(s=>s.x))+pad,minY=Math.min(...alive.map(s=>s.y))-pad,maxY=Math.max(...alive.map(s=>s.y))+pad;cam.x=(minX+maxX)/2;cam.y=(minY+maxY)/2;cam.z=clamp(Math.min(W/(maxX-minX),H/(maxY-minY))*.82,.45,1.35)}
function focusTurnCamera(immediate=false){let s=ships[turn];if(!s)return;cam.target=s;if(immediate){cam.x=s.x;cam.y=s.y}cam.z=clamp(Math.max(cam.z,.72),.55,1.45)}
function makeShipSprite(){let cols=['#00e5ff','#ff4dff','#ffd21a','#63ff1a','#ff7b00'],c=cols[Math.floor(rand(0,cols.length))],accent=cols[Math.floor(rand(0,cols.length))],w=Math.floor(rand(4,7)),h=Math.floor(rand(6,9)),cells=[];for(let y=0;y<h;y++){for(let x=0;x<w;x++){let edge=Math.abs(x-(w-1)/2),fill=edge<rand(1.3,3.2)*(1-y/h)+.7||y>h*.58&&edge<2;if(fill)cells.push({x,y,c:Math.random()<.22?accent:c})}}return{w,h,cells}}

function setGameLoaded(on){
  inGame=!!on;
  if(app)app.classList.toggle('preGame',!inGame);
  let b=$('testBackEditor');
  if(b)b.classList.toggle('hidden',!weaponTestMode);
}
function clearGameSession(){
  shots=[];walkers=[];particles=[];beams=[];shockwaves=[];debris=[];ufos=[];boss=null;magnetFields=[];ships=[];planets=[];playerWeapons=[];busy=false;ended=false;turn=0;turnCount=0;selected=0;roundLeft=settings.turnLength||60;pendingDamage=[];pendingDeathNotices=[];pendingTurnFinishAt=0;endPauseActive=false;activeShotOwner=-1;turnWarheadsCreated=0;turnWalkersCreated=0;cam.target=null;
}
function returnToMainMenu(){
  matchMode='bot';weaponTestMode=false;testEditorWeaponId=null;editorTimerOn=false;editorTimer=0;clearGameSession();setGameLoaded(false);ui.lab.classList.remove('open');$('shipLab')?.classList.remove('open');if(ui.centerBanner)ui.centerBanner.classList.remove('show','gameover');ui.menu.classList.remove('hidden');
}
function startBotPlay(){
  matchMode='bot';weaponTestMode=false;testEditorWeaponId=null;editorTimerOn=false;editorTimer=0;setGameLoaded(true);ui.optionsPanel.classList.add('hidden');$('localLanPanel')?.classList.add('hidden');ui.menu.classList.add('hidden');if(ui.centerBanner)ui.centerBanner.classList.remove('show','gameover');newMatch();
}
function showMenuPanel(id){['optionsPanel','advancedPanel','localLanPanel'].forEach(pid=>$(pid)?.classList.add('hidden'));if(id)$(id)?.classList.remove('hidden')}
function openLocalLanSetup(){clearGameSession();setGameLoaded(false);showMenuPanel('localLanPanel');ui.menu.classList.remove('hidden')}
function startLocalLanMatch(){
  matchMode='local';weaponTestMode=false;testEditorWeaponId=null;editorTimerOn=false;editorTimer=0;
  let h=clamp(parseInt($('localHumans')?.value||2,10),0,4),b=clamp(parseInt($('localBots')?.value||2,10),0,8);
  if(h+b<2){b=2-h;if(b<0){h=2;b=0}if($('localBots'))$('localBots').value=String(b);if($('localHumans'))$('localHumans').value=String(h)}
  settings.localHumans=h;settings.localBots=b;settings.players=h+b;settings.turnLength=clamp(parseInt($('localTurn')?.value||60,10),20,120);settings.physics=$('localPhysics')?.value||'teleport';
  settings.playerPackChoice=(ui.menuPlayerPack&&ui.menuPlayerPack.value)||settings.playerPackChoice||'gold';settings.packMode=settings.playerPackChoice;localStorage.setItem('warheads.playerPackChoice',settings.playerPackChoice);
  setGameLoaded(true);showMenuPanel(null);ui.menu.classList.add('hidden');if(ui.centerBanner)ui.centerBanner.classList.remove('show','gameover');newMatch();startMusic();
}
function startWeaponTest(saved){
  matchMode='test';weaponTestMode=true;testEditorWeaponId=saved?.id||null;editorTimerOn=false;editorTimer=0;settings.players=2;settings.turnLength=120;settings.physics='bounce';settings.playerPackChoice=(ui.menuPlayerPack&&ui.menuPlayerPack.value)||settings.playerPackChoice||'gold';settings.packMode=settings.playerPackChoice;localStorage.setItem('warheads.playerPackChoice',settings.playerPackChoice);setGameLoaded(true);ui.optionsPanel.classList.add('hidden');ui.menu.classList.add('hidden');if(ui.centerBanner)ui.centerBanner.classList.remove('show','gameover');newMatch();if(saved&&playerWeapons[0]){playerWeapons[0]=ensureWeaponInLoadout(playerWeapons[0],saved);selected=Math.max(0,playerWeapons[0].findIndex(x=>x.id===saved.id));renderWeaponSelect();}let b=$('testBackEditor');if(b)b.classList.remove('hidden');toast(`Testing ${saved?.name||'new weapon'} against 1 bot.`,1700);syncUI();
}
function backToWeaponEditor(){
  let id=testEditorWeaponId;clearGameSession();setGameLoaded(false);weaponTestMode=false;ui.menu.classList.add('hidden');ui.lab.classList.add('open');weaponDefs=loadWeapons();editing=Math.max(0,weaponDefs.findIndex(w=>w.id===id));loadEditor();
}
function newMatch(){
  if(matchMode==='local'){
    settings.players=clamp((settings.localHumans||0)+(settings.localBots||0),2,12);
    settings.turnLength=clamp(settings.turnLength||60,20,120);
    settings.physics=settings.physics||'teleport';
  }else if(!weaponTestMode){settings.players=clamp(parseInt(ui.menuPlayers.value||8,10),2,8);settings.turnLength=clamp(parseInt(ui.menuTurn.value||120,10),20,120);settings.physics=ui.menuPhysics.value||'bounce';}else{settings.players=2;settings.turnLength=120;settings.physics='bounce';}settings.playerPackChoice=(ui.menuPlayerPack&&ui.menuPlayerPack.value)||settings.playerPackChoice||'gold';settings.packMode=settings.playerPackChoice;localStorage.setItem('warheads.playerPackChoice',settings.playerPackChoice);settings.addSavedPack=!ui.menuUsePack||ui.menuUsePack.value!=='no';weaponDefs=loadWeapons();readUfoOptions();applyAimArcOptions();settings.ufoMax=clamp(parseInt(ui.menuUfoMax.value||3,10),1,5);settings.bossChance=clamp(+ui.menuBossChance.value||0,0,.35);
  world.w=(+modSettings.worldWidthBase||2800)+settings.players*(+modSettings.worldWidthPerPlayer||560);world.h=(+modSettings.worldHeightBase||1800)+settings.players*(+modSettings.worldHeightPerPlayer||300);planets=[];
  let anchors=[];
  for(let i=0;i<settings.players;i++){
    let a=i/settings.players*Math.PI*2-Math.PI*.08,rx=world.w*.35,ry=world.h*.30,r=rand(210,380);
    let ap=makeInitialPlanet(world.w/2+Math.cos(a)*rx,world.h/2+Math.sin(a)*ry,r,'planet');if(!ap)ap=makePlanet(world.w/2+Math.cos(a)*rx,world.h/2+Math.sin(a)*ry,r,true,'planet');anchors.push(ap);
  }
  let planetTarget=Math.min(planetCap()-1,9+settings.players*4),guard=0;
  while(planets.length<planetTarget&&guard++<260){
    let meteor=Math.random()<.38,r=meteor?rand(75,210):rand(130,380);
    makeInitialPlanet(null,null,r,meteor?'meteor':'planet');
  }
  ships=[];playerWeapons=[];let colors=['#66d9ff','#ff7b66','#ffd15f','#b9ffd4','#cba6ff','#79e39d','#ff86cf','#ffffff'];
  let localHumans=matchMode==='local'?clamp(settings.localHumans||0,0,settings.players):1;
  for(let i=0;i<settings.players;i++){
    let isAi=matchMode==='local'?i>=localHumans:i>0;
    playerWeapons[i]=isAi?makeBotLoadout():makeSelectedPlayerLoadout();
    let humanName=matchMode==='local'?`Player ${i+1}`:'Player',botName=matchMode==='local'?`Bot ${Math.max(1,i-localHumans+1)}`:`Bot ${i}`;
    let s={hp:MAX_HEALTH,maxHp:MAX_HEALTH,color:colors[i%colors.length],defense:defenses[i%defenses.length].id,defenseBroken:false,defenseHp:1,defenseFreshTurn:-1,name:isAi?botName:humanName,ai:isAi,whiteoutUsed:false,vx:0,vy:0,lost:0,lostStartedAt:0,lostGrace:0,sprite:(isAi?chooseBotSprite():(i===0?choosePlayerSprite():makeShipSprite())),deathAnnounced:false};
    ships.push(s);
    let p=anchors[i%anchors.length],desired=Math.atan2(p.y-world.h/2,p.x-world.w/2);
    placeShip(s,p,safeShipAngle(p,desired));
  }
  resetAllDefenses();
  shots=[];particles=[];beams=[];walkers=[];debris=[];ufos=[];boss=null;magnetFields=[];turn=0;turnCount=0;nextUfoAt=scheduleUfo();busy=false;ended=false;selected=0;defenseIndex=0;roundLeft=settings.turnLength;lastDamage=Array(settings.players).fill(0);roundDamage=Array(settings.players).fill(0);pendingDamage=Array(settings.players).fill(0);pendingDeathNotices=[];pendingTurnFinishAt=0;endPauseActive=false;turnStartHp=ships.map(s=>s.hp);damageFloaters=[];wind=rand(-.012,.012);
  if(ui.centerBanner){clearTimeout(showCenter.t);ui.centerBanner.classList.remove('show','gameover')}
  fitCameraToShips();focusTurnCamera(true);if(isMobileViewport()){cam.x=world.w/2;cam.y=world.h/2;cam.z=fullPlayfieldZoom();cam.target=null}renderWeaponSelect();syncUI();toast(matchMode==='local'?'Local turn-based match ready.':'Clean spawn. Aim, fire, survive.');if(ships[turn]?.ai)setTimeout(()=>shoot(true),900);
}function defenseLabel(id){return (defenses.find(d=>d.id===id)||defenses[0]).label}
function currentLoadout(){return playerWeapons[turn]||playerWeapons[0]||weaponDefs}
function defenseMaxHits(id){return id==='absorb'?ABSORB_HITS:1}
function resetDefenseForTurn(s){if(!s)return;s.defenseBroken=false;s.defenseHp=defenseMaxHits(s.defense);s.defenseFreshTurn=turnCount;}
function resetAllDefenses(){ships.forEach(resetDefenseForTurn)}
function defenseIsActive(s){return !!(s&&s.hp>0&&s.defense&&!s.defenseBroken&&(s.defenseHp??defenseMaxHits(s.defense))>0)}
function consumeDefense(s,hits=1){if(!defenseIsActive(s))return false;s.defenseHp=Math.max(0,(s.defenseHp??defenseMaxHits(s.defense))-hits);if(s.defenseHp<=0){s.defenseBroken=true;s.defenseHp=0;spark(s.x,s.y,s.defense==='absorb'?64:36,s.defense==='absorb'?'#b9ffd4':'#9ff','smoke');toast(`${s.name}'s ${defenseLabel(s.defense)} collapsed.`,850)}return true}
function syncUI(){if(!ships.length)return;let load=currentLoadout(),enemies=ships.filter((s,i)=>i!==0&&s.hp>0),enemyHp=enemies.length?enemies.reduce((a,s)=>a+s.hp,0)/enemies.length:0,pMax=ships[0]?.maxHp||MAX_HEALTH;ui.pHealth.style.transform=`scaleX(${clamp(ships[0].hp/pMax,0,1)})`;ui.eHealth.style.transform=`scaleX(${clamp(enemyHp/MAX_HEALTH,0,1)})`;ui.timerText.textContent=Math.ceil(roundLeft);let active=ships[turn];ui.turnText.textContent=ended?'MATCH OVER':busy?'SHOT IN FLIGHT':active?`${active.name.toUpperCase()} TURN`:'READY';if(ui.fire){ui.fire.disabled=!!(busy||ended||!active||active.ai);ui.fire.textContent=active&&active.ai?'BOT THINKING':'FIRE';}ui.angleText.textContent=ui.angle.value+' deg';ui.powerText.textContent=ui.power.value;ui.weaponText.textContent=load[selected]?.name||'-';if(editorTimerOn)ui.timerText.textContent=Math.ceil(editorTimer);let ds=ships[turn],label=defenseLabel(ds?.defense);if(ds&&ds.defense==='absorb'&&defenseIsActive(ds))label+=` ${ds.defenseHp}/${ABSORB_HITS}`;if(ds?.defenseBroken)label+=' (down)';ui.defenseText.textContent=label;ui.zoomText.textContent=Math.round(cam.z*100)+'%';ui.pDmg.textContent='Damage dealt '+lastDamage[0];ui.eDmg.textContent='Damage taken '+lastDamage[1];if(!ships[turn]?.ai)ui.weaponSelect.value=String(selected);ui.defenseSelect.value=ships[turn]?.defense||'repel';if(ui.fire){ui.fire.disabled=!!(busy||ended||!ships[turn]||ships[turn].ai);ui.fire.style.opacity=ui.fire.disabled ? .55 : 1;}}
function renderWeaponSelect(){let load=(ships.length?currentLoadout():(playerWeapons[0]||makeSelectedPlayerLoadout()));if(!playerWeapons[0]&&!ships.length)playerWeapons[0]=load;selected=clamp(selected,0,Math.max(0,load.length-1));ui.weaponSelect.innerHTML='';load.forEach((w,i)=>{let o=document.createElement('option');o.value=i;o.textContent=w.name;ui.weaponSelect.appendChild(o)});ui.weaponSelect.value=selected;}
function toast(t,ms=1400){ui.toast.textContent=t;ui.toast.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>ui.toast.classList.remove('show'),ms)}
function shoot(auto=false){if(busy||ended||!ships.length||!ships[turn])return;if(!auto&&ships[turn].ai)return;resetShotCaps();if(!ships[turn].ai){ships[turn].defense=ui.defenseSelect.value||ships[turn].defense||'repel';resetDefenseForTurn(ships[turn])}if(auto){let load=currentLoadout();if(ships[turn]?.ai){ships[turn].queuedBotWeapon=chooseRandomBotWeaponIndex(load,ships[turn].lastBotWeaponIndex)}else{selected=Math.floor(rand(0,Math.max(1,load.length)))}ships[turn].defense=defenses[Math.floor(rand(0,defenses.length))].id;resetDefenseForTurn(ships[turn])}let phrase=insults[Math.floor(rand(0,insults.length))];busy=true;sfx('charge');toast(phrase,Math.max(2450,(+modSettings.fireDelayMs||1850)+700));setTimeout(()=>launchShot(),clamp(+modSettings.fireDelayMs||1850,0,6000));syncUI();}
function shotWouldHitOwnPlanet(s,ang,distLimit=190){
  if(!s?.planet)return false;
  let x=s.x+Math.cos(ang)*24,y=s.y-Math.sin(ang)*24,vx=Math.cos(ang)*6,vy=-Math.sin(ang)*6;
  for(let i=0;i<42;i++){x+=vx;y+=vy;let p=hitPlanet(x,y);if(p===s.planet)return Math.hypot(x-s.x,y-s.y)<distLimit;if(p)return false;}
  return false;
}
function saferBotAngle(s,desired,target){
  if(!shotWouldHitOwnPlanet(s,desired))return desired;
  let dx=(target?.x||s.x)-s.x,best=desired,bestScore=999;
  for(let i=0;i<=90;i++){
    let a=.08+i/90*(Math.PI-.16);
    if(dx<0&&a<Math.PI*.42)continue;
    if(dx>0&&a>Math.PI*.58)continue;
    if(shotWouldHitOwnPlanet(s,a,230))continue;
    let dirPenalty=dx<0?Math.abs(Math.PI*.64-a):Math.abs(Math.PI*.36-a);
    let score=Math.abs(a-desired)+dirPenalty*.45+Math.random()*.04;
    if(score<bestScore){bestScore=score;best=a}
  }
  return best;
}
function muzzlePoint(s,ang){
  let x=s.x+Math.cos(ang)*34,y=s.y-Math.sin(ang)*34;
  if(s?.planet&&hitPlanet(x,y)===s.planet){let out=Math.atan2(s.y-s.planet.y,s.x-s.planet.x),r=planetRadiusAt(s.planet,out)+44;x=s.planet.x+Math.cos(out)*r;y=s.planet.y+Math.sin(out)*r;}
  return{x,y};
}

function shotSfxType(w){let acts=(w?.stages||[]).map(s=>s.action);if(acts.includes('napalm'))return 'napalm';if(acts.includes('splitter')||acts.includes('dig'))return 'drill';if(acts.includes('build'))return 'build';if(acts.includes('laser'))return 'whiteout';return 'launch'}
function nearestTargetForShot(sh){let best=null,bestD=Infinity;ships.forEach((t,i)=>{if(!t||t.hp<=0||i===sh.owner)return;let d=Math.hypot(t.x-sh.x,t.y-sh.y);if(d<bestD){bestD=d;best=t}});return best}
function guideShotToNearestPlayer(sh,dt){let t=nearestTargetForShot(sh);if(!t)return;let d=Math.max(1,Math.hypot(t.x-sh.x,t.y-sh.y));if(d>1500)return;let a=Math.atan2(t.y-sh.y,t.x-sh.x),dtf=clamp(dt/16,.5,3),boost=SOFT_HOMING*dtf*clamp(1-d/1600,.24,1.25);sh.vx+=Math.cos(a)*boost;sh.vy+=Math.sin(a)*boost}
function applyAimArcOptions(){let v=(ui.menuAimArc&&ui.menuAimArc.value)||'0-180',parts=v.split('-').map(Number);settings.aimArcMin=Number.isFinite(parts[0])?parts[0]:0;settings.aimArcMax=Number.isFinite(parts[1])?parts[1]:180;if(ui.angle){ui.angle.min=settings.aimArcMin;ui.angle.max=settings.aimArcMax;ui.angle.value=clamp(+ui.angle.value||45,settings.aimArcMin,settings.aimArcMax)}}
function readUfoOptions(){let rate=ui.menuUfoRate?ui.menuUfoRate.value:'15';if(rate==='0'){settings.ufoMinutes=0;settings.ufoMinMinutes=0;settings.ufoMaxMinutes=0;return}let preset=rate==='custom'?null:+rate;if(preset){settings.ufoMinMinutes=preset;settings.ufoMaxMinutes=preset*2;if(ui.menuUfoMinTime)ui.menuUfoMinTime.value=settings.ufoMinMinutes;if(ui.menuUfoMaxTime)ui.menuUfoMaxTime.value=settings.ufoMaxMinutes}else{settings.ufoMinMinutes=clamp(+ui.menuUfoMinTime.value||15,1,180);settings.ufoMaxMinutes=clamp(+ui.menuUfoMaxTime.value||Math.max(30,settings.ufoMinMinutes),settings.ufoMinMinutes,240)}settings.ufoMinutes=settings.ufoMinMinutes}
function randomPlanetSpot(r=rand(90,280)){for(let tries=0;tries<90;tries++){let x=rand(PLAYFIELD_MARGIN+r,world.w-PLAYFIELD_MARGIN-r),y=rand(PLAYFIELD_MARGIN+r,world.h-PLAYFIELD_MARGIN-r);if(!planets.some(p=>Math.hypot(p.x-x,p.y-y)<(p.r+r)*.78))return{x,y,r}}let pos=clampPlanetPosition(rand(220,world.w-220),rand(160,world.h-180),r);return{x:pos.x,y:pos.y,r}}
function magnetVortex(x,y,r,str,c){magnetFields.push({x,y,r,life:80,max:80,str,c});magnetFields=magnetFields.slice(-8);shockwave(x,y,clamp(r*.45,50,240),c||'#66d9ff')}

function launchShot(){let s=ships[turn];if(!s||s.hp<=0){busy=false;return}let load=currentLoadout(),target=chooseTarget(turn),ang=clamp((+ui.angle.value)*Math.PI/180,(settings.aimArcMin||0)*Math.PI/180,(settings.aimArcMax||180)*Math.PI/180),pow=(+ui.power.value),weaponIndex=clamp(selected,0,Math.max(0,load.length-1)),w=load[weaponIndex]||load[0]||weaponDefs[0];pendingDamage=Array(ships.length).fill(0);pendingDeathNotices=[];pendingTurnFinishAt=0;endPauseActive=false;turnStartHp=ships.map(s=>s.hp);if(s.ai&&target){let blocked=lineBlocker(s,target),ownBlocked=rayHitsPlanet(s,target,s.planet,.02,.42),aim=blocked?blocked:target,dx=aim.x-s.x,dy=aim.y-s.y,adx=Math.max(1,Math.abs(dx)),elev=clamp(Math.atan2(Math.max(55,-dy)+Math.abs(dy)*.24,adx)+rand(-.14,.22),.18,Math.PI*.49);ang=dx<0?Math.PI-elev:elev;if(ownBlocked||shotWouldHitOwnPlanet(s,ang,260))ang=saferBotAngle(s,ang,target);pow=clamp(adx/11+Math.abs(dy)/25+rand(blocked?14:-2,blocked?36:26)+(ownBlocked?16:0),42,150);weaponIndex=(s.queuedBotWeapon!=null&&!blocked&&!ownBlocked&&!isSniperOnlyWeapon(load[clamp(s.queuedBotWeapon,0,Math.max(0,load.length-1))]))?clamp(s.queuedBotWeapon,0,Math.max(0,load.length-1)):chooseBotWeaponIndex(load,!!blocked,ownBlocked,s.lastBotWeaponIndex);s.queuedBotWeapon=null;w=load[weaponIndex]||nonSniperPool(load)[0]?.w||load[0]||weaponDefs[0];s.lastBotWeaponIndex=weaponIndex;if(blocked)toast(`${s.name} is carving a path with ${w.name}.`,900);else if(ownBlocked)toast(`${s.name} is arcing around home terrain with ${w.name}.`,900);else toast(`${s.name} selected ${w.name}.`,900)}if(!w){queueFinishTurn(650);return}if(w.id==='whiteout'){if(s.whiteoutUsed){spark(s.x,s.y,55,'#c8c8c8','smoke');toast('Whiteout fizzled.',900);queueFinishTurn(650);return}s.whiteoutUsed=true}let m=muzzlePoint(s,ang),scale=w.type==='sniper'?clamp((+modSettings.shotPowerScale||.18)*1.22,.05,1):clamp(+modSettings.shotPowerScale||.18,.05,1);sfx(shotSfxType(w));let fired=addShot({x:m.x,y:m.y,vx:Math.cos(ang)*pow*scale,vy:-Math.sin(ang)*pow*scale,owner:turn,weapon:weaponIndex,color:w.color,trail:[],age:0,wraps:0,sniper:w.type==='sniper',maxLife:SHOT_MAX_LIFE},1);if(fired)cam.target=fired;syncUI();}
function chooseTarget(owner){let me=ships[owner],alive=ships.map((s,i)=>({s,i,d:me?Math.hypot(s.x-me.x,s.y-me.y):0})).filter(o=>o.i!==owner&&o.s.hp>0);alive.sort((a,b)=>a.d-b.d);return alive.length?alive[0].s:null}
function rayHitsPlanet(a,b,planet,t0=.08,t1=.92){if(!a||!b||!planet)return false;for(let t=t0;t<=t1;t+=.025){let x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;if(hitPlanet(x,y)===planet)return true}return false}
function lineBlocker(a,b){if(!a||!b)return null;for(let t=.10;t<=.92;t+=.035){let x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t,p=hitPlanet(x,y);if(p&&p!==a.planet&&Math.hypot(x-a.x,y-a.y)>70&&Math.hypot(x-b.x,y-b.y)>42)return{planet:p,x,y,t}}return null}
function weaponDestructionScore(w){return (w?.stages||[]).reduce((n,s)=>n+({dig:6,splitter:9,warburst:7,cluster:6,napalm:7,machine:7,explode:4,burst:3,laser:3,whiteout:2,homing:4,spread:4,shotgun:4,wave:4,walker:5,orbit:5,build:-5}[s.action]||0),0)}
function isSniperOnlyWeapon(w){return !w||w.id==='sniper'||w.type==='sniper'}
function nonSniperPool(load,last=-1){let pool=(load||[]).map((w,i)=>({w,i})).filter(o=>o.w&&!isSniperOnlyWeapon(o.w));if(pool.length>1&&last>=0){let filtered=pool.filter(o=>o.i!==last);if(filtered.length)pool=filtered}return pool}
function chooseRandomBotWeaponIndex(load,last=-1){
  if(!load?.length)return 0;
  let pool=nonSniperPool(load,last);
  if(!pool.length)pool=load.map((w,i)=>({w,i})).filter(o=>o.w);
  return pool.length?pool[Math.floor(rand(0,pool.length))].i:0;
}
function chooseBotWeaponIndex(load,blocked,ownBlocked=false,last=-1){
  if(!load?.length)return 0;
  let pool=nonSniperPool(load,last);
  if(!pool.length)pool=load.map((w,i)=>({w,i})).filter(o=>o.w);
  if(blocked&&!ownBlocked){let best=pool[0]?.i||0,score=-999;pool.forEach(({w,i})=>{let sc=weaponDestructionScore(w)+Math.random()*.35;if(sc>score){score=sc;best=i}});return best}
  if(ownBlocked){let safe=pool.map(o=>({...o,sc:weaponDestructionScore(o.w)})).filter(o=>o.sc<=5);if(safe.length)return safe[Math.floor(rand(0,safe.length))].i;return chooseRandomBotWeaponIndex(load,last)}
  return chooseRandomBotWeaponIndex(load,last);
}
function fireLaser(s,ang,dir,w){let x=s.x,y=s.y,hx=x,hy=y;for(let i=0;i<380;i++){x+=Math.cos(ang)*dir*8;y-=Math.sin(ang)*8;let hit=hitPlanet(x,y)||hitShip(x,y,turn);if(hit||x<0||y<0||x>world.w||y>world.h){hx=x;hy=y;break}}beams.push({x1:s.x,y1:s.y,x2:hx,y2:hy,life:22,color:w.color});runStages(hx,hy,w,turn,selected);cam.target={x:hx,y:hy};}
function planetRadiusAt(p,a){let bump=p.bumps.reduce((sum,b)=>sum+Math.cos(a-b.a)*b.off*b.w,0)/p.bumps.length*5;let cut=p.craters.reduce((m,c)=>{let da=Math.atan2(Math.sin(a-c.a),Math.cos(a-c.a));return Math.max(m,Math.max(0,1-Math.abs(da)/c.span)*c.depth)},0);return clamp(p.r*(1+bump)-cut,p.r*.28,p.r*1.3)}
function hitPlanet(x,y){return planets.find(p=>{let a=Math.atan2(y-p.y,x-p.x),d=Math.hypot(p.x-x,p.y-y);return d<planetRadiusAt(p,a)})} function hitShip(x,y,owner){return ships.find((s,i)=>i!==owner&&s.hp>0&&Math.hypot(s.x-x,s.y-y)<24)}
function queueFinishTurn(delay=POST_SHOT_PAUSE){pendingTurnFinishAt=Math.max(pendingTurnFinishAt||0,performance.now()+delay)}
function showCenter(title,sub='',mode='notice',ms=1800){if(!ui.centerBanner)return;clearTimeout(showCenter.t);ui.centerTitle.textContent=title;ui.centerSub.textContent=sub;ui.centerBanner.classList.toggle('gameover',mode==='gameover');ui.centerBanner.classList.add('show');if(mode!=='gameover'){showCenter.t=setTimeout(()=>ui.centerBanner.classList.remove('show','gameover'),ms)}}
function showTurnDamagePopups(){pendingDamage.forEach((d,i)=>{if(d>0&&ships[i])damageFloaters.push({x:ships[i].x,y:ships[i].y-58,text:`-${d} HP`,color:'#ff8a62',life:135,vy:-.24,scale:1})});if(pendingDeathNotices.length){let n=pendingDeathNotices[0];showCenter(`${n.victim} destroyed`,`${n.killer} finished them with ${n.weapon}.`,'notice',POST_SHOT_PAUSE+900)}}
function beginEndTurnPause(){if(endPauseActive||ended)return;endPauseActive=true;let shooter=ships[turn];if(shooter)cam.target=shooter;showTurnDamagePopups();setTimeout(finishTurn,POST_SHOT_PAUSE)}
function recordDamage(targetIndex,owner,dmg,w){let s=ships[targetIndex];if(!s||dmg<=0)return;pendingDamage[targetIndex]=(pendingDamage[targetIndex]||0)+dmg;let killer=ships[owner]?.name||'Unknown',weapon=w?.name||'Unknown weapon';if(s.hp<=0&&!s.deathAnnounced){s.deathAnnounced=true;let notice={victim:s.name,killer,weapon};pendingDeathNotices.push(notice);toast(`${notice.victim} was destroyed by ${notice.killer} using ${notice.weapon}.`,2400)}}
function runStages(x,y,w,owner,weaponIndex=selected,impactSpeed=0){let maxDelay=Math.max(0,...w.stages.map(s=>s.delay||0));w.stages.forEach(st=>setTimeout(()=>applyStage(x,y,{...st,impactSpeed},w,owner,weaponIndex),st.delay));queueFinishTurn(maxDelay+POST_SHOT_PAUSE)}
function spawnChaosShot(x,y,owner,stage=null,weaponIndex=null){let a=rand(0,Math.PI*2),spd=rand(2,8),load=playerWeapons[owner]||weaponDefs,wi=weaponIndex==null?Math.floor(rand(0,Math.max(1,load.length))):clamp(weaponIndex,0,Math.max(0,load.length-1)),ww=load[wi]||weaponDefs[0];return addShot({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,owner,weapon:wi,color:ww.color,stage:stage?safeStageForChild(stage):randomChildStage(),trail:[],age:0,wraps:0,maxLife:SHOT_MAX_LIFE,spawnDepth:1},1)}
function applyStage(x,y,st,w,owner,weaponIndex=selected){
  weaponIndex=clamp(weaponIndex,0,Math.max(0,(playerWeapons[owner]||weaponDefs).length-1));
  if(st.action==='laser'){
    for(let i=0;i<st.count;i++){let a=rand(0,7),len=st.radius*rand(1.2,2.8),x2=x+Math.cos(a)*len,y2=y+Math.sin(a)*len;beams.push({x1:x,y1:y,x2,y2,life:28,color:w.color});blast(x2,y2,{...st,action:'explode',radius:st.radius*.32,damage:st.damage*.55},w,owner)}return
  }
  if(st.action==='homing'){
    let t=chooseTarget(owner),a=t?Math.atan2(t.y-y,t.x-x):rand(0,7);addShot({x,y,vx:Math.cos(a)*4,vy:Math.sin(a)*4,owner,weapon:weaponIndex,color:w.color,stage:{...st,action:'explode',count:1},homing:90,trail:[],age:0,wraps:0,maxLife:SHOT_MAX_LIFE,spawnDepth:1},1);return
  }
  if(st.action==='spread'||st.action==='shotgun'||st.action==='wave'){
    let base=rand(0,7),n=st.action==='shotgun'?6:st.count;for(let i=0;i<n;i++){let a=base+(i-(n-1)/2)*(st.action==='wave'?.38:.18),spd=rand(st.action==='shotgun'?3:2,st.action==='shotgun'?7:5);addShot({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,owner,weapon:weaponIndex,color:w.color,stage:{...st,action:'explode',count:1},trail:[],age:0,wraps:0,maxLife:SHOT_MAX_LIFE,spawnDepth:1},1)}return
  }
  if(st.action==='machine'){let payload=(w.stages||[]).filter(q=>q.action!=='machine').slice(0,Math.max(1,Math.min(7,st.count||6)));if(!payload.length)payload=[{...st,action:'explode',radius:st.radius*.55,damage:st.damage*.45,count:1}];let t=chooseTarget(owner),ang=t?Math.atan2(t.y-y,t.x-x):rand(0,Math.PI*2),base=clamp(4.8+(st.damage||20)*.035,4.8,8.2);payload.forEach((stage,i)=>setTimeout(()=>{if(!(busy&&owner===activeShotOwner))return;sfx('launch');let ss=safeStageForChild(stage);addShot({x:x+Math.cos(ang)*i*8,y:y+Math.sin(ang)*i*8,vx:Math.cos(ang)*base,vy:Math.sin(ang)*base,owner,weapon:weaponIndex,color:w.color,stage:ss,trail:[],age:0,wraps:0,maxLife:SHOT_MAX_LIFE,spawnDepth:1},1)},i*92));return}
  if(st.action==='warburst'){let n=Math.min(7,MAX_WARHEADS_PER_TURN-turnWarheadsCreated);for(let i=0;i<n;i++)spawnChaosShot(x,y,owner,{...st,action:'explode',radius:clamp(st.radius*rand(.9,1.45),20,110),damage:clamp(st.damage*rand(.75,1.15),8,78),count:1},weaponIndex);return}
  if(st.action==='cluster'){w.stages.slice(0,Math.min(6,w.stages.length)).forEach((stage,i)=>setTimeout(()=>{if(busy&&owner===activeShotOwner)spawnChaosShot(x,y,owner,safeStageForChild(stage),weaponIndex)},i*80));return}
  if(st.action==='whiteout'){
    sfx('whiteout');beams.push({x1:x-70,y1:y,x2:x+70,y2:y,life:34,color:'#ffffff'});setTimeout(()=>{blast(x,y,{...st,action:'explode',radius:clamp(st.radius,70,160),damage:clamp(st.damage,50,90)},w,owner);ships.forEach((s,i)=>{let d=Math.max(1,Math.hypot(s.x-x,s.y-y));if(d<st.radius*2.4){let a=Math.atan2(s.y-y,s.x-x),push=clamp((st.radius*2.4-d)/st.radius*8,3,13);s.vx=Math.cos(a)*push;s.vy=Math.sin(a)*push;s.planet=null;s.lost=150}})},420);spark(x,y,150,'#ffffff','whiteout');return
  }
  if(st.action==='walker'){
    let p=nearestPlanet(x,y);if(!p){blast(x,y,{...st,action:'explode'},w,owner);return}
    let base=Math.atan2(y-p.y,x-p.x),n=clamp(Math.round(st.count||1),1,6);
    for(let i=0;i<n;i++){
      let a=base+(i-(n-1)/2)*.18,dir=Math.random()<.5?-1:1,r=planetRadiusAt(p,a)+24;
      addWalker({p,a,x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r,owner,weapon:weaponIndex,color:w.color,life:clamp(st.delay||6500,3500,14000),stage:{...st,action:'explode',radius:clamp(st.radius,12,50),damage:clamp(st.damage,5,45),count:1},speed:dir*rand(.010,.026),scan:0,step:rand(0,Math.PI*2)})
    }
    spark(x,y,38,w.color,'smoke');return
  }
  if(st.action==='fly'){
    for(let i=0;i<st.count;i++){let a=rand(0,Math.PI*2),spd=rand(2.4,5.4);addShot({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,owner,weapon:weaponIndex,color:w.color,stage:{...st,action:'explode',count:1},trail:[],age:0,wraps:0,maxLife:SHOT_MAX_LIFE,spawnDepth:1},1)}return
  }
  if(st.action==='orbit'){
    let p=nearestPlanet(x,y);if(!p){blast(x,y,{...st,action:'explode'},w,owner);return}
    let base=Math.atan2(y-p.y,x-p.x),n=clamp(Math.round(st.count||1),1,4),payload=w.stages.filter(q=>q.action!=='orbit').slice(0,4).map(safeOrbitStageForChild);
    if(!payload.length)payload=[safeOrbitStageForChild({...st,action:'explode',radius:clamp(st.radius,18,38),damage:clamp(st.damage||22,8,56),count:1})];
    for(let i=0;i<n;i++){
      let a=base+i/n*Math.PI*2+rand(-.42,.42),off=rand(52,88),dir=Math.random()<.5?-1:1,ticks=Math.floor(rand(150,280));
      addShot({x:p.x+Math.cos(a)*(planetRadiusAt(p,a)+off),y:p.y+Math.sin(a)*(planetRadiusAt(p,a)+off),vx:0,vy:0,owner,weapon:weaponIndex,color:w.color,stage:payload[0],orbit:p,orbitAngle:a,orbitOffset:off,orbitTicks:ticks,orbitSpeed:dir*rand(.075,.13),orbitPayload:payload,homingAfterOrbit:110,trail:[],age:0,wraps:0,maxLife:SHOT_MAX_LIFE,spawnDepth:1},1)
    }
    spark(x,y,44,w.color,'smoke');return
  }
  if(st.action==='splitter'){
    let p=hitPlanet(x,y)||nearestPlanet(x,y),base=Math.atan2(y-p.y,x-p.x);for(let i=0,n=clamp(st.count,3,8);i<n;i++){let a=base+(i-(n-1)/2)*.13,spd=clamp(3.5+st.damage*.06,3.4,8);addShot({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,owner,weapon:weaponIndex,color:w.color,splitter:true,stage:{...st,action:'dig',radius:clamp(st.radius,10,42),damage:clamp(st.damage*.65,4,45),count:1},trail:[],age:0,wraps:0,tunnel:0,maxLife:SHOT_MAX_LIFE,spawnDepth:1},1)}spark(x,y,90,w.color);return
  }
  if(st.action==='split'){
    for(let i=0,n=Math.min(st.count,7);i<n;i++)addShot({x,y,vx:Math.cos(i/n*Math.PI*2)*3,vy:Math.sin(i/n*Math.PI*2)*3,owner,weapon:weaponIndex,color:w.color,stage:{...st,action:'explode',count:1},trail:[],age:0,wraps:0,maxLife:SHOT_MAX_LIFE,spawnDepth:1},1);return
  }
  if(st.action==='burst'){
    for(let i=0;i<st.count;i++){let a=i/st.count*Math.PI*2;blast(x+Math.cos(a)*st.radius,y+Math.sin(a)*st.radius,st,w,owner)}return
  }
  blast(x,y,st,w,owner)
}

function fracturePlanetChunk(p,a,depth,heat='burst'){
  if(!p)return;
  let now=performance.now();
  if(p.lastFracture&&now-p.lastFracture<300)return;
  p.lastFracture=now;
  let oldR=p.r,loss=clamp(depth*.26,8,Math.max(12,p.r*.24));
  p.r=clamp(p.r-loss,34,p.max||p.r);
  p.integrity=clamp(p.integrity-.04,.10,.58);
  p.texture=null;
  let chunkCount=(planets.length<planetCap()&&oldR>82)?clamp(Math.round(depth/34),1,4):0;
  for(let i=0;i<chunkCount&&planets.length<planetCap();i++){
    let side=a+rand(-.62,.62),nr=clamp(rand(oldR*.16,oldR*.34),34,128),dist=oldR+nr+rand(2,26);
    let np=makePlanet(p.x+Math.cos(side)*dist,p.y+Math.sin(side)*dist,nr,true,'meteor');
    if(np){np.integrity=clamp(.38+Math.random()*.30,.38,.72);np.craters.push({a:side+Math.PI,span:.42,depth:clamp(nr*.28,8,30),heat});np.texture=null;}
  }
  shockwave(p.x+Math.cos(a)*oldR,p.y+Math.sin(a)*oldR,clamp(depth*1.8,48,220),'#ff9b62');
}

function shockwave(x,y,r,c='#ffd15f'){shockwaves.push({x,y,r,life:32,max:32,c});shockwaves=shockwaves.slice(-MAX_SHOCKWAVES)}
function carvePlanetHit(p,x,y,st,w,orbitSafe=false){
  if(!isPlanetBirthSafe(p)&&st.action!=='build')return false;
  let a=Math.atan2(y-p.y,x-p.x),d=Math.hypot(p.x-x,p.y-y),pr=planetRadiusAt(p,a);
  if(d>=pr+st.radius)return false;
  let napalm=st.action==='napalm',tunnel=st.action==='dig'||st.action==='splitter';
  let damageForce=clamp(1+(+st.damage||0)/70,1,3.15)*clamp(+modSettings.planetDestructionScale||1,.05,8);
  let radiusForce=clamp((+st.radius||30)/42,.55,5.2);
  let depth=orbitSafe?clamp(st.radius*.38,4,20):(napalm?st.radius*1.38:(tunnel?st.radius*1.24:st.radius*1.08))*damageForce;
  let span=orbitSafe?clamp(st.radius/p.r*.35,.025,.17):clamp(st.radius/p.r*(napalm?1.28:(tunnel?1.05:.92))*clamp(damageForce*.72,.8,2.15),.075,.76);
  let maxDepth=orbitSafe?24:clamp(p.r*.64,48,162);
  depth=clamp(depth,orbitSafe?3:7,maxDepth);
  p.craters.push({a,span,depth,heat:orbitSafe?'orbit':st.action});
  p.craters=p.craters.slice(-60);
  let loss=orbitSafe?depth*.00032:(napalm?depth*.0092:(tunnel?depth*.0072:depth*.0064))*clamp(radiusForce,.8,2.4);
  p.integrity=clamp(p.integrity-loss,(p.r>72?.05:0),1);
  if((p.integrity<.18||depth>p.r*.28||(+st.damage||0)>88)&&p.r>58)fracturePlanetChunk(p,a,depth,st.action);
  for(let i=0;i<clamp(depth/4,orbitSafe?3:5,orbitSafe?10:30);i++){let da=a+rand(-.72,.72),spd=rand(.45,orbitSafe?1.8:3.2);debris.push({x,y,vx:Math.cos(da)*spd,vy:Math.sin(da)*spd,life:rand(48,150),r:rand(2,12),c:p.color})}
  spark(x,y,orbitSafe?26:(napalm?110:clamp(depth*1.2,44,170)),w.color,orbitSafe?'smoke':(napalm?'napalm':'burst'));
  shockwave(x,y,clamp(st.radius*(orbitSafe?.6:damageForce*.72),24,260),w.color);
  p.texture=null;
  return true;
}
function blast(x,y,st,w,owner){
  sfx(st.action==='build'?'build':st.action==='napalm'?'napalm':(st.action==='dig'||st.action==='splitter')?'drill':'boom');
  if(st.action==='magnet'){
    let speed=clamp(st.impactSpeed||5,2,15),strength=clamp(speed/5,.55,3.2),pullRadius=st.radius*(1.55+strength*.42);magnetVortex(x,y,pullRadius,strength,w.color||'#66d9ff');
    ships.forEach((s,i)=>{let d=Math.hypot(s.x-x,s.y-y);if(d<pullRadius){let a=Math.atan2(y-s.y,x-s.x),amt=clamp((pullRadius-d)/Math.max(1,st.radius),0,1)*4.8*strength,escape=Math.random()<.035;if(escape){s.vx=-Math.cos(a)*(4+strength*1.5);s.vy=-Math.sin(a)*(4+strength*1.5);s.planet=null;s.lost=80}else{s.vx=(s.vx||0)+Math.cos(a)*amt;s.vy=(s.vy||0)+Math.sin(a)*amt;s.planet=null;s.lost=120}}});
    shots.forEach(o=>{if(o.dead)return;let d=Math.hypot(o.x-x,o.y-y);if(d<pullRadius*.75){let a=Math.atan2(y-o.y,x-o.x),amt=clamp((pullRadius*.75-d)/pullRadius,0,1)*.18*strength;o.vx+=Math.cos(a)*amt;o.vy+=Math.sin(a)*amt}})
  }
  if(st.action==='build'){
    let p=nearestPlanet(x,y),d=p?Math.hypot(p.x-x,p.y-y):999999,a=p?Math.atan2(y-p.y,x-p.x):rand(0,Math.PI*2),size=rand(st.radius*1.6,st.radius*4.6)*clamp(+modSettings.planetBuildScale||1,.05,8);
    if(p&&d<p.r+st.radius*2.25){
      p.craters=p.craters.filter(c=>Math.abs(Math.atan2(Math.sin(a-c.a),Math.cos(a-c.a)))>c.span*1.65);
      p.r=clamp(p.r+size*1.12,36,460);p.max=Math.max(p.max,p.r);
      p.bumps.push({a,off:size/p.r*1.8,w:1.7});p.bumps=p.bumps.slice(-56);p.integrity=clamp(p.integrity+.72*clamp(+modSettings.planetRepairScale||1,.05,8),0,1);p.texture=null;
      spark(x,y,160,w.color,'build');shockwave(x,y,clamp(size*1.7,80,360),w.color)
    }else{
      let np=makePlanet(x,y,clamp(size*1.28,56,430),true,Math.random()<.22?'meteor':'planet');np.integrity=1;np.max=Math.max(np.max,np.r);
      spark(x,y,180,w.color,'build');shockwave(x,y,clamp(np.r*1.7,90,420),w.color)
    }
    maintainPlanets();return
  }
  let carved=false;
  planets.forEach(p=>{let did=carvePlanetHit(p,x,y,st,w,!!st.orbitSafe);if(did)carved=true});
  if(st.action==='napalm'&&!st.napalmSplit&&busy&&owner===activeShotOwner&&turnWarheadsCreated<MAX_WARHEADS_PER_TURN-3){
    let p=nearestPlanet(x,y),base=p?Math.atan2(y-p.y,x-p.x):rand(0,Math.PI*2),n=2;
    for(let i=0;i<n;i++){let a=base+(i?1:-1)*rand(.28,.55),spd=rand(2.1,4.2);addShot({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,owner,weapon:selected,color:w.color,stage:{...st,action:'napalm',radius:clamp(st.radius*.78,16,70),damage:clamp(st.damage*.72,3,58),count:1,napalmSplit:true},trail:[],age:0,wraps:0,maxLife:SHOT_MAX_LIFE,spawnDepth:1},1)}
  }
  ships.forEach((s,i)=>{let d=Math.hypot(s.x-x,s.y-y);if(d<st.radius+28){let dmg=Math.round(st.damage*(1-d/(st.radius+28)));if(dmg>0){if(i===owner&&defenseIsActive(s)&&d<105){dmg=Math.max(0,Math.floor(dmg*.18));consumeDefense(s,1);spark(s.x,s.y,24,'#9ff','smoke');toast(`${s.name}'s defense absorbed their own blast.`,850)}let before=s.hp;s.hp=clamp(s.hp-dmg,0,s.maxHp||MAX_HEALTH);lastDamage[owner]=(lastDamage[owner]||0)+dmg;if(i!==owner)roundDamage[owner]=(roundDamage[owner]||0)+dmg;else roundDamage[owner?0:1]=(roundDamage[owner?0:1]||0)+dmg;recordDamage(i,owner,before-s.hp,w)}}});
  spark(x,y,Math.round(st.radius),w.color,st.action==='napalm'?'napalm':'burst');
  maintainPlanets();reattachLostShips();
}
function maintainPlanets(){
  let cap=planetCap(),min=planetFloor();
  planets.forEach(p=>{if(!p.dead&&p.integrity<=.075&&p.r>92){fracturePlanetChunk(p,rand(0,Math.PI*2),Math.max(42,p.r*.40),'break');p.dead=true}});
  planets=planets.filter(p=>!p.dead&&p.integrity>.035&&p.r>40).slice(0,cap);
  if(!busy&&planets.length<min){
    let need=Math.min(min-planets.length,2);
    for(let i=0;i<need;i++){let spot=randomPlanetSpot(rand(120,340));makePlanet(spot.x,spot.y,spot.r,true,Math.random()<.36?'meteor':'planet')}
  }
}
function spark(x,y,n,c,style='burst'){n*=clamp(+modSettings.particleScale||1,.1,5);for(let i=0;i<clamp(n,4,160);i++){let a=rand(0,Math.PI*2),spd=style==='napalm'?rand(.5,2.2):style==='build'?rand(.2,1.4):style==='smoke'?rand(.1,1.1):rand(.8,4.2);particles.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,life:rand(style==='napalm'?35:18,style==='napalm'?80:style==='smoke'?95:50),c:style==='napalm'?(Math.random()<.5?'#ff7b55':'#ffd15f'):style==='build'?'#79e39d':style==='smoke'?'#8b9497':style==='whiteout'?'#ffffff':c,size:style==='build'?rand(2,5):style==='smoke'?rand(4,9):rand(1.5,3.5)})}}
function finishTurn(){if(ended)return;shots=[];busy=false;maintainPlanets();activeShotOwner=-1;turnWarheadsCreated=0;turnWalkersCreated=0;pendingTurnFinishAt=0;endPauseActive=false;let alive=ships.filter(s=>s.hp>0);if((matchMode!=='local'&&ships[0].hp<=0)||alive.length<=1){ended=true;let winner=alive.length?alive.slice().sort((a,b)=>b.hp-a.hp)[0]:null,title=winner?`${winner.name} wins!`:'No survivors',sub=winner?`Match over. ${winner.name} is the last ship standing.`:'Match over. Everyone got vaporized.';showCenter(title,sub,'gameover');toast(title,2600);syncUI();return}do{turn=(turn+1)%ships.length}while(ships[turn].hp<=0);turnCount++;roundLeft=settings.turnLength;lastTick=performance.now();resetAllDefenses();defenseIndex=Math.max(0,defenses.findIndex(d=>d.id===ships[turn].defense));selected=0;pendingDamage=Array(ships.length).fill(0);pendingDeathNotices=[];turnStartHp=ships.map(s=>s.hp);if(!ships[turn].ai)renderWeaponSelect();focusTurnCamera(false);syncUI();if(ships[turn].ai)setTimeout(()=>shoot(true),900)}
function scheduleUfo(){return settings.ufoMinutes<=0?Infinity:performance.now()+rand((settings.ufoMinMinutes||settings.ufoMinutes)*60000,(settings.ufoMaxMinutes||settings.ufoMinutes*2)*60000)}
function spawnUfoEvent(){if(!ships.length||ufos.length||boss)return;if(Math.random()<settings.bossChance&&!boss){boss={x:world.w/2,y:world.h*.18,hp:1,life:900};toast('BOSS UFO event!',1600)}else{let n=Math.min(settings.ufoMax,Math.floor(rand(1,3)));for(let i=0;i<n;i++)ufos.push({x:-80-i*70,y:rand(160,world.h-160),vx:rand(2.5,5.2),life:520,hp:1});toast('UFO flyby!',1200)}nextUfoAt=scheduleUfo()}
function splitterTunnelVfx(s,p,w){let a=Math.atan2(s.y-p.y,s.x-p.x),r=planetRadiusAt(p,a),back=Math.atan2(s.vy,s.vx)+Math.PI;for(let i=0;i<14;i++){let d=rand(0,18),side=rand(-7,7);particles.push({x:s.x+Math.cos(back)*d+Math.cos(back+Math.PI/2)*side,y:s.y+Math.sin(back)*d+Math.sin(back+Math.PI/2)*side,vx:-s.vx*.06+rand(-.7,.7),vy:-s.vy*.06+rand(-.7,.7),life:rand(18,38),c:Math.random()<.5?w.color:'#ffd15f',size:rand(1.5,3.5)})}if(s.tunnel%3===0){p.craters.push({a,span:clamp((s.stage.radius*.34)/p.r,.035,.18),depth:clamp(s.stage.radius*.22,3,12),heat:'tunnel'});p.craters=p.craters.slice(-54)}if(s.tunnel%7===0)beams.push({x1:s.x-Math.cos(back)*18,y1:s.y-Math.sin(back)*18,x2:s.x+Math.cos(back)*8,y2:s.y+Math.sin(back)*8,life:10,color:w.color})}
function applyDefense(shot){let protectedHit=false;ships.forEach((target,i)=>{if(!defenseIsActive(target))return;if(i===shot.owner&&shot.age<650)return;let d=Math.hypot(shot.x-target.x,shot.y-target.y),a=Math.atan2(shot.y-target.y,shot.x-target.x);if(target.defense==='absorb'&&d<112){let absorbed=1;shot.dead=true;shot.x=target.x;shot.y=target.y;spark(target.x,target.y,48,'#b9ffd4','smoke');beams.push({x1:shot.x,y1:shot.y,x2:target.x,y2:target.y,life:12,color:'#b9ffd4'});for(let other of shots){if(other===shot||other.dead||absorbed>=((target.defenseHp??ABSORB_HITS)))continue;let od=Math.hypot(other.x-target.x,other.y-target.y);if(od<170){beams.push({x1:other.x,y1:other.y,x2:target.x,y2:target.y,life:16,color:'#b9ffd4'});other.dead=true;other.x=target.x;other.y=target.y;absorbed++;spark(target.x,target.y,16,'#b9ffd4','smoke')}}consumeDefense(target,absorbed);protectedHit=true;toast(`${target.name} absorbed ${absorbed} shot${absorbed===1?'':'s'}!`,850);return}if(d>95)return;if(target.defense==='repel'&&d<76){shot.vx+=Math.cos(a)*.72;shot.vy+=Math.sin(a)*.72;consumeDefense(target,1);protectedHit=true;toast(`${target.name} repelled the shot!`,700)}if(target.defense==='bounce'&&d<56){let sp=Math.max(3.0,Math.hypot(shot.vx,shot.vy));shot.vx=Math.cos(a)*sp*1.05;shot.vy=Math.sin(a)*sp*1.05;shot.x=target.x+Math.cos(a)*68;shot.y=target.y+Math.sin(a)*68;shot.owner=i;consumeDefense(target,1);protectedHit=true;toast(`${target.name} bounced the shot!`,700)}if(target.defense==='portal'&&d<60){if(planets.length<6)makePlanet();let p=planets[Math.floor(rand(0,planets.length))];shot.x=p.x+rand(-p.r,p.r);shot.y=p.y-p.r-rand(20,80);shot.owner=i;consumeDefense(target,1);protectedHit=true;toast(`${target.name} portal-jumped the shot.`,900)}});return protectedHit} 
function update(dt){if(editorTimerOn){editorTimer-=dt/1000;if(editorTimer>0){ui.saveStatus.textContent='Editor timer: '+Math.ceil(editorTimer)+'s';if(editorTimer<10)ui.saveStatus.style.color=Math.floor(editorTimer*2)%2?'#ff7b55':'#ffffff';if(editorTimer<4&&Math.ceil(editorTimer)!==update.lastBeep){update.lastBeep=Math.ceil(editorTimer);sfx('build')}}else{editorTimerOn=false;ui.lab.classList.remove('open');ui.saveStatus.style.color='var(--good)';newMatch();toast('Editor time done. Fight!',1400)}}starDrift+=wind*dt*.18;if(performance.now()>nextUfoAt&&!ufos.length&&!boss)spawnUfoEvent();if(!busy&&!ended&&ships.length){roundLeft-=dt/1000;if(roundLeft<=0)shoot(true)}shots.forEach(s=>{s.age+=dt;s.trail.push({x:s.x,y:s.y});if(s.trail.length>MAX_TRAIL_POINTS)s.trail.shift();s.vx+=wind;guideShotToNearestPlayer(s,dt);if(s.homing){let t=chooseTarget(s.owner);if(t){let a=Math.atan2(t.y-s.y,t.x-s.x);s.vx+=Math.cos(a)*clamp(+modSettings.homingBoost||.12,0,1);s.vy+=Math.sin(a)*clamp(+modSettings.homingBoost||.12,0,1)}s.homing--}planets.forEach(p=>{let dx=p.x-s.x,dy=p.y-s.y,d=Math.max(35,Math.hypot(dx,dy));let pull=clamp((p.r*p.r)/(d*d)*clamp(+modSettings.gravityStrength||.22,0,2),0,clamp(+modSettings.gravityMaxPull||.18,0,2));s.vx+=dx/d*pull;s.vy+=dy/d*pull});let sp=Math.hypot(s.vx,s.vy);let maxSp=clamp(+modSettings.maxShotSpeed||18,4,80);if(sp>maxSp){s.vx=s.vx/sp*maxSp;s.vy=s.vy/sp*maxSp;sp=maxSp}if(sp<1.25&&s.age>1200){let p=nearestPlanet(s.x,s.y),a=Math.atan2(p.y-s.y,p.x-s.x)+rand(-.55,.55);s.vx+=Math.cos(a)*2.2;s.vy+=Math.sin(a)*2.2}s.x+=s.vx;s.y+=s.vy;if(settings.physics==='bounce'){if(s.x<0||s.x>world.w){s.vx*=-clamp(+modSettings.bounceDamping||.86,.1,1.4);s.x=clamp(s.x,0,world.w);s.wraps++}if(s.y<0||s.y>world.h){s.vy*=-clamp(+modSettings.bounceDamping||.86,.1,1.4);s.y=clamp(s.y,0,world.h);s.wraps++}}else{if(s.x<0){s.x+=world.w;s.wraps++}if(s.x>world.w){s.x-=world.w;s.wraps++}if(s.y<0){s.y+=world.h;s.wraps++}if(s.y>world.h){s.y-=world.h;s.wraps++}}applyDefense(s);if(s.dead)return;if(s.orbit){let w=(playerWeapons[s.owner]||weaponDefs)[s.weapon]||weaponDefs[0],dtf=clamp(dt/16,.5,3);s.orbitTicks--;let a=Number.isFinite(s.orbitAngle)?s.orbitAngle:Math.atan2(s.y-s.orbit.y,s.x-s.orbit.x);a+=(s.orbitSpeed||.09)*dtf;s.orbitAngle=a;let r=planetRadiusAt(s.orbit,a)+(s.orbitOffset||64);s.x=s.orbit.x+Math.cos(a)*r;s.y=s.orbit.y+Math.sin(a)*r;if((s.orbitTicks%8)===0)particles.push({x:s.x,y:s.y,vx:rand(-.18,.18),vy:rand(-.18,.18),life:rand(18,32),size:2,c:s.color});if(s.orbitTicks<=0||Math.random()<.0025*dtf){let t=chooseTarget(s.owner),tx=t?t.x:s.orbit.x,ty=t?t.y:s.orbit.y,ang=Math.atan2(ty-s.y,tx-s.x),spd=rand(5.8,8.8),payload=s.orbitPayload||[s.stage||{action:'explode',radius:34,damage:24,count:1}];s.vx=Math.cos(ang)*spd;s.vy=Math.sin(ang)*spd;s.orbit=null;s.stage=safeOrbitStageForChild(payload[0]);s.homing=s.homingAfterOrbit||90;payload.slice(1,4).forEach((pl,k)=>{let aa=ang+rand(-.20,.20),ss=rand(5.0,8.2);addShot({x:s.x,y:s.y,vx:Math.cos(aa)*ss,vy:Math.sin(aa)*ss,owner:s.owner,weapon:s.weapon,color:s.color,stage:safeOrbitStageForChild(pl),homing:80,trail:[],age:0,wraps:0,maxLife:SHOT_MAX_LIFE,spawnDepth:(s.spawnDepth||0)+1},1)});spark(s.x,s.y,34,s.color,'smoke')}else{return}}let hp=hitPlanet(s.x,s.y),hs=hitShip(s.x,s.y,s.owner),w=(playerWeapons[s.owner]||weaponDefs)[s.weapon]||weaponDefs[0];if(hp&&s.splitter){s.tunnel=(s.tunnel||0)+1;let speed=Math.max(.01,Math.hypot(s.vx,s.vy));if(s.splitDirX===undefined){s.splitDirX=s.vx/speed;s.splitDirY=s.vy/speed;let boosted=clamp(speed*1.28,3.8,8.5);s.vx=s.splitDirX*boosted;s.vy=s.splitDirY*boosted;speed=boosted;spark(s.x,s.y,70,w.color,'splitter')}s.x+=s.splitDirX*3.2;s.y+=s.splitDirY*3.2;splitterTunnelVfx(s,hp,w);let a=Math.atan2(s.y-hp.y,s.x-hp.x),inside=Math.hypot(s.x-hp.x,s.y-hp.y)<planetRadiusAt(hp,a)-7;if(inside&&(s.splitLevel||0)<4&&s.tunnel>=((s.splitLevel||0)+1)*8){let level=(s.splitLevel||0)+1,base=Math.atan2(s.splitDirY,s.splitDirX),spd=clamp(Math.hypot(s.vx,s.vy)*.72,1.4,7.2);for(let k=-1;k<=1;k+=2){let ang=base+k*(.16+level*.08);if(level<=3)addShot({...s,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,splitDirX:Math.cos(ang),splitDirY:Math.sin(ang),splitLevel:level,tunnel:s.tunnel+1,trail:[],spawnDepth:(s.spawnDepth||0)+1},1)}s.splitLevel=level;s.vx=s.splitDirX*spd;s.vy=s.splitDirY*spd;spark(s.x,s.y,95,w.color,'splitter');beams.push({x1:s.x-s.splitDirX*24,y1:s.y-s.splitDirY*24,x2:s.x+s.splitDirX*24,y2:s.y+s.splitDirY*24,life:14,color:w.color})}speed=Math.hypot(s.vx,s.vy);if(inside&&s.tunnel<190&&speed>1.35){s.dead=false;return}if(inside){applyStage(s.x,s.y,{...s.stage,action:'explode',radius:clamp(s.stage.radius*1.15,18,70),damage:clamp(s.stage.damage*.75,4,45),impactSpeed:Math.hypot(s.vx,s.vy)},w,s.owner);s.dead=true;s.missed=true;return}s.splitter=false;s.stage={...s.stage,action:'explode',radius:clamp(s.stage.radius,12,60),damage:clamp(s.stage.damage,4,45)};s.x+=s.vx*2;s.y+=s.vy*2;spark(s.x,s.y,45,w.color,'splitter');return}if(hp||hs){let impactSpeed=Math.hypot(s.vx,s.vy);if(s.stage)applyStage(s.x,s.y,{...s.stage,impactSpeed},w,s.owner,s.weapon);else runStages(s.x,s.y,w,s.owner,s.weapon,impactSpeed);s.dead=true}if(s.age>=Math.max(SHOT_MIN_LIFE,s.maxLife||SHOT_MAX_LIFE)){s.dead=true;s.missed=true;queueFinishTurn(POST_SHOT_PAUSE)}});walkers.forEach(w=>{w.life-=dt;w.step=(w.step||0)+dt*.012;let target=ships.find((s,i)=>i!==w.owner&&s.hp>0&&Math.hypot(s.x-w.x,s.y-w.y)<210);let desired=target?Math.atan2(target.y-w.p.y,target.x-w.p.x):w.a+(w.speed||.018)*dt*.06;let steer=target?.07:.035;w.a+=Math.atan2(Math.sin(desired-w.a),Math.cos(desired-w.a))*steer;if(!target)w.a+=(w.speed||.018)*dt*.035;let r=planetRadiusAt(w.p,w.a)+24;w.x=w.p.x+Math.cos(w.a)*r;w.y=w.p.y+Math.sin(w.a)*r;let hit=ships.find((s,i)=>i!==w.owner&&s.hp>0&&Math.hypot(s.x-w.x,s.y-w.y)<36);if(hit||w.life<=0){let ww=(playerWeapons[w.owner]||weaponDefs)[w.weapon]||weaponDefs[0];applyStage(w.x,w.y,{...w.stage,radius:58,damage:48},ww,w.owner,w.weapon);for(let i=0;i<5;i++){let a=rand(0,7),spd=rand(1.6,6.8);addShot({x:w.x,y:w.y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,owner:w.owner,weapon:w.weapon,color:w.color,stage:randomChildStage(),trail:[],age:0,wraps:0,maxLife:SHOT_MAX_LIFE,spawnDepth:1},1)}w.dead=true}});walkers=walkers.filter(w=>!w.dead).slice(-MAX_LIVE_WALKERS);ufos.forEach(u=>{u.x+=u.vx;u.life--;if(u.life%42===0){let t=ships[Math.floor(rand(0,ships.length))];if(t&&t.hp>0){beams.push({x1:u.x,y1:u.y,x2:t.x,y2:t.y,life:18,color:'#9ff'});blast(t.x,t.y,{action:'explode',radius:rand(18,44),damage:rand(4,18),count:1},defaultWeapons[1],0)}else spawnChaosShot(u.x,u.y,0)}});ufos=ufos.filter(u=>u.life>0&&u.x<world.w+120&&u.hp>0).slice(0,5);if(boss){boss.life--;if(boss.life%72===0&&planets.length){let p=planets[Math.floor(rand(0,planets.length))],a=rand(0,7);blast(p.x+Math.cos(a)*planetRadiusAt(p,a),p.y+Math.sin(a)*planetRadiusAt(p,a),{action:'explode',radius:rand(28,62),damage:0,count:1},defaultWeapons[1],0)}if(boss.life<=0||boss.hp<=0){boss=null;nextUfoAt=scheduleUfo()}}ships.forEach(s=>{if(s.hp<=0)return;s.x+=(s.vx||0);s.y+=(s.vy||0);let hp=hitPlanet(s.x,s.y);if(hp&&isPlanetBirthSafe(hp)&&Math.hypot(s.vx||0,s.vy||0)>4.2){blast(s.x,s.y,{action:'explode',radius:34,damage:18,count:1},defaultWeapons[1],turn);s.vx=s.vy=0;snapShipToPlanet(s,hp)}});let anyDead=shots.some(s=>s.dead);shots=shots.filter(s=>!s.dead).slice(-MAX_LIVE_SHOTS);if(anyDead&&busy&&!shots.length&&!walkers.length&&!pendingTurnFinishAt)queueFinishTurn(POST_SHOT_PAUSE);if(busy&&!shots.length&&!walkers.length&&pendingTurnFinishAt&&performance.now()>=pendingTurnFinishAt)beginEndTurnPause();particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.life--;p.vx*=.99;p.vy*=.99});particles=particles.filter(p=>p.life>0).slice(-MAX_PARTICLES);magnetFields.forEach(m=>m.life--);magnetFields=magnetFields.filter(m=>m.life>0);damageFloaters.forEach(f=>{f.y+=f.vy;f.life--});damageFloaters=damageFloaters.filter(f=>f.life>0);debris.forEach(d=>{d.x+=d.vx;d.y+=d.vy;d.vy+=.01;d.life--});debris=debris.filter(d=>d.life>0).slice(-MAX_DEBRIS);shockwaves.forEach(sw=>sw.life--);shockwaves=shockwaves.filter(sw=>sw.life>0).slice(-MAX_SHOCKWAVES);beams.forEach(b=>b.life--);beams=beams.filter(b=>b.life>0).slice(-MAX_BEAMS);reattachLostShips();if(cam.target){cam.x+=(cam.target.x-cam.x)*.08;cam.y+=(cam.target.y-cam.y)*.08}}
function ansiRect(x,y,w,h,c,a=1){ctx.globalAlpha=a;ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));ctx.globalAlpha=1}
function drawAnsiFrame(){ctx.save();ctx.strokeStyle='rgba(57,255,20,.58)';ctx.lineWidth=2;ctx.setLineDash([10,8]);ctx.strokeRect(18,18,W-36,H-36);ctx.setLineDash([]);ctx.fillStyle='rgba(57,255,20,.75)';ctx.font='700 13px "Lucida Console","Courier New",monospace';ctx.fillText('[ STATUS: ONLINE ]',34,H-28);ctx.fillStyle='rgba(255,210,26,.82)';ctx.textAlign='center';ctx.fillText('[ PREPARE. AIM. FIRE. ]',W/2,H-28);ctx.textAlign='left';ctx.restore()}
function basePlanetRadiusAt(p,a){let bump=(p.bumps||[]).reduce((sum,b)=>sum+Math.cos(a-b.a)*b.off*b.w,0)/Math.max(1,(p.bumps||[]).length)*5;return clamp(p.r*(1+bump),p.r*.62,p.r*1.3)}
function renderPlanetTexture(p){let profile=p.ansi||{scheme:[p.color,'#4d584b','#9b926d','#141414','#c9c0a0'],patches:[],specks:p.tiles||[],bands:4,phase:0},scheme=profile.scheme||[p.color,'#4d584b','#9b926d','#141414','#c9c0a0'],texR=Math.round(clamp(p.r,64,420)),pad=Math.max(10,Math.round(texR*.10)),size=(texR+pad)*2,oc=document.createElement('canvas'),c=oc.getContext('2d');oc.width=oc.height=size;c.imageSmoothingEnabled=false;let cx=size/2,cy=size/2,r=texR;function localPath(){c.beginPath();for(let i=0;i<=112;i++){let a=i/112*Math.PI*2,rr=basePlanetRadiusAt(p,a)/Math.max(1,p.r)*r,px=cx+Math.cos(a)*rr,py=cy+Math.sin(a)*rr;i?c.lineTo(px,py):c.moveTo(px,py)}c.closePath()}c.save();localPath();c.clip();let g=c.createRadialGradient(cx-r*.36,cy-r*.42,Math.max(4,r*.06),cx+r*.16,cy+r*.14,r*1.12);g.addColorStop(0,scheme[4]||'#c8bea0');g.addColorStop(.28,scheme[2]||p.color);g.addColorStop(.58,scheme[0]||p.color);g.addColorStop(.86,scheme[1]||'#465446');g.addColorStop(1,scheme[3]||'#111');c.fillStyle=g;c.fillRect(0,0,size,size);let cell=Math.max(4,Math.round(r/18));c.globalAlpha=.13;c.fillStyle=scheme[3]||'#101010';for(let yy=cy-r;yy<cy+r;yy+=cell*2){for(let xx=cx-r;xx<cx+r;xx+=cell*2){if(((xx+yy)/cell|0)%3===0)c.fillRect(Math.round(xx),Math.round(yy),cell,cell)}}c.globalAlpha=.75;(profile.patches||[]).forEach(pt=>{let w=Math.max(cell,pt.w*r),h=Math.max(cell,pt.h*r),x=cx+pt.x*r-w/2,y=cy+pt.y*r-h/2;c.globalAlpha=pt.a*.72;c.fillStyle=pt.c;c.fillRect(Math.round(x/cell)*cell,Math.round(y/cell)*cell,Math.max(cell,Math.round(w/cell)*cell),Math.max(cell,Math.round(h/cell)*cell))});c.globalAlpha=.18;c.strokeStyle=scheme[4]||'#d0c8a8';c.lineWidth=1.2;c.setLineDash([10,16]);for(let i=-profile.bands;i<=profile.bands;i++){let y=cy+(i/(profile.bands+1))*r*.76+Math.sin(i+profile.phase)*r*.018,rx=Math.max(2,r*(.88-Math.abs(i)*.055));c.beginPath();c.ellipse(cx,y,rx,Math.max(2,r*.03),0,0,Math.PI*2);c.stroke()}c.setLineDash([]);c.globalAlpha=.20;(profile.specks||profile.glyphs||[]).forEach(t=>{let sz=Math.max(2,Math.round((t.s||.018)*r));c.fillStyle=t.c||scheme[3];c.globalAlpha=t.a||.35;c.fillRect(Math.round((cx+t.x*r)/cell)*cell,Math.round((cy+t.y*r)/cell)*cell,sz,sz)});c.restore();return{canvas:oc,r:texR,key:`${Math.round(p.r)}:${(p.bumps||[]).length}:${profile.phase}`}}
function drawPixelPlanet(p,q,r){
  let profile=p.ansi||{scheme:[p.color,'#4d584b','#9b926d','#141414','#c9c0a0'],patches:[],specks:p.tiles||[],bands:4,phase:0},scheme=profile.scheme||[p.color,'#4d584b','#9b926d','#141414','#c9c0a0'];
  function path(){ctx.beginPath();for(let i=0;i<=112;i++){let a=i/112*Math.PI*2,rr=planetRadiusAt(p,a)*cam.z,px=q.x+Math.cos(a)*rr,py=q.y+Math.sin(a)*rr;i?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.closePath()}
  let key=`${Math.round(p.r)}:${(p.bumps||[]).length}:${profile.phase}`;if(!p.texture||p.texture.key!==key)p.texture=renderPlanetTexture(p);
  ctx.save();path();ctx.clip();let oldSmooth=ctx.imageSmoothingEnabled;ctx.imageSmoothingEnabled=true;let tex=p.texture,scale=r/tex.r,w=tex.canvas.width*scale,h=tex.canvas.height*scale;ctx.drawImage(tex.canvas,q.x-w/2,q.y-h/2,w,h);ctx.imageSmoothingEnabled=oldSmooth;ctx.restore();
  path();ctx.strokeStyle=p.integrity<.35?'rgba(180,94,54,.78)':'rgba(196,206,176,.42)';ctx.lineWidth=Math.max(1,1.5*cam.z);ctx.setLineDash([7,9]);ctx.stroke();ctx.setLineDash([]);
  if(p.rings){ctx.save();ctx.translate(q.x,q.y);ctx.rotate(.35);ctx.strokeStyle='rgba(178,166,125,.30)';ctx.lineWidth=Math.max(1,4*cam.z);ctx.setLineDash([16,12]);ctx.beginPath();ctx.ellipse(0,0,r*1.58,r*.36,0,0,7);ctx.stroke();ctx.setLineDash([]);ctx.restore()}
  p.craters.forEach(c=>{let rr=planetRadiusAt(p,c.a)-c.depth*.45,cq=toScreen({x:p.x+Math.cos(c.a)*rr,y:p.y+Math.sin(c.a)*rr}),cw=Math.max(4,c.depth*cam.z*.85),ch=Math.max(3,c.depth*cam.z*.42);ctx.save();ctx.translate(cq.x,cq.y);ctx.rotate(c.a);ctx.fillStyle=c.heat==='napalm'?'rgba(175,78,38,.54)':c.heat==='tunnel'?'rgba(110,75,130,.5)':c.heat==='orbit'?'rgba(0,0,0,.36)':'rgba(0,0,0,.50)';ctx.beginPath();ctx.ellipse(0,0,cw,ch,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle=c.heat==='napalm'?'rgba(225,155,80,.42)':'rgba(220,220,200,.22)';ctx.setLineDash([4,5]);ctx.stroke();ctx.setLineDash([]);ctx.restore()})
}function drawAnsiShip(s){let q=toScreen(s),z=cam.z;if(s.sprite?.custom&&s.sprite.cells?.length){let sp=s.sprite,px=Math.max(2.2,3.4*z),ox=-sp.w*px/2,oy=-sp.h*px/2;ctx.save();ctx.translate(q.x,q.y);ctx.rotate(s.rot);ctx.shadowColor=s.color;ctx.shadowBlur=8;sp.cells.forEach(cell=>{ctx.fillStyle=cell.c;ctx.fillRect(Math.round(ox+cell.x*px),Math.round(oy+cell.y*px),Math.ceil(px),Math.ceil(px))});ctx.shadowBlur=0;ctx.strokeStyle='rgba(255,210,26,.72)';ctx.lineWidth=Math.max(1,1.1*z);ctx.strokeRect(Math.round(ox)-2,Math.round(oy)-2,Math.round(sp.w*px)+4,Math.round(sp.h*px)+4);ctx.restore();return}let px=Math.max(2.4,3.6*z),accent=s.ai?'#ffb15f':'#b9ffd4';ctx.save();ctx.translate(q.x,q.y);ctx.rotate(s.rot);ctx.shadowColor=s.color;ctx.shadowBlur=8;function block(x,y,w,h,c,a=1){ctx.globalAlpha=a;ctx.fillStyle=c;ctx.fillRect(Math.round(x*px),Math.round(y*px),Math.round(w*px),Math.round(h*px));ctx.globalAlpha=1}block(-5,3,10,2,'#07130c',.95);block(-6,5,12,2,'#0b1d13',.95);for(let i=-5;i<6;i+=2)block(i,6,1,1,s.color,.8);block(-4,-1,8,4,s.color,.96);block(-3,-3,6,3,s.color,.92);block(-2,-5,4,2,accent,.9);block(-1,-9,2,5,s.color,.95);block(-1,-12,2,3,accent,.9);block(-4,0,1,2,'#ffffff',.75);block(3,0,1,2,'#ffffff',.75);ctx.strokeStyle='rgba(255,210,26,.72)';ctx.lineWidth=Math.max(1,1.1*z);ctx.strokeRect(Math.round(-6.4*px),Math.round(-12.5*px),Math.round(12.8*px),Math.round(19.7*px));ctx.restore()}
function drawAnsiShot(s){let style=s.orbit?'orbit':s.splitter?'splitter':s.stage?.action||s.sniper&&'sniper'||'shell',trail=style==='orbit'?'rgba(203,166,255,.94)':style==='splitter'?'rgba(255,77,255,.9)':style==='napalm'?'rgba(255,123,0,.75)':style==='build'?'rgba(57,255,20,.8)':style==='laser'?'rgba(0,229,255,.85)':'rgba(255,210,26,.66)';ctx.strokeStyle=trail;ctx.lineWidth=style==='splitter'?3:2;ctx.setLineDash(style==='splitter'?[4,3]:style==='orbit'?[2,7]:[]);ctx.beginPath();s.trail.forEach((p,i)=>{let q=toScreen(p);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)});ctx.stroke();ctx.setLineDash([]);ctx.lineWidth=1;let q=toScreen(s),ang=Math.atan2(s.vy,s.vx);ctx.save();ctx.translate(q.x,q.y);ctx.rotate(ang);ctx.shadowColor=s.color;ctx.shadowBlur=10;ctx.fillStyle=s.color;if(style==='splitter'){ctx.fillRect(-8,-3,16,6);ctx.fillStyle='#ffffff';ctx.fillRect(1,-1,6,2)}else if(style==='sniper'){ctx.beginPath();ctx.moveTo(11,0);ctx.lineTo(-7,-5);ctx.lineTo(-3,0);ctx.lineTo(-7,5);ctx.closePath();ctx.fill()}else if(style==='napalm'){ctx.fillRect(-5,-5,10,10);ctx.fillStyle='#ffd21a';ctx.fillRect(-10,-2,7,4)}else if(style==='build'){ctx.fillRect(-6,-6,12,12);ctx.strokeStyle='#ffffff';ctx.strokeRect(-7,-7,14,14)}else if(style==='orbit'){ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(-5,-6);ctx.lineTo(-2,0);ctx.lineTo(-5,6);ctx.closePath();ctx.fill();ctx.strokeStyle='#ffffff';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#cba6ff';ctx.fillRect(-10,-2,5,4)}else{ctx.fillRect(-7,-4,14,8)}ctx.restore()}function draw(){ctx.fillStyle='#010402';ctx.fillRect(0,0,W,H);ctx.fillStyle='rgba(0,24,8,.22)';for(let y=0;y<H;y+=24)ctx.fillRect(0,y,W,1);stars.forEach(s=>{let q=toScreen({x:(s.x+starDrift*s.d+world.w)%world.w,y:s.y});ctx.globalAlpha=s.a;ctx.fillStyle=s.c||'#dfffd1';ctx.fillRect(Math.round(q.x),Math.round(q.y),Math.max(1,Math.round(s.r*cam.z)),Math.max(1,Math.round(s.r*cam.z)));ctx.globalAlpha=1});drawAnsiFrame();if(!planets.length){ctx.fillStyle='#ffd21a';ctx.font='bold 18px "Lucida Console","Courier New",monospace';ctx.fillText('BUILDING PLANETS...',24,Math.max(80,H*.38));return}planets.forEach(p=>{let q=toScreen(p),r=p.r*cam.z;drawPixelPlanet(p,q,r)});ships.forEach((s,i)=>{if(s.hp<=0)return;drawAnsiShip(s);drawDefense(s)});debris.forEach(d=>{let q=toScreen(d);ctx.globalAlpha=clamp(d.life/100,0,1);ansiRect(q.x,q.y,Math.max(2,d.r*cam.z),Math.max(2,d.r*cam.z),d.c,.8)});ctx.globalAlpha=1;ufos.forEach(u=>{let q=toScreen(u);ctx.save();ctx.translate(q.x,q.y);ctx.fillStyle='#00e5ff';ctx.shadowColor='#00e5ff';ctx.shadowBlur=10;ctx.fillRect(-24,-4,48,8);ctx.fillRect(-12,-12,24,8);ctx.fillStyle='#ff4dff';ctx.fillRect(-6,-7,12,3);ctx.restore()});if(boss){let q=toScreen(boss);ctx.save();ctx.translate(q.x,q.y);ctx.fillStyle='#ff4dff';ctx.shadowColor='#ff4dff';ctx.shadowBlur=16;ctx.fillRect(-48,-10,96,20);ctx.fillRect(-26,-28,52,18);ctx.fillStyle='#00e5ff';ctx.fillRect(-54,18,108*(boss.hp/220),6);ctx.restore()}magnetFields.forEach(m=>{let q=toScreen(m),r=m.r*cam.z,alpha=clamp(m.life/m.max,0,1);ctx.save();ctx.globalAlpha=alpha*.62;ctx.strokeStyle=m.c||'#66d9ff';ctx.lineWidth=Math.max(1,2.4*cam.z);ctx.setLineDash([10,7]);for(let k=0;k<3;k++){ctx.beginPath();for(let i=0;i<=80;i++){let a=i/80*Math.PI*2+k*.7,rr=r*(.25+k*.18)+Math.sin(a*5+m.life*.18)*r*.035,px=q.x+Math.cos(a)*rr,py=q.y+Math.sin(a)*rr;i?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.stroke()}ctx.setLineDash([]);ctx.restore()});walkers.forEach(w=>{let q=toScreen({x:w.x,y:w.y}),z=cam.z,step=Math.sin((w.step||0));ctx.save();ctx.translate(q.x,q.y);ctx.rotate(w.a+Math.PI/2);ctx.shadowColor=w.color;ctx.shadowBlur=8;let body=Math.max(3,4*z);for(let i=0;i<5;i++){let x=(i-2)*body*1.15,y=Math.sin((w.step||0)+i*.9)*body*.45;ctx.fillStyle=i===4?'#ffffff':w.color;ctx.fillRect(Math.round(x-body*.55),Math.round(y-body*.55),Math.round(body),Math.round(body))}ctx.shadowBlur=0;ctx.strokeStyle=w.color;ctx.lineWidth=Math.max(1,1.4*z);for(let i=-2;i<=2;i++){let lx=i*body*1.15,leg=(i%2?step:-step)*body*.9;ctx.beginPath();ctx.moveTo(lx,body*.45);ctx.lineTo(lx+leg,body*1.55);ctx.stroke()}ctx.restore()});shots.forEach(drawAnsiShot);shockwaves.forEach(sw=>{let q=toScreen(sw),alpha=clamp(sw.life/sw.max,0,1);ctx.save();ctx.globalAlpha=alpha*.55;ctx.strokeStyle=sw.c;ctx.lineWidth=Math.max(1,3*cam.z);ctx.setLineDash([6,5]);ctx.beginPath();ctx.arc(q.x,q.y,sw.r*cam.z*(1+(1-alpha)*.22),0,Math.PI*2);ctx.stroke();ctx.restore()});beams.forEach(b=>{let a=toScreen({x:b.x1,y:b.y1}),c=toScreen({x:b.x2,y:b.y2});ctx.globalAlpha=b.life/22;ctx.strokeStyle=b.color;ctx.lineWidth=4;ctx.setLineDash([8,5]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(c.x,c.y);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1});particles.forEach(p=>{let q=toScreen(p);ctx.globalAlpha=clamp(p.life/45,0,1);ansiRect(q.x,q.y,p.size||2,p.size||2,p.c,ctx.globalAlpha)});ctx.globalAlpha=1;damageFloaters.forEach(f=>{let q=toScreen(f),alpha=clamp(f.life/135,0,1);ctx.save();ctx.globalAlpha=alpha;ctx.font=`900 ${Math.max(14,Math.round(20*cam.z))}px "Lucida Console","Courier New",monospace`;ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='rgba(0,0,0,.86)';ctx.strokeText(f.text,q.x,q.y);ctx.fillStyle=f.color||'#ff8a62';ctx.fillText(f.text,q.x,q.y);ctx.restore()});if(!busy&&!ended&&ships[turn]&&!ships[turn].ai)drawAim();}
function drawDefense(s){if(!defenseIsActive(s))return;let q=toScreen(s),color=s.defense==='repel'?'rgba(57,255,20,.66)':s.defense==='bounce'?'rgba(0,229,255,.72)':s.defense==='absorb'?'rgba(185,255,212,.82)':'rgba(255,210,26,.75)';ctx.strokeStyle=color;ctx.lineWidth=2;ctx.setLineDash(s.defense==='portal'?[4,6]:s.defense==='absorb'?[10,5]:[2,5]);ctx.strokeRect(q.x-58*cam.z,q.y-58*cam.z,116*cam.z,116*cam.z);ctx.beginPath();ctx.arc(q.x,q.y,42*cam.z,0,7);ctx.stroke();ctx.setLineDash([]);if(s.defense==='absorb'){ctx.fillStyle='rgba(185,255,212,.88)';let hp=s.defenseHp??ABSORB_HITS;for(let i=0;i<hp;i++){let a=-Math.PI/2+i/ABSORB_HITS*Math.PI*2;ctx.fillRect(q.x+Math.cos(a)*50*cam.z-2,q.y+Math.sin(a)*50*cam.z-2,4,4)}}ctx.lineWidth=1}
function drawAim(){let s=ships[turn]||ships[0],a=+ui.angle.value*Math.PI/180,p=+ui.power.value*.16,x=s.x,y=s.y,vx=Math.cos(a)*p,vy=-Math.sin(a)*p;ctx.setLineDash([6,7]);ctx.strokeStyle='rgba(255,210,26,.82)';ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<90;i++){let q=toScreen({x,y});i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y);if(i%12===0)ansiRect(q.x-2,q.y-2,4,4,'#ffd21a',.7);vx+=wind;vy+=.035;x+=vx;y+=vy}ctx.stroke();ctx.setLineDash([]);ctx.lineWidth=1}
function loop(t){let dt=Math.min(40,t-lastTick);lastTick=t;if(inGame){update(dt);draw();syncUI()}requestAnimationFrame(loop)}
if(ui.centerButton)ui.centerButton.onclick=()=>{clearTimeout(showCenter.t);returnToMainMenu()};ui.angle.oninput=syncUI;ui.power.oninput=syncUI;ui.fire.onclick=()=>shoot(false);ui.weaponSelect.onchange=()=>{selected=clamp(+ui.weaponSelect.value||0,0,currentLoadout().length-1);syncUI()};ui.defenseSelect.onchange=()=>{if(ships.length&&ships[turn])ships[turn].defense=ui.defenseSelect.value;syncUI()};$('zoomIn').onclick=()=>{cam.z=clamp(cam.z*1.18,.35,2.4);syncUI()};$('zoomOut').onclick=()=>{cam.z=clamp(cam.z/1.18,.35,2.4);syncUI()};
let drag=null,pinch=null;canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,cx:cam.x,cy:cam.y}});canvas.addEventListener('pointermove',e=>{if(drag&&!pinch){cam.x=drag.cx-(e.clientX-drag.x)/cam.z;cam.y=drag.cy-(e.clientY-drag.y)/cam.z;cam.target=null}});canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('wheel',e=>{e.preventDefault();cam.z=clamp(cam.z*(e.deltaY<0?1.1:.9),.25,2.6);syncUI()},{passive:false});canvas.addEventListener('touchstart',e=>{if(e.touches.length===2){let a=e.touches[0],b=e.touches[1],d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);pinch={d,z:cam.z};drag=null;e.preventDefault()}},{passive:false});canvas.addEventListener('touchmove',e=>{if(pinch&&e.touches.length===2){let a=e.touches[0],b=e.touches[1],d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);cam.z=clamp(pinch.z*(d/Math.max(1,pinch.d)),.25,2.6);cam.target=null;syncUI();e.preventDefault()}},{passive:false});canvas.addEventListener('touchend',()=>{pinch=null});
function openLab(){let load=(inGame&&ships.length?currentLoadout():(playerWeapons[0]||weaponDefs));let w=load[selected]||load[0]||weaponDefs[0];editing=weaponDefs.findIndex(x=>x.id===w.id);if(editing<0){weaponDefs.push(normWeapon({...w,playerMade:!!w.playerMade}));saveWeapons();weaponDefs=loadWeapons();editing=weaponDefs.findIndex(x=>x.id===w.id);if(editing<0)editing=weaponDefs.length-1}ui.lab.classList.add('open');loadEditor()} function setEditorType(type){editorType=type;$('typeStaged').classList.toggle('active',type==='staged');$('typeSniper').classList.toggle('active',type==='sniper')} function loadEditor(){let w=weaponDefs[editing];ui.editName.value=w.name;setEditorType(w.type);renderStages(w);syncJson();markWeaponEditorClean()} function renderStages(w){ui.stageList.innerHTML='';w.stages.forEach((s,i)=>{let row=document.createElement('div');row.className='stage';row.innerHTML=`<small>Stage ${i+1}</small><label>Action<select data-k="action"><option>explode</option><option>burst</option><option>split</option><option>dig</option><option>laser</option><option>build</option><option>napalm</option><option>magnet</option><option>orbit</option><option>splitter</option><option>walker</option><option>fly</option><option>whiteout</option><option>homing</option><option>spread</option><option>shotgun</option><option>warburst</option><option>cluster</option><option>wave</option><option>machine</option></select></label><label>Delay<input data-k="delay" type="number"></label><label>Radius<input data-k="radius" type="number"></label><label>Damage<input data-k="damage" type="number"></label><label>Count<input data-k="count" type="number"></label><button>Del</button>`;row.querySelector('[data-k=action]').value=s.action;['delay','radius','damage','count'].forEach(k=>row.querySelector('[data-k='+k+']').value=s[k]);row.querySelectorAll('[data-k]').forEach(n=>n.oninput=syncJson);row.querySelector('button').onclick=()=>{let w=readEditor();w.stages.splice(i,1);if(!w.stages.length)w.stages.push(normStage());weaponDefs[editing]=w;renderStages(w);syncJson()};ui.stageList.appendChild(row)})}
function readEditor(){return normWeapon({id:weaponDefs[editing]?.id,name:ui.editName.value,playerMade:true,type:editorType,color:weaponDefs[editing]?.color,stages:[...ui.stageList.querySelectorAll('.stage')].map(r=>normStage({action:r.querySelector('[data-k=action]').value,delay:r.querySelector('[data-k=delay]').value,radius:r.querySelector('[data-k=radius]').value,damage:r.querySelector('[data-k=damage]').value,count:r.querySelector('[data-k=count]').value}))})}
function syncJson(){let data=readEditor(),base=weaponDefs[editing];if(base&&!base.playerMade&&base.id&&defaultWeapons.some(w=>w.id===base.id))data.id='custom-'+Date.now();ui.weaponJson.value=JSON.stringify(data,null,2);ui.saveStatus.textContent=''}
function compactEditorJson(text){try{return JSON.stringify(JSON.parse(text||'null'))}catch(e){return String(text||'').trim()}}
function markWeaponEditorClean(){weaponEditorCleanState=compactEditorJson(ui.weaponJson?.value||'')}
function isWeaponEditorDirty(){return !!(ui.lab&&ui.lab.classList.contains('open')&&compactEditorJson(ui.weaponJson?.value||'')!==weaponEditorCleanState)}
function confirmLeaveWeaponEditor(){return !isWeaponEditorDirty()||confirm('Weapon editor has unsaved changes. Leave without saving?')}
function closeWeaponEditor(toMain=false){if(!confirmLeaveWeaponEditor())return false;ui.lab.classList.remove('open');if(toMain||!inGame){returnToMainMenu()}else{if(ui.menu)ui.menu.classList.add('hidden');setGameLoaded(true)}return true}
function markShipEditorClean(){shipEditorCleanState=compactEditorJson($('shipJson')?.value||'')}
function isShipEditorDirty(){return !!($('shipLab')&&$('shipLab').classList.contains('open')&&compactEditorJson($('shipJson')?.value||'')!==shipEditorCleanState)}
function confirmLeaveShipEditor(){return !isShipEditorDirty()||confirm('Ship editor has unsaved changes. Leave without saving?')}
function closeShipEditor(toMain=false){if(!confirmLeaveShipEditor())return false;shipPainting=false;$('shipLab').classList.remove('open');if(toMain||!inGame){returnToMainMenu()}else{if(ui.menu)ui.menu.classList.add('hidden');setGameLoaded(true)}return true}
$('labOpen').onclick=openLab;$('gameMenu').onclick=()=>{ui.menu.classList.remove('hidden')};let testBackButton=$('testBackEditor');if(testBackButton)testBackButton.onclick=backToWeaponEditor;$('labMenu').onclick=()=>closeWeaponEditor(true);$('menuEditor').onclick=()=>{clearGameSession();setGameLoaded(false);showMenuPanel(null);ui.menu.classList.add('hidden');openLab()};ui.editName.oninput=syncJson;$('typeStaged').onclick=()=>{setEditorType('staged');syncJson()};$('typeSniper').onclick=()=>{setEditorType('sniper');syncJson()};$('labClose').onclick=()=>closeWeaponEditor(false);$('addStage').onclick=()=>{let w=readEditor();if(w.stages.length<10)w.stages.push(normStage({delay:w.stages.length*180,action:'explode',radius:28,damage:12,count:1}));weaponDefs[editing]=w;renderStages(w);syncJson()};$('saveWeapon').onclick=()=>{let wasInGame=inGame&&ships.length>0;let saved=readEditor(),base=weaponDefs[editing]||null;try{let j=JSON.parse(ui.weaponJson.value);if(j&&j.id&&!defaultWeapons.some(w=>w.id===j.id))saved.id=j.id;if(j&&/^#[0-9a-f]{6}$/i.test(j.color||''))saved.color=j.color}catch(e){}if(base&&!base.playerMade&&base.id&&defaultWeapons.some(w=>w.id===base.id))saved.id='custom-'+Date.now();saved=normWeapon({...saved,playerMade:true});saved=equipSavedWeapon(saved);addWeaponToCurrentPack(saved);saveCurrentPack();weaponDefs=loadWeapons();refreshSavedWeaponsInPacks(saved);editing=weaponDefs.findIndex(x=>x.id===saved.id);if(playerWeapons[0]){playerWeapons[0]=ensureWeaponInLoadout(playerWeapons[0],saved);selected=playerWeapons[0].findIndex(x=>x.id===saved.id)}renderWeaponSelect();ui.weaponJson.value=JSON.stringify(saved,null,2);markWeaponEditorClean();ui.saveStatus.textContent=`Saved "${saved.name}" and equipped it.`;ui.lab.classList.remove('open');if(!wasInGame){startWeaponTest(saved)}else{if(ui.menu)ui.menu.classList.add('hidden');toast('Weapon saved to selected pack, equipped, and ready to fire.');syncUI()}};$('loadJson').onclick=()=>{try{let d=JSON.parse(ui.weaponJson.value),defs=defaultWeaponIds();if(Array.isArray(d)){d.map(x=>normWeapon({...x,playerMade:!!x.playerMade||!defs.has(String(x.id||''))})).forEach(w=>{let i=weaponDefs.findIndex(x=>x.id===w.id);if(i>=0)weaponDefs[i]=w;else weaponDefs.push(w)})}else{let w=normWeapon({...d,playerMade:true});let i=weaponDefs.findIndex(x=>x.id===w.id);if(i>=0)weaponDefs[i]=w;else weaponDefs.push(w);editing=weaponDefs.findIndex(x=>x.id===w.id)}saveWeapons();weaponDefs=loadWeapons();refreshSavedWeaponsInPacks();renderWeaponSelect();loadEditor();markWeaponEditorClean();toast('JSON loaded into weapon pack.');syncUI()}catch(e){toast('Invalid JSON.')}};$('newWeapon').onclick=()=>{let w=normWeapon({id:'custom-'+Date.now(),name:'',playerMade:true,stages:Array.from({length:6},(_,i)=>({delay:i*150,action:i%2?'burst':'explode',radius:22+i*2,damage:8+i,count:i%2?3:1}))});weaponDefs.push(w);saveWeapons();editing=weaponDefs.length-1;if(playerWeapons[0]){playerWeapons[0]=ensureWeaponInLoadout(playerWeapons[0],w);selected=playerWeapons[0].findIndex(x=>x.id===w.id)}else selected=editing;renderWeaponSelect();loadEditor();syncUI()};$('cloneWeapon').onclick=()=>{let w=normWeapon({...JSON.parse(JSON.stringify(weaponDefs[editing])),playerMade:true});w.id='custom-'+Date.now();weaponDefs.push(w);saveWeapons();editing=weaponDefs.length-1;if(playerWeapons[0]){playerWeapons[0]=ensureWeaponInLoadout(playerWeapons[0],w);selected=playerWeapons[0].findIndex(x=>x.id===w.id)}else selected=editing;renderWeaponSelect();loadEditor();syncUI()};$('exportAll').onclick=()=>ui.weaponJson.value=JSON.stringify(makeSelectedPlayerLoadout(),null,2);$('menuCreate').onclick=()=>{settings.playerPackChoice=(ui.menuPlayerPack&&ui.menuPlayerPack.value)||'gold';settings.packMode=settings.playerPackChoice;localStorage.setItem('warheads.playerPackChoice',settings.playerPackChoice);startBotPlay();startMusic()};let legacyEditorButton=$('menuEditorStart');if(legacyEditorButton)legacyEditorButton.onclick=()=>{$('menuEditor').click()};$('menuLan').onclick=openLocalLanSetup;$('menuMultiplayer').onclick=()=>{};if($('menuLan'))$('menuLan').disabled=false;if($('menuMultiplayer'))$('menuMultiplayer').disabled=true;if($('localStart'))$('localStart').onclick=startLocalLanMatch;if($('localBack'))$('localBack').onclick=()=>showMenuPanel(null);if($('localLanClose'))$('localLanClose').onclick=()=>showMenuPanel(null);$('menuOptions').onclick=()=>{let opening=ui.optionsPanel.classList.contains('hidden');showMenuPanel(opening?'optionsPanel':null);startMusic()};$('optionsBack').onclick=()=>showMenuPanel(null);if($('optionsClose'))$('optionsClose').onclick=()=>showMenuPanel(null);if(ui.menuAimArc){ui.menuAimArc.value='0-360';ui.menuAimArc.onchange=applyAimArcOptions;applyAimArcOptions()}if(ui.menuUfoRate){ui.menuUfoRate.value='15';ui.menuUfoRate.onchange=readUfoOptions}if(ui.menuUfoMinTime)ui.menuUfoMinTime.onchange=()=>{if(ui.menuUfoRate)ui.menuUfoRate.value='custom';readUfoOptions()};if(ui.menuUfoMaxTime)ui.menuUfoMaxTime.onchange=()=>{if(ui.menuUfoRate)ui.menuUfoRate.value='custom';readUfoOptions()};if(ui.menuTurn)ui.menuTurn.value='120';if(ui.menuPhysics)ui.menuPhysics.value='bounce';if($('localTurn'))$('localTurn').value='120';if($('localPhysics'))$('localPhysics').value='bounce';readUfoOptions();if(ui.menuMusic){ui.menuMusic.value=settings.musicOn?'on':'off';ui.menuMusic.onchange=applyMusicOptions}if(ui.menuMusicVolume){ui.menuMusicVolume.value=settings.musicVolume;ui.menuMusicVolume.oninput=applyMusicOptions}if(ui.menuMusicTrack){populateMusicTracks();ui.menuMusicTrack.onchange=applyMusicOptions}tryLoadMusicFolder();

function makeRandomShipCells(){let cols=['#66d9ff','#ff7b55','#ffd21a','#b9ffd4','#cba6ff'],main=cols[Math.floor(rand(0,cols.length))],accent=cols[Math.floor(rand(0,cols.length))],cells=[];for(let y=1;y<15;y++){for(let x=0;x<8;x++){let edge=7-x,wide=clamp(2+Math.sin(y/15*Math.PI)*5+rand(-1,1),1,7);if(edge<wide&&(Math.random()<.82||y>10)){let c=Math.random()<.16?accent:main;cells.push({x,y,c});cells.push({x:15-x,y,c})}}}cells.push({x:7,y:1,c:'#ffffff'},{x:8,y:1,c:'#ffffff'},{x:6,y:14,c:'#ff7b55'},{x:9,y:14,c:'#ff7b55'});return cells}
const shipPaletteColors=['#66d9ff','#b9ffd4','#ffffff','#244a55','#3b7a86','#1c3036','#ff7b55','#ffb15f','#ffd21a','#cba6ff','#ff4dff','#63ff1a','#0b1d13','#07130c','#000000'];
function openShipEditor(){shipEditing=0;shipPainting=false;let saved=savedPlayerShip()||userShipSprites()[0]||{id:'ship-'+Date.now(),name:'My Ship',w:16,h:16,cells:makeRandomShipCells(),userMade:true,custom:true};loadShipEditor(saved);$('shipLab').classList.add('open')}
function loadShipEditor(sp){sp=normShipSprite({...sp,userMade:true,custom:true});shipPainting=false;shipEditorCells=sp.cells.map(c=>({...c}));$('shipName').value=sp.name||'My Ship';$('shipColor').value=shipPaint;renderShipPalette();renderShipGrid();syncShipJson(sp.id);markShipEditorClean()}
function cellAt(x,y){return shipEditorCells.find(c=>c.x===x&&c.y===y)}
function paintShipCell(x,y){let tool=$('shipTool').value;if(tool==='erase')shipEditorCells=shipEditorCells.filter(c=>!(c.x===x&&c.y===y));else{let c=cellAt(x,y);if(c)c.c=$('shipColor').value;else shipEditorCells.push({x,y,c:$('shipColor').value})}renderShipGrid();syncShipJson()}
function renderShipPalette(){let pal=$('shipPalette');if(!pal)return;pal.innerHTML='';shipPaletteColors.forEach(col=>{let b=document.createElement('button');b.type='button';b.className='shipSwatch'+(col.toLowerCase()===(($('shipColor')?.value||shipPaint).toLowerCase())?' active':'');b.style.background=col;b.style.color=col;b.title=col;b.onclick=()=>{shipPaint=col;$('shipColor').value=col;renderShipPalette()};pal.appendChild(b)})}
function renderShipGrid(){let grid=$('shipGrid');if(!grid)return;grid.innerHTML='';grid.classList.toggle('painting',!!shipPainting);for(let y=0;y<16;y++){for(let x=0;x<16;x++){let cell=cellAt(x,y),d=document.createElement('div');d.className='shipCell'+(cell?' on':'');d.style.background=cell?cell.c:'rgba(0,0,0,.72)';d.style.color=cell?.c||'#000';d.dataset.x=x;d.dataset.y=y;d.onpointerdown=e=>{e.preventDefault();if(shipPainting){shipPainting=false;renderShipGrid();return}shipPainting=true;paintShipCell(x,y)};d.onpointerenter=e=>{if(shipPainting)paintShipCell(x,y)};grid.appendChild(d)}}renderShipPreview()}
function renderShipPreview(){let prev=$('shipPreview');if(!prev)return;prev.innerHTML='';let box=document.createElement('div');box.style.cssText='display:grid;grid-template-columns:repeat(16,6px);gap:1px;padding:4px;';for(let y=0;y<16;y++)for(let x=0;x<16;x++){let c=cellAt(x,y),b=document.createElement('span');b.style.cssText='width:6px;height:6px;background:'+(c?c.c:'transparent');box.appendChild(b)}prev.appendChild(box)}
function readShipEditor(id=null){return normShipSprite({id:id||('ship-'+Date.now()),name:$('shipName').value||'My Ship',w:16,h:16,userMade:true,custom:true,cells:shipEditorCells})}
function syncShipJson(id=null){let existing=null;try{existing=JSON.parse($('shipJson').value||'null')}catch(e){}let sp=readShipEditor(id||existing?.id||('ship-'+Date.now()));$('shipJson').value=JSON.stringify(sp,null,2);$('shipStatus').textContent=''}
function saveShipFromEditor(){let sp;try{sp=normShipSprite({...JSON.parse($('shipJson').value),userMade:true,custom:true})}catch(e){sp=readShipEditor()}let idx=shipDefs.findIndex(x=>x.id===sp.id);if(idx>=0)shipDefs[idx]=sp;else shipDefs.push(sp);playerShipId=sp.id;localStorage.setItem('warheads.playerShip',sp.id);saveShips();if(ships[0])ships[0].sprite=cloneShipSprite(sp);markShipEditorClean();shipPainting=false;$('shipStatus').textContent=`Saved "${sp.name}" and assigned it to PLAYER.`;$('shipLab').classList.remove('open');ui.menu.classList.remove('hidden');toast('Ship saved and assigned to PLAYER. Bots stay procedural.',1800)}
function downloadJsonFile(filename,data){let text=JSON.stringify(data,null,2);try{let blob=new Blob([text],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(url);a.remove()},800)}catch(e){}}
function exportShipsFromEditor(){let current=null;try{let existing=JSON.parse($('shipJson').value||'null');current=readShipEditor(existing?.id||null)}catch(e){current=readShipEditor()}let pack=shipDefs.filter(s=>s.userMade&&s.cells&&s.cells.length).map(cloneShipSprite);if(current&&current.cells&&current.cells.length){let idx=pack.findIndex(s=>s.id===current.id);if(idx>=0)pack[idx]=current;else pack.push(current)}if(!pack.length)pack=shipDefs.filter(s=>s.cells&&s.cells.length).map(cloneShipSprite);$('shipJson').value=JSON.stringify(pack,null,2);downloadJsonFile('WarHeads-SHIPS-'+Date.now()+'.json',pack);$('shipStatus').textContent='Exported SHIPS JSON pack. The JSON is also in the text box.';toast('SHIPS JSON exported.',1400)}
let shipPainting=false;
$('menuShipEditor').onclick=()=>{clearGameSession();setGameLoaded(false);showMenuPanel(null);ui.menu.classList.add('hidden');openShipEditor()};$('shipMenu').onclick=()=>closeShipEditor(true);$('shipClose').onclick=()=>closeShipEditor(false);$('shipColor').oninput=()=>{shipPaint=$('shipColor').value;renderShipPalette()};$('shipNew').onclick=()=>loadShipEditor({id:'ship-'+Date.now(),name:'My Ship',w:16,h:16,cells:[],userMade:true,custom:true});$('shipRandom').onclick=()=>loadShipEditor({id:'ship-'+Date.now(),name:'Random Ship',w:16,h:16,cells:makeRandomShipCells(),userMade:true,custom:true});$('shipMirror').onclick=()=>{let left=shipEditorCells.filter(c=>c.x<8);shipEditorCells=[...left.map(c=>({...c})),...left.map(c=>({x:15-c.x,y:c.y,c:c.c}))];renderShipGrid();syncShipJson()};$('shipLoadJson').onclick=()=>{try{let data=JSON.parse($('shipJson').value);if(Array.isArray(data)){shipDefs=data.map(x=>normShipSprite({...x,userMade:true,custom:true}));saveShips();loadShipEditor(shipDefs[0]||{cells:[]});toast('Ship JSON pack loaded.')}else loadShipEditor(normShipSprite({...data,userMade:true,custom:true}))}catch(e){toast('Invalid ship JSON.')}};$('shipExport').onclick=exportShipsFromEditor;$('shipSave').onclick=saveShipFromEditor;


const advFieldMap={
  advMaxHealth:'maxHealth',advAbsorbHits:'absorbHits',advFireDelay:'fireDelayMs',advPostShotPause:'postShotPauseMs',advBotProcWeapons:'botProcWeapons',advBotMutationChance:'botMutationChance',advStageCountCap:'stageCountCap',advStageDamageCap:'stageDamageCap',
  advSoftHoming:'softHoming',advHomingBoost:'homingBoost',advGravityStrength:'gravityStrength',advGravityMaxPull:'gravityMaxPull',advMaxShotSpeed:'maxShotSpeed',advShotPowerScale:'shotPowerScale',advBounceDamping:'bounceDamping',advShotMaxLife:'shotMaxLifeMs',
  advPlanetCapBase:'planetCapBase',advPlanetCapPerPlayer:'planetCapPerPlayer',advPlanetFloorBase:'planetFloorBase',advPlanetFloorMax:'planetFloorMax',advPlanetDestructionScale:'planetDestructionScale',advPlanetBuildScale:'planetBuildScale',advPlanetRepairScale:'planetRepairScale',advPlayfieldMargin:'playfieldMargin',advWorldWidthBase:'worldWidthBase',advWorldHeightBase:'worldHeightBase',
  advMaxLiveShots:'maxLiveShots',advWarheadsPerTurn:'warheadsPerTurn',advWalkersPerTurn:'walkersPerTurn',advMaxLiveWalkers:'maxLiveWalkers',advMaxParticles:'maxParticles',advParticleScale:'particleScale',advMaxBeams:'maxBeams',advMaxTrailPoints:'maxTrailPoints',advHeavySfxCap:'heavySfxCap',advLightSfxCap:'lightSfxCap'
};
function fillAdvancedOptions(){Object.entries(advFieldMap).forEach(([id,key])=>{let el=$(id);if(el&&modSettings[key]!=null)el.value=modSettings[key]});let asset=$('advAssetStatus');if(asset)asset.value=localStorage.getItem('warheads.assetManifest')||''}
function readAdvancedOptions(){Object.entries(advFieldMap).forEach(([id,key])=>{let el=$(id);if(el){let v=+el.value;modSettings[key]=Number.isFinite(v)?v:DEFAULT_MOD_SETTINGS[key]}});applyModSettings();saveModSettings();if(ships.length){ships.forEach(s=>{s.maxHp=Math.max(s.maxHp||MAX_HEALTH,MAX_HEALTH);s.hp=clamp(s.hp,0,s.maxHp)});syncUI()}return modSettings}
function showAdvancedPage(name){document.querySelectorAll('.advancedPage').forEach(p=>p.classList.toggle('open',p.id==='advPage_'+name));document.querySelectorAll('[data-advtab]').forEach(b=>b.classList.toggle('active',b.dataset.advtab===name))}
function exportAdvancedSettings(){let data={version:'v0.7.30',name:'WarHeads Classic Enhanced Mod Settings',settings:readAdvancedOptions()};downloadJsonFile('WarHeads-MOD_SETTINGS-v0.7.30.json',data)}
function downloadFolderGuide(){let guide=`WarHeads Classic Enhanced v0.7.30 Mod Folders\n\nMUSIC/ - playlist.json and custom music files\nSOUNDS/ - custom launch/impact/UI sounds\nTEXTURES/ - planet, ship, UI and border art\nPARTICLES/ - particle and VFX presets\nSCRIPTS/ - local experimental scripts/presets\nOTHER/ - notes or uncategorized mod assets\n\nExport Advanced Settings from Options > Advanced and place shared presets beside these folders.`;try{let blob=new Blob([guide],{type:'text/plain'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='WarHeads_Mod_Folder_Guide_v0.7.30.txt';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(url);a.remove()},800)}catch(e){}}
function importAdvancedSettingsFile(file){if(!file)return;let r=new FileReader();r.onload=()=>{try{let data=JSON.parse(r.result),incoming=data.settings||data;modSettings={...DEFAULT_MOD_SETTINGS,...incoming};applyModSettings();saveModSettings();fillAdvancedOptions();toast('Advanced mod settings imported.',1400)}catch(e){toast('Invalid mod settings JSON.',1600)}};r.readAsText(file)}
function registerAssetFiles(files){let names=[...files].map(f=>f.name);let text='Registered local assets for notes only:\n'+names.join('\n');localStorage.setItem('warheads.assetManifest',text);if($('advAssetStatus'))$('advAssetStatus').value=text;toast(`${names.length} asset file name${names.length===1?'':'s'} registered.`,1200)}
if($('optionsAdvanced'))$('optionsAdvanced').onclick=()=>{fillAdvancedOptions();showMenuPanel('advancedPanel')};
if($('advancedClose'))$('advancedClose').onclick=()=>showMenuPanel('optionsPanel');
if($('advancedBack'))$('advancedBack').onclick=()=>showMenuPanel('optionsPanel');
if($('advancedSave'))$('advancedSave').onclick=()=>{readAdvancedOptions();toast('Advanced settings saved.',1200)};
document.querySelectorAll('[data-advtab]').forEach(b=>b.onclick=()=>showAdvancedPage(b.dataset.advtab));
if($('advExportSettings'))$('advExportSettings').onclick=exportAdvancedSettings;
if($('advFolderGuide'))$('advFolderGuide').onclick=downloadFolderGuide;
if($('advResetDefaults'))$('advResetDefaults').onclick=()=>{if(confirm('Reset advanced mod settings to GOLD defaults?')){modSettings={...DEFAULT_MOD_SETTINGS};applyModSettings();saveModSettings();fillAdvancedOptions();toast('Advanced defaults restored.',1200)}};
if($('advImportSettings'))$('advImportSettings').onchange=e=>importAdvancedSettingsFile(e.target.files?.[0]);
if($('advAssetFiles'))$('advAssetFiles').onchange=e=>registerAssetFiles(e.target.files||[]);
fillAdvancedOptions();

addEventListener('beforeunload',e=>{if(isWeaponEditorDirty()||isShipEditorDirty()){e.preventDefault();e.returnValue=''}});


/* v0.7.30 Weapon Editor / Pack Modding Overhaul */
const WCE_VERSION='v0.7.30';
if($('versionText'))$('versionText').textContent='v0.7.30';
const SHOT_ACTIONS={
  Impact:[['explode','Explode / Crater'],['dig','DIG - Direct Tunneling Line'],['laser','Laser Beam'],['napalm','Napalm Carve'],['magnet','Magnet / Vortex']],
  Splitters:[['splitter','Tunneling Splitter'],['split','Simple Split'],['burst','Burst Ring'],['cluster','Cluster'],['warburst','Warburst']],
  Flight:[['homing','Homing Dart'],['fly','Flying Stage'],['orbit','Orbit Drop'],['walker','Walker Crawler'],['spread','Spread Volley'],['shotgun','Shotgun Cone'],['wave','Wave Pattern'],['machine','Machine Line'],['sequence','One Stage At A Time']],
  Utility:[['build','Build / Create Planet'],['whiteout','Whiteout Smoke']]
};
const SHOT_HELP={
  explode:'Explodes on impact and stamps out a crater/chunk. Higher radius makes a wider crater; higher damage hurts ships and digs deeper.',
  dig:'DIG shoots a direct tunneling line through planet material. Use radius for tunnel width, damage for bite strength, count for repeated bites, and Dig Time for how long it keeps drilling.',
  laser:'Draws a fast beam and damages/carves along the beam line. Best for precision cutting.',
  napalm:'Burning terrain eater. It carves over time and may split once when configured; it will not recursively multi-split.',
  magnet:'Creates a visible squiggle vortex. Speed controls pull strength; radius controls field size; count controls pulse count.',
  splitter:'The signature WarHeads tunneling splitter. Split Count sets branches; Split Depth sets how many times it can branch; Dig Time controls tunnel duration.',
  split:'Simple split into child warheads. Safer but less dramatic than Tunneling Splitter.',
  burst:'Expands outward as a burst of smaller warheads.',
  cluster:'Creates clustered child shots with safety caps.',
  warburst:'A bigger chaos burst with capped child warheads.',
  homing:'A guided shot that seeks the nearest enemy. Homing Strength controls the pull.',
  fly:'Creates a flying child shot. Disable Flight to force it to resolve as a grounded impact instead.',
  orbit:'Orbits a planet, then dives and drops payload shots. It only chunks terrain; it should not planet-kill.',
  walker:'Drops a crawler that walks around the planet and triggers its payload.',
  spread:'Fan of child shots. Count controls how many.',
  shotgun:'Wide cone blast. Count controls pellets.',
  wave:'Wave-like shot pattern.',
  machine:'Fires configured stages one at a time in a straight line with a small delay between each shot.',
  sequence:'Shoots stage 1, then stage 2, then stage 3 in a straight line. Use this when you want predictable staged fire instead of all-at-once chaos.',
  build:'Creates/grows a planet at impact. This is one of the only ways players can create new planets.',
  whiteout:'Creates a smoke/cover effect.'
};
function actionOptionsHtml(selected){let out='';Object.entries(SHOT_ACTIONS).forEach(([g,arr])=>{out+=`<optgroup label="${g}">`;arr.forEach(([id,label])=>out+=`<option value="${id}" title="${SHOT_HELP[id]||''}" ${id===selected?'selected':''}>${label}</option>`);out+='</optgroup>'});return out}
function sliderField(k,label,min,max,step,val,tip){return `<label class="fullSlider">${label} <span class="sliderValue" data-val="${k}">${val}</span><input data-k="${k}" type="range" min="${min}" max="${max}" step="${step}" value="${val}" title="${tip||''}"></label>`}
const _oldNormStage=normStage;
function normStage(s={}){let acts=['explode','burst','split','dig','laser','build','napalm','magnet','orbit','splitter','walker','fly','whiteout','homing','spread','shotgun','warburst','cluster','wave','machine','sequence'];let action=acts.includes(s.action)?s.action:'explode',count=clamp(Math.round(+s.count||1),1,Math.round(+modSettings.stageCountCap||8));if(action==='orbit')count=clamp(Math.round(+s.count||1),1,4);let st={delay:clamp(+s.delay||(action==='orbit'?15000:0),0,20000),action,radius:clamp(+s.radius||30,4,+modSettings.stageRadiusCap||260),damage:clamp(+s.damage||0,0,+modSettings.stageDamageCap||160),count};
  st.splitDepth=clamp(Math.round(+s.splitDepth||+(s.depth||1)||1),0,5);st.digTime=clamp(Math.round(+s.digTime||+(s.duration||650)||650),60,6000);st.speed=clamp(+s.speed||4,0,40);st.homing=clamp(+s.homing||0,0,300);st.flight=(s.flight==='no'||s.noFlight===true)?'no':'yes';return st};
const _oldApplyStage=applyStage;
function applyStage(x,y,st,w,owner,weaponIndex=selected){
  st=normStage(st);
  if(st.flight==='no'&&['fly','homing','spread','shotgun','wave','machine'].includes(st.action)){st={...st,action:'explode',count:1}}
  if(st.action==='sequence'){
    let payload=(w.stages||[]).filter(q=>q.action!=='sequence').slice(0,Math.max(1,Math.min(8,st.count||4)));
    if(!payload.length)payload=[{...st,action:'explode',count:1}];
    let t=chooseTarget(owner),ang=t?Math.atan2(t.y-y,t.x-x):rand(0,Math.PI*2),base=clamp((st.speed||5)+(st.damage||20)*.02,3,10);
    payload.forEach((stage,i)=>setTimeout(()=>{if(!(busy&&owner===activeShotOwner))return;sfx('launch');let ss=normStage({...stage,action:stage.action==='sequence'?'explode':stage.action});addShot({x:x+Math.cos(ang)*i*14,y:y+Math.sin(ang)*i*14,vx:Math.cos(ang)*base,vy:Math.sin(ang)*base,owner,weapon:weaponIndex,color:w.color,stage:ss,trail:[],age:0,wraps:0,maxLife:SHOT_MAX_LIFE,spawnDepth:1},1)},i*clamp(st.delay||140,50,900)));
    return;
  }
  return _oldApplyStage(x,y,st,w,owner,weaponIndex);
};
function currentEditablePackId(){let sel=$('packSelect');return sel&&sel.value?sel.value:'pack:defaultMy'}
function defaultPackObj(){return{id:'pack:defaultMy',name:'Default + My Weapons',defaultWeaponId:(savedPlayerWeapons()[0]||defaultWeapons[0]).id,weaponIds:uniqueWeapons([...defaultWeapons.map(normWeapon),...savedPlayerWeapons()]).map(w=>w.id)}}
function getWeaponPacks(){let packs=[];try{packs=JSON.parse(localStorage.getItem('warheads.weaponPacks')||'[]')||[]}catch(e){packs=[]}let base=defaultPackObj();let ids=new Set([base.id]);packs=packs.filter(p=>p&&p.id&&p.id!==base.id).map(p=>({id:p.id,name:p.name||p.id,defaultWeaponId:p.defaultWeaponId||'',weaponIds:Array.isArray(p.weaponIds)?p.weaponIds:[]}));return [base,...packs.filter(p=>!ids.has(p.id)&&ids.add(p.id))]}
function saveWeaponPacks(packs){localStorage.setItem('warheads.weaponPacks',JSON.stringify((packs||[]).filter(p=>p.id!=='pack:defaultMy')))}
function allWeaponMap(){let m=new Map();uniqueWeapons([...defaultWeapons.map(normWeapon),...weaponDefs.map(normWeapon),...savedPlayerWeapons()]).forEach(w=>m.set(w.id,w));return m}
function loadoutFromPackId(id){let map=allWeaponMap(),packs=getWeaponPacks(),pack=packs.find(p=>p.id===id);if(!pack){let fallback=packs[0]||defaultPackObj();let out=[];(fallback.weaponIds||[]).forEach(pid=>{if(map.has(pid))out.push(map.get(pid))});if(!out.length)out=[...defaultWeapons.map(normWeapon),...savedPlayerWeapons()];return uniqueWeapons(out).slice(0,220)}let out=[];(pack.weaponIds||[]).forEach(pid=>{if(map.has(pid))out.push(map.get(pid))});if(!out.length)out=[...map.values()];let def=pack.defaultWeaponId&&out.find(w=>w.id===pack.defaultWeaponId);if(def)out=[def,...out.filter(w=>w.id!==def.id)];return uniqueWeapons(out).slice(0,220)}
const _oldMakeSelectedPlayerLoadout=makeSelectedPlayerLoadout;
function makeSelectedPlayerLoadout(){let choice=settings.playerPackChoice||settings.packMode||'gold';if(String(choice).startsWith('pack:'))return loadoutFromPackId(choice);return _oldMakeSelectedPlayerLoadout()};
function makeBotLoadoutForSlot(slot=0){let id=($('botPack'+(slot+1))?.value)||($('botDefaultPack')?.value)||'';let diff=($('botDifficultyRandom')?.value==='yes')?['easy','normal','skilled','very skilled'][Math.floor(Math.random()*4)]:($('botDifficulty')?.value||'normal');let base=id&&id!=='all'?loadoutFromPackId(id):makeBotLoadout();let extra=diff==='easy'?2:diff==='normal'?8:diff==='skilled'?16:28;for(let i=0;i<extra;i++)base.push(makeProcWeapon());if(diff==='very skilled')savedPlayerWeapons().forEach(w=>base.push(mutateBotWeapon(w)));return uniqueWeapons(base).slice(0,240)}
function makeHumanLoadoutForSlot(slot=0){let id=($('humanDefaultPack')?.value)||settings.playerPackChoice||'gold';return String(id).startsWith('pack:')?loadoutFromPackId(id):makeSelectedPlayerLoadout()}
function populatePackDropdowns(){let packs=getWeaponPacks(),opts=packs.map(p=>`<option value="${p.id}">${p.name}</option>`).join('')+'<option value="gold">Default + My Weapons</option><option value="generated">Generated Chaos + My Weapons</option><option value="saved">My Weapons Only</option><option value="all">ALL Weapons</option>';['packSelect','botDefaultPack','humanDefaultPack','botPack1','botPack2','botPack3','botPack4','botPack5','botPack6','botPack7','botPack8'].forEach(id=>{let el=$(id);if(el){let old=el.value;el.innerHTML=opts;el.value=old||el.value||'pack:defaultMy'}});if(ui.menuPlayerPack){let old=ui.menuPlayerPack.value;ui.menuPlayerPack.innerHTML='<option value="gold">Default + My Weapons</option><option value="generated">Generated Chaos + My Weapons</option><option value="saved">My Weapons Only</option>'+packs.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');ui.menuPlayerPack.value=old||settings.playerPackChoice||'gold'}}
let renderingPackTools=false;
function renderPackTools(){if(renderingPackTools)return;renderingPackTools=true;try{populatePackDropdowns();let pid=currentEditablePackId(),packs=getWeaponPacks(),pack=packs.find(p=>p.id===pid)||packs[0],map=allWeaponMap();if($('packName'))$('packName').value=pack.name||'';let list=$('packWeaponList'),def=$('packDefault');if(list){list.innerHTML='';(pack.weaponIds||[]).forEach(id=>{let w=map.get(id);if(w){let o=document.createElement('option');o.value=id;o.textContent=w.name;list.appendChild(o)}})}if(def){def.innerHTML='';(pack.weaponIds||[]).forEach(id=>{let w=map.get(id);if(w){let o=document.createElement('option');o.value=id;o.textContent=w.name;def.appendChild(o)}});def.value=pack.defaultWeaponId||((pack.weaponIds||[])[0]||'')}}finally{renderingPackTools=false}}
function getEditedPack(){let packs=getWeaponPacks(),pid=currentEditablePackId(),pack=packs.find(p=>p.id===pid)||defaultPackObj();let list=[...($('packWeaponList')?.options||[])].map(o=>o.value);return{id:pid==='pack:defaultMy'?'pack:'+Date.now():pid,name:($('packName')?.value||pack.name||'My Weapon Pack').trim(),defaultWeaponId:$('packDefault')?.value||list[0]||'',weaponIds:list}}
function saveCurrentPack(){let pack=getEditedPack(),packs=getWeaponPacks().filter(p=>p.id!==pack.id&&p.id!=='pack:defaultMy');packs.push(pack);saveWeaponPacks(packs);settings.playerPackChoice=pack.id;localStorage.setItem('warheads.playerPackChoice',pack.id);populatePackDropdowns();if($('packSelect'))$('packSelect').value=pack.id;if(ui.menuPlayerPack)ui.menuPlayerPack.value=pack.id;renderPackTools();toast('Weapon pack saved to UserWeaponPacks data.',1300);}
function downloadJsonFile(name,data){try{let blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(url);a.remove()},800)}catch(e){}}
function exportCurrentPack(){let pack=getEditedPack();downloadJsonFile('UserWeaponPacks/'+(pack.name||'WeaponPack').replace(/[^a-z0-9_-]+/gi,'_')+'.json',{version:WCE_VERSION,type:'WarHeadsWeaponPack',pack,weapons:loadoutFromPackId(pack.id)});}
function exportCurrentWeapon(){let w=readEditor();downloadJsonFile('UserWeaponPacks/'+(w.name||'Weapon').replace(/[^a-z0-9_-]+/gi,'_')+'.weapon.json',w)}
function addWeaponToCurrentPack(w){let pid=currentEditablePackId(),packs=getWeaponPacks(),pack=packs.find(p=>p.id===pid)||defaultPackObj();if(!pack.weaponIds.includes(w.id))pack.weaponIds.push(w.id);if(!pack.defaultWeaponId)pack.defaultWeaponId=w.id;if(pack.id!=='pack:defaultMy'){saveWeaponPacks([...packs.filter(p=>p.id!==pack.id&&p.id!=='pack:defaultMy'),pack])}renderPackTools()}
function setEditorType(type){editorType=type;$('typeStaged').classList.toggle('active',type==='staged');$('typeSniper').classList.toggle('active',type==='sniper')}
function loadEditor(){let w=weaponDefs[editing]||weaponDefs[0]||defaultWeapons[0];ui.editName.value=w.name;setEditorType(w.type||'staged');renderStages(w);syncJson();markWeaponEditorClean();renderPackTools()}
function renderStages(w){ui.stageList.innerHTML='';(w.stages||[normStage()]).forEach((raw,i)=>{let s=normStage(raw);let row=document.createElement('div');row.className='stage modStage';row.dataset.stageIndex=i;row.innerHTML=`<small><span>Stage ${i+1}: ${SHOT_ACTIONS_FLAT_LABEL(s.action)}</span><span class="stageHeaderBtns"><button type="button" data-help>Help</button><button type="button" data-json>JSON</button><button type="button" data-up>Up</button><button type="button" data-down>Down</button><button type="button" data-del>Del</button></span></small>
    <label class="wide">Action <select data-k="action" title="Choose what this stage does.">${actionOptionsHtml(s.action)}</select></label>
    ${sliderField('delay','Delay MS',0,20000,50,s.delay,'When this stage runs after impact/firing.')}
    ${sliderField('radius','Radius / Width',4,+modSettings.stageRadiusCap||260,1,s.radius,'Explosion size, tunnel width, or field radius.')}
    ${sliderField('damage','Damage / Bite',0,+modSettings.stageDamageCap||160,1,s.damage,'Ship damage and terrain bite strength.')}
    ${sliderField('count','Count / Splits',1,+modSettings.stageCountCap||8,1,s.count,'Warheads, pellets, branches, or repeated pulses.')}
    ${sliderField('splitDepth','Split Depth',0,5,1,s.splitDepth,'How many times this splitter can branch.')}
    ${sliderField('digTime','Dig Time MS',60,6000,20,s.digTime,'How long DIG/splitter/napalm keeps chewing terrain.')}
    ${sliderField('speed','Child Speed',0,40,.1,s.speed,'Speed of child warheads or sequence shots.')}
    ${sliderField('homing','Homing Strength',0,300,1,s.homing,'Extra homing pull for guided stages.')}
    <label>Flight Allowed <select data-k="flight"><option value="yes">Yes</option><option value="no">No - resolve on ground/impact</option></select></label>
    <div class="stageHelp wide">${SHOT_HELP[s.action]||'Configurable WarHeads stage.'}</div>
    <label class="wide jsonOpen">Stage JSON <textarea data-stage-json spellcheck="false"></textarea></label>`;row.querySelector('[data-k=flight]').value=s.flight||'yes';row.querySelector('[data-stage-json]').value=JSON.stringify(s,null,2);row.querySelectorAll('[data-k]').forEach(n=>{n.oninput=()=>{if(n.type==='range'){let v=row.querySelector(`[data-val="${n.dataset.k}"]`);if(v)v.textContent=n.value}syncJson();let cur=readStageRow(row);row.querySelector('.stageHelp').textContent=SHOT_HELP[cur.action]||'';row.querySelector('[data-stage-json]').value=JSON.stringify(cur,null,2)}});row.querySelector('[data-help]').onclick=()=>alert((SHOT_HELP[readStageRow(row).action]||'Configurable stage.')+'\n\nTip: Use the sliders for fast editing or open JSON for exact values.');row.querySelector('[data-json]').onclick=()=>row.classList.toggle('showJson');row.querySelector('[data-stage-json]').onchange=()=>{try{let st=normStage(JSON.parse(row.querySelector('[data-stage-json]').value));let w=readEditor();w.stages[i]=st;weaponDefs[editing]=w;renderStages(w);syncJson()}catch(e){toast('Invalid stage JSON.')}};row.querySelector('[data-del]').onclick=()=>{let w=readEditor();w.stages.splice(i,1);if(!w.stages.length)w.stages.push(normStage());weaponDefs[editing]=w;renderStages(w);syncJson()};row.querySelector('[data-up]').onclick=()=>{let w=readEditor();if(i>0){[w.stages[i-1],w.stages[i]]=[w.stages[i],w.stages[i-1]];weaponDefs[editing]=w;renderStages(w);syncJson()}};row.querySelector('[data-down]').onclick=()=>{let w=readEditor();if(i<w.stages.length-1){[w.stages[i+1],w.stages[i]]=[w.stages[i],w.stages[i+1]];weaponDefs[editing]=w;renderStages(w);syncJson()}};ui.stageList.appendChild(row)});}
function SHOT_ACTIONS_FLAT_LABEL(id){for(const arr of Object.values(SHOT_ACTIONS)){let f=arr.find(x=>x[0]===id);if(f)return f[1]}return id}
function readStageRow(r){let obj={};r.querySelectorAll('[data-k]').forEach(n=>{obj[n.dataset.k]=n.value});return normStage(obj)}
function readEditor(){let base=weaponDefs[editing]||{};return normWeapon({id:base.id||('custom-'+Date.now()),name:ui.editName.value||'Custom Weapon',playerMade:true,type:editorType,color:base.color||'#ffd21a',stages:[...ui.stageList.querySelectorAll('.stage')].map(readStageRow)})}
function syncJson(){let data=readEditor(),base=weaponDefs[editing];if(base&&!base.playerMade&&base.id&&defaultWeapons.some(w=>w.id===base.id))data.id='custom-'+Date.now();ui.weaponJson.value=JSON.stringify(data,null,2);ui.saveStatus.textContent='';renderPackTools()}
function openLab(){let load=(inGame&&ships.length?currentLoadout():(playerWeapons[0]||makeSelectedPlayerLoadout()||weaponDefs));let last=localStorage.getItem('warheads.lastWeaponId'),w=(last&&load.find(x=>x.id===last))||load[selected]||load[0]||weaponDefs[0];editing=weaponDefs.findIndex(x=>x.id===w.id);if(editing<0){weaponDefs.push(normWeapon({...w,playerMade:!!w.playerMade}));saveWeapons();weaponDefs=loadWeapons();editing=weaponDefs.findIndex(x=>x.id===w.id);if(editing<0)editing=weaponDefs.length-1}ui.lab.classList.add('open');loadEditor()}
const _oldRenderWeaponSelect=renderWeaponSelect;
function renderWeaponSelect(){_oldRenderWeaponSelect();try{let load=(ships.length?currentLoadout():(playerWeapons[0]||makeSelectedPlayerLoadout()));let cur=load[selected];if(cur)localStorage.setItem('warheads.lastWeaponId',cur.id)}catch(e){}renderPackTools()};
const _oldNewMatch=newMatch;
function newMatch(){_oldNewMatch();try{let humanCount=matchMode==='local'?clamp(settings.localHumans||0,0,settings.players):1;for(let i=0;i<playerWeapons.length;i++){if(ships[i]?.ai)playerWeapons[i]=makeBotLoadoutForSlot(Math.max(0,i-humanCount));else playerWeapons[i]=makeHumanLoadoutForSlot(i)}renderWeaponSelect();syncUI()}catch(e){console.warn('pack assignment failed',e)}};
function installEditorModEvents(){populatePackDropdowns();renderPackTools();let ids=['packSelect','packDefault','packWeaponList'];ids.forEach(id=>{let el=$(id);if(el)el.onchange=()=>{if(id==='packSelect')renderPackTools();else syncJson()}});if($('packMoveUp'))$('packMoveUp').onclick=()=>{let l=$('packWeaponList'),i=l.selectedIndex;if(i>0){let o=l.options[i];l.remove(i);l.add(o,i-1);l.selectedIndex=i-1;renderPackTools()}};if($('packMoveDown'))$('packMoveDown').onclick=()=>{let l=$('packWeaponList'),i=l.selectedIndex;if(i>=0&&i<l.options.length-1){let o=l.options[i];l.remove(i);l.add(o,i+1);l.selectedIndex=i+1;renderPackTools()}};if($('packSave'))$('packSave').onclick=saveCurrentPack;if($('packExport'))$('packExport').onclick=exportCurrentPack;if($('packNew'))$('packNew').onclick=()=>{let p={id:'pack:'+Date.now(),name:'My New Pack',defaultWeaponId:defaultWeapons[0].id,weaponIds:defaultWeapons.map(w=>w.id)};let packs=getWeaponPacks().filter(x=>x.id!=='pack:defaultMy');packs.push(p);saveWeaponPacks(packs);populatePackDropdowns();$('packSelect').value=p.id;renderPackTools();toast('New pack created.')};if($('packCloneWeapon'))$('packCloneWeapon').onclick=()=>{$('cloneWeapon')?.click();addWeaponToCurrentPack(weaponDefs[editing])};if($('packDeleteWeapon'))$('packDeleteWeapon').onclick=()=>{let l=$('packWeaponList');if(l&&l.selectedIndex>=0&&confirm('Remove this weapon from the current pack?')){l.remove(l.selectedIndex);renderPackTools()}};if($('packRestoreDefaults'))$('packRestoreDefaults').onclick=()=>{if(confirm('Restore default shot type definitions and clear custom shot type edits?')){localStorage.removeItem('warheads.customShotTypes');toast('Default shot types restored.')}};if($('exportWeapon'))$('exportWeapon').onclick=exportCurrentWeapon;if($('deleteWeapon'))$('deleteWeapon').onclick=()=>{let w=weaponDefs[editing];if(w&&w.playerMade&&confirm('Delete this custom weapon from saved weapons and packs?')){weaponDefs=weaponDefs.filter(x=>x.id!==w.id);saveWeapons();let packs=getWeaponPacks().filter(p=>p.id!=='pack:defaultMy').map(p=>({...p,weaponIds:(p.weaponIds||[]).filter(id=>id!==w.id),defaultWeaponId:p.defaultWeaponId===w.id?((p.weaponIds||[]).find(id=>id!==w.id)||''):p.defaultWeaponId}));saveWeaponPacks(packs);editing=0;loadEditor();renderWeaponSelect();toast('Weapon deleted.')}};}
setTimeout(installEditorModEvents,0);



/* v0.7.30 clean UI / simple weapon editor / pack + LAN pack recovery */
function WCE716_installCleanRecovery(){
  try{
    document.body.classList.add(localStorage.getItem('warheads.uiTheme')||'theme-deep-blue');
    document.documentElement.style.setProperty('--custom-menu-color', localStorage.getItem('warheads.uiColor')||'#35c8ff');
    if($('versionText')) $('versionText').textContent='v0.7.30';
    ui.lab.classList.add('cleanWeaponEditor');
    let title=document.querySelector('#lab .labHeaderTitle');
    if(title){ title.innerHTML='<b>Weapon Editor</b><span class="labSub">Quick weapon building first. Deep stage JSON, pack editing, and mod controls live behind buttons.</span>'; }
    let hint=document.querySelector('#lab .editorHint');
    if(hint){ hint.textContent='Build a weapon fast: choose a name, choose Staged or Sniper, then edit each stage. Use EDIT on a stage for deeper controls. Pack editing is separate so this screen stays readable.'; }
    let jsonParent=ui.weaponJson&&ui.weaponJson.parentElement;
    if(jsonParent){ jsonParent.classList.add('weaponJsonWrap'); }
    let toolbar=document.getElementById('cleanEditorToolbar');
    if(!toolbar){
      toolbar=document.createElement('div'); toolbar.id='cleanEditorToolbar'; toolbar.className='cleanEditorToolbar';
      toolbar.innerHTML='<button type="button" id="openPackEditor">PACK EDITOR</button><button type="button" id="toggleWeaponJson">WEAPON JSON</button><button type="button" id="quickHelpBtn">SHOT HELP</button><button type="button" id="resetEditorView">SIMPLE VIEW</button>';
      let top=document.querySelector('#lab .editorTopGrid'); if(top) top.insertAdjacentElement('afterend', toolbar);
    }
    if(!document.getElementById('packLab')){
      let packLab=document.createElement('section'); packLab.className='lab'; packLab.id='packLab';
      packLab.innerHTML='<button class="panelX alwaysClose" id="packCloseX" type="button">X</button><div class="row"><b>Pack Editor</b><div><button id="packBackToWeapon">Back To Weapon Editor</button><button id="packClose">Close</button></div></div><div class="labBody"><div class="packNote">A pack is a named list of weapons. Choose a default weapon here; the game uses your last selected weapon in-match, while packs keep sharing/exporting clean. Exported packs are named for UserWeaponPacks/.</div><div id="packLabBody"></div></div>';
      document.getElementById('app').appendChild(packLab);
    }
    let packTools=document.querySelector('#lab .packTools')||document.querySelector('.packTools');
    if(packTools && document.getElementById('packLabBody') && packTools.parentElement!==document.getElementById('packLabBody')){
      document.getElementById('packLabBody').appendChild(packTools); packTools.classList.add('open');
    }
    if($('openPackEditor')) $('openPackEditor').onclick=()=>{ populatePackDropdowns(); renderPackTools(); $('packLab').classList.add('open'); };
    if(!document.getElementById('botPackLab')){
      let botLab=document.createElement('section'); botLab.className='lab'; botLab.id='botPackLab';
      botLab.innerHTML='<button class="panelX alwaysClose" id="botPackLabX" type="button">X</button><div class="row"><b>Bot Pack Setup</b><div><button id="botPackLabClose">Close</button></div></div><div class="labBody"><div class="packNote">Assign packs and difficulty for BOT PLAY and local matches without cluttering the main Options panel.</div><div id="botPackLabBody"></div></div>';
      document.getElementById('app').appendChild(botLab);
    }
    let botGrid=document.getElementById('botPackGrid');
    if(botGrid && document.getElementById('botPackLabBody') && botGrid.parentElement!==document.getElementById('botPackLabBody')) document.getElementById('botPackLabBody').appendChild(botGrid);
    if(!document.getElementById('openBotPackEditor') && $('optionsAdvanced')){ let b=document.createElement('button'); b.id='openBotPackEditor'; b.type='button'; b.textContent='BOT PACKS / DIFFICULTY'; b.className='primary'; $('optionsAdvanced').insertAdjacentElement('beforebegin', b); }
    function openBotPackOverlay(){
      WCE716_populateLocalPackDropdowns();
      const lab=$('botPackLab');
      if(lab){
        lab.classList.add('open');
        lab.style.zIndex='120';
        lab.scrollTop=0;
        const body=lab.querySelector('.labBody');
        if(body) body.scrollTop=0;
      }
    }
    if($('openBotPackEditor')) $('openBotPackEditor').onclick=openBotPackOverlay;
    if($('localOpenBotPacks')) $('localOpenBotPacks').onclick=openBotPackOverlay;
    function closeBotPackOverlay(){ $('botPackLab')?.classList.remove('open'); }
    ['botPackLabX','botPackLabClose'].forEach(id=>{ if($(id)) $(id).onclick=closeBotPackOverlay; });
    document.addEventListener('keydown',e=>{ if(e.key==='Escape' && $('botPackLab')?.classList.contains('open')) closeBotPackOverlay(); });
    const closePack=()=>{$('packLab')?.classList.remove('open')};
    ['packCloseX','packClose','packBackToWeapon'].forEach(id=>{ if($(id)) $(id).onclick=closePack; });
    if($('toggleWeaponJson')) $('toggleWeaponJson').onclick=()=>{ let p=ui.weaponJson?.parentElement; if(p) p.classList.toggle('open'); };
    if($('quickHelpBtn')) $('quickHelpBtn').onclick=()=>alert('Simple flow: make stages, save weapon.\n\nStage EDIT opens deep settings like split count, dig time, flight allowed, speed, homing, and JSON.\n\nPACK EDITOR manages pack name, default weapon, cloning, saving, and exporting.');
    if($('resetEditorView')) $('resetEditorView').onclick=()=>{document.querySelectorAll('.compactStage').forEach(e=>{e.classList.remove('open','showJson')}); let p=ui.weaponJson?.parentElement; if(p) p.classList.remove('open'); };

    // UI theme controls stay in Options, not on main menu.
    if(!document.getElementById('uiThemeBlock') && $('optionsPanel')){
      let block=document.createElement('div'); block.id='uiThemeBlock'; block.className='uiThemeBlock';
      block.innerHTML='<div class="wide uiNote">UI Style: keep the ANSI/BBS spirit, or switch to another sci-fi terminal look. Default is blue for readability.</div><label>UI Style <select id="menuUiTheme"><option value="theme-deep-blue">Deep Blue Terminal</option><option value="theme-classic-green">Classic Green ANSI</option><option value="theme-nebula-purple">Nebula Purple</option><option value="theme-alien-amber">Alien Amber</option><option value="theme-crimson-alert">Crimson Alert</option><option value="theme-ice-terminal">Ice Terminal</option><option value="theme-retro-gold">Retro Gold</option><option value="theme-stealth-gray">Stealth Gray</option><option value="theme-plasma-pink">Plasma Pink</option><option value="theme-ocean-cyan">Ocean Cyan</option><option value="theme-custom">Custom Color</option></select></label><label>Menu Color <input id="menuUiColor" type="color" value="#35c8ff"></label>';
      let adv=$('optionsAdvanced'); if(adv) adv.insertAdjacentElement('beforebegin', block); else $('optionsPanel').appendChild(block);
    }
    function applyTheme(){
      const classes=['theme-deep-blue','theme-classic-green','theme-nebula-purple','theme-alien-amber','theme-crimson-alert','theme-ice-terminal','theme-retro-gold','theme-stealth-gray','theme-plasma-pink','theme-ocean-cyan','theme-custom'];
      classes.forEach(c=>document.body.classList.remove(c));
      let theme=$('menuUiTheme')?.value||localStorage.getItem('warheads.uiTheme')||'theme-deep-blue'; document.body.classList.add(theme); localStorage.setItem('warheads.uiTheme',theme);
      let col=$('menuUiColor')?.value||localStorage.getItem('warheads.uiColor')||'#35c8ff'; document.documentElement.style.setProperty('--custom-menu-color',col); localStorage.setItem('warheads.uiColor',col);
    }
    if($('menuUiTheme')){ $('menuUiTheme').value=localStorage.getItem('warheads.uiTheme')||'theme-deep-blue'; $('menuUiTheme').onchange=applyTheme; }
    if($('menuUiColor')){ $('menuUiColor').value=localStorage.getItem('warheads.uiColor')||'#35c8ff'; $('menuUiColor').oninput=applyTheme; }
    applyTheme();

    // LAN player pack assignment belongs on LOCAL LAN setup, not the global Options clutter.
    if(!document.getElementById('localHumanPacks') && $('localLanPanel')){
      let block=document.createElement('div'); block.id='localHumanPacks'; block.className='localPackBlock';
      block.innerHTML='<div class="wide">Local Human Weapon Packs</div><label>Player 1 Pack <select id="localHumanPack1"></select></label><label>Player 2 Pack <select id="localHumanPack2"></select></label><label>Player 3 Pack <select id="localHumanPack3"></select></label><label>Player 4 Pack <select id="localHumanPack4"></select></label><button type="button" class="primary wide" id="localOpenBotPacks">BOT PACKS / DIFFICULTY</button>';
      let start=$('localStart'); if(start) start.insertAdjacentElement('beforebegin',block); else $('localLanPanel').appendChild(block);
    }
    populatePackDropdowns(); WCE716_populateLocalPackDropdowns();
    if($('localHumans')) $('localHumans').onchange=WCE716_syncLocalPacks;
    WCE716_syncLocalPacks();

    // Make every modal/option panel escapable.
    ['optionsClose','optionsBack','advancedClose','advancedBack','localLanClose','localBack'].forEach(id=>{ if($(id)) $(id).onclick=()=>showMenuPanel(id&&id.startsWith('advanced')?'optionsPanel':null); });
    if($('gameMenu')) $('gameMenu').onclick=()=>{ ui.menu.classList.remove('hidden'); showMenuPanel(null); };
    if($('labOpen')) $('labOpen').onclick=()=>openLab();
    if($('menuEditor')) $('menuEditor').onclick=()=>{clearGameSession();setGameLoaded(false);showMenuPanel(null);ui.menu.classList.add('hidden');openLab();};
    if($('menuOptions')) $('menuOptions').onclick=()=>{let opening=ui.optionsPanel.classList.contains('hidden');showMenuPanel(opening?'optionsPanel':null);startMusic();};
    if($('menuLan')) $('menuLan').onclick=()=>{openLocalLanSetup(); WCE716_populateLocalPackDropdowns(); WCE716_syncLocalPacks();};
  }catch(e){console.warn('v0.7.30 clean recovery install failed',e)}
}
function WCE716_populateLocalPackDropdowns(){
  try{
    let packs=getWeaponPacks();
    let opts=packs.map(p=>`<option value="${p.id}">${p.name}</option>`).join('')+'<option value="gold">Default + My Weapons</option><option value="generated">Generated Chaos + My Weapons</option><option value="saved">My Weapons Only</option><option value="all">ALL Weapons</option>';
    ['localHumanPack1','localHumanPack2','localHumanPack3','localHumanPack4','botDefaultPack','humanDefaultPack','botPack1','botPack2','botPack3','botPack4','botPack5','botPack6','botPack7','botPack8'].forEach((id,idx)=>{let el=$(id); if(el){let old=el.value; el.innerHTML=opts; el.value=old||localStorage.getItem('warheads.'+id)||'pack:defaultMy'; el.onchange=()=>localStorage.setItem('warheads.'+id,el.value);}});
  }catch(e){console.warn('populate local packs failed',e)}
}
function WCE716_syncLocalPacks(){
  let h=parseInt($('localHumans')?.value||'2',10);
  ['localHumanPack1','localHumanPack2','localHumanPack3','localHumanPack4'].forEach((id,i)=>{let el=$(id); if(el&&el.parentElement) el.parentElement.style.display=(i<h?'grid':'none');});
}
function WCE716_slider(k,label,min,max,step,val,tip){
  let n=Number.isFinite(+val)?+val:0;
  return `<label title="${tip||''}">${label} <span class="sliderValue" data-val="${k}">${n}</span><input data-k="${k}" type="range" min="${min}" max="${max}" step="${step}" value="${n}"></label>`;
}
function renderStages(w){
  ui.stageList.innerHTML='';
  (w.stages||[normStage()]).forEach((raw,i)=>{
    let s=normStage(raw); let row=document.createElement('div'); row.className='stage compactStage'; row.dataset.stageIndex=i;
    row.innerHTML=`<small><span>Stage ${i+1}: ${SHOT_ACTIONS_FLAT_LABEL(s.action)}</span><span><button type="button" data-edit>EDIT</button><button type="button" data-help>HELP</button><button type="button" data-json>JSON</button><button type="button" data-del>DEL</button></span></small>
      <div class="stageQuick"><label>Action <select data-k="action">${actionOptionsHtml(s.action)}</select></label>${WCE716_slider('radius','Radius',4,+modSettings.stageRadiusCap||260,1,s.radius,'Size of explosion/tunnel/field.')}${WCE716_slider('damage','Damage',0,+modSettings.stageDamageCap||160,1,s.damage,'Ship damage and terrain bite.')}${WCE716_slider('count','Count',1,+modSettings.stageCountCap||8,1,s.count,'Pellets/splits/pulses.') }<button type="button" data-copy>Clone</button></div>
      <div class="stageDeep">${WCE716_slider('delay','Delay MS',0,20000,50,s.delay,'When this stage fires.')}${WCE716_slider('splitDepth','Split Depth',0,5,1,s.splitDepth,'How many splitter branches are allowed.')}${WCE716_slider('digTime','Dig Time MS',60,6000,20,s.digTime,'How long DIG/splitter/napalm chews terrain.')}${WCE716_slider('speed','Child Speed',0,40,.1,s.speed,'Speed of child/sequence shots.')}${WCE716_slider('homing','Homing',0,300,1,s.homing,'Extra guidance toward enemies.') }<label>Flight Allowed <select data-k="flight"><option value="yes">Yes</option><option value="no">No - impact only</option></select></label><div class="stageHelp">${SHOT_HELP[s.action]||'Configurable WarHeads stage.'}</div><label class="stageJsonBox">Stage JSON <textarea data-stage-json spellcheck="false"></textarea></label></div>`;
    row.querySelector('[data-k=flight]').value=s.flight||'yes'; row.querySelector('[data-stage-json]').value=JSON.stringify(s,null,2);
    row.querySelectorAll('[data-k]').forEach(n=>{n.oninput=()=>{let v=row.querySelector(`[data-val="${n.dataset.k}"]`); if(v)v.textContent=n.value; let cur=readStageRow(row); row.querySelector('small span').textContent=`Stage ${i+1}: ${SHOT_ACTIONS_FLAT_LABEL(cur.action)}`; row.querySelector('.stageHelp').textContent=SHOT_HELP[cur.action]||'Configurable WarHeads stage.'; row.querySelector('[data-stage-json]').value=JSON.stringify(cur,null,2); syncJson();};});
    row.querySelector('[data-edit]').onclick=()=>row.classList.toggle('open');
    row.querySelector('[data-json]').onclick=()=>{row.classList.add('open'); row.classList.toggle('showJson');};
    row.querySelector('[data-help]').onclick=()=>alert((SHOT_HELP[readStageRow(row).action]||'Configurable stage.')+'\n\nUse EDIT for advanced sliders. JSON is optional and exact.');
    row.querySelector('[data-copy]').onclick=()=>{let w=readEditor(); w.stages.splice(i+1,0,readStageRow(row)); weaponDefs[editing]=w; renderStages(w); syncJson();};
    row.querySelector('[data-del]').onclick=()=>{let w=readEditor(); w.stages.splice(i,1); if(!w.stages.length)w.stages.push(normStage()); weaponDefs[editing]=w; renderStages(w); syncJson();};
    row.querySelector('[data-stage-json]').onchange=()=>{try{let st=normStage(JSON.parse(row.querySelector('[data-stage-json]').value));let w=readEditor();w.stages[i]=st;weaponDefs[editing]=w;renderStages(w);syncJson()}catch(e){toast('Invalid stage JSON.')}};
    ui.stageList.appendChild(row);
  });
}
function readStageRow(r){let obj={};r.querySelectorAll('[data-k]').forEach(n=>{obj[n.dataset.k]=n.value});return normStage(obj)}
function readEditor(){let base=weaponDefs[editing]||{};return normWeapon({id:base.id||('custom-'+Date.now()),name:ui.editName.value||'Custom Weapon',playerMade:true,type:editorType,color:base.color||'#ffd21a',stages:[...ui.stageList.querySelectorAll('.stage')].map(readStageRow)})}
function syncJson(){let data=readEditor(),base=weaponDefs[editing];if(base&&!base.playerMade&&base.id&&defaultWeapons.some(w=>w.id===base.id))data.id='custom-'+Date.now();ui.weaponJson.value=JSON.stringify(data,null,2);ui.saveStatus.textContent=''}
function loadEditor(){let w=weaponDefs[editing]||weaponDefs[0]||defaultWeapons[0];ui.editName.value=w.name;setEditorType(w.type||'staged');renderStages(w);syncJson();markWeaponEditorClean()}
function openLab(){let load=(inGame&&ships.length?currentLoadout():(playerWeapons[0]||makeSelectedPlayerLoadout()||weaponDefs));let last=localStorage.getItem('warheads.lastWeaponId'),w=(last&&load.find(x=>x.id===last))||load[selected]||load[0]||weaponDefs[0];editing=weaponDefs.findIndex(x=>x.id===w.id);if(editing<0){weaponDefs.push(normWeapon({...w,playerMade:!!w.playerMade}));saveWeapons();weaponDefs=loadWeapons();editing=weaponDefs.findIndex(x=>x.id===w.id);if(editing<0)editing=weaponDefs.length-1}ui.lab.classList.add('open');loadEditor()}
function makeHumanLoadoutForSlot(slot=0){let id=($('localHumanPack'+(slot+1))?.value)||($('humanDefaultPack')?.value)||settings.playerPackChoice||'gold';return String(id).startsWith('pack:')?loadoutFromPackId(id):(id==='all'?[...allWeaponMap().values()]:makeSelectedPlayerLoadout())}


/* v0.7.30 startup-safe overrides + ship library / LAN ship assignment */
(function(){
  const VERSION_0719='v0.7.30';
  function safeNum(v,d){v=+v;return Number.isFinite(v)?v:d}
  function safeUniqueWeapons(list){return uniqueWeapons(list||[])}

  // Replace hoisted wrapper recursion with direct implementations. Do not call any _old* wrappers.
  makeSelectedPlayerLoadout = function(){
    let choice=settings.playerPackChoice||settings.packMode||'gold';
    if(String(choice).startsWith('pack:')) return loadoutFromPackId(choice);
    let saved=savedPlayerWeapons();
    if(choice==='saved') return safeUniqueWeapons([normWeapon(defaultWeapons[0]),...saved]).slice(0,128);
    if(choice==='generated') return makeLoadout(settings.addSavedPack!==false,true);
    if(choice==='all') return safeUniqueWeapons([...defaultWeapons.map(normWeapon),...weaponDefs.map(normWeapon),...saved]).slice(0,220);
    return makeLoadout(true,false);
  };

  renderWeaponSelect = function(){
    let load=(ships.length?currentLoadout():(playerWeapons[0]||makeSelectedPlayerLoadout()));
    if(!playerWeapons[0]&&!ships.length) playerWeapons[0]=load;
    selected=clamp(selected,0,Math.max(0,load.length-1));
    ui.weaponSelect.innerHTML='';
    load.forEach((w,i)=>{let o=document.createElement('option');o.value=i;o.textContent=w.name;ui.weaponSelect.appendChild(o)});
    ui.weaponSelect.value=selected;
    try{let cur=load[selected];if(cur)localStorage.setItem('warheads.lastWeaponId',cur.id)}catch(e){}
  };

  applyStage = function(x,y,st,w,owner,weaponIndex=selected){
    st=normStage(st);
    weaponIndex=clamp(weaponIndex,0,Math.max(0,(playerWeapons[owner]||weaponDefs).length-1));
    if(st.flight==='no'&&['fly','homing','spread','shotgun','wave','machine','sequence'].includes(st.action)) st={...st,action:'explode',count:1};
    if(st.action==='sequence'){
      let payload=(w.stages||[]).filter(q=>q.action!=='sequence').slice(0,Math.max(1,Math.min(8,st.count||4)));
      if(!payload.length) payload=[{...st,action:'explode',count:1}];
      let t=chooseTarget(owner),ang=t?Math.atan2(t.y-y,t.x-x):rand(0,Math.PI*2),base=clamp((st.speed||5)+(st.damage||20)*.02,3,10);
      payload.forEach((stage,i)=>setTimeout(()=>{if(!(busy&&owner===activeShotOwner))return;sfx('launch');let ss=normStage({...stage,action:stage.action==='sequence'?'explode':stage.action});addShot({x:x+Math.cos(ang)*i*14,y:y+Math.sin(ang)*i*14,vx:Math.cos(ang)*base,vy:Math.sin(ang)*base,owner,weapon:weaponIndex,color:w.color,stage:ss,trail:[],age:0,wraps:0,maxLife:SHOT_MAX_LIFE,spawnDepth:1},1)},i*clamp(st.delay||140,50,900)));
      return;
    }
    if(st.action==='laser'){
      for(let i=0;i<st.count;i++){let a=rand(0,7),len=st.radius*rand(1.2,2.8),x2=x+Math.cos(a)*len,y2=y+Math.sin(a)*len;beams.push({x1:x,y1:y,x2,y2,life:28,color:w.color});blast(x2,y2,{...st,action:'explode',radius:st.radius*.32,damage:st.damage*.55},w,owner)}return;
    }
    if(st.action==='homing'){
      let t=chooseTarget(owner),a=t?Math.atan2(t.y-y,t.x-x):rand(0,7);addShot({x,y,vx:Math.cos(a)*4,vy:Math.sin(a)*4,owner,weapon:weaponIndex,color:w.color,stage:{...st,action:'explode',count:1},homing:90,trail:[],age:0,wraps:0,maxLife:SHOT_MAX_LIFE,spawnDepth:1},1);return;
    }
    if(st.action==='spread'||st.action==='shotgun'||st.action==='wave'){
      let base=rand(0,7),n=st.action==='shotgun'?6:st.count;for(let i=0;i<n;i++){let a=base+(i-(n-1)/2)*(st.action==='wave'?.38:.18),spd=rand(st.action==='shotgun'?3:2,st.action==='shotgun'?7:5);addShot({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,owner,weapon:weaponIndex,color:w.color,stage:{...st,action:'explode',count:1},trail:[],age:0,wraps:0,maxLife:SHOT_MAX_LIFE,spawnDepth:1},1)}return;
    }
    if(st.action==='machine'){let payload=(w.stages||[]).filter(q=>q.action!=='machine').slice(0,Math.max(1,Math.min(7,st.count||6)));if(!payload.length)payload=[{...st,action:'explode',radius:st.radius*.55,damage:st.damage*.45,count:1}];let t=chooseTarget(owner),ang=t?Math.atan2(t.y-y,t.x-x):rand(0,Math.PI*2),base=clamp(4.8+(st.damage||20)*.035,4.8,8.2);payload.forEach((stage,i)=>setTimeout(()=>{if(busy&&owner===activeShotOwner){sfx('launch');let ss=safeStageForChild(stage);addShot({x:x+Math.cos(ang)*i*8,y:y+Math.sin(ang)*i*8,vx:Math.cos(ang)*base,vy:Math.sin(ang)*base,owner,weapon:weaponIndex,color:w.color,stage:ss,trail:[],age:0,wraps:0,maxLife:SHOT_MAX_LIFE,spawnDepth:1},1)}},i*92));return}
    if(st.action==='warburst'){let n=Math.min(7,MAX_WARHEADS_PER_TURN-turnWarheadsCreated);for(let i=0;i<n;i++)spawnChaosShot(x,y,owner,{...st,action:'explode',radius:clamp(st.radius*rand(.9,1.45),20,110),damage:clamp(st.damage*rand(.75,1.15),8,78),count:1},weaponIndex);return}
    if(st.action==='cluster'){w.stages.slice(0,Math.min(6,w.stages.length)).forEach((stage,i)=>setTimeout(()=>{if(busy&&owner===activeShotOwner)spawnChaosShot(x,y,owner,safeStageForChild(stage),weaponIndex)},i*80));return}
    if(st.action==='whiteout'){sfx('whiteout');beams.push({x1:x-70,y1:y,x2:x+70,y2:y,life:34,color:'#ffffff'});setTimeout(()=>{blast(x,y,{...st,action:'explode',radius:clamp(st.radius,70,160),damage:clamp(st.damage,50,90)},w,owner);ships.forEach((s,i)=>{let d=Math.max(1,Math.hypot(s.x-x,s.y-y));if(d<st.radius*2.4){let a=Math.atan2(s.y-y,s.x-x),push=clamp((st.radius*2.4-d)/st.radius*8,3,13);s.vx=Math.cos(a)*push;s.vy=Math.sin(a)*push;s.planet=null;s.lost=150}})},420);spark(x,y,150,'#ffffff','whiteout');return}
    if(st.action==='walker'){let p=nearestPlanet(x,y);if(!p){blast(x,y,{...st,action:'explode'},w,owner);return}let base=Math.atan2(y-p.y,x-p.x),n=clamp(Math.round(st.count||1),1,6);for(let i=0;i<n;i++){let a=base+(i-(n-1)/2)*.18,dir=Math.random()<.5?-1:1,r=planetRadiusAt(p,a)+24;addWalker({p,a,x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r,owner,weapon:weaponIndex,color:w.color,life:clamp(st.delay||6500,3500,14000),stage:{...st,action:'explode',radius:clamp(st.radius,12,50),damage:clamp(st.damage,5,45),count:1},speed:dir*rand(.010,.026),scan:0,step:rand(0,Math.PI*2)})}spark(x,y,38,w.color,'smoke');return}
    if(st.action==='fly'){for(let i=0;i<st.count;i++){let a=rand(0,Math.PI*2),spd=rand(2.4,5.4);addShot({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,owner,weapon:weaponIndex,color:w.color,stage:{...st,action:'explode',count:1},trail:[],age:0,wraps:0,maxLife:SHOT_MAX_LIFE,spawnDepth:1},1)}return}
    if(st.action==='orbit'){let p=nearestPlanet(x,y);if(!p){blast(x,y,{...st,action:'explode'},w,owner);return}let base=Math.atan2(y-p.y,x-p.x),n=clamp(Math.round(st.count||1),1,4),payload=w.stages.filter(q=>q.action!=='orbit').slice(0,4).map(safeOrbitStageForChild);if(!payload.length)payload=[safeOrbitStageForChild({...st,action:'explode',radius:clamp(st.radius,18,38),damage:clamp(st.damage||22,8,56),count:1})];for(let i=0;i<n;i++){let a=base+i/n*Math.PI*2+rand(-.42,.42),off=rand(52,88),dir=Math.random()<.5?-1:1,ticks=Math.floor(rand(150,280));addShot({x:p.x+Math.cos(a)*(planetRadiusAt(p,a)+off),y:p.y+Math.sin(a)*(planetRadiusAt(p,a)+off),vx:0,vy:0,owner,weapon:weaponIndex,color:w.color,stage:payload[0],orbit:p,orbitAngle:a,orbitOffset:off,orbitTicks:ticks,orbitSpeed:dir*rand(.075,.13),orbitPayload:payload,homingAfterOrbit:110,trail:[],age:0,wraps:0,maxLife:SHOT_MAX_LIFE,spawnDepth:1},1)}spark(x,y,44,w.color,'smoke');return}
    if(st.action==='splitter'){let p=hitPlanet(x,y)||nearestPlanet(x,y);if(!p){blast(x,y,{...st,action:'explode'},w,owner);return}let base=Math.atan2(y-p.y,x-p.x);for(let i=0,n=clamp(st.count,3,8);i<n;i++){let a=base+(i-(n-1)/2)*.13,spd=clamp(3.5+st.damage*.06,3.4,8);addShot({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,owner,weapon:weaponIndex,color:w.color,splitter:true,stage:{...st,action:'dig',radius:clamp(st.radius,10,42),damage:clamp(st.damage*.65,4,45),count:1},trail:[],age:0,wraps:0,tunnel:0,maxLife:SHOT_MAX_LIFE,spawnDepth:1},1)}spark(x,y,90,w.color);return}
    if(st.action==='split'){for(let i=0,n=Math.min(st.count,7);i<n;i++)addShot({x,y,vx:Math.cos(i/n*Math.PI*2)*3,vy:Math.sin(i/n*Math.PI*2)*3,owner,weapon:weaponIndex,color:w.color,stage:{...st,action:'explode',count:1},trail:[],age:0,wraps:0,maxLife:SHOT_MAX_LIFE,spawnDepth:1},1);return}
    if(st.action==='burst'){for(let i=0;i<st.count;i++){let a=i/st.count*Math.PI*2;blast(x+Math.cos(a)*st.radius,y+Math.sin(a)*st.radius,st,w,owner)}return}
    blast(x,y,st,w,owner);
  };

  // Ship library with player/bot groups, localStorage persistence, and export names aimed at SHIPS/.
  normShipSprite = function(s={}){let w=clamp(Math.round(+s.w||16),4,32),h=clamp(Math.round(+s.h||16),4,32),cells=Array.isArray(s.cells)?s.cells.map(c=>({x:clamp(Math.round(+c.x||0),0,w-1),y:clamp(Math.round(+c.y||0),0,h-1),c:/^#[0-9a-f]{6}$/i.test(c.c||'')?c.c:'#66d9ff'})).filter((c,i,a)=>a.findIndex(q=>q.x===c.x&&q.y===c.y)===i):[];let botMade=!!(s.botMade||s.group==='bot');let userMade=!!(s.userMade||s.custom||!botMade);return{id:String(s.id||((botMade?'botship-':'ship-')+Date.now())),name:String(s.name||(botMade?'Bot Ship':'Custom Ship')).slice(0,24),w,h,cells,userMade:!!userMade,botMade:!!botMade,custom:true,created:+s.created||Date.now(),genIndex:+s.genIndex||0}}
  loadShips = function(){let list=[];try{let s=JSON.parse(localStorage.getItem('warheads.ships')||'null');if(Array.isArray(s))list=s.map(normShipSprite).filter(x=>x.cells.length)}catch(e){list=[]}defaultShipSprites.map(x=>normShipSprite({...x,userMade:false,botMade:false})).forEach(sp=>{if(!list.some(x=>x.id===sp.id))list.push(sp)});return enforceShipCaps(list)}
  saveShips = function(){shipDefs=enforceShipCaps(shipDefs);localStorage.setItem('warheads.ships',JSON.stringify(shipDefs))}
  function playerShipSprites(){return shipDefs.filter(s=>!s.botMade&&s.userMade&&s.cells&&s.cells.length).slice(0,10)}
  userShipSprites = playerShipSprites;
  function botShipSprites(){return shipDefs.filter(s=>s.botMade&&s.cells&&s.cells.length).slice(0,20)}
  function enforceShipCaps(list){let defaults=(list||[]).filter(s=>!s.userMade&&!s.botMade);let players=(list||[]).filter(s=>s.userMade&&!s.botMade).sort((a,b)=>(b.created||0)-(a.created||0)).slice(0,10);let bots=(list||[]).filter(s=>s.botMade).sort((a,b)=>(b.genIndex||b.created||0)-(a.genIndex||a.created||0)).slice(0,20);return [...defaults,...players,...bots]}
  shipDefs=loadShips();
  savedPlayerShip = function(slot=0){let id=(matchMode==='local'&&$('localHumanShip'+(slot+1))?.value)||localStorage.getItem('warheads.playerShip')||playerShipId;return shipDefs.find(s=>s.id===id&&s.cells&&s.cells.length)||playerShipSprites()[0]||null}
  choosePlayerSprite = function(slot=0){let sp=savedPlayerShip(slot);return sp?cloneShipSprite(sp):makeShipSprite()}
  function randomBotShipCells(){let cells=makeRandomShipCells();let left=cells.filter(c=>c.x<8);return [...left.map(c=>({...c})),...left.map(c=>({x:15-c.x,y:c.y,c:c.c}))]}
  function makeGeneratedBotShip(slot=0){let counter=parseInt(localStorage.getItem('warheads.botShipCounter')||'0',10)+1;localStorage.setItem('warheads.botShipCounter',String(counter));let sp=normShipSprite({id:'botship-'+(counter%20),name:'Bot Ship '+((counter%20)+1),w:16,h:16,cells:randomBotShipCells(),botMade:true,userMade:false,created:Date.now(),genIndex:counter});let idx=shipDefs.findIndex(s=>s.id===sp.id);if(idx>=0)shipDefs[idx]=sp;else shipDefs.push(sp);saveShips();localStorage.setItem('warheads.botShipSlot'+slot,sp.id);return sp}
  chooseBotSprite = function(slot=0){let assigned=($('botShip'+(slot+1))?.value)||($('botShipDefault')?.value)||localStorage.getItem('warheads.botShipSelect'+slot)||'random';if(assigned&&assigned!=='random'&&assigned!=='none'){let sp=shipDefs.find(s=>s.id===assigned&&s.cells&&s.cells.length);if(sp)return cloneShipSprite(sp)}let savedId=localStorage.getItem('warheads.botShipSlot'+slot);let saved=savedId&&shipDefs.find(s=>s.id===savedId&&s.botMade);if(saved)return cloneShipSprite(saved);return cloneShipSprite(makeGeneratedBotShip(slot))}

  function shipOptionHtml(){let players=playerShipSprites(),bots=botShipSprites();let html='<option value="random">Random / Procedural</option><optgroup label="Player Ships">'+players.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')+'</optgroup><optgroup label="Bot Generated Ships">'+bots.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')+'</optgroup>';return html}
  function renderShipLibraryList(){let sel=$('shipSavedList');if(!sel)return;let old=sel.value;sel.innerHTML='<optgroup label="Player Ships - max 10">'+playerShipSprites().map(s=>`<option value="${s.id}">${s.name}</option>`).join('')+'</optgroup><optgroup label="Bot Generated Ships - max 20">'+botShipSprites().map(s=>`<option value="${s.id}">${s.name}</option>`).join('')+'</optgroup>';sel.value=old||localStorage.getItem('warheads.playerShip')||sel.options[0]?.value||'';populateShipAssignmentDropdowns()}
  function installShipManagerPanel(){if($('shipSavedList')||!$('shipLab'))return;let panel=document.createElement('div');panel.className='shipManagerPanel';panel.innerHTML='<div class="wide">Ship Library</div><select id="shipSavedList"></select><div class="shipManagerRow"><button type="button" id="shipEditSelected">EDIT</button><button type="button" id="shipSetDefault">SET PLAYER DEFAULT</button><button type="button" id="shipDeleteSelected">DELETE</button></div><div class="shipManagerRow"><button type="button" id="shipNewPlayer">NEW PLAYER SHIP</button><button type="button" id="shipNewBot">NEW BOT SHIP</button><button type="button" id="shipExportLibrary">EXPORT SHIPS</button></div><div class="wide" style="font-size:12px;color:var(--muted)">Player ships are capped at 10. Bot generated ships are capped at 20 and rotate safely without overwriting player ships.</div>';let target=$('shipPreview')||$('shipGrid')||$('shipJson');target.parentElement.insertBefore(panel,target);$('shipEditSelected').onclick=()=>{let sp=shipDefs.find(s=>s.id===$('shipSavedList').value);if(sp)loadShipEditor(sp)};$('shipSetDefault').onclick=()=>{let sp=shipDefs.find(s=>s.id===$('shipSavedList').value);if(sp){playerShipId=sp.id;localStorage.setItem('warheads.playerShip',sp.id);toast('Player default ship set.')}};$('shipDeleteSelected').onclick=()=>{let id=$('shipSavedList').value,sp=shipDefs.find(s=>s.id===id);if(sp&&confirm('Delete '+sp.name+'?')){shipDefs=shipDefs.filter(s=>s.id!==id);if(playerShipId===id){playerShipId='';localStorage.removeItem('warheads.playerShip')}saveShips();renderShipLibraryList();let next=playerShipSprites()[0]||botShipSprites()[0]||{id:'ship-'+Date.now(),name:'My Ship',w:16,h:16,cells:makeRandomShipCells(),userMade:true,custom:true};loadShipEditor(next);}};$('shipNewPlayer').onclick=()=>loadShipEditor({id:'ship-'+Date.now(),name:'My Ship',w:16,h:16,cells:[],userMade:true,botMade:false,custom:true});$('shipNewBot').onclick=()=>loadShipEditor({id:'botship-edit-'+Date.now(),name:'Bot Ship',w:16,h:16,cells:randomBotShipCells(),userMade:false,botMade:true,custom:true});$('shipExportLibrary').onclick=exportShipsFromEditor;renderShipLibraryList()}
  loadShipEditor = function(sp){sp=normShipSprite({...sp,custom:true});shipPainting=false;shipEditorCells=sp.cells.map(c=>({...c}));$('shipName').value=sp.name||'My Ship';$('shipColor').value=shipPaint;renderShipPalette();renderShipGrid();syncShipJson(sp.id);markShipEditorClean();renderShipLibraryList()}
  readShipEditor = function(id=null){let existing=null;try{existing=JSON.parse($('shipJson').value||'null')}catch(e){}let botMade=!!existing?.botMade||String(existing?.id||id||'').startsWith('botship-');return normShipSprite({id:id||existing?.id||((botMade?'botship-edit-':'ship-')+Date.now()),name:$('shipName').value||(botMade?'Bot Ship':'My Ship'),w:16,h:16,userMade:!botMade,botMade,custom:true,cells:shipEditorCells,created:existing?.created||Date.now(),genIndex:existing?.genIndex||0})}
  syncShipJson = function(id=null){let existing=null;try{existing=JSON.parse($('shipJson').value||'null')}catch(e){}let sp=readShipEditor(id||existing?.id||null);$('shipJson').value=JSON.stringify(sp,null,2);$('shipStatus').textContent=''}
  saveShipFromEditor = function(){let raw=null;try{raw=JSON.parse($('shipJson').value)}catch(e){}let sp=normShipSprite({...readShipEditor(raw?.id||null),...(raw||{}),cells:shipEditorCells});if(!sp.botMade){sp.userMade=true;sp.botMade=false}let idx=shipDefs.findIndex(x=>x.id===sp.id);if(idx>=0)shipDefs[idx]=sp;else shipDefs.push(sp);if(!sp.botMade){playerShipId=sp.id;localStorage.setItem('warheads.playerShip',sp.id)}saveShips();renderShipLibraryList();if(ships[0]&&!sp.botMade)ships[0].sprite=cloneShipSprite(sp);markShipEditorClean();shipPainting=false;$('shipStatus').textContent=`Saved "${sp.name}" ${sp.botMade?'as BOT ship':'and assigned it to PLAYER'}.`;toast(sp.botMade?'Bot ship saved.':'Ship saved and assigned to PLAYER.',1500)}
  exportShipsFromEditor = function(){let current=null;try{current=readShipEditor(JSON.parse($('shipJson').value||'null')?.id||null)}catch(e){current=readShipEditor()}if(current&&current.cells&&current.cells.length){let idx=shipDefs.findIndex(s=>s.id===current.id);if(idx>=0)shipDefs[idx]=current;else shipDefs.push(current);saveShips()}let pack={version:VERSION_0719,folder:'SHIPS',playerShips:playerShipSprites().map(cloneShipSprite),botShips:botShipSprites().map(cloneShipSprite),defaultPlayerShipId:localStorage.getItem('warheads.playerShip')||''};$('shipJson').value=JSON.stringify(pack,null,2);downloadJsonFile('SHIPS/WarHeads-SHIPS-v0.7.30-'+Date.now()+'.json',pack);$('shipStatus').textContent='Exported SHIPS library JSON. Place/share it from the SHIPS folder.';toast('SHIPS library exported.',1400)}
  openShipEditor = function(){installShipManagerPanel();shipPainting=false;let saved=savedPlayerShip(0)||playerShipSprites()[0]||{id:'ship-'+Date.now(),name:'My Ship',w:16,h:16,cells:makeRandomShipCells(),userMade:true,custom:true};loadShipEditor(saved);$('shipLab').classList.add('open')}
  // Re-wire ship buttons safely after the original handlers.
  setTimeout(()=>{try{installShipManagerPanel();if($('shipSave'))$('shipSave').onclick=saveShipFromEditor;if($('shipExport'))$('shipExport').onclick=exportShipsFromEditor;if($('shipNew'))$('shipNew').onclick=()=>loadShipEditor({id:'ship-'+Date.now(),name:'My Ship',w:16,h:16,cells:[],userMade:true,botMade:false,custom:true});if($('shipRandom'))$('shipRandom').onclick=()=>loadShipEditor({id:'ship-'+Date.now(),name:'Random Ship',w:16,h:16,cells:makeRandomShipCells(),userMade:true,botMade:false,custom:true});if($('shipLoadJson'))$('shipLoadJson').onclick=()=>{try{let data=JSON.parse($('shipJson').value);let arr=Array.isArray(data)?data:[...(data.playerShips||[]),...(data.botShips||[])];if(arr.length){shipDefs=[...shipDefs.filter(s=>!s.userMade&&!s.botMade),...arr.map(normShipSprite)];saveShips();renderShipLibraryList();loadShipEditor(playerShipSprites()[0]||botShipSprites()[0]||{cells:[]});toast('Ship JSON library loaded.')}else loadShipEditor(normShipSprite({...data,userMade:!data.botMade,custom:true}))}catch(e){toast('Invalid ship JSON.')}};}catch(e){console.warn('ship manager install failed',e)}},0);

  function populateShipAssignmentDropdowns(){let opts=shipOptionHtml();['botShipDefault','botShip1','botShip2','botShip3','botShip4','botShip5','botShip6','botShip7','botShip8','localHumanShip1','localHumanShip2','localHumanShip3','localHumanShip4'].forEach(id=>{let el=$(id);if(el){let old=el.value||localStorage.getItem('warheads.'+id)||'random';el.innerHTML=opts;el.value=old;if(!el.value)el.value='random';el.onchange=()=>localStorage.setItem('warheads.'+id,el.value)}})}
  function installLanShipAssignmentUI(){let panel=$('localLanPanel');if(!panel||$('localHumanShips'))return;let block=document.createElement('div');block.id='localHumanShips';block.className='localShipBlock';block.innerHTML='<div class="wide">Local Player Ships</div><label>Player 1 Ship <select id="localHumanShip1"></select></label><label>Player 2 Ship <select id="localHumanShip2"></select></label><label>Player 3 Ship <select id="localHumanShip3"></select></label><label>Player 4 Ship <select id="localHumanShip4"></select></label><div class="wide">Bot Ships</div><label>Default Bot Ship <select id="botShipDefault"></select></label><label>Bot 1 Ship <select id="botShip1"></select></label><label>Bot 2 Ship <select id="botShip2"></select></label><label>Bot 3 Ship <select id="botShip3"></select></label><label>Bot 4 Ship <select id="botShip4"></select></label><label>Bot 5 Ship <select id="botShip5"></select></label><label>Bot 6 Ship <select id="botShip6"></select></label><label>Bot 7 Ship <select id="botShip7"></select></label><label>Bot 8 Ship <select id="botShip8"></select></label>';let start=$('localStart');if(start)start.insertAdjacentElement('beforebegin',block);else panel.appendChild(block);populateShipAssignmentDropdowns()}
  function syncLanShipVisibility(){let h=parseInt($('localHumans')?.value||'1',10),b=parseInt($('localBots')?.value||'1',10);['localHumanShip1','localHumanShip2','localHumanShip3','localHumanShip4'].forEach((id,i)=>{let e=$(id);if(e&&e.parentElement)e.parentElement.style.display=i<h?'grid':'none'});['botShip1','botShip2','botShip3','botShip4','botShip5','botShip6','botShip7','botShip8'].forEach((id,i)=>{let e=$(id);if(e&&e.parentElement)e.parentElement.style.display=i<b?'grid':'none'})}
  setTimeout(()=>{installLanShipAssignmentUI();syncLanShipVisibility();if($('localHumans'))$('localHumans').addEventListener('change',syncLanShipVisibility);if($('localBots'))$('localBots').addEventListener('change',syncLanShipVisibility)},0);

  newMatch = function(){
    if(matchMode==='local'){
      settings.localHumans=clamp(parseInt($('localHumans')?.value||settings.localHumans||1,10),0,4);
      settings.localBots=clamp(parseInt($('localBots')?.value||settings.localBots||1,10),0,8);
      settings.players=clamp(settings.localHumans+settings.localBots,2,12);
      settings.turnLength=clamp(parseInt($('localTurn')?.value||settings.turnLength||120,10),20,120);
      settings.physics=$('localPhysics')?.value||settings.physics||'bounce';
    }else if(!weaponTestMode){settings.players=clamp(parseInt(ui.menuPlayers.value||8,10),2,8);settings.turnLength=clamp(parseInt(ui.menuTurn.value||120,10),20,120);settings.physics=ui.menuPhysics.value||'bounce';}else{settings.players=2;settings.turnLength=120;settings.physics='bounce';}
    settings.playerPackChoice=(ui.menuPlayerPack&&ui.menuPlayerPack.value)||settings.playerPackChoice||'gold';settings.packMode=settings.playerPackChoice;localStorage.setItem('warheads.playerPackChoice',settings.playerPackChoice);settings.addSavedPack=!ui.menuUsePack||ui.menuUsePack.value!=='no';weaponDefs=loadWeapons();readUfoOptions();applyAimArcOptions();settings.ufoMax=clamp(parseInt(ui.menuUfoMax.value||3,10),1,5);settings.bossChance=clamp(+ui.menuBossChance.value||0,0,.35);
    world.w=(+modSettings.worldWidthBase||2800)+settings.players*(+modSettings.worldWidthPerPlayer||560);world.h=(+modSettings.worldHeightBase||1800)+settings.players*(+modSettings.worldHeightPerPlayer||300);planets=[];
    let anchors=[];for(let i=0;i<settings.players;i++){let a=i/settings.players*Math.PI*2-Math.PI*.08,rx=world.w*.35,ry=world.h*.30,r=rand(210,380);let ap=makeInitialPlanet(world.w/2+Math.cos(a)*rx,world.h/2+Math.sin(a)*ry,r,'planet');if(!ap)ap=makePlanet(world.w/2+Math.cos(a)*rx,world.h/2+Math.sin(a)*ry,r,true,'planet');anchors.push(ap)}
    let planetTarget=Math.min(planetCap()-1,9+settings.players*4),guard=0;while(planets.length<planetTarget&&guard++<260){let meteor=Math.random()<.38,r=meteor?rand(75,210):rand(130,380);makeInitialPlanet(null,null,r,meteor?'meteor':'planet')}
    ships=[];playerWeapons=[];let colors=['#66d9ff','#ff7b66','#ffd15f','#b9ffd4','#cba6ff','#79e39d','#ff86cf','#ffffff'];let localHumans=matchMode==='local'?clamp(settings.localHumans||0,0,4):1;
    for(let i=0;i<settings.players;i++){let botIndex=Math.max(0,i-localHumans),isAi=matchMode==='local'?i>=localHumans:i>0;playerWeapons[i]=isAi?makeBotLoadoutForSlot(botIndex):makeHumanLoadoutForSlot(i);let humanName=matchMode==='local'?`Player ${i+1}`:'Player',botName=matchMode==='local'?`Bot ${botIndex+1}`:`Bot ${i}`;let s={hp:MAX_HEALTH,maxHp:MAX_HEALTH,color:colors[i%colors.length],defense:defenses[i%defenses.length].id,defenseBroken:false,defenseHp:1,defenseFreshTurn:-1,name:isAi?botName:humanName,ai:isAi,whiteoutUsed:false,vx:0,vy:0,lost:0,lostStartedAt:0,lostGrace:0,sprite:(isAi?chooseBotSprite(botIndex):choosePlayerSprite(i)),deathAnnounced:false};ships.push(s);let p=anchors[i%anchors.length],desired=Math.atan2(p.y-world.h/2,p.x-world.w/2);placeShip(s,p,safeShipAngle(p,desired))}
    resetAllDefenses();shots=[];particles=[];beams=[];walkers=[];debris=[];ufos=[];boss=null;magnetFields=[];turn=0;turnCount=0;nextUfoAt=scheduleUfo();busy=false;ended=false;selected=0;defenseIndex=0;roundLeft=settings.turnLength;lastDamage=Array(settings.players).fill(0);roundDamage=Array(settings.players).fill(0);pendingDamage=Array(settings.players).fill(0);pendingDeathNotices=[];pendingTurnFinishAt=0;endPauseActive=false;turnStartHp=ships.map(s=>s.hp);damageFloaters=[];wind=rand(-.012,.012);if(ui.centerBanner){clearTimeout(showCenter.t);ui.centerBanner.classList.remove('show','gameover')}fitCameraToShips();focusTurnCamera(true);if(isMobileViewport()){cam.x=world.w/2;cam.y=world.h/2;cam.z=fullPlayfieldZoom();cam.target=null}renderWeaponSelect();syncUI();toast(matchMode==='local'?'Local turn-based match ready.':'Clean spawn. Aim, fire, survive.');if(ships[turn]?.ai)setTimeout(()=>shoot(true),900);
  };

  // Ensure buttons use final safe handlers.
  setTimeout(()=>{try{if($('menuShipEditor'))$('menuShipEditor').onclick=()=>{clearGameSession();setGameLoaded(false);showMenuPanel(null);ui.menu.classList.add('hidden');openShipEditor()};if($('menuLan'))$('menuLan').onclick=()=>{openLocalLanSetup();installLanShipAssignmentUI();populateShipAssignmentDropdowns();syncLanShipVisibility();};if($('versionText'))$('versionText').textContent=VERSION_0719;}catch(e){console.warn('v0.7.30 final hook failed',e)}},0);
})();

WCE716_installCleanRecovery();

addEventListener('resize',resize);resize();if(ui.menuPlayerPack){ui.menuPlayerPack.value=settings.playerPackChoice||'gold';ui.menuPlayerPack.onchange=()=>{settings.playerPackChoice=ui.menuPlayerPack.value;settings.packMode=settings.playerPackChoice;localStorage.setItem('warheads.playerPackChoice',settings.playerPackChoice);if(!ships.length){playerWeapons[0]=makeSelectedPlayerLoadout();selected=0;renderWeaponSelect();}}}renderWeaponSelect();setGameLoaded(false);requestAnimationFrame(loop);


/* v0.7.30 sci-fi visuals + mod menu cleanup + chunk planet damage */
(function WCE718_visualModPass(){
  const V='v0.7.30';
  try{
    if(typeof WCE_VERSION!=='undefined') window.WCE_VERSION=V;
    const vt=document.getElementById('versionText'); if(vt) vt.textContent=V;
  }catch(e){}
  function safe$(id){return document.getElementById(id)}
  function addHoloTheme(){
    try{
      const sel=safe$('menuUiTheme');
      if(sel && ![...sel.options].some(o=>o.value==='theme-holo-blue')){
        const opt=document.createElement('option'); opt.value='theme-holo-blue'; opt.textContent='Holo Blue Arsenal'; sel.insertBefore(opt, sel.firstChild);
      }
      if(sel){
        [...sel.options].filter(o=>o.value==='theme-custom').forEach(o=>o.remove());
        if(!localStorage.getItem('warheads.uiTheme')){ sel.value='theme-holo-blue'; localStorage.setItem('warheads.uiTheme','theme-holo-blue'); }
        else sel.value=localStorage.getItem('warheads.uiTheme');
        const old=sel.onchange;
        sel.onchange=function(){
          const classes=['theme-holo-blue','theme-deep-blue','theme-classic-green','theme-nebula-purple','theme-alien-amber','theme-crimson-alert','theme-ice-terminal','theme-retro-gold','theme-stealth-gray','theme-plasma-pink','theme-ocean-cyan','theme-custom'];
          classes.forEach(c=>document.body.classList.remove(c));
          document.body.classList.add(sel.value||'theme-holo-blue'); localStorage.setItem('warheads.uiTheme',sel.value||'theme-holo-blue');
          try{ if(old && old!==sel.onchange) old.call(sel); }catch(e){}
        };
        sel.onchange();
      }
      const color=safe$('menuUiColor'); if(color && color.parentElement) color.parentElement.remove();
      const note=document.querySelector('#uiThemeBlock .uiNote'); if(note) note.textContent='UI Style: choose a full menu skin. Holo Blue Arsenal is the new graphical sci-fi style; classic ANSI styles stay available.';
    }catch(e){console.warn('theme patch failed',e)}
  }
  function cleanInGameCopy(){
    document.querySelectorAll('.advancedNote').forEach(n=>{
      if((n.textContent||'').includes('Defaults preserve') || (n.textContent||'').includes('local modding')) n.textContent='Quick how-to: hover any setting for help, move sliders to tune the game, then Apply / Save. Use ADVANCED JSON for exact edits, Export to share presets, or Reset to restore defaults.';
      if((n.textContent||'').includes('Browser security')) n.textContent='Asset folders used by WarHeads. Put hosted/custom files in the matching folder, register them here, then reference them from your presets.';
    });
    document.querySelectorAll('.menuNote').forEach(n=>{
      if((n.textContent||'').includes('expect bigger booms') || (n.textContent||'').includes('Super Early')) n.innerHTML='WarHeads Classic Enhanced '+V+' &nbsp;|&nbsp; Developed By: Elemental Spark &nbsp;|&nbsp; <a href="https://www.elementalspark.com" target="_blank" rel="noopener">www.elementalspark.com</a>';
    });
  }
  const ADV_HELP={
    advMaxHealth:'Maximum hull/ship health for new matches.', advAbsorbHits:'How many shots Absorb defense can eat before it breaks.', advFireDelay:'Delay after pressing FIRE so insults and charge-up can play.', advPostShotPause:'Pause after a shot finishes before the turn changes.', advBotProcWeapons:'How many extra procedural weapons each bot receives.', advBotMutationChance:'Chance for bots to modify/mutate weapons into ridiculous variants.', advStageCountCap:'Upper limit for stage counts, split counts, pellets and repeats.', advStageDamageCap:'Upper limit for per-stage damage in editors.', advStageRadiusCap:'Upper limit for per-stage radius/terrain bite size.',
    advSoftHoming:'Global soft homing applied to shots. Higher values pull more toward nearest enemy.', advGravityStrength:'Planet gravity multiplier. Larger planets already pull harder because mass scales by size.', advGravityMaxPull:'Maximum gravity force from any single planet each frame.', advMaxShotSpeed:'Maximum speed any shot can reach.', advBounceDamping:'Energy retained when shots bounce on world borders.', advShotMinLife:'Minimum shot lifetime before a shot can be cleaned up.', advShotMaxLife:'Maximum shot lifetime safety limit.',
    advPlanetCapBase:'Base maximum number of planets/chunks allowed.', advPlanetCapPerPlayer:'Extra planet/chunk cap per player.', advPlanetFloorBase:'Minimum planet count before random replacement planets can grow in.', advPlanetFloorPerPlayer:'Extra low-planet threshold per player.', advPlanetFloorMax:'Hard maximum low-planet replacement threshold.', advPlanetDestructionScale:'How strongly weapons chew terrain and break planets apart.', advPlanetBuildScale:'How large planet-building weapons grow or create planets.', advPlanetRepairScale:'How strongly repair/heal planet effects restore terrain.', advPlayfieldMargin:'Safe border margin where planets are clamped inside the playable area.', advWorldWidthBase:'Base match width before adding player scaling.', advWorldHeightBase:'Base match height before adding player scaling.',
    advMaxLiveShots:'Maximum live warheads/projectiles at once.', advWarheadsPerTurn:'Hard cap on total created warheads in one turn.', advWalkersPerTurn:'Maximum walkers created during a single shot turn.', advMaxLiveWalkers:'Maximum walkers alive at once.', advMaxParticles:'Maximum visual particles retained.', advParticleScale:'Particle amount multiplier.', advMaxBeams:'Maximum beam/trail effect segments retained.', advMaxTrailPoints:'Length of each projectile trail.', advHeavySfxCap:'Maximum overlapping heavy explosion sounds.', advLightSfxCap:'Maximum overlapping light/UI/shot sounds.'
  };
  function upgradeAdvancedUI(){
    try{
      const panel=safe$('advancedPanel'); if(!panel) return;
      Object.entries(ADV_HELP).forEach(([id,txt])=>{ const el=safe$(id); if(el){ el.title=txt; const lab=el.closest('label'); if(lab) lab.title=txt; }});
      panel.querySelectorAll('input[type="number"]').forEach(inp=>{
        if(inp.dataset.wce718Slider) return;
        inp.dataset.wce718Slider='1';
        try{ inp.type='range'; }catch(e){}
        let val=document.createElement('span'); val.className='advSliderValue'; val.textContent=inp.value;
        inp.insertAdjacentElement('afterend',val);
        inp.addEventListener('input',()=>{val.textContent=inp.value;});
      });
      if(!safe$('advancedJsonPanel')){
        const box=document.createElement('div'); box.id='advancedJsonPanel'; box.className='advancedJsonPanel';
        box.innerHTML='<b>Advanced JSON</b><div class="advancedNote">Exact preset editing. Paste or tweak JSON, then Apply JSON.</div><textarea id="advancedJsonText" spellcheck="false"></textarea><div class="miniButtons"><button type="button" id="advancedJsonRefresh">Refresh JSON</button><button type="button" id="advancedJsonApply">Apply JSON</button></div>';
        const save=safe$('advancedSave'); if(save) save.insertAdjacentElement('beforebegin',box); else panel.appendChild(box);
      }
      if(!safe$('advancedJsonToggle')){
        const b=document.createElement('button'); b.type='button'; b.id='advancedJsonToggle'; b.textContent='ADVANCED JSON';
        const tabs=panel.querySelector('.advancedTabs'); if(tabs) tabs.insertAdjacentElement('afterend',b);
      }
      const refresh=()=>{ try{ if(typeof readAdvancedOptions==='function') readAdvancedOptions(); safe$('advancedJsonText').value=JSON.stringify((typeof modSettings==='object'?modSettings:{}),null,2); }catch(e){} };
      if(safe$('advancedJsonToggle')) safe$('advancedJsonToggle').onclick=()=>{ safe$('advancedJsonPanel').classList.toggle('open'); refresh(); };
      if(safe$('advancedJsonRefresh')) safe$('advancedJsonRefresh').onclick=refresh;
      if(safe$('advancedJsonApply')) safe$('advancedJsonApply').onclick=()=>{ try{ const data=JSON.parse(safe$('advancedJsonText').value||'{}'); if(typeof DEFAULT_MOD_SETTINGS==='object') modSettings={...DEFAULT_MOD_SETTINGS,...data}; else modSettings=data; if(typeof applyModSettings==='function') applyModSettings(); if(typeof saveModSettings==='function') saveModSettings(); if(typeof fillAdvancedOptions==='function') fillAdvancedOptions(); upgradeAdvancedUI(); toast('Advanced JSON applied.',1300); }catch(e){ toast('Invalid Advanced JSON.',1500); } };
    }catch(e){console.warn('advanced ui patch failed',e)}
  }

  // Planet carve / chunk system: round bites, smooth growth, chunky breakup.
  function WCE718_insideHole(p,x,y){ return !!(p&&p.holes&&p.holes.some(h=>!h.dead && Math.hypot(x-h.x,y-h.y) < h.r)); }
  const _wceOldHitPlanet = (typeof hitPlanet==='function') ? hitPlanet : null;
  hitPlanet = function(x,y){
    for(const p of planets){ if(!p||p.dead) continue; const a=Math.atan2(y-p.y,x-p.x), d=Math.hypot(p.x-x,p.y-y); if(d<planetRadiusAt(p,a) && !WCE718_insideHole(p,x,y)) return p; }
    return null;
  };
  const _oldMakePlanet = (typeof makePlanet==='function') ? makePlanet : null;
  makePlanet = function(x=rand(250,world.w-250),y=rand(250,world.h-250),r=rand(90,260),force=false,kind=null){
    const p=_oldMakePlanet(x,y,r,force,kind); if(p){ p.holes=p.holes||[]; p.growStart=performance.now(); p.growMs=p.growMs||900; p.growFrom=p.growFrom||Math.max(10,p.r*.12); p.mass=(p.r*p.r); } return p;
  };
  const _oldDrawPixelPlanet = (typeof drawPixelPlanet==='function') ? drawPixelPlanet : null;
  drawPixelPlanet = function(p,q,r){
    if(!_oldDrawPixelPlanet) return;
    const now=performance.now();
    const grow=p.growStart?clamp((now-p.growStart)/(p.growMs||900),0,1):1;
    const ease=grow<1?(1-Math.pow(1-grow,3)):1;
    const oldR=p.r;
    if(grow<1){ p.r=(p.growFrom||oldR*.15)+(oldR-(p.growFrom||oldR*.15))*ease; q=toScreen(p); r=p.r*cam.z; }
    _oldDrawPixelPlanet(p,q,r);
    if(grow<1) p.r=oldR;
    if(p.holes&&p.holes.length){
      ctx.save();
      ctx.globalCompositeOperation='destination-out';
      p.holes.forEach(h=>{ const hq=toScreen({x:h.x,y:h.y}); ctx.beginPath(); ctx.arc(hq.x,hq.y,Math.max(2,h.r*cam.z),0,Math.PI*2); ctx.fill(); });
      ctx.globalCompositeOperation='source-over';
      p.holes.slice(-24).forEach(h=>{ const hq=toScreen({x:h.x,y:h.y}); ctx.strokeStyle=h.heat==='napalm'?'rgba(255,128,64,.55)':h.heat==='tunnel'?'rgba(195,120,255,.45)':'rgba(220,230,210,.28)'; ctx.lineWidth=Math.max(1,2*cam.z); ctx.setLineDash([5,7]); ctx.beginPath(); ctx.arc(hq.x,hq.y,Math.max(3,h.r*cam.z),0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]); });
      ctx.restore();
    }
  };
  function WCE718_addHole(p,x,y,r,heat){
    p.holes=p.holes||[]; const a=Math.atan2(y-p.y,x-p.x); const surf=planetRadiusAt(p,a); const d=Math.hypot(x-p.x,y-p.y); if(d>surf+r*.65){ x=p.x+Math.cos(a)*(surf-r*.35); y=p.y+Math.sin(a)*(surf-r*.35); }
    p.holes.push({x,y,r,heat,created:performance.now()}); if(p.holes.length>90) p.holes=p.holes.slice(-90);
    p.integrity=clamp((p.integrity??1)-((r*r)/(Math.max(1,p.r*p.r)))*.62,.02,1);
    p.texture=null;
  }
  function WCE718_breakPlanet(p,heat='burst'){
    if(!p||p.breaking) return; p.breaking=true;
    const oldR=p.r, chunks=oldR>250?5:oldR>160?4:oldR>105?3:0;
    const idx=planets.indexOf(p); if(idx>=0) planets.splice(idx,1);
    if(chunks>0){
      for(let i=0;i<chunks;i++){
        const a=i/chunks*Math.PI*2+rand(-.35,.35), nr=clamp(oldR*rand(.20,.42),42,oldR*.52), dist=oldR*.34+nr*rand(.55,1.2);
        const np=makePlanet(p.x+Math.cos(a)*dist,p.y+Math.sin(a)*dist,nr,true,'meteor');
        if(np){ np.integrity=clamp(.38+Math.random()*.38,.25,.82); np.kind='chunk'; np.growFrom=Math.max(16,nr*.22); np.growMs=rand(650,1200); np.holes=[]; np.bumps=(np.bumps||[]).concat([{a:rand(0,Math.PI*2),off:rand(-.25,.22),w:rand(.7,1.8)}]).slice(-64); }
      }
    }
    try{ spark(p.x,p.y,Math.min(220,oldR*.8),heat==='napalm'?'#ff7b55':'#ffd15f',heat==='napalm'?'napalm':'burst'); shockwave(p.x,p.y,oldR*1.4,heat==='napalm'?'#ff7b55':'#b9ffd4'); }catch(e){}
  }
  fracturePlanetChunk = function(p,a,depth,heat='burst'){
    if(!p) return; const r=clamp(depth*.35,10,Math.max(18,p.r*.38)); const x=p.x+Math.cos(a)*planetRadiusAt(p,a)*.86, y=p.y+Math.sin(a)*planetRadiusAt(p,a)*.86; WCE718_addHole(p,x,y,r,heat); if(p.integrity<.08||p.r<48) WCE718_breakPlanet(p,heat); };
  carvePlanetHit = function(p,x,y,st,w,orbitSafe=false){
    if(!p||p.dead) return false; if(typeof isPlanetBirthSafe==='function' && !isPlanetBirthSafe(p) && st.action!=='build') return false;
    const a=Math.atan2(y-p.y,x-p.x), d=Math.hypot(p.x-x,p.y-y), pr=planetRadiusAt(p,a); if(d>pr+(+st.radius||30)*1.15) return false;
    const scale=clamp(+modSettings.planetDestructionScale||1,.05,8), rad=+st.radius||30, dmg=+st.damage||0;
    const napalm=st.action==='napalm', tunnel=st.action==='dig'||st.action==='splitter';
    let bite=clamp(rad*(napalm?.58:tunnel?.42:.72)*scale + dmg*.10, 5, Math.max(10,p.r*.55)); if(orbitSafe) bite=Math.min(bite,38);
    const bites=clamp(Math.round((rad+dmg*.15)/85),1,5);
    for(let i=0;i<bites;i++){ const ja=rand(0,Math.PI*2), jd=rand(0,bite*.42); WCE718_addHole(p,x+Math.cos(ja)*jd,y+Math.sin(ja)*jd,bite*rand(.55,1.05),napalm?'napalm':tunnel?'tunnel':'burst'); }
    if(napalm){ for(let i=0;i<2;i++){ const aa=a+rand(-.42,.42), rr=pr-rand(bite*.2,bite*.75); WCE718_addHole(p,p.x+Math.cos(aa)*rr,p.y+Math.sin(aa)*rr,bite*rand(.28,.5),'napalm'); } }
    if((p.integrity<.065 && p.r>70) || (bite>p.r*.42 && dmg>90)) WCE718_breakPlanet(p,napalm?'napalm':tunnel?'tunnel':'burst');
    return true;
  };
  const _oldMaintain = (typeof maintainPlanets==='function') ? maintainPlanets : null;
  maintainPlanets = function(){
    const cap=planetCap(), min=planetFloor();
    planets=planets.filter(p=>!p.dead && p.r>30 && (p.integrity??1)>.015).slice(0,cap+10);
    if(!busy && planets.length<min){
      const need=Math.min(min-planets.length,1);
      for(let i=0;i<need;i++){ const spot=randomPlanetSpot(rand(120,300)); const p=makePlanet(spot.x,spot.y,spot.r,true,Math.random()<.36?'meteor':'planet'); if(p){p.growFrom=12;p.growMs=1200;} }
    }
  };

  setTimeout(()=>{ addHoloTheme(); cleanInGameCopy(); upgradeAdvancedUI(); try{ if(typeof fillAdvancedOptions==='function'){ const oldFill=fillAdvancedOptions; fillAdvancedOptions=function(){ oldFill(); setTimeout(upgradeAdvancedUI,0); }; } }catch(e){} },0);
})();



/* v0.7.30 release-candidate UI/bot-config/icon/filename fix */
(function WCE719_releaseCandidateUiFix(){
  const V='v0.7.30';
  function el(id){return document.getElementById(id)}
  function removeThemeClasses(){
    const cls=['theme-holo-blue','theme-deep-blue','theme-classic-green','theme-nebula-purple','theme-alien-amber','theme-crimson-alert','theme-ice-terminal','theme-retro-gold','theme-stealth-gray','theme-plasma-pink','theme-ocean-cyan','theme-custom'];
    cls.forEach(c=>document.body.classList.remove(c));
  }
  function applyThemeEverywhere(){
    try{
      const sel=el('menuUiTheme');
      if(sel && ![...sel.options].some(o=>o.value==='theme-holo-blue')){
        const opt=document.createElement('option'); opt.value='theme-holo-blue'; opt.textContent='Holo Blue Arsenal'; sel.insertBefore(opt, sel.firstChild);
      }
      if(sel){ [...sel.options].filter(o=>o.value==='theme-custom').forEach(o=>o.remove()); }
      const theme=(sel&&sel.value)||localStorage.getItem('warheads.uiTheme')||'theme-holo-blue';
      removeThemeClasses(); document.body.classList.add(theme); localStorage.setItem('warheads.uiTheme',theme);
      if(el('versionText')) el('versionText').textContent=V;
      document.querySelectorAll('select').forEach(s=>{ s.dataset.wce719Styled='1'; });
      document.querySelectorAll('.advancedTabs button').forEach(b=>b.addEventListener('click',()=>setTimeout(applySelectedHighlights,0),{once:false}));
      applySelectedHighlights();
    }catch(e){console.warn('v0.7.30 theme apply failed',e)}
  }
  function applySelectedHighlights(){
    try{
      document.querySelectorAll('.advancedTabs button').forEach(b=>b.classList.toggle('selected',b.classList.contains('active')));
      document.querySelectorAll('.typeButtons button').forEach(b=>b.classList.toggle('selected',b.classList.contains('active')));
      document.querySelectorAll('select').forEach(s=>{ if(s.value) s.classList.add('hasValue'); });
    }catch(e){}
  }
  function ensureBotConfigPanel(){
    try{
      if(!el('botPackLab')){
        const botLab=document.createElement('section'); botLab.className='lab'; botLab.id='botPackLab';
        botLab.innerHTML='<button class="panelX alwaysClose" id="botPackLabX" type="button">X</button><div class="row"><b>Bot Pack Setup</b><div><button id="botPackLabClose">Close</button></div></div><div class="labBody"><div class="packNote">Assign bot packs, difficulty, and LAN-related bot settings from here.</div><div id="botPackLabBody"></div></div>';
        document.getElementById('app').appendChild(botLab);
      }
      let grid=el('botPackGrid');
      if(grid && el('botPackLabBody') && grid.parentElement!==el('botPackLabBody')) el('botPackLabBody').appendChild(grid);
      if(!el('openBotPackEditor') && el('optionsAdvanced')){
        const b=document.createElement('button'); b.id='openBotPackEditor'; b.type='button'; b.textContent='BOT CONFIG'; b.className='primary';
        el('optionsAdvanced').insertAdjacentElement('beforebegin',b);
      } else if(el('openBotPackEditor')) {
        el('openBotPackEditor').textContent='BOT CONFIG';
      }
      const open=()=>{
        try{ if(typeof WCE716_populateLocalPackDropdowns==='function') WCE716_populateLocalPackDropdowns(); }catch(e){}
        try{ if(typeof populateShipAssignmentDropdowns==='function') populateShipAssignmentDropdowns(); }catch(e){}
        const lab=el('botPackLab'); if(lab){ lab.classList.add('open'); lab.style.display='grid'; lab.scrollTop=0; }
        applyThemeEverywhere();
      };
      if(el('openBotPackEditor')) el('openBotPackEditor').onclick=open;
      if(el('localOpenBotPacks')) el('localOpenBotPacks').onclick=open;
      ['botPackLabX','botPackLabClose'].forEach(id=>{ if(el(id)) el(id).onclick=()=>{ const lab=el('botPackLab'); if(lab){ lab.classList.remove('open'); lab.style.display=''; } }; });
    }catch(e){console.warn('v0.7.30 bot config repair failed',e)}
  }
  function patchThemeControl(){
    try{
      const sel=el('menuUiTheme');
      if(sel){
        if(!sel.value) sel.value=localStorage.getItem('warheads.uiTheme')||'theme-holo-blue';
        sel.onchange=applyThemeEverywhere;
      }
      const color=el('menuUiColor'); if(color && color.parentElement) color.parentElement.remove();
    }catch(e){}
  }
  function patchModalOpeners(){
    try{
      const oldOptions=el('menuOptions')?.onclick;
      if(el('menuOptions')) el('menuOptions').onclick=function(ev){ if(oldOptions) oldOptions.call(this,ev); setTimeout(()=>{ensureBotConfigPanel(); patchThemeControl(); applyThemeEverywhere();},0); };
      const oldLan=el('menuLan')?.onclick;
      if(el('menuLan')) el('menuLan').onclick=function(ev){ if(oldLan) oldLan.call(this,ev); setTimeout(()=>{ensureBotConfigPanel(); applyThemeEverywhere();},0); };
    }catch(e){}
  }
  setTimeout(()=>{
    try{
      document.title='WarHeads Classic Enhanced';
      ensureBotConfigPanel(); patchThemeControl(); patchModalOpeners(); applyThemeEverywhere();
      const note=document.querySelector('.gameCredit');
      if(note) note.innerHTML='WarHeads Classic Enhanced '+V+' &nbsp;|&nbsp; Developed By: Elemental Spark &nbsp;|&nbsp; <a href="https://www.elementalspark.com" target="_blank" rel="noopener">www.elementalspark.com</a>';
    }catch(e){console.warn('v0.7.30 install failed',e)}
  },0);
})();



/* v0.7.30 in-game weapon selection/editor hotfix
   Keeps the selected weapon per player stable:
   - pack default is used only for that player's first shot
   - after firing/changing, that player's last-used weapon is restored on later turns
   - editing/saving during a game edits the currently selected weapon and equips it back to that player
*/
(function WCE721_weaponTurnMemoryHotfix(){
  const V='v0.7.30';
  let weaponEditorOwnerSlot=0;

  function setVersionLabel(){
    try{ if($('versionText')) $('versionText').textContent=V; }catch(e){}
    try{
      const note=document.querySelector('.gameCredit');
      if(note) note.innerHTML='WarHeads Classic Enhanced '+V+' &nbsp;|&nbsp; Developed By: Elemental Spark &nbsp;|&nbsp; <a href="https://www.elementalspark.com" target="_blank" rel="noopener">www.elementalspark.com</a>';
    }catch(e){}
  }

  function aliveLoadout(slot){
    if(!Array.isArray(playerWeapons[slot]) || !playerWeapons[slot].length){
      playerWeapons[slot]=ships[slot]?.ai ? makeBotLoadout() : makeSelectedPlayerLoadout();
    }
    return playerWeapons[slot] || [];
  }

  function findWeaponIndexById(load,id){
    if(!id || !Array.isArray(load)) return -1;
    return load.findIndex(w=>w && w.id===id);
  }

  function selectWeaponForSlot(slot, forceDefault=false){
    const load=aliveLoadout(slot);
    if(!load.length){ selected=0; return 0; }
    const ship=ships[slot];
    let desiredId='';
    if(ship){
      if(!ship.hasFiredWeapon && forceDefault) desiredId=ship.defaultWeaponId || load[0]?.id || '';
      else desiredId=ship.lastWeaponId || ship.defaultWeaponId || load[0]?.id || '';
    }else{
      desiredId=localStorage.getItem('warheads.lastWeaponId') || load[0]?.id || '';
    }
    let idx=findWeaponIndexById(load,desiredId);
    if(idx<0) idx=0;
    if(slot===turn || !ships.length){
      selected=clamp(idx,0,Math.max(0,load.length-1));
      if(ui.weaponSelect) ui.weaponSelect.value=String(selected);
    }
    return idx;
  }

  function selectWeaponForCurrentTurn(forceDefault=false){
    return selectWeaponForSlot(turn, forceDefault);
  }

  function recordWeaponChoiceForSlot(slot, weaponOrIndex){
    const load=aliveLoadout(slot);
    let idx=(typeof weaponOrIndex==='number') ? weaponOrIndex : findWeaponIndexById(load, weaponOrIndex?.id);
    idx=clamp(idx,0,Math.max(0,load.length-1));
    const w=load[idx];
    if(w && ships[slot]){
      ships[slot].lastWeaponId=w.id;
      ships[slot].hasFiredWeapon=true;
      localStorage.setItem('warheads.lastWeaponId', w.id);
    }
    if(slot===turn){ selected=idx; if(ui.weaponSelect) ui.weaponSelect.value=String(selected); }
    return w;
  }

  function initWeaponMemoryForMatch(){
    try{
      ships.forEach((s,i)=>{
        const load=aliveLoadout(i);
        if(!s) return;
        s.defaultWeaponId=s.defaultWeaponId || load[0]?.id || '';
        s.lastWeaponId=s.lastWeaponId || '';
        s.hasFiredWeapon=!!s.hasFiredWeapon;
      });
      selectWeaponForCurrentTurn(true);
    }catch(e){ console.warn('v0.7.30 weapon memory init failed',e); }
  }

  const _WCE721_newMatch = newMatch;
  newMatch = function(){
    _WCE721_newMatch();
    initWeaponMemoryForMatch();
    renderWeaponSelect();
    syncUI();
  };

  renderWeaponSelect = function(){
    const load=(ships.length?currentLoadout():(playerWeapons[0]||makeSelectedPlayerLoadout()));
    if(!playerWeapons[0] && !ships.length) playerWeapons[0]=load;
    selected=clamp(selected,0,Math.max(0,load.length-1));
    if(!ui.weaponSelect) return;
    ui.weaponSelect.innerHTML='';
    load.forEach((w,i)=>{let o=document.createElement('option');o.value=String(i);o.textContent=w.name;ui.weaponSelect.appendChild(o)});
    ui.weaponSelect.value=String(selected);
  };

  if(ui.weaponSelect){
    ui.weaponSelect.onchange=()=>{
      selected=clamp(+ui.weaponSelect.value||0,0,Math.max(0,currentLoadout().length-1));
      if(ships.length && ships[turn] && !ships[turn].ai) recordWeaponChoiceForSlot(turn, selected);
      else {
        const w=currentLoadout()[selected];
        if(w) localStorage.setItem('warheads.lastWeaponId', w.id);
      }
      syncUI();
    };
  }

  finishTurn = function(){
    if(ended)return;
    shots=[];busy=false;maintainPlanets();activeShotOwner=-1;turnWarheadsCreated=0;turnWalkersCreated=0;pendingTurnFinishAt=0;endPauseActive=false;
    let alive=ships.filter(s=>s.hp>0);
    if((matchMode!=='local'&&ships[0].hp<=0)||alive.length<=1){
      ended=true;
      let winner=alive.length?alive.slice().sort((a,b)=>b.hp-a.hp)[0]:null,
          title=winner?`${winner.name} wins!`:'No survivors',
          sub=winner?`Match over. ${winner.name} is the last ship standing.`:'Match over. Everyone got vaporized.';
      showCenter(title,sub,'gameover');toast(title,2600);syncUI();return;
    }
    do{turn=(turn+1)%ships.length}while(ships[turn].hp<=0);
    turnCount++;roundLeft=settings.turnLength;lastTick=performance.now();resetAllDefenses();defenseIndex=Math.max(0,defenses.findIndex(d=>d.id===ships[turn].defense));
    pendingDamage=Array(ships.length).fill(0);pendingDeathNotices=[];turnStartHp=ships.map(s=>s.hp);
    selectWeaponForCurrentTurn(false);
    if(!ships[turn].ai)renderWeaponSelect();
    focusTurnCamera(false);syncUI();
    if(ships[turn].ai)setTimeout(()=>shoot(true),900);
  };

  launchShot = function(){
    let s=ships[turn];if(!s||s.hp<=0){busy=false;return}
    let load=currentLoadout(),target=chooseTarget(turn),ang=clamp((+ui.angle.value)*Math.PI/180,(settings.aimArcMin||0)*Math.PI/180,(settings.aimArcMax||180)*Math.PI/180),pow=(+ui.power.value),weaponIndex=clamp(selected,0,Math.max(0,load.length-1)),w=load[weaponIndex]||load[0]||weaponDefs[0];
    pendingDamage=Array(ships.length).fill(0);pendingDeathNotices=[];pendingTurnFinishAt=0;endPauseActive=false;turnStartHp=ships.map(s=>s.hp);
    if(s.ai&&target){
      let blocked=lineBlocker(s,target),ownBlocked=rayHitsPlanet(s,target,s.planet,.02,.42),aim=blocked?blocked:target,dx=aim.x-s.x,dy=aim.y-s.y,adx=Math.max(1,Math.abs(dx)),elev=clamp(Math.atan2(Math.max(55,-dy)+Math.abs(dy)*.24,adx)+rand(-.14,.22),.18,Math.PI*.49);
      ang=dx<0?Math.PI-elev:elev;
      if(ownBlocked||shotWouldHitOwnPlanet(s,ang,260))ang=saferBotAngle(s,ang,target);
      pow=clamp(adx/11+Math.abs(dy)/25+rand(blocked?14:-2,blocked?36:26)+(ownBlocked?16:0),42,150);
      weaponIndex=(s.queuedBotWeapon!=null&&!blocked&&!ownBlocked&&!isSniperOnlyWeapon(load[clamp(s.queuedBotWeapon,0,Math.max(0,load.length-1))]))?clamp(s.queuedBotWeapon,0,Math.max(0,load.length-1)):chooseBotWeaponIndex(load,!!blocked,ownBlocked,s.lastBotWeaponIndex);
      s.queuedBotWeapon=null;w=load[weaponIndex]||nonSniperPool(load)[0]?.w||load[0]||weaponDefs[0];s.lastBotWeaponIndex=weaponIndex;
      if(blocked)toast(`${s.name} is carving a path with ${w.name}.`,900);else if(ownBlocked)toast(`${s.name} is arcing around home terrain with ${w.name}.`,900);else toast(`${s.name} selected ${w.name}.`,900)
    }else{
      recordWeaponChoiceForSlot(turn, weaponIndex);
    }
    if(!w){queueFinishTurn(650);return}
    if(w.id==='whiteout'){
      if(s.whiteoutUsed){spark(s.x,s.y,55,'#c8c8c8','smoke');toast('Whiteout fizzled.',900);queueFinishTurn(650);return}
      s.whiteoutUsed=true
    }
    let m=muzzlePoint(s,ang),scale=w.type==='sniper'?clamp((+modSettings.shotPowerScale||.18)*1.22,.05,1):clamp(+modSettings.shotPowerScale||.18,.05,1);
    sfx(shotSfxType(w));
    let fired=addShot({x:m.x,y:m.y,vx:Math.cos(ang)*pow*scale,vy:-Math.sin(ang)*pow*scale,owner:turn,weapon:weaponIndex,color:w.color,trail:[],age:0,wraps:0,sniper:w.type==='sniper',maxLife:SHOT_MAX_LIFE},1);
    if(fired)cam.target=fired;
    syncUI();
  };

  openLab = function(){
    const owner=(inGame&&ships.length&&ships[turn]&&!ships[turn].ai)?turn:0;
    weaponEditorOwnerSlot=owner;
    let load=(inGame&&ships.length?aliveLoadout(owner):(playerWeapons[0]||makeSelectedPlayerLoadout()||weaponDefs));
    if(inGame&&ships.length&&owner===turn) selectWeaponForCurrentTurn(false);
    let w=(inGame&&ships.length&&owner===turn?load[selected]:null) || load[findWeaponIndexById(load,ships[owner]?.lastWeaponId)] || load[selected] || load[0] || weaponDefs[0];
    editing=weaponDefs.findIndex(x=>x.id===w.id);
    if(editing<0){
      weaponDefs.push(normWeapon({...w,playerMade:!!w.playerMade}));
      saveWeapons();weaponDefs=loadWeapons();editing=weaponDefs.findIndex(x=>x.id===w.id);if(editing<0)editing=weaponDefs.length-1;
    }
    ui.lab.classList.add('open');
    loadEditor();
  };

  function saveEditedWeaponAndEquip(){
    let wasInGame=inGame&&ships.length>0;
    let owner=wasInGame?clamp(weaponEditorOwnerSlot,0,Math.max(0,ships.length-1)):0;
    let saved=readEditor(),base=weaponDefs[editing]||null;
    try{
      let j=JSON.parse(ui.weaponJson.value);
      if(j&&j.id&&!defaultWeapons.some(w=>w.id===j.id))saved.id=j.id;
      if(j&&/^#[0-9a-f]{6}$/i.test(j.color||''))saved.color=j.color;
    }catch(e){}
    if(base&&!base.playerMade&&base.id&&defaultWeapons.some(w=>w.id===base.id))saved.id='custom-'+Date.now();
    saved=normWeapon({...saved,playerMade:true});
    saved=equipSavedWeapon(saved);
    addWeaponToCurrentPack(saved);
    saveCurrentPack();
    weaponDefs=loadWeapons();
    refreshSavedWeaponsInPacks(saved);
    editing=weaponDefs.findIndex(x=>x.id===saved.id);
    if(wasInGame){
      playerWeapons[owner]=ensureWeaponInLoadout(aliveLoadout(owner),saved);
      let idx=findWeaponIndexById(playerWeapons[owner],saved.id);
      if(idx<0)idx=playerWeapons[owner].length-1;
      recordWeaponChoiceForSlot(owner, idx);
      if(owner===turn) selected=idx;
    }else{
      if(playerWeapons[0]){
        playerWeapons[0]=ensureWeaponInLoadout(playerWeapons[0],saved);
        selected=Math.max(0,findWeaponIndexById(playerWeapons[0],saved.id));
      }
      localStorage.setItem('warheads.lastWeaponId',saved.id);
    }
    renderWeaponSelect();
    ui.weaponJson.value=JSON.stringify(saved,null,2);
    markWeaponEditorClean();
    ui.saveStatus.textContent=`Saved "${saved.name}" and equipped it.`;
    ui.lab.classList.remove('open');
    if(!wasInGame){
      startWeaponTest(saved);
    }else{
      if(ui.menu)ui.menu.classList.add('hidden');
      toast('Weapon saved, selected, and ready to fire.');
      syncUI();
    }
  }

  function createCustomWeaponTemplate(){
    return normWeapon({id:'custom-'+Date.now(),name:'New Weapon',playerMade:true,stages:Array.from({length:3},(_,i)=>({delay:i*150,action:i?'burst':'explode',radius:26+i*4,damage:10+i*4,count:i?3:1}))});
  }

  setTimeout(()=>{
    setVersionLabel();
    if($('saveWeapon')) $('saveWeapon').onclick=saveEditedWeaponAndEquip;
    if($('labOpen')) $('labOpen').onclick=openLab;
    if($('menuEditor')) $('menuEditor').onclick=()=>{clearGameSession();setGameLoaded(false);showMenuPanel(null);ui.menu.classList.add('hidden');openLab()};
    if($('newWeapon')) $('newWeapon').onclick=()=>{
      let w=createCustomWeaponTemplate();weaponDefs.push(w);saveWeapons();weaponDefs=loadWeapons();editing=weaponDefs.findIndex(x=>x.id===w.id);if(editing<0)editing=weaponDefs.length-1;
      let owner=(inGame&&ships.length&&ships[turn]&&!ships[turn].ai)?turn:0;weaponEditorOwnerSlot=owner;
      if(playerWeapons[owner]){playerWeapons[owner]=ensureWeaponInLoadout(playerWeapons[owner],w);recordWeaponChoiceForSlot(owner,findWeaponIndexById(playerWeapons[owner],w.id));}
      renderWeaponSelect();loadEditor();syncUI();
    };
    if($('cloneWeapon')) $('cloneWeapon').onclick=()=>{
      let source=weaponDefs[editing]||currentLoadout()[selected]||defaultWeapons[0];
      let w=normWeapon({...JSON.parse(JSON.stringify(source)),id:'custom-'+Date.now(),name:(source.name||'Weapon')+' Copy',playerMade:true});
      weaponDefs.push(w);saveWeapons();weaponDefs=loadWeapons();editing=weaponDefs.findIndex(x=>x.id===w.id);if(editing<0)editing=weaponDefs.length-1;
      let owner=(inGame&&ships.length&&ships[turn]&&!ships[turn].ai)?turn:0;weaponEditorOwnerSlot=owner;
      if(playerWeapons[owner]){playerWeapons[owner]=ensureWeaponInLoadout(playerWeapons[owner],w);recordWeaponChoiceForSlot(owner,findWeaponIndexById(playerWeapons[owner],w.id));}
      renderWeaponSelect();loadEditor();syncUI();
    };
    if(ui.weaponSelect){
      ui.weaponSelect.onchange=()=>{
        selected=clamp(+ui.weaponSelect.value||0,0,Math.max(0,currentLoadout().length-1));
        if(ships.length&&ships[turn]&&!ships[turn].ai) recordWeaponChoiceForSlot(turn,selected);
        else {let w=currentLoadout()[selected]; if(w)localStorage.setItem('warheads.lastWeaponId',w.id);}
        syncUI();
      };
    }
    try{initWeaponMemoryForMatch();renderWeaponSelect();syncUI();}catch(e){}
  },0);
})();



/* v0.7.30 terrain/aim/export cleanup hotfix */
(function WCE722_terrainAimExportCleanup(){
  const VERSION='v0.7.30';
  function el(id){return document.getElementById(id)}
  try{
    // Add a real Aim Assist Line toggle into Options without disturbing the existing layout.
    if(!el('menuAimLine') && el('menuAimArc')){
      const lab=document.createElement('label');
      lab.innerHTML='Aim Assist Line <select id="menuAimLine"><option value="on" selected>On</option><option value="off">Off</option></select>';
      const anchor=el('menuAimArc').closest('label');
      if(anchor && anchor.parentNode) anchor.parentNode.insertBefore(lab, anchor.nextSibling);
    }
    settings.showAimAssist = localStorage.getItem('warheads.showAimAssist') !== 'off';
    const aimLine=el('menuAimLine');
    if(aimLine){
      aimLine.value=settings.showAimAssist?'on':'off';
      aimLine.onchange=()=>{settings.showAimAssist=aimLine.value!=='off';localStorage.setItem('warheads.showAimAssist',settings.showAimAssist?'on':'off')};
    }
  }catch(e){console.warn('v0.7.30 aim option init failed',e)}

  // Remove the old angular crater deformation from the silhouette. Real cuts now come from clean round hole masks.
  try{
    const _wce722_oldPlanetRadiusAt = planetRadiusAt;
    planetRadiusAt = function(p,a){
      if(!p) return 0;
      let bump=0;
      try{ bump=(p.bumps||[]).reduce((sum,b)=>sum+Math.cos(a-b.a)*b.off*b.w,0)/Math.max(1,(p.bumps||[]).length)*5; }catch(e){ bump=0; }
      return clamp(p.r*(1+bump), p.r*.30, p.r*1.32);
    };
  }catch(e){console.warn('v0.7.30 planet radius override failed',e)}

  // Hide dotted crater/ring leftovers and replace them with clean cutouts plus a soft scorched rim.
  try{
    const _wce722_oldDrawPixelPlanet = drawPixelPlanet;
    drawPixelPlanet = function(p,q,r){
      _wce722_oldDrawPixelPlanet(p,q,r);
      if(!p || !p.holes || !p.holes.length) return;
      ctx.save();
      const bg='#010402';
      p.holes.slice(-96).forEach(h=>{
        const hq=toScreen({x:h.x,y:h.y});
        const rr=Math.max(2,(h.r||8)*cam.z);
        // Clean cutout, intentionally a hair larger to erase old dotted outlines.
        ctx.globalCompositeOperation='source-over';
        ctx.fillStyle=bg;
        ctx.beginPath();ctx.arc(hq.x,hq.y,rr+Math.max(2,2.5*cam.z),0,Math.PI*2);ctx.fill();
        // Layered scorch/burn edge, solid and subtle rather than dotted.
        const heat=h.heat||'burst';
        const hot=heat==='napalm'?'rgba(255,120,45,.62)':heat==='tunnel'?'rgba(170,105,255,.42)':'rgba(255,190,95,.34)';
        const soot='rgba(0,0,0,.62)';
        ctx.lineCap='round';
        ctx.setLineDash([]);
        ctx.strokeStyle=soot;ctx.lineWidth=Math.max(2,5*cam.z);ctx.beginPath();ctx.arc(hq.x,hq.y,rr+Math.max(1,1.5*cam.z),0,Math.PI*2);ctx.stroke();
        ctx.strokeStyle=hot;ctx.lineWidth=Math.max(1,2.2*cam.z);ctx.beginPath();ctx.arc(hq.x,hq.y,rr+Math.max(1,1.2*cam.z),0,Math.PI*2);ctx.stroke();
      });
      ctx.restore();
    };
  }catch(e){console.warn('v0.7.30 planet draw cleanup failed',e)}

  // Clean build/repair: remove overlapping hole masks in the built/repaired area so terrain grows back cleanly.
  try{
    const _wce722_oldBlast = blast;
    blast = function(x,y,st,w,owner){
      const isBuild=st && st.action==='build';
      _wce722_oldBlast(x,y,st,w,owner);
      if(isBuild){
        const rad=(+st.radius||42)*clamp(+modSettings.planetBuildScale||1,.05,8)*2.4;
        planets.forEach(p=>{ if(p&&p.holes){ p.holes=p.holes.filter(h=>Math.hypot(h.x-x,h.y-y)>rad+(h.r||0)*.55); p.texture=null; }});
      }
    };
  }catch(e){console.warn('v0.7.30 build cleanup failed',e)}

  // Aim line uses the same core forces as real shots: wind, planet gravity, speed cap, wall bounce/wrap, and soft enemy guidance.
  try{
    drawAim = function(){
      if(settings.showAimAssist===false) return;
      const s=ships[turn]||ships[0]; if(!s||s.hp<=0) return;
      const deg=+ui.angle.value||0, ang=deg*Math.PI/180, pow=+ui.power.value||0;
      const load=(typeof currentLoadout==='function')?currentLoadout():weaponDefs;
      const w=load[clamp(selected,0,Math.max(0,load.length-1))]||load[0]||weaponDefs[0]||{};
      const scale=(w.type==='sniper'?1.22:1)*clamp(+modSettings.shotPowerScale||.18,.05,1);
      let m=(typeof muzzlePoint==='function')?muzzlePoint(s,ang):{x:s.x,y:s.y};
      let x=m.x,y=m.y,vx=Math.cos(ang)*pow*scale,vy=-Math.sin(ang)*pow*scale;
      const target=(typeof chooseTarget==='function')?chooseTarget(turn):null;
      ctx.save();
      ctx.setLineDash([7,8]);
      ctx.strokeStyle='rgba(255,220,70,.82)';
      ctx.lineWidth=Math.max(1.5,2.1*cam.z);
      ctx.beginPath();
      let started=false;
      for(let i=0;i<150;i++){
        const q=toScreen({x,y});
        if(started) ctx.lineTo(q.x,q.y); else {ctx.moveTo(q.x,q.y); started=true;}
        if(i%14===0) ansiRect(q.x-2,q.y-2,4,4,'#ffd21a',.55);
        vx += wind;
        if(target){
          const aa=Math.atan2(target.y-y,target.x-x);
          const guide=clamp(+modSettings.softHoming||.034,0,.5)*0.58;
          vx += Math.cos(aa)*guide; vy += Math.sin(aa)*guide;
        }
        planets.forEach(p=>{
          if(!p||p.dead) return;
          const dx=p.x-x,dy=p.y-y,d=Math.max(35,Math.hypot(dx,dy));
          const pull=clamp((p.r*p.r)/(d*d)*clamp(+modSettings.gravityStrength||.22,0,2),0,clamp(+modSettings.gravityMaxPull||.18,0,2));
          vx+=dx/d*pull; vy+=dy/d*pull;
        });
        let sp=Math.hypot(vx,vy), maxSp=clamp(+modSettings.maxShotSpeed||18,4,80);
        if(sp>maxSp){vx=vx/sp*maxSp;vy=vy/sp*maxSp;}
        x+=vx; y+=vy;
        if(settings.physics==='bounce'){
          if(x<0||x>world.w){vx*=-clamp(+modSettings.bounceDamping||.86,.1,1.4);x=clamp(x,0,world.w)}
          if(y<0||y>world.h){vy*=-clamp(+modSettings.bounceDamping||.86,.1,1.4);y=clamp(y,0,world.h)}
        }else{
          if(x<0)x+=world.w; if(x>world.w)x-=world.w; if(y<0)y+=world.h; if(y>world.h)y-=world.h;
        }
        if((typeof hitPlanet==='function'&&hitPlanet(x,y))||(typeof hitShip==='function'&&hitShip(x,y,turn))) break;
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    };
  }catch(e){console.warn('v0.7.30 draw aim override failed',e)}
})();


(function(){
  if(window.WCE_MP_BRIDGE_READY) return;
  window.WCE_MP_BRIDGE_READY = true;
  const qs = new URLSearchParams(location.search);
  const mpMode = qs.get('mp') === '1';
  let mpRoom = null, mpMySlot = -1, mpClientId = '', mpIsHost = false, mpBotTimer = 0;

  function mpParticipants(room){
    if(!room) return [];
    if(Array.isArray(room.participants) && room.participants.length) return room.participants;
    const humans = Array.isArray(room.players) ? room.players.map(p => Object.assign({bot:false}, p)) : [];
    const bots = Array.from({length: Math.max(0, +(room.bots||0))}, (_,i) => ({clientId:'bot-'+i, name:'Bot '+(i+1), slot:humans.length+i, bot:true, ready:true}));
    return humans.concat(bots);
  }
  function mpActive(room){ return mpParticipants(room)[+(room && room.turn || 0)] || null; }
  function canControlMpTurn(){
    const a = mpActive(mpRoom);
    if(!a) return false;
    if(a.bot) return !!mpIsHost;
    return a.clientId === mpClientId;
  }
  function maybeRunHostBotTurn(){
    if(!mpMode || !mpIsHost || !mpRoom || !ships || !ships[turn] || !ships[turn].ai || busy || ended) return;
    clearTimeout(mpBotTimer);
    mpBotTimer = setTimeout(() => { try{ if(ships[turn] && ships[turn].ai && !busy && !ended) shoot(true); }catch(e){ post('error', {message:'Host bot turn failed: '+(e.message||e)}); } }, 850);
  }

  function safeClone(obj){
    try { return JSON.parse(JSON.stringify(obj)); } catch(e){ return null; }
  }
  function post(type, payload){
    try { window.parent && window.parent.postMessage({ source:'WCE_MP_GAME', type, payload: payload || {} }, '*'); } catch(e){}
  }
  function setSelectValue(el, value){
    if(!el) return;
    const exists = [...el.options].some(o => String(o.value) === String(value));
    if(exists) el.value = String(value);
  }
  function waitForGameReady(cb, tries=0){
    if(typeof newMatch === 'function' && typeof shoot === 'function' && typeof finishTurn === 'function') return cb();
    if(tries > 200) return post('error', { message:'Game bridge could not find required game functions.' });
    setTimeout(() => waitForGameReady(cb, tries+1), 50);
  }
  function buildState(){
    return safeClone({
      version: 'v0.7.30-mp-branch',
      turn, turnCount, roundLeft, ended, busy,
      settings,
      ships, planets, shots, walkers, particles, beams, shockwaves, debris, ufos, boss, magnetFields,
      playerWeapons,
      selected, defenseIndex,
      cam
    });
  }
  function applyState(state){
    if(!state) return false;
    try{
      turn = +state.turn || 0;
      if(mpRoom) mpRoom.turn = turn;
      turnCount = +state.turnCount || 0;
      roundLeft = +state.roundLeft || (settings.turnLength || 120);
      ended = !!state.ended;
      busy = !!state.busy;
      if(state.settings) Object.assign(settings, state.settings);
      ships = Array.isArray(state.ships) ? state.ships : ships;
      planets = Array.isArray(state.planets) ? state.planets : planets;
      shots = Array.isArray(state.shots) ? state.shots : [];
      walkers = Array.isArray(state.walkers) ? state.walkers : [];
      particles = Array.isArray(state.particles) ? state.particles : [];
      beams = Array.isArray(state.beams) ? state.beams : [];
      shockwaves = Array.isArray(state.shockwaves) ? state.shockwaves : [];
      debris = Array.isArray(state.debris) ? state.debris : [];
      ufos = Array.isArray(state.ufos) ? state.ufos : [];
      boss = state.boss || null;
      magnetFields = Array.isArray(state.magnetFields) ? state.magnetFields : [];
      playerWeapons = Array.isArray(state.playerWeapons) ? state.playerWeapons : playerWeapons;
      selected = Number.isFinite(+state.selected) ? +state.selected : selected;
      defenseIndex = Number.isFinite(+state.defenseIndex) ? +state.defenseIndex : defenseIndex;
      if(state.cam) Object.assign(cam, state.cam);
      renderWeaponSelect && renderWeaponSelect();
      focusTurnCamera && focusTurnCamera(false);
      syncUI && syncUI();
      maybeRunHostBotTurn();
      return true;
    }catch(e){ post('error', { message:'State sync failed: '+(e.message||e) }); return false; }
  }
  function playerSlotName(slot, room){
    const p = room && room.players && room.players[slot];
    return p ? p.name : ('Player '+(slot+1));
  }
  function configureGame(room, mySlot, clientId){
    waitForGameReady(function(){
      try{
        mpRoom = room;
        mpMySlot = mySlot;
        mpClientId = clientId || '';
        mpIsHost = !!(room && room.hostId === mpClientId);
        matchMode = 'multiplayer';
        weaponTestMode = false;
        testEditorWeaponId = null;
        editorTimerOn = false;
        editorTimer = 0;
        settings.localHumans = Math.max(1, (room.players || []).length);
        settings.localBots = Math.max(0, +room.bots || 0);
        settings.players = Math.max(2, settings.localHumans + settings.localBots);
        settings.turnLength = Math.max(20, +room.turnLength || 120);
        settings.physics = room.physics || 'bounce';
        settings.playerPackChoice = room.pack || settings.playerPackChoice || 'gold';
        settings.packMode = settings.playerPackChoice;
        localStorage.setItem('warheads.playerPackChoice', settings.playerPackChoice);
        setGameLoaded(true);
        if(ui && ui.menu) ui.menu.classList.add('hidden');
        if(ui && ui.centerBanner) ui.centerBanner.classList.remove('show','gameover');
        newMatch();
        (room.players || []).forEach((pl, i) => { if(ships[i]) { ships[i].name = pl.name || ('Player '+(i+1)); ships[i].ai = false; } });
        for(let i=(room.players||[]).length; i<ships.length; i++){ if(ships[i]) { ships[i].name = 'Bot '+(i-(room.players||[]).length+1); ships[i].ai = !!mpIsHost; ships[i].mpBot = true; } }
        roundLeft = settings.turnLength;
        focusTurnCamera && focusTurnCamera(false);
        syncUI && syncUI();
        post('ready', { slot: mySlot, state: buildState() });
        maybeRunHostBotTurn();
      }catch(e){ post('error', { message:'Multiplayer game start failed: '+(e.message||e) }); }
    });
  }
  function applyRemoteShot(input){
    waitForGameReady(function(){
      try{
        if(input.stateBefore) applyState(input.stateBefore);
        selected = Math.max(0, Math.min((currentLoadout ? currentLoadout().length : 1)-1, +input.weaponIndex || 0));
        if(ui && ui.weaponSelect) { ui.weaponSelect.value = String(selected); }
        if(ui && ui.angle) ui.angle.value = String(input.angle ?? ui.angle.value ?? 45);
        if(ui && ui.power) ui.power.value = String(input.power ?? ui.power.value ?? 70);
        if(input.defense && ships[turn]) ships[turn].defense = input.defense;
        syncUI && syncUI();
        shoot(false);
      }catch(e){ post('error', { message:'Remote shot failed: '+(e.message||e) }); }
    });
  }

  window.WCE_MP = {
    start: configureGame,
    applyShot: applyRemoteShot,
    exportState: buildState,
    importState: applyState,
    currentTurn: () => (typeof turn !== 'undefined' ? turn : 0),
    isBusy: () => !!busy,
    setControlLock: function(locked){
      try{
        if(ui && ui.fire) ui.fire.disabled = !!locked;
        if(ui && ui.angle) ui.angle.disabled = !!locked;
        if(ui && ui.power) ui.power.disabled = !!locked;
        if(ui && ui.weaponSelect) ui.weaponSelect.disabled = !!locked;
        if(ui && ui.defenseSelect) ui.defenseSelect.disabled = !!locked;
      }catch(e){}
    },
    readInput: function(){
      return {
        angle: ui && ui.angle ? +ui.angle.value : 45,
        power: ui && ui.power ? +ui.power.value : 70,
        weaponIndex: typeof selected !== 'undefined' ? selected : 0,
        defense: ui && ui.defenseSelect ? ui.defenseSelect.value : null,
        stateBefore: buildState()
      };
    }
  };

  if(mpMode){
    waitForGameReady(function(){
      try{
        const originalFinishTurn = finishTurn;
        finishTurn = function(){
          const controller = canControlMpTurn();
          originalFinishTurn.apply(this, arguments);
          if(controller) setTimeout(() => post('turnFinished', { state: buildState(), turn }), 20);
        };
        const originalShowCenter = showCenter;
        showCenter = function(title, sub, mode, ms){
          originalShowCenter.apply(this, arguments);
          if(mode === 'gameover') post('gameOver', { title, sub, state: buildState() });
        };
        post('bridgeReady', {});
      }catch(e){ post('error', { message:'Bridge hook failed: '+(e.message||e) }); }
    });
  }
})();
