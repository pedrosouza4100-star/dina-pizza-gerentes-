// ════════════════════════════════════════════════════════════════
// DINA PIZZA — APPS SCRIPT v2.0
// Backend: Checklist + KPIs + Fotos + Configuração editável
// ════════════════════════════════════════════════════════════════

const SPREADSHEET_ID = 'SEU_SPREADSHEET_ID_AQUI'; // substituir
const DRIVE_FOLDER_ID = 'SEU_FOLDER_ID_AQUI';      // substituir
const ADMIN_PASSWORD  = 'dina2024admin';             // trocar para senha sua

// ────────────────────────────────────────────────────────────────
// ROTEADOR PRINCIPAL
// ────────────────────────────────────────────────────────────────
function doGet(e) {
  const acao = e.parameter.acao || '';

  if (acao === 'getConfig')   return jsonResponse(getConfig());
  if (acao === 'getLojas')    return jsonResponse(getLojas());
  if (acao === 'getDados')    return jsonResponse(getDados(e.parameter));
  if (acao === 'ping')        return jsonResponse({ ok: true });

  return jsonResponse({ erro: 'Ação não reconhecida' });
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const acao    = payload.acao || '';

    if (acao === 'salvarChecklist') return jsonResponse(salvarChecklist(payload));
    if (acao === 'salvarKPIs')      return jsonResponse(salvarKPIs(payload));
    if (acao === 'salvarFoto')      return jsonResponse(salvarFoto(payload));
    if (acao === 'salvarCompleto')  return jsonResponse(salvarCompleto(payload));
    if (acao === 'updateConfig')    return jsonResponse(updateConfig(payload));
    if (acao === 'addItem')         return jsonResponse(addItem(payload));
    if (acao === 'removeItem')      return jsonResponse(removeItem(payload));
    if (acao === 'toggleItem')      return jsonResponse(toggleItem(payload));
    if (acao === 'updateLoja')      return jsonResponse(updateLoja(payload));
    if (acao === 'inicializar')     return jsonResponse(inicializarPlanilha());

    return jsonResponse({ erro: 'Ação não reconhecida' });
  } catch(err) {
    return jsonResponse({ erro: err.toString() });
  }
}

// ────────────────────────────────────────────────────────────────
// GET CONFIG — retorna itens do checklist para o frontend
// ────────────────────────────────────────────────────────────────
function getConfig() {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba   = ss.getSheetByName('Checklist_Config');
  const dados = aba.getDataRange().getValues();

  const secoes = {};
  for (let i = 1; i < dados.length; i++) {
    const [id, secao, ordemSec, item, ordemItem, ativo, lojasExcluidas, tipo] = dados[i];
    if (!ativo || String(ativo).toUpperCase() === 'NÃO' || ativo === false) continue;
    if (!secoes[secao]) {
      secoes[secao] = { ordem: ordemSec, itens: [] };
    }
    secoes[secao].itens.push({
      id: String(id),
      label: item,
      ordem: ordemItem,
      lojasExcluidas: lojasExcluidas ? String(lojasExcluidas).split(',').map(s => s.trim()) : [],
      tipo: tipo || 'ambos'
    });
  }

  // Ordenar seções e itens
  const resultado = Object.entries(secoes)
    .sort((a, b) => a[1].ordem - b[1].ordem)
    .map(([nome, data]) => ({
      nome,
      itens: data.itens.sort((a, b) => a.ordem - b.ordem)
    }));

  return { ok: true, secoes: resultado };
}

// ────────────────────────────────────────────────────────────────
// GET LOJAS
// ────────────────────────────────────────────────────────────────
function getLojas() {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba   = ss.getSheetByName('Lojas_Config');
  const dados = aba.getDataRange().getValues();
  const lojas = [];

  for (let i = 1; i < dados.length; i++) {
    const [id, nome, saloes, fliperama, balcao, salaEspera, ativo] = dados[i];
    if (!ativo || String(ativo).toUpperCase() === 'NÃO') continue;
    lojas.push({ id, nome, saloes: Number(saloes),
      fliperama: fliperama === true || String(fliperama).toUpperCase() === 'SIM',
      balcao:    balcao    === true || String(balcao).toUpperCase()    === 'SIM',
      salaEspera:salaEspera=== true || String(salaEspera).toUpperCase()=== 'SIM',
    });
  }
  return { ok: true, lojas };
}

// ────────────────────────────────────────────────────────────────
// SALVAR COMPLETO (abertura + kpis + fechamento + foto)
// ────────────────────────────────────────────────────────────────
function salvarCompleto(payload) {
  salvarChecklist({ ...payload, fase: 'abertura',   checks: payload.abertura });
  salvarChecklist({ ...payload, fase: 'fechamento', checks: payload.fechamento });
  salvarKPIs(payload);
  return { ok: true, msg: 'Relatório completo salvo!' };
}

// ────────────────────────────────────────────────────────────────
// SALVAR CHECKLIST
// ────────────────────────────────────────────────────────────────
function salvarChecklist(payload) {
  const ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba = ss.getSheetByName('Registros_Checklist');
  const ts  = new Date();
  const data = Utilities.formatDate(ts, 'America/Sao_Paulo', 'dd/MM/yyyy');
  const fase = payload.fase || payload.tipo || 'abertura';
  const checks = payload.checks || {};

  Object.entries(checks.checks || checks).forEach(([itemId, status]) => {
    const obs = (checks.obs && checks.obs[itemId]) || '';
    aba.appendRow([ts, data, payload.loja, payload.turno || '', payload.gerente,
                   fase, itemId, status, obs]);
  });

  return { ok: true };
}

// ────────────────────────────────────────────────────────────────
// SALVAR KPIs
// ────────────────────────────────────────────────────────────────
function salvarKPIs(payload) {
  const ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba = ss.getSheetByName('Registros_KPIs');
  const ts  = new Date();
  const data = Utilities.formatDate(ts, 'America/Sao_Paulo', 'dd/MM/yyyy');
  const k   = payload.kpis || {};

  aba.appendRow([ts, data, payload.loja, payload.turno || '', payload.gerente,
    k.faturamento || '', k.pedidos || '', k.motoboys || '',
    k.tempoEntrega || '', k.nota || '', k.startDina || '',
    k.destaque || '', k.obs || '']);

  return { ok: true };
}

// ────────────────────────────────────────────────────────────────
// SALVAR FOTO NO DRIVE
// ────────────────────────────────────────────────────────────────
function salvarFoto(payload) {
  const folder   = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const bytes    = Utilities.base64Decode(payload.base64);
  const blob     = Utilities.newBlob(bytes, payload.mimeType, payload.nomeArquivo);
  const arquivo  = folder.createFile(blob);
  arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const url      = arquivo.getUrl();

  // Log na planilha
  const ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba = ss.getSheetByName('Fotos_Log');
  const ts  = new Date();
  const data = Utilities.formatDate(ts, 'America/Sao_Paulo', 'dd/MM/yyyy');
  aba.appendRow([ts, data, payload.loja, payload.gerente, payload.itemFoto, url]);

  return { ok: true, url };
}

// ────────────────────────────────────────────────────────────────
// GET DADOS — para o dashboard admin
// ────────────────────────────────────────────────────────────────
function getDados(params) {
  const ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
  const hoje = params.data || Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy');

  // KPIs do dia
  const abaKpi  = ss.getSheetByName('Registros_KPIs');
  const kpiData = abaKpi.getDataRange().getValues();
  const kpis    = kpiData.slice(1).filter(r => r[1] === hoje).map(r => ({
    loja: r[2], turno: r[3], gerente: r[4],
    faturamento: r[5], pedidos: r[6], motoboys: r[7],
    tempo: r[8], nota: r[9], startDina: r[10], destaque: r[11]
  }));

  // Checklist do dia
  const abaCl   = ss.getSheetByName('Registros_Checklist');
  const clData  = abaCl.getDataRange().getValues();
  const checks  = clData.slice(1).filter(r => r[1] === hoje);

  // Resumo por loja
  const resumo = {};
  checks.forEach(r => {
    const loja = r[2]; const fase = r[5]; const status = r[7];
    if (!resumo[loja]) resumo[loja] = { abertura: {ok:0,nok:0}, fechamento: {ok:0,nok:0} };
    if (fase === 'abertura' || fase === 'fechamento') {
      if (status === 'ok')  resumo[loja][fase].ok++;
      if (status === 'nok') resumo[loja][fase].nok++;
    }
  });

  // Fotos do dia
  const abaFotos = ss.getSheetByName('Fotos_Log');
  const fotosData = abaFotos.getDataRange().getValues();
  const fotos = fotosData.slice(1).filter(r => r[1] === hoje).map(r => ({
    loja: r[2], gerente: r[3], item: r[4], url: r[5]
  }));

  return { ok: true, data: hoje, kpis, resumo, fotos };
}

// ════════════════════════════════════════════════════════════════
// ADMIN — EDIÇÃO DO CHECKLIST
// ════════════════════════════════════════════════════════════════

function updateConfig(payload) {
  // Atualiza texto de um item existente
  const ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba = ss.getSheetByName('Checklist_Config');
  const dados = aba.getDataRange().getValues();

  for (let i = 1; i < dados.length; i++) {
    if (String(dados[i][0]) === String(payload.id)) {
      if (payload.item    !== undefined) aba.getRange(i+1, 4).setValue(payload.item);
      if (payload.secao   !== undefined) aba.getRange(i+1, 2).setValue(payload.secao);
      if (payload.ativo   !== undefined) aba.getRange(i+1, 6).setValue(payload.ativo ? 'SIM' : 'NÃO');
      if (payload.tipo    !== undefined) aba.getRange(i+1, 8).setValue(payload.tipo);
      if (payload.lojasExcluidas !== undefined) aba.getRange(i+1, 7).setValue(payload.lojasExcluidas.join(','));
      return { ok: true, msg: 'Item atualizado!' };
    }
  }
  return { ok: false, msg: 'Item não encontrado' };
}

function addItem(payload) {
  const ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba = ss.getSheetByName('Checklist_Config');
  const dados = aba.getDataRange().getValues();

  // Gerar novo ID
  const ids = dados.slice(1).map(r => parseInt(r[0]) || 0);
  const novoId = Math.max(...ids, 0) + 1;

  // Calcular ordem da seção
  const ordemSec = payload.ordemSecao || 99;
  const ordemItem = dados.slice(1).filter(r => r[1] === payload.secao).length + 1;

  aba.appendRow([
    novoId, payload.secao, ordemSec, payload.item, ordemItem,
    'SIM', payload.lojasExcluidas || '', payload.tipo || 'ambos'
  ]);

  return { ok: true, msg: 'Item adicionado!', id: novoId };
}

function removeItem(payload) {
  const ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba = ss.getSheetByName('Checklist_Config');
  const dados = aba.getDataRange().getValues();

  for (let i = 1; i < dados.length; i++) {
    if (String(dados[i][0]) === String(payload.id)) {
      aba.deleteRow(i + 1);
      return { ok: true, msg: 'Item removido!' };
    }
  }
  return { ok: false, msg: 'Item não encontrado' };
}

function toggleItem(payload) {
  return updateConfig({ id: payload.id, ativo: payload.ativo });
}

function updateLoja(payload) {
  const ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba = ss.getSheetByName('Lojas_Config');
  const dados = aba.getDataRange().getValues();

  for (let i = 1; i < dados.length; i++) {
    if (String(dados[i][0]) === String(payload.id)) {
      if (payload.saloes     !== undefined) aba.getRange(i+1, 3).setValue(payload.saloes);
      if (payload.fliperama  !== undefined) aba.getRange(i+1, 4).setValue(payload.fliperama ? 'SIM' : 'NÃO');
      if (payload.balcao     !== undefined) aba.getRange(i+1, 5).setValue(payload.balcao ? 'SIM' : 'NÃO');
      if (payload.salaEspera !== undefined) aba.getRange(i+1, 6).setValue(payload.salaEspera ? 'SIM' : 'NÃO');
      if (payload.ativo      !== undefined) aba.getRange(i+1, 7).setValue(payload.ativo ? 'SIM' : 'NÃO');
      return { ok: true, msg: 'Loja atualizada!' };
    }
  }
  return { ok: false, msg: 'Loja não encontrada' };
}

// ════════════════════════════════════════════════════════════════
// INICIALIZAR PLANILHA (rodar UMA vez para criar as abas e dados)
// ════════════════════════════════════════════════════════════════
function inicializarPlanilha() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // ── Checklist_Config ──
  let aba = ss.getSheetByName('Checklist_Config') || ss.insertSheet('Checklist_Config');
  aba.clearContents();
  aba.appendRow(['ID','Secao','Ordem_Secao','Item','Ordem_Item','Ativo','Lojas_Excluidas','Tipo']);

  const itens = [
    // FACHADA
    [1,'Fachada',1,'Fachada limpa — sem papéis, bitucas e sujeira',1,'SIM','','abertura'],
    [2,'Fachada',1,'Iluminação externa acesa e sem lâmpadas queimadas',2,'SIM','','fechamento'],
    // SALÃO (genérico — o frontend replica por nº de salões)
    [3,'Salão',2,'Mesas limpas e organizadas',1,'SIM','expressa','ambos'],
    [4,'Salão',2,'Cadeiras limpas e organizadas',2,'SIM','expressa','ambos'],
    [5,'Salão',2,'Balcão/Buffet limpo',3,'SIM','expressa','ambos'],
    [6,'Salão',2,'Vidros da loja limpos',4,'SIM','expressa','ambos'],
    [7,'Salão',2,'Piso limpo',5,'SIM','','ambos'],
    [8,'Salão',2,'Banheiros limpos e abastecidos',6,'SIM','expressa','ambos'],
    [9,'Salão',2,'Televisores ligados',7,'SIM','expressa,capao-raso','abertura'],
    [10,'Salão',2,'Televisores desligados',8,'SIM','expressa,capao-raso','fechamento'],
    [11,'Salão',2,'Som ligado',9,'SIM','expressa,capao-raso','abertura'],
    [12,'Salão',2,'Som desligado',10,'SIM','expressa,capao-raso','fechamento'],
    [13,'Salão',2,'Luminárias limpas e sem lâmpadas queimadas',11,'SIM','','ambos'],
    [14,'Salão',2,'Togas sem poeira e organizadas',12,'SIM','expressa,capao-raso','ambos'],
    // BALCÃO
    [15,'Balcão',3,'Balcão limpo e organizado',1,'SIM','agua-verde,uberaba,colombo,campo-largo,sao-jose,fazenda,araucaria,isaac','ambos'],
    [16,'Balcão',3,'Televisor ligado',2,'SIM','agua-verde,uberaba,colombo,campo-largo,sao-jose,fazenda,araucaria,isaac','abertura'],
    [17,'Balcão',3,'Televisor desligado',3,'SIM','agua-verde,uberaba,colombo,campo-largo,sao-jose,fazenda,araucaria,isaac','fechamento'],
    [18,'Balcão',3,'Piso limpo',4,'SIM','agua-verde,uberaba,colombo,campo-largo,sao-jose,fazenda,araucaria,isaac','ambos'],
    // SALA DE ESPERA
    [19,'Sala de Espera',4,'Cadeiras limpas e organizadas',1,'SIM','agua-verde,uberaba,colombo,campo-largo,expressa,sao-jose,fazenda,araucaria,isaac','ambos'],
    [20,'Sala de Espera',4,'Piso limpo',2,'SIM','agua-verde,uberaba,colombo,campo-largo,expressa,sao-jose,fazenda,araucaria,isaac','ambos'],
    [21,'Sala de Espera',4,'Luminárias funcionando',3,'SIM','agua-verde,uberaba,colombo,campo-largo,expressa,sao-jose,fazenda,araucaria,isaac','ambos'],
    // FLIPERAMA
    [22,'Fliperama & Playground',5,'Máquinas de fliperama ligadas, limpas e organizadas',1,'SIM','expressa,capao-raso','abertura'],
    [23,'Fliperama & Playground',5,'Máquinas de fliperama desligadas e organizadas',2,'SIM','expressa,capao-raso','fechamento'],
    [24,'Fliperama & Playground',5,'Playground limpo e organizado',3,'SIM','expressa,capao-raso','ambos'],
    [25,'Fliperama & Playground',5,'Piscina de bolinhas — sem bolinhas amassadas ou sujas',4,'SIM','expressa,capao-raso','ambos'],
    // CAIXA
    [26,'Caixa & Operação',6,'Sistema PV aberto e funcionando',1,'SIM','','abertura'],
    [27,'Caixa & Operação',6,'Caixa fechado e conferido',2,'SIM','','fechamento'],
    [28,'Caixa & Operação',6,'iFood — plataforma aberta',3,'SIM','','abertura'],
    [29,'Caixa & Operação',6,'iFood — sem produtos pausados',4,'SIM','','abertura'],
    [30,'Caixa & Operação',6,'iFood — tempos de entrega atualizados',5,'SIM','','abertura'],
    [31,'Caixa & Operação',6,'Troco conferido e separado',6,'SIM','','abertura'],
    [32,'Caixa & Operação',6,'Sangria e fechamento de caixa realizados',7,'SIM','','fechamento'],
    [33,'Caixa & Operação',6,'10 geladeiras do caixa completas e limpas',8,'SIM','expressa','ambos'],
    // BUFFET
    [34,'Buffet & Abastecimento',7,'Bufetes ligados',1,'SIM','expressa,capao-raso','abertura'],
    [35,'Buffet & Abastecimento',7,'Bufetes desligados e limpos',2,'SIM','expressa,capao-raso','fechamento'],
    [36,'Buffet & Abastecimento',7,'Água suficiente para banho-maria (não vapor)',3,'SIM','expressa,capao-raso','abertura'],
    [37,'Buffet & Abastecimento',7,'Sorvetes organizados e abastecidos',4,'SIM','expressa,capao-raso','ambos'],
    [38,'Buffet & Abastecimento',7,'Estoque de gelo verificado',5,'SIM','','ambos'],
    [39,'Buffet & Abastecimento',7,'Talheres abastecidos e organizados',6,'SIM','expressa','ambos'],
    // COZINHA
    [40,'Cozinha',8,'Fritadeiras ligadas e limpas',1,'SIM','','abertura'],
    [41,'Cozinha',8,'Fritadeiras desligadas e limpas',2,'SIM','','fechamento'],
    [42,'Cozinha',8,'Fornos ligados e em temperatura',3,'SIM','','abertura'],
    [43,'Cozinha',8,'Fornos desligados',4,'SIM','','fechamento'],
    [44,'Cozinha',8,'Estufa das pizzas (buffet) ligada',5,'SIM','expressa,capao-raso','abertura'],
    [45,'Cozinha',8,'Estufa desligada e limpa',6,'SIM','expressa,capao-raso','fechamento'],
    [46,'Cozinha',8,'Conferência geral do estoque realizada',7,'SIM','','ambos'],
    [47,'Cozinha',8,'Checklist de pré-preparo e abastecimento do buffet concluído',8,'SIM','expressa,capao-raso','abertura'],
    [48,'Cozinha',8,'Lixo retirado e ensacado',9,'SIM','','fechamento'],
    [49,'Cozinha',8,'Piso da cozinha varrido e limpo',10,'SIM','','fechamento'],
  ];

  itens.forEach(i => aba.appendRow(i));

  // ── Lojas_Config ──
  aba = ss.getSheetByName('Lojas_Config') || ss.insertSheet('Lojas_Config');
  aba.clearContents();
  aba.appendRow(['ID','Nome','Saloes','Fliperama','Balcao','SalaEspera','Ativo']);
  [
    ['agua-verde','Água Verde',1,'SIM','NÃO','NÃO','SIM'],
    ['uberaba','Uberaba',2,'SIM','NÃO','NÃO','SIM'],
    ['colombo','Colombo',2,'SIM','NÃO','NÃO','SIM'],
    ['campo-largo','Campo Largo',1,'SIM','NÃO','NÃO','SIM'],
    ['capao-raso','Capão Raso',0,'NÃO','SIM','SIM','SIM'],
    ['sao-jose','São José dos Pinhais',2,'SIM','NÃO','NÃO','SIM'],
    ['fazenda','Fazenda Rio Grande',3,'SIM','NÃO','NÃO','SIM'],
    ['araucaria','Araucária',3,'SIM','NÃO','NÃO','SIM'],
    ['expressa','Expressa',0,'NÃO','SIM','NÃO','SIM'],
    ['isaac','Isaac',4,'SIM','NÃO','NÃO','SIM'],
  ].forEach(r => aba.appendRow(r));

  // ── Registros_Checklist ──
  aba = ss.getSheetByName('Registros_Checklist') || ss.insertSheet('Registros_Checklist');
  if (aba.getLastRow() === 0)
    aba.appendRow(['Timestamp','Data','Loja','Turno','Gerente','Fase','Item_ID','Status','Observacao']);

  // ── Registros_KPIs ──
  aba = ss.getSheetByName('Registros_KPIs') || ss.insertSheet('Registros_KPIs');
  if (aba.getLastRow() === 0)
    aba.appendRow(['Timestamp','Data','Loja','Turno','Gerente','Faturamento','Pedidos','Motoboys','Tempo_Entrega','Nota_iFood','Start_Dina','Destaque','Observacoes']);

  // ── Fotos_Log ──
  aba = ss.getSheetByName('Fotos_Log') || ss.insertSheet('Fotos_Log');
  if (aba.getLastRow() === 0)
    aba.appendRow(['Timestamp','Data','Loja','Gerente','Item_Foto','Drive_URL']);

  return { ok: true, msg: 'Planilha inicializada com sucesso!' };
}

// ────────────────────────────────────────────────────────────────
// HELPER
// ────────────────────────────────────────────────────────────────
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
