/* 관리자: 학생·포인트·상점·주문·공지 */
function renderAdmin(){renderMigrate();renderStudents();renderAShop();renderAAuc();renderASeat();renderAVocab();renderAVScore();renderAMath();renderAMScore();renderOrders();renderNotices()}
function atab(id,el){document.querySelectorAll('#adminMain .tab,#adminMain .panel').forEach(e=>e.classList.remove('active'));el.classList.add('active');$('a-'+id).classList.add('active');
  if(id==='vocabscore')renderAVScore();if(id==='seat')renderASeat();
  if(id==='math'&&!mathEdit)pull().then(renderAMath);if(id==='mathscore')pull().then(renderAMScore);window.scrollTo(0,0)}
const BAD_KEY=/[.#$\[\]\/]/;
const uidOf=sid=>Object.keys(DATA.uids||{}).find(u=>DATA.uids[u]===sid);
async function addStudent(){const name=$('newName').value.trim(),id=$('newId').value.trim(),pw=$('newPw').value.trim();if(!name||!id||!pw)return alert('이름, 아이디, 비밀번호를 모두 입력하세요.');
  if(BAD_KEY.test(id)||id===ADMIN_LOGIN_ID)return alert('아이디에는 . # $ [ ] / 문자를 쓸 수 없고, "'+ADMIN_LOGIN_ID+'"는 사용할 수 없습니다.');
  if(pw.length<4)return alert('비밀번호는 4자 이상이어야 합니다.');
  await pull();const ex=DATA.students.find(s=>s.id===id);
  if(ex&&!confirm('"'+id+'"('+ex.name+') 학생이 이미 있습니다.\n이 학생의 로그인 계정을 새 비밀번호로 다시 연결할까요? (포인트·기록은 그대로)\n\n※ 기존 로그인 계정이 남아 있으면 먼저 Firebase 콘솔 > Authentication에서 '+loginEmail(id)+' 사용자를 삭제해야 합니다.'))return;
  let uid;try{uid=(await authSignUp(id,pw)).localId}catch(e){return alert('계정 생성 실패: '+(e.code==='EMAIL_EXISTS'?'이미 로그인 계정이 있는 아이디입니다.\nFirebase 콘솔 > Authentication에서 '+loginEmail(id)+' 사용자를 삭제한 뒤 다시 시도하세요.':authErr(e.code)))}
  const upd={},old=uidOf(id);if(old)upd['uids/'+old]=null;upd['uids/'+uid]=id;
  if(!ex)upd[SP(id)]={id,name,points:0};
  if(!await dbUpdate(upd))return;['newName','newId','newPw'].forEach(i=>$(i).value='');toast(ex?'🔑 '+ex.name+' 계정 다시 연결':'✅ '+name+' 추가');await pull();renderStudents()}
async function deleteStudent(sid){await pull();const s=DATA.students.find(x=>x.id===sid);if(!s||!confirm(s.name+' 학생을 삭제하시겠습니까?\n(포인트 내역도 모두 삭제됩니다)'))return;
  const upd={[SP(sid)]:null},u=uidOf(sid);if(u)upd['uids/'+u]=null;
  if(DATA.seats.some(x=>x.sid===sid)){DATA.seats.forEach(x=>{if(x.sid===sid)x.sid=''});upd['pub/seats']=DATA.seats}
  if(!await dbUpdate(upd))return;toast('🗑️ 삭제 완료 (Firebase 콘솔 > Authentication에서 '+loginEmail(sid)+' 계정도 지우면 깔끔해요)');await pull();renderStudents();renderASeat()}
function renderStudents(){$('studentList').innerHTML=DATA.students.map(s=>`<div class="student-card flex"><div><b>${esc(s.name)}</b><div class="small">ID: ${esc(s.id)}${uidOf(s.id)?'':' · <span class="red">로그인 계정 없음</span>'}</div></div><div style="display:flex;align-items:center;gap:10px"><b class="green">${s.points}P</b><button class="btn btn-danger btn-sm" onclick="deleteStudent('${esc(s.id)}')">삭제</button></div></div>`).join('')||'<div class="empty">등록된 학생이 없습니다.</div>';
  const o=DATA.students.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');$('giveStudent').innerHTML='<option value="__all">👥 전체 학생</option>'+o;
  const hs=$('historyStudent'),pv=hs.value;hs.innerHTML=o;if(pv)hs.value=pv;renderPH()}
async function givePoint(){const sid=$('giveStudent').value,amt=parseInt($('giveAmt').value),reason=$('giveReason').value.trim()||'관리자 지급';if(!sid||isNaN(amt)||!amt)return alert('학생과 포인트를 입력하세요.');
  await pull();const t=sid==='__all'?DATA.students:DATA.students.filter(x=>x.id===sid),upd={};
  t.forEach(s=>{s.points+=amt;upd[SP(s.id)+'/points']=s.points;addHist(s,{label:reason,points:amt,date:today()},upd)});
  if(!await dbUpdate(upd))return;$('giveAmt').value='';$('giveReason').value='';toast('✅ '+t.length+'명에게 '+amt+'P');renderAdmin()}
function renderPH(){const s=DATA.students.find(x=>x.id===$('historyStudent').value);$('pointHistory').innerHTML=historyRows(s?s.history:[])}
async function addItem(){const name=$('itemName').value.trim(),price=parseInt($('itemPrice').value);if(!name||isNaN(price)||price<=0)return alert('상품명과 가격을 입력하세요.');
  const id=Date.now();if(!await dbUpdate({['pub/items/i'+id]:{id,name,price}}))return;await pull();$('itemName').value='';$('itemPrice').value='';renderAdmin()}
const renderAShop=()=>{$('adminShopList').innerHTML=DATA.items.length?DATA.items.map(i=>`<div class="shop-item flex"><div>${esc(i.name)}</div><div style="display:flex;gap:8px;align-items:center">${i.price}P<button class="btn btn-danger btn-sm" onclick="delItem(${+i.id})">삭제</button></div></div>`).join(''):'<div class="empty">등록된 상품이 없습니다.</div>'};
async function delItem(id){if(!confirm('이 상품을 삭제할까요?'))return;if(!await dbUpdate({['pub/items/i'+id]:null}))return;await pull();renderAShop()}
function renderOrders(){const l=DATA.orders.slice().reverse();$('orderList').innerHTML=l.length?l.map(o=>`<div class="order-card flex"><div><div>${esc(o.studentName)}</div><div class="small">${esc(o.itemName)} · ${new Date(+o.id).toLocaleDateString('ko-KR')}</div></div><button class="btn btn-success btn-sm" onclick="doneOrder(${+o.id})">처리 완료</button></div>`).join(''):'<div class="empty">주문 내역이 없습니다.</div>'}
async function doneOrder(id){if(!await dbUpdate({['orders/o'+id]:null}))return;await pull();renderOrders()}
function renderNotices(){$('noticeList').innerHTML=DATA.notices.length?DATA.notices.slice().reverse().map(n=>`<div class="notice flex"><div><div>${esc(n.text)}</div><div class="small">${esc(n.date)}</div></div><button class="btn btn-danger btn-sm" onclick="delNotice(${+n.id})">삭제</button></div>`).join(''):'<div class="empty">등록된 공지가 없습니다.</div>'}
async function addNotice(){const t=$('noticeText').value.trim();if(!t)return;const id=Date.now();if(!await dbUpdate({['pub/notices/n'+id]:{id,text:t,date:today()}}))return;await pull();$('noticeText').value='';renderNotices();toast('📢 공지 등록')}
async function delNotice(id){if(!await dbUpdate({['pub/notices/n'+id]:null}))return;await pull();renderNotices()}

/* ───── 기존 데이터(data) → 새 구조(pub) 1회 이전 ─────
   예전에는 모든 데이터가 /data 하나에 비밀번호와 함께 들어 있었어요.
   학생마다 Firebase 로그인 계정을 만들고, 비밀번호를 뺀 데이터를 /pub 으로 옮깁니다. */
let legacyInfo=null;
async function renderMigrate(){const box=$('migrateBox');if(!box)return;
  /* 예전 데이터에 아직 비밀번호가 남아 있는 학생 수 = 이전이 끝나지 않은 학생 */
  if(legacyInfo===null){try{const d=await api('data/students','GET');legacyInfo=d?arr(d).filter(s=>s&&s.pw!=null&&s.pw!=='').length:0}catch(e){legacyInfo=0}}
  const done=DATA.students.length>0;
  if(!legacyInfo){box.innerHTML='';return}
  box.innerHTML=`<div class="admin-section" style="border:1px solid var(--red2)"><b>🔐 기존 데이터 이전</b><div class="small" style="margin:6px 0 10px">
  예전 방식(/data)으로 비밀번호와 함께 저장된 학생 ${legacyInfo}명이 있어요. ${done?'이미 이전한 학생은 건너뛰고, 아직 계정이 없는 학생만 다시 처리합니다.':'아래 버튼을 누르면 학생마다 로그인 계정을 만들고, 비밀번호를 뺀 데이터를 새 구조로 옮깁니다.'}
  기존 아이디/비밀번호는 그대로 쓸 수 있어요. 끝나면 예전 데이터의 비밀번호는 지워집니다.</div>
  <button class="btn btn-primary btn-full" id="migBtn" onclick="migrateLegacy()">${done?'남은 학생 다시 이전':'기존 데이터 이전 시작'}</button><div id="migLog" class="small" style="margin-top:8px;white-space:pre-wrap"></div></div>`}
async function migrateLegacy(){if(!confirm('기존 데이터를 새 구조로 이전할까요?\n(학생 수에 따라 1~2분 걸릴 수 있어요. 창을 닫지 마세요)'))return;
  const btn=$('migBtn'),log=$('migLog'),say=m=>{log.textContent+=m+'\n'};btn.disabled=true;log.textContent='';
  let L;try{L=await api('data')}catch(e){btn.disabled=false;return say('❌ 예전 데이터를 읽지 못했어요: '+e.message)}
  if(!L){btn.disabled=false;return say('예전 데이터가 없습니다.')}
  await pull();const firstRun=DATA.students.length===0;
  const students=arr(L.students),upd={},pwClear={},fails=[];
  const curUids=DATA.uids||{},hasUid=sid=>Object.values(curUids).includes(sid);
  for(let i=0;i<students.length;i++){const s=students[i],idx=Array.isArray(L.students)?L.students.indexOf(s):Object.keys(L.students)[i];
    if(!s||!s.id){continue}const sid=String(s.id);
    if(BAD_KEY.test(sid)){fails.push(sid+' (아이디에 쓸 수 없는 문자)');continue}
    if(!hasUid(sid)){
      if(s.pw==null||s.pw===''){fails.push(sid+' (비밀번호 없음)');continue}
      let uid=null;try{uid=(await authSignUp(sid,s.pw)).localId}
      catch(e){if(e.code==='EMAIL_EXISTS'){try{uid=(await authSignIn(sid,s.pw)).localId}catch(e2){}}if(!uid){fails.push(sid+' ('+authErr(e.code)+')');continue}}
      upd['uids/'+uid]=sid;say('✅ '+s.name+' ('+sid+') 계정 준비');
    }
    if(firstRun||!DATA.students.some(x=>x.id===sid)){
      const h={};arr(s.history).forEach((x,j)=>{h['h'+String(j).padStart(13,'0')]=x});
      upd[SP(sid)]={id:sid,name:s.name||sid,points:+s.points||0,lastCheck:s.lastCheck||null,history:h,vocabResults:s.vocabResults||{},mathResults:s.mathResults||{}};
    }
    if(s.pw!=null)pwClear['data/students/'+idx+'/pw']=null;
    await new Promise(r=>setTimeout(r,150))}
  if(firstRun){
    const obj=(a,p)=>{const o={};arr(a).forEach(x=>{if(x&&x.id!=null)o[p+x.id]=x});return o};
    upd['pub/items']=obj(L.items,'i');upd['pub/notices']=obj(L.notices,'n');
    const ord={};arr(L.orders).forEach(o=>{if(o&&o.id!=null){const st=students.find(x=>x&&x.name===o.studentName);ord['o'+o.id]=Object.assign({sid:st?String(st.id):''},o)}});upd['orders']=ord;
    const auc=Object.assign({},L.auctions||{});if(L.auction&&L.auction.itemName&&!auc.legacy)auc.legacy=Object.assign({},L.auction,{id:'legacy'});upd['pub/auctions']=auc;
    upd['pub/seats']=arr(L.seats).length?arr(L.seats):defaultSeats();
    upd['pub/vocabTests']=L.vocabTests||{};upd['pub/mathTests']=L.mathTests||{};
  }
  say('💾 저장 중…');if(!await dbUpdate(upd)){btn.disabled=false;return say('❌ 저장 실패. 다시 시도해 주세요.')}
  if(Object.keys(pwClear).length&&!fails.length){if(await dbUpdate(pwClear))say('🧹 예전 데이터의 비밀번호를 지웠어요')}
  say(fails.length?'⚠️ 처리하지 못한 학생 '+fails.length+'명:\n- '+fails.join('\n- ')+'\n(이 학생들은 "학생 추가"에서 같은 아이디로 다시 등록하면 기록이 연결돼요)':'🎉 이전 완료!');
  legacyInfo=fails.length?legacyInfo:0;await pull();renderAdmin()}
