# Dina Pizza — Sistema de Gestão das Lojas

Sistema interno da Dina Pizza Gastronomia (Robson Pontes): placar diário, checklists,
dashboards e escala de funcionários das 11 unidades. Leia este arquivo inteiro antes de mexer em qualquer coisa.
**Estado atual, versão publicada e pendências:** arquivo `ESTADO_DO_PROJETO.md` no repositório privado `dina-pizza-backend` (leia também; atualize ao fim de cada entrega).

## Como o sistema é montado

- **Telas (este repositório, público):** arquivos HTML publicados no GitHub Pages
  em `https://gerentes.dinapizza.com.br/` (domínio próprio, arquivo `CNAME`; o endereço antigo `pedrosouza4100-star.github.io/dina-pizza-gerentes-/` redireciona). A branch `main` é o que está no ar. Não apague o `CNAME`.
- **Servidor (Google Apps Script):** um único script, vinculado à planilha do placar, publicado como App da Web:
  `https://script.google.com/macros/s/AKfycby-MpaSNNJ_hb4Vw6X139dBGR_PmBFD8gXJwSfxgbuis9ulOEuN6Rcdg4_D6BbBwuFc/exec`
  Todas as telas usam essa mesma URL (`SCRIPT_URL` / `ESCALA_SCRIPT_URL`).
- **Dados:** planilha do placar (abas por loja, `__config__`, `__desbloqueios__`, `__tempo_real__`,
  `__checklist_pendencias__`, `__checklist_visitas__`, `Escala_*`) e a planilha do checklist v2
  (`Checklist_Config`, `Registros_Checklist`), aberta por `openById`.

## ⚠️ Regras obrigatórias

1. **O `Code.gs` deste repositório é ANTIGO (v2.0) e NÃO é o que está publicado.** Não use como base.
   A versão oficial do Apps Script fica no repositório privado `dina-pizza-backend` (quando existir)
   ou deve ser pedida ao Robson (ele copia do editor do Apps Script e envia em .txt).
2. **Nunca entregue um código novo do Apps Script escrito do zero ou a partir de uma cópia velha.**
   Sempre parta da versão publicada mais recente e mantenha TODAS as partes: placar, metas, desbloqueios,
   checklist (v1 regional e v2 abertura/fechamento), dashboards (V1, V2, call center) e **escalas**
   (bloco `ESCALAS DA EQUIPE` no final + as 2 linhas `escRoteadorGet` / `escRoteadorPost` no começo de `doGet`/`doPost`).
   Isso já aconteceu uma vez: um código novo apagou as escalas e cada salvamento passou a gravar linhas em branco nas abas das lojas.
3. Antes de entregar o código do Apps Script, compare com a versão anterior (`diff`): nenhuma linha existente pode sumir sem motivo.
4. Reimplantação **sempre** por *Implantar > Gerenciar implantações > lápis > Nova versão* — nunca "Nova implantação",
   senão a URL muda e todas as telas param.
5. Não coloque senhas novas neste repositório (ele é público). A senha do painel de escalas fica só no Apps Script (`ESC_SENHA_PAINEL`).
6. Mexa só nos arquivos do assunto pedido. Antes de enviar, faça `git fetch` e confira o que outras conversas mudaram (`git log HEAD..origin/main`).
7. Ao mudar um `.js` ou `.css` compartilhado, aumente o `?v=` nas páginas que o usam (o GitHub Pages guarda cache).
8. **A cada publicação, troque o valor de `versao.json`** (ex.: `2026-10-25-1`). O `atualizador.js` (incluído no fim das páginas) percebe a mudança,
   avisa o gerente e recarrega o placar/escala sozinho (na hora se o app estiver em segundo plano; senão em 1 min sem digitação, ou no máximo 15 min).
9. **A cada entrega de código do Apps Script, troque `versao-servidor.json`** para o mesmo valor de `VERSAO_SERVIDOR` do Codigo.gs.
   O Admin (faixa "🛡️ Proteção do sistema" no Hoje na rede) e o robô de cobrança comparam os dois e avisam se o código publicado for outro,
   se faltar parte do código ou se o backup semanal parar.

## Mapa das telas

| Arquivo | O que é | Ações no Apps Script |
|---|---|---|
| `placar.html` | Placar diário do gerente em 4 etapas, nesta ordem: 1) checklist de abertura (bloqueia até completo; depois some), 2) Start Dina e motoboys, 3) falta de produto e tempos, 4) números do fechamento → checklist de fechamento (obrigatório para enviar) → enviar. O turno do checklist é decidido pelo estado, nunca pela hora. Abertura e Start Dina só no horário da loja (17h00–19h20; Isaac Manhã 9h30–11h20): antes não abre; depois abre com aviso forte; 2 chances no mês e, do 3º atraso em diante, o placar fica bloqueado no dia seguinte (tela 🔒 com pedido de desbloqueio; o admin libera no Hoje na rede). Cada campo de meta mostra a meta do mês (acima/abaixo, quanto falta, quanto por dia) usando getFiltroDashboard de 1 até ontem. Foto do checklist só pela câmera aberta dentro do placar (getUserMedia, com carimbo de data/hora/loja; não existe opção de galeria). A tela preta inicial mostra o horário do checklist da loja. Login aceita a senha do gerente ou a do assistente (crachá "· Assistente"). Cada senha só abre no celular autorizado pelo admin (id em `dina_aparelho`; tela 📱 de espera com o código). O placar confere a localização (GPS) ao abrir, a cada 10 min, antes de salvar o checklist e antes de enviar; fora do raio da loja fica travado (tela 📍). Item ✗ exige descrição, aceita foto e "já resolvi"; problemas não resolvidos voltam como aviso (reincidência). Login por senha da loja salva no aparelho (`dina_unidade_logada`). Tem o botão "📅 Escala da equipe". | getMetas, getDashboard, salvarTempoReal, registrarPedidoDesbloqueio, verificarDesbloqueio, getChecklistItens, getChecklistStatus, getChecklistPendencias, getChecklistAbertos, chkSituacao, chkPedirDesbloqueio, getFiltroDashboard, salvarChecklistV2 (POST; cai no salvarChecklist antigo se o servidor não tiver) |
| `admin.html` | Administração: metas, senhas (gerente e assistente de cada loja), celulares autorizados e localização das lojas (aba Lojas e celulares), desbloqueios e itens do checklist (aba Checklist) | getMetas, saveMetas, getPedidosDesbloqueio, desbloquear, desbloquearFalta, marcarAtendido, limparDesbloqueios, chkAdminListar, chkAdminSalvar, chkAdminAtivo, chkAdminMover |
| `dashboard.html`, `painel.html` | Dashboard mensal | getDashboard, getPresenca |
| `dashboard-v2.html` | Abre o Dashboard V2 (servido pelo Apps Script) num quadro, depois da senha da gestão; manda a `chave` exigida pelo `dashboardV2` | dashboardV2 |
| `checklist.html` | Checklist operacional | — |
| `checklist_regional.html` | Checklist do gerente regional (pendências e reincidência) | getChecklistPendencias, salvarChecklist |
| `CONTROLE_GERAL_GESTAO.html`, `Gerente_*.html` | Páginas estáticas de gestão por loja | — |
| `escala.html` | Escala da equipe (gerente): equipe, turnos, montagem manual e **⚡ escala automática** (1 ou 4 semanas) | escalaGet, escalaSalvar, escalaSalvarUnidade |
| `painel_escalas.html` | Painel de escalas da rede (Robson), com senha | escalaResumo, escalaGet |
| `escala-core.js`, `escala.css` | Regras, gerador automático e visual compartilhados pelas duas telas de escala | — |

Unidades: Isaac Manhã, Isaac Noite, Água Verde, Uberaba, Campo Largo, Capão Raso, São José dos Pinhais,
Expressa, Fazenda Rio Grande, Colombo, Araucária.

## Escalas — regras de negócio

- Regra por data: até 16/12/2026, 44 h e 1 folga; de 17/12/2026, 42 h (a convenção autoriza 8h24) e 2 folgas, com no máximo 5 dias seguidos;
  de 17/12/2027, 40 h (EC 141/2026).
- Preferências da unidade (salvas junto dos turnos em `Escala_Unidades`): **intervalo de refeição de 30 min (convenção)**,
  **1 domingo de folga por mês para cada colaborador**, dias em que pode haver folga (padrão SEG a QUI), mínimo por setor.
- Também confere: 11 h entre jornadas, até 2 h extras por dia e hora noturna de 52min30.
- O gerador é determinístico. Ele espalha as folgas por setor e por turno e dá a cada pessoa um domingo diferente no mês.

## Como testar sem mexer no que está no ar

Rode o código do Apps Script num simulador em Node, com SpreadsheetApp, ContentService e Utilities falsos em memória,
sirva os HTML localmente trocando a URL do script e use o Playwright (Chromium em `/opt/pw-browsers/chromium`).
Confira também que as ações antigas (por exemplo `getMetas`) continuam respondendo.
