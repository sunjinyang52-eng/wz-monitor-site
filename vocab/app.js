(async()=>{
const bin=atob(window.__VOCAB_B64||'');
const u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);
let jsonText;
if('DecompressionStream' in window){const ds=new DecompressionStream('gzip');jsonText=await new Response(new Blob([u8]).stream().pipeThrough(ds)).text();}
else{document.body.innerHTML='<div style="padding:24px;font-family:sans-serif">当前浏览器太旧，请用手机 Chrome 打开。</div>';return;}
const WORDS=JSON.parse(jsonText);
const GROUPS=window.__VOCAB_GROUPS||[];
const BYWORD=Object.fromEntries(WORDS.map(x=>[x.word,x]));
const STORE_KEY='ayang_vocab_review_v2';
let state={grades:{},favorites:{},favoriteGroups:{},randomSession:[],randomIndex:0,groupOrder:GROUPS.map((_,i)=>i),groupIndex:0};
try{const s=JSON.parse(localStorage.getItem(STORE_KEY)||'null');if(s&&typeof s==='object')state={...state,...s,grades:s.grades||{},favorites:s.favorites||{},favoriteGroups:s.favoriteGroups||{}}}catch(e){}
function save(){try{localStorage.setItem(STORE_KEY,JSON.stringify(state))}catch(e){};updateStats()}
function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function gradeLabel(g){return g==='know'?'会':g==='vague'?'模糊':g==='forgot'?'忘了':''}
function updateStats(){let k=0,v=0,f=0;Object.values(state.grades).forEach(x=>{if(x==='know')k++;if(x==='vague')v++;if(x==='forgot')f++});statKnow.textContent=k;statVague.textContent=v;statForgot.textContent=f;statFav.textContent=Object.keys(state.favorites||{}).filter(id=>state.favorites[id]).length}
function isFavorite(id){return !!state.favorites?.[id]}
function toggleFavorite(id){state.favorites[id]=!isFavorite(id);if(!state.favorites[id])delete state.favorites[id];save();renderRandom();renderGroup();renderFav();renderAllList(false)}
function groupKey(g){return g.join('|')}
function isGroupFavorite(g){return !!state.favoriteGroups?.[groupKey(g)]}
function toggleGroupFavorite(g){const k=groupKey(g);state.favoriteGroups[k]=!isGroupFavorite(g);if(!state.favoriteGroups[k])delete state.favoriteGroups[k];save();renderGroup();renderFav()}
function setGrade(id,g){state.grades[id]=g;save();renderAllList(false)}
function meaningText(x){return x?.meaning||'暂无释义'}

// tabs
const tabs=[...document.querySelectorAll('.tab')];
tabs.forEach(t=>t.onclick=()=>{tabs.forEach(x=>x.classList.toggle('active',x===t));['random','confuse','weak','fav','all'].forEach(v=>document.getElementById('view-'+v).classList.toggle('hidden',v!==t.dataset.view));if(t.dataset.view==='weak')renderWeak();if(t.dataset.view==='fav')renderFav();if(t.dataset.view==='all')renderAllList(true)});

// random
function newRandomSession(){const n=+sampleSize.value;state.randomSession=shuffle(WORDS.map(x=>x.id)).slice(0,n);state.randomIndex=0;save();renderRandom()}
function currentRandom(){if(!state.randomSession.length)newRandomSession();return WORDS.find(x=>x.id===state.randomSession[state.randomIndex])}
function renderRandom(){const x=currentRandom();randomWord.textContent=x.word;randomMeaning.className='meaning cover';randomMeaning.innerHTML='<span>先回忆，点击显示意思</span>';sessionInfo.textContent=`本轮 ${state.randomIndex+1} / ${state.randomSession.length}`;randomProgress.style.width=((state.randomIndex+1)/state.randomSession.length*100)+'%';randomFavorite.textContent=isFavorite(x.id)?'★':'☆';randomFavorite.classList.toggle('on',isFavorite(x.id));document.querySelectorAll('[data-grade]').forEach(b=>{b.style.outline=state.grades[x.id]===b.dataset.grade?'2px solid currentColor':'none'})}
randomFavorite.onclick=()=>{const x=currentRandom();toggleFavorite(x.id)}
randomMeaning.onclick=()=>{const x=currentRandom();randomMeaning.className='meaning';randomMeaning.textContent=meaningText(x)};
document.querySelectorAll('[data-grade]').forEach(b=>b.onclick=()=>{const x=currentRandom();setGrade(x.id,b.dataset.grade);renderRandom()});
randomNext.onclick=()=>{if(state.randomIndex<state.randomSession.length-1)state.randomIndex++;else newRandomSession();save();renderRandom()};
randomPrev.onclick=()=>{state.randomIndex=Math.max(0,state.randomIndex-1);save();renderRandom()};newSession.onclick=newRandomSession;sampleSize.onchange=newRandomSession;

// confuse
function renderGroup(){const gi=state.groupOrder[state.groupIndex]??0,g=GROUPS[gi];groupNo.textContent=state.groupIndex+1;groupTotal.textContent=GROUPS.length;groupProgress.style.width=((state.groupIndex+1)/GROUPS.length*100)+'%';favoriteGroup.textContent=isGroupFavorite(g)?'★ 已收藏整组':'☆ 收藏整组';favoriteGroup.classList.toggle('primary',isGroupFavorite(g));confuseGroup.innerHTML=g.map(w=>`<button class="chip" data-w="${w}">${w}${BYWORD[w]&&isFavorite(BYWORD[w].id)?' ★':''}</button>`).join('');confuseMeanings.innerHTML=g.map(w=>{const x=BYWORD[w];const fav=x&&isFavorite(x.id);return `<div class="group-item masked" data-w="${w}"><div class="group-item-head"><strong>${w}</strong>${x?`<button class="favorite-btn ${fav?'on':''}" data-fav-id="${x.id}" aria-label="收藏 ${w}">${fav?'★':'☆'}</button>`:''}</div><div class="m">${escapeHtml(meaningText(x))}</div></div>`}).join('');confuseMeanings.querySelectorAll('.group-item').forEach(el=>el.onclick=()=>el.classList.remove('masked'));confuseMeanings.querySelectorAll('[data-fav-id]').forEach(btn=>btn.onclick=e=>{e.stopPropagation();toggleFavorite(+btn.dataset.favId)})}
favoriteGroup.onclick=()=>{const gi=state.groupOrder[state.groupIndex]??0;toggleGroupFavorite(GROUPS[gi])};
groupNext.onclick=()=>{state.groupIndex=(state.groupIndex+1)%GROUPS.length;save();renderGroup()};groupPrev.onclick=()=>{state.groupIndex=(state.groupIndex-1+GROUPS.length)%GROUPS.length;save();renderGroup()};shuffleGroups.onclick=()=>{state.groupOrder=shuffle(GROUPS.map((_,i)=>i));state.groupIndex=0;save();renderGroup()};

// weak
function renderWeak(){const weak=WORDS.filter(x=>['vague','forgot'].includes(state.grades[x.id]));if(!weak.length){weakArea.innerHTML='<div class="empty">目前还没有薄弱词。随机抽样时标记「模糊 / 忘了」后会自动出现在这里。</div>';return}weakArea.innerHTML=`<div class="stat" style="margin:18px 0"><b>${weak.length}</b><span>个薄弱词</span></div><div class="wordlist">${weak.map(x=>`<div class="wordcell" data-id="${x.id}"><span>${x.word}</span><span class="tag ${state.grades[x.id]}">${gradeLabel(state.grades[x.id])}</span></div>`).join('')}</div>`;weakArea.querySelectorAll('.wordcell').forEach(el=>el.onclick=()=>showWordModal(+el.dataset.id))}
startWeak.onclick=()=>{const weak=WORDS.filter(x=>['vague','forgot'].includes(state.grades[x.id]));if(!weak.length)return;state.randomSession=shuffle(weak.map(x=>x.id));state.randomIndex=0;save();tabs.find(t=>t.dataset.view==='random').click();renderRandom()}

// favorites
function favoriteWords(){return WORDS.filter(x=>isFavorite(x.id))}
function favoriteGroupArrays(){const keys=new Set(Object.keys(state.favoriteGroups||{}).filter(k=>state.favoriteGroups[k]));return GROUPS.filter(g=>keys.has(groupKey(g)))}
function renderFav(){const words=favoriteWords(),groups=favoriteGroupArrays();favCount.textContent=words.length;favGroupCount.textContent=groups.length;if(!words.length&&!groups.length){favArea.innerHTML='<div class="empty">还没有收藏。随机抽样或易混淆里点 ☆ 就会放进这里。</div>';return}let html='';if(groups.length){html+=`<h3 class="section-title" style="margin-top:18px">收藏的易混组</h3><div class="group-meanings">${groups.map(g=>`<div class="group-item"><div class="group-item-head"><strong>${g.join(' / ')}</strong><button class="favorite-btn on" data-unfav-group="${escapeHtml(groupKey(g))}">★</button></div></div>`).join('')}</div>`}if(words.length){html+=`<h3 class="section-title" style="margin-top:20px">收藏单词</h3><div class="wordlist">${words.map(x=>`<div class="wordcell" data-id="${x.id}"><span>${x.word}</span><span class="fav-badge">★</span></div>`).join('')}</div>`}favArea.innerHTML=html;favArea.querySelectorAll('.wordcell').forEach(el=>el.onclick=()=>showWordModal(+el.dataset.id));favArea.querySelectorAll('[data-unfav-group]').forEach(btn=>btn.onclick=()=>{const k=btn.dataset.unfavGroup;delete state.favoriteGroups[k];save();renderFav();renderGroup()})}
startFav.onclick=()=>{const fav=favoriteWords();if(!fav.length)return;state.randomSession=shuffle(fav.map(x=>x.id));state.randomIndex=0;save();tabs.find(t=>t.dataset.view==='random').click();renderRandom()}

// all
function renderAllList(force=false){if(!force&&document.getElementById('view-all').classList.contains('hidden'))return;const q=(allFilter.value||'').trim().toLowerCase();const arr=q?WORDS.filter(x=>x.word.includes(q)):WORDS;wordList.innerHTML=arr.map(x=>{const g=state.grades[x.id];return `<div class="wordcell" data-id="${x.id}"><span>${x.word}${isFavorite(x.id)?' <span class=\"fav-badge\">★</span>':''}</span>${g?`<span class="tag ${g}">${gradeLabel(g)}</span>`:`<em>#${x.id}</em>`}</div>`}).join('');wordList.querySelectorAll('.wordcell').forEach(el=>el.onclick=()=>showWordModal(+el.dataset.id))}
allFilter.oninput=()=>renderAllList(true);
function showWordModal(id){const x=WORDS.find(y=>y.id===id);if(!x)return;searchInput.value=x.word;searchResult.innerHTML=`<b>${x.word}</b><br>${escapeHtml(x.meaning)}<div class="muted small">词表 #${x.id} · PDF 第 ${x.page} 页</div>`}

// search
function doSearch(){const q=searchInput.value.trim().toLowerCase();if(!q){searchResult.innerHTML='';return}const x=BYWORD[q]||WORDS.find(y=>y.word.startsWith(q))||WORDS.find(y=>y.word.includes(q));searchResult.innerHTML=x?`<b>${x.word}</b><br>${escapeHtml(x.meaning)}<div class="muted small">词表 #${x.id} · PDF 第 ${x.page} 页</div>`:'没在这 1248 个词里找到。'}
searchBtn.onclick=doSearch;searchInput.onkeydown=e=>{if(e.key==='Enter')doSearch()};

// backup
exportBtn.onclick=()=>{const blob=new Blob([JSON.stringify({version:3,exportedAt:new Date().toISOString(),grades:state.grades,favorites:state.favorites,favoriteGroups:state.favoriteGroups},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='阿阳_单词复习进度.json';a.click();URL.revokeObjectURL(a.href)};
importBtn.onclick=()=>importFile.click();importFile.onchange=()=>{const f=importFile.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const o=JSON.parse(r.result);if(!o.grades)throw 0;state.grades=o.grades||{};state.favorites=o.favorites||{};state.favoriteGroups=o.favoriteGroups||{};save();renderRandom();renderGroup();renderWeak();renderFav();renderAllList(true);alert('导入成功')}catch(e){alert('进度文件格式不对')}};r.readAsText(f)};
function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

// keyboard
window.addEventListener('keydown',e=>{if(['INPUT','SELECT'].includes(document.activeElement.tagName))return;const active=document.querySelector('.tab.active')?.dataset.view;if(active==='random'){if(e.code==='Space'){e.preventDefault();randomMeaning.click()}if(['1','2','3'].includes(e.key)){document.querySelector(`[data-grade="${e.key==='1'?'know':e.key==='2'?'vague':'forgot'}"]`).click()}if(e.key==='ArrowRight')randomNext.click();if(e.key==='ArrowLeft')randomPrev.click()}else if(active==='confuse'){if(e.key==='ArrowRight')groupNext.click();if(e.key==='ArrowLeft')groupPrev.click()}})

updateStats();renderRandom();renderGroup();renderFav();
})();
