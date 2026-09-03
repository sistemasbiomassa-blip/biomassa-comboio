/**
 * API de Abastecimentos - Biomassa Chaparini
 *
 * Publicar como Web App (Implantar > Nova implantação > Aplicativo da Web):
 *   - Executar como: Eu (dono da planilha)
 *   - Quem pode acessar: Qualquer pessoa
 *
 * Depois de publicar, copie a URL do Web App e configure no PWA
 * (arquivo web/.env, chave VITE_APPS_SCRIPT_URL).
 *
 * IMPORTANTE: troque o valor de TOKEN abaixo por um valor secreto próprio
 * e use o mesmo valor em web/.env (VITE_API_TOKEN). Isso evita que alguém
 * que descubra a URL do Web App consiga gravar dados na planilha.
 */

var TOKEN = 'TROQUE-ESTE-TOKEN';

var SHEET_ABASTECIMENTOS = 'Abastecimentos';
var SHEET_CADASTROS = 'Cadastros';

var ABASTECIMENTO_COLUNAS = [
  'ID', 'DATA', 'HORARIO', 'FAZENDA', 'MAQUINARIO', 'PLACA',
  'TIPO_COMBUSTIVEL', 'QUANTIDADE', 'HODOMETRO_HORIMETRO',
  'PARCIAL_OU_COMPLETO', 'OPERADOR', 'RESPONSAVEL', 'ENVIADO_EM'
];

var CADASTRO_COLUNAS = ['FAZENDA', 'MAQUINARIO', 'PLACA', 'OPERADOR'];

function getOrCreateSheet_(nome, colunas) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(nome);
  if (!sheet) {
    sheet = ss.insertSheet(nome);
    sheet.appendRow(colunas);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function checkToken_(token) {
  return token === TOKEN;
}

function doGet(e) {
  var params = (e && e.parameter) || {};
  var action = params.action;

  if (!checkToken_(params.token)) {
    return jsonResponse_({ ok: false, error: 'token invalido' });
  }

  if (action === 'cadastros') {
    return jsonResponse_({ ok: true, data: getCadastros_(params.fazenda) });
  }

  if (action === 'feed') {
    return jsonResponse_({ ok: true, data: getFeed_(params.fazenda, params.desde) });
  }

  return jsonResponse_({ ok: false, error: 'action desconhecida' });
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse_({ ok: false, error: 'JSON invalido' });
  }

  if (!checkToken_(body.token)) {
    return jsonResponse_({ ok: false, error: 'token invalido' });
  }

  var registros = body.records || [];
  var resultado = salvarAbastecimentos_(registros);
  return jsonResponse_({ ok: true, salvos: resultado.salvos, duplicados: resultado.duplicados });
}

function getCadastros_(fazenda) {
  var sheet = getOrCreateSheet_(SHEET_CADASTROS, CADASTRO_COLUNAS);
  var values = sheet.getDataRange().getValues();
  var linhas = values.slice(1);

  var maquinarios = {};
  var placas = {};
  var operadores = {};

  linhas.forEach(function (linha) {
    var linhaFazenda = String(linha[0] || '').trim();
    if (fazenda && linhaFazenda !== fazenda) return;

    var maquinario = String(linha[1] || '').trim();
    var placa = String(linha[2] || '').trim();
    var operador = String(linha[3] || '').trim();

    if (maquinario) maquinarios[maquinario] = true;
    if (placa) placas[placa] = true;
    if (operador) operadores[operador] = true;
  });

  return {
    maquinarios: Object.keys(maquinarios).sort(),
    placas: Object.keys(placas).sort(),
    operadores: Object.keys(operadores).sort()
  };
}

function getFeed_(fazenda, desdeIso) {
  var sheet = getOrCreateSheet_(SHEET_ABASTECIMENTOS, ABASTECIMENTO_COLUNAS);
  var values = sheet.getDataRange().getValues();
  var linhas = values.slice(1);

  var desde = desdeIso ? new Date(desdeIso).getTime() : null;

  var registros = linhas
    .map(function (linha) {
      var obj = {};
      ABASTECIMENTO_COLUNAS.forEach(function (nomeColuna, i) {
        obj[nomeColuna] = linha[i];
      });
      return obj;
    })
    .filter(function (obj) {
      if (fazenda && String(obj.FAZENDA || '').trim() !== fazenda) return false;
      if (desde) {
        var enviadoEm = new Date(obj.ENVIADO_EM).getTime();
        if (isNaN(enviadoEm) || enviadoEm <= desde) return false;
      }
      return true;
    });

  registros.sort(function (a, b) {
    return new Date(b.ENVIADO_EM) - new Date(a.ENVIADO_EM);
  });

  return registros.slice(0, 200);
}

function salvarAbastecimentos_(registros) {
  var sheet = getOrCreateSheet_(SHEET_ABASTECIMENTOS, ABASTECIMENTO_COLUNAS);
  var values = sheet.getDataRange().getValues();
  var idsExistentes = {};
  for (var i = 1; i < values.length; i++) {
    idsExistentes[values[i][0]] = true;
  }

  var novasLinhas = [];
  var duplicados = 0;

  registros.forEach(function (registro) {
    if (!registro.ID || idsExistentes[registro.ID]) {
      duplicados++;
      return;
    }
    idsExistentes[registro.ID] = true;
    novasLinhas.push(ABASTECIMENTO_COLUNAS.map(function (coluna) {
      if (coluna === 'ENVIADO_EM') {
        return new Date().toISOString();
      }
      return registro[coluna] !== undefined ? registro[coluna] : '';
    }));
  });

  if (novasLinhas.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, novasLinhas.length, ABASTECIMENTO_COLUNAS.length)
      .setValues(novasLinhas);
  }

  return { salvos: novasLinhas.length, duplicados: duplicados };
}

/**
 * Rode esta função uma vez manualmente (Executar > setup) para criar
 * as abas com os cabeçalhos corretos antes do primeiro uso.
 */
function setup() {
  getOrCreateSheet_(SHEET_ABASTECIMENTOS, ABASTECIMENTO_COLUNAS);
  getOrCreateSheet_(SHEET_CADASTROS, CADASTRO_COLUNAS);
}
