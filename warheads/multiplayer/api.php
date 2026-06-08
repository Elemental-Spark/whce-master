<?php
// WarHeads Classic Enhanced - shared-hosting multiplayer API (PHP polling, no npm required)
// v0.7.86 GOLD turn rollback / stable cleanup hotfix. Multiplayer only.
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
$CLIENT_IDLE_SECONDS = 900;
$MAX_HUMANS = 16;
$MAX_BOTS = 8;

if (!is_dir($DATA_DIR)) @mkdir($DATA_DIR, 0775, true);
if (!file_exists($STATE_FILE)) file_put_contents($STATE_FILE, json_encode(default_state(), JSON_PRETTY_PRINT));

function default_state(){ return ['version'=>'0.7.86-gold','clients'=>[], 'rooms'=>[], 'lobbyChat'=>[], 'seq'=>1, 'updatedAt'=>time()]; }
function normalize_state(&$state){
  // v0.7.86 GOLD: recover from empty/damaged shared-host state without breaking the lobby.
  $def=default_state();
  if(!is_array($state)) $state=$def;
  foreach($def as $k=>$v){ if(!array_key_exists($k,$state)) $state[$k]=$v; }
  if(!is_array($state['clients'])) $state['clients']=[];
  if(!is_array($state['rooms'])) $state['rooms']=[];
  if(!is_array($state['lobbyChat'])) $state['lobbyChat']=[];
  if(!isset($state['seq']) || !is_numeric($state['seq'])) $state['seq']=1;
  if(!isset($state['updatedAt']) || !is_numeric($state['updatedAt'])) $state['updatedAt']=time();
  $state['version']='0.7.86-gold';
}
function input_json(){ $raw=file_get_contents('php://input'); $j=json_decode($raw,true); return is_array($j)?$j:$_REQUEST; }
function clean_id($s){ $s=preg_replace('/[^a-zA-Z0-9_\-]/','',strval($s)); return $s ?: ('client-'.bin2hex(random_bytes(5))); }
function u_lower($s){ return function_exists('mb_strtolower') ? mb_strtolower($s,'UTF-8') : strtolower($s); }
function u_sub($s,$start,$len){ return function_exists('mb_substr') ? mb_substr($s,$start,$len,'UTF-8') : substr($s,$start,$len); }
function u_len($s){ return function_exists('mb_strlen') ? mb_strlen($s,'UTF-8') : strlen($s); }
function u_pos($hay,$needle){ return function_exists('mb_strpos') ? mb_strpos($hay,$needle,0,'UTF-8') : strpos($hay,$needle); }
function safe_id($prefix){ return $prefix.'-'.bin2hex(random_bytes(5)); }
function clamp_int($v,$min,$max){ $v=intval($v); if($v<$min) return $min; if($v>$max) return $max; return $v; }
function clean_text($s,$max=220){ $s=trim(strval($s)); $s=preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u','',$s); $s=preg_replace('/[\x{200B}-\x{200D}\x{FEFF}]/u','',$s); return u_sub($s,0,$max); }
function clean_pack_choice($s){ $s=clean_text($s,64); $s=preg_replace('/[^a-zA-Z0-9_:\-]/','',$s); return $s!=='' ? $s : 'gold'; }
function clean_pack_label($s,$choice='gold'){ $s=clean_text($s,48); if($s===''){ $map=['gold'=>'Default + My Weapons','pack:experimental'=>'Experimental','generated'=>'Generated Chaos + My Weapons','saved'=>'My Weapons Only','all'=>'ALL Weapons']; return $map[$choice]??$choice; } return $s; }
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
  $base=['admin','administrator','moderator','system','server','owner','elemental spark','password','address','phone number','hitler','nazi','kkk','terrorist','pedo','pedophile','rape','suicide','fuck','shit','bitch','cunt','dick','pussy','asshole'];
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
    'stageRadiusCap'=>[20,360], 'stageDamageCap'=>[0,240], 'stageCountCap'=>[1,18], 'heavySfxCap'=>[1,12], 'lightSfxCap'=>[2,24],
    'cleanupIntervalMs'=>[1000,30000], 'cleanupMaxPlanetHoles'=>[18,120], 'cleanupMaxPlanetChunks'=>[4,80],
    'oatDelayMs'=>[40,2500], 'oatPayloadStage'=>[1,10]
  ];
  $out=[];
  foreach($caps as $k=>$lim){
    if(isset($m[$k]) && is_numeric($m[$k])){
      $v=$m[$k]+0; if($v<$lim[0])$v=$lim[0]; if($v>$lim[1])$v=$lim[1]; $out[$k]=$v;
    }
  }
  $styles=['random','classic','bubble','hex','crystal','eightbit','8bit','pixel16','16bit','future','cyber','alien','rings','lava','ice','desert','ocean','void'];
  if(isset($m['planetStyle']) && in_array(strval($m['planetStyle']), $styles, true)) $out['planetStyle']=strval($m['planetStyle']);
  return $out;
}
function room_mod_summary($room){
  $m=$room['modSettings']??[];
  if(!is_array($m) || !count($m)) return 'Gold defaults';
  $bits=[];
  foreach(['planetCapBase'=>'Planets','maxLiveShots'=>'Shots','warheadsPerTurn'=>'Warheads','planetDestructionScale'=>'Destruction','softHoming'=>'Guidance','cleanupIntervalMs'=>'Cleanup'] as $k=>$label){ if(isset($m[$k])) $bits[]=$label.': '.$m[$k]; }
  if(isset($m['planetStyle'])) $bits[]='Planet style: '.$m['planetStyle'];
  return count($bits)?implode(' · ',$bits):'Custom mod preset';
}

function public_client($c){ return ['id'=>$c['id']??'', 'name'=>$c['name']??'Guest', 'roomId'=>$c['roomId']??null, 'packChoice'=>$c['packChoice']??'gold', 'packLabel'=>$c['packLabel']??'Default + My Weapons']; }
function public_participant($p){ return ['clientId'=>$p['clientId']??'', 'name'=>$p['name']??'Pilot', 'slot'=>intval($p['slot']??0), 'ready'=>!empty($p['ready']), 'bot'=>!empty($p['bot']), 'packChoice'=>$p['packChoice']??($p['bot']?'bot':'gold'), 'packLabel'=>$p['packLabel']??($p['bot']?'Bot Pack':'Default + My Weapons')]; }
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
    'packChoices'=>array_values(array_map(function($p){ return ['name'=>$p['name']??'Pilot','packChoice'=>$p['packChoice']??'gold','packLabel'=>$p['packLabel']??'Default + My Weapons']; }, $parts)),
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
    $parts[]=['clientId'=>$p['clientId'], 'name'=>$p['name'], 'slot'=>$slot++, 'ready'=>!empty($p['ready']), 'bot'=>false, 'packChoice'=>$p['packChoice']??'gold', 'packLabel'=>$p['packLabel']??'Default + My Weapons'];
  }
  $bots=clamp_int($room['bots']??0,0,8);
  for($i=0;$i<$bots;$i++){
    $parts[]=['clientId'=>'bot-'.$room['id'].'-'.$i, 'name'=>'Bot '.($i+1), 'slot'=>$slot++, 'ready'=>true, 'bot'=>true, 'packChoice'=>'bot', 'packLabel'=>'Bot Pack'];
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
    $player=['clientId'=>$jid,'name'=>$jname,'slot'=>$slot,'ready'=>true,'bot'=>false,'lateJoined'=>true,'joinedAt'=>time(),'packChoice'=>clean_pack_choice($q['packChoice']??($state['clients'][$jid]['packChoice']??'gold')),'packLabel'=>clean_pack_label($q['packLabel']??($state['clients'][$jid]['packLabel']??''), clean_pack_choice($q['packChoice']??($state['clients'][$jid]['packChoice']??'gold')))];
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
    $chatText=implode(', ', $names).' entered the battle and will skip this turn.';
    $room['chat'][]=['system'=>true,'text'=>$chatText,'at'=>time()];
    $room['chat']=array_slice($room['chat'],-80);
  }
  return $added;
}
function reindex_players(&$room){
  foreach(($room['players']??[]) as $i=>$p){ $room['players'][$i]['slot']=$i; }
  if(!empty($room['participants']) && is_array($room['participants'])){ foreach($room['participants'] as $i=>$p){ $room['participants'][$i]['slot']=$i; } }
}
function normalize_running_turn(&$state,&$room,$forceClearShot=false,$reason='roster changed'){
  if(($room['state']??'')!=='running') return false;
  $parts=room_participants($room);
  $count=count($parts);
  if($count<=0) return false;
  $changed=false;
  $turn=intval($room['turn']??0);
  if($turn<0 || $turn>=$count){ $turn=0; $changed=true; }
  $rid=$room['id']??'';
  $active=$parts[$turn]??null;
  if($active && empty($active['bot'])){
    $aid=$active['clientId']??'';
    $valid=$aid!=='' && !empty($state['clients'][$aid]) && (($state['clients'][$aid]['roomId']??'')===$rid) && empty($state['clients'][$aid]['spectating']);
    if(!$valid){
      $start=$turn;
      $guard=0;
      do{
        $turn=($turn+1)%$count;
        $cand=$parts[$turn]??null;
        if(!$cand) continue;
        if(!empty($cand['bot'])) break;
        $cid=$cand['clientId']??'';
        if($cid!=='' && !empty($state['clients'][$cid]) && (($state['clients'][$cid]['roomId']??'')===$rid) && empty($state['clients'][$cid]['spectating'])) break;
      }while(++$guard<$count && $turn!==$start);
      $changed=true;
    }
  }
  if($room['turn']!==$turn){ $room['turn']=$turn; $changed=true; }
  if($forceClearShot || $changed){
    $room['turnPhase']='idle';
    $room['turnToken']=intval($room['turnToken']??0)+1;
    $room['lastFinishedTurnToken']=-1;
    $room['turnStartedAt']=time();
    if(is_array($room['latestState']??null)){
      $room['latestState']['turn']=intval($room['turn']??0);
      $room['latestState']['busy']=false;
      $room['latestState']['roundLeft']=intval($room['turnLength']??120);
    }
    $parts=room_participants($room);
    add_event($state,$room,'stateSync',['state'=>$room['latestState']??null,'turn'=>intval($room['turn']??0),'turnToken'=>intval($room['turnToken']??0),'room'=>public_room($room),'activeClientId'=>($parts[intval($room['turn']??0)]['clientId']??null),'recoverReason'=>$reason]);
    return true;
  }
  return false;
}
function recover_client_into_room(&$state,&$room,$cid){
  if(empty($state['clients'][$cid]) || empty($room['id'])) return false;
  $client=&$state['clients'][$cid];
  $name=clean_text($client['name']??'Pilot',20); if($name==='') $name='Pilot';
  $choice=clean_pack_choice($client['packChoice']??'gold');
  $label=clean_pack_label($client['packLabel']??'', $choice);
  foreach(($room['players']??[]) as &$p){ if(($p['clientId']??'')===$cid){ $client['roomId']=$room['id']; $client['spectating']=false; $client['lateQueued']=false; $p['packChoice']=$choice; $p['packLabel']=$label; return true; } } unset($p);
  foreach(($room['participants']??[]) as &$p){
    $wasBot=!empty($p['bot']);
    $matchesOld=(($p['originalClientId']??'')===$cid) || (($p['originalName']??'')===$name) || ($wasBot && (($p['name']??'')===$name.' Bot'));
    if($matchesOld){
      $p['clientId']=$cid; $p['name']=$name; $p['bot']=false; $p['ready']=true; $p['rejoinedAt']=time(); $p['packChoice']=$choice; $p['packLabel']=$label;
      $exists=false; foreach(($room['players']??[]) as $pl){ if(($pl['clientId']??'')===$cid){ $exists=true; break; } }
      if(!$exists){ $room['players'][]=['clientId'=>$cid,'name'=>$name,'slot'=>count($room['players']??[]),'ready'=>true,'bot'=>false,'packChoice'=>$choice,'packLabel'=>$label]; }
      $client['roomId']=$room['id']; $client['spectating']=false; $client['lateQueued']=false; reindex_players($room); return true;
    }
  } unset($p);
  return false;
}


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
function remove_participant_now(&$state,&$room,$target,$reason='left'){
  $target=clean_id($target);
  if(!$target) return false;
  $rid=$room['id']??'';
  $wasActive=false; $name='Pilot';
  $parts=room_participants($room);
  $active=$parts[intval($room['turn']??0)]??null;
  if($active && ($active['clientId']??'')===$target) $wasActive=true;
  foreach($parts as $p){ if(($p['clientId']??'')===$target){ $name=$p['name']??$name; break; } }
  if(isset($state['clients'][$target])){
    $state['clients'][$target]['roomId']=null;
    $state['clients'][$target]['spectating']=false;
    $state['clients'][$target]['lateQueued']=false;
  }
  $room['players']=array_values(array_filter($room['players']??[],function($p)use($target){return ($p['clientId']??'')!==$target;}));
  $room['participants']=array_values(array_filter($room['participants']??[],function($p)use($target){return ($p['clientId']??'')!==$target;}));
  if(isset($room['spectators'][$target])) unset($room['spectators'][$target]);
  if(isset($room['lateJoiners'][$target])) unset($room['lateJoiners'][$target]);
  reindex_players($room);
  $parts=room_participants($room);
  if(($room['hostId']??'')===$target && count($room['players']??[])>0) $room['hostId']=$room['players'][0]['clientId'];
  $room['chat'][]=['system'=>true,'text'=>$name.' '.$reason.'.','at'=>time()];
  $room['chat']=array_slice($room['chat'],-80);
  if(count($parts)<=0) return true;
  if($wasActive){
    // v0.7.86 GOLD: clicked-leave/kick removes the slot, but only this validated server path may skip forward.
    // Random clients and timeout recovery are not allowed to advance turns.
    normalize_running_turn($state,$room,true,'active player '.$reason);
  } else {
    add_event($state,$room,'room',['room'=>public_room($room),'chat'=>$room['chat']]);
  }
  return true;
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

  // v0.7.86 GOLD: clicked Leave / Reset / timeout removes the player from the running match.
  // Do not bot-replace or auto-fire from another client here; that branch caused skipped turns.
  if(($room['state']??'')==='running'){
    remove_participant_now($state,$room,$cid,$reason);
    if(count(room_participants($room))===0){ unset($state['rooms'][$rid]); return; }
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
    if(!isset($state['rooms'][$rid])) continue;
    if(($state['rooms'][$rid]['state']??'')==='running') normalize_running_turn($state,$state['rooms'][$rid],false,'active player unavailable');
    $r=$state['rooms'][$rid];
    if((count($r['players'])===0 && ($r['state']??'lobby')!=='running' && $now-($r['emptyAt']??$r['updatedAt'])>$EMPTY_ROOM_SECONDS) || ($now-($r['updatedAt']??$now)>$ROOM_IDLE_SECONDS)) unset($state['rooms'][$rid]);
  }
}
function response($ok,$extra=[]){ echo json_encode(array_merge(['ok'=>$ok],$extra), JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE); exit; }

$in=input_json(); $action=$in['action'] ?? 'poll'; $cid=clean_id($in['clientId'] ?? ''); $lastSeq=intval($in['lastSeq'] ?? 0);
$fp=fopen($STATE_FILE,'c+'); if(!$fp) response(false,['message'=>'Could not open multiplayer data file. Check folder permissions.']);
flock($fp, LOCK_EX); $raw=stream_get_contents($fp); $state=json_decode($raw,true); normalize_state($state);
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
  case 'recoverRoom':
    $rid=clean_id($in['roomId']??'');
    if($rid==='' || empty($state['rooms'][$rid])){ $message='Room could not be recovered.'; break; }
    $room=&$state['rooms'][$rid];
    if(recover_client_into_room($state,$room,$cid)){
      $room['chat'][]=['system'=>true,'text'=>($client['name']?:'Pilot').' reconnected.','at'=>time()];
      $room['chat']=array_slice($room['chat'],-$MAX_ROOM_CHAT);
      normalize_running_turn($state,$room,false,'player reconnected');
      add_event($state,$room,'room',['room'=>public_room($room),'chat'=>$room['chat']]);
      $message='Reconnected to room.';
      break;
    }
    if(($room['state']??'')==='running'){
      if(!empty($room['allowLateJoin']) && active_human_count($room) + queued_late_count($room) < intval($room['maxPlayers']??$MAX_HUMANS)){
        $client['roomId']=$rid; $client['spectating']=true; $client['lateQueued']=true;
        $room['spectators']=$room['spectators']??[]; $room['lateJoiners']=$room['lateJoiners']??[];
        $room['spectators'][$cid]=['id'=>$cid,'name'=>$client['name']?:'Pilot','at'=>time(),'lateJoin'=>true,'queued'=>true,'packChoice'=>$client['packChoice']??'gold','packLabel'=>$client['packLabel']??'Default + My Weapons'];
        $room['lateJoiners'][$cid]=['id'=>$cid,'clientId'=>$cid,'name'=>$client['name']?:'Pilot','at'=>time(),'packChoice'=>$client['packChoice']??'gold','packLabel'=>$client['packLabel']??'Default + My Weapons'];
        $room['chat'][]=['system'=>true,'text'=>($client['name']?:'Pilot').' reconnected late and will enter after this turn.','at'=>time()];
        $room['chat']=array_slice($room['chat'],-$MAX_ROOM_CHAT);
        add_event($state,$room,'lateJoinQueued',['room'=>public_room($room),'chat'=>$room['chat'],'name'=>$client['name']?:'Pilot']);
        $message='Rejoined as late queue.';
      } else $message='Room is running and late join is disabled.';
      break;
    }
    if(count($room['players']) < $room['maxPlayers']){
      $client['roomId']=$rid; $client['spectating']=false; $client['lateQueued']=false;
      $room['players'][]=['clientId'=>$cid,'name'=>$client['name']?:'Pilot','slot'=>count($room['players']),'ready'=>false,'bot'=>false,'packChoice'=>$client['packChoice']??'gold','packLabel'=>$client['packLabel']??'Default + My Weapons'];
      $room['chat'][]=['system'=>true,'text'=>($client['name']?:'Pilot').' rejoined.','at'=>time()];
      $room['chat']=array_slice($room['chat'],-$MAX_ROOM_CHAT);
      add_event($state,$room,'room',['room'=>public_room($room),'chat'=>$room['chat']]);
      $message='Rejoined room.';
    }
    break;
  case 'createRoom':
    if(empty($client['name'])) { flock($fp,LOCK_UN); fclose($fp); response(false,['message'=>'Set a name first.']); }
    $client['packChoice']=clean_pack_choice($in['packChoice']??($client['packChoice']??'gold')); $client['packLabel']=clean_pack_label($in['packLabel']??($client['packLabel']??''), $client['packChoice']);
    leave_room($state,$cid,'changed rooms');
    $roomName=clean_text($in['name'] ?? ($client['name'].' Game'), 32); if($roomName==='') $roomName=$client['name'].' Game';
    $bad=unsafe_name($roomName); if($bad){ $message=$bad; break; }
    $rid=safe_id('room');
    $room=['id'=>$rid,'name'=>$roomName,'hostId'=>$cid,'locked'=>false,'state'=>'lobby','maxPlayers'=>clamp_int($in['maxPlayers']??4,1,$MAX_HUMANS),'bots'=>clamp_int($in['bots']??0,0,$MAX_BOTS),'turnLength'=>clamp_int($in['turnLength']??120,20,120),'physics'=>(($in['physics']??'bounce')==='teleport'?'teleport':'bounce'),'allowLateJoin'=>!empty($in['allowLateJoin']),'allowSpectators'=>!empty($in['allowSpectators']),'modSettings'=>sanitize_mod_settings($in['modSettings']??[]),'seed'=>safe_id('seed'),'turn'=>0,'turnPhase'=>'idle','turnToken'=>0,'turnStartedAt'=>time(),'players'=>[], 'participants'=>[], 'spectators'=>[], 'lateJoiners'=>[], 'chat'=>[], 'events'=>[], 'latestState'=>null, 'createdAt'=>time(), 'updatedAt'=>time()];
    $state['rooms'][$rid]=$room; $client['roomId']=$rid;
    $state['rooms'][$rid]['players'][]=['clientId'=>$cid,'name'=>$client['name'],'slot'=>0,'ready'=>false,'bot'=>false,'packChoice'=>$client['packChoice']??'gold','packLabel'=>$client['packLabel']??'Default + My Weapons'];
    $state['rooms'][$rid]['chat'][]=['system'=>true,'text'=>$client['name'].' created the room.','at'=>time()];
    add_event($state,$state['rooms'][$rid],'room',['room'=>public_room($state['rooms'][$rid]),'chat'=>$state['rooms'][$rid]['chat']]);
    break;
  case 'joinRoom':
    $rid=clean_id($in['roomId'] ?? '');
    if(empty($client['name'])) { $message='Set a name first.'; break; }
    $client['packChoice']=clean_pack_choice($in['packChoice']??($client['packChoice']??'gold')); $client['packLabel']=clean_pack_label($in['packLabel']??($client['packLabel']??''), $client['packChoice']);
    if(empty($state['rooms'][$rid])) { $message='Room not found.'; break; }
    if(!empty($state['rooms'][$rid]['banned'][$cid])) { $message='You are not allowed in that room.'; break; }
    if(($state['rooms'][$rid]['state']??'')!=='lobby' && empty($state['rooms'][$rid]['allowLateJoin'])) { $message='That game already started.'; break; }
    $room=&$state['rooms'][$rid];
    if(($room['state']??'')==='running'){
      // v0.7.86 GOLD: late joiners wait in a poker-style queue. They spectate the current cycle,
      // then enter at the next cycle boundary without stealing an existing player slot.
      if(active_human_count($room) + queued_late_count($room) >= intval($room['maxPlayers']??$MAX_HUMANS)) { $message='That game is full.'; break; }
      leave_room($state,$cid,'changed rooms');
      $client['roomId']=$rid; $client['spectating']=true; $client['lateQueued']=true;
      $room['spectators']=$room['spectators']??[];
      $room['lateJoiners']=$room['lateJoiners']??[];
      $room['spectators'][$cid]=['id'=>$cid,'name'=>$client['name'],'at'=>time(),'lateJoin'=>true,'queued'=>true,'packChoice'=>$client['packChoice']??'gold','packLabel'=>$client['packLabel']??'Default + My Weapons'];
      $room['lateJoiners'][$cid]=['id'=>$cid,'clientId'=>$cid,'name'=>$client['name'],'at'=>time(),'packChoice'=>$client['packChoice']??'gold','packLabel'=>$client['packLabel']??'Default + My Weapons'];
      $room['chat'][]=['system'=>true,'text'=>$client['name'].' has joined late and will enter after this turn, then skip their first turn.','at'=>time()];
      $room['chat']=array_slice($room['chat'],-$MAX_ROOM_CHAT);
      add_event($state,$room,'lateJoinQueued',['room'=>public_room($room),'chat'=>$room['chat'],'name'=>$client['name']]);
      break;
    }
    if(count($room['players']) >= $room['maxPlayers']) { $message='That game is full.'; break; }
    leave_room($state,$cid,'changed rooms');
    $client['roomId']=$rid; $client['spectating']=false;
    $newPlayer=['clientId'=>$cid,'name'=>$client['name'],'slot'=>count($room['players']),'ready'=>false,'bot'=>false,'packChoice'=>$client['packChoice']??'gold','packLabel'=>$client['packLabel']??'Default + My Weapons'];
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
  case 'setPlayerPack':
    $choice=clean_pack_choice($in['packChoice']??($client['packChoice']??'gold'));
    $label=clean_pack_label($in['packLabel']??($client['packLabel']??''), $choice);
    $client['packChoice']=$choice; $client['packLabel']=$label;
    $rid=$client['roomId']??'';
    if(!empty($state['rooms'][$rid])){
      $room=&$state['rooms'][$rid];
      foreach(['players','participants'] as $bucket){
        if(!empty($room[$bucket]) && is_array($room[$bucket])){
          foreach($room[$bucket] as &$p){
            if(empty($p['bot']) && ($p['clientId']??'')===$cid){ $p['packChoice']=$choice; $p['packLabel']=$label; }
          }
          unset($p);
        }
      }
      if(!empty($room['spectators'][$cid])){ $room['spectators'][$cid]['packChoice']=$choice; $room['spectators'][$cid]['packLabel']=$label; }
      if(!empty($room['lateJoiners'][$cid])){ $room['lateJoiners'][$cid]['packChoice']=$choice; $room['lateJoiners'][$cid]['packLabel']=$label; }
      $room['chat'][]=['system'=>true,'text'=>($client['name']?:'Pilot').' set weapon pack: '.$label.'.','at'=>time()];
      $room['chat']=array_slice($room['chat'],-$MAX_ROOM_CHAT);
      add_event($state,$room,'room',['room'=>public_room($room),'chat'=>$room['chat']]);
    }
    $message='Weapon pack set to '.$label.'.';
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
    $rid=$client['roomId']??''; if(!empty($state['rooms'][$rid])){ $room=&$state['rooms'][$rid]; if($room['hostId']!==$cid) $message='Only the host can start.'; else if(count($room['players']) + intval($room['bots']) < 2) $message='Need at least 2 total players/bots.'; else { $room['participants']=build_participants($room); $room['state']='running'; $room['locked']=true; $room['turn']=random_int(0, max(0,count($room['participants'])-1)); $room['turnPhase']='idle'; $room['turnToken']=0; $room['lastFinishedTurnToken']=-1; $room['turnStartedAt']=time(); $room['seed']=safe_id('seed'); $room['latestState']=null; add_event($state,$room,'startGame',['room'=>public_room($room),'warning'=>'Never share personal information or private contact details.']); } }
    break;
  case 'shot':
    $rid=$client['roomId']??''; if(!empty($state['rooms'][$rid])){ $room=&$state['rooms'][$rid]; $parts=room_participants($room); $active=$parts[$room['turn']]??null; if($room['state']!=='running') $message='Room is not running.'; else if(!$active || !empty($active['bot']) || ($active['clientId']??'')!==$cid) $message='It is not your turn.'; else if(($room['turnPhase']??'idle')==='shot') $message='Shot already in flight.'; else { $room['turnPhase']='shot'; $room['turnToken']=intval($room['turnToken']??0)+1; $room['lastFinishedTurnToken']=-1; add_event($state,$room,'shot',['from'=>$cid,'slot'=>$room['turn'],'turnToken'=>$room['turnToken'],'room'=>public_room($room),'input'=>$in['input']??new stdClass()]); } }
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
        // v0.7.86 GOLD: turn finish is server-authoritative.  Clients may lag, tab out, or disagree
        // about their local next turn, so only the server's current turn/shot token can advance.
        $finishToken = (isset($in['turnToken']) && is_numeric($in['turnToken'])) ? intval($in['turnToken']) : intval($room['turnToken']??0);
        $currentToken = intval($room['turnToken']??0);
        if($finishToken !== $currentToken){ $message='Stale turn finish ignored.'; break; }
        if(intval($room['lastFinishedTurnToken']??-1) === $currentToken){ $message='Duplicate turn finish ignored.'; break; }
        $room['lastFinishedTurnToken']=$currentToken;
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
        // v0.7.86 GOLD: late joiners enter on the NEXT available turn update, not the next full cycle.
        // They are appended to the roster after the current shot resolves, while $next keeps pointing to
        // the already-scheduled existing player. Because new players are appended after $next is chosen,
        // their first possible turn is skipped and they join the following rotation cleanly.
        $lateText='';
        if(!empty($room['lateJoiners'])){
          $added=commit_late_joiners($state,$room,$lateText);
          if(count($added)){
            add_event($state,$room,'lateJoinCommit',['room'=>public_room($room),'chat'=>$room['chat'],'added'=>array_map('public_participant',$added),'message'=>$lateText]);
          }
        }
        $parts=room_participants($room);
        if($next>=count($parts)) $next=0;
        $room['turn']=$next;
        if(is_array($room['latestState'])){
          $room['latestState']['turn']=$room['turn'];
          $room['latestState']['roundLeft']=intval($room['turnLength']??120);
          $room['latestState']['busy']=false;
          $room['latestState']['ended']=!empty($room['latestState']['ended']);
        }
        $room['turnStartedAt']=time();
        add_event($state,$room,'stateSync',['state'=>$room['latestState'],'turn'=>$room['turn'],'turnToken'=>$room['turnToken'],'room'=>public_room($room),'activeClientId'=>($parts[$room['turn']]['clientId']??null)]);
      }
    }
    break;
  case 'gameOver':
    $rid=$client['roomId']??''; if(!empty($state['rooms'][$rid])){ $room=&$state['rooms'][$rid]; add_event($state,$room,'roomEnded',['message'=>clean_text($in['title']??'Game over. Room closed.',80)]); clear_room_clients($state,$room); unset($state['rooms'][$rid]); }
    break;
  case 'kickPlayer':
    $rid=$client['roomId']??''; $target=clean_id($in['targetId']??'');
    if(!empty($state['rooms'][$rid])){
      $room=&$state['rooms'][$rid];
      if($room['hostId']!==$cid){ $message='Only the host can kick players.'; }
      else {
        $tname='Pilot'; $wasActive=false;
        $active=room_participants($room)[intval($room['turn']??0)]??null;
        if($active && ($active['clientId']??'')===$target) $wasActive=true;
        foreach(($room['players']??[]) as $p){ if(($p['clientId']??'')===$target) $tname=$p['name']??'Pilot'; }
        if(isset($state['clients'][$target])){ $state['clients'][$target]['roomId']=null; $state['clients'][$target]['spectating']=false; $state['clients'][$target]['lateQueued']=false; }
        $room['players']=array_values(array_filter($room['players']??[],function($p)use($target){return ($p['clientId']??'')!==$target;}));
        $room['participants']=array_values(array_filter($room['participants']??[],function($p)use($target){return ($p['clientId']??'')!==$target;}));
        if(isset($room['spectators'][$target])) unset($room['spectators'][$target]);
        if(isset($room['lateJoiners'][$target])) unset($room['lateJoiners'][$target]);
        reindex_players($room);
        if(($room['state']??'')==='running' && count(room_participants($room))>0){ normalize_running_turn($state,$room,$wasActive,'player kicked'); }
        $room['chat'][]=['system'=>true,'text'=>$tname.' was removed by the host.','at'=>time()];
        $room['chat']=array_slice($room['chat'],-$MAX_ROOM_CHAT);
        add_event($state,$room,'room',['room'=>public_room($room),'chat'=>$room['chat']]);
      }
    }
    break;
  case 'banPlayer':
    $rid=$client['roomId']??''; $target=clean_id($in['targetId']??'');
    if(!empty($state['rooms'][$rid])){
      $room=&$state['rooms'][$rid];
      if($room['hostId']!==$cid){ $message='Only the host can ban players.'; }
      else {
        $room['banned']=$room['banned']??[]; if($target) $room['banned'][$target]=time();
        $wasActive=false; $active=room_participants($room)[intval($room['turn']??0)]??null; if($active && ($active['clientId']??'')===$target) $wasActive=true;
        if(isset($state['clients'][$target])){ $state['clients'][$target]['roomId']=null; $state['clients'][$target]['spectating']=false; $state['clients'][$target]['lateQueued']=false; }
        $room['players']=array_values(array_filter($room['players']??[],function($p)use($target){return ($p['clientId']??'')!==$target;}));
        $room['participants']=array_values(array_filter($room['participants']??[],function($p)use($target){return ($p['clientId']??'')!==$target;}));
        if(isset($room['spectators'][$target])) unset($room['spectators'][$target]);
        if(isset($room['lateJoiners'][$target])) unset($room['lateJoiners'][$target]);
        reindex_players($room);
        if(($room['state']??'')==='running' && count(room_participants($room))>0){ normalize_running_turn($state,$room,$wasActive,'player banned'); }
        $room['chat'][]=['system'=>true,'text'=>'A player was banned by the host.','at'=>time()];
        $room['chat']=array_slice($room['chat'],-$MAX_ROOM_CHAT);
        add_event($state,$room,'room',['room'=>public_room($room),'chat'=>$room['chat']]);
      }
    }
    break;
  case 'hostTerrain':
    $rid=$client['roomId']??''; $kind=clean_text($in['kind']??'clear',20); $count=clamp_int($in['count']??8,1,20); if(!empty($state['rooms'][$rid])){ $room=&$state['rooms'][$rid]; if($room['hostId']!==$cid){$message='Only the host can change terrain.';} else { if(isset($in['state'])) $room['latestState']=$in['state']; if(is_array($room['latestState'])){ $room['latestState']['turn']=intval($room['turn']??0); $room['latestState']['busy']=false; } $room['turnToken']=intval($room['turnToken']??0)+1; $room['chat'][]=['system'=>true,'text'=>'Host terrain action: '.$kind.($kind==='generate'?' x'.$count:'').'.','at'=>time()]; add_event($state,$room,'stateSync',['state'=>$room['latestState'],'turn'=>$room['turn'],'turnToken'=>$room['turnToken'],'room'=>public_room($room),'activeClientId'=>($room['participants'][$room['turn']]['clientId']??null),'terrainKind'=>$kind,'terrainCount'=>$count]); } }
    break;
  case 'spectateRoom':
    $rid=clean_id($in['roomId'] ?? ''); if(empty($client['name'])) { $message='Set a name first.'; break; } if(empty($state['rooms'][$rid])) { $message='Room not found.'; break; } $room=&$state['rooms'][$rid]; if(empty($room['allowSpectators'])){ $message='Spectating is disabled for this room.'; break; } leave_room($state,$cid,'changed rooms'); $client['roomId']=$rid; $client['spectating']=true; $room['spectators']=$room['spectators']??[]; $room['spectators'][$cid]=['id'=>$cid,'name'=>$client['name'],'at'=>time()]; $room['chat'][]=['system'=>true,'text'=>$client['name'].' is spectating.','at'=>time()]; add_event($state,$room,'room',['room'=>public_room($room),'chat'=>$room['chat']]);
    break;
  case 'chat':
    $text=clean_chat($in['text']??''); if($text!==''){ $rid=$client['roomId']??''; if($rid && !empty($state['rooms'][$rid])){ $room=&$state['rooms'][$rid]; $room['chat'][]=['clientId'=>$cid,'name'=>$client['name']?:'Pilot','text'=>$text,'at'=>time()]; $room['chat']=array_slice($room['chat'],-$MAX_ROOM_CHAT); add_event($state,$room,'chat',['scope'=>'room','chat'=>$room['chat']]); } else { $state['lobbyChat'][]=['clientId'=>$cid,'name'=>$client['name']?:'Pilot','text'=>$text,'at'=>time()]; $state['lobbyChat']=array_slice($state['lobbyChat'],-$MAX_LOBBY_CHAT); } }
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
