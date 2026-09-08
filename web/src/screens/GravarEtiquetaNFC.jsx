import React, { useEffect, useState } from 'react';
import { FAZENDAS } from '../data/fazendas.js';
import { fetchCadastros } from '../lib/api.js';
import { nfcSuportado, gravarUrlNaTag, montarUrlEtiqueta } from '../lib/nfc.js';

const SEPARADOR_VEICULO = '||';

function chaveVeiculo(maquinario, placa) {
  return maquinario + SEPARADOR_VEICULO + (placa || '');
}

function rotuloVeiculo(veiculo) {
  return veiculo.placa || veiculo.maquinario;
}

export default function GravarEtiquetaNFC({ onVoltar }) {
  const [fazenda, setFazenda] = useState(FAZENDAS[0]);
  const [tipoVeiculo, setTipoVeiculo] = useState('MAQUINARIO');
  const [cadastros, setCadastros] = useState({ veiculos: [] });
  const [veiculo, setVeiculo] = useState('');
  const [status, setStatus] = useState('');
  const [gravando, setGravando] = useState(false);

  useEffect(function () {
    setVeiculo('');
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

  function handleTipoVeiculoChange(valor) {
    setTipoVeiculo(valor);
    setVeiculo('');
  }

  function veiculosFiltrados() {
    return cadastros.veiculos.filter(function (v) {
      return tipoVeiculo === 'CAMINHAO' ? !!v.placa : !v.placa;
    });
  }

  async function gravar() {
    setStatus('');

    if (!nfcSuportado()) {
      setStatus('Este aparelho/navegador nao suporta gravacao NFC (Web NFC). Use Chrome no Android com o NFC ligado nas configuracoes.');
      return;
    }
    if (!veiculo) {
      setStatus('Escolha o maquinario antes de gravar.');
      return;
    }

    var partes = veiculo.split(SEPARADOR_VEICULO);
    var maquinario = partes[0];
    var placa = partes[1] || '';
    var url = montarUrlEtiqueta(maquinario, placa);

    try {
      setGravando(true);
      setStatus('Encoste o celular na etiqueta NFC agora...');
      await gravarUrlNaTag(url);
      setStatus('Etiqueta gravada com sucesso: ' + maquinario + (placa ? ' / ' + placa : '') + '.');
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

        <fieldset>
          <legend>Tipo</legend>
          <label className="radio">
            <input
              type="radio"
              name="tipoVeiculo"
              value="MAQUINARIO"
              checked={tipoVeiculo === 'MAQUINARIO'}
              onChange={function () { handleTipoVeiculoChange('MAQUINARIO'); }}
            />
            Maquinario
          </label>
          <label className="radio">
            <input
              type="radio"
              name="tipoVeiculo"
              value="CAMINHAO"
              checked={tipoVeiculo === 'CAMINHAO'}
              onChange={function () { handleTipoVeiculoChange('CAMINHAO'); }}
            />
            Caminhao
          </label>
        </fieldset>

        <label>
          {tipoVeiculo === 'CAMINHAO' ? 'Caminhao (placa)' : 'Maquinario'}
          <select value={veiculo} onChange={function (e) { setVeiculo(e.target.value); }}>
            <option value="">Selecione</option>
            {veiculosFiltrados().map(function (v) {
              var chave = chaveVeiculo(v.maquinario, v.placa);
              return <option key={chave} value={chave}>{rotuloVeiculo(v)}</option>;
            })}
          </select>
        </label>

        <button type="submit" disabled={gravando}>{gravando ? 'Aguardando etiqueta...' : 'Gravar etiqueta'}</button>
      </form>

      {status && <p className="status">{status}</p>}

      <button className="link-trocar" onClick={onVoltar}>Voltar</button>
    </div>
  );
}
