/* Trava das páginas da gestão (dashboard, checklist regional, controle geral).
   Pede a senha do administrador ou a senha da gestão; os gerentes das lojas não entram. */
(function(){
  var SCRIPT_URL='https://script.google.com/macros/s/AKfycby-MpaSNNJ_hb4Vw6X139dBGR_PmBFD8gXJwSfxgbuis9ulOEuN6Rcdg4_D6BbBwuFc/exec';
  var CHAVE='dina_gestao_hash';
  function hash(s){var h=0;for(var i=0;i<s.length;i++)h=(Math.imul(31,h)+s.charCodeAt(i))|0;return String(h);}
  function ler(k){try{return localStorage.getItem(k)||sessionStorage.getItem(k);}catch(e){return null;}}
  function gravar(k,v){try{localStorage.setItem(k,v);}catch(e){}}
  // esconde a página até liberar
  var st=document.createElement('style'); st.id='gGuardCss';
  st.textContent='html{visibility:hidden}#gGuard{visibility:visible!important;position:fixed;inset:0;z-index:2147483647;background:#0A0A0A;display:flex;align-items:center;justify-content:center;padding:20px;font-family:Arial,sans-serif}#gGuard .b{background:#1E1E1E;border:1px solid #3A3A3A;border-radius:12px;padding:28px 24px;width:100%;max-width:380px;display:flex;flex-direction:column;gap:14px;color:#fff}#gGuard h1{font-size:1.3rem;letter-spacing:.08em;text-align:center}#gGuard h1 span{color:#FFD000}#gGuard p{font-size:.8rem;color:#999;text-align:center;line-height:1.5}#gGuard input{background:#1A1A1A;border:1px solid #3A3A3A;border-radius:8px;color:#fff;font-size:1rem;padding:12px}#gGuard button{background:#C0392B;color:#fff;border:none;border-radius:8px;padding:13px;font-weight:700;font-size:.95rem;cursor:pointer}#gGuard .e{color:#FF4D4D;font-size:.8rem;text-align:center;min-height:16px}#gGuard a{color:#999;font-size:.75rem;text-align:center}';
  document.head.appendChild(st);
  function liberar(){ var g=document.getElementById('gGuard'); if(g) g.remove(); var c=document.getElementById('gGuardCss'); if(c) c.remove(); }
  function conferir(h){
    return fetch(SCRIPT_URL,{method:'POST',body:JSON.stringify({action:'authGestaoLogin',hash:h})})
      .then(function(r){return r.text();}).then(function(t){ var j=null; try{j=JSON.parse(t);}catch(e){} return j; });
  }
  function montar(){
    var d=document.createElement('div'); d.id='gGuard';
    d.innerHTML='<div class="b"><h1>DINA <span>PIZZA</span></h1><p>Área da gestão. Entre com a senha do administrador ou da gestão.</p><input type="password" id="gGuardSenha" placeholder="Senha"><div class="e" id="gGuardErro"></div><button id="gGuardBtn">Entrar</button><a href="./">← Voltar ao início</a></div>';
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
