/* 예비고1 수학 + 정복노트 (같은 탭 안의 두 화면: Day 문제 / 정복노트)
   - Day 1~12: 새 문제 5개 (premath-data.js의 schedule)
   - 틀린 문제는 학생별 노트(pub/students/{id}/preMath/notebook)에 쌓이고, 다음 날부터 새 문제와 함께 다시 나옴
   - 노트 문제를 맞히면 노트에서 빠지고 '정복한 문제'(preMath/mastered)로 이동
   - 노트 문제는 하루에 한 번만 도전 (찍어서 바로 지우기 방지), 3번 틀리면 정답을 보여 줌
   - 정답 = DB mathProblems/preAnswers (로그인해야 읽힘), 열림 여부 = pub/preMathTests/dayN/open */
let currentPM=null,pmLock=false,pmAnswers=null,pmView='days';
function pmSetView(v){pmView=v;renderSPreMath()}
/* 탭 안 상단 전환 버튼: Day 문제 | 정복노트 */
function pmSeg(s){const nbN=Object.keys(pmState(s).notebook).length,due=pmDue(s).length;
  return`<div class="pm-seg" role="tablist"><button role="tab" class="${pmView==='days'?'on':''}" onclick="pmSetView('days')">${ic('pi')} Day 문제</button><button role="tab" class="${pmView==='note'?'on':''}" onclick="pmSetView('note')">${ic('book-open')} 정복노트${nbN?`<span class="pm-cnt">${nbN}</span>`:''}${due?'<i class="pm-dot" title="오늘 도전할 문제가 있어요"></i>':''}</button></div>`}
const PM_DAYS=Object.keys(PRE_MATH.schedule).length,PM_REVIEW_CAP=10,PM_REVEAL_AFTER=3;
const pmKey=d=>'day'+d;
const pmConf=d=>(DATA.preMathTests||{})[pmKey(d)]||{open:false};
const pmProb=id=>PRE_MATH.problems[id];
const pmArea=id=>(PRE_MATH.areas.find(a=>a.id===pmProb(id).area)||{}).name||'';
const pmAnsText=(p,v)=>v==null||v===''?'-':(p.type==='mc'?CIRCLED[v-1]||v:String(v));
async function pmLoadAnswers(){if(!pmAnswers)pmAnswers=await api('mathProblems/preAnswers')||{};return pmAnswers}
const pmFig=id=>`<div class="math-fig pm-fig" onclick="mathZoom(this.querySelector('img').src)"><img src="${esc(pmProb(id).img)}" alt="문제" loading="lazy"></div>`;
const pmChips=ids=>`<div class="pm-chips">${ids.map(id=>`<span>${esc(pmArea(id).split(' · ')[0])}</span>`).join('')}</div>`;
const pmState=s=>{s.preMath=s.preMath||{};s.preMath.notebook=s.preMath.notebook||{};s.preMath.mastered=s.preMath.mastered||{};return s.preMath};
/* 오늘 도전할 수 있는 노트 문제 (오늘 이미 도전한 문제 제외, 오래된 것부터) */
function pmDue(s,exclude){const nb=pmState(s).notebook,t=dayStr();
  return Object.keys(nb).filter(id=>pmProb(id)&&nb[id].lastTried!==t&&!(exclude||[]).includes(id)).sort((a,b)=>(nb[a].addedAt||0)-(nb[b].addedAt||0)).slice(0,PM_REVIEW_CAP)}

/* ───── 학생: 목록 ───── */
function renderSPreMath(){
  if(pmView==='note')return showPMNote();
  const el=$('s-premath');if(!el)return;pmLock=false;const s=getMe(),R=s.preMathResults||{},st=pmState(s);
  const nbN=Object.keys(st.notebook).length,msN=Object.keys(st.mastered).length,due=pmDue(s).length;
  let done=0,ok=0,tot=0,pts=0,openN=0;
  for(let d=1;d<=PM_DAYS;d++){const r=R[pmKey(d)];if(r&&r.completed){done++;const it=arr(r.items).filter(x=>!x.review);tot+=it.length;ok+=it.filter(x=>x.correct).length;pts+=r.pointsAwarded||0}else if(pmConf(d).open)openN++}
  let h=pmSeg(s)+(due?`<div class="pm-hint" onclick="pmSetView('note')">${ic('book-open')} 정복노트에 오늘 다시 도전할 문제가 <b>${due}개</b> 있어요 · 정복하면 ${PRE_MATH_REVIEW_POINTS}P씩${ic('chevron-right')}</div>`:'')+`<div class="banner"><div class="small" style="color:#ffb3b8">예비 고1 수학 · 하루 새 문제 5개 + 정복노트 문제 · 중학교 전 범위</div>
    <div class="bstats"><div><div class="small">완료</div><b>${done}<small>/${PM_DAYS}일</small></b></div><div><div class="small">새 문제 정답</div><b>${ok}<small>/${tot}</small></b></div><div><div class="small">획득 포인트</div><b class="green">${pts}P</b></div><div><div class="small">지금 풀 수 있는 날</div><b class="orange">${openN}</b></div></div></div>
  <div class="pm-legend">${PRE_MATH.areas.map((a,i)=>`<span><b>${i+1}</b>${esc(a.name)}</span>`).join('')}</div>`;
  const cards=[];
  for(let d=1;d<=PM_DAYS;d++){const ids=PRE_MATH.schedule[pmKey(d)],r=R[pmKey(d)],c=pmConf(d);
    if(r&&r.completed){const it=arr(r.items).filter(x=>!x.review),cc=it.filter(x=>x.correct).length,rv=arr(r.items).filter(x=>x.review);
      cards.push(`<div class="auction-card vcard done"><div class="flex"><div class="ac-title">Day ${d}</div><span class="badge ${cc===it.length?'badge-winner':'badge-ended'}">${cc}/${it.length} 정답 · +${r.pointsAwarded||0}P</span></div>${pmChips(ids)}
      ${rv.length?`<div class="ac-meta">노트 문제 ${rv.filter(x=>x.correct).length}/${rv.length} 정복</div>`:''}<button class="btn btn-primary btn-full" onclick="showPMResult(${d})">결과 보기</button></div>`)}
    else if(c.open){const rv=pmDue(s,ids).length;cards.push(`<div class="auction-card vcard open"><div class="flex"><div class="ac-title">Day ${d}</div><span class="badge badge-active">풀 수 있어요</span></div>${pmChips(ids)}<div class="ac-meta">새 문제 5개${rv?` + 정복노트 ${rv}개`:''} · 1번만 제출</div><button class="btn btn-primary btn-full" onclick="startPM(${d})">문제 풀기</button></div>`)}
    else cards.push(`<div class="auction-card vcard locked"><div class="flex"><div class="ac-title">Day ${d}</div><span class="badge badge-ended">${ic('lock')} 잠김</span></div>${pmChips(ids)}</div>`)}
  el.innerHTML=h+`<div class="cgrid">${cards.join('')}</div>`;
}

/* ───── 학생: 풀기 ───── */
async function startPM(d){const s=getMe(),r=(s.preMathResults||{})[pmKey(d)];
  if(r&&r.completed){uiAlert('이미 제출한 날이에요.');return renderSPreMath()}
  if(!pmConf(d).open){uiAlert('아직 열리지 않은 날이에요.');return renderSPreMath()}
  const fresh=PRE_MATH.schedule[pmKey(d)],rev=pmDue(s,fresh);
  if(!await uiConfirm(`Day ${d} 문제를 시작할까요?\n새 문제 5개${rev.length?' + 정복노트 문제 '+rev.length+'개':''}를 풀어요.\n제출하면 다시 제출할 수 없어요. (중간에 나가면 나중에 다시 풀 수 있어요)`,{icon:'pi'}))return;
  try{await pmLoadAnswers()}catch(e){return uiAlert('문제를 불러오지 못했습니다.\n'+e.message)}
  currentPM={d,list:[...fresh.map(id=>({id})),...rev.map(id=>({id,review:true}))],pos:0,sel:[]};renderPMQ()}
async function startPMNote(){const s=getMe(),rev=pmDue(s);if(!rev.length){uiAlert('오늘 도전할 정복노트 문제가 없어요.\n노트 문제는 하루에 한 번씩 도전할 수 있어요.');return renderSPreMath()}
  if(!await uiConfirm(`정복노트 문제 ${rev.length}개를 풀까요?\n맞히면 노트에서 빠지고 ${PRE_MATH_REVIEW_POINTS}P씩 받아요. 틀리면 내일 다시 나와요.`,{icon:'book-open'}))return;
  try{await pmLoadAnswers()}catch(e){return uiAlert('문제를 불러오지 못했습니다.\n'+e.message)}
  currentPM={d:null,list:rev.map(id=>({id,review:true})),pos:0,sel:[]};renderPMQ()}
function renderPMQ(){const c=currentPM,it=c.list[c.pos],id=it.id,p=pmProb(id),last=c.pos===c.list.length-1,v=c.sel[c.pos];
  const nb=pmState(getMe()).notebook[id];
  const input=p.type==='mc'
    ?`<div class="math-choices">${[1,2,3,4,5].map(n=>`<button class="btn math-choice${n===5?' wide':''}${v===n?' selected':''}" onclick="selPM(${n})">${CIRCLED[n-1]}</button>`).join('')}</div>`
    :`<div class="pm-num"><input type="number" inputmode="numeric" id="pmNum" placeholder="정답 숫자 입력" value="${v!=null?esc(v):''}" oninput="numPM(this.value)"><span>단답형</span></div>`;
  $('s-premath').innerHTML=`<div class="auction-card quiz"><div class="flex"><div class="ac-title">${c.d?'Day '+c.d+' 수학':'정복노트'}</div><span class="badge badge-active">${c.pos+1} / ${c.list.length}</span></div>
  <div class="qbar"><i style="width:${Math.round(c.pos/c.list.length*100)}%"></i></div>
  <div class="pm-tag">${it.review?`<span class="pm-rv">${ic('book-open')} 노트 문제${nb?' · '+nb.tries+'번 틀림':''}</span> `:'<span class="pm-new">새 문제</span> '}<b>${esc(pmArea(id))}</b> · ${esc(p.topic)} <span class="small">(${esc(p.exam)} ${p.no}번 · ${p.pts}점)</span></div>${pmFig(id)}
  <div class="small" style="margin-bottom:8px">${p.type==='mc'?'정답 번호를 고르세요':'정답을 숫자로 입력하세요'}</div>${input}
  <div style="display:flex;gap:8px;margin-top:16px"><button class="btn" style="flex:1" onclick="cancelPM()">나가기</button>${c.pos?`<button class="btn btn-ghost" style="flex:1" onclick="movePM(-1)">이전</button>`:''}<button class="btn btn-primary" style="flex:2" id="pmNext" ${v==null||v===''?'disabled':''} onclick="nextPM()">${last?'제출하기':'다음 문제'}</button></div></div>`;
  window.scrollTo(0,0);const ni=$('pmNum');if(ni)ni.addEventListener('keydown',e=>{if(e.key==='Enter'&&!$('pmNext').disabled)nextPM()})}
function selPM(n){currentPM.sel[currentPM.pos]=n;document.querySelectorAll('#s-premath .math-choice').forEach((b,i)=>b.classList.toggle('selected',i+1===n));$('pmNext').disabled=false}
function numPM(v){v=String(v).trim();currentPM.sel[currentPM.pos]=v===''?null:v;$('pmNext').disabled=v===''}
function movePM(k){currentPM.pos+=k;renderPMQ()}
async function cancelPM(){if(!await uiConfirm('지금 나가면 제출하지 않은 것으로 처리돼요.\n나중에 처음부터 다시 풀 수 있어요. 나갈까요?',{ok:'나가기'}))return;currentPM=null;renderSPreMath()}
async function nextPM(){const c=currentPM;if(c.pos<c.list.length-1){c.pos++;return renderPMQ()}
  if(!await uiConfirm('제출할까요?\n제출하면 답을 바꿀 수 없어요.',{ok:'제출하기'}))return;
  const A=await pmLoadAnswers();await pull();const s=getMe(),st=pmState(s),t=dayStr(),now=Date.now(),P=SP(s.id)+'/preMath/';
  if(c.d&&(s.preMathResults||{})[pmKey(c.d)]&&s.preMathResults[pmKey(c.d)].completed){currentPM=null;uiAlert('이미 제출한 날이에요.');return renderSPreMath()}
  const upd={},items=[];let pts=0,newOk=0,revOk=0,revN=0;
  c.list.forEach((it,k)=>{const id=it.id,p=pmProb(id),raw=c.sel[k],sel=p.type==='mc'?+raw:Number(raw),ok=sel===Number(A[id]);
    const rec={id,selected:p.type==='mc'?sel:String(raw),correct:ok};if(it.review)rec.review=true;
    const nb=st.notebook[id];
    if(it.review){revN++;if(!nb)return; // 다른 기기에서 이미 처리됨
      if(ok){revOk++;pts+=PRE_MATH_REVIEW_POINTS;upd[P+'notebook/'+id]=null;upd[P+'mastered/'+id]={date:today(),tries:(nb.tries||0)+1,fromDay:nb.fromDay||null};delete st.notebook[id];st.mastered[id]=upd[P+'mastered/'+id]}
      else{nb.tries=(nb.tries||0)+1;nb.lastTried=t;upd[P+'notebook/'+id+'/tries']=nb.tries;upd[P+'notebook/'+id+'/lastTried']=t}}
    else{if(ok){newOk++;pts+=PRE_MATH_POINTS}else{const n={added:today(),addedAt:now+k,fromDay:c.d,tries:1,lastTried:t};upd[P+'notebook/'+id]=n;st.notebook[id]=n}}
    rec.tries=(st.notebook[id]||st.mastered[id]||{}).tries||(ok?0:1);items.push(rec)});
  if(c.d){const res={completed:true,items,date:today(),pointsAwarded:pts};s.preMathResults=s.preMathResults||{};s.preMathResults[pmKey(c.d)]=res;upd[SP(s.id)+'/preMathResults/'+pmKey(c.d)]=res}
  if(pts){s.points+=pts;upd[SP(s.id)+'/points']=s.points;
    addHist(s,{label:c.d?`예비고1 수학 Day ${c.d} (새 ${newOk}/${items.length-revN}${revN?`, 노트 ${revOk}/${revN}`:''})`:`예비고1 수학 정복노트 (${revOk}/${revN} 정복)`,points:pts,date:today()},upd)}
  if(!await dbUpdate(upd)){currentPM=null;return renderSPreMath()}
  currentPM=null;$('studentPoints').textContent=s.points;
  toast(c.d?`📐 새 문제 ${newOk}/${items.length-revN}${revN?` · 노트 ${revOk}/${revN} 정복`:''}${pts?' +'+pts+'P':''}`:`📘 노트 ${revOk}/${revN} 정복${pts?' +'+pts+'P':''}`);
  showPMResult(c.d,items)}

/* ───── 결과 · 노트 보기 ───── */
const pmReveal=(x,ok)=>ok||(x&&(x.tries||0)>=PM_REVEAL_AFTER);
function pmItemBlock(x,i,A){const p=pmProb(x.id),st=pmState(getMe()),nb=st.notebook[x.id],show=pmReveal(nb||x,x.correct)||!!st.mastered[x.id];
  return`<div class="q-block pm-res ${x.correct?'ok':'no'}"><div class="flex"><b>${i+1}. ${x.review?'<span class="pm-rv">노트</span> ':''}${esc(pmArea(x.id))} · ${esc(p.topic)}</b><span class="badge ${x.correct?'badge-active':'badge-ended'}">${ic(x.correct?'circle-check':'circle-x')} ${x.correct?(x.review?'정복!':'정답'):'오답'}</span></div>${pmFig(x.id)}
    <div class="small ${x.correct?'green':'red'}">내 답: ${esc(pmAnsText(p,x.selected))}</div>
    ${show?`<div class="small green" style="font-weight:700">정답: ${esc(pmAnsText(p,A[x.id]))}</div>`:`<div class="small orange">${ic('book-open')} 정복노트에 저장됐어요. 다음에 다시 도전! (${PM_REVEAL_AFTER}번 틀리면 정답을 알려 줘요)</div>`}
    <div class="small">출처: ${esc(p.exam)} ${p.no}번</div></div>`}
async function showPMResult(d,items){pmLock=true;const el=$('s-premath');
  if(!items){const r=(getMe().preMathResults||{})[pmKey(d)];if(!r)return renderSPreMath();items=arr(r.items)}
  let A;try{A=await pmLoadAnswers()}catch(e){A={}}
  const fresh=items.filter(x=>!x.review),rv=items.filter(x=>x.review),fo=fresh.filter(x=>x.correct).length,ro=rv.filter(x=>x.correct).length;
  el.innerHTML=`<div class="auction-card"><div class="flex"><div class="ac-title">${d?'Day '+d+' 결과':'노트 문제 결과'}</div></div>
  <div class="pm-sum">${fresh.length?`<div><small>새 문제</small><b class="${fo===fresh.length?'green':''}">${fo}/${fresh.length}</b></div>`:''}${rv.length?`<div><small>노트 정복</small><b class="${ro===rv.length?'green':''}">${ro}/${rv.length}</b></div>`:''}<div><small>노트에 남은 문제</small><b class="red">${Object.keys(pmState(getMe()).notebook).length}</b></div></div>
  ${items.map((x,i)=>pmItemBlock(x,i,A)).join('')}
  <div style="display:flex;gap:8px;margin-top:14px"><button class="btn btn-ghost" style="flex:1" onclick="pmSetView('note')">${ic('book-open')} 정복노트 보기</button><button class="btn btn-primary" style="flex:1" onclick="pmSetView('days')">Day 목록으로</button></div></div>`;
  window.scrollTo(0,0)}
async function showPMNote(){pmView='note';pmLock=true;const el=$('s-premath'),s=getMe(),st=pmState(s);let A;try{A=await pmLoadAnswers()}catch(e){A={}}
  const nb=Object.keys(st.notebook).filter(pmProb).sort((a,b)=>(st.notebook[a].addedAt||0)-(st.notebook[b].addedAt||0)),ms=Object.keys(st.mastered).filter(pmProb),due=pmDue(s).length,t=dayStr();
  const byArea=PRE_MATH.areas.map(a=>({a,n:nb.filter(id=>pmProb(id).area===a.id).length})).filter(x=>x.n);
  el.innerHTML=pmSeg(s)+`<div class="auction-card"><div class="flex"><div class="ac-title">${ic('book-open')} 나만의 정복노트</div></div>
  <div class="small" style="margin:6px 0 0">틀린 문제가 여기에 쌓여요. 맞히면 '정복한 문제'로 옮겨지고, 노트 문제는 하루에 한 번씩 도전할 수 있어요.</div>
  <div class="pm-sum"><div><small>남은 문제</small><b class="red">${nb.length}</b></div><div><small>정복한 문제</small><b class="green">${ms.length}</b></div><div><small>오늘 도전 가능</small><b class="orange">${due}</b></div></div>
  ${byArea.length?`<div class="pm-chips">${byArea.map(x=>`<span>${esc(x.a.name.split(' · ')[0])} ${x.n}</span>`).join('')}</div>`:''}
  ${due?`<button class="btn btn-primary btn-full" style="margin-bottom:12px" onclick="startPMNote()">노트 문제 ${due}개 풀기</button>`:nb.length?'<div class="warn">오늘은 노트 문제를 모두 도전했어요. 내일 다시 도전해요!</div>':''}
  ${nb.length?nb.map((id,i)=>{const n=st.notebook[id],p=pmProb(id);return`<div class="q-block pm-res no"><div class="flex"><b>${i+1}. ${esc(pmArea(id))} · ${esc(p.topic)}</b><span class="badge badge-ended">${n.tries||1}번 틀림${n.lastTried===t?' · 오늘 도전함':''}</span></div>${pmFig(id)}
    ${pmReveal(n)?`<div class="small green" style="font-weight:700">정답: ${esc(pmAnsText(p,A[id]))} (다시 맞혀야 노트에서 빠져요)</div>`:`<div class="small">${PM_REVEAL_AFTER-(n.tries||1)}번 더 틀리면 정답을 보여 줘요</div>`}
    <div class="small">처음 틀린 날: ${esc(n.added||'-')}${n.fromDay?' (Day '+n.fromDay+')':''} · 출처: ${esc(p.exam)} ${p.no}번</div></div>`}).join(''):'<div class="empty">🎉 정복노트가 비어 있어요. 틀린 문제가 없거나 모두 정복했어요!</div>'}
  ${ms.length?`<details class="pm-mastered"><summary>정복한 문제 ${ms.length}개 보기</summary>${ms.map(id=>{const m=st.mastered[id],p=pmProb(id);return`<div class="q-block pm-res ok"><div class="flex"><b>${esc(pmArea(id))} · ${esc(p.topic)}</b><span class="badge badge-active">${ic('trophy')} ${m.tries}번 만에 정복</span></div>${pmFig(id)}<div class="small green" style="font-weight:700">정답: ${esc(pmAnsText(p,A[id]))}</div><div class="small">정복한 날: ${esc(m.date||'-')}</div></div>`}).join('')}</details>`:''}</div>`;
  window.scrollTo(0,0)}

/* ───── 관리자 ───── */
function renderAPreMath(){const el=$('adminPreMathList');if(!el)return;if($('pmPts'))$('pmPts').textContent=PRE_MATH_POINTS;if($('pmRvPts'))$('pmRvPts').textContent=PRE_MATH_REVIEW_POINTS;
  const n=d=>DATA.students.filter(s=>s.preMathResults&&s.preMathResults[pmKey(d)]&&s.preMathResults[pmKey(d)].completed);
  let h='';for(let d=1;d<=PM_DAYS;d++){const c=pmConf(d),done=n(d);let ok=0,tot=0;done.forEach(s=>{const it=arr(s.preMathResults[pmKey(d)].items).filter(x=>!x.review);tot+=it.length;ok+=it.filter(x=>x.correct).length});
    h+=`<div class="admin-card"><div class="flex" style="align-items:flex-start"><div><b>Day ${d}</b>${pmChips(PRE_MATH.schedule[pmKey(d)])}<div class="small">응시 ${done.length}/${DATA.students.length}명 · 새 문제 정답률 ${tot?Math.round(ok/tot*100):0}%</div></div>
    <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end"><span class="badge ${c.open?'badge-active':'badge-ended'}">${c.open?'열림':'닫힘'}</span><button class="btn btn-sm ${c.open?'btn-danger':'btn-primary'}" onclick="togglePM(${d})">${c.open?'닫기':'열기'}</button></div></div></div>`}
  el.innerHTML=`<div class="cgrid">${h}</div>`;
  const rows=DATA.students.map(s=>{const st=pmState(s),done=Object.values(s.preMathResults||{}).filter(r=>r&&r.completed).length,nb=Object.keys(st.notebook),ms=Object.keys(st.mastered);
    return`<tr><td>${esc(s.name)}</td><td>${done}/${PM_DAYS}</td><td class="red">${nb.length}</td><td class="green">${ms.length}</td><td class="small">${esc(PRE_MATH.areas.map(a=>{const k=nb.filter(id=>pmProb(id)&&pmProb(id).area===a.id).length;return k?a.name.split(' · ')[0]+' '+k:''}).filter(Boolean).join(', ')||'-')}</td></tr>`}).join('');
  if($('adminPMNotes'))$('adminPMNotes').innerHTML=`<div style="overflow-x:auto"><table class="table"><thead><tr><th>이름</th><th>완료</th><th>노트 남음</th><th>정복</th><th>약한 단원 (노트 문제 수)</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  renderAPMScore()}
async function togglePM(d){await pull();const c=pmConf(d),v=!c.open;if(!await dbUpdate({['pub/preMathTests/'+pmKey(d)+'/open']:v}))return;await pull();renderAPreMath();toast('예비고1 수학 Day '+d+(v?' 열림':' 닫힘'))}
async function setPMAll(open){if(!await uiConfirm('예비고1 수학 Day 1~'+PM_DAYS+'을 모두 '+(open?'열까요?':'닫을까요?')))return;const upd={};for(let d=1;d<=PM_DAYS;d++)upd['pub/preMathTests/'+pmKey(d)+'/open']=open;if(!await dbUpdate(upd))return;await pull();renderAPreMath()}
async function renderAPMScore(){const sel=$('pmScoreDay');if(!sel)return;if(sel.options.length!==PM_DAYS)sel.innerHTML=Array.from({length:PM_DAYS},(_,i)=>`<option value="${i+1}">Day ${i+1}</option>`).join('');
  const d=+sel.value||1,ids=PRE_MATH.schedule[pmKey(d)];let A={};try{A=await pmLoadAnswers()}catch(e){}
  const head=ids.map((id,i)=>`<th title="${esc(pmProb(id).topic)}">${i+1}번<br><span class="small">정답 ${esc(pmAnsText(pmProb(id),A[id]))}</span></th>`).join('');
  const rows=DATA.students.map(s=>{const r=s.preMathResults&&s.preMathResults[pmKey(d)];if(!(r&&r.completed))return`<tr><td>${esc(s.name)}</td><td colspan="${ids.length+2}" class="small">미응시</td></tr>`;
    const it=arr(r.items),rv=it.filter(x=>x.review);const cells=ids.map(id=>{const x=it.find(y=>y.id===id&&!y.review);return x?`<td class="${x.correct?'green':'red'}">${esc(pmAnsText(pmProb(id),x.selected))}</td>`:'<td class="small">-</td>'}).join('');
    const cc=ids.filter(id=>{const x=it.find(y=>y.id===id&&!y.review);return x&&x.correct}).length;
    return`<tr><td>${esc(s.name)}</td>${cells}<td><b>${cc}/${ids.length}</b></td><td class="small">${rv.length?rv.filter(x=>x.correct).length+'/'+rv.length:'-'}</td></tr>`}).join('');
  $('adminPMScore').innerHTML=`<div style="overflow-x:auto"><table class="table"><thead><tr><th>이름</th>${head}<th>점수</th><th>노트 정복</th></tr></thead><tbody>${rows}</tbody></table></div>`}
