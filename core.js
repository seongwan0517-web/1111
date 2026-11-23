/* 공통: 전역 상태, 유틸, Firebase 인증 + 읽기/쓰기 */
let DATA={},cu=null,currentQuiz=null,currentMath=null,vocabLock=false,mathLock=false,mathEdit=null,seatSel=null,seatDirty=false,drag=null,pollT=null;
const stepVals={},mathCache={},crop={img:null,scale:1,sel:null,start:null,t:null,last:null};
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>new Date().toLocaleString('ko-KR');
const dayStr=()=>{const d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()};
const arr=x=>Array.isArray(x)?x.filter(v=>v!=null):Object.values(x||{});
const nameOf=id=>{const s=DATA.students.find(x=>String(x.id)===String(id));return s?s.name:''};
const wordsOf=k=>VOCAB_DATA[k]||[];
function toast(m){const t=$('toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500)}
function defaultSeats(){const X=[4.2,23.9,43.2,61.8,80.5],Y=[17,35,52,70];const l=[{x:X[4],y:Y[0]}];[1,2,3].forEach(r=>X.forEach(x=>l.push({x,y:Y[r]})));
  return l.map((p,i)=>({id:'s'+(i+1),n:i+1,x:p.x,y:p.y,sid:''}))}

/* ───── Firebase 인증 (REST) ───── */
let AUTH=null; // {idToken, refreshToken, uid, exp}
const ID_URL='https://identitytoolkit.googleapis.com/v1/accounts:';
/* 로그인 아이디 → 계정 이메일. 영문/숫자가 아니면 16진수로 바꿔서 사용 */
function loginEmail(id){id=String(id).trim();
  const local=/^[A-Za-z0-9._-]+$/.test(id)?id.toLowerCase():'u-'+Array.from(new TextEncoder().encode(id)).map(b=>b.toString(16).padStart(2,'0')).join('');
  return local+'@'+LOGIN_DOMAIN}
/* Firebase는 비밀번호가 6자 이상이어야 해서 앞에 고정 문자를 붙임 (짧은 기존 비밀번호도 그대로 쓰기 위해) */
const wrapPw=pw=>'vt#'+String(pw);
async function idCall(method,body){const r=await fetch(ID_URL+method+'?key='+FIREBASE_API_KEY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.assign({returnSecureToken:true},body))});
  const j=await r.json();if(!r.ok){const e=new Error((j.error&&j.error.message)||('HTTP '+r.status));e.code=e.message.split(' ')[0];throw e}return j}
const authSignIn=(id,pw)=>idCall('signInWithPassword',{email:loginEmail(id),password:wrapPw(pw)});
const authSignUp=(id,pw)=>idCall('signUp',{email:loginEmail(id),password:wrapPw(pw)});
function setAuth(j){AUTH={idToken:j.idToken||j.id_token,refreshToken:j.refreshToken||j.refresh_token,uid:j.localId||j.user_id,exp:Date.now()+(+(j.expiresIn||j.expires_in)||3600)*1000}}
async function token(){if(!AUTH)throw new Error('로그인이 필요합니다');
  if(Date.now()>AUTH.exp-120000){const r=await fetch('https://securetoken.googleapis.com/v1/token?key='+FIREBASE_API_KEY,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=refresh_token&refresh_token='+encodeURIComponent(AUTH.refreshToken)});
    const j=await r.json();if(!r.ok)throw new Error('로그인이 만료되었습니다. 다시 로그인해 주세요.');setAuth(j)}
  return AUTH.idToken}
const authErr=c=>({INVALID_LOGIN_CREDENTIALS:'아이디 또는 비밀번호가 올바르지 않습니다.',INVALID_PASSWORD:'아이디 또는 비밀번호가 올바르지 않습니다.',EMAIL_NOT_FOUND:'아이디 또는 비밀번호가 올바르지 않습니다.',USER_DISABLED:'사용이 중지된 계정입니다.',TOO_MANY_ATTEMPTS_TRY_LATER:'로그인 시도가 너무 많습니다. 잠시 후 다시 시도하세요.',EMAIL_EXISTS:'이미 계정이 있는 아이디입니다.',WEAK_PASSWORD:'비밀번호가 너무 약합니다.'}[c]||c);

/* ───── DB 읽기/쓰기 (로그인 토큰 포함) ───── */
async function api(path,method,body){const r=await fetch(BASE+path+'.json?auth='+encodeURIComponent(await token()),{method:method||'GET',headers:body!==undefined?{'Content-Type':'application/json'}:undefined,body:body!==undefined?JSON.stringify(body):undefined});
  if(!r.ok){let m='HTTP '+r.status;try{const j=await r.json();if(j&&j.error)m=j.error}catch(e){}if(r.status===401)m='권한이 없습니다 ('+m+')';throw new Error(m)}return r.json()}
const byId=(a,b)=>(+a.id||0)-(+b.id||0);
function norm(){DATA=DATA||{};
  ['students','items','orders','notices'].forEach(k=>{DATA[k]=arr(DATA[k])});
  ['items','orders','notices'].forEach(k=>DATA[k].sort(byId));
  ['auctions','vocabTests','mathTests'].forEach(k=>{if(!DATA[k])DATA[k]={}});
  const sd=arr(DATA.seats);DATA.seats=sd.length?sd:defaultSeats();
  DATA.seats.forEach(s=>{if(s.sid==null)s.sid=''});
  DATA.students.forEach(s=>{s.history=arr(s.history);if(!s.vocabResults)s.vocabResults={};if(!s.mathResults)s.mathResults={};if(typeof s.points!=='number')s.points=+s.points||0})}
async function fetchAll(){const isA=cu&&cu.role==='admin';
  const [pub,orders,uids]=await Promise.all([api('pub'),isA?api('orders'):null,isA?api('uids'):null]);
  const d=pub||{};d.orders=orders||{};d.uids=uids||{};return d}
async function dbLoad(){try{DATA=await fetchAll()}catch(e){alert('데이터베이스 연결 실패: '+e.message);return false}norm();return true}
async function pull(){try{DATA=await fetchAll()}catch(e){}norm()}
/* 바뀐 부분만 저장 (여러 경로를 한 번에). 예: {'pub/students/kim/points':120} */
async function dbUpdate(map){try{await api('','PATCH',map);return true}catch(e){alert('저장 실패: '+e.message);await pull();return false}}
let hseq=0;
const hkey=()=>'h'+Date.now()+'_'+(hseq++%1000).toString().padStart(3,'0')+Math.random().toString(36).slice(2,5);
const SP=id=>'pub/students/'+id;
/* 포인트 내역 한 줄 추가 (화면용 + 저장할 경로 동시에) */
function addHist(s,entry,upd){s.history.push(entry);upd[SP(s.id)+'/history/'+hkey()]=entry}

const getMe=()=>DATA.students.find(x=>x.id===cu.id);
function historyRows(a){a=arr(a);if(!a.length)return'<div class="empty">내역이 없습니다.</div>';
  return a.slice().reverse().map(h=>`<div class="history flex"><div><div>${esc(h.label)}</div><div class="small">${esc(h.date)}</div></div><div class="${h.points>0?'green':'red'}">${h.points>0?'+':''}${h.points}P</div></div>`).join('')}
const shuf=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
