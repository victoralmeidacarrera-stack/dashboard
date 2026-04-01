// ══════════════════════════════════════════════════════════════════════════
// 📊 CRM Dashboard — Google Apps Script
// Cole este código no Apps Script da sua planilha Google Sheets
// Instruções completas no arquivo GUIA.md
// ══════════════════════════════════════════════════════════════════════════

// ID da sua planilha — substitua pelo ID real
// O ID fica na URL: docs.google.com/spreadsheets/d/SEU_ID_AQUI/edit
var SPREADSHEET_ID = "SEU_ID_DA_PLANILHA_AQUI";

// ──────────────────────────────────────────────────────────────────────────
// Função principal — responde às requisições do dashboard
// ──────────────────────────────────────────────────────────────────────────
function doGet(e) {
  try {
    var dados = lerDados();
    var resposta = ContentService.createTextOutput(JSON.stringify(dados));
    resposta.setMimeType(ContentService.MimeType.JSON);
    return resposta;
  } catch (erro) {
    var mensagemErro = ContentService.createTextOutput(JSON.stringify({ erro: erro.toString() }));
    mensagemErro.setMimeType(ContentService.MimeType.JSON);
    return mensagemErro;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Lê todas as abas da planilha e monta o objeto de dados
// ──────────────────────────────────────────────────────────────────────────
function lerDados() {
  var planilha = SpreadsheetApp.openById(SPREADSHEET_ID);

  var config = lerConfig(planilha);
  var marcas = lerMarcas(planilha);
  var acoes  = lerAcoes(planilha);

  return {
    config: config,
    marcas: marcas,
    acoes:  acoes
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Aba "Config" — informações gerais do período
// ──────────────────────────────────────────────────────────────────────────
function lerConfig(planilha) {
  var aba = planilha.getSheetByName("Config");
  if (!aba) return {};

  var dados = aba.getDataRange().getValues();
  var config = {};

  for (var i = 1; i < dados.length; i++) {
    var chave = dados[i][0];
    var valor = dados[i][1];
    if (chave) config[chave] = valor;
  }

  return {
    mes_atual:           config["mes_atual"]        || "",
    data_inicio:         config["data_inicio"]      || "",
    data_fim:            config["data_fim"]         || "",
    ultima_atualizacao:  new Date().toLocaleDateString("pt-BR"),
    mes_anterior: {
      total_acoes:    Number(config["ant_total_acoes"])    || 0,
      alcance_total:  Number(config["ant_alcance_total"])  || 0,
      taxa_conversao: Number(config["ant_taxa_conversao"]) || 0,
      roi_medio:      Number(config["ant_roi_medio"])      || 0
    }
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Aba "Marcas" — lista de marcas/empresas
// ──────────────────────────────────────────────────────────────────────────
function lerMarcas(planilha) {
  var aba = planilha.getSheetByName("Marcas");
  if (!aba) return marcasPadrao();

  var dados = aba.getDataRange().getValues();
  var marcas = [];

  for (var i = 1; i < dados.length; i++) {
    var linha = dados[i];
    if (!linha[0]) continue;
    marcas.push({
      marca_id: String(linha[0]).trim(),
      nome:     String(linha[1]).trim(),
      cor:      String(linha[2]).trim() || "#6C5CE7"
    });
  }

  return marcas.length > 0 ? marcas : marcasPadrao();
}

// Lista padrão de marcas (usada se a aba Marcas estiver vazia)
function marcasPadrao() {
  return [
    { marca_id: "marca-a", nome: "GMSP",          cor: "#6C5CE7" },
    { marca_id: "marca-b", nome: "GMBSB",         cor: "#00D68F" },
    { marca_id: "marca-c", nome: "Volkswagen",     cor: "#48DBFB" },
    { marca_id: "marca-d", nome: "GAC",            cor: "#FF9FF3" },
    { marca_id: "marca-e", nome: "GWM",            cor: "#FECA57" },
    { marca_id: "marca-f", nome: "Omoda & Jaecoo", cor: "#FF6B6B" },
    { marca_id: "marca-g", nome: "Zeekr",          cor: "#A29BFE" },
    { marca_id: "marca-h", nome: "Bajaj",          cor: "#FD79A8" },
    { marca_id: "marca-i", nome: "Seminovos",      cor: "#55EFC4" },
    { marca_id: "marca-j", nome: "Nissan",         cor: "#74B9FF" }
  ];
}

// ──────────────────────────────────────────────────────────────────────────────
// Aba "Acoes" — detalhamento de cada ação de CRM
// ──────────────────────────────────────────────────────────────────────────────
function lerAcoes(planilha) {
  var aba = planilha.getSheetByName("Acoes");
  if (!aba) return [];

  // Monta um mapa de nome da marca → marca_id para conversão automática
  // Aceita tanto o nome (ex: "GMSP") quanto o ID (ex: "marca-a")
  var todasMarcas = lerMarcas(planilha);
  var mapaDeNome = {};
  var mapaDeId   = {};
  todasMarcas.forEach(function(m) {
    mapaDeNome[m.nome.toLowerCase().trim()] = m.marca_id;
    mapaDeId[m.marca_id.toLowerCase().trim()] = m.marca_id;
  });

  function resolverMarcaId(valor) {
    var v = String(valor).trim();
    var vLower = v.toLowerCase();
    // Se já é um ID válido (ex: "marca-a"), retorna direto
    if (mapaDeId[vLower]) return mapaDeId[vLower];
    // Se é um nome (ex: "GMSP"), converte para o ID
    if (mapaDeNome[vLower]) return mapaDeNome[vLower];
    // Fallback: retorna o valor original
    return v;
  }

  var dados = aba.getDataRange().getValues();
  var acoes = [];

  for (var i = 1; i < dados.length; i++) {
    var linha = dados[i];
    if (!linha[0]) continue;
    acoes.push({
      id:          Number(linha[0])          || i,
      nome:        String(linha[1]).trim(),
      marca_id:    resolverMarcaId(linha[2]),
      tipo:        String(linha[3]).trim(),
      fonte:       String(linha[4]).trim(),
      status:      String(linha[5]).trim(),
      semana:      String(linha[6]).trim(),
      envios:      Number(linha[7])  || 0,
      aberturas:   Number(linha[8])  || 0,
      cliques:     Number(linha[9])  || 0,
      conversoes:  Number(linha[10]) || 0,
      receita:     Number(linha[11]) || 0,
      custo:       Number(linha[12]) || 0,
      texto_envio: String(linha[13] || "").trim(),
      data:        linha[14] ? Utilities.formatDate(new Date(linha[14]), Session.getScriptTimeZone(), "yyyy-MM-dd") : ""
    });
  }

  return acoes;
}

// ══════════════════════════════════════════════════════════════════════════
// 📱 RESUMO DIÁRIO PARA WHATSAPP
// ══════════════════════════════════════════════════════════════════════════
//
// Como usar:
//   1. No editor do Apps Script, selecione a função "gerarResumoDiario"
//      no menu suspenso ao lado do botão ▶ Executar.
//   2. Clique em ▶ Executar.
//   3. O resumo será salvo na aba "Resumo Diário" da planilha.
//   4. Copie o texto gerado e cole no WhatsApp.
//
// Alternativamente, configure um gatilho automático para rodar todo dia
// às 8h da manhã (veja instruções no GUIA.md).
// ══════════════════════════════════════════════════════════════════════════

function gerarResumoDiario() {
  var planilha = SpreadsheetApp.openById(SPREADSHEET_ID);
  var acoes    = lerAcoes(planilha);
  var marcas   = lerMarcas(planilha);
  var config   = lerConfig(planilha);

  // Calcula a data de ontem
  var ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);
  var dataOntemStr = Utilities.formatDate(ontem, Session.getScriptTimeZone(), "yyyy-MM-dd");
  var dataOntemExibicao = Utilities.formatDate(ontem, Session.getScriptTimeZone(), "dd/MM/yyyy");

  // Filtra as ações do dia anterior
  // Critério: campo "data" (coluna O da aba Acoes) igual a ontem
  var acoesOntem = acoes.filter(function(a) {
    return a.data === dataOntemStr;
  });

  // Se não houver ações com data preenchida, usa todas as ações do mês como fallback
  var usandoFallback = false;
  if (acoesOntem.length === 0) {
    acoesOntem = acoes;
    usandoFallback = true;
  }

  // Totais gerais
  var totalEnvios     = acoesOntem.reduce(function(s, a) { return s + a.envios; }, 0);
  var totalEntregues  = acoesOntem.reduce(function(s, a) { return s + a.aberturas; }, 0);
  var totalConversoes = acoesOntem.reduce(function(s, a) { return s + a.conversoes; }, 0);
  var taxaEntrega     = totalEnvios > 0 ? (totalEntregues / totalEnvios * 100).toFixed(1) : "0.0";
  var taxaConversao   = totalEnvios > 0 ? (totalConversoes / totalEnvios * 100).toFixed(1) : "0.0";

  // Melhor ação do dia
  var melhorAcao = acoesOntem.slice().sort(function(a, b) { return b.conversoes - a.conversoes; })[0];

  // Resumo por marca
  var resumoPorMarca = marcas.map(function(m) {
    var acoesM = acoesOntem.filter(function(a) { return a.marca_id === m.marca_id; });
    var envM   = acoesM.reduce(function(s, a) { return s + a.envios; }, 0);
    var entM   = acoesM.reduce(function(s, a) { return s + a.aberturas; }, 0);
    var convM  = acoesM.reduce(function(s, a) { return s + a.conversoes; }, 0);
    return { nome: m.nome, envios: envM, entregues: entM, conversoes: convM, qtdAcoes: acoesM.length };
  }).filter(function(m) { return m.qtdAcoes > 0; });

  // Resumo por canal (tipo)
  var canais = ["WhatsApp", "E-mail", "SMS", "Push"];
  var resumoPorCanal = canais.map(function(canal) {
    var acoesC = acoesOntem.filter(function(a) { return a.tipo === canal; });
    var envC   = acoesC.reduce(function(s, a) { return s + a.envios; }, 0);
    var convC  = acoesC.reduce(function(s, a) { return s + a.conversoes; }, 0);
    return { canal: canal, envios: envC, conversoes: convC, qtdAcoes: acoesC.length };
  }).filter(function(c) { return c.qtdAcoes > 0; });

  // ── Monta o texto formatado para WhatsApp ──────────────────────────────
  var linhas = [];

  linhas.push("📊 *RESUMO CRM — " + (usandoFallback ? config.mes_atual || "Mês Atual" : dataOntemExibicao) + "*");
  linhas.push("━━━━━━━━━━━━━━━━━━━━━━━━");
  linhas.push("");

  if (usandoFallback) {
    linhas.push("_⚠️ Nenhuma ação encontrada com data de ontem. Exibindo resumo geral do mês._");
    linhas.push("");
  }

  // Totais
  linhas.push("*📬 Totais do período*");
  linhas.push("• Ações realizadas: *" + acoesOntem.length + "*");
  linhas.push("• Mensagens enviadas: *" + formatarNumero(totalEnvios) + "*");
  linhas.push("• Mensagens entregues: *" + formatarNumero(totalEntregues) + "* (" + taxaEntrega + "%)");
  linhas.push("• Conversões: *" + formatarNumero(totalConversoes) + "* (" + taxaConversao + "%)");
  linhas.push("");

  // Por canal
  if (resumoPorCanal.length > 0) {
    linhas.push("*📡 Por canal*");
    resumoPorCanal.forEach(function(c) {
      var emoji = c.canal === "WhatsApp" ? "💬" : c.canal === "E-mail" ? "📧" : c.canal === "SMS" ? "📱" : "🔔";
      var txC = c.envios > 0 ? (c.conversoes / c.envios * 100).toFixed(1) : "0.0";
      linhas.push(emoji + " " + c.canal + ": " + formatarNumero(c.envios) + " envios → " + formatarNumero(c.conversoes) + " conv. (" + txC + "%)");
    });
    linhas.push("");
  }

  // Por marca
  if (resumoPorMarca.length > 0) {
    linhas.push("*🏷️ Por marca*");
    resumoPorMarca.forEach(function(m) {
      var txM = m.envios > 0 ? (m.conversoes / m.envios * 100).toFixed(1) : "0.0";
      linhas.push("• " + m.nome + ": " + formatarNumero(m.envios) + " env. | " + formatarNumero(m.conversoes) + " conv. (" + txM + "%)");
    });
    linhas.push("");
  }

  // Destaque do dia
  if (melhorAcao && melhorAcao.conversoes > 0) {
    var txMelhor = melhorAcao.envios > 0 ? (melhorAcao.conversoes / melhorAcao.envios * 100).toFixed(1) : "0.0";
    linhas.push("*🏆 Destaque do dia*");
    linhas.push("\"" + melhorAcao.nome + "\"");
    linhas.push("• " + formatarNumero(melhorAcao.envios) + " enviadas → " + formatarNumero(melhorAcao.conversoes) + " conversões (" + txMelhor + "%)");
    linhas.push("• Fonte: " + (melhorAcao.fonte || "—") + " | Canal: " + melhorAcao.tipo);
    linhas.push("");
  }

  linhas.push("━━━━━━━━━━━━━━━━━━━━━━━━");
  linhas.push("_Gerado automaticamente pelo CRM Dashboard_");

  var textoFinal = linhas.join("\n");

  // ── Salva na aba "Resumo Diário" da planilha ───────────────────────────
  var abaResumo = planilha.getSheetByName("Resumo Diário");
  if (!abaResumo) {
    abaResumo = planilha.insertSheet("Resumo Diário");
    abaResumo.getRange("A1").setValue("Data de geração");
    abaResumo.getRange("B1").setValue("Período referente");
    abaResumo.getRange("C1").setValue("Texto para WhatsApp");
    abaResumo.getRange("A1:C1").setFontWeight("bold");
    abaResumo.setColumnWidth(3, 600);
  }

  var ultimaLinha = abaResumo.getLastRow() + 1;
  abaResumo.getRange(ultimaLinha, 1).setValue(new Date());
  abaResumo.getRange(ultimaLinha, 2).setValue(usandoFallback ? (config.mes_atual || "Mês Atual") : dataOntemExibicao);
  abaResumo.getRange(ultimaLinha, 3).setValue(textoFinal);
  abaResumo.getRange(ultimaLinha, 3).setWrap(true);

  // Exibe uma janela com o texto gerado para facilitar a cópia
  var ui = SpreadsheetApp.getUi();
  ui.alert(
    "✅ Resumo gerado com sucesso!",
    "O texto foi salvo na aba \"Resumo Diário\".\n\n" +
    "Acesse a aba, copie o conteúdo da coluna C e cole no WhatsApp.\n\n" +
    "─────────────────────────────\n" +
    textoFinal,
    ui.ButtonSet.OK
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Utilitário: formata números grandes (ex: 1500 → 1.5K)
// ──────────────────────────────────────────────────────────────────────────
function formatarNumero(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000)    return (n / 1000).toFixed(1) + "K";
  return String(n);
}
