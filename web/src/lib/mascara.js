// Mascara numeros no padrao brasileiro enquanto a pessoa digita (ex: "123456"
// vira "1.234,56"), guardando so os digitos internamente para nao perder
// precisao. Use junto com <input type="text" inputMode="decimal">.

function apenasDigitos(texto) {
  return String(texto || '').replace(/\D/g, '');
}

export function digitosParaMascara(digitosOuTexto, comSeparadorMilhar) {
  var digitos = apenasDigitos(digitosOuTexto);
  if (!digitos) return '';

  digitos = digitos.replace(/^0+(?=\d)/, '');
  while (digitos.length < 3) digitos = '0' + digitos;

  var inteiro = digitos.slice(0, -2);
  var decimal = digitos.slice(-2);

  if (comSeparadorMilhar) {
    inteiro = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  return inteiro + ',' + decimal;
}

export function mascaraParaNumero(mascara) {
  if (!mascara) return '';
  var limpo = String(mascara).replace(/\./g, '').replace(',', '.');
  var numero = parseFloat(limpo);
  return isNaN(numero) ? '' : numero;
}
