import React, { useState } from 'react';
import Setup from './screens/Setup.jsx';
import ResponsavelForm from './screens/ResponsavelForm.jsx';
import AnalistaFeed from './screens/AnalistaFeed.jsx';
import GravarEtiquetaNFC from './screens/GravarEtiquetaNFC.jsx';
import { getDeviceConfig, clearDeviceConfig } from './lib/deviceConfig.js';
import { pedirAcessoAdmin } from './lib/admin.js';

export default function App() {
  const [config, setConfig] = useState(getDeviceConfig());
  const [mostrarGravarNfc, setMostrarGravarNfc] = useState(false);

  function handleTrocarConfiguracao() {
    if (!pedirAcessoAdmin()) return;
    if (window.confirm('Trocar a configuracao deste aparelho?')) {
      clearDeviceConfig();
      setConfig(null);
    }
  }

  function handleGravarNfc() {
    if (!pedirAcessoAdmin()) return;
    setMostrarGravarNfc(true);
  }

  if (!config) {
    return <Setup onConfigured={function () { setConfig(getDeviceConfig()); }} />;
  }

  if (mostrarGravarNfc) {
    return <GravarEtiquetaNFC onVoltar={function () { setMostrarGravarNfc(false); }} />;
  }

  return (
    <div>
      {config.perfil === 'responsavel'
        ? <ResponsavelForm deviceConfig={config} />
        : <AnalistaFeed />}
      <button className="link-trocar" onClick={handleGravarNfc}>Gravar etiqueta NFC de uma maquina</button>
      <button className="link-trocar" onClick={handleTrocarConfiguracao}>Trocar configuracao do aparelho</button>
    </div>
  );
}
