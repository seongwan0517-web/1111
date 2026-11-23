/* 예비고1 수학: 하루 5문제 (중학교 5개 단원에서 1문제씩), Day 1~20
   문제 목록·일정 = premath-data.js / 정답 = DB mathProblems/preAnswers (로그인해야 읽힘)
   학생 기록 = pub/students/{id}/preMathResults/dayN, 열림 여부 = pub/preMathTests/dayN/open */
let currentPM=null,pmLock=false,pmAnswers=null;
const PM_DAYS=Object.keys(PRE_MATH.schedule).length;
const pmKey=d=>'day'+d;
const pmConf=d=>(DATA.preMathTests||{})[pmKey(d)]||{open:false};
const pmProb=id=>PRE_MATH.problems[id];
const pmArea=id=>(PRE_MATH.areas.find(a=>a.id===pmProb(id).area)||{}).name||'';
const pmAnsText=(p,v)=>v==null||v===''?'-':(p.type==='mc'?CIRCLED[v-1]||v:String(v));
async function pmLoadAnswers(){if(!pmAnswers)pmAnswers=await api('mathProblems/preAnswers')||{};return pmAnswers}
const pmFig=id=>`<div class="math-fig pm-fig" onclick="mathZoom(this.querySelector('img').src)"><img src="${esc(pmProb(id).img)}" alt="문제" loading="lazy"></div>`;
const pmChips=ids=>`<div class="pm-chips">${ids.map(id=>`<span>${esc(pmArea(id).split(' · ')[0])}</span>`).join('')}</div>`;

/* ───── 학생 ───── */
function renderSPreMath(){
  const el=$('s-premath');if(!el)return;pmLock=false;const s=getMe(),R=s.preMathResults||{};
  let done=0,ok=0,tot=0,pts=0,openN=0;
  for(let d=1;d<=PM_DAYS;d++){const r=R[pmKey(d)];if(r&&r.completed){done++;const it=arr(r.items);tot+=it.length;ok+=it.filter(x=>x.correct).length;pts+=r.pointsAwarded||0}else if(pmConf(d).open)openN++}
  let h=`<div class="banner"><div class="small" style="color:#ffb3b8">예비 고1 수학 · 하루 5문제 · 중학교 전 범위</div>
    <div class="bstats"><div><div class="small">완료</div><b>${done}<small>/${PM_DAYS}일</small></b></div><div><div class="small">정답</div><b>${ok}<small>/${tot}</small></b></div><div><div class="small">획득 포인트</div><b class="green">${pts}P</b></div><div><div class="small">지금 풀 수 있는 날</div><b class="orange">${openN}</b></div></div></div>
    <div class="pm-legend">${PRE_MATH.areas.map((a,i)=>`<span><b>${i+1}</b>${esc(a.name)}</span>`).join('')}</div>`;
  const cards=[];
  for(let d=1;d<=PM_DAYS;d++){const ids=PRE_MATH.schedule[pmKey(d)],r=R[pmKey(d)],c=pmConf(d);
    if(r&&r.completed){const it=arr(r.items),cc=it.filter(x=>x.correct).length,wrong=it.length-cc;
      cards.push(`<div class="auction-card vcard done"><div class="flex"><div class="ac-title">Day ${d}</div><span class="badge ${cc===it.length?'badge-winner':'badge-ended'}">${cc}/${it.length} 정답 · +${r.pointsAwarded||0}P</span></div>${pmChips(ids)}
      <div class="ac-row"><button class="btn btn-primary" style="flex:1" onclick="showPMResult(${d})">결과 보기</button>${wrong?`<button class="btn btn-success" style="flex:1" onclick="startPM(${d},true)">${ic('rotate-ccw')} 틀린 문제 다시</button>`:''}</div></div>`)}
    else if(c.open)cards.push(`<div class="auction-card vcard open"><div class="flex"><div class="ac-title">Day ${d}</div><span class="badge badge-active">풀 수 있어요</span></div>${pmChips(ids)}<div class="ac-meta">5문제 · 정답 1개당 ${PRE_MATH_POINTS}P · 1번만 제출</div><button class="btn btn-primary btn-full" onclick="startPM(${d})">문제 풀기</button></div>`);
    else cards.push(`<div class="auction-card vcard locked"><div class="flex"><div class="ac-title">Day ${d}</div><span class="badge badge-ended">${ic('lock')} 잠김</span></div>${pmChips(ids)}</div>`)}
  el.innerHTML=h+`<div class="cgrid">${cards.join('')}</div>`;
}
async function startPM(d,retry){const s=getMe(),r=(s.preMathResults||{})[pmKey(d)];let ids=PRE_MATH.schedule[pmKey(d)];
  if(retry){if(!r||!r.completed)return;ids=arr(r.items).filter(x=>!x.correct).map(x=>x.id);if(!ids.length)return uiAlert('틀린 문제가 없어요.');
    if(!await uiConfirm(`Day ${d}에서 틀린 ${ids.length}문제를 다시 풀어볼까요?\n다시 풀기는 포인트 없이 연습용이에요.`,{icon:'rotate-ccw'}))return}
  else{if(r&&r.completed){uiAlert('이미 제출한 날이에요.');return renderSPreMath()}
    if(!pmConf(d).open){uiAlert('아직 열리지 않은 날이에요.');return renderSPreMath()}
    if(!await uiConfirm(`Day ${d} 수학 5문제를 시작할까요?\n제출하면 다시 제출할 수 없어요. (중간에 나가면 나중에 다시 풀 수 있어요)`,{icon:'pi'}))return}
  try{await pmLoadAnswers()}catch(e){return uiAlert('문제를 불러오지 못했습니다.\n'+e.message)}
  currentPM={d,ids,pos:0,sel:[],retry:!!retry};renderPMQ()}
function renderPMQ(){const c=currentPM,id=c.ids[c.pos],p=pmProb(id),last=c.pos===c.ids.length-1,v=c.sel[c.pos];
  const input=p.type==='mc'
    ?`<div class="math-choices">${[1,2,3,4,5].map(n=>`<button class="btn math-choice${n===5?' wide':''}${v===n?' selected':''}" onclick="selPM(${n})">${CIRCLED[n-1]}</button>`).join('')}</div>`
    :`<div class="pm-num"><input type="number" inputmode="numeric" id="pmNum" placeholder="정답 숫자 입력" value="${v!=null?esc(v):''}" oninput="numPM(this.value)"><span>단답형</span></div>`;
  $('s-premath').innerHTML=`<div class="auction-card quiz"><div class="flex"><div class="ac-title">Day ${c.d} ${c.retry?'· 틀린 문제 다시':'수학'}</div><span class="badge badge-active">${c.pos+1} / ${c.ids.length}</span></div>
  <div class="qbar"><i style="width:${Math.round(c.pos/c.ids.length*100)}%"></i></div>
  <div class="pm-tag"><b>${esc(pmArea(id))}</b> · ${esc(p.topic)} <span class="small">(${esc(p.exam)} ${p.no}번 · ${p.pts}점)</span></div>${pmFig(id)}
  <div class="small" style="margin-bottom:8px">${p.type==='mc'?'정답 번호를 고르세요':'정답을 숫자로 입력하세요'}</div>${input}
  <div style="display:flex;gap:8px;margin-top:16px"><button class="btn" style="flex:1" onclick="cancelPM()">나가기</button>${c.pos?`<button class="btn btn-ghost" style="flex:1" onclick="movePM(-1)">이전</button>`:''}<button class="btn btn-primary" style="flex:2" id="pmNext" ${v==null||v===''?'disabled':''} onclick="nextPM()">${last?'제출하기':'다음 문제'}</button></div></div>`;
  window.scrollTo(0,0);const ni=$('pmNum');if(ni)ni.addEventListener('keydown',e=>{if(e.key==='Enter'&&!$('pmNext').disabled)nextPM()})}
function selPM(n){currentPM.sel[currentPM.pos]=n;document.querySelectorAll('#s-premath .math-choice').forEach((b,i)=>b.classList.toggle('selected',i+1===n));$('pmNext').disabled=false}
function numPM(v){v=String(v).trim();currentPM.sel[currentPM.pos]=v===''?null:v;$('pmNext').disabled=v===''}
function movePM(k){currentPM.pos+=k;renderPMQ()}
async function cancelPM(){if(!currentPM.retry&&!await uiConfirm('지금 나가면 제출하지 않은 것으로 처리돼요.\n나중에 처음부터 다시 풀 수 있어요. 나갈까요?',{ok:'나가기'}))return;currentPM=null;renderSPreMath()}
async function nextPM(){const c=currentPM;if(c.pos<c.ids.length-1){c.pos++;return renderPMQ()}
  if(!c.retry&&!await uiConfirm('제출할까요?\n제출하면 답을 바꿀 수 없어요.',{ok:'제출하기'}))return;
  const A=await pmLoadAnswers();
  const items=c.ids.map((id,k)=>{const p=pmProb(id),raw=c.sel[k],sel=p.type==='mc'?+raw:Number(raw);return{id,selected:p.type==='mc'?sel:String(raw),correct:sel===Number(A[id])}});
  const oks=items.filter(x=>x.correct).length;
  if(c.retry){currentPM=null;toast('연습 결과 '+oks+'/'+items.length+' 정답');return showPMResult(c.d,items,true)}
  await pull();const s=getMe(),k=pmKey(c.d);s.preMathResults=s.preMathResults||{};
  if(s.preMathResults[k]&&s.preMathResults[k].completed){currentPM=null;uiAlert('이미 제출한 날이에요.');return renderSPreMath()}
  const pts=oks*PRE_MATH_POINTS,res={completed:true,items,date:today(),pointsAwarded:pts};s.preMathResults[k]=res;
  const upd={[SP(s.id)+'/preMathResults/'+k]:res};
  if(pts){s.points+=pts;upd[SP(s.id)+'/points']=s.points;addHist(s,{label:'예비고1 수학 Day '+c.d+' ('+oks+'/'+items.length+')',points:pts,date:today()},upd)}
  if(!await dbUpdate(upd)){currentPM=null;return renderSPreMath()}
  currentPM=null;$('studentPoints').textContent=s.points;toast('📐 '+oks+'/'+items.length+' 정답'+(pts?' +'+pts+'P':''));showPMResult(c.d)}
async function showPMResult(d,items,retry){pmLock=true;const el=$('s-premath');
  if(!items){const r=(getMe().preMathResults||{})[pmKey(d)];if(!r)return renderSPreMath();items=arr(r.items)}
  let A;try{A=await pmLoadAnswers()}catch(e){A={}}
  const oks=items.filter(x=>x.correct).length,wrong=items.length-oks;
  el.innerHTML=`<div class="auction-card"><div class="flex"><div class="ac-title">Day ${d} ${retry?'다시 풀기 ':''}결과</div><span class="badge ${oks===items.length?'badge-winner':'badge-ended'}">${oks}/${items.length} 정답</span></div>
  <div class="pm-score ${oks===items.length?'green':''}">${oks}<small>/${items.length}</small></div>
  ${items.map((x,i)=>{const p=pmProb(x.id);return`<div class="q-block pm-res ${x.correct?'ok':'no'}"><div class="flex"><b>${i+1}. ${esc(pmArea(x.id))} · ${esc(p.topic)}</b><span class="badge ${x.correct?'badge-active':'badge-ended'}">${ic(x.correct?'circle-check':'circle-x')} ${x.correct?'정답':'오답'}</span></div>${pmFig(x.id)}
    <div class="small ${x.correct?'green':'red'}">내 답: ${esc(pmAnsText(p,x.selected))}</div><div class="small green" style="font-weight:700">정답: ${esc(pmAnsText(p,A[x.id]))}</div><div class="small">출처: ${esc(p.exam)} ${p.no}번</div></div>`}).join('')}
  <div style="display:flex;gap:8px;margin-top:14px">${!retry&&wrong?`<button class="btn btn-success" style="flex:1" onclick="startPM(${d},true)">${ic('rotate-ccw')} 틀린 문제 다시</button>`:''}<button class="btn btn-primary" style="flex:1" onclick="renderSPreMath()">목록으로</button></div></div>`;
  window.scrollTo(0,0)}

/* ───── 관리자 ───── */
function renderAPreMath(){const el=$('adminPreMathList');if(!el)return;if($('pmPts'))$('pmPts').textContent=PRE_MATH_POINTS;
  const n=d=>DATA.students.filter(s=>s.preMathResults&&s.preMathResults[pmKey(d)]&&s.preMathResults[pmKey(d)].completed);
  let h='';for(let d=1;d<=PM_DAYS;d++){const c=pmConf(d),done=n(d);let ok=0,tot=0;done.forEach(s=>{const it=arr(s.preMathResults[pmKey(d)].items);tot+=it.length;ok+=it.filter(x=>x.correct).length});
    h+=`<div class="admin-card"><div class="flex" style="align-items:flex-start"><div><b>Day ${d}</b>${pmChips(PRE_MATH.schedule[pmKey(d)])}<div class="small">응시 ${done.length}/${DATA.students.length}명 · 정답률 ${tot?Math.round(ok/tot*100):0}%</div></div>
    <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end"><span class="badge ${c.open?'badge-active':'badge-ended'}">${c.open?'열림':'닫힘'}</span><button class="btn btn-sm ${c.open?'btn-danger':'btn-primary'}" onclick="togglePM(${d})">${c.open?'닫기':'열기'}</button></div></div></div>`}
  el.innerHTML=`<div class="cgrid">${h}</div>`;renderAPMScore()}
async function togglePM(d){await pull();const c=pmConf(d),v=!c.open;if(!await dbUpdate({['pub/preMathTests/'+pmKey(d)+'/open']:v}))return;await pull();renderAPreMath();toast('예비고1 수학 Day '+d+(v?' 열림':' 닫힘'))}
async function setPMAll(open){if(!await uiConfirm('예비고1 수학 Day 1~'+PM_DAYS+'을 모두 '+(open?'열까요?':'닫을까요?')))return;const upd={};for(let d=1;d<=PM_DAYS;d++)upd['pub/preMathTests/'+pmKey(d)+'/open']=open;if(!await dbUpdate(upd))return;await pull();renderAPreMath()}
async function renderAPMScore(){const sel=$('pmScoreDay');if(!sel)return;if(!sel.options.length)sel.innerHTML=Array.from({length:PM_DAYS},(_,i)=>`<option value="${i+1}">Day ${i+1}</option>`).join('');
  const d=+sel.value||1,ids=PRE_MATH.schedule[pmKey(d)];let A={};try{A=await pmLoadAnswers()}catch(e){}
  const head=ids.map((id,i)=>`<th title="${esc(pmProb(id).topic)}">${i+1}번<br><span class="small">정답 ${esc(pmAnsText(pmProb(id),A[id]))}</span></th>`).join('');
  const rows=DATA.students.map(s=>{const r=s.preMathResults&&s.preMathResults[pmKey(d)];if(!(r&&r.completed))return`<tr><td>${esc(s.name)}</td><td colspan="${ids.length+1}" class="small">미응시</td></tr>`;
    const it=arr(r.items),cc=it.filter(x=>x.correct).length;return`<tr><td>${esc(s.name)}</td>${ids.map((id,i)=>{const x=it[i]||{};return`<td class="${x.correct?'green':'red'}">${esc(pmAnsText(pmProb(id),x.selected))}</td>`}).join('')}<td><b>${cc}/${it.length}</b></td></tr>`}).join('');
  $('adminPMScore').innerHTML=`<div style="overflow-x:auto"><table class="table"><thead><tr><th>이름</th>${head}<th>점수</th></tr></thead><tbody>${rows}</tbody></table></div>`}
