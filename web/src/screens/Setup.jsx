import React, { useState } from 'react';
import { FAZENDAS } from '../data/fazendas.js';
import { saveDeviceConfig } from '../lib/deviceConfig.js';

export default function Setup({ onConfigured }) {
  const [perfil, setPerfil] = useState('responsavel');
  const [fazenda, setFazenda] = useState(FAZENDAS[0]);
  const [nome, setNome] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (perfil === 'responsavel' && !nome.trim()) {
      alert('Informe o nome do responsavel.');
      return;
    }
    saveDeviceConfig({
      perfil: perfil,
      fazenda: perfil === 'responsavel' ? fazenda : null,
      responsavel: perfil === 'responsavel' ? nome.trim() : null
    });
    onConfigured();
  }

  return (
    <div className="tela">
      <h1>Configuracao inicial</h1>
      <p>Configure este aparelho uma unica vez.</p>
      <form onSubmit={handleSubmit} className="form">
        <label>
          Este aparelho e de:
          <select value={perfil} onChange={function (e) { setPerfil(e.target.value); }}>
            <option value="responsavel">Responsavel pelo abastecimento (fazenda)</option>
            <option value="analista">Analista (escritorio)</option>
          </select>
        </label>

        {perfil === 'responsavel' && (
          <>
            <label>
              Fazenda deste aparelho:
              <select value={fazenda} onChange={function (e) { setFazenda(e.target.value); }}>
                {FAZENDAS.map(function (f) {
                  return <option key={f} value={f}>{f}</option>;
                })}
              </select>
            </label>
            <label>
              Seu nome (responsavel pelo abastecimento):
              <input value={nome} onChange={function (e) { setNome(e.target.value); }} placeholder="Nome completo" />
            </label>
          </>
        )}

        <button type="submit">Salvar configuracao</button>
      </form>
    </div>
  );
}
