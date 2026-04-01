# Guia de Configuração — Dashboard CRM com Google Sheets

Este guia explica, passo a passo e sem necessidade de programação, como conectar seu dashboard ao Google Sheets para que os dados sejam atualizados automaticamente.

---

## Visão geral do fluxo

```
Você digita os dados → Google Sheets → Apps Script (ponte gratuita) → Dashboard
```

Toda vez que você salvar algo na planilha, o dashboard vai refletir as mudanças automaticamente (a cada 1 hora, ou ao recarregar a página).

---

## Passo 1 — Criar a planilha no Google Sheets

1. Acesse [sheets.google.com](https://sheets.google.com) e crie uma nova planilha.
2. Renomeie-a como **"CRM Dashboard"** (ou qualquer nome que preferir).
3. A planilha precisa ter **3 abas** com os nomes exatos abaixo:

---

### Aba 1: `Config`

Esta aba guarda as informações gerais do período.

| A (chave) | B (valor) |
|---|---|
| chave | valor |
| mes_atual | Abril 2026 |
| data_inicio | 2026-04-01 |
| data_fim | 2026-04-30 |
| ant_total_acoes | 0 |
| ant_alcance_total | 0 |
| ant_taxa_conversao | 0 |
| ant_roi_medio | 0 |

> **Dica:** A linha 1 é o cabeçalho. Os valores `ant_*` são os números do mês anterior, usados para calcular a variação percentual nos cards do dashboard.

---

### Aba 2: `Marcas`

Esta aba lista as marcas/empresas que aparecem nos filtros.

| marca_id | nome | cor |
|---|---|---|
| marca-a | GMSP | #6C5CE7 |
| marca-b | GMBSB | #00D68F |
| marca-c | Volkswagen | #48DBFB |
| marca-d | GAC | #FF9FF3 |
| marca-e | GWM | #FECA57 |
| marca-f | Omoda & Jaecoo | #FF6B6B |
| marca-g | Zeekr | #A29BFE |
| marca-h | Bajaj | #FD79A8 |
| marca-i | Seminovos | #55EFC4 |
| marca-j | Nissan | #74B9FF |

> **Dica:** A coluna `cor` usa código hexadecimal de cor. Você pode escolher qualquer cor em [htmlcolorcodes.com](https://htmlcolorcodes.com).

---

### Aba 3: `Acoes`

Esta é a aba principal onde você registra cada ação de CRM.

| id | nome | marca_id | tipo | fonte | status | semana | envios | aberturas | cliques | conversoes | receita | custo | texto_envio |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Nome da ação | marca-a | WhatsApp | WhatsApp Manager | concluida | S1 | 5000 | 4200 | 800 | 150 | 0 | 0 | Olá! Temos uma oferta... |

**Explicação de cada coluna:**

| Coluna | O que preencher |
|---|---|
| `id` | Número sequencial (1, 2, 3…) |
| `nome` | Nome descritivo da ação |
| `marca_id` | ID da marca (deve existir na aba Marcas) |
| `tipo` | `WhatsApp`, `E-mail`, `SMS` ou `Push` |
| `fonte` | `WhatsApp Manager` ou `SFMC` |
| `status` | `concluida`, `ativa` ou `planejada` |
| `semana` | `S1`, `S2`, `S3` ou `S4` |
| `envios` | Número de mensagens enviadas |
| `aberturas` | Número de mensagens entregues/abertas |
| `cliques` | Número de cliques (se houver) |
| `conversoes` | Número de conversões |
| `receita` | Receita gerada (pode deixar 0) |
| `custo` | Custo da ação (pode deixar 0) |
| `texto_envio` | O texto que foi enviado na mensagem |
| `data` | Data da ação no formato `dd/mm/aaaa` (usado no resumo diário) |

---

## Passo 2 — Criar o Apps Script (ponte entre planilha e dashboard)

O Apps Script é um serviço **gratuito do Google** que transforma sua planilha em uma "API" que o dashboard consegue ler.

1. Com a planilha aberta, clique em **Extensões** no menu superior.
2. Clique em **Apps Script**.
3. Uma nova aba vai abrir com um editor de código.
4. **Apague todo o conteúdo** que aparecer no editor.
5. Abra o arquivo `apps-script/Codigo.gs` que está no repositório e **copie todo o conteúdo**.
6. Cole no editor do Apps Script.
7. Localize a linha:
   ```
   var SPREADSHEET_ID = "SEU_ID_DA_PLANILHA_AQUI";
   ```
8. Substitua `SEU_ID_DA_PLANILHA_AQUI` pelo **ID da sua planilha**.

### Como encontrar o ID da planilha

O ID fica na URL da planilha, entre `/d/` e `/edit`:

```
https://docs.google.com/spreadsheets/d/  1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms  /edit
                                          ↑ Este é o ID ↑
```

9. Após substituir o ID, clique no ícone de **disquete** (salvar) ou pressione `Ctrl+S`.

---

## Passo 3 — Publicar o Apps Script como serviço web

1. No editor do Apps Script, clique em **Implantar** (botão azul no canto superior direito).
2. Clique em **Nova implantação**.
3. Clique no ícone de engrenagem ao lado de "Tipo" e selecione **App da Web**.
4. Preencha os campos:
   - **Descrição:** Dashboard CRM
   - **Executar como:** Eu (seu e-mail)
   - **Quem tem acesso:** Qualquer pessoa
5. Clique em **Implantar**.
6. O Google pode pedir para você **autorizar o acesso** — clique em "Autorizar acesso" e siga os passos.
7. Após a implantação, você verá uma **URL do app da web**. Ela terá este formato:
   ```
   https://script.google.com/macros/s/XXXXXXXXXXXXXXXX/exec
   ```
8. **Copie essa URL** — você vai precisar dela no próximo passo.

---

## Passo 4 — Conectar o dashboard à URL do Apps Script

1. Abra o arquivo `index.html` do repositório no GitHub.
2. Localize a linha:
   ```javascript
   var APPS_SCRIPT_URL = "COLE_AQUI_A_URL_DO_SEU_APPS_SCRIPT";
   ```
3. Substitua `COLE_AQUI_A_URL_DO_SEU_APPS_SCRIPT` pela URL copiada no passo anterior.
4. Salve e faça o commit no GitHub.

### Como editar o arquivo no GitHub

1. Acesse seu repositório: [github.com/victoralmeidacarrera-stack/dashboard](https://github.com/victoralmeidacarrera-stack/dashboard)
2. Clique no arquivo `index.html`.
3. Clique no ícone de **lápis** (editar) no canto superior direito.
4. Use `Ctrl+F` para encontrar `COLE_AQUI_A_URL_DO_SEU_APPS_SCRIPT`.
5. Substitua pelo link copiado.
6. Role até o final da página e clique em **Commit changes**.

---

## Passo 5 — Testar

1. Acesse seu dashboard publicado no GitHub Pages.
2. A tela de carregamento vai aparecer por alguns segundos.
3. Os dados da planilha serão exibidos automaticamente.

> **Se aparecer um erro:** Verifique se a URL do Apps Script está correta e se as abas da planilha têm os nomes exatos (`Config`, `Marcas`, `Acoes`).

---

## Como atualizar os dados no dia a dia

Basta abrir a planilha Google Sheets e editar os valores. O dashboard vai buscar os dados novos automaticamente a cada **1 hora**. Se quiser ver a atualização imediatamente, basta **recarregar a página** do dashboard.

---

## Estrutura dos arquivos no repositório

```
dashboard/
├── index.html              ← Dashboard principal (já atualizado)
├── GUIA.md                 ← Este guia
└── apps-script/
    └── Codigo.gs           ← Código para colar no Google Apps Script
```

---

---

## Resumo diário para WhatsApp

O Apps Script possui uma função chamada `gerarResumoDiario` que monta automaticamente um texto formatado com os principais números do dia anterior, pronto para colar no WhatsApp.

### Como usar manualmente

1. Abra o Apps Script da sua planilha (**Extensões → Apps Script**).
2. No menu suspenso ao lado do botão **▶ Executar**, selecione `gerarResumoDiario`.
3. Clique em **▶ Executar**.
4. Uma janela vai aparecer com o texto pronto. Copie e cole no WhatsApp.
5. O texto também fica salvo na aba **"Resumo Diário"** da planilha para consulta futura.

### Como configurar para rodar automaticamente todo dia às 8h

1. No editor do Apps Script, clique no ícone de **relógio** (Gatilhos) no menu lateral esquerdo.
2. Clique em **+ Adicionar gatilho** (botão azul no canto inferior direito).
3. Preencha:
   - **Função a executar:** `gerarResumoDiario`
   - **Origem do evento:** Baseado no tempo
   - **Tipo de gatilho de tempo:** Temporizador por dia
   - **Hora do dia:** 8h – 9h
4. Clique em **Salvar**.

A partir daí, todo dia às 8h o resumo do dia anterior será gerado e salvo automaticamente na aba **"Resumo Diário"**.

### Como o resumo identifica o "dia anterior"

O resumo filtra as ações pela coluna **`data`** (coluna O da aba `Acoes`). Portanto, ao registrar uma ação, preencha essa coluna com a data em que ela foi realizada. O formato aceito é `dd/mm/aaaa` ou `aaaa-mm-dd`.

Se nenhuma ação tiver data preenchida, o resumo exibirá os totais gerais do mês como alternativa.

### Exemplo do texto gerado

```
📊 *RESUMO CRM — 31/03/2026*
━━━━━━━━━━━━━━━━━━━━━━━━

*📬 Totais do período*
• Ações realizadas: *3*
• Mensagens enviadas: *18.5K*
• Mensagens entregues: *15.2K* (82.2%)
• Conversões: *620* (3.4%)

*📡 Por canal*
💬 WhatsApp: 10.0K envios → 320 conv. (3.2%)
📧 E-mail: 8.5K envios → 300 conv. (3.5%)

*🏷️ Por marca*
• GMSP: 8.0K env. | 280 conv. (3.5%)
• Volkswagen: 6.5K env. | 220 conv. (3.4%)
• GAC: 4.0K env. | 120 conv. (3.0%)

*🏆 Destaque do dia*
"Campanha Primavera GMSP"
• 8.0K enviadas → 280 conversões (3.5%)
• Fonte: WhatsApp Manager | Canal: WhatsApp

━━━━━━━━━━━━━━━━━━━━━━━━
_Gerado automaticamente pelo CRM Dashboard_
```

---

## Dúvidas frequentes

**O dashboard não carrega os dados. O que fazer?**
Verifique se: (1) a URL do Apps Script está correta no `index.html`; (2) as abas da planilha têm os nomes exatos; (3) o Apps Script foi publicado com acesso "Qualquer pessoa".

**Posso adicionar mais marcas?**
Sim! Basta adicionar uma nova linha na aba `Marcas` da planilha.

**Posso adicionar mais tipos de canal além de WhatsApp e E-mail?**
Os tipos suportados são: `WhatsApp`, `E-mail`, `SMS` e `Push`. Basta usar um desses na coluna `tipo` da aba `Acoes`.

**Os dados do mês anterior não aparecem corretamente.**
Preencha as colunas `ant_*` na aba `Config` com os valores do mês anterior para que o dashboard calcule a variação percentual.
