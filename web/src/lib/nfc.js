export function nfcSuportado() {
  return typeof window !== 'undefined' && 'NDEFReader' in window;
}

export async function gravarUrlNaTag(url) {
  var reader = new window.NDEFReader();
  await reader.write({ records: [{ recordType: 'url', data: url }] });
}

export function montarUrlEtiqueta(maquinario, placa) {
  var base = window.location.origin + window.location.pathname;
  var params = new URLSearchParams();
  params.set('maquinario', maquinario);
  params.set('placa', placa);
  return base + '?' + params.toString();
}

export function lerParametrosDeMaquina() {
  var params = new URLSearchParams(window.location.search);
  var maquinario = params.get('maquinario');
  var placa = params.get('placa');
  if (!maquinario && !placa) return null;
  return { maquinario: maquinario || '', placa: placa || '' };
}

export function limparParametrosDaUrl() {
  var url = window.location.origin + window.location.pathname;
  window.history.replaceState({}, '', url);
}
