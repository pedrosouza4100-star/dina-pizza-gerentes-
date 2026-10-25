/* Atualização automática: quando sai uma versão nova do sistema (arquivo versao.json),
   o aparelho avisa na hora e recarrega sozinho com segurança. */
(function(){
  var base=null, aviso=null, desde=0, ARQ='versao.json';
  var MINUTOS_CHECAR=3, MINUTOS_FORCAR=15;
  function buscar(){
    return fetch(ARQ+'?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).then(function(j){return j&&j.versao?String(j.versao):null;}).catch(function(){return null;});
  }
  function recarregar(v){
    try{ if(sessionStorage.getItem('dina_recarregou')===v) return; sessionStorage.setItem('dina_recarregou',v); }catch(e){}
    var u=new URL(location.href); u.searchParams.set('v',v); location.replace(u.toString());
  }
  function digitando(){ var a=document.activeElement; return a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName); }
  function mostrarAviso(v){
    if(aviso) return;
    desde=Date.now();
    aviso=document.createElement('div');
    aviso.style.cssText='position:fixed;left:0;right:0;top:0;z-index:2147483646;background:#FFD000;color:#000;font:700 14px Arial,sans-serif;padding:12px 16px;display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;box-shadow:0 2px 10px rgba(0,0,0,.4)';
    aviso.innerHTML='<span>🔄 Saiu uma atualização do sistema.</span><button style="background:#000;color:#FFD000;border:none;border-radius:6px;padding:8px 14px;font-weight:700;cursor:pointer">Atualizar agora</button>';
    aviso.querySelector('button').onclick=function(){ recarregar(v); };
    document.body.appendChild(aviso);
  }
  var nova=null;
  function checar(){
    buscar().then(function(v){
      if(!v) return;
      if(base===null){ base=v; return; }
      if(v===base) return;
      nova=v;
      if(document.visibilityState==='hidden'){ recarregar(v); return; }   // fora da tela: atualiza sem atrapalhar
      mostrarAviso(v);
      seguir();
    });
  }
  // com o aviso na tela: atualiza sozinho assim que o gerente parar de digitar (1 min), e obrigatoriamente em 15 min
  function seguir(){
    if(!nova) return;
    var t=Date.now()-desde;
    if(t>MINUTOS_FORCAR*60000 || (t>60000 && !digitando())) { recarregar(nova); return; }
    setTimeout(seguir, 15000);
  }
  function iniciar(){
    checar();
    setInterval(checar, MINUTOS_CHECAR*60000);
    document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='visible'){ if(nova) recarregar(nova); else checar(); } });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',iniciar); else iniciar();
})();
