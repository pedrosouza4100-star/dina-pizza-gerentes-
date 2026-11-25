/* Leitor de QR das etiquetas da cozinha central (25/11/2026). Usado pelo 📦 Recebimento e pela tela de etiquetas.
   etqLeitorAbrir(aoLer, {continuo:true, titulo:'...'}) abre a câmera traseira; aoLer(id) recebe o ID de 6 letras
   (do link https://gerentes.dinapizza.com.br/etiqueta?id=XXXXXX). Usa o BarcodeDetector do celular quando existe
   (Chrome/Android) e, senão (iPhone), o jsQR carregado na hora. Também deixa digitar o código. */
(function(){
  let stream=null, rodando=false, aoLer=null, ultimo='', ultimoMs=0, detector=null, canvas=null, opcoes={};
  function el(id){ return document.getElementById(id); }
  function idDe(t){ const s=String(t||'').trim(), m=s.match(/[?&]id=([A-Za-z0-9]+)/); return (m?m[1]:s).toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,12); }
  function montar(){
    if(el('etqLeitor')) return;
    const d=document.createElement('div'); d.id='etqLeitor';
    d.style.cssText='display:none;position:fixed;inset:0;z-index:2100;background:rgba(0,0,0,.94);flex-direction:column;align-items:center;justify-content:center;padding:14px;gap:10px;color:#fff;font-family:Inter,Arial,sans-serif';
    d.innerHTML='<div id="etqLtTit" style="font-weight:800;font-size:1rem;text-align:center">📷 Aponte para o QR da etiqueta</div>'
      +'<div style="position:relative;max-width:100%"><video id="etqLtVideo" playsinline autoplay muted style="max-width:100%;max-height:58vh;border-radius:12px;background:#000;display:block"></video>'
      +'<div style="position:absolute;inset:18%;border:3px solid #ffd000;border-radius:14px;pointer-events:none"></div></div>'
      +'<div id="etqLtMsg" style="text-align:center;font-size:.92rem;min-height:2.6em;max-width:440px;line-height:1.35"></div>'
      +'<div style="display:flex;gap:8px;width:100%;max-width:440px"><input id="etqLtCod" placeholder="ou digite o código (ex.: K7Q3MD)" maxlength="12" style="flex:1;padding:11px;border-radius:10px;border:1px solid #555;background:#111;color:#fff;font-size:1rem;text-transform:uppercase">'
      +'<button type="button" id="etqLtOk" style="border:none;border-radius:10px;padding:0 14px;font-weight:800;background:#ffd000;color:#000">OK</button></div>'
      +'<button type="button" id="etqLtFechar" style="border:1px solid #666;background:#222;color:#fff;border-radius:12px;padding:12px 22px;font-weight:800;font-size:.98rem">Terminei</button>';
    document.body.appendChild(d);
    el('etqLtFechar').onclick=fechar;
    el('etqLtOk').onclick=()=>{ const v=idDe(el('etqLtCod').value); if(v.length>=4){ el('etqLtCod').value=''; entregar(v,true); } };
    el('etqLtCod').onkeydown=e=>{ if(e.key==='Enter') el('etqLtOk').click(); };
  }
  function msg(t){ const m=el('etqLtMsg'); if(m) m.innerHTML=t; }
  function entregar(id,digitado){
    const agora=Date.now(); if(!digitado&&id===ultimo&&agora-ultimoMs<4000) return; ultimo=id; ultimoMs=agora;
    try{ navigator.vibrate&&navigator.vibrate(80); }catch(e){}
    if(!opcoes.continuo) fechar();
    try{ aoLer&&aoLer(id); }catch(e){}
  }
  function carregarJsQR(){ return new Promise(res=>{ if(window.jsQR) return res(true); const s=document.createElement('script'); s.src='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js'; s.onload=()=>res(true); s.onerror=()=>res(false); document.head.appendChild(s); }); }
  async function laco(){
    if(!rodando) return; const v=el('etqLtVideo');
    try{
      if(v.readyState>=2){
        let txt='';
        if(detector){ const r=await detector.detect(v); if(r&&r[0]) txt=r[0].rawValue; }
        else if(window.jsQR){ canvas=canvas||document.createElement('canvas'); const w=Math.min(640,v.videoWidth), h=Math.round(v.videoHeight*w/v.videoWidth); canvas.width=w; canvas.height=h;
          const c=canvas.getContext('2d',{willReadFrequently:true}); c.drawImage(v,0,0,w,h); const q=window.jsQR(c.getImageData(0,0,w,h).data,w,h,{inversionAttempts:'dontInvert'}); if(q) txt=q.data; }
        if(txt){ const id=idDe(txt); if(id.length>=4) entregar(id,false); }
      }
    }catch(e){}
    if(rodando) setTimeout(laco,180);
  }
  async function abrir(cb,op){
    montar(); aoLer=cb; opcoes=op||{}; ultimo=''; el('etqLtTit').textContent=opcoes.titulo||'📷 Aponte para o QR da etiqueta';
    el('etqLeitor').style.display='flex'; msg(opcoes.msg||'Leia um pacote de cada vez. Se a câmera não ler, digite o código que fica embaixo do QR.');
    if(!window.isSecureContext||!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){ msg('Não consegui abrir a câmera aqui. Digite o código que fica embaixo do QR.'); return; }
    try{
      if('BarcodeDetector' in window){ try{ const f=await BarcodeDetector.getSupportedFormats(); if(f.indexOf('qr_code')>=0) detector=new BarcodeDetector({formats:['qr_code']}); }catch(e){ detector=null; } }
      if(!detector&&!(await carregarJsQR())) msg('Sem leitor de QR neste celular. Digite o código que fica embaixo do QR.');
      stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280}},audio:false});
      el('etqLtVideo').srcObject=stream; rodando=true; laco();
    }catch(e){ msg('A câmera não abriu (permissão negada?). Digite o código que fica embaixo do QR.'); }
  }
  function fechar(){ rodando=false; if(stream){ stream.getTracks().forEach(t=>t.stop()); stream=null; } const v=el('etqLtVideo'); if(v) v.srcObject=null; const d=el('etqLeitor'); if(d) d.style.display='none'; if(opcoes.aoFechar) try{ opcoes.aoFechar(); }catch(e){} }
  window.etqLeitorAbrir=abrir; window.etqLeitorFechar=fechar; window.etqLeitorMsg=msg; window.etqIdDe=idDe;
})();
