// PIN simples para proteger acoes administrativas (gravar etiqueta, trocar
// configuracao do aparelho). Nao e uma seguranca forte (fica no codigo do
// app), mas evita que qualquer pessoa mexa nessas opcoes sem querer.
const PIN_ADMIN = '2308';

export function pedirAcessoAdmin() {
  var digitado = window.prompt('Digite a senha de acesso:');
  if (digitado === null) return false;
  if (digitado !== PIN_ADMIN) {
    window.alert('Senha incorreta.');
    return false;
  }
  return true;
}
