import React, { useEffect, useRef, useState } from 'react';
import { fetchFeed, marcarLancado } from '../lib/api.js';
import { FAZENDAS } from '../data/fazendas.js';

const INTERVALO_MS = 20000;

function formatarNumeroBr(valor) {
  var numero = Number(valor);
  if (isNaN(numero)) return valor;
  return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function estaLancado(r) {
  return r.LANCADO_NO_SISTEMA === 'SIM';
}

export default function AnalistaFeed() {
  const [fazendaFiltro, setFazendaFiltro] = useState('');
  const [mostrarLancados, setMostrarLancados] = useState(false);
  const [registros, setRegistros] = useState([]);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null);
  const [erro, setErro] = useState('');
  const [marcandoId, setMarcandoId] = useState(null);
  const idsConhecidos = useRef(new Set());

  useEffect(function () {
    carregar();
    var intervalo = setInterval(carregar, INTERVALO_MS);
    return function () { clearInterval(intervalo); };
  }, [fazendaFiltro]);

  async function carregar() {
    try {
      var dados = await fetchFeed(fazendaFiltro || undefined);
      dados.forEach(function (r) { idsConhecidos.current.add(r.ID); });
      setRegistros(dados);
      setUltimaAtualizacao(new Date());
      setErro('');
    } catch (err) {
      setErro('Falha ao atualizar: ' + err.message);
    }
  }

  async function alternarLancado(registro) {
    var novoValor = !estaLancado(registro);
    setMarcandoId(registro.ID);
    try {
      await marcarLancado(registro.ID, novoValor);
      setRegistros(function (atuais) {
        return atuais.map(function (r) {
          if (r.ID !== registro.ID) return r;
          var copia = Object.assign({}, r);
          copia.LANCADO_NO_SISTEMA = novoValor ? 'SIM' : 'NAO';
          return copia;
        });
      });
    } catch (err) {
      setErro('Falha ao marcar: ' + err.message);
    } finally {
      setMarcandoId(null);
    }
  }

  var registrosVisiveis = registros.filter(function (r) {
    return mostrarLancados || !estaLancado(r);
  });

  return (
    <div className="tela">
      <h1>Abastecimentos recentes</h1>

      <label>
        Filtrar por fazenda:
        <select value={fazendaFiltro} onChange={function (e) { setFazendaFiltro(e.target.value); }}>
          <option value="">Todas as fazendas</option>
          {FAZENDAS.map(function (f) { return <option key={f} value={f}>{f}</option>; })}
        </select>
      </label>

      <label className="radio">
        <input
          type="checkbox"
          checked={mostrarLancados}
          onChange={function (e) { setMostrarLancados(e.target.checked); }}
        />
        Mostrar ja lancados no sistema
      </label>

      <p className="status">
        {ultimaAtualizacao ? 'Atualizado as ' + ultimaAtualizacao.toLocaleTimeString() : 'Carregando...'}
        {erro && <span className="aviso"> — {erro}</span>}
      </p>

      <div className="lista-feed">
        {registrosVisiveis.length === 0 && <p>Nenhum abastecimento pendente.</p>}
        {registrosVisiveis.map(function (r) {
          var lancado = estaLancado(r);
          return (
            <div key={r.ID} className={'cartao-feed' + (lancado ? ' cartao-lancado' : '')}>
              <div className="cartao-linha-topo">
                <strong>{r.FAZENDA}</strong>
                <span>{r.DATA} {r.HORARIO}</span>
              </div>
              <div>{r.MAQUINARIO} — {r.PLACA}</div>
              <div>{r.TIPO_COMBUSTIVEL} • {formatarNumeroBr(r.QUANTIDADE)} L • {r.PARCIAL_OU_COMPLETO}</div>
              <div>Hodometro/Horimetro: {formatarNumeroBr(r.HODOMETRO_HORIMETRO)}</div>
              <div>Operador: {r.OPERADOR} • Responsavel: {r.RESPONSAVEL}</div>
              <button
                className={'botao-marcar' + (lancado ? ' marcado' : '')}
                onClick={function () { alternarLancado(r); }}
                disabled={marcandoId === r.ID}
              >
                {marcandoId === r.ID ? 'Salvando...' : (lancado ? '✓ Lancado no sistema' : 'Marcar como lancado')}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
