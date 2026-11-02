/* 학생 홈(대시보드·공지), 상점, 내역 */
function renderStudent(){$('studentName').textContent=getMe().name;renderNoticeBar();renderHome();renderShop();renderHist();renderSAuc();renderSVocab();renderSMath();renderSSeat();maybeNoticeModal()}
function stab(id,el){document.querySelectorAll('#studentMain .tab,#studentMain .panel').forEach(e=>e.classList.remove('active'));el.classList.add('active');$('s-'+id).classList.add('active');
  if(id==='vocab'){currentQuiz=null;renderSVocab()}if(id==='math'){currentMath=null;renderSMath()}
  if(id==='home')renderHome();if(id==='seat')renderSSeat();if(id==='history')renderHist();if(id==='auction')renderSAuc()}
const renderHist=()=>{$('s-history').innerHTML=historyRows(getMe().history)};

/* ───── 공지사항 (상단 바 + 홈 카드 + 팝업) ───── */
const isNew=n=>Date.now()-n.id<3*864e5;
const latestNotices=()=>arr(DATA.notices).slice().reverse();
const ncard=n=>`<div class="ncard">${isNew(n)?'<span class="new">NEW</span>':''}<div class="nt">${esc(n.text)}</div><div class="small">${esc(n.date)}</div></div>`;
function renderNoticeBar(){const b=$('noticeBar'),l=latestNotices();if(!l.length){b.style.display='none';return}const n=l[0];b.style.display='flex';
  b.innerHTML=`<span>📢</span><span class="t">${esc(n.text)}</span>${isNew(n)?'<span class="new">NEW</span>':''}<span class="more">전체보기</span>`}
function noticeSection(){const l=latestNotices();if(!l.length)return'';
  return`<div class="nsec"><div class="nhead">📢 공지사항</div>${l.slice(0,3).map(ncard).join('')}${l.length>3?`<details><summary>지난 공지 ${l.length-3}개 더 보기</summary>${l.slice(3,15).map(ncard).join('')}</details>`:''}</div>`}
function openNotice(){$('noticeList2').innerHTML=latestNotices().slice(0,10).map(ncard).join('')||'<div class="empty">공지가 없어요</div>';$('noticeModal').style.display='flex'}
function closeNotice(){$('noticeModal').style.display='none';const l=latestNotices();if(l.length)try{localStorage.setItem('vit_seen_'+cu.id,l[0].id)}catch(e){}}
let noticeShown=false;
function maybeNoticeModal(){if(noticeShown)return;noticeShown=true;const l=latestNotices();if(!l.length)return;let seen=null;try{seen=localStorage.getItem('vit_seen_'+cu.id)}catch(e){}if(String(seen)!==String(l[0].id))openNotice()}

/* ───── 대시보드 ───── */
const pctR=v=>Math.round(v||0);
function openCount(kind){const T=kind==='v'?DATA.vocabTests:DATA.mathTests,key=kind==='v'?'vocabResults':'mathResults';let n=0;
  for(let i=1;i<=30;i++){const k='day'+i;if((T[k]&&T[k].open)||DATA.students.some(s=>s[key][k]&&s[key][k].completed))n++}return n}
function metrics(s){let vs=0,vt=0,vn=0,mq=0,mc=0,mn=0;
  Object.keys(s.vocabResults).forEach(k=>{const r=s.vocabResults[k];if(r&&r.completed){vs+=r.score||0;vt+=r.total||0;vn++}});
  Object.keys(s.mathResults).forEach(k=>{const r=s.mathResults[k];if(r&&r.completed){const it=mItems(r);mn++;mq+=it.length;mc+=it.filter(x=>x.correct).length}});
  return{vs,vt,vn,mq,mc,mn,vp:vt?vs/vt*100:0,mp:mq?mc/mq*100:0,hasV:vt>0,hasM:mq>0,checks:s.history.filter(h=>h.label==='출석 체크').length}}
function axisVals(s,c){const m=metrics(s);return[m.vp,m.mp,c.tot?Math.min(100,(m.vn+m.mn)/c.tot*100):0,Math.min(100,m.checks/20*100),c.maxP>0?Math.max(0,s.points)/c.maxP*100:0]}
function dayCompare(s,kind){const key=kind==='v'?'vocabResults':'mathResults';
  const pc=r=>{if(kind==='v')return r.total?r.score/r.total*100:0;const it=mItems(r);return it.length?it.filter(x=>x.correct).length/it.length*100:0};
  const days=Object.keys(s[key]).filter(k=>s[key][k]&&s[key][k].completed).map(k=>+k.slice(3)).sort((x,y)=>x-y).slice(-8);
  const my=days.map(d=>pc(s[key]['day'+d])),av=days.map(d=>{const v=DATA.students.filter(x=>x[key]['day'+d]&&x[key]['day'+d].completed).map(x=>pc(x[key]['day'+d]));return v.reduce((p,q)=>p+q,0)/(v.length||1)});
  return{days,my,av}}
function barsSvg(days,my,av){if(!days.length)return'<div class="empty">아직 응시한 시험이 없어요</div>';
  const W=320,H=190,L=30,B=24,T=10,gap=(W-L)/days.length,bw=Math.min(18,gap/2.6),h=v=>(H-T-B)*v/100;let g='';
  [0,25,50,75,100].forEach(v=>{const y=T+(H-T-B)*(1-v/100);g+=`<line x1="${L}" x2="${W}" y1="${y}" y2="${y}" stroke="#2c2c2c"/><text x="${L-4}" y="${y+4}" text-anchor="end" font-size="10" fill="#737373">${v}</text>`});
  days.forEach((d,i)=>{const x=L+gap*i+gap/2;g+=`<rect x="${x-bw-1}" y="${H-B-h(my[i])}" width="${bw}" height="${h(my[i])}" rx="2" fill="#e50914"/><rect x="${x+1}" y="${H-B-h(av[i])}" width="${bw}" height="${h(av[i])}" rx="2" fill="#6b6b6b"/><text x="${x}" y="${H-8}" text-anchor="middle" font-size="10" fill="#b3b3b3">D${d}</text>`});
  return`<svg viewBox="0 0 ${W} ${H}" class="chart">${g}</svg>`}
function radarSvg(mine,avg){const L=['단어','수학','참여','출석','포인트'],cx=150,cy=135,R=95;
  const pt=(i,v)=>{const t=-Math.PI/2+i*2*Math.PI/5;return[cx+Math.cos(t)*R*v/100,cy+Math.sin(t)*R*v/100]};
  const poly=v=>v.map((x,i)=>pt(i,x).map(n=>n.toFixed(1)).join(',')).join(' ');let g='';
  [25,50,75,100].forEach(l=>g+=`<polygon points="${poly([l,l,l,l,l])}" fill="none" stroke="#333"/>`);
  L.forEach((t,i)=>{const[x,y]=pt(i,100),[lx,ly]=pt(i,122);g+=`<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#333"/><text x="${lx}" y="${ly+4}" text-anchor="middle" font-size="11" fill="#b3b3b3">${t}</text>`});
  return`<svg viewBox="0 0 300 270" class="chart"><g>${g}</g><polygon points="${poly(avg)}" fill="rgba(255,255,255,.06)" stroke="#9a9a9a" stroke-width="2" stroke-dasharray="5 4"/><polygon points="${poly(mine)}" fill="rgba(229,9,20,.3)" stroke="#e50914" stroke-width="2.5"/></svg>`}
function donutSvg(gain,spent){const t=(gain+spent)||1,C=2*Math.PI*40,a=gain/t*C;
  return`<svg viewBox="0 0 120 120" class="donut"><circle cx="60" cy="60" r="40" fill="none" stroke="#e50914" stroke-width="16"/><circle cx="60" cy="60" r="40" fill="none" stroke="#46d369" stroke-width="16" stroke-dasharray="${a} ${C-a}" transform="rotate(-90 60 60)"/><text x="60" y="58" text-anchor="middle" fill="#fff" font-size="16" font-weight="800">${Math.round(spent/t*100)}%</text><text x="60" y="74" text-anchor="middle" fill="#b3b3b3" font-size="9">사용 비율</text></svg>`}
function trendSvg(s){const h=s.history;if(!h.length)return'<div class="empty">아직 포인트 내역이 없어요</div>';
  let bal=s.points;const a=[bal];for(let i=h.length-1;i>=0;i--){bal-=h[i].points;a.unshift(bal)}
  const v=a.slice(-31),mx=Math.max(...v),mn=Math.min(...v),r=(mx-mn)||1,W=300,H=130,n=Math.max(v.length-1,1);
  const p=v.map((y,i)=>[(8+i*(W-16)/n).toFixed(1),(H-22-(y-mn)/r*(H-44)).toFixed(1)]),line=p.map(q=>q.join(',')).join(' ');
  return`<svg viewBox="0 0 ${W} ${H}" class="chart"><polygon points="8,${H-22} ${line} ${p[p.length-1][0]},${H-22}" fill="rgba(229,9,20,.18)"/><polyline fill="none" stroke="#e50914" stroke-width="2.5" stroke-linejoin="round" points="${line}"/><circle cx="${p[p.length-1][0]}" cy="${p[p.length-1][1]}" r="4" fill="#fff"/><text x="8" y="12" font-size="10" fill="#737373">최고 ${mx.toLocaleString()}P</text><text x="8" y="${H-6}" font-size="10" fill="#737373">최저 ${mn.toLocaleString()}P</text></svg>`}
function heat(s){let bars='',dots='';for(let i=1;i<=30;i++){const k='day'+i,r=s.vocabResults[k],q=s.mathResults[k];
  bars+=(r&&r.completed&&r.total)?`<i title="Day ${i}: ${r.score}/${r.total}" style="height:${Math.max(6,r.score/r.total*100)}%"></i>`:'<i class="n" style="height:6%"></i>';
  if(q&&q.completed){const it=mItems(q),c=it.filter(x=>x.correct).length;dots+=`<i class="${c===it.length?'a':c?'p':'w'}" title="Day ${i}: ${c}/${it.length}"></i>`}else dots+='<i></i>'}return{bars,dots}}
function renderHome(){const s=getMe();$('studentPoints').textContent=s.points;
  const rank=DATA.students.slice().sort((a,b)=>b.points-a.points),rk=rank.findIndex(x=>x.id===s.id)+1,n=rank.length,m=metrics(s);
  const tot=openCount('v')+openCount('m'),done=m.vn+m.mn,ctx={tot,maxP:Math.max(1,...DATA.students.map(x=>x.points))};
  const all=DATA.students.map(x=>({m:metrics(x),a:axisVals(x,ctx)}));
  const avg=[0,1,2,3,4].map(i=>{const f=i===0?all.filter(x=>x.m.hasV):i===1?all.filter(x=>x.m.hasM):all;return f.length?f.reduce((p,x)=>p+x.a[i],0)/f.length:0});
  const dv=dayCompare(s,'v'),dm=dayCompare(s,'m'),hm=heat(s);
  const bestV=Math.max(0,...Object.values(s.vocabResults).filter(r=>r&&r.completed&&r.total).map(r=>r.score/r.total*100));
  const accAll=(m.vt+m.mq)?(m.vs+m.mc)/(m.vt+m.mq)*100:0;
  const wins=Object.values(DATA.auctions).filter(x=>!x.active&&x.winner&&String(x.winner.studentId)===String(s.id));
  const gain=s.history.filter(h=>h.points>0).reduce((p,h)=>p+h.points,0),spent=s.history.filter(h=>h.points<0).reduce((p,h)=>p-h.points,0);
  const perfV=Object.values(s.vocabResults).filter(r=>r&&r.completed&&r.total&&r.score===r.total).length;
  const perfM=Object.values(s.mathResults).filter(r=>{if(!(r&&r.completed))return false;const it=mItems(r);return it.length&&it.every(x=>x.correct)}).length;
  const seat=DATA.seats.find(x=>x.sid===s.id),checked=s.lastCheck===dayStr();
  const BD=[['🔥','출석왕',m.checks>=5,'출석 5회'],['📝','단어 만점',perfV>=1,'단어시험 만점'],['🧠','단어 10일',m.vn>=10,'10일 응시'],['📐','수학 올클리어',perfM>=1,'하루 전부 정답'],['🏆','경매 낙찰',wins.length>=1,'낙찰 1회'],['💰','포인트 부자',s.points>=1000,'1,000P 보유'],['🥇','포인트 1위',rk===1&&n>1,'랭킹 1위'],['🛍️','첫 구매',s.history.some(h=>/상품 구매/.test(h.label)),'상점 구매']];
  const top=rank.slice(0,5),mx=Math.max(1,rank[0].points),rkRow=(x,i)=>`<div class="rank${x.id===s.id?' me':''}"><b>${i+1}</b><span class="rn">${esc(x.name)}${x.id===s.id?' (나)':''}</span><div class="hb"><i style="width:${Math.max(3,Math.max(0,x.points)/mx*100)}%"></i></div><span>${x.points.toLocaleString()}P</span></div>`;
  const lg=(c,t)=>`<span><i style="background:${c}"></i>${t}</span>`;
  $('s-home').innerHTML=`${noticeSection()}
  <div class="banner"><div class="small" style="color:#ffb3b8">${esc(s.name)}님의 포인트${seat?' · 내 자리 '+seat.n+'번':''}</div><div class="point">${s.points.toLocaleString()}P</div>
    <div class="flex" style="margin-top:12px"><span style="font-size:13px">전체 ${rk}위 / ${n}명</span><button class="btn ${checked?'btn-ghost':'btn-primary'} btn-sm" ${checked?'disabled':''} onclick="checkIn()">${checked?'오늘 출석 완료':'출석체크 +'+CHECKIN_POINTS+'P'}</button></div></div>
  <div class="stats">
    <div class="stat"><div class="sl">응시 현황</div><div class="v">${done} / ${tot}</div><div class="ss">남은 시험 ${Math.max(0,tot-done)}개</div></div>
    <div class="stat"><div class="sl">내 평균 정답률</div><div class="v">${pctR(accAll)}%</div><div class="ss">단어·수학 합산</div></div>
    <div class="stat"><div class="sl">최고 점수</div><div class="v">${pctR(bestV)}점</div><div class="ss">단어시험 기준</div></div>
    <div class="stat"><div class="sl">최근 석차</div><div class="v">${rk}위 / ${n}명</div><div class="ss">상위 ${Math.ceil(rk/n*100)}% · 포인트 기준</div></div></div>
  <div class="dash-grid">
    <div class="dcard"><h4>단어시험 정답률 (나 vs 전체 평균, %)</h4><div class="legend">${lg('#e50914','내 정답률')}${lg('#6b6b6b','전체 평균')}</div>${barsSvg(dv.days,dv.my,dv.av)}</div>
    <div class="dcard"><h4>영역별 성취도 (나 vs 전체 평균, %)</h4><div class="legend">${lg('#e50914','나')}${lg('#9a9a9a','전체 평균')}</div>${radarSvg(axisVals(s,ctx),avg)}</div>
    <div class="dcard"><h4>수학시험 정답률 (나 vs 전체 평균, %)</h4><div class="legend">${lg('#e50914','내 정답률')}${lg('#6b6b6b','전체 평균')}</div>${barsSvg(dm.days,dm.my,dm.av)}</div>
    <div class="dcard"><h4>포인트 변화</h4>${trendSvg(s)}</div>
    <div class="dcard"><h4>포인트 획득 vs 사용</h4><div class="donutwrap">${donutSvg(gain,spent)}<div><div class="legend" style="flex-direction:column;align-items:flex-start;gap:8px">${lg('#46d369','획득 '+gain.toLocaleString()+'P')}${lg('#e50914','사용 '+spent.toLocaleString()+'P')}</div></div></div></div>
    <div class="dcard"><h4>나의 배지 (${BD.filter(b=>b[2]).length}/${BD.length})</h4><div class="badges">${BD.map(b=>`<div class="bd${b[2]?' on':''}"><div class="em">${b[0]}</div><b>${b[1]}</b><div class="small">${b[3]}</div></div>`).join('')}</div></div>
    <div class="dcard"><h4>시험 기록 Day 1~30</h4><div class="small" style="margin-bottom:4px">단어 점수</div><div class="bars">${hm.bars}</div><div class="small" style="margin:10px 0 4px">수학 <span style="color:var(--green)">■</span>전부 정답 <span style="color:var(--orange)">■</span>일부 <span style="color:var(--red2)">■</span>오답</div><div class="dots">${hm.dots}</div></div>
    <div class="dcard"><h4>포인트 랭킹 TOP 5</h4>${top.map(rkRow).join('')}${rk>5?'<div class="small" style="text-align:center;margin:6px 0">⋮</div>'+rkRow(s,rk-1):''}</div>
  </div>
  <h3 class="sec">경매 낙찰 목록</h3>${wins.length?wins.map(x=>`<div class="shop-item flex"><div>${esc(x.itemName)}${x.seatId?' 🪑':''}</div><span class="badge badge-winner">${x.winner.amount}P</span></div>`).join(''):'<div class="empty">아직 낙찰 기록이 없어요</div>'}
  <h3 class="sec">최근 활동</h3>${historyRows(s.history.slice(-6))}`}
async function checkIn(){await pull();const s=getMe();if(s.lastCheck===dayStr()){toast('오늘은 이미 출석했어요');return}
  s.lastCheck=dayStr();s.points+=CHECKIN_POINTS;s.history.push({label:'출석 체크',points:CHECKIN_POINTS,date:today()});await dbSave();toast('✅ 출석 완료 +'+CHECKIN_POINTS+'P');renderStudent()}
function renderShop(){const s=getMe(),el=$('s-shop');
  el.innerHTML=DATA.items.length?DATA.items.map(i=>`<div class="shop-item flex"><div><div>${esc(i.name)}</div><div class="small">${i.price}P</div></div><button class="btn btn-primary btn-sm" ${s.points<i.price?'disabled':''} onclick="buyItem(${i.id})">구매</button></div>`).join(''):'<div class="empty">등록된 상품이 없습니다.</div>'}
async function buyItem(id){await pull();const item=DATA.items.find(x=>x.id===id),s=getMe();if(!s||!item||s.points<item.price)return;
  s.points-=item.price;s.history.push({label:'상품 구매 - '+item.name,points:-item.price,date:today()});DATA.orders.unshift({id:Date.now(),studentName:s.name,itemName:item.name});
  await dbSave();toast('🛍️ '+item.name+' 구매 완료!');renderStudent()}
