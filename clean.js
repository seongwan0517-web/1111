/* 오늘의 청소 면제권: 교사가 정한 가격·수량으로 선착순 판매
   - 설정한 요일, 여는 시간~닫는 시간(한국 시간)에만 구매 가능, 학생 1명당 하루 1장
   - 산 학생은 그날 청소 면제 (바로 확정)
   데이터: pub/clean/config = {count, price, open, close, weekdays}
          pub/clean/days/{YYYY-MM-DD} = {count, price, openAt, closeAt,
              slots:{s00:0 또는 학생id, …},  ← 남은 자리(0)를 미리 만들어 두고, 먼저 채운 사람이 가져감 (초과 판매 방지)
              buyers:{학생id:{slot,name,at,price}}}
   날짜 칸은 관리자가 로그인할 때 앞으로 3주치가 자동으로 만들어짐. 구매 가능 시간·남은 자리는 DB 규칙이 서버에서 검사 */
const CLEAN_DEF={count:10,price:500,open:'08:30',close:'14:50',weekdays:[1,2,3,4,5]};
const KST_MS=9*3600e3,WEEK=['일','월','화','수','목','금','토'];
const kstParts=(ms)=>{const d=new Date((ms==null?Date.now():ms)+KST_MS);return{y:d.getUTCFullYear(),m:d.getUTCMonth()+1,d:d.getUTCDate(),w:d.getUTCDay(),h:d.getUTCHours(),mi:d.getUTCMinutes()}};
const pad2=n=>String(n).padStart(2,'0');
const kstKey=ms=>{const p=kstParts(ms);return p.y+'-'+pad2(p.m)+'-'+pad2(p.d)};
const kstAt=(key,hm)=>{const[y,m,d]=key.split('-').map(Number),[h,mi]=String(hm).split(':').map(Number);return Date.UTC(y,m-1,d,h,mi)-KST_MS};
const keyWeek=key=>{const[y,m,d]=key.split('-').map(Number);return new Date(Date.UTC(y,m-1,d)).getUTCDay()};
const keyLabel=key=>{const[,m,d]=key.split('-').map(Number);return`${m}/${d}(${WEEK[keyWeek(key)]})`};
const hmOf=ms=>{const p=kstParts(ms);return pad2(p.h)+':'+pad2(p.mi)};
const slotKey=i=>'s'+pad2(i);
function cleanCfg(){const c=Object.assign({},CLEAN_DEF,((DATA.clean||{}).config)||{});if(((DATA.clean||{}).config||{}).price==null&&c.startPrice!=null)c.price=c.startPrice;return c}
const cleanDays=()=>(DATA.clean&&DATA.clean.days)||{};
const cleanDay=key=>cleanDays()[key];
const dayPrice=d=>+(d.price!=null?d.price:d.startPrice)||0;
/* 산 순서대로 (먼저 산 사람이 앞) */
function cleanBuyers(day){return Object.entries((day&&day.buyers)||{}).map(([sid,b])=>({sid,name:b.name||nameOf(sid),at:+b.at||0,price:+b.price||0,slot:b.slot})).sort((a,b)=>a.at-b.at)}
const freeSlots=day=>Object.entries((day&&day.slots)||{}).filter(([k,v])=>v===0).map(([k])=>k).sort();
function cleanState(day,now){now=now||Date.now();if(!day)return'none';if(now<day.openAt)return'before';if(now<=day.closeAt)return'open';return'closed'}
const fmtLeft=ms=>{if(ms<=0)return'0분';const m=Math.floor(ms/60000),h=Math.floor(m/60);return h?`${h}시간 ${m%60}분`:`${m}분`};
/* 새 날짜 칸 만들기 (빈 자리 count개 포함) */
function newCleanDay(key,cfg){const slots={};for(let i=0;i<cfg.count;i++)slots[slotKey(i)]=0;return{count:cfg.count,price:cfg.price,openAt:kstAt(key,cfg.open),closeAt:kstAt(key,cfg.close),slots}}

/* ───── 학생: 홈 대시보드 카드 ───── */
function cleanCard(s){
  const key=kstKey(),day=cleanDay(key),now=Date.now(),st=cleanState(day,now);
  const head=`<div class="flex"><div class="ac-title">${ic('sparkles')} 오늘의 청소 면제권 <span class="small">${keyLabel(key)}</span></div>`;
  if(st==='none'){const next=Object.keys(cleanDays()).filter(k=>k>key).sort()[0];
    return`<div class="clean-card dcard">${head}<span class="badge badge-ended">오늘은 없어요</span></div><div class="small" style="margin-top:8px">${next?`다음 판매: <b>${keyLabel(next)} ${hmOf(cleanDay(next).openAt)}</b>`:'아직 예정된 판매가 없어요.'}</div></div>`}
  const buyers=cleanBuyers(day),n=+day.count||0,left=freeSlots(day).length,price=dayPrice(day),mine=buyers.find(x=>x.sid===s.id);
  const info=`<div class="clean-meta"><span>가격 <b>${price.toLocaleString()}P</b></span><span>남은 수량 <b class="${left?'green':'red'}">${left}</b> / ${n}장</span><span>${hmOf(day.openAt)} ~ ${hmOf(day.closeAt)}</span><span>선착순 · 1인 1장</span></div>`;
  const list=`<div class="clean-win"><small>오늘 청소 면제 (${buyers.length}/${n})</small>${buyers.map((x,i)=>`<span class="${x.sid===s.id?'me':''}">${i+1}. ${esc(x.name)}</span>`).join('')||'<span class="small">아직 산 학생이 없어요</span>'}</div>`;
  if(st==='before')return`<div class="clean-card dcard">${head}<span class="badge badge-ended">${hmOf(day.openAt)} 판매 시작</span></div>${info}<div class="small" style="margin-top:8px">${fmtLeft(day.openAt-now)} 뒤에 판매가 시작돼요. 선착순 ${n}명!</div></div>`;
  if(st==='open'){
    let act;if(mine)act=`<div class="clean-status green"><b>✅ 구매 완료! 오늘 청소 면제예요.</b> (${hmOf(mine.at)}, ${mine.price.toLocaleString()}P)</div>`;
    else if(!left)act='<div class="clean-status red"><b>매진됐어요.</b> 내일 다시 도전해 보세요!</div>';
    else act=`<button class="btn btn-primary btn-full clean-buy" ${s.points<price?'disabled':''} onclick="buyClean()">${ic('sparkles')} 청소 면제권 사기 (${price.toLocaleString()}P)</button>${s.points<price?`<div class="small red" style="margin-top:6px">포인트가 ${(price-s.points).toLocaleString()}P 부족해요</div>`:''}`;
    return`<div class="clean-card dcard ${mine?'won':'open'}">${head}<span class="badge ${left||mine?'badge-active':'badge-ended'}">${left?'판매 중 · '+fmtLeft(day.closeAt-now)+' 남음':'매진'}</span></div>${info}${act}${list}</div>`}
  return`<div class="clean-card dcard${mine?' won':''}">${head}<span class="badge badge-ended">판매 종료</span></div>${info}<div class="clean-status">${mine?'<div class="green"><b>🎉 오늘 청소 면제!</b></div>':'<div>오늘은 청소 면제권을 사지 않았어요.</div>'}</div>${list}</div>`}
async function buyClean(){const key=kstKey();await pull();let day=cleanDay(key),s=getMe();
  if(cleanState(day)!=='open'){uiAlert('지금은 살 수 없는 시간이에요.');return renderHome()}
  if((day.buyers||{})[s.id]){uiAlert('오늘은 이미 샀어요.');return renderHome()}
  const price=dayPrice(day);if(!freeSlots(day).length){uiAlert('매진됐어요.');return renderHome()}
  if(s.points<price)return uiAlert('포인트가 부족해요.');
  if(!await uiConfirm(`오늘(${keyLabel(key)}) 청소 면제권을 ${price.toLocaleString()}P에 살까요?\n사면 오늘 청소가 면제돼요. 취소는 선생님께 말씀드려야 해요.`,{icon:'sparkles',ok:'사기'}))return;
  /* 빈 자리 하나를 차지 (동시에 누가 먼저 가져가면 다음 빈 자리로 다시 시도) */
  for(let tryN=0;tryN<4;tryN++){await pull();day=cleanDay(key);s=getMe();const free=freeSlots(day);
    if(cleanState(day)!=='open'){uiAlert('판매 시간이 끝났어요.');return renderHome()}
    if((day.buyers||{})[s.id])break;
    if(!free.length){uiAlert('아쉽게도 방금 매진됐어요.');return renderHome()}
    const slot=free[Math.min(tryN,free.length-1)],at=Date.now(),P='pub/clean/days/'+key;
    const upd={[P+'/slots/'+slot]:s.id,[P+'/buyers/'+s.id]:{slot,name:s.name,at,price},[SP(s.id)+'/points']:s.points-price};
    upd[SP(s.id)+'/history/'+hkey()]={label:`청소 면제권 구매 ${keyLabel(key)}`,points:-price,date:today()};
    try{await api('','PATCH',upd);toast('🧹 청소 면제권을 샀어요! 오늘 청소 면제');await pull();return renderStudent()}catch(e){if(tryN===3){uiAlert('구매하지 못했어요: '+e.message);await pull();return renderHome()}}}
  await pull();renderStudent()}
function cleanAutoRefund(){/* 선착순 방식에서는 환불할 입찰이 없음 (예전 경매 방식과의 호환용) */}

/* ───── 관리자: 청소 관리 ───── */
async function ensureCleanDays(){const cfg=cleanCfg(),days=cleanDays(),skip=((DATA.clean||{}).skip)||{},upd={};
  if(!(DATA.clean&&DATA.clean.config&&DATA.clean.config.price!=null))upd['pub/clean/config']={count:cfg.count,price:cfg.price,open:cfg.open,close:cfg.close,weekdays:cfg.weekdays};
  for(let i=0;i<21;i++){const ms=Date.now()+i*864e5,key=kstKey(ms),w=kstParts(ms).w;if(!cfg.weekdays.includes(w)||days[key]||skip[key])continue;
    if(i===0&&Date.now()>=kstAt(key,cfg.open))continue; /* 이미 여는 시간이 지난 오늘은 새로 만들지 않음 */
    upd['pub/clean/days/'+key]=newCleanDay(key,cfg)}
  if(Object.keys(upd).length){await dbUpdate(upd);await pull()}}
function renderAClean(){const el=$('adminClean');if(!el)return;const cfg=cleanCfg(),key=kstKey(),day=cleanDay(key),now=Date.now(),stt=cleanState(day,now);
  const buyers=day?cleanBuyers(day):[],n=day?+day.count:0,left=day?freeSlots(day).length:0,ids=new Set(buyers.map(x=>x.sid));
  const label={none:'오늘은 판매하지 않는 날',before:hmOf(day&&day.openAt)+' 판매 시작',open:'판매 중 · '+fmtLeft(day?day.closeAt-now:0)+' 남음',closed:'판매 종료'}[stt];
  const cleaners=DATA.students.filter(s=>!ids.has(s.id)),up=Object.keys(cleanDays()).filter(k=>k>key).sort().slice(0,7);
  el.innerHTML=`<div class="admin-section clean-admin"><div class="flex"><b>🧹 오늘의 청소 면제권 (선착순)</b><span class="badge ${stt==='open'?'badge-active':'badge-ended'}">${label}</span></div>
  <div class="small" style="margin:6px 0 12px">${cfg.weekdays.map(w=>WEEK[w]).join('·')}요일 ${cfg.open}~${cfg.close}에 자동으로 판매돼요. 정한 가격으로 선착순 ${cfg.count}명이 살 수 있고(1인 1장), 산 학생은 그날 청소가 면제돼요.</div>
  ${day?`<div class="clean-today"><b>오늘 ${keyLabel(key)}</b> · ${dayPrice(day).toLocaleString()}P · 판매 ${buyers.length}/${n}장 (남음 ${left}) · ${hmOf(day.openAt)}~${hmOf(day.closeAt)}
    <div style="overflow-x:auto;margin-top:10px"><table class="table"><thead><tr><th>순서</th><th>이름</th><th>구매 시간</th><th>가격</th><th></th></tr></thead><tbody>${buyers.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.name)}</td><td class="small">${hmOf(x.at)}</td><td>${x.price.toLocaleString()}P</td><td><button class="btn btn-danger btn-sm" onclick="cancelCleanBuy('${key}','${jsq(x.sid)}')">취소·환불</button></td></tr>`).join('')||'<tr><td colspan="5" class="small">아직 산 학생이 없어요</td></tr>'}</tbody></table></div></div>`:''}
  <div class="clean-roster"><div><b>오늘 청소하는 학생 (${cleaners.length}명)</b><div>${cleaners.map(s=>`<span>${esc(s.name)}</span>`).join('')||'<span class="small">없음</span>'}</div></div><div><b>오늘 면제 (${buyers.length}명)</b><div>${buyers.map(x=>`<span class="won">${esc(x.name)}</span>`).join('')||'<span class="small">없음</span>'}</div></div></div>
  <div class="clean-set"><b>${ic('calendar-check')} 날짜별 설정 <span class="small">— 특정 날만 수량·가격·시간을 바꿔요</span></b>
    <div class="clean-form"><label>날짜<select class="inp" id="cleanSetDay" onchange="fillCleanDay()">${Object.keys(cleanDays()).filter(k=>k>=key).sort().slice(0,15).map(k=>`<option value="${k}">${keyLabel(k)}${k===key?' (오늘)':''}</option>`).join('')}</select></label>
    <label>판매 수량<input class="inp" type="number" id="cleanDayCount" min="0"></label><label>가격 (P)<input class="inp" type="number" id="cleanDayPrice" step="10" min="0"></label>
    <label>여는 시간<input class="inp" type="time" id="cleanDayOpen"></label><label>닫는 시간<input class="inp" type="time" id="cleanDayClose"></label></div>
    <div style="display:flex;gap:8px"><button class="btn btn-primary" style="flex:1" onclick="saveCleanDay()">이 날짜 저장</button><button class="btn btn-danger btn-sm" onclick="removeCleanDay()">이 날은 안 열기</button></div></div>
  <div class="clean-set"><b>${ic('clock')} 매일 기본 설정 <span class="small">— 앞으로의 날짜에 적용</span></b>
    <div class="clean-form"><label>판매 수량<input class="inp" type="number" id="cleanCount" value="${cfg.count}" min="0"></label><label>가격 (P)<input class="inp" type="number" id="cleanPrice" value="${cfg.price}" step="10" min="0"></label>
    <label>여는 시간<input class="inp" type="time" id="cleanOpen" value="${cfg.open}"></label><label>닫는 시간<input class="inp" type="time" id="cleanClose" value="${cfg.close}"></label></div>
    <div class="clean-days"><span class="small">여는 요일</span>${[1,2,3,4,5,6,0].map(w=>`<label><input type="checkbox" class="cleanW" value="${w}" ${cfg.weekdays.includes(w)?'checked':''}> ${WEEK[w]}</label>`).join('')}</div>
    <div class="small" style="margin:8px 0">저장하면 아직 아무도 사지 않은 앞으로의 날짜에도 새 기본 설정이 적용돼요. (판매가 시작된 날은 '날짜별 설정'으로 바꿔 주세요)</div><button class="btn btn-primary btn-full" onclick="saveCleanCfg()">기본 설정 저장</button></div>
  ${up.length?`<div class="small" style="margin-top:12px">예정: ${up.map(k=>{const d=cleanDay(k);return`${keyLabel(k)} ${d.count}장·${dayPrice(d).toLocaleString()}P·${hmOf(d.openAt)}~${hmOf(d.closeAt)}`}).join(' · ')}</div>`:''}</div>`;fillCleanDay()}
/* 자리 수를 count에 맞추기: 모자라면 빈 자리 추가, 남으면 빈 자리만 삭제 (이미 산 자리는 그대로) */
function slotUpdates(key,day,count,upd){const slots=Object.assign({},day.slots||{}),P='pub/clean/days/'+key+'/slots/';let total=Object.keys(slots).length;const taken=Object.values(slots).filter(v=>v!==0).length;
  if(count<taken)count=taken;let i=0;while(total<count){while(slots[slotKey(i)]!==undefined)i++;slots[slotKey(i)]=0;upd[P+slotKey(i)]=0;total++}
  const free=Object.keys(slots).filter(k=>slots[k]===0).sort().reverse();while(total>count&&free.length){const k=free.shift();upd[P+k]=null;total--}
  upd['pub/clean/days/'+key+'/count']=count;return count}
async function saveCleanCfg(){const cfg={count:Math.max(0,parseInt($('cleanCount').value)||0),price:Math.max(0,Math.round((parseInt($('cleanPrice').value)||0)/STEP)*STEP),open:$('cleanOpen').value||CLEAN_DEF.open,close:$('cleanClose').value||CLEAN_DEF.close,weekdays:[...document.querySelectorAll('.cleanW:checked')].map(x=>+x.value)};
  if(kstAt('2000-01-01',cfg.open)>=kstAt('2000-01-01',cfg.close))return uiAlert('닫는 시간이 여는 시간보다 늦어야 해요.');
  const upd={'pub/clean/config':cfg},key=kstKey(),now=Date.now();
  Object.entries(cleanDays()).forEach(([k,d])=>{if(k<key)return;if(Object.keys(d.buyers||{}).length||(k===key&&now>=d.openAt))return;
    if(!cfg.weekdays.includes(keyWeek(k))){upd['pub/clean/days/'+k]=null;return}
    upd['pub/clean/days/'+k]=newCleanDay(k,cfg)});
  if(!await dbUpdate(upd))return;await pull();await ensureCleanDays();renderAClean();toast('청소 면제권 기본 설정을 저장했어요')}
function fillCleanDay(){const sel=$('cleanSetDay');if(!sel||!sel.value)return;const d=cleanDay(sel.value);if(!d)return;
  $('cleanDayCount').value=d.count;$('cleanDayPrice').value=dayPrice(d);$('cleanDayOpen').value=hmOf(d.openAt);$('cleanDayClose').value=hmOf(d.closeAt)}
async function saveCleanDay(){const key=$('cleanSetDay').value,d=cleanDay(key);if(!d)return;
  const c=Math.max(0,parseInt($('cleanDayCount').value)||0),p=Math.max(0,Math.round((parseInt($('cleanDayPrice').value)||0)/STEP)*STEP),o=$('cleanDayOpen').value,cl=$('cleanDayClose').value;
  if(!o||!cl)return uiAlert('여는 시간과 닫는 시간을 입력하세요.');const oa=kstAt(key,o),ca=kstAt(key,cl);if(oa>=ca)return uiAlert('닫는 시간이 여는 시간보다 늦어야 해요.');
  const sold=Object.keys(d.buyers||{}).length;
  if(!await uiConfirm(`${keyLabel(key)} 청소 면제권을 바꿀까요?\n${c}장 · ${p.toLocaleString()}P · ${o}~${cl}${sold?'\n이미 '+sold+'명이 샀어요. 산 학생은 그대로 면제예요.'+(c<sold?' (수량은 '+sold+'장보다 줄일 수 없어요)':''):''}`))return;
  const upd={['pub/clean/days/'+key+'/price']:p,['pub/clean/days/'+key+'/openAt']:oa,['pub/clean/days/'+key+'/closeAt']:ca};slotUpdates(key,d,c,upd);
  if(!await dbUpdate(upd))return;await pull();renderAClean();if($('cleanSetDay')){$('cleanSetDay').value=key;fillCleanDay()}toast(keyLabel(key)+' 청소 면제권을 바꿨어요')}
async function removeCleanDay(){const key=$('cleanSetDay').value,d=cleanDay(key);if(!d)return;
  if(Object.keys(d.buyers||{}).length)return uiAlert('이미 산 학생이 있어서 이 날을 지울 수 없어요.\n먼저 구매를 취소·환불해 주세요.');
  if(!await uiConfirm(`${keyLabel(key)}에는 청소 면제권을 팔지 않을까요?`))return;
  if(!await dbUpdate({['pub/clean/days/'+key]:null,['pub/clean/skip/'+key]:true}))return;await pull();renderAClean();toast(keyLabel(key)+'에는 팔지 않아요')}
async function cancelCleanBuy(key,sid){await pull();const d=cleanDay(key),b=d&&(d.buyers||{})[sid],st=DATA.students.find(x=>x.id===sid);if(!b||!st)return;
  if(!await uiConfirm(`${st.name} 학생의 ${keyLabel(key)} 청소 면제권 구매를 취소하고 ${(+b.price||0).toLocaleString()}P를 돌려줄까요?\n자리는 다시 판매돼요.`))return;
  st.points+=+b.price||0;const upd={['pub/clean/days/'+key+'/buyers/'+sid]:null,['pub/clean/days/'+key+'/slots/'+b.slot]:0,[SP(sid)+'/points']:st.points};
  addHist(st,{label:`청소 면제권 구매 취소 ${keyLabel(key)} (환불)`,points:+b.price||0,date:today()},upd);
  if(!await dbUpdate(upd))return;await pull();renderAClean();toast('취소하고 환불했어요')}
