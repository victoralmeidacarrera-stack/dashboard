// ══════════════════════════════════════════════════════════════════════════
// 📊 CRM Dashboard — Google Apps Script
// Cole este código no Apps Script da sua planilha Google Sheets
// ══════════════════════════════════════════════════════════════════════════

// ID da sua planilha (já configurado)
var SPREADSHEET_ID = "1CF4JE6wP21AiQMjV8H4uNgv6aU0kMAP6n0F0qRBPjEs";

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
  return {
    config: lerConfig(planilha),
    marcas: lerMarcas(planilha),
    acoes:  lerAcoes(planilha)
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
    mes_atual:          config["mes_atual"]           || "",
    data_inicio:        config["data_inicio"]         || "",
    data_fim:           config["data_fim"]            || "",
    ultima_atualizacao: new Date().toLocaleDateString("pt-BR"),
    mes_anterior: {
      total_acoes:      Number(config["ant_total_acoes"])      || 0,
      total_enviadas:   Number(config["ant_total_enviadas"])   || 0,
      total_entregues:  Number(config["ant_total_entregues"])  || 0,
      total_cliques:    Number(config["ant_total_cliques"])    || 0,
      taxa_conversao:   Number(config["ant_taxa_conversao"])   || 0
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

function marcasPadrao() {
  return [
    { marca_id: "marca-a", nome: "GMSP",           cor: "#6C5CE7" },
    { marca_id: "marca-b", nome: "GMBSB",          cor: "#00D68F" },
    { marca_id: "marca-c", nome: "Volkswagen",      cor: "#48DBFB" },
    { marca_id: "marca-d", nome: "GAC",             cor: "#FF9FF3" },
    { marca_id: "marca-e", nome: "GWM",             cor: "#FECA57" },
    { marca_id: "marca-f", nome: "Omoda & Jaecoo",  cor: "#FF6B6B" },
    { marca_id: "marca-g", nome: "Zeekr",           cor: "#A29BFE" },
    { marca_id: "marca-h", nome: "Bajaj",           cor: "#FD79A8" },
    { marca_id: "marca-i", nome: "Seminovos",       cor: "#55EFC4" },
    { marca_id: "marca-j", nome: "Nissan",          cor: "#74B9FF" }
  ];
}

// ──────────────────────────────────────────────────────────────────────────
// Aba "Acoes" — detalhamento de cada ação de CRM
//
// Colunas esperadas na planilha:
//   A: id (opcional)
//   B: nome (modelo/nome da mensagem) ← critério principal
//   C: marca
//   D: tipo (WhatsApp, E-mail, SMS)
//   E: status (concluida, ativa, planejada)
//   F: enviadas
//   G: entregues
//   H: cliques (excluindo "Parar promoções")
//   I: texto_envio
//   J: data (yyyy-mm-dd)
// ──────────────────────────────────────────────────────────────────────────
function lerAcoes(planilha) {
  var aba = planilha.getSheetByName("Acoes");
  if (!aba) return [];

  var todasMarcas = lerMarcas(planilha);
  var mapaDeNome = {}, mapaDeId = {};
  todasMarcas.forEach(function(m) {
    mapaDeNome[m.nome.toLowerCase().trim()] = m.marca_id;
    mapaDeId[m.marca_id.toLowerCase().trim()] = m.marca_id;
  });

  function resolverMarcaId(valor) {
    var v = String(valor).trim();
    var vLower = v.toLowerCase();
    if (mapaDeId[vLower])   return mapaDeId[vLower];
    if (mapaDeNome[vLower]) return mapaDeNome[vLower];
    return v;
  }

  var dados = aba.getDataRange().getValues();
  var acoes = [];
  var contador = 1;

  for (var i = 1; i < dados.length; i++) {
    var linha = dados[i];
    var nomeAcao = String(linha[1] || "").trim();
    if (!nomeAcao) continue;

    var dataVal = "";
    if (linha[9]) {
      try {
        dataVal = Utilities.formatDate(new Date(linha[9]), Session.getScriptTimeZone(), "yyyy-MM-dd");
      } catch(e) {
        dataVal = String(linha[9]).trim();
      }
    }

    acoes.push({
      id:          Number(linha[0]) || contador++,
      nome:        nomeAcao,
      marca_id:    resolverMarcaId(linha[2]),
      tipo:        String(linha[3] || "WhatsApp").trim(),
      status:      String(linha[4] || "concluida").trim(),
      enviadas:    Number(linha[5])  || 0,
      entregues:   Number(linha[6])  || 0,
      cliques:     Number(linha[7])  || 0,
      texto_envio: String(linha[8]  || "").trim(),
      data:        dataVal
    });
  }

  return acoes;
}

// ══════════════════════════════════════════════════════════════════════════
// 📱 RESUMO DIÁRIO PARA WHATSAPP
//
// Como usar:
//   1. No editor do Apps Script, selecione "gerarResumoDiario" no menu
//      suspenso ao lado do botão ▶ Executar.
//   2. Clique em ▶ Executar.
//   3. O resumo será salvo na aba "Resumo Diário" e exibido em tela.
//   4. Copie o texto e cole no WhatsApp.
//
// O resumo contém: modelo do carro disparado + taxa de conversão + cliques.
// ══════════════════════════════════════════════════════════════════════════
function gerarResumoDiario() {
  var planilha = SpreadsheetApp.openById(SPREADSHEET_ID);
  var acoes    = lerAcoes(planilha);
  var marcas   = lerMarcas(planilha);
  var config   = lerConfig(planilha);

  // Data de ontem
  var ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);
  var dataOntemStr      = Utilities.formatDate(ontem, Session.getScriptTimeZone(), "yyyy-MM-dd");
  var dataOntemExibicao = Utilities.formatDate(ontem, Session.getScriptTimeZone(), "dd/MM/yyyy");

  // Filtra ações do dia anterior
  var acoesOntem = acoes.filter(function(a) { return a.data === dataOntemStr; });
  var usandoFallback = false;
  if (acoesOntem.length === 0) {
    acoesOntem = acoes;
    usandoFallback = true;
  }

  // Totais
  var totalEnviadas  = acoesOntem.reduce(function(s, a) { return s + a.enviadas;  }, 0);
  var totalEntregues = acoesOntem.reduce(function(s, a) { return s + a.entregues; }, 0);
  var totalCliques   = acoesOntem.reduce(function(s, a) { return s + a.cliques;   }, 0);
  var taxaConversao  = totalEntregues > 0 ? (totalCliques / totalEntregues * 100).toFixed(1) : "0.0";

  // ── Monta o texto formatado ────────────────────────────────────────────
  var linhas = [];
  var titulo = usandoFallback ? (config.mes_atual || "Período Atual") : dataOntemExibicao;

  linhas.push("📊 *RESUMO CRM — " + titulo + "*");
  linhas.push("━━━━━━━━━━━━━━━━━━━━━━━━");
  linhas.push("");

  if (usandoFallback) {
    linhas.push("_⚠️ Sem ações com data de ontem. Exibindo resumo geral do período._");
    linhas.push("");
  }

  // Totais gerais
  linhas.push("*📬 Totais*");
  linhas.push("• Ações: *" + acoesOntem.length + "*");
  linhas.push("• Enviadas: *" + formatarNumero(totalEnviadas) + "*");
  linhas.push("• Entregues: *" + formatarNumero(totalEntregues) + "*");
  linhas.push("• Cliques: *" + formatarNumero(totalCliques) + "*");
  linhas.push("• Taxa de conversão: *" + taxaConversao + "%*");
  linhas.push("");

  // Detalhamento por modelo de mensagem (ação)
  if (acoesOntem.length > 0) {
    linhas.push("*🚗 Por modelo de mensagem*");
    // Ordena por taxa de conversão (maior primeiro)
    var acoesOrdenadas = acoesOntem.slice().sort(function(a, b) {
      var tA = a.entregues > 0 ? a.cliques / a.entregues : 0;
      var tB = b.entregues > 0 ? b.cliques / b.entregues : 0;
      return tB - tA;
    });

    acoesOrdenadas.forEach(function(a) {
      var taxa = a.entregues > 0 ? (a.cliques / a.entregues * 100).toFixed(1) : "0.0";
      var marcaObj = marcas.find(function(m) { return m.marca_id === a.marca_id; });
      var nomeMarca = marcaObj ? marcaObj.nome : a.marca_id;
      linhas.push("• *" + a.nome + "* (" + nomeMarca + ")");
      linhas.push("  Cliques: " + formatarNumero(a.cliques) + " | Conversão: " + taxa + "%");
    });
    linhas.push("");
  }

  linhas.push("━━━━━━━━━━━━━━━━━━━━━━━━");
  linhas.push("_Gerado automaticamente pelo CRM Dashboard_");

  var textoFinal = linhas.join("\n");

  // ── Salva na aba "Resumo Diário" ──────────────────────────────────────
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
  abaResumo.getRange(ultimaLinha, 2).setValue(titulo);
  abaResumo.getRange(ultimaLinha, 3).setValue(textoFinal);
  abaResumo.getRange(ultimaLinha, 3).setWrap(true);

  // Exibe o texto gerado
  SpreadsheetApp.getUi().alert(
    "✅ Resumo gerado!",
    "Texto salvo na aba \"Resumo Diário\".\nCopie o conteúdo da coluna C e cole no WhatsApp.\n\n" +
    "─────────────────────────────\n" + textoFinal,
    SpreadsheetApp.getUi().ButtonSet.OK
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
