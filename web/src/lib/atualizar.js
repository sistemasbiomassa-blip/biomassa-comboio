// Forca verificar se tem uma versao nova do app publicada e recarrega a
// pagina. Pensado para ser um botao simples que qualquer pessoa consiga
// usar, sem precisar saber fechar o app pelos aplicativos recentes.
export async function atualizarApp() {
  try {
    if ('serviceWorker' in navigator) {
      var registro = await navigator.serviceWorker.getRegistration();
      if (registro) await registro.update();
    }
  } catch (err) {
    // Se der erro na verificacao, recarrega mesmo assim.
  }
  window.location.reload();
}
