// ══════════════════════════════════════════════════════════════════════════
// 📊 CRM Dashboard — Google Apps Script
// Cole este código no Apps Script da sua planilha Google Sheets
// Instruções completas no arquivo GUIA.md
// ══════════════════════════════════════════════════════════════════════════

// ID da sua planilha (você vai substituir pelo ID real)
// O ID fica na URL da planilha: docs.google.com/spreadsheets/d/SEU_ID_AQUI/edit
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

  var config    = lerConfig(planilha);
  var marcas    = lerMarcas(planilha);
  var acoes     = lerAcoes(planilha);

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

  // Lê linha por linha: coluna A = chave, coluna B = valor
  for (var i = 1; i < dados.length; i++) {
    var chave = dados[i][0];
    var valor = dados[i][1];
    if (chave) config[chave] = valor;
  }

  return {
    mes_atual:        config["mes_atual"]        || "",
    data_inicio:      config["data_inicio"]      || "",
    data_fim:         config["data_fim"]         || "",
    ultima_atualizacao: new Date().toLocaleDateString("pt-BR"),
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
  if (!aba) return [];

  var dados = aba.getDataRange().getValues();
  var marcas = [];

  // Linha 1 = cabeçalho, começa da linha 2
  for (var i = 1; i < dados.length; i++) {
    var linha = dados[i];
    if (!linha[0]) continue; // pula linhas vazias

    marcas.push({
      marca_id: String(linha[0]).trim(),
      nome:     String(linha[1]).trim(),
      cor:      String(linha[2]).trim() || "#6C5CE7"
    });
  }

  return marcas;
}

// ──────────────────────────────────────────────────────────────────────────
// Aba "Acoes" — detalhamento de cada ação de CRM
// ──────────────────────────────────────────────────────────────────────────
function lerAcoes(planilha) {
  var aba = planilha.getSheetByName("Acoes");
  if (!aba) return [];

  var dados = aba.getDataRange().getValues();
  var acoes = [];

  // Linha 1 = cabeçalho, começa da linha 2
  for (var i = 1; i < dados.length; i++) {
    var linha = dados[i];
    if (!linha[0]) continue; // pula linhas vazias

    acoes.push({
      id:          Number(linha[0])          || i,
      nome:        String(linha[1]).trim(),
      marca_id:    String(linha[2]).trim(),
      tipo:        String(linha[3]).trim(),   // E-mail | WhatsApp | SMS | Push
      fonte:       String(linha[4]).trim(),   // SFMC | WhatsApp Manager
      status:      String(linha[5]).trim(),   // concluida | ativa | planejada
      semana:      String(linha[6]).trim(),   // S1 | S2 | S3 | S4
      envios:      Number(linha[7])  || 0,
      aberturas:   Number(linha[8])  || 0,
      cliques:     Number(linha[9])  || 0,
      conversoes:  Number(linha[10]) || 0,
      receita:     Number(linha[11]) || 0,
      custo:       Number(linha[12]) || 0,
      texto_envio: String(linha[13] || "").trim()
    });
  }

  return acoes;
}
