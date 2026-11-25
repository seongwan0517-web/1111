/* 청소 면제권: 매일(설정한 요일) 열리는 경매
   - 여는 시간~닫는 시간(기본 08:30~14:50, 한국 시간) 동안 입찰, 하루 N장(기본 10장), 시작가(기본 500P)
   - 입찰하면 포인트가 바로 빠지고, 마감 시 상위 N명이 그날 청소 면제
   - 떨어진 입찰은 설정에 따라 환불(기본) 또는 소멸
   데이터: pub/clean/config, pub/clean/days/{YYYY-MM-DD} = {count,startPrice,openAt,closeAt,bids:{학생id:{amount,name,at}}}
          학생 환불 기록 = pub/students/{id}/cleanRefund/{날짜}
   날짜 칸(days)은 관리자가 로그인할 때 앞으로 3주치가 자동으로 만들어짐 (학생 입찰 시간은 DB 규칙이 서버 시간으로 검사) */
const CLEAN_DEF={count:10,startPrice:500,open:'08:30',close:'14:50',weekdays:[1,2,3,4,5],refund:true};
const KST_MS=9*3600e3,WEEK=['일','월','화','수','목','금','토'];
const kstParts=(ms)=>{const d=new Date((ms==null?Date.now():ms)+KST_MS);return{y:d.getUTCFullYear(),m:d.getUTCMonth()+1,d:d.getUTCDate(),w:d.getUTCDay(),h:d.getUTCHours(),mi:d.getUTCMinutes()}};
const pad2=n=>String(n).padStart(2,'0');
const kstKey=ms=>{const p=kstParts(ms);return p.y+'-'+pad2(p.m)+'-'+pad2(p.d)};
const kstAt=(key,hm)=>{const[y,m,d]=key.split('-').map(Number),[h,mi]=String(hm).split(':').map(Number);return Date.UTC(y,m-1,d,h,mi)-KST_MS};
const keyLabel=key=>{const[y,m,d]=key.split('-').map(Number),w=new Date(Date.UTC(y,m-1,d)).getUTCDay();return`${m}/${d}(${WEEK[w]})`};
const hmOf=ms=>{const p=kstParts(ms);return pad2(p.h)+':'+pad2(p.mi)};
function cleanCfg(){return Object.assign({},CLEAN_DEF,((DATA.clean||{}).config)||{})}
const cleanDays=()=>(DATA.clean&&DATA.clean.days)||{};
const cleanDay=key=>cleanDays()[key];
/* 입찰 순위: 금액 높은 순, 같으면 먼저 입찰한 순 */
function cleanRank(day){return Object.entries((day&&day.bids)||{}).map(([sid,b])=>({sid,name:b.name||nameOf(sid),amount:+b.amount||0,at:+b.at||0})).sort((a,b)=>b.amount-a.amount||a.at-b.at)}
function cleanState(day,now){now=now||Date.now();if(!day)return'none';if(now<day.openAt)return'before';if(now<=day.closeAt)return'open';return'closed'}
const cleanWinners=day=>cleanRank(day).slice(0,+day.count||0);
function cleanMinBid(day,sid){const r=cleanRank(day),mine=r.find(x=>x.sid===sid),n=+day.count||0,sp=+day.startPrice||0;
  const others=r.filter(x=>x.sid!==sid);let min=sp;if(others.length>=n)min=Math.max(min,others[n-1].amount+STEP);if(mine)min=Math.max(min,mine.amount+STEP);return Math.ceil(min/STEP)*STEP}
const fmtLeft=ms=>{if(ms<=0)return'0분';const m=Math.floor(ms/60000),h=Math.floor(m/60);return h?`${h}시간 ${m%60}분`:`${m}분`};

/* ───── 학생: 홈 대시보드 카드 ───── */
let cleanBidVal=null;
function cleanCard(s){
  const key=kstKey(),day=cleanDay(key),cfg=cleanCfg(),now=Date.now(),st=cleanState(day,now);
  const head=`<div class="flex"><div class="ac-title">${ic('sparkles')} 오늘의 청소 면제권 <span class="small">${keyLabel(key)}</span></div>`;
  if(st==='none'){const next=Object.keys(cleanDays()).filter(k=>k>key).sort()[0];
    return`<div class="clean-card dcard">${head}<span class="badge badge-ended">오늘은 없어요</span></div><div class="small" style="margin-top:8px">${next?`다음 청소 면제권: <b>${keyLabel(next)} ${hmOf(cleanDay(next).openAt)}</b>에 열려요.`:'아직 예정된 청소 면제권이 없어요.'}</div></div>`}
  const rank=cleanRank(day),n=+day.count||0,mine=rank.findIndex(x=>x.sid===s.id),my=mine>=0?rank[mine]:null,cut=rank.length>=n?rank[n-1].amount:null;
  const info=`<div class="clean-meta"><span>${ic('sparkles')} 면제 <b>${n}명</b></span><span>시작가 <b>${(+day.startPrice).toLocaleString()}P</b></span><span>${hmOf(day.openAt)} ~ ${hmOf(day.closeAt)}</span><span>입찰 <b>${rank.length}명</b></span></div>`;
  if(st==='before')return`<div class="clean-card dcard">${head}<span class="badge badge-ended">${hmOf(day.openAt)} 오픈</span></div>${info}<div class="small" style="margin-top:8px">${fmtLeft(day.openAt-now)} 뒤에 열려요. 상위 ${n}명이 오늘 청소를 쉬어요!</div></div>`;
  if(st==='open'){const mb=cleanMinBid(day,s.id),v=Math.max(cleanBidVal||0,mb);cleanBidVal=v;const diff=v-(my?my.amount:0),ok=diff<=s.points;
    const inTop=my&&mine<n;
    return`<div class="clean-card dcard open">${head}<span class="badge badge-active">진행 중 · ${fmtLeft(day.closeAt-now)} 남음</span></div>${info}
    <div class="clean-status">${my?`<div class="${inTop?'green':'red'}"><b>내 입찰 ${my.amount.toLocaleString()}P · ${mine+1}위</b> ${inTop?'→ 지금 면제권 안에 있어요 🎉':'→ 지금은 면제권 밖이에요. 더 올려야 해요!'}</div>`:'<div>아직 입찰하지 않았어요.</div>'}
      <div class="small">${cut!=null?`현재 커트라인(${n}위): <b>${cut.toLocaleString()}P</b>`:`아직 ${n-rank.length}장이 남아 있어요. 시작가만 내도 들어갈 수 있어요!`}</div></div>
    <div class="clean-bid"><div class="bid-main"><input type="number" inputmode="numeric" id="cleanBid" value="${v}" step="${STEP}" min="${mb}" oninput="cleanBidVal=parseInt(this.value)||0;cleanBidMsg()"><span>P</span></div>
      <div class="chips"><button class="chip c10" onclick="cleanAdd(10)">+10</button><button class="chip c100" onclick="cleanAdd(50)">+50</button><button class="chip c1000" onclick="cleanAdd(100)">+100</button><button class="chip cmin" onclick="cleanAdd(0)">최소로</button></div>
      <div class="bid-msg" id="cleanMsg"></div>
      <button class="btn btn-primary btn-full" id="cleanBtn" onclick="placeCleanBid()">${my?'입찰 금액 올리기':'입찰하기'}</button>
      <div class="bid-warn">입찰하면 포인트가 바로 빠져요. ${hmOf(day.closeAt)}에 상위 ${n}명이 면제권을 받고, ${cfg.refund?'떨어지면 포인트를 돌려받아요.':'떨어지면 입찰한 포인트는 사라져요.'}</div></div></div>`}
  /* 마감 */
  const win=cleanWinners(day),iWon=win.some(x=>x.sid===s.id);
  return`<div class="clean-card dcard${iWon?' won':''}">${head}<span class="badge badge-ended">마감</span></div>${info}
    <div class="clean-status">${iWon?`<div class="green"><b>🎉 오늘 청소 면제! (${my.amount.toLocaleString()}P)</b></div>`:my?`<div class="red"><b>아쉽게 떨어졌어요 (${my.amount.toLocaleString()}P · ${mine+1}위)</b> ${cfg.refund?((s.cleanRefund||{})[key]?'· 포인트를 돌려받았어요':'· 곧 포인트를 돌려받아요'):''}</div>`:'<div>오늘은 입찰하지 않았어요.</div>'}</div>
    <div class="clean-win"><small>오늘 청소 면제 (${win.length}/${n})</small>${win.map((x,i)=>`<span class="${x.sid===s.id?'me':''}">${i+1}. ${esc(x.name)} <b>${x.amount.toLocaleString()}P</b></span>`).join('')||'<span class="small">면제자가 없어요</span>'}</div></div>`}
function cleanBidMsg(){const key=kstKey(),day=cleanDay(key),s=getMe(),el=$('cleanMsg');if(!day||!el)return;const mb=cleanMinBid(day,s.id),v=cleanBidVal||0,my=(day.bids||{})[s.id],diff=v-(my?+my.amount:0);
  let m,ok=false;if(v<mb)m='최소 '+mb.toLocaleString()+'P 이상이어야 해요';else if(v%STEP)m=STEP+'P 단위로 입력하세요';else if(diff>s.points)m='포인트가 '+(diff-s.points).toLocaleString()+'P 부족해요';else{ok=true;m=(my?'추가로 ':'')+diff.toLocaleString()+'P가 빠져요'}
  el.textContent=m;el.className='bid-msg '+(ok?'green':'red');if($('cleanBtn'))$('cleanBtn').disabled=!ok}
function cleanAdd(d){const day=cleanDay(kstKey()),mb=cleanMinBid(day,getMe().id);cleanBidVal=d?Math.max(mb,(cleanBidVal||mb))+d:mb;if(d&&cleanBidVal<mb)cleanBidVal=mb;$('cleanBid').value=cleanBidVal;cleanBidMsg()}
async function placeCleanBid(){await pull();const key=kstKey(),day=cleanDay(key),s=getMe();
  if(cleanState(day)!=='open'){uiAlert('지금은 입찰할 수 없는 시간이에요.');return renderHome()}
  const v=parseInt($('cleanBid').value)||0,mb=cleanMinBid(day,s.id),prev=((day.bids||{})[s.id]||{}).amount||0,diff=v-prev;
  if(v<mb){uiAlert('최소 '+mb.toLocaleString()+'P 이상 입찰해야 해요.');return renderHome()}
  if(v%STEP||diff<=0)return uiAlert(STEP+'P 단위로, 지금 입찰보다 높게 입력하세요.');
  if(diff>s.points)return uiAlert('포인트가 부족해요.');
  if(!await uiConfirm(`청소 면제권에 ${v.toLocaleString()}P로 입찰할까요?\n지금 ${diff.toLocaleString()}P가 빠져요. ${hmOf(day.closeAt)}에 상위 ${day.count}명이 면제권을 받아요.`,{icon:'sparkles',ok:'입찰하기'}))return;
  s.points-=diff;const upd={[SP(s.id)+'/points']:s.points,['pub/clean/days/'+key+'/bids/'+s.id]:{amount:v,name:s.name,at:Date.now()}};
  addHist(s,{label:`청소 면제권 입찰 ${keyLabel(key)} (${v.toLocaleString()}P)`,points:-diff,date:today()},upd);
  if(!await dbUpdate(upd))return renderHome();cleanBidVal=null;toast('🧹 '+v.toLocaleString()+'P로 입찰했어요');await pull();renderStudent()}
/* 마감된 날 떨어진 입찰 환불 (학생 본인이 다음에 접속할 때 자동, 관리자는 '정산'으로 한꺼번에) */
let cleanRefunding=false;
async function cleanAutoRefund(){if(cleanRefunding||!cu||cu.role!=='student')return;const cfg=cleanCfg();if(!cfg.refund)return;const s=getMe();if(!s)return;
  const todo=Object.entries(cleanDays()).filter(([k,d])=>cleanState(d)==='closed'&&(d.bids||{})[s.id]&&!cleanWinners(d).some(x=>x.sid===s.id)&&!(s.cleanRefund||{})[k]);
  if(!todo.length)return;cleanRefunding=true;
  try{for(const[k,d]of todo){let left=+d.bids[s.id].amount||0;const total=left;
      while(left>0){const part=Math.min(left,1500);left-=part;s.points+=part;const upd={[SP(s.id)+'/points']:s.points};if(!left){upd[SP(s.id)+'/cleanRefund/'+k]=true;addHist(s,{label:`청소 면제권 환불 ${keyLabel(k)} (낙찰 실패)`,points:total,date:today()},upd)}
        if(!await dbUpdate(upd))return}
      s.cleanRefund=s.cleanRefund||{};s.cleanRefund[k]=true;toast(`🧹 ${keyLabel(k)} 청소 면제권 ${total.toLocaleString()}P를 돌려받았어요`)}
    $('studentPoints').textContent=s.points}finally{cleanRefunding=false}}

/* ───── 관리자: 청소 관리 ───── */
async function ensureCleanDays(){const cfg=cleanCfg(),days=cleanDays(),upd={};if(!(DATA.clean&&DATA.clean.config))upd['pub/clean/config']=cfg;
  for(let i=0;i<21;i++){const ms=Date.now()+i*864e5,key=kstKey(ms),w=kstParts(ms).w;if(!cfg.weekdays.includes(w)||days[key]||((DATA.clean||{}).skip||{})[key])continue;
    if(i===0&&Date.now()>=kstAt(key,cfg.open))continue; /* 이미 여는 시간이 지난 오늘은 새로 만들지 않음 (갑자기 열리지 않게) */
    upd['pub/clean/days/'+key]={count:cfg.count,startPrice:cfg.startPrice,openAt:kstAt(key,cfg.open),closeAt:kstAt(key,cfg.close)}}
  if(Object.keys(upd).length){await dbUpdate(upd);await pull()}}
function renderAClean(){const el=$('adminClean');if(!el)return;const cfg=cleanCfg(),key=kstKey(),day=cleanDay(key),now=Date.now(),stt=cleanState(day,now);
  const rank=day?cleanRank(day):[],n=day?+day.count:0,win=rank.slice(0,n),winIds=new Set(win.map(x=>x.sid));
  const label={none:'오늘은 청소 면제권이 없는 날',before:hmOf(day&&day.openAt)+' 오픈 예정',open:'진행 중 · '+fmtLeft(day?day.closeAt-now:0)+' 남음',closed:'마감'}[stt];
  const cleaners=DATA.students.filter(s=>!(stt==='closed'&&winIds.has(s.id)));
  const refundTodo=!cfg.refund?0:Object.entries(cleanDays()).filter(([k,d])=>cleanState(d,now)==='closed').reduce((a,[k,d])=>{const w=new Set(cleanWinners(d).map(x=>x.sid));Object.keys(d.bids||{}).forEach(sid=>{const st=DATA.students.find(x=>x.id===sid);if(!w.has(sid)&&st&&!(st.cleanRefund||{})[k])a++});return a},0);
  const up=Object.keys(cleanDays()).filter(k=>k>key).sort().slice(0,7);
  el.innerHTML=`<div class="admin-section clean-admin"><div class="flex"><b>🧹 청소 면제권 경매</b><span class="badge ${stt==='open'?'badge-active':'badge-ended'}">${label}</span></div>
  <div class="small" style="margin:6px 0 12px">${cfg.weekdays.map(w=>WEEK[w]).join('·')}요일 ${cfg.open}~${cfg.close}에 자동으로 열리고 닫혀요. 입찰하면 포인트가 바로 빠지고, 마감 때 상위 ${cfg.count}명이 그날 청소 면제예요. 떨어진 입찰은 ${cfg.refund?'환불돼요':'소멸돼요'}.</div>
  ${day?`<div class="clean-today"><b>오늘 ${keyLabel(key)}</b> · 면제 ${n}명 · 시작가 ${(+day.startPrice).toLocaleString()}P · ${hmOf(day.openAt)}~${hmOf(day.closeAt)} · 입찰 ${rank.length}명
    <div style="overflow-x:auto;margin-top:10px"><table class="table"><thead><tr><th>순위</th><th>이름</th><th>입찰</th><th>시간</th><th>결과</th></tr></thead><tbody>${rank.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.name)}</td><td class="green">${x.amount.toLocaleString()}P</td><td class="small">${hmOf(x.at)}</td><td>${i<n?'<span class="badge badge-active">면제'+(stt==='closed'?'':' (현재)')+'</span>':'<span class="small">탈락'+(stt==='closed'?'':' (현재)')+'</span>'}</td></tr>`).join('')||'<tr><td colspan="5" class="small">아직 입찰이 없어요</td></tr>'}</tbody></table></div></div>`:''}
  <div class="clean-roster"><div><b>오늘 청소하는 학생 (${cleaners.length}명)</b><div>${cleaners.map(s=>`<span>${esc(s.name)}</span>`).join('')}</div></div>${stt==='closed'?`<div><b>오늘 면제 (${win.length}명)</b><div>${win.map(x=>`<span class="won">${esc(x.name)}</span>`).join('')||'<span class="small">없음</span>'}</div></div>`:`<div class="small">${stt==='open'||stt==='before'?'마감('+hmOf(day.closeAt)+') 후에 면제자가 확정돼요. 지금은 전원이 청소 명단에 있어요.':''}</div>`}</div>
  ${refundTodo?`<button class="btn btn-ghost btn-sm" style="margin-top:10px" onclick="settleClean()">떨어진 입찰 ${refundTodo}건 지금 환불하기</button><span class="small" style="margin-left:8px">(학생이 접속하면 자동으로 환불되지만, 한꺼번에 처리할 수도 있어요)</span>`:''}
  <div class="clean-set"><b>${ic('calendar-check')} 날짜별 설정 <span class="small">— 특정 날만 면제 인원·시작가·시간을 바꿔요</span></b>
    <div class="clean-form"><label>날짜<select class="inp" id="cleanSetDay" onchange="fillCleanDay()">${Object.keys(cleanDays()).filter(k=>k>=key).sort().slice(0,15).map(k=>`<option value="${k}">${keyLabel(k)}${k===key?' (오늘)':''}</option>`).join('')}</select></label>
    <label>면제 인원<input class="inp" type="number" id="cleanDayCount" min="0"></label><label>시작가 (P)<input class="inp" type="number" id="cleanDayPrice" step="10" min="0"></label>
    <label>여는 시간<input class="inp" type="time" id="cleanDayOpen"></label><label>닫는 시간<input class="inp" type="time" id="cleanDayClose"></label></div>
    <div style="display:flex;gap:8px"><button class="btn btn-primary" style="flex:1" onclick="saveCleanDay()">이 날짜 저장</button><button class="btn btn-danger btn-sm" onclick="removeCleanDay()">이 날은 안 열기</button></div></div>
  <div class="clean-set"><b>${ic('clock')} 매일 기본 설정 <span class="small">— 앞으로의 날짜에 적용</span></b>
    <div class="clean-form"><label>면제 인원<input class="inp" type="number" id="cleanCount" value="${cfg.count}" min="0"></label><label>시작가 (P)<input class="inp" type="number" id="cleanPrice" value="${cfg.startPrice}" step="10" min="0"></label>
    <label>여는 시간<input class="inp" type="time" id="cleanOpen" value="${cfg.open}"></label><label>닫는 시간<input class="inp" type="time" id="cleanClose" value="${cfg.close}"></label></div>
    <div class="clean-days"><span class="small">여는 요일</span>${[1,2,3,4,5,6,0].map(w=>`<label><input type="checkbox" class="cleanW" value="${w}" ${cfg.weekdays.includes(w)?'checked':''}> ${WEEK[w]}</label>`).join('')}</div>
    <label class="small"><input type="checkbox" id="cleanRefund" ${cfg.refund?'checked':''}> 떨어진 입찰 환불하기 (끄면 포인트 소멸)</label>
    <div class="small" style="margin:8px 0">저장하면 아직 입찰이 없는 앞으로의 날짜에도 새 기본 설정이 적용돼요. (입찰이 시작된 날은 '날짜별 설정'으로 바꿔 주세요)</div><button class="btn btn-primary btn-full" onclick="saveCleanCfg()">기본 설정 저장</button></div>
  ${up.length?`<div class="small" style="margin-top:12px">예정: ${up.map(k=>{const d=cleanDay(k);return`${keyLabel(k)} ${d.count}명·${(+d.startPrice).toLocaleString()}P·${hmOf(d.openAt)}~${hmOf(d.closeAt)}`}).join(' · ')}</div>`:''}</div>`;fillCleanDay()}
async function saveCleanCfg(){const cfg={count:Math.max(0,parseInt($('cleanCount').value)||0),startPrice:Math.max(0,Math.round((parseInt($('cleanPrice').value)||0)/STEP)*STEP),open:$('cleanOpen').value||CLEAN_DEF.open,close:$('cleanClose').value||CLEAN_DEF.close,
    weekdays:[...document.querySelectorAll('.cleanW:checked')].map(x=>+x.value),refund:$('cleanRefund').checked};
  if(kstAt('2000-01-01',cfg.open)>=kstAt('2000-01-01',cfg.close))return uiAlert('닫는 시간이 여는 시간보다 늦어야 해요.');
  const upd={'pub/clean/config':cfg},key=kstKey(),now=Date.now();
  Object.entries(cleanDays()).forEach(([k,d])=>{if(k<key)return;const hasBids=Object.keys(d.bids||{}).length,w=new Date(Date.UTC(...k.split('-').map((v,i)=>i===1?v-1:+v))).getUTCDay();
    if(hasBids||(k===key&&now>=d.openAt))return;if(!cfg.weekdays.includes(w)){upd['pub/clean/days/'+k]=null;return}
    upd['pub/clean/days/'+k+'/count']=cfg.count;upd['pub/clean/days/'+k+'/startPrice']=cfg.startPrice;upd['pub/clean/days/'+k+'/openAt']=kstAt(k,cfg.open);upd['pub/clean/days/'+k+'/closeAt']=kstAt(k,cfg.close)});
  if(!await dbUpdate(upd))return;await pull();await ensureCleanDays();renderAClean();toast('청소 면제권 설정을 저장했어요')}
function fillCleanDay(){const sel=$('cleanSetDay');if(!sel||!sel.value)return;const d=cleanDay(sel.value);if(!d)return;
  $('cleanDayCount').value=d.count;$('cleanDayPrice').value=d.startPrice;$('cleanDayOpen').value=hmOf(d.openAt);$('cleanDayClose').value=hmOf(d.closeAt)}
async function saveCleanDay(){const key=$('cleanSetDay').value,d=cleanDay(key);if(!d)return;
  const c=Math.max(0,parseInt($('cleanDayCount').value)||0),p=Math.max(0,Math.round((parseInt($('cleanDayPrice').value)||0)/STEP)*STEP),o=$('cleanDayOpen').value,cl=$('cleanDayClose').value;
  if(!o||!cl)return uiAlert('여는 시간과 닫는 시간을 입력하세요.');const oa=kstAt(key,o),ca=kstAt(key,cl);if(oa>=ca)return uiAlert('닫는 시간이 여는 시간보다 늦어야 해요.');
  const bids=Object.keys(d.bids||{}).length;
  if(!await uiConfirm(`${keyLabel(key)} 청소 면제권을 바꿀까요?\n면제 ${c}명 · 시작가 ${p.toLocaleString()}P · ${o}~${cl}${bids?'\n이미 '+bids+'명이 입찰했어요. 이미 낸 입찰 금액은 그대로예요.':''}`))return;
  if(!await dbUpdate({['pub/clean/days/'+key+'/count']:c,['pub/clean/days/'+key+'/startPrice']:p,['pub/clean/days/'+key+'/openAt']:oa,['pub/clean/days/'+key+'/closeAt']:ca}))return;
  await pull();renderAClean();if($('cleanSetDay')){$('cleanSetDay').value=key;fillCleanDay()}toast(keyLabel(key)+' 청소 면제권을 바꿨어요')}
async function removeCleanDay(){const key=$('cleanSetDay').value,d=cleanDay(key);if(!d)return;
  if(Object.keys(d.bids||{}).length)return uiAlert('이미 입찰한 학생이 있어서 이 날을 지울 수 없어요.\n면제 인원을 0명으로 바꾸거나, 마감 후 환불해 주세요.');
  if(!await uiConfirm(`${keyLabel(key)}에는 청소 면제권 경매를 열지 않을까요?`))return;
  if(!await dbUpdate({['pub/clean/days/'+key]:null,['pub/clean/skip/'+key]:true}))return;await pull();renderAClean();toast(keyLabel(key)+'에는 열지 않아요')}
async function settleClean(){if(!await uiConfirm('마감된 날의 떨어진 입찰을 모두 환불할까요?'))return;await pull();const now=Date.now(),upd={};let n=0;
  Object.entries(cleanDays()).forEach(([k,d])=>{if(cleanState(d,now)!=='closed')return;const w=new Set(cleanWinners(d).map(x=>x.sid));
    Object.entries(d.bids||{}).forEach(([sid,b])=>{const st=DATA.students.find(x=>x.id===sid);if(w.has(sid)||!st||(st.cleanRefund||{})[k])return;
      st.points+=+b.amount||0;upd[SP(sid)+'/points']=st.points;upd[SP(sid)+'/cleanRefund/'+k]=true;addHist(st,{label:`청소 면제권 환불 ${keyLabel(k)} (낙찰 실패)`,points:+b.amount||0,date:today()},upd);n++})});
  if(!n)return toast('환불할 입찰이 없어요');if(!await dbUpdate(upd))return;await pull();renderAClean();toast(n+'건 환불했어요')}
