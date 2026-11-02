/* 수학시험 (학생 + 관리자 + 성적 + 사진 자르기) */
const mItems=r=>r.items?arr(r.items):[{selected:r.selected,answer:r.answer,correct:!!r.correct}];
const nqOf=c=>c.nq||1,nrOf=c=>c.retryHas?(c.nr||1):0;
const mRetry=(r,i)=>(r.retries&&r.retries[i])||(i===0&&r.retriedAt?{selected:r.retrySelected,correct:!!r.retryCorrect,tries:r.retryTries||1}:null);
const mconf=k=>DATA.mathTests[k]||{open:false};
async function mathFetch(k,force){if(!force&&mathCache[k])return mathCache[k];const r=await fetch(BASE+'mathProblems/'+k+'.json');if(!r.ok)throw new Error('HTTP '+r.status);const p=await r.json()||{};
  return mathCache[k]={qs:arr(p.qs||(p.q?[p.q]:[])),rs:arr(p.rs||(p.r?[p.r]:[]))}}
async function mathPut(k,o){const r=await fetch(BASE+'mathProblems/'+k+'.json',{method:o?'PUT':'DELETE',headers:{'Content-Type':'application/json'},body:o?JSON.stringify(o):undefined});if(!r.ok)throw new Error('HTTP '+r.status);delete mathCache[k]}
function mathZoom(src){$('zoomImg').src=src;$('zoomModal').style.display='block'}
const closeZoom=()=>{$('zoomModal').style.display='none'};
const fig=src=>`<div class="math-fig" onclick="mathZoom(this.querySelector('img').src)"><img src="${src}" alt="문제"></div>`;
const wrongIdx=(r,c)=>mItems(r).map((x,i)=>(!x.correct&&i<nrOf(c)&&!(mRetry(r,i)||{}).correct)?i:-1).filter(i=>i>=0);
function renderSMath(){const el=$('s-math');mathLock=false;const s=getMe();let n=0,ok=0,q=0,pts=0;
  Object.keys(s.mathResults).forEach(k=>{const r=s.mathResults[k];if(r&&r.completed){n++;const it=mItems(r);q+=it.length;ok+=it.filter(x=>x.correct).length;pts+=(r.pointsAwarded||0)+(r.retryPoints||0)}});
  let h=`<div class="banner"><div class="small" style="color:#ffb3b8">누적 결과 · 응시 ${n}일</div><div class="flex" style="margin-top:8px"><div><div class="small">푼 문제</div><b style="font-size:22px">${q}</b></div><div><div class="small">정답</div><b style="font-size:22px">${ok}</b></div><div><div class="small">획득</div><b style="font-size:22px" class="green">${pts}P</b></div></div></div>`,shown=0;
  for(let i=1;i<=MATH_DAYS;i++){const k='day'+i,c=mconf(k),r=s.mathResults[k];
    if(r&&r.completed){shown++;const it=mItems(r),cc=it.filter(x=>x.correct).length,w=wrongIdx(r,c),locked=it.some((x,j)=>!x.correct&&j<nrOf(c))&&w.length&&!c.retryOpen;
      h+=`<div class="auction-card"><div class="flex"><div class="ac-title">Day ${i} 수학</div><span class="badge ${cc===it.length?'badge-winner':'badge-ended'}">${cc}/${it.length} 정답${r.pointsAwarded?' (+'+r.pointsAwarded+'P)':''}</span></div>
      <div class="ac-meta"><span>${esc(r.date)}</span></div>${locked?'<div class="small" style="margin-bottom:8px">🔒 선생님이 유사문제를 열면 다시 풀 수 있어요</div>':''}
      <div class="ac-row"><button class="btn btn-primary" style="flex:1" onclick="showMathSol('${k}','q')">해설 보기</button>${w.length&&c.retryOpen?`<button class="btn btn-success" style="flex:1" onclick="startMathRetry('${k}')">유사 문제 풀기 (${w.length})</button>`:''}</div></div>`}
    else if(c.open&&c.has){shown++;h+=`<div class="auction-card"><div class="flex"><div class="ac-title">Day ${i} 수학</div><span class="badge badge-active">응시 가능</span></div><div class="ac-meta"><span>${nqOf(c)}문제 · 5지선다 · 문제당 ${MATH_POINTS}P</span></div><div class="ac-row"><button class="btn btn-primary" style="flex:1" onclick="startMathTest('${k}')">문제 풀기</button></div></div>`}}
  el.innerHTML=h+(shown?'':'<div class="empty">아직 열린 수학 문제가 없어요. 선생님이 열면 여기에 나타납니다.</div>')}
async function startMathTest(k){const s=getMe();if(s.mathResults[k]&&s.mathResults[k].completed){alert('이미 응시한 문제입니다.');return renderSMath()}
  if(!confirm('Day '+k.slice(3)+' 수학 문제를 시작하시겠습니까?\n제출하면 다시 응시할 수 없습니다.'))return;await loadMath(k,'q')}
async function startMathRetry(k){await pull();const r=getMe().mathResults[k],c=mconf(k);if(!r||!r.completed||!c.retryHas||!c.retryOpen){alert('아직 선생님이 유사 문제를 열지 않았어요.');return renderSMath()}
  const w=wrongIdx(r,c);if(!w.length){alert('풀 수 있는 유사 문제가 없습니다.');return renderSMath()}await loadMath(k,'r',w)}
async function loadMath(k,which,idxs){$('s-math').innerHTML='<div class="empty">문제를 불러오는 중…</div>';let p;
  try{p=await mathFetch(k,true)}catch(e){alert('문제를 불러오지 못했습니다.\n'+e.message);return renderSMath()}
  const set=which==='q'?p.qs:p.rs;if(!set.length){alert('문제가 아직 준비되지 않았어요.');return renderSMath()}
  currentMath={key:k,which,idxs:idxs||set.map((_,i)=>i),pos:0,sel:[]};renderMathQ()}
function renderMathQ(){const c=currentMath,set=mathCache[c.key][c.which==='q'?'qs':'rs'],it=set[c.idxs[c.pos]],last=c.pos===c.idxs.length-1,retry=c.which==='r';
  $('s-math').innerHTML=`<div class="auction-card"><div class="flex"><div class="ac-title">Day ${c.key.slice(3)} ${retry?'유사 문제':'수학 문제'}</div><span class="badge badge-active">${c.pos+1} / ${c.idxs.length}</span></div>${fig(it.img)}
  <div class="small" style="margin-bottom:8px">정답 번호를 고르세요</div><div class="math-choices">${[1,2,3,4,5].map(n=>`<button class="btn math-choice${n===5?' wide':''}${c.sel[c.pos]===n?' selected':''}" onclick="selMath(${n})">${CIRCLED[n-1]}</button>`).join('')}</div>
  <div style="display:flex;gap:8px;margin-top:16px"><button class="btn" style="flex:1" onclick="cancelMath()">나가기</button><button class="btn btn-primary" style="flex:2" id="mNext" ${c.sel[c.pos]==null?'disabled':''} onclick="submitMath()">${last?'제출하기':'다음 문제'}</button></div></div>`}
function selMath(n){currentMath.sel[currentMath.pos]=n;document.querySelectorAll('.math-choice').forEach((b,i)=>b.classList.toggle('selected',i+1===n));$('mNext').disabled=false}
function cancelMath(){if(currentMath.which==='q'&&!confirm('지금 나가면 제출하지 않은 것으로 처리되고, 나중에 다시 풀 수 있어요. 나갈까요?'))return;currentMath=null;renderSMath()}
async function submitMath(){const c=currentMath;if(c.sel[c.pos]==null)return;if(c.pos<c.idxs.length-1){c.pos++;return renderMathQ()}
  if(c.which==='q'&&!confirm('제출하면 답을 바꿀 수 없습니다. 제출할까요?'))return;
  const set=mathCache[c.key][c.which==='q'?'qs':'rs'];await pull();const s=getMe();let r=s.mathResults[c.key],pts=0,oks=0;
  if(c.which==='q'){if(r&&r.completed){alert('이미 응시한 문제입니다.');currentMath=null;return renderSMath()}
    const items=c.idxs.map((ix,k)=>{const ok=c.sel[k]===set[ix].ans;if(ok)oks++;return{selected:c.sel[k],answer:set[ix].ans,correct:ok}});
    pts=oks*MATH_POINTS;s.mathResults[c.key]={completed:true,items,date:today(),pointsAwarded:pts};
    if(pts){s.points+=pts;s.history.push({label:'Day '+c.key.slice(3)+' 수학 ('+oks+'/'+items.length+')',points:pts,date:today()})}
  }else{if(!r||!r.completed){currentMath=null;return renderSMath()}r.retries=r.retries||{};
    c.idxs.forEach((ix,k)=>{const ok=c.sel[k]===set[ix].ans,p=r.retries[ix]||{tries:0};if(ok){oks++;if(!p.correct)pts+=MATH_RETRY_POINTS}r.retries[ix]={selected:c.sel[k],correct:ok||!!p.correct,tries:p.tries+1}});
    if(pts){r.retryPoints=(r.retryPoints||0)+pts;s.points+=pts;s.history.push({label:'Day '+c.key.slice(3)+' 수학 유사문제',points:pts,date:today()})}}
  await dbSave();const k=c.key,w=c.which,tot=c.idxs.length;currentMath=null;$('studentPoints').textContent=s.points;toast('📐 '+oks+'/'+tot+' 정답'+(pts?' +'+pts+'P':''));
  mathLock=true;const r2=s.mathResults[k],can=wrongIdx(r2,mconf(k)).length&&mconf(k).retryOpen;
  $('s-math').innerHTML=`<div class="auction-card" style="text-align:center"><div class="ac-title">Day ${k.slice(3)} ${w==='r'?'유사 문제':'수학'} 결과</div>
  <div style="font-size:46px;font-weight:900;color:${oks===tot?'var(--green)':'var(--red2)'};margin:14px 0">${oks}/${tot}</div>${pts?`<div class="green" style="font-weight:700">+${pts}P 적립됨</div>`:''}
  ${w==='q'&&oks<tot?`<div class="small" style="margin-top:6px">${can?'비슷한 유형의 문제로 다시 도전해 보세요.':'🔒 선생님이 유사문제를 열면 다시 풀 수 있어요.'}</div>`:''}
  <div style="display:flex;flex-direction:column;gap:8px;margin-top:16px"><button class="btn btn-primary" onclick="showMathSol('${k}','${w}')">해설 보기</button>${can?`<button class="btn btn-success" onclick="startMathRetry('${k}')">유사 문제 ${w==='r'?'다시 ':''}풀기</button>`:''}<button class="btn" onclick="renderSMath()">목록으로</button></div></div>`}
async function showMathSol(k,which){const r=getMe().mathResults[k];if(!r||!r.completed)return renderSMath();mathLock=true;$('s-math').innerHTML='<div class="empty">불러오는 중…</div>';let p;
  try{p=await mathFetch(k)}catch(e){alert('불러오지 못했습니다: '+e.message);return renderSMath()}
  const set=which==='q'?p.qs:p.rs,it=mItems(r);let h='';
  set.forEach((d,i)=>{const mine=which==='q'?(it[i]||{}).selected:(mRetry(r,i)||{}).selected;if(which==='r'&&mine==null)return;const ok=mine===d.ans;
    h+=`<div class="q-block"><div class="flex"><b>${i+1}번</b><span class="badge ${ok?'badge-winner':'badge-ended'}">${ok?'정답':'오답'}</span></div>${fig(d.img)}
    <div class="small ${ok?'green':'red'}">내가 고른 답: ${mine?CIRCLED[mine-1]:'-'}</div><div class="small green" style="font-weight:700">정답: ${CIRCLED[d.ans-1]}</div>
    <div class="small" style="margin:10px 0 4px;font-weight:700">해설</div>${d.solImg?fig(d.solImg):'<div class="small">등록된 해설이 없습니다. 선생님께 물어보세요.</div>'}</div>`});
  $('s-math').innerHTML=`<div class="auction-card"><div class="ac-title" style="margin-bottom:10px">Day ${k.slice(3)} ${which==='r'?'유사 문제 ':''}해설</div>${h||'<div class="empty">표시할 문제가 없어요</div>'}<button class="btn btn-primary btn-full" onclick="renderSMath()">목록으로</button></div>`}
function renderAMath(){if(mathEdit)return;const el=$('adminMathList');if(!el)return;let h='';
  for(let i=1;i<=MATH_DAYS;i++){const k='day'+i,c=mconf(k),done=DATA.students.filter(s=>s.mathResults[k]&&s.mathResults[k].completed);
    let tq=0,ok=0;done.forEach(s=>{const it=mItems(s.mathResults[k]);tq+=it.length;ok+=it.filter(x=>x.correct).length});
    h+=`<div class="admin-card"><div class="flex" style="align-items:flex-start"><div><b>Day ${i} 수학</b><div class="small" style="margin-top:4px">${c.has?`문제 ${nqOf(c)}개 · 유사문제 ${nrOf(c)}개`:'문제 미등록'}</div><div class="small">응시 ${done.length}/${DATA.students.length}명 · 정답 ${ok}/${tq}문항</div></div>
    <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end"><span class="badge ${c.open?'badge-active':'badge-ended'}">${c.open?'열림':'닫힘'}</span>${c.retryHas?`<span class="badge ${c.retryOpen?'badge-active':'badge-ended'}">유사 ${c.retryOpen?'열림':'닫힘'}</span>`:''}</div></div>
    <div style="display:flex;gap:8px;margin-top:10px"><button class="btn btn-primary btn-sm" style="flex:1" onclick="openMathEditor('${k}')">${c.has?'문제 편집':'문제 등록'}</button><button class="btn ${c.open?'btn-danger':'btn-success'} btn-sm" style="flex:1" onclick="toggleMath('${k}',0)">${c.open?'닫기':'열기'}</button></div>
    ${c.retryHas?`<div style="margin-top:8px"><button class="btn ${c.retryOpen?'btn-danger':'btn-success'} btn-sm btn-full" onclick="toggleMath('${k}',1)">유사문제 ${c.retryOpen?'닫기':'열기'}</button></div>`:''}</div>`}
  el.innerHTML=h}
async function toggleMath(k,retry){await pull();const c=DATA.mathTests[k]||(DATA.mathTests[k]={open:false});
  if(retry){if(!c.retryHas){toast('⚠️ 먼저 유사 문제를 등록해 주세요');return renderAMath()}c.retryOpen=!c.retryOpen}else{if(!c.has){toast('⚠️ 먼저 문제 사진을 등록해 주세요');return renderAMath()}c.open=!c.open}
  await dbSave();renderAMath();renderAMScore();toast('수학 Day '+k.slice(3)+(retry?' 유사 ':' ')+((retry?c.retryOpen:c.open)?'열림':'닫힘'))}
const blank=()=>({img:null,ans:null,solImg:null});
async function openMathEditor(k){const c=mconf(k);mathEdit={key:k,qs:[blank()],rs:[]};
  if(c.has){try{const p=await mathFetch(k,true);if(p.qs.length)mathEdit.qs=p.qs.map(x=>({img:x.img||null,ans:x.ans||null,solImg:x.solImg||null}));mathEdit.rs=p.rs.map(x=>({img:x.img||null,ans:x.ans||null,solImg:x.solImg||null}))}catch(e){mathEdit=null;return alert('문제를 불러오지 못했습니다: '+e.message)}}
  $('adminMathList').style.display='none';$('adminMathIntro').style.display='none';renderMathEditor();window.scrollTo(0,0)}
function closeMathEditor(){mathEdit=null;$('adminMathEditor').innerHTML='';$('adminMathList').style.display='';$('adminMathIntro').style.display='';renderAMath()}
function setN(g,n){const a=mathEdit[g];while(a.length<n)a.push(blank());a.length=n;if(g==='qs'&&mathEdit.rs.length>n)mathEdit.rs.length=n;renderMathEditor()}
const mathClear=(g,i,f)=>{mathEdit[g][i][f]=null;renderMathEditor()};
const mathSetAns=(g,i,n)=>{mathEdit[g][i].ans=n;renderMathEditor()};
function slot(g,i,f,label,opt){const im=mathEdit[g][i][f];return`<div class="field"><label>${label}</label><div class="math-slot">${im?`<img src="${im}" onclick="mathZoom(this.src)">`:'<div class="math-slot-empty">사진 없음</div>'}
  <div class="math-slot-btns"><button class="btn btn-sm btn-primary" onclick="mathPick('${g}',${i},'${f}')">${im?'사진 바꾸기':'사진 선택'}</button>${crop.last?`<button class="btn btn-sm btn-ghost" onclick="mathPick('${g}',${i},'${f}',1)">직전 사진에서 또 자르기</button>`:''}${im&&opt?`<button class="btn btn-sm btn-danger" onclick="mathClear('${g}',${i},'${f}')">삭제</button>`:''}</div></div></div>`}
function block(g,i,title){const it=mathEdit[g][i];return`<div class="q-block"><b>${title}</b><div style="height:8px"></div>${slot(g,i,'img','문제 사진 (보기 ①~⑤ 포함)',false)}
  <div class="field"><label>정답</label><div class="math-ans">${[1,2,3,4,5].map(n=>`<button class="btn${it.ans===n?' selected':''}" onclick="mathSetAns('${g}',${i},${n})">${CIRCLED[n-1]}</button>`).join('')}</div></div>${slot(g,i,'solImg','해설 사진 (선택)',true)}</div>`}
function renderMathEditor(){const e=mathEdit,el=$('adminMathEditor');if(!e)return;const nq=e.qs.length,nr=e.rs.length,c=mconf(e.key);
  const cnt=(g,max,min,cur)=>`<div class="cnt">${Array.from({length:max-min+1},(_,x)=>x+min).map(n=>`<button class="btn${n===cur?' selected':''}" onclick="setN('${g}',${n})">${n}</button>`).join('')}</div>`;
  el.innerHTML=`<div class="flex" style="margin-bottom:12px"><b style="font-size:17px">Day ${e.key.slice(3)} 문제 등록</b><button class="btn btn-sm" onclick="closeMathEditor()">목록으로</button></div>
  <div class="admin-section"><b>① 원본 문제</b><div class="small" style="margin-top:4px">하루에 풀 문제 수</div>${cnt('qs',MAX_Q,1,nq)}${e.qs.map((_,i)=>block('qs',i,(i+1)+'번 문제')).join('')}</div>
  <div class="admin-section"><b>② 유사 문제 (선택)</b><div class="small" style="margin-top:4px">유사문제 수 · n번 유사문제는 n번 문제를 틀린 학생에게만 보입니다</div>${cnt('rs',nq,0,nr)}${e.rs.map((_,i)=>block('rs',i,(i+1)+'번 유사 문제')).join('')||'<div class="small">유사문제 없음</div>'}</div>
  <div class="small" style="text-align:center;margin:10px 0">저장하면 이 Day는 자동으로 닫힙니다. 학생에게 보이려면 목록에서 "열기"를 눌러주세요.</div>
  <button class="btn btn-primary btn-full" onclick="saveMathEdit()">저장하기</button>${c.has?'<button class="btn btn-danger btn-full" style="margin-top:10px" onclick="deleteMathProblem()">이 Day 문제 삭제</button>':''}`}
async function saveMathEdit(){const e=mathEdit;
  for(let i=0;i<e.qs.length;i++){if(!e.qs[i].img)return alert((i+1)+'번 문제 사진을 선택해 주세요.');if(!e.qs[i].ans)return alert((i+1)+'번 문제의 정답을 골라 주세요.')}
  for(let i=0;i<e.rs.length;i++){if(!e.rs[i].img)return alert((i+1)+'번 유사문제 사진을 선택해 주세요.');if(!e.rs[i].ans)return alert((i+1)+'번 유사문제의 정답을 골라 주세요.')}
  const done=DATA.students.filter(s=>s.mathResults[e.key]&&s.mathResults[e.key].completed).length;if(done&&!confirm('이미 '+done+'명이 응시했습니다. 문제를 바꿔도 기존 채점 결과는 그대로 남습니다. 저장할까요?'))return;
  const cl=a=>a.map(x=>({img:x.img,ans:x.ans,solImg:x.solImg||null}));
  try{await mathPut(e.key,{qs:cl(e.qs),rs:cl(e.rs)})}catch(err){return alert('사진 저장 실패: '+err.message+'\n(Firebase 규칙에서 mathProblems 경로 읽기/쓰기가 허용되어 있는지 확인해 주세요)')}
  await pull();const c=DATA.mathTests[e.key]||(DATA.mathTests[e.key]={open:false});Object.assign(c,{has:true,nq:e.qs.length,nr:e.rs.length,retryHas:e.rs.length>0,open:false,retryOpen:false});
  await dbSave();toast('💾 Day '+e.key.slice(3)+' 저장됨 (닫힘 상태)');closeMathEditor()}
async function deleteMathProblem(){const k=mathEdit.key;if(!confirm('Day '+k.slice(3)+' 문제 사진을 삭제할까요? (학생 성적 기록은 남습니다)'))return;
  try{await mathPut(k,null)}catch(err){return alert('삭제 실패: '+err.message)}await pull();const c=DATA.mathTests[k];if(c)Object.assign(c,{has:false,retryHas:false,open:false,retryOpen:false});await dbSave();closeMathEditor()}
function mathPick(g,i,f,again){crop.t={g,i,f};if(again&&crop.last)return showCropper(crop.last);const inp=$('mathFile');inp.value='';
  inp.onchange=()=>{if(inp.files&&inp.files[0])openCropper(inp.files[0])};inp.click()}
function openCropper(file){const url=URL.createObjectURL(file),im=new Image();im.onload=()=>{URL.revokeObjectURL(url);crop.last=im;showCropper(im)};im.onerror=()=>alert('이미지를 열 수 없습니다. 다른 사진으로 시도해 주세요.');im.src=url}
function showCropper(im){crop.img=im;crop.sel=null;crop.start=null;const mw=Math.min(innerWidth-64,720),mh=innerHeight*.58;crop.scale=Math.min(mw/im.naturalWidth,mh/im.naturalHeight,1);
  const c=$('cropCanvas');c.width=Math.round(im.naturalWidth*crop.scale);c.height=Math.round(im.naturalHeight*crop.scale);drawCrop();$('cropModal').style.display='flex'}
function closeCropper(){$('cropModal').style.display='none';crop.img=null}
function drawCrop(){const c=$('cropCanvas'),x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);x.drawImage(crop.img,0,0,c.width,c.height);const s=crop.sel;
  if(s&&s.w>0&&s.h>0){x.fillStyle='rgba(0,0,0,.55)';x.fillRect(0,0,c.width,s.y);x.fillRect(0,s.y+s.h,c.width,c.height-s.y-s.h);x.fillRect(0,s.y,s.x,s.h);x.fillRect(s.x+s.w,s.y,c.width-s.x-s.w,s.h);x.strokeStyle='#e50914';x.lineWidth=2;x.strokeRect(s.x,s.y,s.w,s.h)}
  $('cropUseBtn').disabled=!(s&&s.w>8&&s.h>8)}
(function(){const c=$('cropCanvas');const pos=e=>{const r=c.getBoundingClientRect();return{x:Math.max(0,Math.min(c.width,(e.clientX-r.left)*c.width/r.width)),y:Math.max(0,Math.min(c.height,(e.clientY-r.top)*c.height/r.height))}};
  c.addEventListener('pointerdown',e=>{c.setPointerCapture(e.pointerId);crop.start=pos(e);crop.sel={x:crop.start.x,y:crop.start.y,w:0,h:0};drawCrop()});
  c.addEventListener('pointermove',e=>{if(!crop.start)return;const p=pos(e);crop.sel={x:Math.min(p.x,crop.start.x),y:Math.min(p.y,crop.start.y),w:Math.abs(p.x-crop.start.x),h:Math.abs(p.y-crop.start.y)};drawCrop()});
  const end=()=>{crop.start=null};c.addEventListener('pointerup',end);c.addEventListener('pointercancel',end)})();
function finishCrop(useSel){const im=crop.img;let sx=0,sy=0,sw=im.naturalWidth,sh=im.naturalHeight;
  if(useSel&&crop.sel&&crop.sel.w>8&&crop.sel.h>8){sx=crop.sel.x/crop.scale;sy=crop.sel.y/crop.scale;sw=crop.sel.w/crop.scale;sh=crop.sel.h/crop.scale}
  const ow=Math.min(Math.round(sw),900),oh=Math.round(sh*ow/sw),o=document.createElement('canvas');o.width=ow;o.height=oh;const x=o.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,ow,oh);x.drawImage(im,sx,sy,sw,sh,0,0,ow,oh);
  const t=crop.t;mathEdit[t.g][t.i][t.f]=o.toDataURL('image/jpeg',.78);$('cropModal').style.display='none';renderMathEditor()}
function renderAMScore(){const k=dayOptions('mathScoreDay'),c=mconf(k);
  const rows=DATA.students.map(s=>{const r=s.mathResults[k];if(!(r&&r.completed))return`<tr><td>${esc(s.name)}</td><td class="small" colspan="4">미응시</td></tr>`;
    const it=mItems(r),ok=it.filter(x=>x.correct).length,rt=it.map((x,i)=>x.correct?'-':(mRetry(r,i)?(mRetry(r,i).correct?'<span class="green">○</span>':'<span class="red">✕</span>'):'<span class="small">미</span>')).join(' ');
    return`<tr><td>${esc(s.name)}</td><td>${it.map(x=>x.selected?CIRCLED[x.selected-1]:'-').join(' ')}</td><td><span class="badge ${ok===it.length?'badge-winner':'badge-ended'}">${ok}/${it.length}</span></td><td>${rt}</td><td class="small">${esc(r.date)}</td></tr>`}).join('');
  $('adminMathScoreList').innerHTML=`<div class="small" style="margin:4px 0 10px">Day ${k.slice(3)} · 원본 ${c.open?'열림':'닫힘'}${c.retryHas?' · 유사 '+(c.retryOpen?'열림':'닫힘'):''}</div><div style="overflow-x:auto"><table class="table"><thead><tr><th>이름</th><th>선택</th><th>결과</th><th>유사(○/✕)</th><th>응시일</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  $('adminMathScoreSummary').innerHTML=`<div style="overflow-x:auto"><table class="table"><thead><tr><th>이름</th><th>응시</th><th>정답</th><th>누적 P</th></tr></thead><tbody>${DATA.students.map(s=>{let n=0,q=0,ok=0,p=0;Object.keys(s.mathResults).forEach(x=>{const r=s.mathResults[x];if(r&&r.completed){n++;const it=mItems(r);q+=it.length;ok+=it.filter(y=>y.correct).length;p+=(r.pointsAwarded||0)+(r.retryPoints||0)}});return`<tr><td>${esc(s.name)}</td><td>${n}일</td><td>${ok}/${q}</td><td class="green">${p}P</td></tr>`}).join('')}</tbody></table></div>`}
