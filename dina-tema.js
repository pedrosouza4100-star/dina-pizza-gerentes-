/* Tema claro/escuro do Sistema Dina Pizza.
   Carregar no <head> (antes do CSS da página aparecer) para não piscar.
   A escolha fica no aparelho (localStorage 'dina_tema' = 'claro' | 'escuro'); padrão = escuro. */
(function(){
  var r=document.documentElement;
  function aplicar(t){
    if(t==='claro') r.setAttribute('data-theme','light'); else r.removeAttribute('data-theme');
    try{
      var m=document.querySelector('meta[name="theme-color"]');
      if(m) m.setAttribute('content', t==='claro' ? '#F3F5F9' : '#07090E');
    }catch(e){}
  }
  var t='escuro';
  try{ t=localStorage.getItem('dina_tema')||'escuro'; }catch(e){}
  aplicar(t);
  window.temaAtual=function(){ return r.getAttribute('data-theme')==='light' ? 'claro' : 'escuro'; };
  window.temaAlternar=function(){
    var novo = window.temaAtual()==='claro' ? 'escuro' : 'claro';
    aplicar(novo);
    try{ localStorage.setItem('dina_tema', novo); }catch(e){}
    return novo;
  };
  document.addEventListener('DOMContentLoaded', function(){ aplicar(window.temaAtual()); });
})();
