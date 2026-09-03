const RAWBT_PACKAGE = 'ru.a402d.rawbtprinter';

const ESC = '\x1B';
const GS = '\x1D';
const INICIALIZAR = ESC + '@';
const CENTRALIZAR = ESC + 'a' + '\x01';
const ALINHAR_ESQUERDA = ESC + 'a' + '\x00';

// Impressora 58mm imprime no maximo 384 pontos de largura.
const LARGURA_LOGO_PONTOS = 160;

function byteParaChar(n) {
  return String.fromCharCode(n & 0xff);
}

function carregarImagem(url) {
  return new Promise(function (resolve, reject) {
    var img = new Image();
    img.onload = function () { resolve(img); };
    img.onerror = function () { reject(new Error('Nao foi possivel carregar a logo em ' + url)); };
    img.src = url;
  });
}

// Converte a logo em um bitmap preto/branco no formato raster do ESC/POS (GS v 0).
async function montarComandoLogo(url) {
  var img = await carregarImagem(url);
  var largura = LARGURA_LOGO_PONTOS;
  var larguraBytes = Math.ceil(largura / 8);
  var larguraCanvas = larguraBytes * 8;
  var altura = Math.round(img.height * (largura / img.width));

  var canvas = document.createElement('canvas');
  canvas.width = larguraCanvas;
  canvas.height = altura;
  var ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, larguraCanvas, altura);
  ctx.drawImage(img, 0, 0, larguraCanvas, altura);

  var pixels = ctx.getImageData(0, 0, larguraCanvas, altura).data;
  var dados = '';
  for (var y = 0; y < altura; y++) {
    for (var xByte = 0; xByte < larguraBytes; xByte++) {
      var b = 0;
      for (var bit = 0; bit < 8; bit++) {
        var x = xByte * 8 + bit;
        var i = (y * larguraCanvas + x) * 4;
        var luminancia = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
        var preto = luminancia < 200;
        if (preto) b |= (0x80 >> bit);
      }
      dados += byteParaChar(b);
    }
  }

  var cabecalho =
    GS + 'v' + '0' + byteParaChar(0) +
    byteParaChar(larguraBytes) + byteParaChar(larguraBytes >> 8) +
    byteParaChar(altura) + byteParaChar(altura >> 8);

  return CENTRALIZAR + cabecalho + dados + ALINHAR_ESQUERDA + '\n';
}

function textoParaBytes(texto) {
  var bytes = new Uint8Array(texto.length);
  for (var i = 0; i < texto.length; i++) {
    bytes[i] = texto.charCodeAt(i) & 0xff;
  }
  return bytes;
}

function bytesParaBase64(bytes) {
  var binary = '';
  for (var i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

var MAPA_ACENTOS = {
  'á': 'a', 'à': 'a', 'ã': 'a', 'â': 'a', 'ä': 'a',
  'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
  'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
  'ó': 'o', 'ò': 'o', 'õ': 'o', 'ô': 'o', 'ö': 'o',
  'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
  'ç': 'c', 'ñ': 'n',
  'Á': 'A', 'À': 'A', 'Ã': 'A', 'Â': 'A', 'Ä': 'A',
  'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
  'Í': 'I', 'Ì': 'I', 'Î': 'I', 'Ï': 'I',
  'Ó': 'O', 'Ò': 'O', 'Õ': 'O', 'Ô': 'O', 'Ö': 'O',
  'Ú': 'U', 'Ù': 'U', 'Û': 'U', 'Ü': 'U',
  'Ç': 'C', 'Ñ': 'N'
};

// A maioria das impressoras termicas baratas usa uma pagina de codigo
// (codepage) que nao bate com UTF-8/Latin-1 para acentos, entao trocamos
// por letras simples para garantir que o recibo saia legivel.
function removerAcentos(texto) {
  var resultado = '';
  for (var i = 0; i < texto.length; i++) {
    var caractere = texto[i];
    resultado += MAPA_ACENTOS[caractere] || caractere;
  }
  return resultado;
}

function montarCorpoRecibo(registro) {
  var linhas = [
    'BIOMASSA CHAPARINI',
    'Comprovante de abastecimento',
    '--------------------------------',
    'Fazenda: ' + registro.FAZENDA,
    'Data: ' + registro.DATA + '  Hora: ' + registro.HORARIO,
    'Maquinario: ' + registro.MAQUINARIO,
    'Placa: ' + registro.PLACA,
    'Combustivel: ' + registro.TIPO_COMBUSTIVEL,
    'Quantidade: ' + registro.QUANTIDADE + ' L',
    'Hodometro/Horimetro: ' + registro.HODOMETRO_HORIMETRO,
    'Abastecimento: ' + registro.PARCIAL_OU_COMPLETO,
    'Operador: ' + registro.OPERADOR,
    'Responsavel: ' + registro.RESPONSAVEL,
    '--------------------------------',
    '',
    '',
    ''
  ];
  return removerAcentos(linhas.join('\n'));
}

export function montarReciboAbastecimento(registro) {
  return INICIALIZAR + montarCorpoRecibo(registro);
}

// Versao com a logo no topo. Se a imagem nao carregar por qualquer motivo,
// cai automaticamente para o recibo so com texto (nunca trava a impressao).
export async function montarReciboComLogo(registro) {
  var corpo = montarCorpoRecibo(registro);
  try {
    var logo = await montarComandoLogo(import.meta.env.BASE_URL + 'logo-recibo.png');
    return INICIALIZAR + logo + corpo;
  } catch (err) {
    return INICIALIZAR + corpo;
  }
}

export function imprimirViaRawBT(textoOuBytes) {
  var bytes = typeof textoOuBytes === 'string' ? textoParaBytes(textoOuBytes) : textoOuBytes;
  var base64 = bytesParaBase64(bytes);
  var url = 'intent:base64,' + base64 + '#Intent;scheme=rawbt;package=' + RAWBT_PACKAGE + ';end;';
  window.location.href = url;
}
