/* Desenho da etiqueta 60×60 mm (BOPP, Zebra ZD220 transferência térmica) — 25/11/2026.
   etqEtiquetaHtml(e) devolve o HTML de UMA etiqueta (o objeto vem do servidor: etqImprimir/etqReimprimir/etqVer).
   etqImprimirLista(lista) põe as etiquetas na área #etqImpressao e abre a impressão do navegador (página 60×60 mm, sem margem).
   Precisa do qrcode.js. Tudo em preto (impressora de 1 cor). */
(function(){
  const css='.etq{width:60mm;height:60mm;box-sizing:border-box;padding:1.4mm 1.6mm;background:#fff;color:#000;font-family:Arial,Helvetica,sans-serif;overflow:hidden;position:relative;display:flex;flex-direction:column;gap:.7mm;line-height:1.12}'
   +'.etq *{box-sizing:border-box}'
   +'.etq-top{display:flex;gap:1.4mm;align-items:center;height:10.5mm}.etq-top img{height:10mm;width:auto;flex:none}'
   +'.etq-nome{font-weight:900;font-size:8.6pt;line-height:1.05;text-transform:uppercase;overflow:hidden;max-height:9.4mm}'
   +'.etq-cod{font-size:5pt;font-weight:700;margin-top:.3mm}'
   +'.etq-est{display:flex;justify-content:space-between;align-items:center;border:.35mm solid #000;border-radius:1mm;padding:.5mm 1mm;height:6mm}'
   +'.etq-est b{font-size:8pt;letter-spacing:.02em}.etq-est small{display:block;font-size:4.6pt;font-weight:700}.etq-peso{font-weight:900;font-size:9pt;white-space:nowrap}'
   +'.etq-val{background:#000;color:#fff;border-radius:1mm;padding:.6mm 1.4mm;height:11mm;display:flex;flex-direction:column;justify-content:center}'
   +'.etq-val small{font-size:5.2pt;font-weight:800;letter-spacing:.06em}.etq-val b{font-size:13.5pt;font-weight:900;letter-spacing:.01em}.etq-val b span{font-size:8.5pt}'
   +'.etq-val i{font-style:normal;font-size:4.8pt;font-weight:800;border:.25mm solid #fff;border-radius:.6mm;padding:0 .6mm;margin-left:1mm;vertical-align:middle}'
   +'.etq-g{display:grid;grid-template-columns:1fr 1fr;gap:.2mm 1.4mm;font-size:5.4pt}.etq-g div{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.etq-g b{font-weight:900}'
   +'.etq-al{font-size:5.2pt;font-weight:900;line-height:1.1;max-height:4.4mm;overflow:hidden}'
   +'.etq-pe{display:flex;gap:1.2mm;flex:1;min-height:0;align-items:flex-end}'
   +'.etq-un{flex:1;font-size:4.5pt;line-height:1.15;overflow:hidden;align-self:stretch;display:flex;flex-direction:column;justify-content:flex-end}.etq-un b{font-size:4.9pt}'
   +'.etq-qr{width:15.5mm;flex:none;text-align:center}.etq-qr svg{width:15.5mm;height:15.5mm;display:block}.etq-qr div{font-family:ui-monospace,Menlo,Consolas,monospace;font-weight:900;font-size:6.6pt;letter-spacing:.06em;margin-top:.2mm}'
   +'#etqImpressao{display:none}'
   +'@media print{@page{size:60mm 60mm;margin:0}html,body{background:#fff!important;margin:0!important;padding:0!important}body>*{display:none!important}#etqImpressao{display:block!important}#etqImpressao .etq{page-break-after:always;break-after:page}}';
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
  function esc(t){ return String(t==null?'':t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function qr(t){ try{ const q=qrcode(0,'M'); q.addData(t); q.make(); return q.createSvgTag({cellSize:4,margin:0,scalable:true}); }catch(e){ return ''; } }
  function kg(p){ return p==null?'':Number(p).toLocaleString('pt-BR',{minimumFractionDigits:3,maximumFractionDigits:3})+' kg'; }
  function curta(d){ const m=String(d||'').match(/^(\d{2})\/(\d{2})\/\d{2}(\d{2}) (\d{2}:\d{2})$/); return m?m[1]+'/'+m[2]+'/'+m[3]+' '+m[4]:d; }
  window.etqEtiquetaHtml=function(e,logo){
    return '<div class="etq">'
      +'<div class="etq-top"><img src="'+(logo||'logo-etiqueta.png')+'" alt=""><div><div class="etq-nome">'+esc(e.produto)+'</div><div class="etq-cod">Cód. '+esc(e.codigo)+'</div></div></div>'
      +'<div class="etq-est"><div><b>'+esc(String(e.estadoNome||'').toUpperCase())+'</b><small>'+esc(e.conservacao)+'</small></div><div class="etq-peso">'+kg(e.peso)+'</div></div>'
      +'<div class="etq-val"><small>NOVA VALIDADE'+(e.valTeste?'<i>VALIDADE DE TESTE</i>':'')+'</small><b>'+esc(e.validadeData)+' <span>'+esc(e.validadeHora)+'</span></b></div>'
      +'<div class="etq-g"><div>Manipulação: <b>'+esc(curta(e.manipulacao))+'</b></div><div>Val. original: <b>'+esc(e.valOriginal||'—')+'</b></div>'
      +'<div>Lote: <b>'+esc(e.lote)+'</b></div><div>Resp.: <b>'+esc(e.responsavel)+'</b></div></div>'
      +'<div class="etq-al">'+esc(e.alergenicos)+'</div>'
      +'<div class="etq-pe"><div class="etq-un"><div>Forn.: '+esc(e.fornecedor)+(e.sif?' · SIF '+esc(e.sif):'')+'</div><b>'+esc(e.unidade)+'</b><div>'+(e.cnpj?'CNPJ '+esc(e.cnpj):'')+'</div><div>'+esc(e.endereco)+'</div></div>'
      +'<div class="etq-qr">'+qr(e.qr)+'<div>'+esc(e.id)+'</div></div></div>'
      +'</div>';
  };
  window.etqImprimirLista=function(lista){
    let d=document.getElementById('etqImpressao'); if(!d){ d=document.createElement('div'); d.id='etqImpressao'; document.body.appendChild(d); }
    d.innerHTML=(lista||[]).map(e=>etqEtiquetaHtml(e)).join('');
    const imgs=[].slice.call(d.querySelectorAll('img')); let n=imgs.length, feito=false;
    const ir=()=>{ if(feito) return; feito=true; setTimeout(()=>window.print(),80); };
    if(!n) return ir(); imgs.forEach(i=>{ if(i.complete) { if(--n===0) ir(); } else { i.onload=i.onerror=()=>{ if(--n===0) ir(); }; } }); setTimeout(ir,2500);
  };
})();
