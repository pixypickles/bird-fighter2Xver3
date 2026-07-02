
const cvs=document.getElementById("game"),ctx=cvs.getContext("2d");
const W=960,H=540,G=420;
const imgs={};
for(const [k,v] of Object.entries({
 idle:"idle.webp",kick1:"kick1.webp",kick2:"kick2.webp",kick3:"kick3.webp",
 special:"special.webp",throw:"throw.webp",down:"down.webp",
 superCharge:"super_charge.webp",superDash:"super_dash.webp"
})){imgs[k]=new Image();imgs[k].src=v;}

const input={left:false,right:false,guard:false,jumpUp:false,jumpBack:false,jumpForward:false,throw:false,kick:false,special:false};
const pressed={throw:false,kick:false,special:false};
const keyMap={a:"left",d:"right",s:"guard",w:"jumpUp",q:"jumpBack",e:"jumpForward",f:"throw",g:"kick",h:"special",ArrowLeft:"left",ArrowRight:"right",ArrowDown:"guard",ArrowUp:"jumpUp"};

function setAct(a,v){if(a in input){if(v&&!input[a]&&(a==="throw"||a==="kick"||a==="special"))pressed[a]=true;input[a]=v;}}
addEventListener("keydown",e=>{if(keyMap[e.key]){setAct(keyMap[e.key],true);e.preventDefault();}});
addEventListener("keyup",e=>{if(keyMap[e.key]){setAct(keyMap[e.key],false);e.preventDefault();}});
for(const b of document.querySelectorAll("[data-act]")){
 const a=b.dataset.act;
 const down=e=>{e.preventDefault();setAct(a,true);b.classList.add("active")};
 const up=e=>{e.preventDefault();setAct(a,false);b.classList.remove("active")};
 b.addEventListener("touchstart",down,{passive:false});b.addEventListener("touchend",up,{passive:false});b.addEventListener("touchcancel",up,{passive:false});
 b.addEventListener("mousedown",down);b.addEventListener("mouseup",up);b.addEventListener("mouseleave",up);
}
document.getElementById("start").onclick=()=>startButton();
document.getElementById("start").addEventListener("touchstart",e=>{e.preventDefault();startButton();},{passive:false});

const roster=[
 {jp:"黄バード",filter:"none",hp:120,atk:1,def:1,spd:1,meter:1,desc:"バランス"},
 {jp:"赤バード",filter:"hue-rotate(320deg) saturate(1.75)",hp:110,atk:1.18,def:.92,spd:1,meter:1,desc:"攻撃"},
 {jp:"青バード",filter:"hue-rotate(175deg) saturate(1.65)",hp:108,atk:.92,def:.96,spd:1.18,meter:1.05,desc:"速い"},
 {jp:"緑バード",filter:"hue-rotate(95deg) saturate(1.55)",hp:135,atk:.9,def:1.18,spd:.92,meter:.88,desc:"防御"},
 {jp:"黒バード",filter:"grayscale(1) brightness(.72) contrast(1.55)",hp:100,atk:1.05,def:.9,spd:1.05,meter:1.35,desc:"ゲージ"}
];
let state="select",p1Char=0,p2Char=1,round=1,timer=70,tick=0,meterTick=0,msg="",msgT=0,shake=0,freeze=0,koFlash=0,screenFlash=0,pendingKO=false;
let bullets=[],parts=[],clouds=[]; for(let i=0;i<16;i++)clouds.push({x:Math.random()*W,y:50+Math.random()*140,s:20+Math.random()*42,v:.12+Math.random()*.28});

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const grounded=p=>p.y>=G-1;
const rect=p=>({x:p.x-p.w/2,y:p.y-p.h,w:p.w,h:p.h});
const hit=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
function spark(x,y,n=14,c="#fff16a"){for(let i=0;i<n;i++)parts.push({x,y,vx:(Math.random()*2-1)*6,vy:(Math.random()*2-1)*6,l:18+Math.random()*14,c});}
function addMeter(p,n){p.meter=clamp(p.meter+n*(roster[p.char]||roster[0]).meter,0,100);}

function makeP(x,face,cpu,char){
 const c=roster[char];
 return {x,y:G,w:92,h:140,vx:0,vy:0,face,cpu,char,name:c.jp,hp:c.hp,maxHp:c.hp,meter:25,
  guard:false,atk:0,type:"",active:false,stun:0,cd:0,spcd:0,throwcd:0,wins:0,down:false,downT:0,inv:0,
  combo:0,comboT:0,guardStun:0,airSpecial:false,super:"",superT:0,superHit:false,jumpLockT:0,aiT:0,aiMode:""};
}
let p1=makeP(240,1,false,p1Char),p2=makeP(720,-1,true,p2Char);

function startButton(){ if(state==="select"){p2Char=(p1Char+1+Math.floor(Math.random()*4))%roster.length;fullReset();} else if(state==="gameover"){state="select";} else if(state==="fight")state="pause"; else if(state==="pause")state="fight"; }
function fullReset(){round=1;resetRound(true);}
function resetRound(full=false){
 let w1=full?0:p1.wins,w2=full?0:p2.wins;
 p1=makeP(240,1,false,p1Char);p2=makeP(720,-1,true,p2Char);p1.wins=w1;p2.wins=w2;
 timer=70;tick=0;meterTick=0;bullets=[];parts=[];pendingKO=false;msg="ROUND "+round;msgT=80;shake=freeze=koFlash=screenFlash=0;state="fight";
}

cvs.addEventListener("click",e=>selectClick(e));
cvs.addEventListener("touchstart",e=>{if(state==="select"){e.preventDefault();selectClick(e.touches[0]);}},{passive:false});
function selectClick(e){
 if(state!=="select")return;
 const r=cvs.getBoundingClientRect(),x=(e.clientX-r.left)*W/r.width,y=(e.clientY-r.top)*H/r.height;
 for(let i=0;i<roster.length;i++){let bx=92+i*154,by=190;if(x>bx&&x<bx+124&&y>by&&y<by+168){p1Char=i;p2Char=(i+1+Math.floor(Math.random()*4))%roster.length;fullReset();}}
}

function cpuThink(){
 const p=p2,e=p1;if(p.down||p.stun||p.super)return;
 for(const k of ["left","right","guard","jumpUp","jumpBack","jumpForward","throw","kick","special"]){} // no-op
 let d=e.x-p.x,a=Math.abs(d);p.aiT--;
 if(p.aiT<=0){let modes=["approach","retreat","jump","zone","throw","combo","super"];p.aiMode=modes[Math.floor(Math.random()*modes.length)];p.aiT=30+Math.random()*50;}
 p.ai={left:false,right:false,guard:false,jumpUp:false,jumpBack:false,jumpForward:false,throw:false,kick:false,special:false};
 const A=p.ai;
 if(p.aiMode==="super"&&p.meter>=100){A.guard=true;if(Math.random()<.12)A.special=true;}
 else if(p.aiMode==="throw"){if(a>90)A[d<0?"left":"right"]=true;if(a<105&&Math.random()<.1)A.throw=true;}
 else if(p.aiMode==="combo"){if(a>125)A[d<0?"left":"right"]=true;if(a<160&&Math.random()<.09)A.kick=true;}
 else if(p.aiMode==="retreat"){A[d<0?"right":"left"]=true;if(a>190&&Math.random()<.04)A.special=true;}
 else if(p.aiMode==="jump"){A[d<0?"left":"right"]=true;if(grounded(p)&&Math.random()<.08)A.jumpForward=true;if(!grounded(p)&&a<170&&Math.random()<.05)A.special=true;}
 else {if(a>120)A[d<0?"left":"right"]=true;if(a>170&&Math.random()<.045)A.special=true;if(a<150&&Math.random()<.05)A.kick=true;}
 if(e.atk&&a<150&&Math.random()<.32)A.guard=true;
}

function getIn(p,a){return p.cpu?(p.ai&&p.ai[a]):input[a];}
function getPressed(p,a){return p.cpu?(p.ai&&p.ai[a]&&Math.random()<.7):pressed[a];}

function startKick(p,e){
 if(p.guardStun||p.cd||p.guard||p.down||p.super)return false;
 p.face=e.x>=p.x?1:-1;
 let next=1;if(p.type==="kick"&&p.combo<3&&p.comboT>0)next=p.combo+1;else if(!p.atk&&p.comboT>0&&p.combo<3)next=p.combo+1;else if(p.atk)return false;
 p.combo=next;p.comboT=34;p.atk=next===1?20:next===2?22:28;p.type="kick";p.active=true;p.cd=next===3?38:14;msg=next===1?"KICK 1":next===2?"KICK 2":"KICK 3!";msgT=12;return true;
}
function tryThrow(p,e){
 if(p.throwcd||!grounded(p)||p.atk||p.guard||p.down||p.super)return false;
 if(Math.abs(p.x-e.x)<108&&!e.down){p.face=e.x>=p.x?1:-1;p.atk=32;p.type="throw";p.throwcd=72;e.down=true;e.downT=76;e.stun=76;e.vx=p.face*11.8;e.vy=-9.8;e.face=-p.face;e.guard=false;e.hp=clamp(e.hp-Math.round(11*roster[p.char].atk/roster[e.char].def),0,e.maxHp);addMeter(p,12);addMeter(e,8);shake=12;freeze=7;msg="THROW!";msgT=30;spark(e.x,e.y-95,34,"#ffdd44");return true;}
 msg="MISS THROW";msgT=14;p.atk=18;p.type="throw";p.throwcd=55;return true;
}
function startSuper(p,e){
 if(p.meter<100||p.down||p.atk||p.super||!grounded(p))return false;
 p.face=e.x>=p.x?1:-1;p.meter=0;p.super="charge";p.superT=28;p.superHit=false;p.type="super";p.atk=28;p.inv=65;p.guard=false;p.vx=0;freeze=4;shake=10;msg="PHOENIX CHARGE!";msgT=42;spark(p.x,p.y-96,42,"#ff3333");return true;
}
function updateSuper(p){
 if(!p.super)return false;
 if(p.super==="charge"){p.superT--;p.vx=0;if(p.superT<=0){p.super="dash";p.superT=54;p.atk=54;p.active=true;p.inv=70;p.vx=p.face*24;shake=8;msg="SUPER!";msgT=22;}return true;}
 if(p.super==="dash"){p.superT--;p.vx=p.face*24;p.x+=p.vx;if(p.x<70||p.x>W-70||p.superT<=0){p.x=clamp(p.x,70,W-70);p.super="end";p.superT=38;p.active=false;p.vx=0;p.atk=38;p.inv=16;shake=14;screenFlash=6;msg="SUPER END!";msgT=20;spark(p.x,p.y-90,40,"#ff4444");}return true;}
 if(p.super==="end"){p.superT--;p.vx=0;if(p.superT<=0){p.super="";p.type="";p.atk=0;p.active=false;p.inv=12;}return true;}
}

function control(p,e){
 if(p.down)return;
 if(p.guardStun){p.guardStun--;p.vx=0;return;}
 if(p.stun){p.stun--;return;}

 const ch=roster[p.char];
 if(p.comboT>0)p.comboT--;else if(!p.atk)p.combo=0;

 p.guard=getIn(p,"guard")&&grounded(p)&&!p.atk&&!p.super;

 let sp=(p.guard?1.25:4.35)*ch.spd;

 // 地上だけvxをリセット。空中ではリセットしない。
 // これで斜めジャンプの横速度が消えません。
 if(grounded(p)) p.vx=0;

 if(getIn(p,"left")){
   if(grounded(p)) p.vx=-sp;
   else p.vx-=0.28*ch.spd;
   if(!p.atk&&!p.super)p.face=-1;
 }
 if(getIn(p,"right")){
   if(grounded(p)) p.vx=sp;
   else p.vx+=0.28*ch.spd;
   if(!p.atk&&!p.super)p.face=1;
 }

 // ↖は画面左、↗は画面右へ確実に飛ばす。
 if((getIn(p,"jumpUp")||getIn(p,"jumpBack")||getIn(p,"jumpForward"))&&grounded(p)&&!p.guard){
   const jumpPower=-16.8;
   const side=9.2*ch.spd;
   p.vy=jumpPower;

   if(getIn(p,"jumpBack")){
     p.vx=-side;
     p.jumpLockT=18;
   }else if(getIn(p,"jumpForward")){
     p.vx=side;
     p.jumpLockT=18;
   }else{
     p.vx=0;
     p.jumpLockT=0;
   }
 }

 if(getPressed(p,"throw")){tryThrow(p,e);return;}
 if(getPressed(p,"kick")){startKick(p,e);return;}

 if(getIn(p,"guard")&&getPressed(p,"special")&&p.meter>=100){startSuper(p,e);return;}

 if(getPressed(p,"special")&&!p.atk&&!p.spcd&&!p.guard){
   let dir=e.x>=p.x?1:-1;
   p.face=dir;
   p.atk=grounded(p)?30:34;
   p.type="special";
   p.active=true;
   p.spcd=grounded(p)?86:104;
   addMeter(p,3);

   if(grounded(p)){
     bullets.push({o:p,x:p.x+dir*76,y:p.y-92,w:50,h:30,vx:dir*8.8,vy:0,life:100,big:1,ref:0});
   }else{
     p.airSpecial=true;
     p.vx=dir*8.5;
     p.vy=Math.max(p.vy,6.5);
     bullets.push({o:p,x:p.x+dir*72,y:p.y-82,w:48,h:28,vx:dir*6.2,vy:5.2,life:70,big:1,air:1,ref:0});
     msg="AIR SPECIAL!";
     msgT=20;
   }
 }
}

function physics(p){
 if(p.cd>0)p.cd--;
 if(p.spcd>0)p.spcd--;
 if(p.throwcd>0)p.throwcd--;
 if(p.inv>0)p.inv--;

 if(updateSuper(p)){p.x=clamp(p.x,55,W-55);return;}

 if(p.down){
   p.downT--;
   p.vy+=.72;
   p.x+=p.vx;
   p.y+=p.vy;
   p.vx*=.965;

   if((p.x<65&&p.vx<0)||(p.x>W-65&&p.vx>0)){
     p.x=clamp(p.x,65,W-65);
     p.vx*=-.28;
     p.vy=-5;
     shake=18;
     screenFlash=8;
     msg="WALL CRASH!";
     msgT=24;
     spark(p.x,p.y-75,46,"#fff");
   }

   if(p.y>G){p.y=G;p.vy=0;p.vx*=.86;}
   if(p.downT<=0){p.down=false;p.stun=0;p.type="";p.vx=0;p.inv=25;}
   p.x=clamp(p.x,55,W-55);
   return;
 }

 if(p.atk>0)p.atk--;
 else{p.type="";p.active=false;p.airSpecial=false;}

 p.vy+=.72;

 // 斜めジャンプ直後は横速度を維持する
 if(p.jumpLockT>0){
   p.jumpLockT--;
 }else{
   if(!grounded(p)&&!p.airSpecial)p.vx*=.992;
 }

 if(p.airSpecial)p.vx*=.995;

 p.x+=p.vx;
 p.y+=p.vy;

 if(p.y>G){
   p.y=G;
   p.vy=0;
   p.airSpecial=false;
   p.jumpLockT=0;
 }

 p.x=clamp(p.x,55,W-55);
}
function damage(t,a,n,k){
 if(t.down||t.inv)return false; n=Math.max(1,Math.round(n*roster[a.char].atk/roster[t.char].def));
 if(t.guard&&t.face===-a.face){n=Math.ceil(n*.25);k*=.45;msg="GUARD!";msgT=16;addMeter(t,4);addMeter(a,2);spark(t.x,t.y-82,8,"#99d9ff");if(a.type==="kick"&&a.combo===3){a.guardStun=32;msg="PUNISH CHANCE!";msgT=24;}t.hp=clamp(t.hp-n,0,t.maxHp);t.x+=a.face*k;return"guard";}
 t.stun=12;shake=8;freeze=4;msg="HIT!";msgT=13;spark(t.x,t.y-85,18);t.hp=clamp(t.hp-n,0,t.maxHp);t.x+=a.face*k;addMeter(a,8);addMeter(t,8);return"hit";
}
function melee(a,t){
 if(!a.atk||!a.active||a.down)return;
 if(a.type==="super"&&a.super==="dash"){let box={x:a.face>0?a.x+12:a.x-150,y:a.y-158,w:150,h:96};if(hit(box,rect(t))&&!a.superHit){a.superHit=true;t.guard=false;t.down=true;t.downT=90;t.stun=90;t.hp=clamp(t.hp-Math.round(28*roster[a.char].atk/roster[t.char].def),0,t.maxHp);if(t.hp<=0)pendingKO=true;t.vx=a.face*28;t.vy=-12;t.face=-a.face;freeze=12;shake=24;screenFlash=10;msg="PHOENIX HIT!";msgT=36;spark(t.x,t.y-95,70,"#ff3131");}return;}
 let step=a.type==="kick"?a.combo:0,range=step===3?138:step===2?94:92,h=step===3?82:54,y=step===3?a.y-166:a.y-132;
 let box={x:a.face>0?a.x+22:a.x-22-range,y,w:range,h}; if(hit(box,rect(t))){a.active=false;if(a.type==="kick"){let dmg=step===1?6:step===2?8:10,knock=step===1?16:step===2?20:76,result=damage(t,a,dmg,knock);if(step===3&&result==="hit"){t.vy=-9.5;t.vx+=a.face*8;t.stun=28;freeze=8;shake=18;msg="SUPER FINISH!";msgT=30;spark(t.x,t.y-90,46,"#ffcf35");}}else damage(t,a,10,20);}
}
function reflectBullet(b,d){b.ref++;b.o=d;b.vx=-b.vx*1.12;b.vy=b.air?-Math.abs(b.vy)*.45:b.vy;b.x=d.x+(b.vx>0?78:-78);b.life=100;addMeter(d,12);msg="REFLECT!";msgT=22;freeze=4;shake=5;spark(d.x,d.y-90,24,"#7be8ff");if(b.ref>=3)b.life=0;}
function updateBullets(){for(const b of bullets){b.x+=b.vx;b.y+=b.vy||0;b.life--;if(b.air)b.vy+=.18;let t=b.o===p1?p2:p1;if(hit(b,rect(t))){if(t.guard&&t.face===(b.vx>0?-1:1))reflectBullet(b,t);else{damage(t,b.o,b.big?11:9,36);b.life=0;addMeter(b.o,8);}}}bullets=bullets.filter(b=>b.life>0&&b.x>-120&&b.x<W+120&&b.y<H+80);}

function update(){
 clouds.forEach(c=>{c.x+=c.v;if(c.x>W+80)c.x=-80;});
 if(state!=="fight"){if(state==="roundover"){if(msgT>0)msgT--;else if(p1.wins>=2||p2.wins>=2)state="gameover";else{round++;resetRound(false);}}return;}
 if(freeze>0){freeze--;return;} meterTick++;if(meterTick>=30){meterTick=0;addMeter(p1,1);addMeter(p2,1);}
 cpuThink();control(p1,p2);control(p2,p1);physics(p1);physics(p2);
 if(!p1.atk&&!p1.down&&!p1.super)p1.face=p1.x<p2.x?1:-1;if(!p2.atk&&!p2.down&&!p2.super)p2.face=p2.x<p1.x?1:-1;
 if(hit(rect(p1),rect(p2))&&!p1.down&&!p2.down){p1.x+=p1.x<p2.x?-2:2;p2.x+=p2.x<p1.x?-2:2;}
 melee(p1,p2);melee(p2,p1);updateBullets();parts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.25;p.l--;});parts=parts.filter(p=>p.l>0);if(msgT>0)msgT--;if(++tick>=60){tick=0;timer--;}
 if(p1.hp<=0||p2.hp<=0||timer<=0){let superPlaying=p1.super||p2.super||pendingKO;if(superPlaying&&timer>0){if(!p1.super&&!p2.super){pendingKO=false;finishRound();}}else finishRound();}
 for(const k of Object.keys(pressed))pressed[k]=false;
}
function finishRound(){let w=p1.hp===p2.hp?null:(p1.hp>p2.hp?p1:p2);if(w)w.wins++;msg=w?w.name+" WIN!":"DRAW!";msgT=115;state="roundover";koFlash=22;}

function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.fill();ctx.stroke();}
function stage(){let sky=ctx.createLinearGradient(0,0,0,G);sky.addColorStop(0,"#73c9ff");sky.addColorStop(.58,"#dbf7ff");sky.addColorStop(1,"#9fd5ff");ctx.fillStyle=sky;ctx.fillRect(0,0,W,G);for(const c of clouds){ctx.fillStyle="#ffffffaa";ctx.beginPath();ctx.arc(c.x,c.y,c.s,0,7);ctx.arc(c.x+c.s*.9,c.y+7,c.s*.8,0,7);ctx.arc(c.x-c.s*.8,c.y+9,c.s*.7,0,7);ctx.fill();}ctx.fillStyle="#7fb0d0";ctx.fillRect(0,282,W,8);ctx.fillStyle="#607e92";for(let i=0;i<12;i++)ctx.fillRect(100+i*75,245+Math.sin(i)*6,10,65);let floor=ctx.createLinearGradient(0,G,0,H);floor.addColorStop(0,"#baa17e");floor.addColorStop(1,"#4e4554");ctx.fillStyle=floor;ctx.fillRect(0,G,W,H-G);ctx.strokeStyle="#4a3f42";for(let y=G+18;y<H;y+=28){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}for(let xx=0;xx<W;xx+=64){ctx.beginPath();ctx.moveTo(xx,G);ctx.lineTo(xx-28,H);ctx.stroke();}}
function fighter(p){ctx.save();ctx.translate(p.x|0,p.y|0);ctx.scale(p.face,1);ctx.filter=roster[p.char].filter;if(p.inv&&!p.down&&Math.floor(p.inv/4)%2===0)ctx.globalAlpha=.55;let img=imgs.idle,w=156,h=156,dx=-78,dy=-162;if(p.super==="charge"||p.super==="end"){img=imgs.superCharge;w=178;h=178;dx=-86;dy=-178;}else if(p.super==="dash"){img=imgs.superDash;w=245;h=116;dx=-122;dy=-140;}else if(p.down){img=imgs.down;w=210;h=145;dx=-105;dy=-126;}else if(p.atk&&p.type==="kick"){if(p.combo===2){img=imgs.kick2;w=185;h=170;dx=-88;dy=-174;}else if(p.combo===3){img=imgs.kick3;w=220;h=180;dx=-102;dy=-184;}else{img=imgs.kick1;w=190;h=160;dx=-92;dy=-165;}}else if(p.atk&&p.type==="special"){img=imgs.special;w=178;h=156;dx=-82;dy=-162;}else if(p.atk&&p.type==="throw"){img=imgs.throw;w=190;h=170;dx=-90;dy=-174;}ctx.drawImage(img,dx,dy,w,h);ctx.filter="none";ctx.globalAlpha=1;if(p.guard){ctx.strokeStyle="#87c7ff";ctx.lineWidth=6;ctx.beginPath();ctx.arc(0,-88,68,-1.25,1.25);ctx.stroke();}ctx.restore();}
function ui(){ctx.fillStyle="#0b1630";ctx.strokeStyle="#fff";ctx.lineWidth=3;rr(15,15,445,72,12);rr(500,15,445,72,12);ctx.fillStyle="#1c2b45";ctx.fillRect(105,42,330,24);ctx.fillRect(525,42,330,24);ctx.fillStyle=p1.hp<p1.maxHp*.3?"#ff4a5f":"#43e35d";ctx.fillRect(105,42,330*p1.hp/p1.maxHp,24);ctx.fillStyle=p2.hp<p2.maxHp*.3?"#ff4a5f":"#43e35d";ctx.fillRect(855-330*p2.hp/p2.maxHp,42,330*p2.hp/p2.maxHp,24);ctx.fillStyle="#222";ctx.fillRect(105,70,180,9);ctx.fillRect(675,70,180,9);ctx.fillStyle=p1.meter>=100?"#ff3333":"#ffd52e";ctx.fillRect(105,70,180*p1.meter/100,9);ctx.fillStyle=p2.meter>=100?"#ff3333":"#ffd52e";ctx.fillRect(855-180*p2.meter/100,70,180*p2.meter/100,9);ctx.fillStyle="#fff";ctx.font="bold 18px monospace";ctx.textAlign="left";ctx.fillText("1P "+p1.name,105,34);ctx.textAlign="right";ctx.fillText(p2.name+" CPU",855,34);ctx.fillStyle="#12233b";ctx.strokeStyle="#fff";rr(430,15,100,84,14);ctx.textAlign="center";ctx.fillStyle="#fff";ctx.font="bold 46px monospace";ctx.fillText(timer,480,61);ctx.font="bold 15px monospace";ctx.fillStyle="#ffd52e";ctx.fillText("ROUND "+round,480,83);}
function selectScreen(){let g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,"#1c2b48");g.addColorStop(.55,"#090d19");g.addColorStop(1,"#32182d");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.textAlign="center";ctx.fillStyle="#fff";ctx.font="bold 54px sans-serif";ctx.strokeStyle="#111";ctx.lineWidth=7;ctx.strokeText("SELECT YOUR BIRD",480,86);ctx.fillText("SELECT YOUR BIRD",480,86);ctx.font="16px sans-serif";ctx.fillStyle="#ffd52e";ctx.fillText("鳥をタップして選択",480,122);for(let i=0;i<roster.length;i++){let c=roster[i],x=92+i*154,y=190;ctx.fillStyle=i===p1Char?"#ffdf4d":"#111b30";ctx.strokeStyle="#fff";ctx.lineWidth=3;rr(x,y,124,168,16);ctx.save();ctx.translate(x+62,y+110);ctx.filter=c.filter;ctx.drawImage(imgs.idle,-52,-110,104,104);ctx.restore();ctx.fillStyle="#fff";ctx.font="bold 17px sans-serif";ctx.fillText(c.jp,x+62,y+28);ctx.font="12px sans-serif";ctx.fillStyle="#dce8ff";ctx.fillText(c.desc,x+62,y+148);}ctx.fillStyle="#ffcf35";ctx.strokeStyle="#5c3300";ctx.lineWidth=4;rr(330,438,300,56,14);ctx.fillStyle="#111";ctx.font="bold 24px sans-serif";ctx.fillText("STARTでも決定",480,474);}
function overlays(){ctx.textAlign="center";if(state==="select")selectScreen();if(state==="pause"){ctx.fillStyle="#0009";ctx.fillRect(0,0,W,H);ctx.fillStyle="#fff";ctx.font="bold 54px monospace";ctx.fillText("PAUSE",480,270);}if(msgT&&msg){ctx.fillStyle="#fff";ctx.strokeStyle="#111";ctx.lineWidth=6;ctx.font="bold 44px monospace";ctx.strokeText(msg,480,150);ctx.fillText(msg,480,150);}if(screenFlash>0){screenFlash--;ctx.fillStyle="rgba(255,255,255,.35)";ctx.fillRect(0,0,W,H);}if(koFlash>0){koFlash--;ctx.fillStyle="rgba(255,255,255,.35)";ctx.fillRect(0,0,W,H);ctx.fillStyle="#ffcf35";ctx.strokeStyle="#5c2200";ctx.lineWidth=8;ctx.font="bold 90px sans-serif";ctx.strokeText("K.O.",480,285);ctx.fillText("K.O.",480,285);}if(state==="gameover"){ctx.fillStyle="#0009";ctx.fillRect(0,0,W,H);ctx.fillStyle="#fff";ctx.font="bold 46px sans-serif";ctx.fillText((p1.wins>p2.wins?p1.name:p2.name)+" CHAMPION!",480,232);ctx.font="22px sans-serif";ctx.fillText("STARTでキャラ選択",480,280);}}
function draw(){ctx.save();if(shake>0){ctx.translate((Math.random()*2-1)*shake,(Math.random()*2-1)*shake);shake*=.82;if(shake<.5)shake=0;}stage();for(const b of bullets){let grad=ctx.createRadialGradient(b.x,b.y,3,b.x,b.y,b.big?38:28);grad.addColorStop(0,"#fff");grad.addColorStop(.45,b.ref?"#65e6ff":"#ffe65a");grad.addColorStop(1,"#ff9a0000");ctx.fillStyle=grad;ctx.beginPath();ctx.arc(b.x,b.y,b.big?36:24,0,7);ctx.fill();}fighter(p1);fighter(p2);for(const p of parts){ctx.globalAlpha=Math.max(0,p.l/28);ctx.fillStyle=p.c;ctx.fillRect(p.x,p.y,6,6);ctx.globalAlpha=1;}ui();overlays();ctx.restore();}
function loop(){update();draw();requestAnimationFrame(loop);} loop();
