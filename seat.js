/* 자리표 (학생 보기 + 관리자 편집) */
function seatMap(o={}){return`<div class="seatmap${o.edit?' edit':''}" ${o.edit?'id="seatEdit"':''}>`+DATA.seats.map(s=>{const nm=nameOf(s.sid);
  return`<div class="seat${s.sid&&s.sid===o.me?' me':''}${o.target===s.id?' target':''}${o.sel===s.id?' sel':''}" data-id="${s.id}" style="left:${s.x}%;top:${s.y}%"><small>${s.n}</small><b>${nm?esc(nm):'<i>빈자리</i>'}</b></div>`}).join('')+'<span class="lbl l">복도</span><span class="lbl r">창문</span><div class="desk">교탁</div></div>'}
function renderSSeat(){const s=getMe(),m=DATA.seats.find(x=>x.sid===s.id);
  $('s-seat').innerHTML=`<div class="flex" style="margin-bottom:12px"><b style="font-size:17px">3학년 1반 좌석표</b><span class="badge badge-winner">${m?'내 자리 '+m.n+'번':'자리 미배정'}</span></div>${seatMap({me:s.id})}<div class="small" style="margin-top:10px">경매에서 자리 경매에 낙찰되면 해당 자리로 이동해요.</div>`}
function renderASeat(){const el=$('a-seat');if(!el)return;if(drag)return;const s=DATA.seats.find(x=>x.id===seatSel);
  const opts=DATA.students.map(st=>{const at=DATA.seats.find(x=>x.sid===st.id);return`<option value="${esc(st.id)}" ${s&&s.sid===st.id?'selected':''}>${esc(st.name)}${at?' ('+at.n+'번)':''}</option>`}).join('');
  el.innerHTML=`<div class="admin-section"><b>자리 배치 편집</b><div class="small" style="margin:6px 0 10px">자리를 <b>드래그</b>하면 위치가 바뀌고, <b>탭</b>하면 학생을 배정할 수 있어요. 수정 후 꼭 저장을 눌러주세요.</div>
  <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn btn-primary btn-sm" onclick="saveSeats()">💾 저장${seatDirty?' *':''}</button><button class="btn btn-ghost btn-sm" onclick="addSeat()">＋ 자리 추가</button><button class="btn btn-ghost btn-sm" onclick="randomSeats()">🎲 랜덤 배정</button><button class="btn btn-ghost btn-sm" onclick="renumSeats()">번호 정렬</button><button class="btn btn-ghost btn-sm" onclick="clearSeats()">이름 비우기</button><button class="btn btn-danger btn-sm" onclick="resetSeats()">기본 배치로</button></div></div>
  ${seatMap({edit:1,sel:seatSel})}
  ${s?`<div class="admin-section" style="margin-top:12px"><b>${s.n}번 자리</b><div style="height:8px"></div><select id="seatStu" class="inp"><option value="">(빈자리)</option>${opts}</select>
  <div style="display:flex;gap:8px;margin-top:10px"><button class="btn btn-primary btn-sm" style="flex:1" onclick="assignSeat()">배정</button><button class="btn btn-danger btn-sm" onclick="delSeat()">자리 삭제</button></div></div>`:''}`;
  bindSeatDrag()}
function bindSeatDrag(){const m=$('seatEdit');if(!m)return;
  m.onpointerdown=e=>{const el=e.target.closest('.seat');if(!el)return;const s=DATA.seats.find(x=>x.id===el.dataset.id);drag={s,el,sx:e.clientX,sy:e.clientY,ox:s.x,oy:s.y,r:m.getBoundingClientRect(),moved:false};m.setPointerCapture(e.pointerId)};
  m.onpointermove=e=>{if(!drag)return;const dx=e.clientX-drag.sx,dy=e.clientY-drag.sy;if(Math.abs(dx)+Math.abs(dy)>5)drag.moved=true;if(!drag.moved)return;
    const nx=Math.max(0,Math.min(82.5,Math.round((drag.ox+dx/drag.r.width*100)*2)/2)),ny=Math.max(0,Math.min(89,Math.round((drag.oy+dy/drag.r.height*100)*2)/2));
    drag.s.x=nx;drag.s.y=ny;drag.el.style.left=nx+'%';drag.el.style.top=ny+'%'};
  m.onpointerup=m.onpointercancel=()=>{if(!drag)return;const d=drag;drag=null;if(d.moved)seatDirty=true;else seatSel=d.s.id;renderASeat()}}
async function saveSeats(){const mine=DATA.seats;await pull();DATA.seats=mine;await dbSave();seatDirty=false;toast('💾 자리 배치 저장 완료');renderASeat();renderAAuc()}
function assignSeat(){const s=DATA.seats.find(x=>x.id===seatSel),v=$('seatStu').value;if(!s)return;if(v)DATA.seats.forEach(x=>{if(x.sid===v)x.sid=''});s.sid=v;seatDirty=true;renderASeat()}
function delSeat(){if(!confirm('이 자리를 삭제할까요?'))return;DATA.seats=DATA.seats.filter(x=>x.id!==seatSel);seatSel=null;seatDirty=true;renderASeat()}
function addSeat(){const n=Math.max(0,...DATA.seats.map(s=>s.n))+1,id='s'+Date.now();DATA.seats.push({id,n,x:40,y:40,sid:''});seatSel=id;seatDirty=true;renderASeat()}
function renumSeats(){DATA.seats.slice().sort((a,b)=>Math.round(a.y/8)-Math.round(b.y/8)||a.x-b.x).forEach((s,i)=>s.n=i+1);seatDirty=true;renderASeat()}
function clearSeats(){if(!confirm('모든 자리의 이름을 비울까요?'))return;DATA.seats.forEach(s=>s.sid='');seatDirty=true;renderASeat()}
function randomSeats(){if(!confirm('학생들을 무작위로 자리에 배정할까요?'))return;const ss=DATA.seats.slice().sort((a,b)=>a.n-b.n),st=shuf(DATA.students.map(x=>x.id));ss.forEach((s,i)=>s.sid=st[i]||'');seatDirty=true;renderASeat()}
function resetSeats(){if(!confirm('위치와 번호를 기본 배치(3학년 1반 사진)로 되돌릴까요? 학생 배정은 번호 기준으로 유지돼요.'))return;const old=DATA.seats.slice().sort((a,b)=>a.n-b.n),d=defaultSeats();d.forEach((s,i)=>{if(old[i])s.sid=old[i].sid});DATA.seats=d;seatSel=null;seatDirty=true;renderASeat()}
