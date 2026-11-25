/* 단어시험: Day 1~30 (단어시험 탭) + 예비고1 01~20 (예비 고1(영어) 탭) */
const isPre=k=>/^예비고1/.test(k);
const vGroup=k=>isPre(k)?'pre':'main';
const vPanel=k=>isPre(k)?'s-pre':'s-vocab';
/* group: 'main' = 단어시험 탭, 'pre' = 예비 고1 탭, 생략 = 전체 */
function vocabKeys(group){
  const keys=Object.keys(VOCAB_DATA||{});
  return keys.filter(k=>Array.isArray(VOCAB_DATA[k])&&VOCAB_DATA[k].length>0)
    .filter(k=>!group||(group==='pre'?isPre(k):!isPre(k)))
    .sort((a,b)=>{
      const da=/^day(\d+)$/i.exec(a),db=/^day(\d+)$/i.exec(b);
      if(da&&db)return Number(da[1])-Number(db[1]);
      if(da)return -1;
      if(db)return 1;
      return a.localeCompare(b,'ko',{numeric:true});
    });
}
/* 'day3' → 'Day 3' / '예비고1 Day 03' → '예비고1 Day 3' (부제는 VOCAB_TITLES의 주제) */
const preDay=k=>{const m=/^예비고1 Day (\d+)$/.exec(k);return m?Number(m[1]):null};
function vocabShortTitle(key){
  const m=/^day(\d+)$/i.exec(key);if(m)return `Day ${Number(m[1])}`;
  const p=preDay(key);return p?`예비고1 Day ${p}`:String(key).split('|')[0].trim();
}
/* 예비 고1 탭 안에서는 'Day 1'처럼 짧게 */
const vocabCardTitle=k=>preDay(k)?`Day ${preDay(k)}`:vocabShortTitle(k);
function vocabSub(key){const t=typeof VOCAB_TITLES!=='undefined'&&VOCAB_TITLES[key];if(t)return t;const i=String(key).indexOf('|');return i<0?'':String(key).slice(i+1).trim()}
function vocabTitle(key){
  const m=/^day(\d+)$/i.exec(key);
  return m?`Day ${Number(m[1])} 단어 시험`:vocabShortTitle(key)+' 단어 시험';
}
const jsq=s=>esc(String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'"));
function buildQs(key,only){
  const w=wordsOf(key),all=w.map(x=>x[1]);
  return shuf(w.filter(x=>!only||only.includes(x[0])).map(x=>({word:x[0],correct:x[1],options:shuf([x[1]].concat(shuf(all.filter(m=>m!==x[1])).slice(0,3)))})));
}
function vCardHead(k,badge){const sub=vocabSub(k);
  return `<div class="flex" style="align-items:flex-start"><div><div class="ac-title">${esc(vocabCardTitle(k))}</div>${sub?`<div class="vsub">${esc(sub)}</div>`:''}</div>${badge}</div>`}
function renderSVocab(group){
  group=group||'main';const el=$(group==='pre'?'s-pre':'s-vocab');vocabLock=false;const s=getMe(),R=s.vocabResults||{},keys=vocabKeys(group);
  const completed=keys.filter(k=>R[k]&&R[k].completed);let sc=0,tq=0,tp=0;
  completed.forEach(k=>{sc+=Number(R[k].score)||0;tq+=Number(R[k].total)||0;tp+=R[k].pointsAwarded!=null?R[k].pointsAwarded:(Number(R[k].score)||0)*10});
  const openN=keys.filter(k=>(DATA.vocabTests[k]||{}).open&&!(R[k]&&R[k].completed)).length;
  let h=`<div class="banner"><div class="small" style="color:#ffb3b8">${group==='pre'?'예비 고1 영어 단어':'단어시험'} · 누적 결과</div>
    <div class="bstats"><div><div class="small">응시</div><b>${completed.length}<small>/${keys.length}</small></b></div><div><div class="small">점수</div><b>${sc}<small>/${tq}</small></b></div><div><div class="small">획득 포인트</div><b class="green">${tp}P</b></div><div><div class="small">지금 응시 가능</div><b class="orange">${openN}</b></div></div></div>`;
  if(!keys.length)h+='<div class="warn">표시할 단어 챕터가 없습니다.</div>';
  const cards=keys.map(k=>{
    const c=DATA.vocabTests[k]||{open:false},r=R[k],n=wordsOf(k).length,q=jsq(k);
    if(r&&r.completed){
      const p=r.pointsAwarded!=null?r.pointsAwarded:r.score*10,wr=arr(r.wrongList).length>0;
      return `<div class="auction-card vcard done">${vCardHead(k,`<span class="badge badge-winner">${r.score}/${r.total}점 · +${p}P</span>`)}<div class="ac-meta">단어 ${n}개 · 응시 완료</div><div class="ac-row"><button class="btn btn-primary" style="flex:1" onclick="showVWrong('${q}')">오답 확인</button>${wr?`<button class="btn btn-success" style="flex:1" onclick="startVRetry('${q}')">오답 다시 풀기</button>`:''}</div></div>`;
    }else if(c.open){
      return `<div class="auction-card vcard open">${vCardHead(k,'<span class="badge badge-active">응시 가능</span>')}<div class="ac-meta">단어 ${n}개 · 1회만 응시</div><button class="btn btn-primary btn-full" onclick="startVocab('${q}')">시험 시작</button></div>`;
    }
    return `<div class="auction-card vcard locked">${vCardHead(k,'<span class="badge badge-ended">'+ic('lock')+' 잠김</span>')}<div class="ac-meta">단어 ${n}개</div></div>`;
  });
  /* Day 순서대로 보여주기 */
  const idx=keys.map((k,i)=>i);
  el.innerHTML=h+`<div class="cgrid">${idx.map(i=>cards[i]).join('')}</div>`;
}
const renderVList=k=>renderSVocab(vGroup(k));
async function startVocab(k){
  const s=getMe();if(s.vocabResults[k]&&s.vocabResults[k].completed){uiAlert('이미 응시한 시험입니다.');return renderVList(k)}
  const q=buildQs(k);if(!q.length)return uiAlert('단어 데이터가 없습니다.');
  if(!await uiConfirm(vocabTitle(k)+'을(를) 시작하시겠습니까?\n한 번 시작하면 재응시가 불가능합니다.'))return;
  currentQuiz={key:k,questions:q,index:0,wrong:[]};renderVQ();
}
function renderVQ(){
  const c=currentQuiz,q=c.questions[c.index],pct=Math.round(c.index/c.questions.length*100);
  $(vPanel(c.key)).innerHTML=`<div class="auction-card quiz"><div class="flex"><div class="ac-title">${esc(vocabTitle(c.key))}${c.isRetry?' · 오답 재도전':''}</div><span class="small">${c.index+1}/${c.questions.length}</span></div><div class="qbar"><i style="width:${pct}%"></i></div><div class="qword">${esc(q.word)}</div><div class="qopts">${q.options.map((o,i)=>`<button class="btn opt-btn" onclick="ansV(${i})"><b>${i+1}</b> ${esc(o)}</button>`).join('')}</div></div>`;
}
function ansV(i){
  const c=currentQuiz,q=c.questions[c.index],sel=q.options[i];if(sel!==q.correct)c.wrong.push({word:q.word,correct:q.correct,selected:sel});
  if(++c.index<c.questions.length)renderVQ();else finishVocab();
}
async function finishVocab(){
  await pull();const s=getMe(),c=currentQuiz,k=c.key,total=c.questions.length,score=total-c.wrong.length;
  const VP=SP(s.id)+'/vocabResults/'+k;
  if(c.isRetry){const p=s.vocabResults[k]||{};p.wrongList=c.wrong;p.retriedAt=today();s.vocabResults[k]=p;await dbUpdate({[VP+'/wrongList']:c.wrong,[VP+'/retriedAt']:p.retriedAt});currentQuiz=null;toast('🔁 재도전 완료! '+score+'/'+total);return showVResult(k,score,total,null,true)}
  if(s.vocabResults[k]&&s.vocabResults[k].completed){currentQuiz=null;uiAlert('이미 응시한 시험입니다.');return renderVList(k)}
  const pts=score*10;s.vocabResults[k]={completed:true,score,total,wrongList:c.wrong,date:today(),pointsAwarded:pts};s.points+=pts;
  const upd={[VP]:s.vocabResults[k],[SP(s.id)+'/points']:s.points};addHist(s,{label:vocabTitle(k)+' ('+score+'/'+total+')',points:pts,date:today()},upd);
  if(!await dbUpdate(upd)){currentQuiz=null;return renderVList(k)}currentQuiz=null;
  $('studentPoints').textContent=s.points;toast('📝 시험 완료! '+score+'/'+total+' (+'+pts+'P)');showVResult(k,score,total,pts,false);
}
async function startVRetry(k){
  const r=getMe().vocabResults[k],w=r?arr(r.wrongList):[];if(!w.length)return uiAlert('다시 풀 오답이 없습니다.');
  if(!await uiConfirm(vocabShortTitle(k)+'에서 틀렸던 '+w.length+'문제만 다시 풀어볼까요?'))return;
  currentQuiz={key:k,questions:buildQs(k,w.map(x=>x.word)),index:0,wrong:[],isRetry:true};renderVQ();
}
function showVResult(k,score,total,pts,retry){
  vocabLock=true;const q=jsq(k),g=vGroup(k);
  $(vPanel(k)).innerHTML=`<div class="auction-card quiz" style="text-align:center"><div class="ac-title">${esc(vocabShortTitle(k))} ${retry?'오답 재도전':'시험'} 결과</div>${pts!=null?`<div class="green">+${pts}P</div>`:''}<div style="font-size:46px;font-weight:900;color:var(--green);margin:12px 0">${score}/${total}</div><div style="display:flex;gap:8px"><button class="btn btn-primary" style="flex:1" onclick="showVWrong('${q}')">오답 확인</button><button class="btn" style="flex:1" onclick="renderSVocab('${g}')">목록으로</button></div></div>`;
}
function showVWrong(k){
  vocabLock=true;const r=getMe().vocabResults[k],w=r?arr(r.wrongList):[],title=esc(vocabShortTitle(k)),q=jsq(k),g=vGroup(k),el=$(vPanel(k));
  if(!w.length){el.innerHTML=`<div class="auction-card quiz" style="text-align:center"><div class="ac-title">${title} 오답 노트</div><div class="empty">🎉 틀린 문제가 없습니다!</div><button class="btn btn-primary btn-full" onclick="renderSVocab('${g}')">목록으로</button></div>`;return}
  el.innerHTML=`<div class="auction-card"><div class="flex"><div class="ac-title">${title} 오답 노트</div><span class="badge badge-ended">${w.length}개 틀림</span></div><div class="wgrid">${w.map(x=>`<div class="history"><b>${esc(x.word)}</b><div class="small red" style="margin-top:4px">내가 고른 답: ${esc(x.selected)}</div><div class="small green">정답: ${esc(x.correct)}</div></div>`).join('')}</div><div style="display:flex;gap:8px;margin-top:14px"><button class="btn btn-success" style="flex:1" onclick="startVRetry('${q}')">오답 다시 풀기</button><button class="btn btn-primary" style="flex:1" onclick="renderSVocab('${g}')">목록으로</button></div></div>`;
}
/* ───── 관리자 ───── */
function renderAVocab(){renderAVocabList('main','adminVocabList');renderAVocabList('pre','adminPreList')}
function renderAVocabList(group,elId){
  const el=$(elId);if(!el)return;const keys=vocabKeys(group);
  const h=keys.map(k=>{const c=DATA.vocabTests[k]||{open:false},n=DATA.students.filter(s=>s.vocabResults&&s.vocabResults[k]&&s.vocabResults[k].completed).length,sub=vocabSub(k);
    return `<div class="admin-card flex"><div><b>${esc(vocabCardTitle(k))}</b>${sub?`<div class="vsub">${esc(sub)}</div>`:''}<div class="small" style="margin-top:4px">단어 ${wordsOf(k).length}개 · 응시 ${n}/${DATA.students.length}명</div></div><div style="display:flex;gap:6px;align-items:center"><span class="badge ${c.open?'badge-active':'badge-ended'}">${c.open?'열림':'닫힘'}</span><button class="btn btn-sm btn-ghost" onclick="previewVocab('${jsq(k)}','${elId}')">단어 보기</button><button class="btn btn-sm ${c.open?'btn-danger':'btn-primary'}" onclick="toggleVocab('${jsq(k)}')">${c.open?'닫기':'열기'}</button></div></div>`;
  }).join('');
  el.innerHTML=h?`<div class="cgrid">${h}</div>`:'<div class="empty">표시할 단어 챕터가 없습니다.</div>';
}
async function toggleVocab(k){
  await pull();const c=DATA.vocabTests[k]||(DATA.vocabTests[k]={open:false});c.open=!c.open;if(!await dbUpdate({['pub/vocabTests/'+k+'/open']:c.open}))return renderAVocab();renderAVocab();toast(c.open?'✅ '+vocabShortTitle(k)+' 열림':'🔒 '+vocabShortTitle(k)+' 닫힘');
}
async function setVocabGroup(group,open){const keys=vocabKeys(group);if(!await uiConfirm((group==='pre'?'예비 고1':'Day')+' 단어시험 '+keys.length+'개를 모두 '+(open?'열까요?':'닫을까요?')))return;
  const upd={};keys.forEach(k=>upd['pub/vocabTests/'+k+'/open']=open);if(!await dbUpdate(upd))return;await pull();renderAVocab();toast(open?'✅ 모두 열림':'🔒 모두 닫힘')}
function dayOptions(id){
  const sel=$(id),keys=vocabKeys(),pv=sel.value;
  if(sel.options.length!==keys.length||keys.some((k,i)=>sel.options[i]&&sel.options[i].value!==k)){
    sel.innerHTML=keys.map(k=>`<option value="${esc(k)}">${esc(vocabShortTitle(k))}</option>`).join('');
    if(keys.includes(pv))sel.value=pv;
  }
  return sel.value||keys[0]||'';
}
function renderAVScore(){
  const k=dayOptions('vocabScoreDay');$('adminVocabScoreDetail').innerHTML='';if(!k){$('adminVocabScoreList').innerHTML='<div class="empty">표시할 챕터가 없습니다.</div>';return}
  const rows=DATA.students.map(s=>{const r=s.vocabResults&&s.vocabResults[k];if(r&&r.completed){const p=r.pointsAwarded!=null?r.pointsAwarded:r.score*10,w=arr(r.wrongList).length;return`<tr><td><button class="btn btn-sm" style="background:none;color:var(--red2);text-decoration:underline;padding:2px 4px" onclick="showAWrong('${jsq(s.id)}','${jsq(k)}')">${esc(s.name)}</button></td><td>${r.score}/${r.total}</td><td>${p}P</td><td>${w}개</td></tr>`}return`<tr><td>${esc(s.name)}</td><td class="small" colspan="3">미응시</td></tr>`}).join('');
  $('adminVocabScoreList').innerHTML=`<div class="small" style="margin:4px 0 10px">${esc(vocabShortTitle(k))} · ${(DATA.vocabTests[k]||{}).open?'열림':'닫힘'} · 이름을 누르면 오답을 볼 수 있습니다.</div><div style="overflow-x:auto"><table class="table"><thead><tr><th>이름</th><th>점수</th><th>포인트</th><th>오답</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  const summary=DATA.students.map(s=>{const results=Object.values(s.vocabResults||{}).filter(r=>r&&r.completed),score=results.reduce((a,r)=>a+(Number(r.score)||0),0),points=results.reduce((a,r)=>a+(r.pointsAwarded!=null?Number(r.pointsAwarded):(Number(r.score)||0)*10),0);return`<tr><td>${esc(s.name)}</td><td>${results.length}/${vocabKeys().length}</td><td>${score}</td><td>${points}P</td></tr>`}).join('');
  $('adminVocabScoreSummary').innerHTML=`<div style="overflow-x:auto"><table class="table"><thead><tr><th>이름</th><th>응시</th><th>누적 점수</th><th>누적 P</th></tr></thead><tbody>${summary}</tbody></table></div>`;
}
function showAWrong(sid,k){
  const s=DATA.students.find(x=>x.id===sid),r=s&&s.vocabResults&&s.vocabResults[k],w=r?arr(r.wrongList):[];if(!s)return;
  $('adminVocabScoreDetail').innerHTML=`<div class="auction-card" style="margin-top:12px"><div class="flex"><div class="ac-title">${esc(s.name)} · ${esc(vocabShortTitle(k))} 오답</div><span class="badge badge-ended">${w.length}개</span></div>${w.length?w.map(x=>`<div class="history"><b>${esc(x.word)}</b><div class="small red" style="margin-top:4px">내가 고른 답: ${esc(x.selected)}</div><div class="small green">정답: ${esc(x.correct)}</div></div>`).join(''):'<div class="empty">오답이 없습니다.</div>'}</div>`;
}

/* 관리자: 단어 미리보기 (열기 전에 시험에 나올 단어 확인) */
function previewVocab(k,elId){const el=$(elId),w=wordsOf(k),c=DATA.vocabTests[k]||{},sub=vocabSub(k),g=elId==='adminPreList'?'pre':'main';
  el.innerHTML=`<div class="admin-section"><div class="flex"><b>${esc(vocabShortTitle(k))} 단어 미리보기 (${w.length}개 · ${c.open?'열림':'닫힘'})</b><button class="btn btn-sm" onclick="renderAVocab()">목록으로</button></div>${sub?`<div class="vsub">${esc(sub)}</div>`:''}
  <div class="small" style="margin:6px 0 10px">시험에서는 이 단어들이 무작위 순서로 나오고, 보기는 같은 챕터의 다른 뜻 3개가 섞여 나와요.</div>
  <div style="overflow-x:auto"><table class="table vprev"><thead><tr><th>#</th><th>단어</th><th>뜻</th></tr></thead><tbody>${w.map((x,i)=>`<tr><td class="small">${i+1}</td><td><b>${esc(x[0])}</b></td><td>${esc(x[1])}</td></tr>`).join('')}</tbody></table></div>
  <button class="btn btn-full ${c.open?'btn-danger':'btn-primary'}" style="margin-top:12px" onclick="toggleVocab('${jsq(k)}')">${esc(vocabShortTitle(k))} ${c.open?'닫기':'열기'}</button></div>`;el.scrollIntoView({block:'start'})}
