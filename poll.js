/* 학생 화면 자동 새로고침(4초) */
function startPoll(){stopPoll();pollT=setInterval(async()=>{if(!cu||cu.role!=='student')return stopPoll();
  try{const r=await fetch(FIREBASE_URL),j=await r.json();if(j){DATA=j;norm()}}catch(e){return}if(!getMe())return;
  const on=id=>$(id).classList.contains('active');
  if(on('s-auction')&&!(document.activeElement&&document.activeElement.tagName==='INPUT'))renderSAuc();renderNoticeBar();if(on('s-vocab')&&!currentQuiz&&!vocabLock)renderSVocab();if(on('s-math')&&!currentMath&&!mathLock)renderSMath();
  if(on('s-home'))renderHome();if(on('s-seat'))renderSSeat();$('studentPoints').textContent=getMe().points},4000)}
function stopPoll(){if(pollT){clearInterval(pollT);pollT=null}}
