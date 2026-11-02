/* 단어시험 (학생 + 관리자 + 성적) */
function buildQs(key,only){const w=wordsOf(key),all=w.map(x=>x[1]);
  return shuf(w.filter(x=>!only||only.includes(x[0])).map(x=>({word:x[0],correct:x[1],options:shuf([x[1]].concat(shuf(all.filter(m=>m!==x[1])).slice(0,3)))})))}
function renderSVocab(){const el=$('s-vocab');vocabLock=false;const s=getMe(),R=s.vocabResults;
  const ks=Object.keys(R).filter(k=>R[k]&&R[k].completed);let sc=0,tq=0,tp=0;
  ks.forEach(k=>{sc+=R[k].score;tq+=R[k].total;tp+=R[k].pointsAwarded!=null?R[k].pointsAwarded:R[k].score*10});
  let h=`<div class="banner"><div class="small" style="color:#ffb3b8">누적 결과 · 응시 ${ks.length}/30일</div><div class="flex" style="margin-top:8px"><div><div class="small">점수</div><b style="font-size:22px">${sc}/${tq}</b></div><div><div class="small">정답률</div><b style="font-size:22px">${tq?Math.round(sc/tq*100):0}%</b></div><div><div class="small">획득</div><b style="font-size:22px" class="green">${tp}P</b></div></div></div>`;
  if(!Object.keys(VOCAB_DATA).length)h+='<div class="warn">VOCAB_DATA가 비어 있어요. 기존 파일의 단어 데이터를 붙여넣어 주세요.</div>';
  for(let i=1;i<=30;i++){const k='day'+i,c=(DATA.vocabTests[k])||{open:false},r=R[k],n=wordsOf(k).length;
    if(r&&r.completed){const p=r.pointsAwarded!=null?r.pointsAwarded:r.score*10,wr=arr(r.wrongList).length>0;
      h+=`<div class="auction-card"><div class="flex"><div class="ac-title">Day ${i} 단어 시험</div><span class="badge badge-winner">${r.score}/${r.total}점 (+${p}P)</span></div><div class="ac-meta"><span>응시일 ${esc(r.date)}</span></div>
      <div class="ac-row"><button class="btn btn-primary" style="flex:1" onclick="showVWrong('${k}')">오답 확인</button>${wr?`<button class="btn btn-success" style="flex:1" onclick="startVRetry('${k}')">오답 다시 풀기</button>`:''}</div></div>`}
    else if(c.open)h+=`<div class="auction-card"><div class="flex"><div class="ac-title">Day ${i} 단어 시험</div><span class="badge badge-active">응시 가능</span></div><div class="ac-meta"><span>총 ${n}문제 · 4지선다 · 문제당 10P</span></div><div class="ac-row"><button class="btn btn-primary" style="flex:1" onclick="startVocab('${k}')">시험 시작</button></div></div>`;
    else h+=`<div class="auction-card" style="opacity:.5"><div class="flex"><div class="ac-title">Day ${i} 단어 시험</div><span class="badge badge-ended">🔒 잠김</span></div><div class="ac-meta"><span>선생님이 열면 응시할 수 있어요</span></div></div>`}
  el.innerHTML=h}
function startVocab(k){const s=getMe();if(s.vocabResults[k]&&s.vocabResults[k].completed){alert('이미 응시한 시험입니다.');return renderSVocab()}
  const q=buildQs(k);if(!q.length)return alert('단어 데이터가 없습니다.');
  if(!confirm('Day '+k.slice(3)+' 단어 시험을 시작하시겠습니까?\n한 번 시작하면 재응시가 불가능합니다.'))return;
  currentQuiz={key:k,questions:q,index:0,wrong:[]};renderVQ()}
function renderVQ(){const c=currentQuiz,q=c.questions[c.index];
  $('s-vocab').innerHTML=`<div class="auction-card"><div class="flex"><div class="ac-title">Day ${c.key.slice(3)}${c.isRetry?' 오답 재도전':' 단어 시험'}</div><span class="small">${c.index+1}/${c.questions.length}</span></div>
  <div style="font-size:28px;font-weight:800;margin:24px 0;text-align:center;color:var(--red2)">${esc(q.word)}</div>
  <div style="display:flex;flex-direction:column;gap:10px">${q.options.map((o,i)=>`<button class="btn opt-btn" onclick="ansV(${i})">${i+1}. ${esc(o)}</button>`).join('')}</div></div>`}
function ansV(i){const c=currentQuiz,q=c.questions[c.index],sel=q.options[i];if(sel!==q.correct)c.wrong.push({word:q.word,correct:q.correct,selected:sel});
  if(++c.index<c.questions.length)renderVQ();else finishVocab()}
async function finishVocab(){await pull();const s=getMe(),c=currentQuiz,k=c.key,total=c.questions.length,score=total-c.wrong.length;
  if(c.isRetry){const p=s.vocabResults[k]||{};p.wrongList=c.wrong;p.retriedAt=today();s.vocabResults[k]=p;await dbSave();currentQuiz=null;toast('🔁 재도전 완료! '+score+'/'+total);return showVResult(k,score,total,null,true)}
  const pts=score*10;s.vocabResults[k]={completed:true,score,total,wrongList:c.wrong,date:today(),pointsAwarded:pts};s.points+=pts;
  s.history.push({label:'Day '+k.slice(3)+' 단어시험 ('+score+'/'+total+')',points:pts,date:today()});await dbSave();currentQuiz=null;
  $('studentPoints').textContent=s.points;toast('📝 시험 완료! '+score+'/'+total+' (+'+pts+'P)');showVResult(k,score,total,pts,false)}
function startVRetry(k){const r=getMe().vocabResults[k],w=r?arr(r.wrongList):[];if(!w.length)return alert('다시 풀 오답이 없습니다.');
  if(!confirm('Day '+k.slice(3)+'에서 틀렸던 '+w.length+'문제만 다시 풀어볼까요?'))return;
  currentQuiz={key:k,questions:buildQs(k,w.map(x=>x.word)),index:0,wrong:[],isRetry:true};renderVQ()}
function showVResult(k,score,total,pts,retry){vocabLock=true;
  $('s-vocab').innerHTML=`<div class="auction-card" style="text-align:center"><div class="ac-title">Day ${k.slice(3)} ${retry?'오답 재도전':'시험'} 결과</div>${pts!=null?`<div class="green" style="font-weight:700;margin-top:6px">+${pts}P 적립됨</div>`:'<div class="small" style="margin-top:6px">원래 점수와 포인트는 그대로 유지됩니다.</div>'}
  <div style="font-size:46px;font-weight:900;color:var(--green);margin:12px 0">${score}/${total}</div>
  <div style="display:flex;gap:8px"><button class="btn btn-primary" style="flex:1" onclick="showVWrong('${k}')">오답 확인</button><button class="btn" style="flex:1" onclick="renderSVocab()">목록으로</button></div></div>`}
function showVWrong(k){vocabLock=true;const r=getMe().vocabResults[k],w=r?arr(r.wrongList):[];
  if(!w.length){$('s-vocab').innerHTML=`<div class="auction-card" style="text-align:center"><div class="ac-title">Day ${k.slice(3)} 오답 노트</div><div class="empty">🎉 틀린 문제가 없습니다!</div><button class="btn btn-primary btn-full" onclick="renderSVocab()">목록으로</button></div>`;return}
  $('s-vocab').innerHTML=`<div class="auction-card"><div class="flex"><div class="ac-title">Day ${k.slice(3)} 오답 노트</div><span class="badge badge-ended">${w.length}개 틀림</span></div>
  ${w.map(x=>`<div class="history"><b>${esc(x.word)}</b><div class="small red" style="margin-top:4px">내가 고른 답: ${esc(x.selected)}</div><div class="small green">정답: ${esc(x.correct)}</div></div>`).join('')}
  <div style="display:flex;gap:8px;margin-top:14px"><button class="btn btn-success" style="flex:1" onclick="startVRetry('${k}')">오답 다시 풀기</button><button class="btn btn-primary" style="flex:1" onclick="renderSVocab()">목록으로</button></div></div>`}
function renderAVocab(){let h='';for(let i=1;i<=30;i++){const k='day'+i,c=DATA.vocabTests[k]||{open:false},n=DATA.students.filter(s=>s.vocabResults[k]&&s.vocabResults[k].completed).length;
  h+=`<div class="admin-card flex"><div><b>Day ${i}</b><div class="small" style="margin-top:4px">단어 ${wordsOf(k).length}개 · 응시 ${n}/${DATA.students.length}명</div></div><div style="display:flex;gap:8px;align-items:center"><span class="badge ${c.open?'badge-active':'badge-ended'}">${c.open?'열림':'닫힘'}</span><button class="btn ${c.open?'btn-danger':'btn-success'} btn-sm" onclick="toggleVocab('${k}')">${c.open?'닫기':'열기'}</button></div></div>`}
  $('adminVocabList').innerHTML=h}
async function toggleVocab(k){await pull();const c=DATA.vocabTests[k]||(DATA.vocabTests[k]={open:false});c.open=!c.open;await dbSave();renderAVocab();toast(c.open?'✅ Day '+k.slice(3)+' 열림':'🔒 Day '+k.slice(3)+' 닫힘')}
function dayOptions(id){const sel=$(id);if(sel.options.length!==30){const pv=sel.value;sel.innerHTML=Array.from({length:30},(_,i)=>`<option value="day${i+1}">Day ${i+1}</option>`).join('');if(pv)sel.value=pv}return sel.value||'day1'}
function renderAVScore(){const k=dayOptions('vocabScoreDay');$('adminVocabScoreDetail').innerHTML='';
  const rows=DATA.students.map(s=>{const r=s.vocabResults[k];if(r&&r.completed){const p=r.pointsAwarded!=null?r.pointsAwarded:r.score*10,w=arr(r.wrongList).length;
    return`<tr><td><button class="btn btn-sm" style="background:none;color:var(--red2);text-decoration:underline;padding:2px 4px" onclick="showAWrong('${s.id}','${k}')">${esc(s.name)}</button></td><td class="green">${r.score}/${r.total}</td><td class="green">+${p}P</td><td>${esc(r.date)}${w?`<div class="small red">오답 ${w}개</div>`:''}</td></tr>`}
    return`<tr><td>${esc(s.name)}</td><td class="small" colspan="3">미응시</td></tr>`}).join('');
  $('adminVocabScoreList').innerHTML=`<div class="small" style="margin:4px 0 10px">Day ${k.slice(3)} · ${(DATA.vocabTests[k]||{}).open?'열림':'닫힘'} · 이름을 누르면 오답을 볼 수 있어요</div><div style="overflow-x:auto"><table class="table"><thead><tr><th>이름</th><th>점수</th><th>포인트</th><th>응시일</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  $('adminVocabScoreSummary').innerHTML=`<div style="overflow-x:auto"><table class="table"><thead><tr><th>이름</th><th>응시</th><th>누적 점수</th><th>누적 P</th></tr></thead><tbody>${DATA.students.map(s=>{const ks=Object.keys(s.vocabResults).filter(x=>s.vocabResults[x]&&s.vocabResults[x].completed);let a=0,b=0,p=0;ks.forEach(x=>{const r=s.vocabResults[x];a+=r.score;b+=r.total;p+=r.pointsAwarded!=null?r.pointsAwarded:r.score*10});return`<tr><td>${esc(s.name)}</td><td>${ks.length}/30</td><td>${a}/${b}</td><td class="green">${p}P</td></tr>`}).join('')}</tbody></table></div>`}
function showAWrong(sid,k){const s=DATA.students.find(x=>x.id===sid),r=s&&s.vocabResults[k],w=r?arr(r.wrongList):[];
  $('adminVocabScoreDetail').innerHTML=`<div class="auction-card" style="margin-top:12px"><div class="flex"><div class="ac-title">${esc(s.name)} · Day ${k.slice(3)} 오답</div><span class="badge badge-ended">${w.length}개</span></div>${w.length?w.map(x=>`<div class="history"><b>${esc(x.word)}</b><div class="small red">${esc(s.name)}: ${esc(x.selected)}</div><div class="small green">정답: ${esc(x.correct)}</div></div>`).join(''):'<div class="empty">🎉 틀린 문제가 없습니다!</div>'}</div>`}
