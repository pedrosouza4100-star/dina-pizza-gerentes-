/* Trava das páginas da gestão (dashboard, checklist do GDI, controle geral).
   Pede a senha do administrador ou a senha da gestão; os gerentes das lojas não entram. */
(function(){
  var SCRIPT_URL='https://script.google.com/macros/s/AKfycby-MpaSNNJ_hb4Vw6X139dBGR_PmBFD8gXJwSfxgbuis9ulOEuN6Rcdg4_D6BbBwuFc/exec';
  var CHAVE='dina_gestao_hash';
  // página do GDI: a senha da agenda do GDI também abre (antes do script: window.GESTAO_PAGINA='regional')
  var PAGINA=window.GESTAO_PAGINA||'';
  function hash(s){var h=0;for(var i=0;i<s.length;i++)h=(Math.imul(31,h)+s.charCodeAt(i))|0;return String(h);}
  function ler(k){try{return localStorage.getItem(k)||sessionStorage.getItem(k);}catch(e){return null;}}
  function gravar(k,v){try{localStorage.setItem(k,v);}catch(e){}}
  // esconde a página até liberar
  try{ if(localStorage.getItem('dina_tema')==='claro') document.documentElement.setAttribute('data-theme','light'); }catch(e){}
  var st=document.createElement('style'); st.id='gGuardCss';
  st.textContent='html{visibility:hidden}#gGuard{visibility:visible!important;position:fixed;inset:0;z-index:2147483647;background:#07090E;display:flex;align-items:center;justify-content:center;padding:20px;font-family:Inter,Arial,sans-serif}#gGuard .b{background:#121722;border:1px solid rgba(255,77,61,.35);box-shadow:0 0 60px rgba(255,77,61,.10);border-radius:22px;padding:28px 24px;width:100%;max-width:380px;display:flex;flex-direction:column;gap:14px;color:#F2F4F8}#gGuard .lg{position:relative;width:110px;margin:0 auto;line-height:0}#gGuard .lg:before{content:"";position:absolute;inset:-22%;border-radius:50%;background:radial-gradient(circle,rgba(255,200,0,.38) 0%,rgba(255,77,61,.22) 42%,rgba(255,77,61,0) 70%)}#gGuard .lg img{position:relative;width:100%;height:auto;filter:drop-shadow(0 6px 16px rgba(0,0,0,.55))}#gGuard p{font-size:.85rem;color:#A3ACBB;text-align:center;line-height:1.5}#gGuard input{background:#171D2A;border:1px solid #242B38;border-radius:10px;color:#F2F4F8;font-size:1rem;padding:12px}#gGuard button{background:#D93025;color:#fff;border:none;border-radius:12px;padding:13px;font-weight:700;font-size:.95rem;cursor:pointer;box-shadow:0 0 26px rgba(255,77,61,.38)}#gGuard .e{color:#FF5A4E;font-size:.8rem;text-align:center;min-height:16px}#gGuard a{color:#A3ACBB;font-size:.75rem;text-align:center}[data-theme=light] #gGuard{background:#F3F5F9}[data-theme=light] #gGuard .b{background:#fff;color:#0E1220;box-shadow:0 18px 50px rgba(14,18,32,.08)}[data-theme=light] #gGuard p,[data-theme=light] #gGuard a{color:#566072}[data-theme=light] #gGuard input{background:#F6F8FB;border-color:#E1E5EC;color:#0E1220}[data-theme=light] #gGuard .lg:before{background:radial-gradient(circle,rgba(255,208,0,.30) 0%,rgba(255,120,60,.12) 45%,rgba(255,120,60,0) 70%)}[data-theme=light] #gGuard .e{color:#C62828}';
  document.head.appendChild(st);
  function liberar(){ var g=document.getElementById('gGuard'); if(g) g.remove(); var c=document.getElementById('gGuardCss'); if(c) c.remove(); }
  function conferir(h){
    return fetch(SCRIPT_URL,{method:'POST',body:JSON.stringify({action:'authGestaoLogin',hash:h,pagina:PAGINA})})
      .then(function(r){return r.text();}).then(function(t){ var j=null; try{j=JSON.parse(t);}catch(e){} return j; });
  }
  function montar(){
    var d=document.createElement('div'); d.id='gGuard';
    d.innerHTML='<div class="b"><div class="lg"><img src="logo-emblema.png" alt="Dina Pizza Gastronomia" width="110" height="108"></div><p>'+(PAGINA==='regional'?'GDI: entre com a sua senha (a mesma da agenda).':'Área da gestão. Entre com a senha do administrador ou da gestão.')+'</p><input type="password" id="gGuardSenha" placeholder="Senha"><div class="e" id="gGuardErro"></div><button id="gGuardBtn">Entrar</button><a href="./">← Voltar ao início</a></div>';
    document.body.appendChild(d);
    var inp=document.getElementById('gGuardSenha'), err=document.getElementById('gGuardErro');
    function tentar(){
      var s=inp.value; if(s.length<4){err.textContent='Digite a senha.';return;}
      err.textContent='Conferindo...';
      var h=hash(s);
      conferir(h).then(function(j){
        if(j && j.ok===true){ if(j.valido){ gravar(CHAVE,h); liberar(); } else err.textContent='Senha incorreta.'; return; }
        // Apps Script antigo: confere a senha do admin guardada neste aparelho
        var local=null; try{local=localStorage.getItem('dina_admin_senha');}catch(e){}
        if(local && local===h){ gravar(CHAVE,h); liberar(); } else err.textContent='Senha incorreta.';
      }).catch(function(){ err.textContent='Sem conexão. Tente de novo.'; });
    }
    document.getElementById('gGuardBtn').onclick=tentar;
    inp.addEventListener('keydown',function(e){ if(e.key==='Enter') tentar(); });
    setTimeout(function(){inp.focus();},50);
  }
  function iniciar(){
    var h=ler(CHAVE)||ler('dina_adm_hash');
    if(h){
      conferir(h).then(function(j){ if(j && j.ok===true && j.valido){ gravar(CHAVE,h); liberar(); } else { try{localStorage.removeItem(CHAVE);}catch(e){} montar(); } }).catch(montar);
    } else montar();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',iniciar); else iniciar();
})();
