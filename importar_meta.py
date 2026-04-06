#!/usr/bin/env python3
# ═══════════════════════════════════════════════════════════════════
#  IMPORTADOR META → GOOGLE SHEETS
#  Lê arquivos CSV exportados pelo Meta (WhatsApp Manager),
#  agrupados por marca em arquivos ZIP, e alimenta a planilha
#  Google Sheets integrada ao dashboard CRM.
# ═══════════════════════════════════════════════════════════════════

import os
import sys
import glob
import zipfile
import json
import re
import requests
import pandas as pd
from datetime import datetime
from pathlib import Path

# ───────────────────────────────────────────────────────────────────
# CONFIGURAÇÃO — Altere apenas esta seção
# ───────────────────────────────────────────────────────────────────

# URL do Apps Script publicado (Web App)
APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzjM9Eyelg9_1NedNfqBS9RJ_pTA78KLwujC7DkgzwNyB7dGNykWslZ4ajqqUr3bfIG/exec"

# Pasta onde estão os arquivos ZIP (cada ZIP deve ter o nome da marca)
# Exemplo: GMSP.zip, Volkswagen.zip, etc.
PASTA_ZIPS = "./zips"

# ───────────────────────────────────────────────────────────────────
# FUNÇÕES AUXILIARES
# ───────────────────────────────────────────────────────────────────

def extrair_nome_modelo(nome_arquivo):
    """
    Usa o nome do arquivo CSV como nome do modelo/campanha.
    Exemplo: 'TRACKER.csv' → 'TRACKER'
    Se o arquivo ainda tiver o nome padrão do Meta (insights_...), usa a data de início.
    """
    nome = Path(nome_arquivo).stem  # Remove extensão
    # Se o arquivo foi renomeado pelo usuário (não começa com 'insights_'), usa o nome diretamente
    if not nome.lower().startswith('insights_'):
        return nome
    # Fallback para arquivos com nome padrão do Meta: usa a data de início
    match = re.search(r'insights_(\d{4}-\d{2}-\d{2})_to_', nome)
    if match:
        data_inicio = match.group(1)
        return f"Disparo {data_inicio}"
    return nome


def processar_csv(caminho_csv):
    """
    Lê um CSV do Meta e retorna um dicionário com as métricas totais.
    Agrega todos os dias do período em totais únicos.
    """
    try:
        df = pd.read_csv(caminho_csv)
    except Exception:
        try:
            df = pd.read_csv(caminho_csv, encoding='latin1')
        except Exception as e:
            print(f"  [ERRO] Não foi possível ler {caminho_csv}: {e}")
            return None

    # Verificar se tem as colunas esperadas
    colunas_esperadas = ['METRIC', 'COUNT']
    for col in colunas_esperadas:
        if col not in df.columns:
            print(f"  [AVISO] Coluna '{col}' não encontrada em {caminho_csv}")
            return None

    # Normalizar nomes das colunas
    df.columns = [c.strip() for c in df.columns]

    # Agregar totais por métrica
    totais = df.groupby('METRIC')['COUNT'].sum().to_dict()

    # Extrair métricas relevantes
    enviadas   = int(totais.get('Mensagens enviadas', 0))
    entregues  = int(totais.get('Mensagens entregues', 0))

    # Cliques: somar todos os botões EXCETO "Parar promoções"
    cliques_total = 0
    cliques_parar = 0

    if 'BUTTON TEXT' in df.columns:
        # Cliques de resposta rápida (botões)
        df_botoes = df[df['METRIC'].str.contains('Cliques', case=False, na=False)].copy()
        for _, row in df_botoes.iterrows():
            btn = str(row.get('BUTTON TEXT', '')).strip().lower()
            count = int(row.get('COUNT', 0))
            if 'parar' in btn or 'stop' in btn or 'opt-out' in btn:
                cliques_parar += count
            else:
                cliques_total += count
    else:
        # Fallback: somar todos os cliques
        for metrica, valor in totais.items():
            if 'clique' in metrica.lower():
                cliques_total += int(valor)

    # Taxa de conversão = cliques / entregues
    taxa_conversao = 0.0
    if entregues > 0:
        taxa_conversao = round((cliques_total / entregues) * 100, 2)

    # Extrair data de início do período (primeira data do CSV)
    data_disparo = ""
    if 'DATE IN UTC (yyyy-MM-dd)' in df.columns:
        datas = df['DATE IN UTC (yyyy-MM-dd)'].dropna().unique()
        if len(datas) > 0:
            # Pegar a data mais antiga (início do disparo)
            data_disparo = str(sorted(datas)[0])
    elif 'DATE' in df.columns:
        datas = df['DATE'].dropna().unique()
        if len(datas) > 0:
            data_disparo = str(sorted(datas)[0])

    return {
        'enviadas': enviadas,
        'entregues': entregues,
        'cliques': cliques_total,
        'cliques_parar': cliques_parar,
        'taxa_conversao': taxa_conversao,
        'data_disparo': data_disparo,
    }


def processar_zip(caminho_zip):
    """
    Extrai o nome da marca do arquivo ZIP e processa todos os CSVs dentro.
    Retorna uma lista de dicionários prontos para enviar ao Google Sheets.
    """
    nome_marca = Path(caminho_zip).stem  # Ex: "GMSP"
    print(f"\n{'='*60}")
    print(f"  Processando marca: {nome_marca}")
    print(f"{'='*60}")

    registros = []

    with zipfile.ZipFile(caminho_zip, 'r') as zf:
        # Listar apenas arquivos CSV
        csvs = [n for n in zf.namelist() if n.lower().endswith('.csv')]
        print(f"  Encontrados {len(csvs)} arquivo(s) CSV")

        for csv_name in sorted(csvs):
            print(f"\n  → Processando: {Path(csv_name).name}")

            # Extrair CSV para pasta temporária
            pasta_temp = f"/tmp/meta_import_{nome_marca}"
            os.makedirs(pasta_temp, exist_ok=True)
            zf.extract(csv_name, pasta_temp)
            caminho_extraido = os.path.join(pasta_temp, csv_name)

            # Processar o CSV
            metricas = processar_csv(caminho_extraido)
            if metricas is None:
                continue

            # Nome do modelo/campanha baseado no arquivo
            nome_modelo = extrair_nome_modelo(Path(csv_name).name)

            # Montar registro para o Google Sheets
            registro = {
                'nome': nome_modelo,
                'marca': nome_marca,
                'tipo': 'WhatsApp',
                'enviadas': metricas['enviadas'],
                'entregues': metricas['entregues'],
                'cliques': metricas['cliques'],
                'cliques_parar': metricas['cliques_parar'],
                'taxa_conversao': metricas['taxa_conversao'],
                'data': metricas['data_disparo'],
                'status': 'concluida',
                'mensagem': '',  # Será preenchido manualmente se necessário
            }

            print(f"     Enviadas:   {registro['enviadas']:,}")
            print(f"     Entregues:  {registro['entregues']:,}")
            print(f"     Cliques:    {registro['cliques']:,}")
            print(f"     Conversão:  {registro['taxa_conversao']}%")

            registros.append(registro)

    return registros


def enviar_para_sheets(registros):
    """
    Envia os registros para o Google Sheets via Apps Script (GET com base64).
    O Google bloqueia POST externo, então usamos GET com dados em base64.
    """
    import base64

    if not registros:
        print("\n[AVISO] Nenhum registro para enviar.")
        return False

    print(f"\n{'='*60}")
    print(f"  Enviando {len(registros)} registro(s) para o Google Sheets...")
    print(f"{'='*60}")

    # Codificar os dados em base64 para enviar via GET
    dados_json = json.dumps(registros, ensure_ascii=False)
    dados_b64 = base64.b64encode(dados_json.encode('utf-8')).decode('utf-8')

    try:
        response = requests.get(
            APPS_SCRIPT_URL,
            params={'action': 'importar', 'data': dados_b64},
            timeout=60,
            allow_redirects=True
        )

        if response.status_code == 200:
            try:
                resultado = response.json()
                if resultado.get('sucesso'):
                    print(f"  [OK] {resultado.get('mensagem', 'Dados importados com sucesso!')}")
                    return True
                else:
                    print(f"  [ERRO] Apps Script retornou erro: {resultado.get('erro', 'Erro desconhecido')}")
                    return False
            except Exception:
                print(f"  [ERRO] Resposta inesperada: {response.text[:300]}")
                return False
        else:
            print(f"  [ERRO] HTTP {response.status_code}: {response.text[:300]}")
            return False

    except requests.exceptions.Timeout:
        print("  [ERRO] Timeout ao conectar com o Apps Script. Tente novamente.")
        return False
    except requests.exceptions.ConnectionError as e:
        print(f"  [ERRO] Falha de conexão: {e}")
        return False


def main():
    print("\n" + "="*60)
    print("  IMPORTADOR META → GOOGLE SHEETS CRM DASHBOARD")
    print("="*60)

    # Verificar se foi passado um caminho como argumento
    if len(sys.argv) > 1:
        pasta_ou_zip = sys.argv[1]
    else:
        pasta_ou_zip = PASTA_ZIPS

    # Coletar arquivos ZIP para processar
    if os.path.isfile(pasta_ou_zip) and pasta_ou_zip.lower().endswith('.zip'):
        # Um único ZIP foi passado
        zips = [pasta_ou_zip]
    elif os.path.isdir(pasta_ou_zip):
        # Pasta com múltiplos ZIPs
        zips = sorted(glob.glob(os.path.join(pasta_ou_zip, '*.zip')))
    else:
        print(f"\n[ERRO] Caminho não encontrado: {pasta_ou_zip}")
        print("\nUso:")
        print("  python3 importar_meta.py GMSP.zip")
        print("  python3 importar_meta.py ./pasta_com_zips/")
        sys.exit(1)

    if not zips:
        print(f"\n[AVISO] Nenhum arquivo .zip encontrado em: {pasta_ou_zip}")
        sys.exit(1)

    print(f"\n  Encontrados {len(zips)} arquivo(s) ZIP para processar:")
    for z in zips:
        print(f"    - {Path(z).name}")

    # Processar todos os ZIPs
    todos_registros = []
    for caminho_zip in zips:
        registros = processar_zip(caminho_zip)
        todos_registros.extend(registros)

    print(f"\n  Total de registros extraídos: {len(todos_registros)}")

    # Enviar para o Google Sheets
    if todos_registros:
        sucesso = enviar_para_sheets(todos_registros)
        if sucesso:
            print("\n  Importação concluída com sucesso!")
            print("  Acesse o dashboard para ver os dados atualizados.")
        else:
            print("\n  Falha ao enviar dados. Verifique a URL do Apps Script.")
            print("  Os dados foram extraídos corretamente — veja o resumo acima.")
    else:
        print("\n  Nenhum dado foi extraído dos arquivos.")

    print("\n" + "="*60 + "\n")


if __name__ == '__main__':
    main()
