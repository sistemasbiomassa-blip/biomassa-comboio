import React, { useEffect, useRef, useState } from 'react';
import { fetchFeed } from '../lib/api.js';
import { FAZENDAS } from '../data/fazendas.js';

const INTERVALO_MS = 20000;

function formatarNumeroBr(valor) {
  var numero = Number(valor);
  if (isNaN(numero)) return valor;
  return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AnalistaFeed() {
  const [fazendaFiltro, setFazendaFiltro] = useState('');
  const [registros, setRegistros] = useState([]);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null);
  const [erro, setErro] = useState('');
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

      <p className="status">
        {ultimaAtualizacao ? 'Atualizado as ' + ultimaAtualizacao.toLocaleTimeString() : 'Carregando...'}
        {erro && <span className="aviso"> — {erro}</span>}
      </p>

      <div className="lista-feed">
        {registros.length === 0 && <p>Nenhum abastecimento encontrado.</p>}
        {registros.map(function (r) {
          return (
            <div key={r.ID} className="cartao-feed">
              <div className="cartao-linha-topo">
                <strong>{r.FAZENDA}</strong>
                <span>{r.DATA} {r.HORARIO}</span>
              </div>
              <div>{r.MAQUINARIO} — {r.PLACA}</div>
              <div>{r.TIPO_COMBUSTIVEL} • {formatarNumeroBr(r.QUANTIDADE)} L • {r.PARCIAL_OU_COMPLETO}</div>
              <div>Hodometro/Horimetro: {formatarNumeroBr(r.HODOMETRO_HORIMETRO)}</div>
              <div>Operador: {r.OPERADOR} • Responsavel: {r.RESPONSAVEL}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
