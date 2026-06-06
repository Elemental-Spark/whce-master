<?php
// WarHeads Classic Enhanced - shared-hosting multiplayer API (PHP polling, no npm required)
// v0.7.40 multiplayer late-join queue/cycle-sync hotfix. Multiplayer only.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

$DATA_DIR = __DIR__ . '/data';
$STATE_FILE = $DATA_DIR . '/rooms.json';
$BLOCK_FILE = __DIR__ . '/blocked-names.json';
$MAX_LOBBY_CHAT = 60;
$MAX_ROOM_CHAT = 80;
$MAX_EVENTS = 180;
$MAX_NAME_LEN = 20;
$MAX_CHAT_LEN = 220;
$ROOM_IDLE_SECONDS = 3600;
$EMPTY_ROOM_SECONDS = 30;
$CLIENT_IDLE_SECONDS = 300;
$MAX_HUMANS = 16;
$MAX_BOTS = 8;

if (!is_dir($DATA_DIR)) @mkdir($DATA_DIR, 0775, true);
if (!file_exists($STATE_FILE)) file_put_contents($STATE_FILE, json_encode(default_state(), JSON_PRETTY_PRINT));

function default_state(){ return ['version'=>'0.7.40-php-mp','clients'=>[], 'rooms'=>[], 'lobbyChat'=>[], 'seq'=>1, 'updatedAt'=>time()]; }
function input_json(){ $raw=file_get_contents('php://input'); $j=json_decode($raw,true); return is_array($j)?$j:$_REQUEST; }
function clean_id($s){ $s=preg_replace('/[^a-zA-Z0-9_\-]/','',strval($s)); return $s ?: ('client-'.bin2hex(random_bytes(5))); }
function u_lower($s){ return function_exists('mb_strtolower') ? mb_strtolower($s,'UTF-8') : strtolower($s); }
function u_sub($s,$start,$len){ return function_exists('mb_substr') ? mb_substr($s,$start,$len,'UTF-8') : substr($s,$start,$len); }
function u_len($s){ return function_exists('mb_strlen') ? mb_strlen($s,'UTF-8') : strlen($s); }
function u_pos($hay,$needle){ return function_exists('mb_strpos') ? mb_strpos($hay,$needle,0,'UTF-8') : strpos($hay,$needle); }
function safe_id($prefix){ return $prefix.'-'.bin2hex(random_bytes(5)); }
function clamp_int($v,$min,$max){ $v=intval($v); if($v<$min) return $min; if($v>$max) return $max; return $v; }
function clean_text($s,$max=220){ $s=trim(strval($s)); $s=preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u','',$s); $s=preg_replace('/[\x{200B}-\x{200D}\x{FEFF}]/u','',$s); return u_sub($s,0,$max); }
function norm_scan($s){
  $s=u_lower(clean_text($s,300));
  if (class_exists('Normalizer')) $s=Normalizer::normalize($s, Normalizer::FORM_KC);
  $map=['4'=>'a','@'=>'a','3'=>'e','1'=>'i','!'=>'i','|'=>'i','0'=>'o','5'=>'s','$'=>'s','7'=>'t','+'=>'t'];
  $s=strtr($s,$map);
  $s=preg_replace('/[\x{0300}-\x{036f}\x{200B}-\x{200D}\x{FEFF}]/u','',$s);
  $s=preg_replace('/(.)\1{2,}/u','$1$1',$s);
  return $s;
}
function blocked_terms(){
  global $BLOCK_FILE;
  $base=['admin','administrator','moderator','system','server','owner','elemental spark','chatgpt','password','address','phone number','hitler','nazi','kkk','terrorist','pedo','pedophile','rape','suicide','fuck','shit','bitch','cunt','dick','pussy','asshole'];
  if (file_exists($BLOCK_FILE)) { $j=json_decode(file_get_contents($BLOCK_FILE),true); if (is_array($j)) $base=array_merge($base,$j); }
  return array_values(array_unique(array_filter(array_map('strval',$base))));
}
function unsafe_name($name){
  global $MAX_NAME_LEN;
  $name=clean_text($name,$MAX_NAME_LEN);
  $scan=norm_scan($name);
  $plain=preg_replace('/[^\p{L}\p{N}]+/u','',$scan);
  if (u_len($name) < 2 || u_len($name) > $MAX_NAME_LEN) return 'Name must be 2-20 characters.';
  if ($plain === '' || preg_match('/^[0-9]+$/u',$plain)) return 'Name must include letters.';
  foreach(blocked_terms() as $term){ if ($term !== '' && u_pos($scan, norm_scan($term)) !== false) return 'That name is not allowed.'; }
  return '';
}
function clean_chat($text){
  global $MAX_CHAT_LEN;
  $text=clean_text($text,$MAX_CHAT_LEN);
  if ($text==='') return '';
  $scan=norm_scan($text);
  foreach(blocked_terms() as $term){ if ($term!=='' && u_pos($scan,norm_scan($term))!==false) return '[message blocked]'; }
  return $text;
}

function sanitize_mod_settings($m){
  if(!is_array($m)) $m=[];
  $caps=[
    'maxLiveShots'=>[16,220], 'warheadsPerTurn'=>[12,260], 'maxParticles'=>[80,1400], 'particleScale'=>[0.1,3.0],
    'maxBeams'=>[4,140], 'maxTrailPoints'=>[8,140], 'maxLiveWalkers'=>[0,40], 'walkersPerTurn'=>[0,20],
    'planetCapBase'=>[2,18], 'planetCapPerPlayer'=>[0,2.5], 'planetFloorBase'=>[0,5], 'planetFloorPerPlayer'=>[0,0.55], 'planetFloorMax'=>[0,8],
    'planetDestructionScale'=>[0.1,6.0], 'planetBuildScale'=>[0.1,4.0], 'planetRepairScale'=>[0.1,4.0],
    'worldWidthBase'=>[1600,5200], 'worldWidthPerPlayer'=>[120,520], 'worldHeightBase'=>[1000,3200], 'worldHeightPerPlayer'=>[80,320],
    'gravityStrength'=>[0,1.2], 'gravityMaxPull'=>[0,0.6], 'maxShotSpeed'=>[4,70], 'softHoming'=>[0,0.18], 'homingBoost'=>[0,0.7],
    'stageRadiusCap'=>[20,360], 'stageDamageCap'=>[0,240], 'stageCountCap'=>[1,18], 'heavySfxCap'=>[1,12], 'lightSfxCap'=>[2,24]
  ];
  $out=[];
  foreach($caps as $k=>$lim){
    if(isset($m[$k]) && is_numeric($m[$k])){
      $v=$m[$k]+0; if($v<$lim[0])$v=$lim[0]; if($v>$lim[1])$v=$lim[1]; $out[$k]=$v;
    }
  }
  return $out;
}
function room_mod_summary($room){
  $m=$room['modSettings']??[];
  if(!is_array($m) || !count($m)) return 'Gold defaults';
  $bits=[];
  foreach(['planetCapBase'=>'Planets','maxLiveShots'=>'Shots','warheadsPerTurn'=>'Warheads','planetDestructionScale'=>'Destruction','softHoming'=>'Guidance'] as $k=>$label){ if(isset($m[$k])) $bits[]=$label.': '.$m[$k]; }
  return count($bits)?implode(' · ',$bits):'Custom mod preset';
}

function public_client($c){ return ['id'=>$c['id']??'', 'name'=>$c['name']??'Guest', 'roomId'=>$c['roomId']??null]; }
function public_participant($p){ return ['clientId'=>$p['clientId']??'', 'name'=>$p['name']??'Pilot', 'slot'=>intval($p['slot']??0), 'ready'=>!empty($p['ready']), 'bot'=>!empty($p['bot'])]; }
function room_participants($r){
  if(!empty($r['participants']) && is_array($r['participants'])) return array_values($r['participants']);
  return array_values($r['players'] ?? []);
}
function public_room($r){
  $parts=room_participants($r); $turn=intval($r['turn']??0); $active=$parts[$turn]??null;
  return [
    'id'=>$r['id'], 'name'=>$r['name'], 'hostId'=>$r['hostId'], 'locked'=>!empty($r['locked']), 'state'=>$r['state'],
    'maxPlayers'=>$r['maxPlayers'], 'bots'=>$r['bots'], 'turnLength'=>$r['turnLength'], 'physics'=>$r['physics'], 'seed'=>$r['seed'],
    'allowLateJoin'=>!empty($r['allowLateJoin']), 'allowSpectators'=>!empty($r['allowSpectators']), 'modSettings'=>$r['modSettings']??[], 'modSummary'=>room_mod_summary($r),
    'turn'=>$turn, 'activeClientId'=>$active['clientId']??null, 'turnPhase'=>$r['turnPhase']??'idle', 'turnToken'=>intval($r['turnToken']??0), 'turnStartedAt'=>intval($r['turnStartedAt']??($r['updatedAt']??time())),
    'players'=>array_map('public_participant', $r['players'] ?? []),
    'participants'=>array_map('public_participant', $parts),
    'spectators'=>$r['spectators']??[],
    'lateJoiners'=>array_values($r['lateJoiners']??[]),
    'createdAt'=>$r['createdAt'], 'updatedAt'=>$r['updatedAt']
  ];
}
function lobby_snapshot($state){
  $rooms=[]; foreach($state['rooms'] as $r) $rooms[]=public_room($r);
  $users=[]; foreach($state['clients'] as $c) if(!empty($c['name'])) $users[]=public_client($c);
  return ['users'=>$users, 'rooms'=>$rooms, 'chat'=>array_slice($state['lobbyChat']??[], -60)];
}
function add_event(&$state,&$room,$type,$payload=[]){
  global $MAX_EVENTS;
  $seq=++$state['seq'];
  $room['events'][]=array_merge(['seq'=>$seq,'type'=>$type,'at'=>time()],$payload);
  if(count($room['events'])>$MAX_EVENTS) $room['events']=array_slice($room['events'],-$MAX_EVENTS);
  $room['updatedAt']=time();
  return $seq;
}
function build_participants($room){
  $parts=[]; $slot=0;
  foreach(($room['players']??[]) as $p){
    $parts[]=['clientId'=>$p['clientId'], 'name'=>$p['name'], 'slot'=>$slot++, 'ready'=>!empty($p['ready']), 'bot'=>false];
  }
  $bots=clamp_int($room['bots']??0,0,8);
  for($i=0;$i<$bots;$i++){
    $parts[]=['clientId'=>'bot-'.$room['id'].'-'.$i, 'name'=>'Bot '.($i+1), 'slot'=>$slot++, 'ready'=>true, 'bot'=>true];
  }
  return $parts;
}

function active_human_count($room){
  $n=0;
  foreach(($room['participants']??[]) as $p){ if(empty($p['bot'])) $n++; }
  if(!$n) $n=count($room['players']??[]);
  return $n;
}
function queued_late_count($room){ return count($room['lateJoiners']??[]); }
function commit_late_joiners(&$state,&$room,&$chatText){
  if(empty($room['lateJoiners']) || !is_array($room['lateJoiners'])) return [];
  $added=[];
  $parts=room_participants($room);
  $slot=count($parts);
  foreach(array_values($room['lateJoiners']) as $q){
    $jid=clean_id($q['id']??($q['clientId']??''));
    if(!$jid || empty($state['clients'][$jid])) continue;
    $jname=clean_text($q['name']??($state['clients'][$jid]['name']??'Pilot'), 20);
    if($jname==='') $jname='Pilot';
    $already=false;
    foreach(($room['participants']??[]) as $p){ if(($p['clientId']??'')===$jid) { $already=true; break; } }
    if($already) continue;
    $player=['clientId'=>$jid,'name'=>$jname,'slot'=>$slot,'ready'=>true,'bot'=>false,'lateJoined'=>true,'joinedAt'=>time()];
    $room['players'][]=$player;
    $room['participants'][]=$player;
    if(isset($state['clients'][$jid])){ $state['clients'][$jid]['roomId']=$room['id']; $state['clients'][$jid]['spectating']=false; $state['clients'][$jid]['lateQueued']=false; }
    if(isset($room['spectators'][$jid])) unset($room['spectators'][$jid]);
    $added[]=$player;
    $slot++;
  }
  $room['lateJoiners']=[];
  reindex_players($room);
  if(count($added)){
    $names=array_map(function($p){ return $p['name']??'Pilot'; }, $added);
    $chatText=implode(', ', $names).' entered the battle at the new turn cycle.';
    $room['chat'][]=['system'=>true,'text'=>$chatText,'at'=>time()];
    $room['chat']=array_slice($room['chat'],-80);
  }
  return $added;
}
function reindex_players(&$room){ foreach(($room['players']??[]) as $i=>$p){ $room['players'][$i]['slot']=$i; } }

function room_client_ids($room){
  $ids=[];
  foreach(($room['players']??[]) as $p){ if(!empty($p['clientId']) && empty($p['bot'])) $ids[$p['clientId']]=true; }
  foreach(($room['participants']??[]) as $p){ if(!empty($p['clientId']) && empty($p['bot'])) $ids[$p['clientId']]=true; }
  foreach(($room['spectators']??[]) as $id=>$sp){ if($id) $ids[$id]=true; if(!empty($sp['id'])) $ids[$sp['id']]=true; }
  foreach(($room['lateJoiners']??[]) as $id=>$q){ if($id) $ids[$id]=true; if(!empty($q['id'])) $ids[$q['id']]=true; if(!empty($q['clientId'])) $ids[$q['clientId']]=true; }
  return array_keys($ids);
}
function clear_room_clients(&$state,$room){
  foreach(room_client_ids($room) as $id){
    if(isset($state['clients'][$id])){ $state['clients'][$id]['roomId']=null; $state['clients'][$id]['spectating']=false; $state['clients'][$id]['lateQueued']=false; }
  }
}
function leave_room(&$state,$cid,$reason='left'){
  if(empty($state['clients'][$cid]['roomId'])) return;
  $rid=$state['clients'][$cid]['roomId']; $state['clients'][$cid]['roomId']=null;
  if(empty($state['rooms'][$rid])) return;
  $room=&$state['rooms'][$rid];
  $name=$state['clients'][$cid]['name'] ?? 'Pilot';
  if(!empty($state['clients'][$cid]['spectating'])){
    unset($room['spectators'][$cid]);
    if(isset($room['lateJoiners'][$cid])) unset($room['lateJoiners'][$cid]);
    $state['clients'][$cid]['spectating']=false;
    $state['clients'][$cid]['lateQueued']=false;
    $room['chat'][]=['system'=>true,'text'=>$name.' stopped spectating.','at'=>time()];
    add_event($state,$room,'room',['room'=>public_room($room),'chat'=>$room['chat']]);
    return;
  }

  // During a running match, leaving players become bots so the room keeps going.
  if(($room['state']??'')==='running'){
    foreach(($room['participants']??[]) as &$p){
      if(empty($p['bot']) && ($p['clientId']??'')===$cid){
        $p['clientId']='bot-replace-'.$rid.'-'.$p['slot'];
        $p['name']=$name.' Bot';
        $p['bot']=true;
        $p['ready']=true;
      }
    } unset($p);
    $room['players']=array_values(array_filter($room['players']??[], function($p) use($cid){ return ($p['clientId']??'')!==$cid; }));
    reindex_players($room);
    if($room['hostId']===$cid && count($room['players'])>0) $room['hostId']=$room['players'][0]['clientId'];
    if(count($room['players'])===0){ unset($state['rooms'][$rid]); return; }
    $room['chat'][]=['system'=>true,'text'=>$name.' '.$reason.' and was replaced by a bot.','at'=>time()];
    $room['chat']=array_slice($room['chat'],-80);
    add_event($state,$room,'room',['room'=>public_room($room),'chat'=>$room['chat']]);
    return;
  }

  $new=[]; foreach($room['players'] as $p){ if($p['clientId']!==$cid) $new[]=$p; }
  $room['players']=$new; reindex_players($room);
  if($room['hostId']===$cid && count($room['players'])>0) $room['hostId']=$room['players'][0]['clientId'];
  if($room['turn']>=count($room['players'])) $room['turn']=0;
  $room['chat'][]=['system'=>true,'text'=>$name.' '.$reason.'.','at'=>time()];
  $room['chat']=array_slice($room['chat'],-80);
  add_event($state,$room,'room',['room'=>public_room($room),'chat'=>$room['chat']]);
  if(count($room['players'])===0) $room['emptyAt']=time();
}
function purge_old(&$state){
  global $ROOM_IDLE_SECONDS,$EMPTY_ROOM_SECONDS,$CLIENT_IDLE_SECONDS;
  $now=time();
  foreach(array_keys($state['clients']) as $cid){ if($now-($state['clients'][$cid]['lastSeen']??0)>$CLIENT_IDLE_SECONDS) leave_room($state,$cid,'timed out'); }
  foreach(array_keys($state['clients']) as $cid){ if($now-($state['clients'][$cid]['lastSeen']??0)>$CLIENT_IDLE_SECONDS+60) unset($state['clients'][$cid]); }
  foreach(array_keys($state['rooms']) as $rid){
    $r=$state['rooms'][$rid];
    if((count($r['players'])===0 && ($r['state']??'lobby')!=='running' && $now-($r['emptyAt']??$r['updatedAt'])>$EMPTY_ROOM_SECONDS) || ($now-($r['updatedAt']??$now)>$ROOM_IDLE_SECONDS)) unset($state['rooms'][$rid]);
  }
}
function response($ok,$extra=[]){ echo json_encode(array_merge(['ok'=>$ok],$extra), JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE); exit; }

$in=input_json(); $action=$in['action'] ?? 'poll'; $cid=clean_id($in['clientId'] ?? ''); $lastSeq=intval($in['lastSeq'] ?? 0);
$fp=fopen($STATE_FILE,'c+'); if(!$fp) response(false,['message'=>'Could not open multiplayer data file. Check folder permissions.']);
flock($fp, LOCK_EX); $raw=stream_get_contents($fp); $state=json_decode($raw,true); if(!is_array($state)) $state=default_state();
if(($state['version']??'')!=='0.7.40-php-mp') $state['version']='0.7.40-php-mp';
if(empty($state['clients'][$cid])) $state['clients'][$cid]=['id'=>$cid,'name'=>'','roomId'=>null,'lastSeen'=>time(),'connectedAt'=>time()];
$state['clients'][$cid]['lastSeen']=time(); purge_old($state);
$client=&$state['clients'][$cid]; $events=[]; $message=''; $roomOut=null; $chatOut=[];

switch($action){
  case 'hello':
    $name=clean_text($in['name'] ?? '', $MAX_NAME_LEN); $bad=unsafe_name($name);
    if($bad){ flock($fp,LOCK_UN); response(false,['type'=>'nameRejected','message'=>$bad]); }
    $client['name']=$name;
    $message='Safety reminder: never share personal information, addresses, passwords, phone numbers, private accounts, or real-world plans.';
    break;
  case 'resetSession':
    leave_room($state,$cid,'reset session');
    $client['roomId']=null;
    $client['spectating']=false;
    $client['lateQueued']=false;
    $message='Session reset.';
    break;
  case 'createRoom':
    if(empty($client['name'])) { $message='Set a name first.'; break; }
    leave_room($state,$cid,'changed rooms');
    $roomName=clean_text($in['name'] ?? ($client['name'].' Game'), 32); if($roomName==='') $roomName=$client['name'].' Game';
    $bad=unsafe_name($roomName); if($bad){ $message=$bad; break; }
    $rid=safe_id('room');
    $room=['id'=>$rid,'name'=>$roomName,'hostId'=>$cid,'locked'=>false,'state'=>'lobby','maxPlayers'=>clamp_int($in['maxPlayers']??4,1,$MAX_HUMANS),'bots'=>clamp_int($in['bots']??0,0,$MAX_BOTS),'turnLength'=>clamp_int($in['turnLength']??120,20,120),'physics'=>(($in['physics']??'bounce')==='teleport'?'teleport':'bounce'),'allowLateJoin'=>!empty($in['allowLateJoin']),'allowSpectators'=>!empty($in['allowSpectators']),'modSettings'=>sanitize_mod_settings($in['modSettings']??[]),'seed'=>safe_id('seed'),'turn'=>0,'turnPhase'=>'idle','turnToken'=>0,'turnStartedAt'=>time(),'players'=>[], 'participants'=>[], 'spectators'=>[], 'lateJoiners'=>[], 'chat'=>[], 'events'=>[], 'latestState'=>null, 'createdAt'=>time(), 'updatedAt'=>time()];
    $state['rooms'][$rid]=$room; $client['roomId']=$rid;
    $state['rooms'][$rid]['players'][]=['clientId'=>$cid,'name'=>$client['name'],'slot'=>0,'ready'=>false,'bot'=>false];
    $state['rooms'][$rid]['chat'][]=['system'=>true,'text'=>$client['name'].' created the room.','at'=>time()];
    add_event($state,$state['rooms'][$rid],'room',['room'=>public_room($state['rooms'][$rid]),'chat'=>$state['rooms'][$rid]['chat']]);
    break;
  case 'joinRoom':
    $rid=clean_id($in['roomId'] ?? '');
    if(empty($client['name'])) { $message='Set a name first.'; break; }
    if(empty($state['rooms'][$rid])) { $message='Room not found.'; break; }
    if(!empty($state['rooms'][$rid]['banned'][$cid])) { $message='You are not allowed in that room.'; break; }
    if(($state['rooms'][$rid]['state']??'')!=='lobby' && empty($state['rooms'][$rid]['allowLateJoin'])) { $message='That game already started.'; break; }
    $room=&$state['rooms'][$rid];
    if(($room['state']??'')==='running'){
      // v0.7.40: late joiners wait in a poker-style queue. They spectate the current cycle,
      // then enter at the next cycle boundary without stealing an existing player slot.
      if(active_human_count($room) + queued_late_count($room) >= intval($room['maxPlayers']??$MAX_HUMANS)) { $message='That game is full.'; break; }
      leave_room($state,$cid,'changed rooms');
      $client['roomId']=$rid; $client['spectating']=true; $client['lateQueued']=true;
      $room['spectators']=$room['spectators']??[];
      $room['lateJoiners']=$room['lateJoiners']??[];
      $room['spectators'][$cid]=['id'=>$cid,'name'=>$client['name'],'at'=>time(),'lateJoin'=>true,'queued'=>true];
      $room['lateJoiners'][$cid]=['id'=>$cid,'clientId'=>$cid,'name'=>$client['name'],'at'=>time()];
      $room['chat'][]=['system'=>true,'text'=>$client['name'].' has joined late and is queued for the next turn cycle.','at'=>time()];
      $room['chat']=array_slice($room['chat'],-$MAX_ROOM_CHAT);
      add_event($state,$room,'lateJoinQueued',['room'=>public_room($room),'chat'=>$room['chat'],'name'=>$client['name']]);
      break;
    }
    if(count($room['players']) >= $room['maxPlayers']) { $message='That game is full.'; break; }
    leave_room($state,$cid,'changed rooms');
    $client['roomId']=$rid; $client['spectating']=false;
    $newPlayer=['clientId'=>$cid,'name'=>$client['name'],'slot'=>count($room['players']),'ready'=>false,'bot'=>false];
    $room['players'][]=$newPlayer;
    $room['chat'][]=['system'=>true,'text'=>$client['name'].' joined.','at'=>time()]; $room['chat']=array_slice($room['chat'],-$MAX_ROOM_CHAT);
    add_event($state,$room,'room',['room'=>public_room($room),'chat'=>$room['chat']]);
    break;
  case 'leaveRoom': leave_room($state,$cid,'left'); break;
  case 'closeRoom':
    $rid=$client['roomId']??''; if(!empty($state['rooms'][$rid])){ $room=&$state['rooms'][$rid]; if($room['hostId']===$cid){ add_event($state,$room,'roomEnded',['message'=>'Host closed the room.']); clear_room_clients($state,$room); unset($state['rooms'][$rid]); $client['roomId']=null; } else $message='Only the host can close the room.'; }
    break;
  case 'setReady':
    $rid=$client['roomId']??''; if(!empty($state['rooms'][$rid])){ $room=&$state['rooms'][$rid]; foreach($room['players'] as &$p){ if($p['clientId']===$cid) $p['ready']=!empty($in['ready']); } unset($p); add_event($state,$room,'room',['room'=>public_room($room),'chat'=>$room['chat']]); }
    break;
  case 'roomConfig':
    $rid=$client['roomId']??'';
    if(!empty($state['rooms'][$rid])){
      $room=&$state['rooms'][$rid];
      if($room['hostId']===$cid && $room['state']==='lobby'){
        $room['maxPlayers']=clamp_int($in['maxPlayers']??$room['maxPlayers'],1,$MAX_HUMANS);
        $room['bots']=clamp_int($in['bots']??$room['bots'],0,$MAX_BOTS);
        $room['turnLength']=clamp_int($in['turnLength']??$room['turnLength'],20,120);
        $room['physics']=(($in['physics']??$room['physics'])==='teleport'?'teleport':'bounce');
        if(array_key_exists('allowLateJoin',$in)) $room['allowLateJoin']=!empty($in['allowLateJoin']);
        if(array_key_exists('allowSpectators',$in)) $room['allowSpectators']=!empty($in['allowSpectators']);
        if(isset($in['modSettings'])) $room['modSettings']=sanitize_mod_settings($in['modSettings']);
        add_event($state,$room,'room',['room'=>public_room($room),'chat'=>$room['chat']]);
      }
    }
    break;
  case 'startRoom':
    $rid=$client['roomId']??''; if(!empty($state['rooms'][$rid])){ $room=&$state['rooms'][$rid]; if($room['hostId']!==$cid) $message='Only the host can start.'; else if(count($room['players']) + intval($room['bots']) < 2) $message='Need at least 2 total players/bots.'; else { $room['participants']=build_participants($room); $room['state']='running'; $room['locked']=true; $room['turn']=random_int(0, max(0,count($room['participants'])-1)); $room['turnPhase']='idle'; $room['turnToken']=0; $room['turnStartedAt']=time(); $room['seed']=safe_id('seed'); $room['latestState']=null; add_event($state,$room,'startGame',['room'=>public_room($room),'warning'=>'Never share personal information or private contact details.']); } }
    break;
  case 'shot':
    $rid=$client['roomId']??''; if(!empty($state['rooms'][$rid])){ $room=&$state['rooms'][$rid]; $parts=room_participants($room); $active=$parts[$room['turn']]??null; if($room['state']!=='running') $message='Room is not running.'; else if(!$active || !empty($active['bot']) || ($active['clientId']??'')!==$cid) $message='It is not your turn.'; else if(($room['turnPhase']??'idle')==='shot') $message='Shot already in flight.'; else { $room['turnPhase']='shot'; $room['turnToken']=intval($room['turnToken']??0)+1; add_event($state,$room,'shot',['from'=>$cid,'slot'=>$room['turn'],'turnToken'=>$room['turnToken'],'input'=>$in['input']??new stdClass()]); } }
    break;
  case 'turnFinished':
    $rid=$client['roomId']??'';
    if(!empty($state['rooms'][$rid])){
      $room=&$state['rooms'][$rid];
      $parts=room_participants($room);
      $active=$parts[$room['turn']]??null;
      $allowed=false;
      if($active){ $allowed=(!empty($active['bot']) && $room['hostId']===$cid) || (empty($active['bot']) && ($active['clientId']??'')===$cid); }
      if($room['state']==='running' && $allowed && (($room['turnPhase']??'idle')==='shot' || !empty($active['bot']))){
        $room['latestState']=$in['state']??null;
        $room['turnPhase']='idle';
        $room['turnToken']=intval($room['turnToken']??0)+1;
        $oldTurn=intval($room['turn']);
        $count=max(1,count($parts));
        $next=($oldTurn+1)%$count;
        $stateObj=is_array($room['latestState'])?$room['latestState']:[];
        $ships=is_array($stateObj['ships']??null)?$stateObj['ships']:[];
        $guard=0;
        while($guard++<$count){
          $hp=isset($ships[$next]['hp'])?floatval($ships[$next]['hp']):1;
          if($hp>0) break;
          $next=($next+1)%$count;
        }
        $wrapped=($next <= $oldTurn);
        $lateText='';
        if($wrapped && !empty($room['lateJoiners'])){
          $added=commit_late_joiners($state,$room,$lateText);
          if(count($added)){
            $next=0; // New players wait through the fresh cycle instead of shooting immediately.
            add_event($state,$room,'lateJoinCommit',['room'=>public_room($room),'chat'=>$room['chat'],'added'=>array_map('public_participant',$added),'message'=>$lateText]);
          }
        }
        $parts=room_participants($room);
        $room['turn']=$next;
        $room['turnStartedAt']=time();
        add_event($state,$room,'stateSync',['state'=>$room['latestState'],'turn'=>$room['turn'],'turnToken'=>$room['turnToken'],'room'=>public_room($room),'activeClientId'=>($parts[$room['turn']]['clientId']??null)]);
      }
    }
    break;
  case 'gameOver':
    $rid=$client['roomId']??''; if(!empty($state['rooms'][$rid])){ $room=&$state['rooms'][$rid]; add_event($state,$room,'roomEnded',['message'=>clean_text($in['title']??'Game over. Room closed.',80)]); clear_room_clients($state,$room); unset($state['rooms'][$rid]); }
    break;
  case 'kickPlayer':
    $rid=$client['roomId']??''; $target=clean_id($in['targetId']??''); if(!empty($state['rooms'][$rid])){ $room=&$state['rooms'][$rid]; if($room['hostId']!==$cid){$message='Only the host can kick players.';} else { $tname='Pilot'; foreach(($room['players']??[]) as $p){ if(($p['clientId']??'')===$target)$tname=$p['name']??'Pilot'; } if(isset($state['clients'][$target])) $state['clients'][$target]['roomId']=null; $room['players']=array_values(array_filter($room['players']??[],function($p)use($target){return ($p['clientId']??'')!==$target;})); $room['participants']=array_values(array_filter($room['participants']??[],function($p)use($target){return ($p['clientId']??'')!==$target;})); reindex_players($room); $room['chat'][]=['system'=>true,'text'=>$tname.' was removed by the host.','at'=>time()]; add_event($state,$room,'room',['room'=>public_room($room),'chat'=>$room['chat']]); } }
    break;
  case 'banPlayer':
    $rid=$client['roomId']??''; $target=clean_id($in['targetId']??''); if(!empty($state['rooms'][$rid])){ $room=&$state['rooms'][$rid]; if($room['hostId']!==$cid){$message='Only the host can ban players.';} else { $room['banned']=$room['banned']??[]; if($target) $room['banned'][$target]=time(); if(isset($state['clients'][$target])) $state['clients'][$target]['roomId']=null; $room['players']=array_values(array_filter($room['players']??[],function($p)use($target){return ($p['clientId']??'')!==$target;})); $room['participants']=array_values(array_filter($room['participants']??[],function($p)use($target){return ($p['clientId']??'')!==$target;})); reindex_players($room); $room['chat'][]=['system'=>true,'text'=>'A player was banned by the host.','at'=>time()]; add_event($state,$room,'room',['room'=>public_room($room),'chat'=>$room['chat']]); } }
    break;
  case 'hostTerrain':
    $rid=$client['roomId']??''; $kind=clean_text($in['kind']??'clear',20); if(!empty($state['rooms'][$rid])){ $room=&$state['rooms'][$rid]; if($room['hostId']!==$cid){$message='Only the host can change terrain.';} else { if(isset($in['state'])) $room['latestState']=$in['state']; $room['turnToken']=intval($room['turnToken']??0)+1; $room['chat'][]=['system'=>true,'text'=>'Host terrain action: '.$kind.'.','at'=>time()]; add_event($state,$room,'stateSync',['state'=>$room['latestState'],'turn'=>$room['turn'],'turnToken'=>$room['turnToken'],'room'=>public_room($room),'activeClientId'=>($room['participants'][$room['turn']]['clientId']??null)]); } }
    break;
  case 'spectateRoom':
    $rid=clean_id($in['roomId'] ?? ''); if(empty($client['name'])) { $message='Set a name first.'; break; } if(empty($state['rooms'][$rid])) { $message='Room not found.'; break; } $room=&$state['rooms'][$rid]; if(empty($room['allowSpectators'])){ $message='Spectating is disabled for this room.'; break; } leave_room($state,$cid,'changed rooms'); $client['roomId']=$rid; $client['spectating']=true; $room['spectators']=$room['spectators']??[]; $room['spectators'][$cid]=['id'=>$cid,'name'=>$client['name'],'at'=>time()]; $room['chat'][]=['system'=>true,'text'=>$client['name'].' is spectating.','at'=>time()]; add_event($state,$room,'room',['room'=>public_room($room),'chat'=>$room['chat']]);
    break;
  case 'chat':
    $text=clean_chat($in['text']??''); if($text!==''){ $rid=$client['roomId']??''; if($rid && !empty($state['rooms'][$rid])){ $room=&$state['rooms'][$rid]; $room['chat'][]=['name'=>$client['name']?:'Pilot','text'=>$text,'at'=>time()]; $room['chat']=array_slice($room['chat'],-$MAX_ROOM_CHAT); add_event($state,$room,'chat',['scope'=>'room','chat'=>$room['chat']]); } else { $state['lobbyChat'][]=['name'=>$client['name']?:'Pilot','text'=>$text,'at'=>time()]; $state['lobbyChat']=array_slice($state['lobbyChat'],-$MAX_LOBBY_CHAT); } }
    break;
}
$syncBaseline=false; $serverSeq=intval($state['seq']??0);
$rid=$client['roomId']??''; if($rid && !empty($state['rooms'][$rid])){
  $roomRef=&$state['rooms'][$rid];
  $roomOut=public_room($roomRef); $chatOut=$roomRef['chat']??[];
  foreach(($roomRef['events']??[]) as $ev){ if(($ev['seq']??0)>$lastSeq) $events[]=$ev; }
  if(($roomRef['state']??'')==='running' && $lastSeq<=0){
    // Fresh/rejoined clients need the current room + latest state, not a replay of every old shot event.
    $syncBaseline=true;
    $events=[['type'=>'startGame','at'=>time(),'room'=>$roomOut,'snapshot'=>true]];
    if(!empty($roomRef['latestState'])) $events[]=['type'=>'stateSync','at'=>time(),'state'=>$roomRef['latestState'],'turn'=>intval($roomRef['turn']??0),'turnToken'=>intval($roomRef['turnToken']??0),'room'=>$roomOut,'activeClientId'=>($roomRef['participants'][$roomRef['turn']]['clientId']??null),'snapshot'=>true];
  }
}
$state['updatedAt']=time(); ftruncate($fp,0); rewind($fp); fwrite($fp,json_encode($state, JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES)); fflush($fp); flock($fp,LOCK_UN); fclose($fp);
response(true,['client'=>public_client($client),'message'=>$message,'lobby'=>lobby_snapshot($state),'room'=>$roomOut,'chat'=>$chatOut,'events'=>$events,'serverTime'=>time(),'serverSeq'=>$serverSeq,'syncBaseline'=>$syncBaseline]);
