const assert=require('assert');
const http=require('http');
const {spawn}=require('child_process');
const {WebSocket}=require('ws');
const port=32579;
const child=spawn(process.execPath,['server.js'],{cwd:process.cwd(),env:{...process.env,PORT:String(port)}});
let output='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);
async function get(route){return await new Promise((resolve,reject)=>http.get({host:'127.0.0.1',port,path:route},r=>{let b='';r.on('data',d=>b+=d);r.on('end',()=>resolve({status:r.statusCode,body:b}))}).on('error',reject))}
async function until(f,timeout=7000){const start=Date.now();while(Date.now()-start<timeout){try{const x=await f();if(x)return x;}catch{}await new Promise(r=>setTimeout(r,100));}throw Error('timeout')}
function client(){return new Promise((resolve,reject)=>{let sock=new WebSocket(`ws://127.0.0.1:${port}`);let events=[];sock.on('open',()=>resolve({sock,events,send:m=>sock.send(JSON.stringify(m))}));sock.on('message',d=>{events.push(JSON.parse(d.toString()))});sock.on('error',reject)})}
(async()=>{
 await until(async()=> (await get('/health')).status===200);
 assert.equal((await get('/')).status,200);
 assert.equal((await get('/api/public-config')).status,200);
 assert.equal(JSON.parse((await get('/api/public-config')).body).supabasePublishableKey,'');
 const a=await client(), b=await client();
 const squad=Array.from({length:6},(_,i)=>({name:'TEST '+i,power:75,attack:76,defense:73,set:71,id:'k'+i}));
 a.send({type:'create',name:'FRIEND',squad});
 const room=await until(()=>a.events.find(m=>m.type==='room'));
 assert.match(room.code,/^[0-9A-F]{6}$/);assert.equal(room.youIndex,0);
 b.send({type:'join',name:'FRIEND',code:room.code,squad});
 await until(()=>b.events.some(m=>m.type==='room'));
 assert.equal(b.events.find(m=>m.type==='room').youIndex,1);
 a.send({type:'ready',ready:true});b.send({type:'ready',ready:true});
 await until(()=>a.events.some(m=>m.type==='start')&&b.events.some(m=>m.type==='start'));
 await until(()=>a.events.some(m=>m.type==='rally')&&b.events.some(m=>m.type==='rally'));
 const r1=a.events.find(m=>m.type==='rally'),r2=b.events.find(m=>m.type==='rally');
 assert.deepEqual(r1.score,r2.score);
 a.sock.close();b.sock.close();
 console.log('PASS: health, static index, safe config, create/join, distinct player indices, dual ready, synchronised rally');
})().catch(e=>{console.error(e);console.error(output);process.exitCode=1}).finally(()=>child.kill());
