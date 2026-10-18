const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer, WebSocket } = require('ws');
const PORT = process.env.PORT || 3000;
const root = path.join(__dirname,'public');
const types = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png'};
const server = http.createServer((req,res)=>{
 if (req.url?.split('?')[0] === '/health') {
   res.writeHead(200, {'Content-Type':'application/json','Cache-Control':'no-store'});
   res.end(JSON.stringify({ok:true,service:'spike-legends'})); return;
 }
 if (req.url?.split('?')[0] === '/api/public-config') {
   res.writeHead(200, {'Content-Type':'application/json','Cache-Control':'no-store'});
   res.end(JSON.stringify({
     supabaseUrl: process.env.SUPABASE_URL || '',
     supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || ''
   })); return;
 }
 let pathname;
 try {pathname = decodeURIComponent((req.url||'/').split('?')[0])} catch {res.writeHead(400);res.end('Bad request');return}

 const file = path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end('Forbidden');return}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(data)});
});
const wss = new WebSocketServer({server, maxPayload: 12000});
const rooms = new Map();
function send(ws,obj){if(ws&&ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(obj))}
function both(room,obj){room.players.forEach(p=>send(p.ws,obj))}
const safeName=x=>String(x||'PLAYER').replace(/[^\w \-]/g,'').trim().slice(0,18)||'PLAYER';
const sanitizeSquad = squad => Array.isArray(squad)?squad.slice(0,6).map(x=>({name:String(x.name||'Unknown').slice(0,40),power:Math.max(35,Math.min(99,Number(x.power)||65)),attack:Math.max(1,Math.min(99,Number(x.attack)||60)),defense:Math.max(1,Math.min(99,Number(x.defense)||60)),set:Math.max(1,Math.min(99,Number(x.set)||60)),id:String(x.id||'').slice(0,80)})):[];
function broadcastState(room){
 room.players.forEach((player,i)=>send(player.ws,{
  type:'room',code:room.code,youIndex:i,
  players:room.players.map(p=>({name:p.name,ready:p.ready,power:Math.round(p.squad.reduce((s,x)=>s+x.power,0)/Math.max(1,p.squad.length))})),status:room.status
 }));
}
function makeCode(){let v;do{v=crypto.randomBytes(5).toString('hex').slice(0,6).toUpperCase()}while(rooms.has(v));return v}
function chooseRally(room){
 const a=room.players[0],b=room.players[1];const strength = p => p.squad.reduce((sum,x)=>sum+(x.attack*.42+x.defense*.35+x.set*.23),0)/Math.max(1,p.squad.length);
 const diff=Math.max(-25,Math.min(25,strength(a)-strength(b)));
 const winner=Math.random() < .5+diff*.008 ? 0:1;
 const actions=['THUNDER SPIKE','QUICK ATTACK','PERFECT BLOCK','CROSS COURT','SERVICE ACE','MIRACLE DIG','BACK ROW ATTACK'];
 const squad=room.players[winner].squad;const actor=squad[Math.floor(Math.random()*squad.length)]?.name||'Unknown';
 room.score[winner]++;room.rally++;
 const event={type:'rally',rally:room.rally,winner,score:[...room.score],actor,action:actions[Math.floor(Math.random()*actions.length)]};
 both(room,event);
 const done=(Math.max(...room.score)>=15&&Math.abs(room.score[0]-room.score[1])>=2)||room.rally>=39;
 if(done){room.status='finished';const resultWinner=room.score[0]>room.score[1]?0:1;both(room,{type:'finish',winner:resultWinner,score:[...room.score]});clearInterval(room.timer);room.timer=null;}
}
function leaveRoom(ws){const room=rooms.get(ws.roomCode);if(!room)return;room.players=room.players.filter(p=>p.ws!==ws);if(room.timer)clearInterval(room.timer);room.timer=null;room.status='waiting';room.players.forEach(p=>p.ready=false);if(!room.players.length)rooms.delete(room.code);else {broadcastState(room);both(room,{type:'notice',text:'Opponent left. Match cancelled.'})}ws.roomCode=null}
wss.on('connection',ws=>{
 ws.on('message',raw=>{let m;try{m=JSON.parse(raw)}catch{return}try{
  if(m.type==='create'||m.type==='join'){
   leaveRoom(ws);
   const code=m.type==='create'?makeCode():String(m.code||'').trim().toUpperCase();
   let room=rooms.get(code);
   if(m.type==='join'&&(!room||room.players.length>=2||room.status!=='waiting')){send(ws,{type:'error',text:'Room not found or unavailable.'});return}
   if(!room){room={code,players:[],status:'waiting',timer:null,score:[0,0],rally:0};rooms.set(code,room)}
   const squad=sanitizeSquad(m.squad);
   if(squad.length!==6){send(ws,{type:'error',text:'Fill all six squad slots before joining.'});return}
   room.players.push({ws,name:safeName(m.name),ready:false,squad});ws.roomCode=code;ws.playerIndex=room.players.length-1;broadcastState(room);return;
  }
  const room=rooms.get(ws.roomCode);if(!room)return;
  const player=room.players.find(p=>p.ws===ws);if(!player)return;
  if(m.type==='ready'&&room.status==='waiting'){player.ready=!!m.ready;broadcastState(room);if(room.players.length===2&&room.players.every(p=>p.ready)){
   room.status='playing';room.score=[0,0];room.rally=0;both(room,{type:'start',players:room.players.map(p=>({name:p.name,squad:p.squad})),score:room.score});
   room.timer=setInterval(()=>chooseRally(room),1250);
  }}
  if(m.type==='rematch'&&room.status==='finished'){room.status='waiting';room.players.forEach(p=>p.ready=false);broadcastState(room)}
  if(m.type==='leave')leaveRoom(ws);
 }catch(e){send(ws,{type:'error',text:'Unexpected server error.'});console.error(e)}});
 ws.on('close',()=>leaveRoom(ws));
});
server.listen(PORT,'0.0.0.0',()=>console.log(`Spike Legends running at http://localhost:${PORT}`));

// Keep stale TCP/WebSocket connections from occupying duel rooms forever.
const heartbeat=setInterval(()=>{
 for (const client of wss.clients) {
   if (client.isAlive === false) { client.terminate(); continue; }
   client.isAlive=false;
   client.ping();
 }
},25000);
heartbeat.unref();
wss.on('connection',socket=>{
 socket.isAlive=true;
 socket.on('pong',()=>{socket.isAlive=true});
});
