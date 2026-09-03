import React, { useEffect, useState } from 'react';
import { FAZENDAS } from '../data/fazendas.js';
import { fetchCadastros } from '../lib/api.js';
import { nfcSuportado, gravarUrlNaTag, montarUrlEtiqueta } from '../lib/nfc.js';

export default function GravarEtiquetaNFC({ onVoltar }) {
  const [fazenda, setFazenda] = useState(FAZENDAS[0]);
  const [cadastros, setCadastros] = useState({ maquinarios: [], placas: [] });
  const [maquinario, setMaquinario] = useState('');
  const [placa, setPlaca] = useState('');
  const [status, setStatus] = useState('');
  const [gravando, setGravando] = useState(false);

  useEffect(function () {
    carregarCadastros();
  }, [fazenda]);

  async function carregarCadastros() {
    try {
      var dados = await fetchCadastros(fazenda);
      setCadastros(dados);
    } catch (err) {
      setStatus('Nao foi possivel carregar a lista da planilha (' + err.message + '). Configure o web/.env primeiro.');
    }
  }

  async function gravar() {
    setStatus('');

    if (!nfcSuportado()) {
      setStatus('Este aparelho/navegador nao suporta gravacao NFC (Web NFC). Use Chrome no Android com o NFC ligado nas configuracoes.');
      return;
    }
    if (!maquinario || !placa) {
      setStatus('Escolha o maquinario e a placa antes de gravar.');
      return;
    }

    var url = montarUrlEtiqueta(maquinario, placa);

    try {
      setGravando(true);
      setStatus('Encoste o celular na etiqueta NFC agora...');
      await gravarUrlNaTag(url);
      setStatus('Etiqueta gravada com sucesso: ' + maquinario + ' / ' + placa + '.');
    } catch (err) {
      setStatus('Erro ao gravar: ' + err.message);
    } finally {
      setGravando(false);
    }
  }

  return (
    <div className="tela">
      <h1>Gravar etiqueta NFC</h1>
      <p>Escolha a maquina, aproxime a etiqueta em branco e toque em "Gravar".</p>

      <form className="form" onSubmit={function (e) { e.preventDefault(); gravar(); }}>
        <label>
          Fazenda
          <select value={fazenda} onChange={function (e) { setFazenda(e.target.value); }}>
            {FAZENDAS.map(function (f) { return <option key={f} value={f}>{f}</option>; })}
          </select>
        </label>

        <label>
          Maquinario / Caminhao
          <select value={maquinario} onChange={function (e) { setMaquinario(e.target.value); }}>
            <option value="">Selecione</option>
            {cadastros.maquinarios.map(function (m) { return <option key={m} value={m}>{m}</option>; })}
          </select>
        </label>

        <label>
          Placa
          <select value={placa} onChange={function (e) { setPlaca(e.target.value); }}>
            <option value="">Selecione</option>
            {cadastros.placas.map(function (p) { return <option key={p} value={p}>{p}</option>; })}
          </select>
        </label>

        <button type="submit" disabled={gravando}>{gravando ? 'Aguardando etiqueta...' : 'Gravar etiqueta'}</button>
      </form>

      {status && <p className="status">{status}</p>}

      <button className="link-trocar" onClick={onVoltar}>Voltar</button>
    </div>
  );
}
