/* 로그인 / 로그아웃 */
async function login(){const id=$('loginId').value.trim(),pw=$('loginPw').value.trim();$('loginErr').style.display='none';
  if(!await dbLoad())return;
  if(id==='admin'&&pw==='admin1234'){cu={role:'admin'};$('loginCard').style.display='none';$('adminMain').style.display='block';renderAdmin();return}
  const s=DATA.students.find(x=>x.id===id&&x.pw===pw);
  if(!s){$('loginErr').style.display='block';return}
  cu={role:'student',id:s.id};$('loginCard').style.display='none';$('studentMain').style.display='block';renderStudent();startPoll()}
function logout(){stopPoll();location.reload()}
