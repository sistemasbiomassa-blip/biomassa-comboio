import React, { useEffect, useState } from 'react';
import { fetchCadastros } from '../lib/api.js';
import { enqueue, trySync, listPending } from '../lib/offlineQueue.js';
import { montarReciboComLogo, imprimirViaRawBT } from '../lib/print.js';
import { lerParametrosDeMaquina, limparParametrosDaUrl } from '../lib/nfc.js';

const CADASTROS_CACHE_KEY = 'biomassa.cadastrosCache.';
const IMPRIMIR_CACHE_KEY = 'biomassa.imprimirRecibo';

function novoUuid() {
  if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  return 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}

function agoraData() {
  var d = new Date();
  return d.toISOString().slice(0, 10);
}

function agoraHorario() {
  var d = new Date();
  return d.toTimeString().slice(0, 5);
}

function campoVazio() {
  return {
    maquinario: '',
    placa: '',
    tipoCombustivel: 'DIESEL',
    quantidade: '',
    hodometro: '',
    parcialOuCompleto: 'COMPLETO',
    operador: ''
  };
}

export default function ResponsavelForm({ deviceConfig }) {
  const { fazenda, responsavel } = deviceConfig;
  const [cadastros, setCadastros] = useState({ maquinarios: [], placas: [], operadores: [] });
  const [campos, setCampos] = useState(function () {
    var daEtiqueta = lerParametrosDeMaquina();
    var vazio = campoVazio();
    if (daEtiqueta) {
      vazio.maquinario = daEtiqueta.maquinario;
      vazio.placa = daEtiqueta.placa;
    }
    return vazio;
  });
  const [veioDeEtiqueta] = useState(function () { return !!lerParametrosDeMaquina(); });
  const [data, setData] = useState(agoraData());
  const [horario, setHorario] = useState(agoraHorario());
  const [status, setStatus] = useState('');
  const [pendentes, setPendentes] = useState(0);
  const [imprimir, setImprimir] = useState(function () {
    return localStorage.getItem(IMPRIMIR_CACHE_KEY) !== 'nao';
  });

  useEffect(function () {
    carregarCadastros();
    atualizarPendentes();
    if (veioDeEtiqueta) limparParametrosDaUrl();
    window.addEventListener('online', sincronizar);
    var intervalo = setInterval(sincronizar, 30000);
    return function () {
      window.removeEventListener('online', sincronizar);
      clearInterval(intervalo);
    };
  }, []);

  async function carregarCadastros() {
    var cacheKey = CADASTROS_CACHE_KEY + fazenda;
    try {
      var dados = await fetchCadastros(fazenda);
      setCadastros(dados);
      localStorage.setItem(cacheKey, JSON.stringify(dados));
    } catch (err) {
      var cache = localStorage.getItem(cacheKey);
      if (cache) {
        setCadastros(JSON.parse(cache));
        setStatus('Sem conexao: usando lista de cadastros salva anteriormente.');
      } else {
        // Dados de teste temporarios, so para permitir testar o formulario/impressao
        // antes do Apps Script/planilha real estarem configurados (ver web/.env.example).
        setCadastros({
          maquinarios: ['TRATOR TESTE'],
          placas: ['ABC-1234'],
          operadores: ['OPERADOR TESTE']
        });
        setStatus('Sem conexao com a planilha: usando dados de teste temporarios.');
      }
    }
  }

  async function atualizarPendentes() {
    var lista = await listPending();
    setPendentes(lista.length);
  }

  async function sincronizar() {
    var resultado = await trySync();
    await atualizarPendentes();
    if (resultado.salvos > 0) {
      setStatus(resultado.salvos + ' abastecimento(s) sincronizado(s) com a planilha.');
    }
  }

  function atualizarCampo(nome, valor) {
    setCampos(function (atual) {
      var copia = Object.assign({}, atual);
      copia[nome] = valor;
      return copia;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!campos.maquinario || !campos.placa || !campos.operador || !campos.quantidade || !campos.hodometro) {
      alert('Preencha todos os campos.');
      return;
    }

    var registro = {
      ID: novoUuid(),
      DATA: data,
      HORARIO: horario,
      FAZENDA: fazenda,
      MAQUINARIO: campos.maquinario,
      PLACA: campos.placa,
      TIPO_COMBUSTIVEL: campos.tipoCombustivel,
      QUANTIDADE: campos.quantidade,
      HODOMETRO_HORIMETRO: campos.hodometro,
      PARCIAL_OU_COMPLETO: campos.parcialOuCompleto,
      OPERADOR: campos.operador,
      RESPONSAVEL: responsavel
    };

    await enqueue(registro);

    if (imprimir) {
      imprimirViaRawBT(await montarReciboComLogo(registro));
    }

    setStatus('Abastecimento salvo no aparelho. Enviando...');
    setCampos(campoVazio());
    setData(agoraData());
    setHorario(agoraHorario());
    sincronizar();
  }

  function alternarImprimir(valor) {
    setImprimir(valor);
    localStorage.setItem(IMPRIMIR_CACHE_KEY, valor ? 'sim' : 'nao');
  }

  return (
    <div className="tela">
      <h1>Registrar abastecimento</h1>
      <p className="fazenda-fixa">Fazenda: <strong>{fazenda}</strong> — Responsavel: <strong>{responsavel}</strong></p>
      {veioDeEtiqueta && <p className="status">Maquinario e placa preenchidos pela etiqueta NFC. Confira e corrija se necessario.</p>}
      {pendentes > 0 && <p className="aviso">{pendentes} lancamento(s) aguardando envio.</p>}
      {status && <p className="status">{status}</p>}

      <form onSubmit={handleSubmit} className="form">
        <label>
          Data
          <input type="date" value={data} onChange={function (e) { setData(e.target.value); }} />
        </label>
        <label>
          Horario
          <input type="time" value={horario} onChange={function (e) { setHorario(e.target.value); }} />
        </label>

        <label>
          Maquinario / Caminhao
          <select value={campos.maquinario} onChange={function (e) { atualizarCampo('maquinario', e.target.value); }}>
            <option value="">Selecione</option>
            {cadastros.maquinarios.map(function (m) { return <option key={m} value={m}>{m}</option>; })}
          </select>
        </label>

        <label>
          Placa
          <select value={campos.placa} onChange={function (e) { atualizarCampo('placa', e.target.value); }}>
            <option value="">Selecione</option>
            {cadastros.placas.map(function (p) { return <option key={p} value={p}>{p}</option>; })}
          </select>
        </label>

        <label>
          Tipo de combustivel
          <select value={campos.tipoCombustivel} onChange={function (e) { atualizarCampo('tipoCombustivel', e.target.value); }}>
            <option value="DIESEL">Diesel</option>
            <option value="GASOLINA">Gasolina</option>
          </select>
        </label>

        <label>
          Quantidade (litros)
          <input type="number" step="0.01" value={campos.quantidade} onChange={function (e) { atualizarCampo('quantidade', e.target.value); }} />
        </label>

        <label>
          Hodometro / Horimetro
          <input type="number" step="0.01" value={campos.hodometro} onChange={function (e) { atualizarCampo('hodometro', e.target.value); }} />
        </label>

        <fieldset>
          <legend>Abastecimento</legend>
          <label className="radio">
            <input
              type="radio"
              name="parcialOuCompleto"
              value="PARCIAL"
              checked={campos.parcialOuCompleto === 'PARCIAL'}
              onChange={function (e) { atualizarCampo('parcialOuCompleto', e.target.value); }}
            />
            Parcial
          </label>
          <label className="radio">
            <input
              type="radio"
              name="parcialOuCompleto"
              value="COMPLETO"
              checked={campos.parcialOuCompleto === 'COMPLETO'}
              onChange={function (e) { atualizarCampo('parcialOuCompleto', e.target.value); }}
            />
            Completo
          </label>
        </fieldset>

        <label>
          Operador
          <select value={campos.operador} onChange={function (e) { atualizarCampo('operador', e.target.value); }}>
            <option value="">Selecione</option>
            {cadastros.operadores.map(function (o) { return <option key={o} value={o}>{o}</option>; })}
          </select>
        </label>

        <label className="radio">
          <input
            type="checkbox"
            checked={imprimir}
            onChange={function (e) { alternarImprimir(e.target.checked); }}
          />
          Imprimir recibo automaticamente (RawBT)
        </label>

        <button type="submit">Registrar abastecimento</button>
      </form>
    </div>
  );
}
