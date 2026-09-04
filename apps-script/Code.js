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

var TOKEN = 'b926c87c6cdf9c79d8ec0cac2d045c34346555ff9f986601';

var SHEET_ABASTECIMENTOS = 'Abastecimentos';
var SHEET_MAQUINARIOS = 'Maquinarios';
var SHEET_PESSOAS = 'Pessoas';

var ABASTECIMENTO_COLUNAS = [
  'ID', 'DATA', 'HORARIO', 'FAZENDA', 'MAQUINARIO', 'PLACA',
  'TIPO_COMBUSTIVEL', 'QUANTIDADE', 'HODOMETRO_HORIMETRO',
  'PARCIAL_OU_COMPLETO', 'OPERADOR', 'RESPONSAVEL', 'ENVIADO_EM'
];

// PLACA fica em branco para maquinario que nao tem placa (ex: trator).
var MAQUINARIO_COLUNAS = ['FAZENDA', 'MAQUINARIO', 'PLACA'];

// FUNCAO deve ser "MOTORISTA" (para quem dirige caminhao/veiculo com placa)
// ou "OPERADOR" (para quem opera maquinario sem placa).
var PESSOA_COLUNAS = ['FAZENDA', 'NOME', 'FUNCAO'];

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

// Retorna os veiculos/maquinarios da fazenda (cada um com sua placa, quando
// tiver) e as pessoas ja separadas por funcao (motoristas x operadores),
// para o app filtrar sozinho qual lista mostrar dependendo do veiculo
// escolhido.
function getCadastros_(fazenda) {
  var sheetMaquinarios = getOrCreateSheet_(SHEET_MAQUINARIOS, MAQUINARIO_COLUNAS);
  var linhasMaquinarios = sheetMaquinarios.getDataRange().getValues().slice(1);

  var veiculosVistos = {};
  var veiculos = [];
  linhasMaquinarios.forEach(function (linha) {
    var linhaFazenda = String(linha[0] || '').trim();
    if (fazenda && linhaFazenda !== fazenda) return;

    var maquinario = String(linha[1] || '').trim();
    var placa = String(linha[2] || '').trim();
    if (!maquinario) return;

    var chave = maquinario + '|' + placa;
    if (veiculosVistos[chave]) return;
    veiculosVistos[chave] = true;
    veiculos.push({ maquinario: maquinario, placa: placa });
  });
  veiculos.sort(function (a, b) { return a.maquinario.localeCompare(b.maquinario); });

  var sheetPessoas = getOrCreateSheet_(SHEET_PESSOAS, PESSOA_COLUNAS);
  var linhasPessoas = sheetPessoas.getDataRange().getValues().slice(1);

  var motoristas = {};
  var operadores = {};
  linhasPessoas.forEach(function (linha) {
    var nome = String(linha[1] || '').trim();
    var funcao = String(linha[2] || '').trim().toUpperCase();
    if (!nome) return;

    if (funcao === 'MOTORISTA') {
      // Motorista de caminhao roda entre fazendas, entao a lista de
      // motoristas nao e filtrada por fazenda (aparece igual em todas).
      motoristas[nome] = true;
    } else if (funcao === 'OPERADOR') {
      var linhaFazenda = String(linha[0] || '').trim();
      if (fazenda && linhaFazenda !== fazenda) return;
      operadores[nome] = true;
    }
  });

  return {
    veiculos: veiculos,
    motoristas: Object.keys(motoristas).sort(),
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
  getOrCreateSheet_(SHEET_MAQUINARIOS, MAQUINARIO_COLUNAS);
  getOrCreateSheet_(SHEET_PESSOAS, PESSOA_COLUNAS);
}
