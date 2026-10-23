/* ════════════════════════════════════════════════════════════════
   DINA PIZZA — ESCALAS: regras, cálculos e desenho da tabela
   Usado por escala.html (gerentes) e painel_escalas.html (gestão)
   ════════════════════════════════════════════════════════════════ */

// URL do Apps Script do placar (as escalas ficam no mesmo script e na mesma planilha)
const ESCALA_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby-MpaSNNJ_hb4Vw6X139dBGR_PmBFD8gXJwSfxgbuis9ulOEuN6Rcdg4_D6BbBwuFc/exec'; // mesmo script do placar

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

// Opções da unidade (vêm das preferências salvas): intervalo de refeição e regra de domingo
const ESCALA_OPCOES = { intervalo: 30, domingo: 'mes' };
function eSetOpcoes(g){
  g=g||{};
  ESCALA_OPCOES.intervalo = Number(g.intervalo)===60 ? 60 : 30;
  ESCALA_OPCOES.domingo   = g.domingo==='lei' ? 'lei' : 'mes';
}
const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

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
    if(bruto>360){ ded=ESCALA_OPCOES.intervalo; r.info.push('Inclui '+(ded===60?'1 h':ded+' min')+' de intervalo'); }
    else if(bruto>240){ ded=15; r.info.push('Inclui 15 min de intervalo'); }
    const doDia=Math.min(ded,diurno); diurno-=doDia; noturno-=Math.min(ded-doDia,noturno);
  } else {
    const gaps=[]; for(let i=1;i<abs.length;i++) gaps.push(abs[i][0]-abs[i-1][1]);
    const menor=Math.min(...gaps), maior=Math.max(...gaps);
    const minInt=ESCALA_OPCOES.intervalo;
    if(bruto>360 && menor<minInt) r.erros.push('Intervalo de '+eFmtH(menor)+' — acima de 6 h de trabalho o mínimo é '+(minInt===60?'1 h (CLT art. 71)':minInt+' min (convenção)'));
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
   prev = [células de 1, 2, 3 e 4 semanas atrás] (ou null); semana = segunda-feira (AAAA-MM-DD) */
function eDomingosDoMes(semana){
  // domingos do mês do domingo desta semana: { lista:[chaves], idx:posição deste domingo }
  const dom=eSomarDias(semana,6), d=eDataLocal(dom), m=d.getMonth();
  const lista=[]; let k=eSomarDias(dom,-7*Math.floor((d.getDate()-1)/7));
  while(eDataLocal(k).getMonth()===m){ lista.push(k); k=eSomarDias(k,7); }
  return { lista, idx:lista.indexOf(dom), mes:m };
}
function eFolgouDomingo(cell){ return !!(cell && (cell.t==='folga'||cell.t==='ferias'||cell.t==='atestado')); }

function eCalcPessoa(pessoa, cells, prev, regra, semana){
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
  if(ESCALA_OPCOES.domingo==='mes'){
    // 1 domingo de folga por mês: confere no último domingo do mês
    if(semana){
      const dm=eDomingosDoMes(semana);
      if(dm.idx===dm.lista.length-1 && cells[6] && cells[6].t){
        let folgas=0, desconhecido=false;
        for(let n=0;n<=dm.idx;n++){
          const c=n===0?cells:(prev&&prev[n-1]);
          if(!c){ desconhecido=true; continue; }
          if(eFolgouDomingo(c[6])) folgas++;
        }
        if(!folgas && !desconhecido) erros.push({msg:'Nenhum domingo de folga em '+MESES[dm.mes]+' — cada colaborador tem 1 domingo de folga por mês',dia:6});
      }
    }
  } else if(eTrab(cells[6])){
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

function eAnalisar(equipe, grade, anteriores, regraId, semana){
  const regra=ESCALA_REGRAS[regraId]||ESCALA_REGRAS.atual;
  grade=grade||{};
  const pessoas=ePessoasDaEscala(equipe,grade);
  const porPessoa={};
  let erros=0, avisos=0, vazios=0, total=0;
  pessoas.forEach(p=>{
    const prev=[0,1,2,3].map(n=>anteriores&&anteriores[n]&&anteriores[n].grade?(anteriores[n].grade[p.id]||null):null);
    const r=eCalcPessoa(p, grade[p.id], prev, regra, semana);
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
  if(!resp.ok || !j || j.ok!==true) throw new Error((j&&j.erro)||(j&&j.status?'o Apps Script publicado não tem a parte das escalas':'HTTP '+resp.status));
  return j;
}

function eNovoId(){ return 'p'+Date.now().toString(36)+Math.floor(Math.random()*1e4).toString(36); }

/* ════════════════════════════════════════════════════════════════
   GERADOR AUTOMÁTICO
   O gerente cadastra nome, setor (função) e turno; o gerador distribui
   as folgas da semana respeitando: nº de folgas da regra, dias seguidos,
   rodízio de domingo, dias em que pode folgar e mínimo por setor.
   ════════════════════════════════════════════════════════════════ */

const GERADOR_PADRAO = {
  folgasSemana: 'regra',          // 'regra' (1 até 16/12/2026, 2 depois) | 2
  diasFolga: [0,1,2,3],           // SEG–QUI (domingo entra pelo rodízio da lei)
  juntas: false,                  // preferir as 2 folgas em dias seguidos
  intervalo: 30,                  // intervalo de refeição: 30 min (convenção) | 60
  domingo: 'mes',                 // 'mes' = 1 domingo de folga por mês para cada um | 'lei' = 1 a cada 3 / mulheres alternado
  minimos: {}                     // { setor: { semana: n, fds: n } } — fds = SEX, SÁB, DOM
};

// turnos salvos: aceita o formato antigo (lista) e o novo ({lista, gerador})
function eLerTurnos(t){
  if(Array.isArray(t)) return { lista:t, gerador:JSON.parse(JSON.stringify(GERADOR_PADRAO)) };
  if(t && Array.isArray(t.lista)) return { lista:t.lista, gerador:Object.assign(JSON.parse(JSON.stringify(GERADOR_PADRAO)), t.gerador||{}) };
  return { lista:null, gerador:JSON.parse(JSON.stringify(GERADOR_PADRAO)) };
}

function eNumSemana(chave){ return Math.floor(Math.round(eDataLocal(chave).getTime()/86400000)/7); }

function eCombinacoes(arr,k){
  const out=[];
  (function rec(i,cur){ if(cur.length===k){ out.push(cur.slice()); return; } for(let j=i;j<arr.length;j++){ cur.push(arr[j]); rec(j+1,cur); cur.pop(); } })(0,[]);
  return out;
}

/* opts: { equipe, turnos(lista), gerador, semana, regraId, gradeAtual, anteriores:[{grade}|null, ...] }
   devolve { grade, pendencias:[texto] } */
function eGerarSemana(o){
  const regra=ESCALA_REGRAS[o.regraId]||ESCALA_REGRAS.atual;
  const cfg=Object.assign({},GERADOR_PADRAO,o.gerador||{});
  const F=cfg.folgasSemana==='regra'?regra.folgasMin:Math.max(regra.folgasMin,Number(cfg.folgasSemana)||regra.folgasMin);
  const maxSeg=regra.maxSeguidos;
  const nSem=eNumSemana(o.semana);
  const atual=o.gradeAtual||{};
  const ant=o.anteriores||[null,null,null,null];
  eSetOpcoes(cfg);
  const modoMes=ESCALA_OPCOES.domingo==='mes';
  const dm=eDomingosDoMes(o.semana);
  const pessoas=(o.equipe||[]).filter(p=>p.ativo!==false);
  const turnos=o.turnos&&o.turnos.length?o.turnos:TURNOS_PADRAO;
  const diasOk=new Set((cfg.diasFolga&&cfg.diasFolga.length?cfg.diasFolga:[0,1,2,3]).map(Number));

  // posição de cada pessoa dentro do seu grupo de rodízio de domingo
  // (separado por setor, para não tirar o setor inteiro no mesmo domingo)
  const grupos={};
  pessoas.forEach(p=>{ const k=(p.funcao||'Outro')+'|'+(modoMes?'':(p.domingo==='mulher'?'m':'g')); (grupos[k]=grupos[k]||[]).push(p.id); });

  const info=pessoas.map((p,idx)=>{
    const setor=p.funcao||'Outro';
    const cells=atual[p.id]||[];
    const afast=[0,1,2,3,4,5,6].filter(d=>cells[d]&&(cells[d].t==='ferias'||cells[d].t==='atestado'));
    const livres=[0,1,2,3,4,5,6].filter(d=>!afast.includes(d));
    const nF=Math.min(livres.length, afast.length?Math.max(0,F-afast.length):F);
    const p0=ant[0]&&ant[0].grade?ant[0].grade[p.id]:null, p1=ant[1]&&ant[1].grade?ant[1].grade[p.id]:null;
    let corrida=0; if(p0){ for(let d=6;d>=0&&eTrab(p0[d]);d--) corrida++; }
    const dom0=p0?eTrab(p0[6]):false, dom1=p1?eTrab(p1[6]):false;
    const mulher=!modoMes && p.domingo==='mulher';
    let domObrig=false, domAlvo=false, domJaTeve=false;
    if(modoMes){
      // 1 domingo por mês: cada pessoa do setor fica com um domingo diferente do mês
      // posição contínua passando por todos os setores: espalha os domingos na loja toda e dentro do setor
      const ordemDom=Object.keys(grupos).sort().reduce((l,kk)=>l.concat(grupos[kk]),[]);
      const pos=ordemDom.indexOf(p.id), k=dm.lista.length;
      const alvo=(pos+dm.mes)%k;
      let desconhecido=false;
      for(let n=1;n<=dm.idx;n++){
        const c=ant[n-1]&&ant[n-1].grade?ant[n-1].grade[p.id]:null;
        if(!c){ desconhecido=true; continue; }
        if(eFolgouDomingo(c[6])) domJaTeve=true;
      }
      if(desconhecido && alvo<dm.idx) domJaTeve=true; // domingo dele já passou sem dados: não força
      domAlvo=!domJaTeve && alvo===dm.idx;
      if(!domJaTeve && dm.idx===k-1 && !afast.includes(6)) domObrig=true;   // último domingo do mês e ainda não folgou
    } else {
      if(!afast.includes(6)){
        if(mulher && p0 && dom0) domObrig=true;
        if(!mulher && p0 && p1 && dom0 && dom1) domObrig=true;
      }
      const g=grupos[setor+'|'+(mulher?'m':'g')], ciclo=mulher?2:3;
      domAlvo=(g.indexOf(p.id)+nSem)%ciclo===0;
    }
    const turno=turnos.find(t=>t.id===p.turno)||turnos[0];
    // conjuntos de folga possíveis
    const valido=(S,relaxar)=>{
      if(domObrig && !S.includes(6)) return false;
      if(!relaxar && S.some(d=>d!==6 && !diasOk.has(d))) return false;
      let run=corrida;
      for(let d=0;d<7;d++){
        if(S.includes(d)||afast.includes(d)) run=0; else { run++; if(run>maxSeg) return false; }
      }
      return true;
    };
    // uma folga a mais só entra quando não há outro jeito de cumprir dias seguidos / domingo
    const todas=eCombinacoes(livres,nF);
    const extras=nF<livres.length?eCombinacoes(livres,nF+1):[];
    // (folga a mais custa caro, então só é escolhida para cumprir domingo / dias seguidos)
    let cands=todas.filter(S=>valido(S,false)).concat(extras.filter(S=>valido(S,false)&&(modoMes?S.includes(6):true))), relaxado=false;
    if(!cands.length){ cands=todas.filter(S=>valido(S,true)).concat(extras.filter(S=>valido(S,true))); relaxado=cands.length>0; }
    if(!cands.length){ cands=todas.length?todas:[[]]; relaxado=true; }
    const custoProprio=S=>{
      let c=0;
      const temDom=S.includes(6);
      if(temDom && !domAlvo && !domObrig) c+=modoMes?(domJaTeve?400:120):30;
      if(!temDom && domAlvo) c+=150; // rodízio vale mais que o mínimo: evita o setor todo folgar no mesmo domingo depois
      if(S.length>nF) c+=40;
      if(cfg.juntas && S.length>=2 && !S.some((d,i)=>i>0 && d-S[i-1]===1)) c+=6;
      S.forEach(d=>{ c+=((d+idx+nSem)%7)*0.01; });
      return c;
    };
    return { p, idx, setor, afast, nF, cands, relaxado, turno, custoProprio, escolha:null };
  });

  // contagem de quem está fora (folga ou afastado) por setor e dia
  // e também por turno (para não tirar todo o almoço no mesmo dia)
  const tamSetor={}, fora={}, foraTurno={};
  info.forEach(x=>{
    tamSetor[x.setor]=(tamSetor[x.setor]||0)+1;
    if(!fora[x.setor]) fora[x.setor]=[0,0,0,0,0,0,0];
    if(!foraTurno[x.turno.id]) foraTurno[x.turno.id]=[0,0,0,0,0,0,0];
    x.afast.forEach(d=>{ fora[x.setor][d]++; foraTurno[x.turno.id][d]++; });
  });
  const minimo=(setor,d)=>{ const m=(cfg.minimos||{})[setor]||{}; const v=d>=4?m.fds:m.semana; return Number(v)||0; };
  const custoCobertura=(x,S)=>{
    let c=0;
    S.forEach(d=>{
      const f=fora[x.setor][d];
      const trabalhando=tamSetor[x.setor]-f-1;
      if(trabalhando<minimo(x.setor,d)) c+=100;
      c+=f*4+foraTurno[x.turno.id][d]*3+(d>=4?1:0);
    });
    return c;
  };
  const aplicar=(x,S,sinal)=>S.forEach(d=>{ fora[x.setor][d]+=sinal; foraTurno[x.turno.id][d]+=sinal; });
  const escolher=x=>{
    let melhor=null, mc=Infinity;
    x.cands.forEach(S=>{ const c=x.custoProprio(S)+custoCobertura(x,S); if(c<mc){ mc=c; melhor=S; } });
    x.escolha=melhor; aplicar(x,melhor,1);
  };
  // mais restritos primeiro
  const ordem=info.slice().sort((a,b)=>a.cands.length-b.cands.length||a.idx-b.idx);
  ordem.forEach(escolher);
  for(let it=0;it<4;it++) ordem.forEach(x=>{ aplicar(x,x.escolha,-1); escolher(x); });

  // monta a grade
  const grade={};
  info.forEach(x=>{
    const cells=atual[x.p.id]||[];
    grade[x.p.id]=[0,1,2,3,4,5,6].map(d=>{
      if(x.afast.includes(d)) return JSON.parse(JSON.stringify(cells[d]));
      if(x.escolha.includes(d)) return {t:'folga'};
      return {t:'trab',p:JSON.parse(JSON.stringify(x.turno.p))};
    });
  });

  // pendências de cobertura
  const pend=[];
  Object.keys(tamSetor).forEach(s=>{
    for(let d=0;d<7;d++){
      const trab=tamSetor[s]-fora[s][d], m=minimo(s,d);
      if(trab<m) pend.push(DIAS_CURTO[d]+' '+eDiaMes(eSomarDias(o.semana,d))+': '+s+' com '+trab+' de '+m+' no mínimo');
    }
  });
  info.filter(x=>x.relaxado).forEach(x=>pend.push(x.p.nome+': não coube só nos dias de folga escolhidos, folga caiu em outro dia'));
  return { grade, pendencias:pend };
}
