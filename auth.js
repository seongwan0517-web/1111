/* 로그인 / 로그아웃 (Firebase Authentication) */
function loginMsg(m,html){const e=$('loginErr');e.style.display=m?'block':'none';e[html?'innerHTML':'textContent']=m||''}
async function login(){const id=$('loginId').value.trim(),pw=$('loginPw').value;loginMsg('');
  if(!id||!pw)return loginMsg('아이디와 비밀번호를 입력하세요.');
  try{setAuth(await authSignIn(id,pw))}
  catch(e){AUTH=null;
    if(id===ADMIN_LOGIN_ID&&e.code==='INVALID_LOGIN_CREDENTIALS')return loginMsg(authErr(e.code)+'<br><button class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="createAdmin()">관리자 계정이 아직 없다면: 이 비밀번호로 만들기</button>',true);
    return loginMsg(authErr(e.code))}
  await afterSignIn()}
async function afterSignIn(){let isAdmin=false,sid=null;
  try{isAdmin=(await api('admins/'+AUTH.uid))===true;if(!isAdmin)sid=await api('uids/'+AUTH.uid)}
  catch(e){AUTH=null;return loginMsg('데이터베이스 연결 실패: '+e.message)}
  if(isAdmin){cu={role:'admin'};if(!await dbLoad())return;$('loginCard').style.display='none';$('adminMain').classList.add('on');renderAdmin();return}
  if(!sid){const uid=AUTH.uid;AUTH=null;
    if($('loginId').value.trim()===ADMIN_LOGIN_ID)return loginMsg('관리자 계정은 만들어졌지만 아직 관리자 권한이 없습니다.<br>계정 UID: <code style="user-select:all">'+esc(uid)+'</code><br>Firebase 콘솔의 Realtime Database에서 <b>admins/'+esc(uid)+'</b> 값을 <b>true</b>로 설정해 주세요.',true);
    return loginMsg('등록되지 않았거나 삭제된 계정입니다. 선생님께 문의하세요.')}
  cu={role:'student',id:sid};if(!await dbLoad())return;
  if(!getMe()){cu=null;AUTH=null;return loginMsg('학생 정보를 찾을 수 없습니다. 선생님께 문의하세요.')}
  $('loginCard').style.display='none';$('studentMain').classList.add('on');renderStudent();startPoll()}
async function createAdmin(){const pw=$('loginPw').value;
  if(pw.length<8)return loginMsg('관리자 비밀번호는 8자 이상으로 정해 주세요.');
  if(!await uiConfirm('입력한 비밀번호로 관리자 계정을 만들까요?\n이 비밀번호는 꼭 기억해 두세요.'))return;
  try{setAuth(await authSignUp(ADMIN_LOGIN_ID,pw))}catch(e){return loginMsg(e.code==='EMAIL_EXISTS'?'관리자 계정이 이미 있습니다. 비밀번호를 확인하세요.':authErr(e.code))}
  await afterSignIn()}
/* 학생: 내 비밀번호 바꾸기 */
async function changeMyPw(){
  const v=await uiForm({title:'비밀번호 변경',msg:'새 비밀번호는 4자 이상으로 정해 주세요.',ok:'변경하기',
    fields:[{id:'cur',label:'현재 비밀번호',type:'password'},{id:'nw',label:'새 비밀번호',type:'password'},{id:'nw2',label:'새 비밀번호 확인',type:'password'}],
    validate:x=>!x.cur?'현재 비밀번호를 입력하세요.':x.nw.length<4?'새 비밀번호는 4자 이상이어야 합니다.':x.nw!==x.nw2?'새 비밀번호가 서로 다릅니다.':''});
  if(!v)return;
  try{setAuth(await authSignIn(cu.id,v.cur))}catch(e){return uiAlert('현재 비밀번호가 올바르지 않습니다.')}
  try{setAuth(await idCall('update',{idToken:AUTH.idToken,password:wrapPw(v.nw)}));toast('비밀번호를 바꿨어요')}catch(e){uiAlert('변경 실패: '+authErr(e.code))}}
async function logout(){if(!await uiConfirm('로그아웃할까요?',{ok:'로그아웃',icon:'log-out'}))return;stopPoll();AUTH=null;location.reload()}
