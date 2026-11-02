/* 경매 (학생 입찰 화면 + 관리자 경매 관리/일괄 종료) */
function seatInfo(a){const s=a.seatId&&DATA.seats.find(x=>x.id===a.seatId);return s?`🪑 ${s.n}번 자리 (현재 ${esc(nameOf(s.sid))||'빈자리'})`:''}
function minBidOf(a){const h=Math.max(0,...Object.values(a.bids||{}).map(b=>b.amount));let m=h>0?h+STEP:(a.startPrice||STEP);return Math.ceil(m/STEP)*STEP}
const fmt=n=>(+n||0).toLocaleString();
function renderSAuc(){const el=$('s-auction'),s=getMe(),l=Object.values(DATA.auctions);
  if(!l.length){el.innerHTML='<div class="empty">진행 중인 경매가 없습니다.</div>';return}
  el.innerHTML=l.map(a=>{const bids=Object.values(a.bids||{}).map(b=>b.amount),hi=bids.length?Math.max(...bids):0,mine=a.bids&&a.bids[String(s.id)],my=mine?mine.amount:0,si=seatInfo(a);
    const grp=a.groupName?`<span class="badge badge-winner">🗂 ${esc(a.groupName)}</span>`:'';
    const map=a.seatId?`<details style="margin-top:8px"><summary class="small" style="cursor:pointer">자리 위치 보기</summary><div style="height:8px"></div>${seatMap({target:a.seatId,me:s.id})}</details>`:'';
    if(a.active){const top=my>0&&my===hi,mb=minBidOf(a),v=Math.max(stepVals[a.id]||0,mb);stepVals[a.id]=v;
      return`<div class="auction-card"><div class="flex"><div class="ac-title">${esc(a.itemName)}</div><span class="badge ${top?'badge-winner':'badge-active'}">${top?'🥇 최고 입찰자':'진행 중'}</span></div>
      <div class="ac-meta">${grp}<span>시작가 ${fmt(a.startPrice)}P</span><span>현재 최고 <b class="green">${fmt(hi)}P</b></span>${my?`<span>내 입찰 <b>${fmt(my)}P</b></span>`:''}${si?`<span class="orange">${si}</span>`:''}</div>
      <div class="bid-box"><div class="bid-label">내 입찰가 (총액)</div>
        <div class="bid-main"><input type="number" inputmode="numeric" id="bid-${a.id}" value="${v}" step="${STEP}" min="${mb}" oninput="bidInput('${a.id}')"><span>P</span></div>
        <div class="chips"><button class="chip c10" onclick="bidAdd('${a.id}',10)">+10</button><button class="chip c100" onclick="bidAdd('${a.id}',100)">+100</button><button class="chip c1000" onclick="bidAdd('${a.id}',1000)">+1,000</button><button class="chip cmin" onclick="bidAdd('${a.id}',0)">최소로</button></div>
        <div class="bid-sum" id="sum-${a.id}"></div><div class="bid-msg" id="msg-${a.id}"></div>
        <button class="btn btn-primary btn-full" id="btn-${a.id}" onclick="placeBid('${a.id}')">입찰하기</button>
        <div class="bid-warn">⚠️ 낙찰에 실패하면 입찰한 포인트는 환불되지 않고 사라져요.${a.seatId&&a.groupId?' 이 묶음에서는 한 학생이 자리 하나만 낙찰돼요.':''}</div></div>${map}</div>`}
    const won=a.winner&&String(a.winner.studentId)===String(s.id),lost=!won&&my>0;
    return`<div class="auction-card"><div class="flex"><div class="ac-title">${esc(a.itemName)}</div><span class="badge badge-ended">종료</span></div>
      <div class="ac-meta">${grp}<span>시작가 ${fmt(a.startPrice)}P</span>${si?`<span class="orange">${si}</span>`:''}</div>
      ${a.winner?`<span class="badge badge-winner">🏆 낙찰자: ${esc(a.winner.studentName)} ${fmt(a.winner.amount)}P</span>${won?'<div class="orange" style="margin-top:8px;font-weight:700">🎉 낙찰되었습니다!'+(a.seatId?' 자리가 배정됐어요.':'')+'</div>':''}`:'<span class="badge badge-ended">낙찰자 없음</span>'}
      ${lost?`<div class="small red" style="margin-top:8px">낙찰 실패 · 입찰한 ${fmt(my)}P는 소멸됐어요</div>`:''}</div>`}).join('');
  l.filter(a=>a.active).forEach(a=>updBid(a.id))}
function bidAdd(id,d){const a=DATA.auctions[id];if(!a)return;const mb=minBidOf(a);let v=d?(stepVals[id]||mb)+d:mb;if(v<mb)v=mb;stepVals[id]=v;$('bid-'+id).value=v;updBid(id)}
function bidInput(id){stepVals[id]=parseInt($('bid-'+id).value)||0;updBid(id)}
function updBid(id){const a=DATA.auctions[id],s=getMe();if(!a||!$('bid-'+id))return;
  const amt=stepVals[id]||0,mine=a.bids&&a.bids[String(s.id)],prev=mine?mine.amount:0,mb=minBidOf(a),diff=Math.max(amt-prev,0),hi=Math.max(0,...Object.values(a.bids||{}).map(b=>b.amount));
  let msg,ok=false;
  if(!amt)msg='입찰 금액을 입력하세요';else if(amt<mb)msg='최소 '+fmt(mb)+'P 이상이어야 해요';else if(amt%STEP)msg=STEP+'P 단위로 입력하세요';else if(amt-prev>s.points)msg='포인트가 '+fmt(amt-prev-s.points)+'P 부족해요';else{ok=true;msg='입찰하면 '+fmt(diff)+'P가 차감돼요'}
  $('sum-'+id).innerHTML=`<div><small>현재 최고가</small><b>${fmt(hi)}P</b></div><div><small>이번에 쓰는 포인트</small><b class="orange">${fmt(diff)}P</b></div><div><small>입찰 후 남는 포인트</small><b>${fmt(s.points-diff)}P</b></div>`;
  const m=$('msg-'+id);m.textContent=msg;m.className='bid-msg '+(ok?'green':'red');$('btn-'+id).disabled=!ok}
async function placeBid(id){await pull();const a=DATA.auctions[id];if(!a||!a.active)return;const amt=parseInt($('bid-'+id).value);
  if(!amt||amt%STEP)return alert('입찰 금액을 '+STEP+'P 단위로 입력하세요.');const s=getMe(),mb=minBidOf(a);
  if(amt<mb)return alert('최소 입찰 금액은 '+fmt(mb)+'P 입니다.');
  const sid=String(s.id),prev=a.bids&&a.bids[sid]?a.bids[sid].amount:0,diff=amt-prev;
  if(diff<=0)return alert('현재 내 입찰보다 높은 금액을 입력하세요.');if(s.points<diff)return alert('포인트가 부족합니다.');
  s.points-=diff;s.history.push({label:'경매 입찰 - '+a.itemName+' ('+amt+'P)',points:-diff,date:today()});
  if(!a.bids)a.bids={};a.bids[sid]={studentName:s.name,amount:amt};delete stepVals[id];await dbSave();toast('🔨 입찰 완료! '+fmt(amt)+'P');renderStudent()}
const bulkPick=new Set();
function renderBulkSeats(){const el=$('bulkSeats');if(!el)return;el.innerHTML=DATA.seats.slice().sort((a,b)=>a.n-b.n).map(s=>`<button class="chipb${bulkPick.has(s.id)?' on':''}" onclick="toggleBulk('${s.id}')">${s.n}번<small>${esc(nameOf(s.sid))||'빈자리'}</small></button>`).join('')}
function toggleBulk(id){bulkPick.has(id)?bulkPick.delete(id):bulkPick.add(id);renderBulkSeats()}
function bulkAll(on){bulkPick.clear();if(on)DATA.seats.forEach(s=>bulkPick.add(s.id));renderBulkSeats()}
async function bulkCreate(){const name=$('bulkName').value.trim()||'자리 경매',st=parseInt($('bulkStart').value);
  if(!bulkPick.size)return alert('자리를 하나 이상 선택하세요.');if(isNaN(st)||st<STEP||st%STEP)return alert('시작가는 '+STEP+'P 단위, '+STEP+'P 이상이어야 합니다.');
  await pull();const t=Date.now(),gid='g_'+t;let c=0;
  [...bulkPick].forEach((sid,i)=>{const seat=DATA.seats.find(x=>x.id===sid);if(!seat)return;const id='auc_'+t+'_'+i;
    DATA.auctions[id]={id,itemName:seat.n+'번 자리',startPrice:st,active:true,bids:{},winner:null,createdAt:today(),seatId:sid,groupId:gid,groupName:name};c++});
  await dbSave();bulkPick.clear();renderAAuc();toast('🪑 '+c+'개 자리 경매를 한 묶음으로 시작했어요')}
function topBid(a){const b=Object.values(a.bids||{}).sort((x,y)=>y.amount-x.amount)[0];return b?{n:b.studentName,a:b.amount}:null}
function aucCardA(a){const b=Object.values(a.bids||{}).map(v=>({n:v.studentName,a:v.amount})).sort((x,y)=>y.a-x.a),hi=b.length?b[0].a:0;
  return`<div class="admin-card"><div class="flex" style="align-items:flex-start"><div><b>${esc(a.itemName)}</b><div class="small" style="margin-top:4px">시작가 ${a.startPrice||0}P · 호가 ${STEP}P · 최고 <span class="green">${hi}P</span></div>${seatInfo(a)?`<div class="small orange">${seatInfo(a)}</div>`:''}</div>
  <div style="display:flex;gap:8px;align-items:center"><span class="badge ${a.active?'badge-active':'badge-ended'}">${a.active?'진행 중':'종료'}</span>${a.active?`<button class="btn btn-danger btn-sm" onclick="endAuction('${a.id}')">경매 종료</button>`:`<button class="btn btn-danger btn-sm" onclick="deleteAuction('${a.id}')">삭제</button>`}</div></div>
  ${a.winner?`<div style="margin:10px 0"><span class="badge badge-winner">🏆 낙찰: ${esc(a.winner.studentName)} ${a.winner.amount}P</span></div>`:''}
  ${b.length?`<table class="table"><thead><tr><th>순위</th><th>학생</th><th>입찰</th></tr></thead><tbody>${b.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.n)}</td><td class="green">${x.a}P</td></tr>`).join('')}</tbody></table>`:'<div class="empty" style="padding:10px 0">아직 입찰자가 없습니다.</div>'}</div>`}
function renderAAuc(){const sel=$('auctionSeat'),pv=sel.value;sel.innerHTML='<option value="">자리 연동 없음 (일반 경매)</option>'+DATA.seats.slice().sort((a,b)=>a.n-b.n).map(s=>`<option value="${s.id}">${s.n}번 자리 (${esc(nameOf(s.sid))||'빈자리'})</option>`).join('');sel.value=pv;renderBulkSeats();
  const l=Object.values(DATA.auctions),act=l.filter(a=>a.active).length,groups={},single=[];
  l.forEach(a=>{if(a.groupId)(groups[a.groupId]=groups[a.groupId]||{name:a.groupName||'묶음',list:[]}).list.push(a);else single.push(a)});
  let h=act?`<button class="btn btn-danger btn-full" style="margin-bottom:12px;padding:14px" onclick="endGroup('__all')">⏹ 진행 중인 경매 전체 일괄 종료 (${act}개)</button>`:'';
  Object.entries(groups).forEach(([gid,g])=>{const ga=g.list.filter(a=>a.active).length;
    h+=`<div class="admin-card group"><div class="flex" style="align-items:flex-start"><div><b>🗂 ${esc(g.name)}</b><div class="small" style="margin-top:4px">총 ${g.list.length}개 · 진행 중 ${ga}개 · 종료 ${g.list.length-ga}개</div></div>
    <div style="display:flex;gap:8px">${ga?`<button class="btn btn-primary btn-sm" onclick="endGroup('${gid}')">⏹ 일괄 종료</button>`:`<button class="btn btn-danger btn-sm" onclick="deleteGroup('${gid}')">묶음 삭제</button>`}</div></div>
    <details style="margin-top:10px"><summary class="small" style="cursor:pointer">경매 목록 보기</summary><div style="overflow-x:auto"><table class="table"><thead><tr><th>경매</th><th>상태</th><th>최고 입찰 / 낙찰</th></tr></thead><tbody>${g.list.map(a=>{const t=a.active?topBid(a):(a.winner&&{n:a.winner.studentName,a:a.winner.amount});return`<tr><td>${esc(a.itemName)}</td><td>${a.active?'<span class="badge badge-active">진행</span>':'<span class="badge badge-ended">종료</span>'}</td><td>${t?esc(t.n)+' <b class="green">'+t.a+'P</b>':'<span class="small">-</span>'}</td></tr>`}).join('')}</tbody></table></div></details></div>`});
  h+=single.map(aucCardA).join('');
  $('adminAuctionList').innerHTML=h||'<div class="empty">진행 중인 경매가 없습니다.</div>'}
async function startAuction(){const item=$('auctionItem').value.trim(),st=parseInt($('auctionStart').value),seatId=$('auctionSeat').value,gn=$('auctionGroup').value.trim();
  if(!item)return alert('경매 상품명을 입력하세요.');if(isNaN(st)||st<STEP||st%STEP)return alert('시작가는 '+STEP+'P 단위, '+STEP+'P 이상이어야 합니다.');
  await pull();const id='auc_'+Date.now();DATA.auctions[id]={id,itemName:item,startPrice:st,active:true,bids:{},winner:null,createdAt:today(),seatId:seatId||null,groupId:gn?'g_'+gn:null,groupName:gn||null};
  await dbSave();['auctionItem','auctionStart','auctionGroup'].forEach(i=>$(i).value='');renderAAuc();toast('🔨 경매 시작: '+item)}
/* 경매 종료 (한 개 · 묶음 · 전체 모두 이 함수 하나로 처리) — 낙찰 실패한 입찰 포인트는 환불 없이 소멸 */
async function finishAuctions(ids){await pull();const list=ids.map(i=>DATA.auctions[i]).filter(a=>a&&a.active);if(!list.length)return;
  const ent=[];list.forEach(a=>Object.entries(a.bids||{}).forEach(([k,v])=>ent.push({a,sid:String(k),name:v.studentName,amt:v.amount})));
  ent.sort((x,y)=>y.amt-x.amt);const win={},got=new Set(),skip=new Set();
  ent.forEach(e=>{if(win[e.a.id])return;if(e.a.seatId&&got.has(e.sid)){skip.add(e);return}win[e.a.id]=e;if(e.a.seatId)got.add(e.sid)});
  ent.forEach(e=>{const st=DATA.students.find(x=>String(x.id)===e.sid);if(!st)return;const w=win[e.a.id]===e;
    st.history.push({label:w?`경매 낙찰 - ${e.a.itemName} (${e.amt}P 사용)`:`경매 낙찰 실패 - ${e.a.itemName} (${e.amt}P 소멸${skip.has(e)?' · 다른 자리 낙찰':''})`,points:0,date:today()})});
  list.forEach(a=>{a.active=false;const w=win[a.id];a.winner=w?{studentId:w.sid,studentName:w.name,amount:w.amt}:null;
    if(w&&a.seatId){const T=DATA.seats.find(x=>x.id===a.seatId);if(T){const prev=T.sid||'',O=DATA.seats.find(x=>x.sid===w.sid);DATA.seats.forEach(x=>{if(x.sid===w.sid)x.sid=''});if(O&&O!==T)O.sid=prev;T.sid=w.sid}}});
  await dbSave();renderAAuc();renderASeat();toast('🏁 경매 '+list.length+'개 종료 완료')}
function endAuction(id){return finishAuctions([id])}
async function endGroup(gid){await pull();const ids=Object.values(DATA.auctions).filter(a=>a.active&&(gid==='__all'||a.groupId===gid)).map(a=>a.id);if(!ids.length)return;
  if(!confirm(ids.length+'개 경매를 한 번에 종료할까요?\n낙찰되지 못한 입찰 포인트는 환불되지 않고 소멸됩니다.'))return;await finishAuctions(ids)}
async function deleteGroup(gid){if(!confirm('이 묶음의 경매를 모두 삭제할까요?'))return;await pull();Object.values(DATA.auctions).forEach(a=>{if(a.groupId===gid)delete DATA.auctions[a.id]});await dbSave();renderAAuc()}
async function deleteAuction(id){if(!confirm('이 경매를 삭제하시겠습니까?'))return;await pull();delete DATA.auctions[id];await dbSave();renderAAuc()}
