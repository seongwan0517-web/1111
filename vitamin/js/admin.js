/* 관리자: 학생·포인트·상점·주문·공지 */
function renderAdmin(){renderStudents();renderAShop();renderAAuc();renderASeat();renderAVocab();renderAVScore();renderAMath();renderAMScore();renderOrders();renderNotices()}
function atab(id,el){document.querySelectorAll('#adminMain .tab,#adminMain .panel').forEach(e=>e.classList.remove('active'));el.classList.add('active');$('a-'+id).classList.add('active');
  if(id==='vocabscore')renderAVScore();if(id==='seat')renderASeat();
  if(id==='math'&&!mathEdit)pull().then(renderAMath);if(id==='mathscore')pull().then(renderAMScore)}
async function addStudent(){const name=$('newName').value.trim(),id=$('newId').value.trim(),pw=$('newPw').value.trim();if(!name||!id||!pw)return alert('이름, 아이디, 비밀번호를 모두 입력하세요.');
  await pull();if(DATA.students.find(s=>s.id===id))return alert('이미 사용 중인 아이디입니다.');
  DATA.students.push({id,pw,name,points:0,history:[],vocabResults:{},mathResults:{}});await dbSave();['newName','newId','newPw'].forEach(i=>$(i).value='');toast('✅ '+name+' 추가');renderStudents()}
async function deleteStudent(sid){await pull();const s=DATA.students.find(x=>x.id===sid);if(!s||!confirm(s.name+' 학생을 삭제하시겠습니까?\n(포인트 내역도 모두 삭제됩니다)'))return;
  DATA.students=DATA.students.filter(x=>x.id!==sid);DATA.seats.forEach(x=>{if(x.sid===sid)x.sid=''});await dbSave();toast('🗑️ 삭제 완료');renderStudents();renderASeat()}
function renderStudents(){$('studentList').innerHTML=DATA.students.map(s=>`<div class="student-card flex"><div><b>${esc(s.name)}</b><div class="small">ID: ${esc(s.id)} · PW: ${esc(s.pw)}</div></div><div style="display:flex;align-items:center;gap:10px"><b class="green">${s.points}P</b><button class="btn btn-danger btn-sm" onclick="deleteStudent('${s.id}')">삭제</button></div></div>`).join('')||'<div class="empty">등록된 학생이 없습니다.</div>';
  const o=DATA.students.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');$('giveStudent').innerHTML='<option value="__all">👥 전체 학생</option>'+o;
  const hs=$('historyStudent'),pv=hs.value;hs.innerHTML=o;if(pv)hs.value=pv;renderPH()}
async function givePoint(){const sid=$('giveStudent').value,amt=parseInt($('giveAmt').value),reason=$('giveReason').value.trim()||'관리자 지급';if(!sid||isNaN(amt)||!amt)return alert('학생과 포인트를 입력하세요.');
  await pull();const t=sid==='__all'?DATA.students:DATA.students.filter(x=>x.id===sid);t.forEach(s=>{s.points+=amt;s.history.push({label:reason,points:amt,date:today()})});await dbSave();$('giveAmt').value='';$('giveReason').value='';toast('✅ '+t.length+'명에게 '+amt+'P');renderAdmin()}
function renderPH(){const s=DATA.students.find(x=>x.id===$('historyStudent').value);$('pointHistory').innerHTML=historyRows(s?s.history:[])}
async function addItem(){const name=$('itemName').value.trim(),price=parseInt($('itemPrice').value);if(!name||isNaN(price)||price<=0)return alert('상품명과 가격을 입력하세요.');
  await pull();DATA.items.push({id:Date.now(),name,price});await dbSave();$('itemName').value='';$('itemPrice').value='';renderAdmin()}
const renderAShop=()=>{$('adminShopList').innerHTML=DATA.items.length?DATA.items.map(i=>`<div class="shop-item flex"><div>${esc(i.name)}</div><div>${i.price}P</div></div>`).join(''):'<div class="empty">등록된 상품이 없습니다.</div>'};
function renderOrders(){$('orderList').innerHTML=DATA.orders.length?DATA.orders.map(o=>`<div class="order-card flex"><div><div>${esc(o.studentName)}</div><div class="small">${esc(o.itemName)} · ${new Date(o.id).toLocaleDateString('ko-KR')}</div></div><button class="btn btn-success btn-sm" onclick="doneOrder(${o.id})">처리 완료</button></div>`).join(''):'<div class="empty">주문 내역이 없습니다.</div>'}
async function doneOrder(id){await pull();DATA.orders=DATA.orders.filter(o=>o.id!==id);await dbSave();renderOrders()}
function renderNotices(){$('noticeList').innerHTML=DATA.notices.length?DATA.notices.slice().reverse().map(n=>`<div class="notice flex"><div><div>${esc(n.text)}</div><div class="small">${esc(n.date)}</div></div><button class="btn btn-danger btn-sm" onclick="delNotice(${n.id})">삭제</button></div>`).join(''):'<div class="empty">등록된 공지가 없습니다.</div>'}
async function addNotice(){const t=$('noticeText').value.trim();if(!t)return;await pull();DATA.notices.push({id:Date.now(),text:t,date:today()});await dbSave();$('noticeText').value='';renderNotices();toast('📢 공지 등록')}
async function delNotice(id){await pull();DATA.notices=DATA.notices.filter(n=>n.id!==id);await dbSave();renderNotices()}
