const http=require('http'),fs=require('fs'),path=require('path');
const LIMIT=20;
const Q=[
{t:'mc',q:'Địa hình nào chiếm tới 3/4 diện tích lãnh thổ đất liền nước ta?',o:['Bán bình nguyên','Cao nguyên','Đồi núi','Đồng bằng'],a:2},
{t:'mc',q:'Đỉnh núi cao nhất Việt Nam là?',o:['Phan Xi Păng','Ngọc Linh','Bạch Mã','Lang Biang'],a:0},
{t:'fb',q:'Vịnh ___ là di sản thiên nhiên thế giới ở Quảng Ninh.',a:['Hạ Long','Ha Long']},
{t:'mc',q:'Quần đảo Hoàng Sa thuộc thành phố nào?',o:['Đà Nẵng','Khánh Hòa','Quảng Ngãi','Huế'],a:0},
{t:'fb',q:'Quần đảo Trường Sa thuộc tỉnh ___.',a:['Khánh Hòa']},
{t:'mc',q:'Việt Nam gia nhập ASEAN vào năm nào?',o:['1991','1995','2000','2007'],a:1},
{t:'fb',q:'Món đặc sản miền Trung: bún bò ___.',a:['Huế']},
{t:'mc',q:'Tác giả của Truyện Kiều là ai?',o:['Nguyễn Trãi','Hồ Xuân Hương','Nguyễn Du','Nguyễn Đình Chiểu'],a:2},
{t:'fb',q:'Thủ đô của Nhật Bản là thành phố nào?',a:['Tokyo','Tô-ky-ô']},
{t:'mc',q:'Trong Excel, hàm nào dùng để tính tổng?',o:['COUNT','AVERAGE','SUM','MAX'],a:2}
];
const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase().replace(/[^a-z0-9]/g,'');
let game={phase:'lobby',q:0,startAt:0,host:null};
const players={};
const allIn=()=>{const v=Object.values(players);return v.length>0&&v.every(p=>p.answers[game.q])};
const isOver=()=>game.phase==='play'&&(Date.now()>=game.startAt+LIMIT*1000||allIn());
function state(id){
  const o=isOver(),q=Q[game.q],p=players[id];
  if(p)p.seen=Date.now();
  if(game.phase==='lobby')for(const k in players)if(Date.now()-players[k].seen>600000)delete players[k];
  return{now:Date.now(),game:{...game,limit:LIMIT,total:Q.length},over:o,
    q:game.phase==='play'?{t:q.t,q:q.q,o:q.o}:null,
    correct:o?(q.t==='mc'?q.a:q.a[0]):null,
    me:p?{name:p.name,total:p.total,answers:p.answers}:null,
    players:Object.entries(players).map(([i,x])=>({id:i,name:x.name,total:x.total,answered:!!x.answers[game.q]})).sort((a,b)=>b.total-a.total)};
}
function act(path,b){
  const id=String(b.id||'').slice(0,40),p=players[id];
  if(path==='join'){
    const name=String(b.name||'').trim().slice(0,20);if(!id||!name)return;
    if(p)p.name=name;else players[id]={name,total:0,answers:{},seen:Date.now()};
  }
  if(!p)return;
  if(path==='start'&&game.phase==='lobby'){
    for(const k in players){players[k].total=0;players[k].answers={}}
    game={phase:'play',q:0,startAt:Date.now(),host:id};
  }
  if(path==='answer'&&game.phase==='play'&&!isOver()&&!p.answers[game.q]){
    const q=Q[game.q],v=b.v;
    const ok=q.t==='mc'?v===q.a:q.a.some(x=>norm(x)===norm(String(v).slice(0,60)));
    const left=Math.max(0,(game.startAt+LIMIT*1000-Date.now())/1000);
    const pts=ok?Math.round(500+500*left/LIMIT):0;
    p.answers[game.q]={a:q.t==='mc'?v:String(v).slice(0,60),pts};p.total+=pts;
  }
  if(path==='next'&&game.host===id&&isOver()){
    if(game.q+1<Q.length)game={...game,q:game.q+1,startAt:Date.now()};else game={...game,phase:'final'};
  }
  if(path==='reset'&&game.host===id){
    game={phase:'lobby',q:0,startAt:0,host:null};
    for(const k in players){players[k].total=0;players[k].answers={}}
  }
}
http.createServer((req,res)=>{
  const u=new URL(req.url,'http://x');
  if(req.method==='GET'&&u.pathname==='/api/state'){
    res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});
    return res.end(JSON.stringify(state(u.searchParams.get('id')||'')));
  }
  if(req.method==='POST'&&u.pathname.startsWith('/api/')){
    let d='';req.on('data',c=>{d+=c;if(d.length>5000)req.destroy()});
    req.on('end',()=>{try{act(u.pathname.slice(5),JSON.parse(d||'{}'))}catch(e){}res.writeHead(200);res.end('ok')});
    return;
  }
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
  res.end(fs.readFileSync(path.join(__dirname,'index.html')));
}).listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('Quiz dang chay'));
