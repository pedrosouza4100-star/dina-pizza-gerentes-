/* Padrão visual único (27/11/2026): tira o emoji do começo dos títulos, abas e botões das telas da gestão.
   Só o primeiro emoji; ✅ ❌ e afins no meio do texto (situação) ficam. */
(function(){
  var SEL='.tit,.sec-t,.bloco-sep,.categoria-titulo,.aba,.abas button,h1,h2,h3,.section-title,.cart-h h3,.btn,.rot';
  var RE=/^[\s‍️]*(?:[☀-➿⬀-⯿⌀-⏿]|\ud83c[\udc00-\udfff]|\ud83d[\udc00-\udfff]|\ud83e[\udc00-\udfff])[‍️🏻-\udfff\s]*/;
  function limpar(raiz){ try{ (raiz.querySelectorAll?raiz:document).querySelectorAll(SEL).forEach(function(el){
      var n=el.firstChild; while(n&&n.nodeType===3&&!n.nodeValue.trim()) n=n.nextSibling;
      if(n&&n.nodeType===3&&RE.test(n.nodeValue)){ var t=n.nodeValue.replace(RE,''); if(t.trim()) n.nodeValue=t; } }); }catch(e){} }
  var pend=false;
  function agendar(){ if(pend) return; pend=true; requestAnimationFrame(function(){ pend=false; limpar(document); }); }
  document.addEventListener('DOMContentLoaded',function(){ limpar(document); try{ new MutationObserver(agendar).observe(document.body,{childList:true,subtree:true}); }catch(e){} });
})();
