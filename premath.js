/* 예비고1 수학 + 오답노트 (같은 탭 안의 두 화면: Day 문제 / 오답노트)
   - Day 1~12: 하루 새 문제 5개 (premath-data.js의 schedule), 1번만 제출, 정답 1개당 PRE_MATH_POINTS
   - 틀린 문제는 학생별 오답노트(pub/students/{id}/preMath/notebook)에 저장
   - '오답 풀기'로 언제든 몇 번이든 다시 풀 수 있음 (포인트 없음, 연습용)
   - 맞히면 오답노트에서 빠지고 '해결한 문제'(preMath/mastered)로 이동, 3번 틀리면 정답 공개
   - 정답 = DB mathProblems/preAnswers (로그인해야 읽힘), 열림 여부 = pub/preMathTests/dayN/open */
let currentPM=null,pmLock=false,pmAnswers=null,pmView='days';
function pmSetView(v){pmView=v;renderSPreMath()}
/* 탭 안 상단 전환 버튼: Day 문제 | 연습하기 | 오답노트 */
function pmSeg(s){const nbN=Object.keys(pmState(s).notebook).filter(pmProb).length,pr=PRE_MATH.practice||[],prDone=pr.filter(id=>(pmState(s).practice[id]||{}).tries>0).length;
  const b=(v,icon,label,extra)=>`<button role="tab" class="${pmView===v?'on':''}" onclick="pmSetView('${v}')">${ic(icon)} ${label}${extra||''}</button>`;
  return`<div class="pm-seg three" role="tablist">${b('days','pi','Day 문제')}${b('practice','target','연습하기',`<span class="pm-cnt sub">${prDone}/${pr.length}</span>`)}${b('note','book-open','오답노트',nbN?`<span class="pm-cnt">${nbN}</span>`:'')}</div>`}
const PM_DAYS=Object.keys(PRE_MATH.schedule).length,PM_REVEAL_AFTER=3;
const pmKey=d=>'day'+d;
const pmConf=d=>(DATA.preMathTests||{})[pmKey(d)]||{open:false};
const pmProb=id=>PRE_MATH.problems[id];
const pmArea=id=>(PRE_MATH.areas.find(a=>a.id===pmProb(id).area)||{}).name||'';
const pmAnsText=(p,v)=>v==null||v===''?'-':(p.type==='mc'?CIRCLED[v-1]||v:String(v));
async function pmLoadAnswers(){if(!pmAnswers)pmAnswers=await api('mathProblems/preAnswers')||{};return pmAnswers}
const pmFig=id=>`<div class="math-fig pm-fig" onclick="mathZoom(this.querySelector('img').src)"><img src="${esc(pmProb(id).img)}" alt="문제" loading="lazy"></div>`;
const pmChips=ids=>`<div class="pm-chips">${ids.map(id=>`<span>${esc(pmArea(id).split(' · ')[0])}</span>`).join('')}</div>`;
const pmState=s=>{s.preMath=s.preMath||{};s.preMath.notebook=s.preMath.notebook||{};s.preMath.mastered=s.preMath.mastered||{};s.preMath.practice=s.preMath.practice||{};return s.preMath};
const pmLv=id=>{const l=pmProb(id).lv||'중';return`<span class="pm-lv lv-${l==='하'?'e':l==='중'?'m':'h'}">${l}</span>`};
/* 오답노트 문제 (오래된 것부터). day를 주면 그날 틀린 문제만 */
function pmWrong(s,day){const nb=pmState(s).notebook;
  return Object.keys(nb).filter(id=>pmProb(id)&&(!day||nb[id].fromDay===day)).sort((a,b)=>(nb[a].addedAt||0)-(nb[b].addedAt||0))}

/* ───── 학생: 목록 ───── */
function renderSPreMath(){
  if(pmView==='note')return showPMNote();
  if(pmView==='practice')return renderPMPractice();
  const el=$('s-premath');if(!el)return;pmLock=false;const s=getMe(),R=s.preMathResults||{},st=pmState(s);
  
  let done=0,ok=0,tot=0,pts=0,openN=0;
  for(let d=1;d<=PM_DAYS;d++){const r=R[pmKey(d)];if(r&&r.completed){done++;const it=arr(r.items).filter(x=>!x.review);tot+=it.length;ok+=it.filter(x=>x.correct).length;pts+=r.pointsAwarded||0}else if(pmConf(d).open)openN++}
  let h=pmSeg(s)+`<div class="banner"><div class="small" style="color:#ffb3b8">예비 고1 수학 · Day 2부터 하루 3문제 (하·중) · 어려운 문제는 연습하기</div>
    <div class="bstats"><div><div class="small">완료</div><b>${done}<small>/${PM_DAYS}일</small></b></div><div><div class="small">정답</div><b>${ok}<small>/${tot}</small></b></div><div><div class="small">획득 포인트</div><b class="green">${pts}P</b></div><div><div class="small">지금 풀 수 있는 날</div><b class="orange">${openN}</b></div></div></div>
  <div class="pm-legend">${PRE_MATH.areas.map((a,i)=>`<span><b>${i+1}</b>${esc(a.name)}</span>`).join('')}</div>`;
  const cards=[];
  for(let d=1;d<=PM_DAYS;d++){const ids=PRE_MATH.schedule[pmKey(d)],r=R[pmKey(d)],c=pmConf(d);
    if(r&&r.completed){const it=arr(r.items).filter(x=>!x.review),cc=it.filter(x=>x.correct).length,left=pmWrong(s,d).length;
      cards.push(`<div class="auction-card vcard done"><div class="flex"><div class="ac-title">Day ${d}</div><span class="badge ${cc===it.length?'badge-winner':'badge-ended'}">${cc}/${it.length} 정답 · +${r.pointsAwarded||0}P</span></div>${pmChips(ids)}
      ${it.length-cc?`<div class="ac-meta">${left?`오답 ${left}개 남음`:'오답 모두 해결 🎉'}</div>`:''}<div class="ac-row"><button class="btn btn-primary" style="flex:1" onclick="showPMResult(${d})">결과 보기</button>${left?`<button class="btn btn-success" style="flex:1" onclick="startPMNote(${d})">${ic('rotate-ccw')} 오답 풀기</button>`:''}</div></div>`)}
    else if(c.open){cards.push(`<div class="auction-card vcard open"><div class="flex"><div class="ac-title">Day ${d}</div><span class="badge badge-active">풀 수 있어요</span></div>${pmChips(ids)}<div class="ac-meta">${ids.length}문제 · 정답 1개당 ${PRE_MATH_POINTS}P · 1번만 제출</div><button class="btn btn-primary btn-full" onclick="startPM(${d})">문제 풀기</button></div>`)}
    else cards.push(`<div class="auction-card vcard locked"><div class="flex"><div class="ac-title">Day ${d}</div><span class="badge badge-ended">${ic('lock')} 잠김</span></div>${pmChips(ids)}</div>`)}
  el.innerHTML=h+`<div class="cgrid">${cards.join('')}</div>`;
}

/* ───── 학생: 풀기 ───── */
async function startPM(d){const s=getMe(),r=(s.preMathResults||{})[pmKey(d)];
  if(r&&r.completed){uiAlert('이미 제출한 날이에요.');return renderSPreMath()}
  if(!pmConf(d).open){uiAlert('아직 열리지 않은 날이에요.');return renderSPreMath()}
  const fresh=PRE_MATH.schedule[pmKey(d)];
  if(!await uiConfirm(`Day ${d} 수학 ${fresh.length}문제를 시작할까요?\n제출하면 다시 제출할 수 없어요. (중간에 나가면 나중에 다시 풀 수 있어요)`,{icon:'pi'}))return;
  try{await pmLoadAnswers()}catch(e){return uiAlert('문제를 불러오지 못했습니다.\n'+e.message)}
  currentPM={d,list:fresh.map(id=>({id})),pos:0,sel:[]};renderPMQ()}
async function startPMNote(day){const s=getMe(),rev=pmWrong(s,day);if(!rev.length){uiAlert('다시 풀 오답이 없어요. 🎉');return renderSPreMath()}
  if(!await uiConfirm(`${day?'Day '+day+' ':''}오답 ${rev.length}문제를 다시 풀까요?\n오답 풀기는 포인트 없는 연습이에요. 맞히면 오답노트에서 빠지고, 언제든 다시 풀 수 있어요.`,{icon:'rotate-ccw',ok:'오답 풀기'}))return;
  try{await pmLoadAnswers()}catch(e){return uiAlert('문제를 불러오지 못했습니다.\n'+e.message)}
  currentPM={d:null,retryDay:day||null,list:rev.map(id=>({id,review:true})),pos:0,sel:[]};renderPMQ()}
function renderPMQ(){const c=currentPM,it=c.list[c.pos],id=it.id,p=pmProb(id),last=c.pos===c.list.length-1,v=c.sel[c.pos];
  const nb=pmState(getMe()).notebook[id];
  const input=p.type==='mc'
    ?`<div class="math-choices">${[1,2,3,4,5].map(n=>`<button class="btn math-choice${n===5?' wide':''}${v===n?' selected':''}" onclick="selPM(${n})">${CIRCLED[n-1]}</button>`).join('')}</div>`
    :`<div class="pm-num"><input type="number" inputmode="numeric" id="pmNum" placeholder="정답 숫자 입력" value="${v!=null?esc(v):''}" oninput="numPM(this.value)"><span>단답형</span></div>`;
  $('s-premath').innerHTML=`<div class="auction-card quiz"><div class="flex"><div class="ac-title">${c.practice?'연습하기':c.d?'Day '+c.d+' 수학':(c.retryDay?'Day '+c.retryDay+' ':'')+'오답 풀기'}</div><span class="badge badge-active">${c.pos+1} / ${c.list.length}</span></div>
  <div class="qbar"><i style="width:${Math.round(c.pos/c.list.length*100)}%"></i></div>
  <div class="pm-tag">${it.review?`<span class="pm-rv">${ic('rotate-ccw')} 오답${nb?' · '+nb.tries+'번 틀림':''}</span> `:''}${pmLv(id)} <b>${esc(pmArea(id))}</b> · ${esc(p.topic)} <span class="small">(${esc(p.exam)} ${p.no}번 · ${p.pts}점)</span></div>${pmFig(id)}
  <div class="small" style="margin-bottom:8px">${p.type==='mc'?'정답 번호를 고르세요':'정답을 숫자로 입력하세요'}</div>${input}
  <div style="display:flex;gap:8px;margin-top:16px"><button class="btn" style="flex:1" onclick="cancelPM()">나가기</button>${c.pos?`<button class="btn btn-ghost" style="flex:1" onclick="movePM(-1)">이전</button>`:''}<button class="btn btn-primary" style="flex:2" id="pmNext" ${v==null||v===''?'disabled':''} onclick="nextPM()">${last?'제출하기':'다음 문제'}</button></div></div>`;
  window.scrollTo(0,0);const ni=$('pmNum');if(ni)ni.addEventListener('keydown',e=>{if(e.key==='Enter'&&!$('pmNext').disabled)nextPM()})}
function selPM(n){currentPM.sel[currentPM.pos]=n;document.querySelectorAll('#s-premath .math-choice').forEach((b,i)=>b.classList.toggle('selected',i+1===n));$('pmNext').disabled=false}
function numPM(v){v=String(v).trim();currentPM.sel[currentPM.pos]=v===''?null:v;$('pmNext').disabled=v===''}
function movePM(k){currentPM.pos+=k;renderPMQ()}
async function cancelPM(){if(currentPM.practice){const back=currentPM.back;currentPM=null;return back?pmSetView(back):renderSPreMath()}if(currentPM.d&&!await uiConfirm('지금 나가면 제출하지 않은 것으로 처리돼요.\n나중에 처음부터 다시 풀 수 있어요. 나갈까요?',{ok:'나가기'}))return;currentPM=null;renderSPreMath()}
async function nextPM(){const c=currentPM;if(c.practice)return finishPMPractice();if(c.pos<c.list.length-1){c.pos++;return renderPMQ()}
  if(c.d&&!await uiConfirm('제출할까요?\n제출하면 답을 바꿀 수 없어요.',{ok:'제출하기'}))return;
  const A=await pmLoadAnswers();await pull();const s=getMe(),st=pmState(s),t=dayStr(),now=Date.now(),P=SP(s.id)+'/preMath/';
  if(c.d&&(s.preMathResults||{})[pmKey(c.d)]&&s.preMathResults[pmKey(c.d)].completed){currentPM=null;uiAlert('이미 제출한 날이에요.');return renderSPreMath()}
  const upd={},items=[];let pts=0,newOk=0,revOk=0,revN=0;
  c.list.forEach((it,k)=>{const id=it.id,p=pmProb(id),raw=c.sel[k],sel=p.type==='mc'?+raw:Number(raw),ok=sel===Number(A[id]);
    const rec={id,selected:p.type==='mc'?sel:String(raw),correct:ok};if(it.review)rec.review=true;
    const nb=st.notebook[id];
    if(it.review){revN++;if(!nb)return; // 다른 기기에서 이미 처리됨
      if(ok){revOk++;upd[P+'notebook/'+id]=null;upd[P+'mastered/'+id]={date:today(),tries:(nb.tries||0)+1,fromDay:nb.fromDay||null};delete st.notebook[id];st.mastered[id]=upd[P+'mastered/'+id]}
      else{nb.tries=(nb.tries||0)+1;nb.lastTried=t;upd[P+'notebook/'+id+'/tries']=nb.tries;upd[P+'notebook/'+id+'/lastTried']=t}}
    else{if(ok){newOk++;pts+=PRE_MATH_POINTS}else{const n={added:today(),addedAt:now+k,fromDay:c.d,tries:1,lastTried:t};upd[P+'notebook/'+id]=n;st.notebook[id]=n}}
    rec.tries=(st.notebook[id]||st.mastered[id]||{}).tries||(ok?0:1);items.push(rec)});
  if(c.d){const res={completed:true,items,date:today(),pointsAwarded:pts};s.preMathResults=s.preMathResults||{};s.preMathResults[pmKey(c.d)]=res;upd[SP(s.id)+'/preMathResults/'+pmKey(c.d)]=res}
  if(pts){s.points+=pts;upd[SP(s.id)+'/points']=s.points;
    addHist(s,{label:`예비고1 수학 Day ${c.d} (${newOk}/${items.length})`,points:pts,date:today()},upd)}
  if(!await dbUpdate(upd)){currentPM=null;return renderSPreMath()}
  currentPM=null;$('studentPoints').textContent=s.points;
  toast(c.d?`📐 ${newOk}/${items.length} 정답${pts?' +'+pts+'P':''}`:`🔁 오답 ${revOk}/${revN} 해결`);
  showPMResult(c.d,items)}

/* ───── 결과 · 노트 보기 ───── */
const pmReveal=(x,ok)=>ok||(x&&(x.tries||0)>=PM_REVEAL_AFTER);
function pmItemBlock(x,i,A){const p=pmProb(x.id),st=pmState(getMe()),nb=st.notebook[x.id],show=pmReveal(nb||x,x.correct)||!!st.mastered[x.id];
  return`<div class="q-block pm-res ${x.correct?'ok':'no'}"><div class="flex"><b>${i+1}. ${esc(pmArea(x.id))} · ${esc(p.topic)}</b><span class="badge ${x.correct?'badge-active':'badge-ended'}">${ic(x.correct?'circle-check':'circle-x')} ${x.correct?(x.review?'해결!':'정답'):'오답'}</span></div>${pmFig(x.id)}
    <div class="small ${x.correct?'green':'red'}">내 답: ${esc(pmAnsText(p,x.selected))}</div>
    ${show?`<div class="small green" style="font-weight:700">정답: ${esc(pmAnsText(p,A[x.id]))}</div>`:`<div class="small orange">${ic('book-open')} 오답노트에 저장됐어요. 오답 풀기로 다시 도전해 보세요. (${Math.max(1,PM_REVEAL_AFTER-((nb||x).tries||1))}번 더 틀리면 정답을 알려 줘요)</div>`}
    <div class="small">출처: ${esc(p.exam)} ${p.no}번</div></div>`}
async function showPMResult(d,items){pmLock=true;const el=$('s-premath');
  if(!items){const r=(getMe().preMathResults||{})[pmKey(d)];if(!r)return renderSPreMath();items=arr(r.items)}
  let A;try{A=await pmLoadAnswers()}catch(e){A={}}
  const fresh=items.filter(x=>!x.review),rv=items.filter(x=>x.review),fo=fresh.filter(x=>x.correct).length,ro=rv.filter(x=>x.correct).length;
  el.innerHTML=`<div class="auction-card"><div class="flex"><div class="ac-title">${d?'Day '+d+' 결과':'오답 풀기 결과'}</div></div>
  <div class="pm-sum">${fresh.length?`<div><small>정답</small><b class="${fo===fresh.length?'green':''}">${fo}/${fresh.length}</b></div>`:''}${rv.length?`<div><small>해결</small><b class="${ro===rv.length?'green':''}">${ro}/${rv.length}</b></div>`:''}<div><small>오답노트에 남은 문제</small><b class="red">${Object.keys(pmState(getMe()).notebook).length}</b></div></div>
  ${items.map((x,i)=>pmItemBlock(x,i,A)).join('')}
  <div style="display:flex;gap:8px;margin-top:14px"><button class="btn btn-ghost" style="flex:1" onclick="pmSetView('note')">${ic('book-open')} 오답노트 보기</button><button class="btn btn-primary" style="flex:1" onclick="pmSetView('days')">Day 목록으로</button></div></div>`;
  window.scrollTo(0,0)}
async function showPMNote(){pmView='note';pmLock=true;const el=$('s-premath'),s=getMe(),st=pmState(s);let A;try{A=await pmLoadAnswers()}catch(e){A={}}
  const nb=Object.keys(st.notebook).filter(pmProb).sort((a,b)=>(st.notebook[a].addedAt||0)-(st.notebook[b].addedAt||0)),ms=Object.keys(st.mastered).filter(pmProb);
  const byArea=PRE_MATH.areas.map(a=>({a,n:nb.filter(id=>pmProb(id).area===a.id).length})).filter(x=>x.n);
  el.innerHTML=pmSeg(s)+`<div class="auction-card"><div class="flex"><div class="ac-title">${ic('book-open')} 나만의 오답노트</div></div>
  <div class="small" style="margin:6px 0 0">틀린 문제가 여기에 모여요. '오답 풀기'로 언제든 다시 풀 수 있고(포인트 없음), 맞히면 '해결한 문제'로 옮겨져요. 3번 틀리면 정답을 알려 줘요.</div>
  <div class="pm-sum"><div><small>남은 문제</small><b class="red">${nb.length}</b></div><div><small>해결한 문제</small><b class="green">${ms.length}</b></div></div>
  ${byArea.length?`<div class="pm-chips">${byArea.map(x=>`<span>${esc(x.a.name.split(' · ')[0])} ${x.n}</span>`).join('')}</div>`:''}
  ${nb.length?`<button class="btn btn-primary btn-full" style="margin-bottom:12px" onclick="startPMNote()">${ic('rotate-ccw')} 오답 ${nb.length}문제 모두 다시 풀기</button>`:''}
  ${nb.length?nb.map((id,i)=>{const n=st.notebook[id],p=pmProb(id);return`<div class="q-block pm-res no"><div class="flex"><b>${i+1}. ${esc(pmArea(id))} · ${esc(p.topic)}</b><span class="badge badge-ended">${n.tries||1}번 틀림</span></div>${pmFig(id)}
    ${pmReveal(n)?`<div class="small green" style="font-weight:700">정답: ${esc(pmAnsText(p,A[id]))} (다시 맞혀야 오답노트에서 빠져요)</div>`:`<div class="small">${PM_REVEAL_AFTER-(n.tries||1)}번 더 틀리면 정답을 보여 줘요</div>`}
    <div class="small">처음 틀린 날: ${esc(n.added||'-')}${n.fromDay?' (Day '+n.fromDay+')':''} · 출처: ${esc(p.exam)} ${p.no}번</div></div>`}).join(''):'<div class="empty">🎉 오답노트가 비어 있어요. 틀린 문제가 없거나 모두 해결했어요!</div>'}
  ${ms.length?`<details class="pm-mastered"><summary>해결한 문제 ${ms.length}개 보기</summary>${ms.map(id=>{const m=st.mastered[id],p=pmProb(id);return`<div class="q-block pm-res ok"><div class="flex"><b>${esc(pmArea(id))} · ${esc(p.topic)}</b><span class="badge badge-active">${ic('trophy')} ${m.tries}번 만에 해결</span></div>${pmFig(id)}<div class="small green" style="font-weight:700">정답: ${esc(pmAnsText(p,A[id]))}</div><div class="small">해결한 날: ${esc(m.date||'-')}</div></div>`}).join('')}</details>`:''}</div>`;
  window.scrollTo(0,0)}

/* ───── 관리자 ───── */
function renderAPreMath(){const el=$('adminPreMathList');if(!el)return;if($('pmPts'))$('pmPts').textContent=PRE_MATH_POINTS;
  const n=d=>DATA.students.filter(s=>s.preMathResults&&s.preMathResults[pmKey(d)]&&s.preMathResults[pmKey(d)].completed);
  let h='';for(let d=1;d<=PM_DAYS;d++){const c=pmConf(d),done=n(d);let ok=0,tot=0;done.forEach(s=>{const it=arr(s.preMathResults[pmKey(d)].items).filter(x=>!x.review);tot+=it.length;ok+=it.filter(x=>x.correct).length});
    h+=`<div class="admin-card"><div class="flex" style="align-items:flex-start"><div><b>Day ${d}</b>${pmChips(PRE_MATH.schedule[pmKey(d)])}<div class="small">응시 ${done.length}/${DATA.students.length}명 · 정답률 ${tot?Math.round(ok/tot*100):0}%</div></div>
    <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end"><span class="badge ${c.open?'badge-active':'badge-ended'}">${c.open?'열림':'닫힘'}</span><button class="btn btn-sm btn-ghost" onclick="previewPM(${d})">${ic('book-open')} 미리보기</button><button class="btn btn-sm ${c.open?'btn-danger':'btn-primary'}" onclick="togglePM(${d})">${c.open?'닫기':'열기'}</button></div></div></div>`}
  el.innerHTML=`<div style="display:flex;justify-content:flex-end;margin-bottom:10px"><button class="btn btn-ghost btn-sm" onclick="previewPMPractice()">${ic('target')} 연습하기 문제 미리보기 (${(PRE_MATH.practice||[]).length})</button></div><div class="cgrid">${h}</div>`;
  const rows=DATA.students.map(s=>{const st=pmState(s),done=Object.values(s.preMathResults||{}).filter(r=>r&&r.completed).length,nb=Object.keys(st.notebook),ms=Object.keys(st.mastered);
    return`<tr><td>${esc(s.name)}</td><td>${done}/${PM_DAYS}</td><td class="red">${nb.length}</td><td class="green">${ms.length}</td><td>${(PRE_MATH.practice||[]).filter(id=>(st.practice[id]||{}).solved).length}정답 / ${(PRE_MATH.practice||[]).filter(id=>(st.practice[id]||{}).tries>0).length}도전</td><td class="small">${esc(PRE_MATH.areas.map(a=>{const k=nb.filter(id=>pmProb(id)&&pmProb(id).area===a.id).length;return k?a.name.split(' · ')[0]+' '+k:''}).filter(Boolean).join(', ')||'-')}</td></tr>`}).join('');
  if($('adminPMNotes'))$('adminPMNotes').innerHTML=`<div style="overflow-x:auto"><table class="table"><thead><tr><th>이름</th><th>완료</th><th>오답 남음</th><th>해결</th><th>연습하기</th><th>약한 단원 (남은 오답 수)</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  renderAPMScore()}
async function togglePM(d){await pull();const c=pmConf(d),v=!c.open;if(!await dbUpdate({['pub/preMathTests/'+pmKey(d)+'/open']:v}))return;await pull();renderAPreMath();toast('예비고1 수학 Day '+d+(v?' 열림':' 닫힘'))}
async function setPMAll(open){if(!await uiConfirm('예비고1 수학 Day 1~'+PM_DAYS+'을 모두 '+(open?'열까요?':'닫을까요?')))return;const upd={};for(let d=1;d<=PM_DAYS;d++)upd['pub/preMathTests/'+pmKey(d)+'/open']=open;if(!await dbUpdate(upd))return;await pull();renderAPreMath()}
async function renderAPMScore(){const sel=$('pmScoreDay');if(!sel)return;if(sel.options.length!==PM_DAYS)sel.innerHTML=Array.from({length:PM_DAYS},(_,i)=>`<option value="${i+1}">Day ${i+1}</option>`).join('');
  $('adminPMScore').innerHTML=await pmScoreTable(+sel.value||1)}
/* 예비고1 수학 Day d 성적표 (학생별 고른 답 · 점수) */
async function pmScoreTable(d){const ids=PRE_MATH.schedule[pmKey(d)];if(!ids)return'<div class="empty">없는 Day예요</div>';let A={};try{A=await pmLoadAnswers()}catch(e){}
  const head=ids.map((id,i)=>`<th title="${esc(pmProb(id).topic)}">${i+1}번 ${pmLv(id)}<br><span class="small">정답 ${esc(pmAnsText(pmProb(id),A[id]))}</span></th>`).join('');
  let done=0;const rows=DATA.students.map(s=>{const r=s.preMathResults&&s.preMathResults[pmKey(d)];if(!(r&&r.completed))return`<tr><td>${esc(s.name)}</td><td colspan="${ids.length+2}" class="small">미응시</td></tr>`;done++;
    const it=arr(r.items);const cells=ids.map(id=>{const x=it.find(y=>y.id===id&&!y.review);return x?`<td class="${x.correct?'green':'red'}">${esc(pmAnsText(pmProb(id),x.selected))}</td>`:'<td class="small">-</td>'}).join('');
    const cc=ids.filter(id=>{const x=it.find(y=>y.id===id&&!y.review);return x&&x.correct}).length;
    return`<tr><td>${esc(s.name)}</td>${cells}<td><span class="badge ${cc===ids.length?'badge-winner':'badge-ended'}">${cc}/${ids.length}</span></td><td class="small">${esc(r.date||'')}</td></tr>`}).join('');
  return`<div class="small" style="margin:4px 0 10px">예비고1 수학 Day ${d} · ${pmConf(d).open?'열림':'닫힘'} · 응시 ${done}/${DATA.students.length}명</div><div style="overflow-x:auto"><table class="table"><thead><tr><th>이름</th>${head}<th>점수</th><th>응시일</th></tr></thead><tbody>${rows}</tbody></table></div>`}

/* ───── 연습하기: 상 난이도 + 정규 일정에 없는 문제 · 문제마다 한 번만 도전 · 정답 1개당 PRE_MATH_PRACTICE_POINTS ─────
   기록 = pub/students/{id}/preMath/practice/{문제}: {tries:1, solved, selected, date, points} */
let pmPracArea='all';
function pmPracFilter(a){pmPracArea=a;renderPMPractice()}
const pmTried=(st,id)=>(st.practice[id]||{}).tries>0;
function renderPMPractice(){pmView='practice';pmLock=false;const el=$('s-premath');if(!el)return;const s=getMe(),st=pmState(s),pr=PRE_MATH.practice||[];
  const list=pr.filter(id=>pmPracArea==='all'||pmProb(id).area===pmPracArea);
  const tried=pr.filter(id=>pmTried(st,id)),ok=tried.filter(id=>st.practice[id].solved).length,earned=tried.reduce((a,id)=>a+(st.practice[id].points||0),0);
  const nextId=list.find(id=>!pmTried(st,id));
  let h=pmSeg(s)+`<div class="auction-card"><div class="flex"><div class="ac-title">${ic('target')} 연습하기</div><span class="badge badge-winner">도전 ${tried.length}/${pr.length} · 정답 ${ok} · +${earned}P</span></div>
  <div class="small" style="margin:6px 0 12px">Day 문제보다 어려운 '상' 난이도 문제와 추가 문제예요. 맞히면 <b>${PRE_MATH_PRACTICE_POINTS}P</b>를 받아요. <b>문제마다 한 번만 도전할 수 있으니</b> 충분히 생각하고 답을 내세요. 제출하면 정답을 알려 줘요.</div>
  <div class="pm-filter"><button class="${pmPracArea==='all'?'on':''}" onclick="pmPracFilter('all')">전체 ${pr.length}</button>${PRE_MATH.areas.map(a=>{const n=pr.filter(id=>pmProb(id).area===a.id).length;return n?`<button class="${pmPracArea===a.id?'on':''}" onclick="pmPracFilter('${a.id}')">${esc(a.name.split(' · ')[0])} ${n}</button>`:''}).join('')}</div>
  ${nextId?`<button class="btn btn-primary btn-full" style="margin-top:12px" onclick="startPMPractice('${nextId}')">${ic('target')} 안 푼 문제부터 풀기</button>`:'<div class="empty">🎉 이 범위의 연습 문제에 모두 도전했어요!</div>'}</div>`;
  h+='<div class="cgrid">'+list.map(id=>{const p=pmProb(id),r=st.practice[id]||{},t=pmTried(st,id);
    const stat=!t?'<span class="badge badge-ended">도전 전</span>':r.solved?`<span class="badge badge-active">${ic('circle-check')} 정답${r.points?' +'+r.points+'P':''}</span>`:`<span class="badge badge-ended">${ic('circle-x')} 오답</span>`;
    return`<div class="auction-card vcard${t?' done':''}"><div class="flex" style="align-items:flex-start"><div>${pmLv(id)} <b>${esc(pmArea(id).split(' · ')[0])}</b><div class="vsub">${esc(p.topic)}</div></div>${stat}</div>
      <div class="ac-meta">${esc(p.exam)} ${p.no}번 · ${p.pts}점 · ${p.type==='mc'?'객관식':'단답형'}</div>${t?`<button class="btn btn-ghost btn-full" onclick="showPMPracticeResult('${id}')">결과 보기</button>`:`<button class="btn btn-primary btn-full" onclick="startPMPractice('${id}')">도전하기 (+${PRE_MATH_PRACTICE_POINTS}P)</button>`}</div>`}).join('')+'</div>';
  el.innerHTML=h;window.scrollTo(0,0)}
async function startPMPractice(id){const st=pmState(getMe());if(pmTried(st,id))return showPMPracticeResult(id);
  if(!await uiConfirm(`이 문제에 도전할까요?\n연습하기 문제는 한 번만 제출할 수 있어요. 맞히면 ${PRE_MATH_PRACTICE_POINTS}P!`,{icon:'target',ok:'도전하기'}))return;
  try{await pmLoadAnswers()}catch(e){return uiAlert('문제를 불러오지 못했습니다.\n'+e.message)}
  currentPM={practice:true,back:'practice',list:[{id}],pos:0,sel:[]};renderPMQ()}
async function finishPMPractice(){const c=currentPM,id=c.list[0].id,p=pmProb(id),raw=c.sel[0];
  if(!await uiConfirm('제출할까요?\n연습하기 문제는 다시 도전할 수 없어요.',{ok:'제출하기'}))return;
  const A=await pmLoadAnswers();await pull();const s=getMe(),st=pmState(s);
  if(pmTried(st,id)){currentPM=null;uiAlert('이미 도전한 문제예요.');return showPMPracticeResult(id)}
  const sel=p.type==='mc'?+raw:Number(raw),ok=sel===Number(A[id]),pts=ok?PRE_MATH_PRACTICE_POINTS:0;
  const r={tries:1,solved:ok,selected:p.type==='mc'?sel:String(raw),date:today(),points:pts};st.practice[id]=r;
  const upd={[SP(s.id)+'/preMath/practice/'+id]:r};
  if(pts){s.points+=pts;upd[SP(s.id)+'/points']=s.points;addHist(s,{label:'예비고1 수학 연습하기 정답 ('+pmArea(id).split(' · ')[0]+')',points:pts,date:today()},upd)}
  if(!await dbUpdate(upd)){currentPM=null;return renderPMPractice()}
  currentPM=null;$('studentPoints').textContent=s.points;toast(ok?'🎯 정답! +'+pts+'P':'아쉬워요. 정답을 확인해 보세요');showPMPracticeResult(id)}
async function showPMPracticeResult(id){pmLock=true;const s=getMe(),st=pmState(s),r=st.practice[id]||{},p=pmProb(id);let A={};try{A=await pmLoadAnswers()}catch(e){}
  const pr=PRE_MATH.practice||[],next=pr.filter(x=>pmPracArea==='all'||pmProb(x).area===pmPracArea).find(x=>!pmTried(st,x));
  $('s-premath').innerHTML=pmSeg(s)+`<div class="auction-card quiz"><div class="flex"><div class="ac-title">연습하기 결과</div><span class="badge ${r.solved?'badge-active':'badge-ended'}">${ic(r.solved?'circle-check':'circle-x')} ${r.solved?'정답':'오답'}</span></div>
    <div class="pm-score ${r.solved?'green':''}">${r.solved?'정답! +'+(r.points||0)+'P':'아쉬워요'}</div>
    <div class="pm-tag">${pmLv(id)} <b>${esc(pmArea(id))}</b> · ${esc(p.topic)}</div>${pmFig(id)}
    ${r.selected!=null&&r.selected!==undefined?`<div class="small ${r.solved?'green':'red'}">내 답: ${esc(pmAnsText(p,r.selected))}</div>`:''}
    <div class="small green" style="font-weight:700">정답: ${esc(pmAnsText(p,A[id]))}</div><div class="small">출처: ${esc(p.exam)} ${p.no}번</div>
    <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">${next?`<button class="btn btn-primary" style="flex:1" onclick="startPMPractice('${next}')">다음 문제 도전</button>`:''}<button class="btn btn-ghost" style="flex:1" onclick="pmSetView('practice')">연습 목록</button></div></div>`;
  window.scrollTo(0,0)}
/* ───── 관리자: 문제 미리보기 (열기 전에 학생이 볼 문제를 정답과 함께 확인) ───── */
async function pmPreviewHTML(title,ids,note){let A={};try{A=await pmLoadAnswers()}catch(e){}
  return`<div class="admin-section pm-preview"><div class="flex"><b>${title}</b><button class="btn btn-sm" onclick="renderAPreMath()">${ic('chevron-right')} 목록으로</button></div>${note?`<div class="small" style="margin-top:6px">${note}</div>`:''}
  ${ids.map((id,i)=>{const p=pmProb(id);return`<div class="q-block"><div class="flex"><b>${i+1}. ${pmLv(id)} ${esc(pmArea(id))} · ${esc(p.topic)}</b><span class="badge badge-winner">정답 ${esc(pmAnsText(p,A[id]))}</span></div>${pmFig(id)}<div class="small">${esc(p.exam)} ${p.no}번 · ${p.pts}점 · ${p.type==='mc'?'객관식':'단답형'}</div></div>`}).join('')}</div>`}
async function previewPM(d){const el=$('adminPreMathList'),c=pmConf(d);el.innerHTML='<div class="empty">불러오는 중…</div>';
  el.innerHTML=await pmPreviewHTML(`예비고1 수학 Day ${d} 미리보기 (${c.open?'열림':'닫힘'})`,PRE_MATH.schedule[pmKey(d)],'학생 화면에는 정답이 보이지 않아요. 문제 사진을 누르면 크게 볼 수 있어요.')
    +`<div style="display:flex;gap:8px;margin-top:-6px;margin-bottom:16px">${d>1?`<button class="btn btn-ghost btn-sm" onclick="previewPM(${d-1})">← Day ${d-1}</button>`:''}<button class="btn btn-sm ${c.open?'btn-danger':'btn-primary'}" style="flex:1" onclick="togglePM(${d})">Day ${d} ${c.open?'닫기':'열기'}</button>${d<PM_DAYS?`<button class="btn btn-ghost btn-sm" onclick="previewPM(${d+1})">Day ${d+1} →</button>`:''}</div>`;
  el.scrollIntoView({block:'start'})}
async function previewPMPractice(){const el=$('adminPreMathList');el.innerHTML='<div class="empty">불러오는 중…</div>';
  el.innerHTML=await pmPreviewHTML('연습하기 문제 미리보기',PRE_MATH.practice||[],'연습하기는 따로 열고 닫을 필요 없이 학생들이 언제든 풀 수 있어요. 문제마다 한 번만 도전하고, 맞히면 '+PRE_MATH_PRACTICE_POINTS+'P예요.');el.scrollIntoView({block:'start'})}
