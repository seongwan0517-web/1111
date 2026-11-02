/* 공통: 전역 상태, 유틸, Firebase 읽기/쓰기 */
let DATA={},cu=null,currentQuiz=null,currentMath=null,vocabLock=false,mathLock=false,mathEdit=null,seatSel=null,seatDirty=false,drag=null,pollT=null;
const stepVals={},mathCache={},crop={img:null,scale:1,sel:null,start:null,t:null,last:null};
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const today=()=>new Date().toLocaleString('ko-KR');
const dayStr=()=>{const d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()};
const arr=x=>Array.isArray(x)?x:Object.values(x||{});
const nameOf=id=>{const s=DATA.students.find(x=>String(x.id)===String(id));return s?s.name:''};
const wordsOf=k=>VOCAB_DATA[k]||[];
function toast(m){const t=$('toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500)}
function defaultSeats(){const X=[4.2,23.9,43.2,61.8,80.5],Y=[17,35,52,70];const l=[{x:X[4],y:Y[0]}];[1,2,3].forEach(r=>X.forEach(x=>l.push({x,y:Y[r]})));
  return l.map((p,i)=>({id:'s'+(i+1),n:i+1,x:p.x,y:p.y,sid:''}))}
function norm(){DATA=DATA||{};
  ['students','items','orders','notices'].forEach(k=>{DATA[k]=arr(DATA[k])});
  ['auctions','vocabTests','mathTests'].forEach(k=>{if(!DATA[k])DATA[k]={}});
  const sd=arr(DATA.seats);DATA.seats=sd.length?sd:defaultSeats();
  DATA.seats.forEach(s=>{if(s.sid==null)s.sid=''});
  if(DATA.auction){if(DATA.auction.itemName&&!DATA.auctions.legacy){DATA.auctions.legacy=DATA.auction;DATA.auctions.legacy.id='legacy'}delete DATA.auction}
  DATA.students.forEach(s=>{s.history=arr(s.history);if(!s.vocabResults)s.vocabResults={};if(!s.mathResults)s.mathResults={}})}
async function dbLoad(){try{const r=await fetch(FIREBASE_URL);if(!r.ok)throw new Error('HTTP '+r.status);DATA=(await r.json())||{}}catch(e){alert('데이터베이스 연결 실패: '+e.message);return false}norm();return true}
async function pull(){try{const r=await fetch(FIREBASE_URL);if(r.ok){const j=await r.json();if(j)DATA=j}}catch(e){}norm()}
async function dbSave(){try{const r=await fetch(FIREBASE_URL,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(DATA)});if(!r.ok)throw new Error('HTTP '+r.status)}catch(e){alert('저장 실패: '+e.message)}}
const getMe=()=>DATA.students.find(x=>x.id===cu.id);
function historyRows(a){a=arr(a);if(!a.length)return'<div class="empty">내역이 없습니다.</div>';
  return a.slice().reverse().map(h=>`<div class="history flex"><div><div>${esc(h.label)}</div><div class="small">${esc(h.date)}</div></div><div class="${h.points>0?'green':'red'}">${h.points>0?'+':''}${h.points}P</div></div>`).join('')}
const shuf=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
