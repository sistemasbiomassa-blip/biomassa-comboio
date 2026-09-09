const BASE_URL = import.meta.env.VITE_APPS_SCRIPT_URL;
const TOKEN = import.meta.env.VITE_API_TOKEN;

function buildUrl(action, params) {
  var url = new URL(BASE_URL);
  url.searchParams.set('action', action);
  url.searchParams.set('token', TOKEN);
  Object.keys(params || {}).forEach(function (key) {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      url.searchParams.set(key, params[key]);
    }
  });
  return url.toString();
}

export async function fetchCadastros(fazenda) {
  var res = await fetch(buildUrl('cadastros', { fazenda: fazenda }));
  var json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Erro ao buscar cadastros');
  return json.data;
}

export async function fetchFeed(fazenda, desdeIso) {
  var res = await fetch(buildUrl('feed', { fazenda: fazenda, desde: desdeIso }));
  var json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Erro ao buscar lancamentos');
  return json.data;
}

export async function enviarAbastecimentos(records) {
  var res = await fetch(BASE_URL, {
    method: 'POST',
    // text/plain evita a checagem de preflight CORS do navegador para o Apps Script
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ token: TOKEN, records: records })
  });
  var json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Erro ao enviar abastecimento(s)');
  return json;
}

export async function marcarLancado(id, lancado) {
  var res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ token: TOKEN, marcarLancado: { id: id, lancado: lancado } })
  });
  var json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Erro ao marcar lancamento');
  return json;
}
