/* 앱 디자인에 맞춘 알림·확인·입력 창 (브라우저 기본 alert / confirm / prompt 대신 사용)
   uiAlert('메시지')                    → Promise<void>
   await uiConfirm('질문\n설명')        → true / false  (첫 줄 = 제목, 나머지 = 설명)
   await uiForm({title, fields:[{id,label,type,placeholder}], ok}) → {id:값} 또는 null */
const uiQ=[];let uiBusy=false;
const DANGER_RE=/삭제|소멸|비울|되돌릴|종료할|닫을까요/;
function uiOpen(o){return new Promise(res=>{uiQ.push({o,res});uiNext()})}
function uiNext(){
  if(uiBusy||!uiQ.length)return;uiBusy=true;
  const {o,res}=uiQ.shift(),lines=String(o.msg||'').split('\n');
  const title=o.title||lines.shift(),body=(o.title?lines:lines).join('\n').trim();
  const danger=o.danger!=null?o.danger:(o.kind==='confirm'&&DANGER_RE.test(o.msg||''));
  const icon=o.icon||(o.kind==='alert'?(o.error?'triangle-alert':'info'):o.kind==='form'?'key-round':danger?'triangle-alert':'circle-help');
  const bg=document.createElement('div');bg.className='ui-bg';
  bg.innerHTML=`<div class="ui-dlg${danger||o.error?' danger':''}" role="dialog" aria-modal="true" aria-labelledby="uiTitle">
    <div class="ui-ic">${ic(icon)}</div><h3 id="uiTitle"></h3><p class="ui-body"></p>
    ${o.kind==='form'?`<div class="ui-fields">${(o.fields||[]).map(f=>`<label class="field"><span>${esc(f.label)}</span><input data-id="${esc(f.id)}" type="${f.type||'text'}" placeholder="${esc(f.placeholder||'')}" autocomplete="off"></label>`).join('')}<div class="ui-err"></div></div>`:''}
    <div class="ui-btns">${o.kind==='alert'?'':`<button class="btn btn-ghost" data-v="0">${esc(o.cancel||'취소')}</button>`}<button class="btn ${danger?'btn-dangerSolid':'btn-primary'}" data-v="1">${esc(o.ok||'확인')}</button></div></div>`;
  bg.querySelector('h3').textContent=title||'';const pb=bg.querySelector('.ui-body');if(body)pb.textContent=body;else pb.remove();
  const prevFocus=document.activeElement;
  const close=v=>{document.removeEventListener('keydown',onKey,true);bg.classList.remove('show');setTimeout(()=>bg.remove(),160);uiBusy=false;try{prevFocus&&prevFocus.focus&&prevFocus.focus()}catch(e){}res(v);setTimeout(uiNext,170)};
  const submit=()=>{if(o.kind!=='form')return close(o.kind==='alert'?undefined:true);
    const vals={};bg.querySelectorAll('input[data-id]').forEach(i=>vals[i.dataset.id]=i.value);
    const err=o.validate&&o.validate(vals);if(err){bg.querySelector('.ui-err').textContent=err;return}close(vals)};
  const cancel=()=>close(o.kind==='form'?null:o.kind==='alert'?undefined:false);
  bg.addEventListener('click',e=>{const b=e.target.closest('[data-v]');if(b)return b.dataset.v==='1'?submit():cancel();if(e.target===bg&&o.kind!=='alert')cancel()});
  const onKey=e=>{if(e.key==='Escape'){e.preventDefault();cancel()}else if(e.key==='Enter'&&!e.isComposing){e.preventDefault();submit()}};
  document.addEventListener('keydown',onKey,true);
  document.body.appendChild(bg);requestAnimationFrame(()=>bg.classList.add('show'));
  const first=bg.querySelector('input')||bg.querySelector('[data-v="1"]');setTimeout(()=>first&&first.focus(),30);
}
const uiAlert=(msg,o)=>uiOpen(Object.assign({},o,{msg,kind:'alert',error:o&&o.error!=null?o.error:/실패|오류|없습니다|올바르지|부족|이미|먼저|못했/.test(msg)}));
const uiConfirm=(msg,o)=>uiOpen(Object.assign({},o,{msg,kind:'confirm'}));
const uiForm=o=>uiOpen(Object.assign({},o,{kind:'form'}));
