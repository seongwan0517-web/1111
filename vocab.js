/* 단어시험: Day 1~30 + VOCAB_DATA에 정의된 추가 챕터 */
function vocabKeys(){
  const keys=Object.keys(VOCAB_DATA||{});
  return keys.filter(k=>Array.isArray(VOCAB_DATA[k])&&VOCAB_DATA[k].length>0)
    .sort((a,b)=>{
      const da=/^day(\d+)$/i.exec(a),db=/^day(\d+)$/i.exec(b);
      if(da&&db)return Number(da[1])-Number(db[1]);
      if(da)return -1;
      if(db)return 1;
      return a.localeCompare(b,'ko');
    });
}
function vocabTitle(key){
  const m=/^day(\d+)$/i.exec(key);
  return m?`Day ${Number(m[1])} 단어 시험`:key;
}
function vocabShortTitle(key){
  const m=/^day(\d+)$/i.exec(key);
  return m?`Day ${Number(m[1])}`:key;
}
function buildQs(key,only){
  const w=wordsOf(key),all=w.map(x=>x[1]);
  return shuf(w.filter(x=>!only||only.includes(x[0])).map(x=>({word:x[0],correct:x[1],options:shuf([x[1]].concat(shuf(all.filter(m=>m!==x[1])).slice(0,3)))})));
}
function renderSVocab(){
  const el=$('s-vocab');vocabLock=false;const s=getMe(),R=s.vocabResults||{},keys=vocabKeys();
  const completed=keys.filter(k=>R[k]&&R[k].completed);let sc=0,tq=0,tp=0;
  completed.forEach(k=>{sc+=Number(R[k].score)||0;tq+=Number(R[k].total)||0;tp+=R[k].pointsAwarded!=null?R[k].pointsAwarded:(Number(R[k].score)||0)*10});
  let h=`<div class="banner"><div class="small" style="color:#ffb3b8">누적 결과 · 응시 ${completed.length}/${keys.length}개 챕터</div><div class="flex" style="margin-top:8px"><div><div class="small">점수</div><b style="font-size:22px">${sc}/${tq}</b></div><div><div class="small">획득 포인트</div><b style="font-size:22px">${tp}P</b></div></div></div>`;
  if(!keys.length)h+='<div class="warn">표시할 단어 챕터가 없습니다.</div>';
  keys.forEach(k=>{
    const c=DATA.vocabTests[k]||{open:false},r=R[k],n=wordsOf(k).length,title=esc(vocabTitle(k));
    if(r&&r.completed){
      const p=r.pointsAwarded!=null?r.pointsAwarded:r.score*10,wr=arr(r.wrongList).length>0;
      h+=`<div class="auction-card"><div class="flex"><div class="ac-title">${title}</div><span class="badge badge-winner">${r.score}/${r.total}점 (+${p}P)</span></div><div class="ac-meta">단어 ${n}개 · 응시 완료</div><div class="ac-row"><button class="btn btn-primary" style="flex:1" onclick="showVWrong('${esc(k)}')">오답 확인</button>${wr?`<button class="btn btn-success" style="flex:1" onclick="startVRetry('${esc(k)}')">오답 다시 풀기</button>`:''}</div></div>`;
    }else if(c.open){
      h+=`<div class="auction-card"><div class="flex"><div class="ac-title">${title}</div><span class="badge badge-active">응시 가능</span></div><div class="ac-meta">단어 ${n}개</div><button class="btn btn-primary btn-full" onclick="startVocab('${esc(k)}')">시험 시작</button></div>`;
    }else{
      h+=`<div class="auction-card" style="opacity:.5"><div class="flex"><div class="ac-title">${title}</div><span class="badge badge-ended">🔒 잠김</span></div><div class="ac-meta">단어 ${n}개</div></div>`;
    }
  });
  el.innerHTML=h;
}
function startVocab(k){
  const s=getMe();if(s.vocabResults[k]&&s.vocabResults[k].completed){alert('이미 응시한 시험입니다.');return renderSVocab()}
  const q=buildQs(k);if(!q.length)return alert('단어 데이터가 없습니다.');
  if(!confirm(vocabTitle(k)+'을(를) 시작하시겠습니까?\n한 번 시작하면 재응시가 불가능합니다.'))return;
  currentQuiz={key:k,questions:q,index:0,wrong:[]};renderVQ();
}
function renderVQ(){
  const c=currentQuiz,q=c.questions[c.index];
  $('s-vocab').innerHTML=`<div class="auction-card"><div class="flex"><div class="ac-title">${esc(vocabTitle(c.key))}${c.isRetry?' · 오답 재도전':''}</div><span class="small">${c.index+1}/${c.questions.length}</span></div><div style="font-size:28px;font-weight:800;margin:24px 0;text-align:center;color:var(--red2)">${esc(q.word)}</div><div style="display:flex;flex-direction:column;gap:10px">${q.options.map((o,i)=>`<button class="btn opt-btn" onclick="ansV(${i})">${i+1}. ${esc(o)}</button>`).join('')}</div></div>`;
}
function ansV(i){
  const c=currentQuiz,q=c.questions[c.index],sel=q.options[i];if(sel!==q.correct)c.wrong.push({word:q.word,correct:q.correct,selected:sel});
  if(++c.index<c.questions.length)renderVQ();else finishVocab();
}
async function finishVocab(){
  await pull();const s=getMe(),c=currentQuiz,k=c.key,total=c.questions.length,score=total-c.wrong.length;
  const VP=SP(s.id)+'/vocabResults/'+k;
  if(c.isRetry){const p=s.vocabResults[k]||{};p.wrongList=c.wrong;p.retriedAt=today();s.vocabResults[k]=p;await dbUpdate({[VP+'/wrongList']:c.wrong,[VP+'/retriedAt']:p.retriedAt});currentQuiz=null;toast('🔁 재도전 완료! '+score+'/'+total);return showVResult(k,score,total,null,true)}
  if(s.vocabResults[k]&&s.vocabResults[k].completed){currentQuiz=null;alert('이미 응시한 시험입니다.');return renderSVocab()}
  const pts=score*10;s.vocabResults[k]={completed:true,score,total,wrongList:c.wrong,date:today(),pointsAwarded:pts};s.points+=pts;
  const upd={[VP]:s.vocabResults[k],[SP(s.id)+'/points']:s.points};addHist(s,{label:vocabTitle(k)+' ('+score+'/'+total+')',points:pts,date:today()},upd);
  if(!await dbUpdate(upd)){currentQuiz=null;return renderSVocab()}currentQuiz=null;
  $('studentPoints').textContent=s.points;toast('📝 시험 완료! '+score+'/'+total+' (+'+pts+'P)');showVResult(k,score,total,pts,false);
}
function startVRetry(k){
  const r=getMe().vocabResults[k],w=r?arr(r.wrongList):[];if(!w.length)return alert('다시 풀 오답이 없습니다.');
  if(!confirm(vocabShortTitle(k)+'에서 틀렸던 '+w.length+'문제만 다시 풀어볼까요?'))return;
  currentQuiz={key:k,questions:buildQs(k,w.map(x=>x.word)),index:0,wrong:[],isRetry:true};renderVQ();
}
function showVResult(k,score,total,pts,retry){
  vocabLock=true;
  $('s-vocab').innerHTML=`<div class="auction-card" style="text-align:center"><div class="ac-title">${esc(vocabShortTitle(k))} ${retry?'오답 재도전':'시험'} 결과</div>${pts!=null?`<div class="green">+${pts}P</div>`:''}<div style="font-size:46px;font-weight:900;color:var(--green);margin:12px 0">${score}/${total}</div><div style="display:flex;gap:8px"><button class="btn btn-primary" style="flex:1" onclick="showVWrong('${esc(k)}')">오답 확인</button><button class="btn" style="flex:1" onclick="renderSVocab()">목록으로</button></div></div>`;
}
function showVWrong(k){
  vocabLock=true;const r=getMe().vocabResults[k],w=r?arr(r.wrongList):[],title=esc(vocabShortTitle(k));
  if(!w.length){$('s-vocab').innerHTML=`<div class="auction-card" style="text-align:center"><div class="ac-title">${title} 오답 노트</div><div class="empty">🎉 틀린 문제가 없습니다!</div><button class="btn btn-primary btn-full" onclick="renderSVocab()">목록으로</button></div>`;return}
  $('s-vocab').innerHTML=`<div class="auction-card"><div class="flex"><div class="ac-title">${title} 오답 노트</div><span class="badge badge-ended">${w.length}개 틀림</span></div>${w.map(x=>`<div class="history"><b>${esc(x.word)}</b><div class="small red" style="margin-top:4px">내가 고른 답: ${esc(x.selected)}</div><div class="small green">정답: ${esc(x.correct)}</div></div>`).join('')}<div style="display:flex;gap:8px;margin-top:14px"><button class="btn btn-success" style="flex:1" onclick="startVRetry('${esc(k)}')">오답 다시 풀기</button><button class="btn btn-primary" style="flex:1" onclick="renderSVocab()">목록으로</button></div></div>`;
}
function renderAVocab(){
  const keys=vocabKeys();let h='';
  keys.forEach(k=>{const c=DATA.vocabTests[k]||{open:false},n=DATA.students.filter(s=>s.vocabResults&&s.vocabResults[k]&&s.vocabResults[k].completed).length;
    h+=`<div class="admin-card flex"><div><b>${esc(vocabTitle(k))}</b><div class="small" style="margin-top:4px">단어 ${wordsOf(k).length}개 · 응시 ${n}/${DATA.students.length}명</div></div><div style="display:flex;gap:6px"><span class="badge ${c.open?'badge-active':'badge-ended'}">${c.open?'열림':'닫힘'}</span><button class="btn btn-sm ${c.open?'btn-danger':'btn-primary'}" onclick="toggleVocab('${esc(k)}')">${c.open?'닫기':'열기'}</button></div></div>`;
  });
  $('adminVocabList').innerHTML=h||'<div class="empty">표시할 단어 챕터가 없습니다.</div>';
}
async function toggleVocab(k){
  await pull();const c=DATA.vocabTests[k]||(DATA.vocabTests[k]={open:false});c.open=!c.open;if(!await dbUpdate({['pub/vocabTests/'+k+'/open']:c.open}))return renderAVocab();renderAVocab();toast(c.open?'✅ '+vocabShortTitle(k)+' 열림':'🔒 '+vocabShortTitle(k)+' 닫힘');
}
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
  const rows=DATA.students.map(s=>{const r=s.vocabResults&&s.vocabResults[k];if(r&&r.completed){const p=r.pointsAwarded!=null?r.pointsAwarded:r.score*10,w=arr(r.wrongList).length;return`<tr><td><button class="btn btn-sm" style="background:none;color:var(--red2);text-decoration:underline;padding:2px 4px" onclick="showAWrong('${esc(s.id)}','${esc(k)}')">${esc(s.name)}</button></td><td>${r.score}/${r.total}</td><td>${p}P</td><td>${w}개</td></tr>`}return`<tr><td>${esc(s.name)}</td><td class="small" colspan="3">미응시</td></tr>`}).join('');
  $('adminVocabScoreList').innerHTML=`<div class="small" style="margin:4px 0 10px">${esc(vocabShortTitle(k))} · ${(DATA.vocabTests[k]||{}).open?'열림':'닫힘'} · 이름을 누르면 오답을 볼 수 있습니다.</div><div style="overflow-x:auto"><table class="table"><thead><tr><th>이름</th><th>점수</th><th>포인트</th><th>오답</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  const summary=DATA.students.map(s=>{const results=Object.values(s.vocabResults||{}).filter(r=>r&&r.completed),score=results.reduce((a,r)=>a+(Number(r.score)||0),0),points=results.reduce((a,r)=>a+(r.pointsAwarded!=null?Number(r.pointsAwarded):(Number(r.score)||0)*10),0);return`<tr><td>${esc(s.name)}</td><td>${results.length}/${vocabKeys().length}</td><td>${score}</td><td>${points}P</td></tr>`}).join('');
  $('adminVocabScoreSummary').innerHTML=`<div style="overflow-x:auto"><table class="table"><thead><tr><th>이름</th><th>응시</th><th>누적 점수</th><th>누적 P</th></tr></thead><tbody>${summary}</tbody></table></div>`;
}
function showAWrong(sid,k){
  const s=DATA.students.find(x=>x.id===sid),r=s&&s.vocabResults&&s.vocabResults[k],w=r?arr(r.wrongList):[];if(!s)return;
  $('adminVocabScoreDetail').innerHTML=`<div class="auction-card" style="margin-top:12px"><div class="flex"><div class="ac-title">${esc(s.name)} · ${esc(vocabShortTitle(k))} 오답</div><span class="badge badge-ended">${w.length}개</span></div>${w.length?w.map(x=>`<div class="history"><b>${esc(x.word)}</b><div class="small red" style="margin-top:4px">내가 고른 답: ${esc(x.selected)}</div><div class="small green">정답: ${esc(x.correct)}</div></div>`).join(''):'<div class="empty">오답이 없습니다.</div>'}</div>`;
}
