/* ════════════════════════════════════════════════════════════════
   DINA PIZZA — ESCALAS: regras, cálculos e desenho da tabela
   Usado por escala.html (gerentes) e painel_escalas.html (gestão)
   ════════════════════════════════════════════════════════════════ */

// URL do Apps Script "Dina Pizza — Escalas" (Implantar > App da Web > URL /exec)
const ESCALA_SCRIPT_URL = 'COLE_AQUI_A_URL_DO_APPS_SCRIPT_DE_ESCALAS';

const ESCALA_UNIDADES = ["Isaac Manhã","Isaac Noite","Água Verde","Uberaba","Campo Largo","Capão Raso","São José dos Pinhais","Expressa","Fazenda Rio Grande","Colombo","Araucária"];

const ESCALA_FUNCOES = ["Pizzaiolo","Cozinha","Buffet","Atendimento","Caixa","Delivery / Motoboy","Limpeza","Gerente","Outro"];

const DIAS_CURTO = ['SEG','TER','QUA','QUI','SEX','SÁB','DOM'];
const DIAS_LONGO = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];

// Regras por período. A convenção da categoria autoriza 8h24 (42 h) na transição.
const ESCALA_REGRAS = {
  atual: {
    id: 'atual', nome: 'Regra atual · 44 h', curto: '44 h · 1 folga',
    semanal: 44, diaria: 8, folgasMin: 1, maxSeguidos: 6,
    descricao: 'Até 16/12/2026: 44 h por semana, 8 h por dia, 1 folga semanal, no máximo 6 dias seguidos.'
  },
  transicao: {
    id: 'transicao', nome: 'Nova regra · 42 h', curto: '42 h · 2 folgas',
    semanal: 42, diaria: 8.4, folgasMin: 2, maxSeguidos: 5,
    descricao: 'A partir de 17/12/2026 (EC 141/2026, com convenção que autoriza 8h24): 42 h por semana, 2 folgas, no máximo 5 dias seguidos.'
  },
  final: {
    id: 'final', nome: 'Nova regra · 40 h', curto: '40 h · 2 folgas',
    semanal: 40, diaria: 8, folgasMin: 2, maxSeguidos: 5,
    descricao: 'A partir de 17/12/2027 (EC 141/2026): 40 h por semana, 8 h por dia, 2 folgas, no máximo 5 dias seguidos.'
  }
};
const DATA_TRANSICAO = '2026-12-17';
const DATA_FINAL     = '2027-12-17';

const TURNOS_PADRAO = [
  { id: 't1', nome: 'Almoço',  p: [['10:00','15:00']] },
  { id: 't2', nome: 'Noite',   p: [['18:00','23:30']] },
  { id: 't3', nome: 'Dobra',   p: [['11:00','15:00'],['19:00','23:00']] },
];

// Horários em que a tabela conta quantas pessoas estão trabalhando
const COBERTURA = [
  { label: 'Almoço (12h)', min: 12 * 60 },
  { label: 'Noite (20h)',  min: 20 * 60 },
];

/* ─────────────── Datas ─────────────── */
function eDataLocal(chave){ const [y,m,d]=chave.split('-').map(Number); return new Date(y,m-1,d); }
function eChave(dt){ return dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0'); }
function eSomarDias(chave,n){ const d=eDataLocal(chave); d.setDate(d.getDate()+n); return eChave(d); }
function eSegundaDe(dt){ const d=new Date(dt.getFullYear(),dt.getMonth(),dt.getDate()); const w=(d.getDay()+6)%7; d.setDate(d.getDate()-w); return eChave(d); }
function eDiaMes(chave){ const d=eDataLocal(chave); return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0'); }
function eDataBR(chave){ const d=eDataLocal(chave); return eDiaMes(chave)+'/'+d.getFullYear(); }
function eTituloSemana(chave){ return eDiaMes(chave)+' a '+eDataBR(eSomarDias(chave,6)); }

function eRegraDaSemana(chave){
  const domingo = eSomarDias(chave,6);
  if (domingo < DATA_TRANSICAO) return 'atual';
  if (domingo < DATA_FINAL) return 'transicao';
  return 'final';
}

/* ─────────────── Horas ─────────────── */
function eMin(hhmm){ if(!hhmm) return null; const [h,m]=String(hhmm).split(':').map(Number); return h*60+(m||0); }
function eFmtH(min){
  min=Math.round(min||0);
  const neg=min<0; min=Math.abs(min);
  const h=Math.floor(min/60), m=min%60;
  return (neg?'-':'')+h+'h'+(m?String(m).padStart(2,'0'):'');
}
function eSobrepor(a,b,c,d){ return Math.max(0, Math.min(b,d)-Math.max(a,c)); }
function eEsc(s){ return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function eTextoCelula(cell){
  if(!cell) return '';
  if(cell.t==='folga') return 'Folga';
  if(cell.t==='ferias') return 'Férias';
  if(cell.t==='atestado') return 'Afastado';
  if(cell.t==='trab') return (cell.p||[]).filter(p=>p&&p[0]&&p[1]).map(p=>p[0]+'–'+p[1]).join(' / ');
  return '';
}

/* ─────────────── Análise de um dia ───────────────
   Devolve minutos trabalhados, noturnos (22h–5h), minutos "contábeis"
   (hora noturna de 52min30 conta como 1 h), início/fim absolutos e alertas. */
function eCalcDia(cell, regra){
  const r={ tipo: cell?cell.t:null, trab:false, min:0, noturnos:0, contab:0, ini:null, fim:null, abs:[], erros:[], avisos:[], info:[] };
  if(!cell || cell.t!=='trab') return r;
  const ps=(cell.p||[]).filter(p=>p&&p[0]&&p[1]);
  if(!ps.length){ r.erros.push('Horário incompleto'); return r; }
  r.trab=true;
  const abs=[];
  ps.forEach((p,i)=>{
    let a=eMin(p[0]), b=eMin(p[1]);
    if(i>0){ while(a<abs[i-1][1]) a+=1440; }
    while(b<=a) b+=1440;
    abs.push([a,b]);
  });
  r.abs=abs;
  let bruto=0, noturno=0;
  abs.forEach(([a,b])=>{
    bruto+=b-a;
    noturno+=eSobrepor(a,b,0,300)+eSobrepor(a,b,1320,1740)+eSobrepor(a,b,2760,3180);
  });
  let diurno=bruto-noturno;

  if(abs.length===1){
    // período único: o intervalo fica dentro do horário
    let ded=0;
    if(bruto>360){ ded=60; r.info.push('Inclui 1 h de intervalo'); }
    else if(bruto>240){ ded=15; r.info.push('Inclui 15 min de intervalo'); }
    const doDia=Math.min(ded,diurno); diurno-=doDia; noturno-=Math.min(ded-doDia,noturno);
  } else {
    const gaps=[]; for(let i=1;i<abs.length;i++) gaps.push(abs[i][0]-abs[i-1][1]);
    const menor=Math.min(...gaps), maior=Math.max(...gaps);
    if(bruto>360 && menor<60) r.erros.push('Intervalo de '+eFmtH(menor)+' — acima de 6 h de trabalho o mínimo é 1 h (CLT art. 71)');
    if(maior>120) r.avisos.push('Intervalo de '+eFmtH(maior)+' — acima de 2 h só com acordo escrito ou convenção (CLT art. 71)');
  }
  r.min=diurno+noturno;
  r.noturnos=noturno;
  r.contab=diurno+noturno*60/52.5;
  r.ini=abs[0][0]; r.fim=abs[abs.length-1][1];
  if(noturno>0) r.info.push(eFmtH(noturno)+' noturnas (adicional de 20%)');

  const limite=regra.diaria*60;
  if(r.contab>limite+120+0.5) r.erros.push(eFmtH(r.contab)+' no dia — passa do máximo de '+eFmtH(limite+120)+' (jornada + 2 h extras, CLT art. 59)');
  else if(r.contab>limite+10) r.avisos.push(eFmtH(r.contab)+' no dia — '+eFmtH(r.contab-limite)+' de hora extra');
  return r;
}

function eTrab(cell){ return !!(cell && cell.t==='trab' && (cell.p||[]).some(p=>p&&p[0]&&p[1])); }

/* ─────────────── Análise de uma pessoa na semana ───────────────
   prev = [células da semana anterior, células de 2 semanas atrás] (ou null) */
function eCalcPessoa(pessoa, cells, prev, regra){
  cells=cells||[null,null,null,null,null,null,null];
  const dias=cells.map(c=>eCalcDia(c,regra));
  const erros=[], avisos=[];
  dias.forEach((d,i)=>{ d.erros.forEach(m=>erros.push({msg:m,dia:i})); d.avisos.forEach(m=>avisos.push({msg:m,dia:i})); });

  const cont={folga:0,trab:0,ferias:0,atestado:0,vazio:0};
  cells.forEach(c=>{ if(!c||!c.t) cont.vazio++; else if(c.t==='trab') cont.trab++; else cont[c.t]=(cont[c.t]||0)+1; });
  const total=dias.reduce((s,d)=>s+d.contab,0);
  const noturnos=dias.reduce((s,d)=>s+d.noturnos,0);
  const afastado=cont.ferias+cont.atestado>0;
  const contrato=Number(pessoa.horasContrato)||regra.semanal;

  if(cont.vazio>0) avisos.push({msg:cont.vazio+(cont.vazio>1?' dias':' dia')+' sem definir',dia:null,vazio:true});

  if(!afastado){
    if(cont.folga+cont.vazio<regra.folgasMin)
      erros.push({msg:cont.folga+(cont.folga===1?' folga':' folgas')+' na semana — a regra pede no mínimo '+regra.folgasMin,dia:null});
    const lim=Math.min(contrato,regra.semanal)*60;
    if(total>lim+10) avisos.push({msg:eFmtH(total)+' na semana — '+eFmtH(total-lim)+' de hora extra (limite de '+Math.min(contrato,regra.semanal)+' h)',dia:null});
  }
  if(Number(pessoa.horasContrato)>regra.semanal)
    avisos.push({msg:'Contrato de '+pessoa.horasContrato+' h passa do limite de '+regra.semanal+' h da regra — ajustar o contrato',dia:null});

  // Dias seguidos (considera o fim da semana anterior, se houver)
  const p0=prev&&prev[0], p1=prev&&prev[1];
  const seq=[]; let off=0;
  if(p0){ for(let i=0;i<7;i++) seq.push(eTrab(p0[i])); off=7; }
  cells.forEach(c=>seq.push(eTrab(c)));
  let run=0, marcado=false;
  for(let i=0;i<seq.length;i++){
    if(seq[i]){ run++; } else { run=0; marcado=false; }
    if(i>=off && run>regra.maxSeguidos && !marcado){
      // conta o tamanho total da sequência
      let j=i; while(j+1<seq.length && seq[j+1]) j++;
      const tot=run+(j-i);
      erros.push({msg:tot+' dias seguidos de trabalho — o máximo é '+regra.maxSeguidos,dia:i-off});
      marcado=true;
    }
  }

  // Descanso entre jornadas (11 h)
  const ant=[];
  if(p0 && eTrab(p0[6])) ant.push({dia:-1,d:eCalcDia(p0[6],regra)});
  dias.forEach((d,i)=>{ if(d.trab) ant.push({dia:i,d}); });
  for(let k=1;k<ant.length;k++){
    const A=ant[k-1], B=ant[k];
    if(B.dia-A.dia!==1) continue;
    const desc=(B.dia*1440+B.d.ini)-(A.dia*1440+A.d.fim);
    if(desc<660){
      const nomeA=A.dia<0?'domingo anterior':DIAS_LONGO[A.dia].toLowerCase();
      erros.push({msg:'Descanso de '+eFmtH(desc)+' entre '+nomeA+' e '+DIAS_LONGO[B.dia].toLowerCase()+' — mínimo 11 h (CLT art. 66)',dia:B.dia});
    }
  }

  // Domingos
  if(eTrab(cells[6])){
    if(pessoa.domingo==='mulher'){
      if(p0 && eTrab(p0[6])) erros.push({msg:'2º domingo seguido de trabalho — para mulheres a folga é domingo sim, domingo não (CLT art. 386)',dia:6});
    } else if(p0 && p1 && eTrab(p0[6]) && eTrab(p1[6])){
      erros.push({msg:'3º domingo seguido de trabalho — precisa folgar 1 domingo a cada 3 semanas',dia:6});
    }
  }

  return { dias, erros, avisos, total, noturnos, cont, afastado, contrato };
}

/* ─────────────── Análise da escala inteira ─────────────── */
function ePessoasDaEscala(equipe, grade){
  grade=grade||{};
  const lista=(equipe||[]).filter(p=>p.ativo!==false || (grade[p.id]||[]).some(c=>c&&c.t));
  const ids=new Set(lista.map(p=>p.id));
  // pessoas que aparecem na grade mas foram apagadas da equipe
  Object.keys(grade).forEach(id=>{ if(!ids.has(id) && (grade[id]||[]).some(c=>c&&c.t)) lista.push({id,nome:'(removido)',funcao:'',ativo:false}); });
  return lista;
}

function eAnalisar(equipe, grade, anteriores, regraId){
  const regra=ESCALA_REGRAS[regraId]||ESCALA_REGRAS.atual;
  grade=grade||{};
  const pessoas=ePessoasDaEscala(equipe,grade);
  const porPessoa={};
  let erros=0, avisos=0, vazios=0, total=0;
  pessoas.forEach(p=>{
    const prev=[0,1].map(n=>anteriores&&anteriores[n]&&anteriores[n].grade?(anteriores[n].grade[p.id]||null):null);
    const r=eCalcPessoa(p, grade[p.id], prev, regra);
    porPessoa[p.id]=r;
    erros+=r.erros.length;
    avisos+=r.avisos.filter(a=>!a.vazio).length;
    vazios+=r.cont.vazio;
    total+=r.total;
  });
  const cobertura=[0,1,2,3,4,5,6].map(i=>{
    const c={ total:0, pontos:COBERTURA.map(()=>0), funcoes:{} };
    pessoas.forEach(p=>{
      const d=porPessoa[p.id].dias[i];
      if(!d.trab) return;
      c.total++;
      c.funcoes[p.funcao||'Outro']=(c.funcoes[p.funcao||'Outro']||0)+1;
      COBERTURA.forEach((pt,k)=>{ if(d.abs.some(([a,b])=>(pt.min>=a&&pt.min<b)||(pt.min+1440>=a&&pt.min+1440<b))) c.pontos[k]++; });
    });
    return c;
  });
  return { regra, pessoas, porPessoa, erros, avisos, vazios, horasTotal:Math.round(total/6)/10, cobertura };
}

/* ─────────────── Linhas para a planilha e texto do WhatsApp ─────────────── */
function eDetalhe(analise, grade, semana){
  const rows=[];
  analise.pessoas.forEach(p=>{
    const cells=grade[p.id]||[];
    const r=analise.porPessoa[p.id];
    for(let i=0;i<7;i++){
      const c=cells[i];
      const sit=!c||!c.t?'Sem definir':c.t==='trab'?'Trabalha':eTextoCelula(c);
      rows.push({ data:eDataBR(eSomarDias(semana,i)), dia:DIAS_LONGO[i], pessoa:p.nome, funcao:p.funcao||'',
        situacao:sit, horario:c&&c.t==='trab'?eTextoCelula(c):'',
        horas:r.dias[i].trab?Math.round(r.dias[i].contab/6)/10:0, noturnas:r.dias[i].trab?Math.round(r.dias[i].noturnos/6)/10:0 });
    }
  });
  return rows;
}

function eTextoWhatsApp(unidade, semana, analise, grade){
  let t='*Escala — Dina Pizza '+unidade+'*\nSemana de '+eTituloSemana(semana)+'\n';
  for(let i=0;i<7;i++){
    t+='\n*'+DIAS_LONGO[i]+' '+eDiaMes(eSomarDias(semana,i))+'*\n';
    const trab=[], folga=[];
    analise.pessoas.forEach(p=>{
      const c=(grade[p.id]||[])[i];
      if(eTrab(c)) trab.push('• '+p.nome+': '+eTextoCelula(c));
      else if(c&&c.t) folga.push(p.nome+(c.t==='folga'?'':' ('+eTextoCelula(c).toLowerCase()+')'));
    });
    t+=trab.length?trab.join('\n')+'\n':'• ninguém escalado\n';
    if(folga.length) t+='Folga: '+folga.join(', ')+'\n';
  }
  return t;
}

/* ─────────────── Tabela ───────────────
   opts: { equipe, grade, analise, semana, editavel, onCelula(id,dia), onPessoa(id) } */
function eRenderGrade(el, o){
  const a=o.analise, hoje=eChave(new Date());
  let h='<table class="eg"><thead><tr><th class="eg-pes">Equipe</th>';
  for(let i=0;i<7;i++){
    const ch=eSomarDias(o.semana,i);
    h+='<th class="'+(i===6?'eg-dom ':'')+(ch===hoje?'eg-hoje':'')+'"><div>'+DIAS_CURTO[i]+'</div><small>'+eDiaMes(ch)+'</small></th>';
  }
  h+='<th class="eg-tot">Semana</th></tr></thead><tbody>';
  if(!a.pessoas.length){
    h+='<tr><td colspan="9" class="eg-vazia">Nenhuma pessoa cadastrada. Cadastre a equipe na aba <b>Equipe</b>.</td></tr>';
  }
  a.pessoas.forEach(p=>{
    const r=a.porPessoa[p.id];
    const cells=(o.grade[p.id])||[];
    const temErro=r.erros.length>0;
    h+='<tr><td class="eg-pes'+(o.onPessoa?' eg-click':'')+'" data-p="'+eEsc(p.id)+'"><div class="eg-nome">'+eEsc(p.nome)+'</div><small>'+eEsc(p.funcao||'')+(p.domingo==='mulher'?' · ♀':'')+'</small></td>';
    for(let i=0;i<7;i++){
      const c=cells[i], d=r.dias[i];
      const errDia=r.erros.some(e=>e.dia===i), avDia=r.avisos.some(e=>e.dia===i);
      let cls='eg-c', txt='';
      if(!c||!c.t){ cls+=' eg-vz'; txt=o.editavel?'<span class="eg-mais">+</span>':'—'; }
      else if(c.t==='folga'){ cls+=' eg-folga'; txt='FOLGA'; }
      else if(c.t==='ferias'){ cls+=' eg-ferias'; txt='FÉRIAS'; }
      else if(c.t==='atestado'){ cls+=' eg-ferias'; txt='AFASTADO'; }
      else { cls+=' eg-trab'; txt=(c.p||[]).filter(x=>x&&x[0]&&x[1]).map(x=>'<div>'+x[0]+'–'+x[1]+'</div>').join('')+'<small>'+eFmtH(d.contab)+'</small>'; }
      if(errDia) cls+=' eg-err'; else if(avDia) cls+=' eg-av';
      h+='<td class="'+cls+(o.editavel?' eg-click':'')+'" data-p="'+eEsc(p.id)+'" data-d="'+i+'">'+txt+'</td>';
    }
    const lim=Math.min(r.contrato,a.regra.semanal);
    h+='<td class="eg-tot'+(temErro?' eg-err':'')+'"><b>'+eFmtH(r.total)+'</b><small>de '+lim+'h · '+r.cont.folga+' folga'+(r.cont.folga===1?'':'s')+'</small></td></tr>';
  });
  h+='</tbody><tfoot><tr><td class="eg-pes">Trabalhando</td>';
  a.cobertura.forEach(c=>{ h+='<td><b>'+c.total+'</b></td>'; });
  h+='<td></td></tr>';
  COBERTURA.forEach((pt,k)=>{
    h+='<tr><td class="eg-pes">'+pt.label+'</td>';
    a.cobertura.forEach(c=>{ h+='<td>'+c.pontos[k]+'</td>'; });
    h+='<td></td></tr>';
  });
  h+='</tfoot></table>';
  el.innerHTML=h;
  if(o.editavel && o.onCelula) el.querySelectorAll('td.eg-c').forEach(td=>td.addEventListener('click',()=>o.onCelula(td.dataset.p,Number(td.dataset.d))));
  if(o.onPessoa) el.querySelectorAll('td.eg-pes[data-p]').forEach(td=>td.addEventListener('click',()=>o.onPessoa(td.dataset.p)));
}

/* Lista de alertas agrupada por pessoa */
function eRenderAlertas(el, a){
  let h='';
  a.pessoas.forEach(p=>{
    const r=a.porPessoa[p.id];
    const lista=[...r.erros.map(e=>({...e,tipo:'err'})), ...r.avisos.filter(x=>!x.vazio).map(e=>({...e,tipo:'av'}))];
    if(!lista.length) return;
    h+='<div class="ea-p"><div class="ea-nome">'+eEsc(p.nome)+'</div>';
    lista.forEach(e=>{ h+='<div class="ea-i ea-'+e.tipo+'"><span>'+(e.tipo==='err'?'✖':'!')+'</span><div>'+(e.dia!=null&&e.dia>=0?'<b>'+DIAS_CURTO[e.dia]+'</b> · ':'')+eEsc(e.msg)+'</div></div>'; });
    h+='</div>';
  });
  el.innerHTML=h||'<div class="ea-ok">✔ Nenhum problema encontrado nas regras conferidas.</div>';
}

/* ─────────────── Comunicação com o Apps Script ─────────────── */
function eJsonp(params, timeoutMs){
  return new Promise((resolve,reject)=>{
    const cb='escCb_'+Date.now()+'_'+Math.floor(Math.random()*1e6);
    const s=document.createElement('script');
    const t=setTimeout(()=>{ limpar(); reject(new Error('Tempo esgotado ao falar com o servidor')); }, timeoutMs||20000);
    function limpar(){ clearTimeout(t); delete window[cb]; if(s.parentNode) s.parentNode.removeChild(s); }
    window[cb]=(resp)=>{ limpar(); resolve(resp); };
    s.onerror=()=>{ limpar(); reject(new Error('Não foi possível conectar ao servidor')); };
    const q=Object.entries(params).map(([k,v])=>encodeURIComponent(k)+'='+encodeURIComponent(v)).join('&');
    s.src=ESCALA_SCRIPT_URL+'?'+q+'&t='+Date.now()+'&callback='+cb;
    document.head.appendChild(s);
  });
}

async function ePost(payload){
  const resp=await fetch(ESCALA_SCRIPT_URL,{method:'POST',body:JSON.stringify(payload)});
  const txt=await resp.text();
  let j=null; try{ j=JSON.parse(txt); }catch(e){}
  if(!resp.ok || !j || j.ok===false) throw new Error((j&&j.erro)||('HTTP '+resp.status));
  return j;
}

function eNovoId(){ return 'p'+Date.now().toString(36)+Math.floor(Math.random()*1e4).toString(36); }
