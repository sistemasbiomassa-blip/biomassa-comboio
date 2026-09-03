# Abastecimento — Biomassa Chaparini

App (PWA) para registrar abastecimento de maquinários e caminhões na fazenda e ver os
lançamentos em tempo quase real no escritório, usando Google Sheets como banco de dados.

## Como funciona

- `apps-script/` — código do Google Apps Script, publicado como Web App. É a API que lê e
  grava na planilha do Google Sheets.
- `web/` — o aplicativo (PWA), instalável no celular sem loja de app. Tem dois perfis:
  - **Responsável** (fazenda): preenche o formulário de abastecimento. Funciona offline —
    o registro fica salvo no aparelho e é enviado sozinho quando a internet voltar.
  - **Analista** (escritório): vê a lista de abastecimentos recentes, atualizando sozinha
    a cada ~20 segundos.

## Passo 1 — Planilha e Apps Script

1. Crie uma planilha nova no Google Sheets (ex: "Abastecimentos Biomassa Chaparini").
2. Nela, abra **Extensões > Apps Script**.
3. Apague o conteúdo padrão e cole o conteúdo de [`apps-script/Code.js`](apps-script/Code.js).
   Copie também o [`apps-script/appsscript.json`](apps-script/appsscript.json) (no editor
   do Apps Script, ative "Mostrar arquivo de manifesto" nas configurações do projeto).
4. Troque a constante `TOKEN` no topo do `Code.js` por um valor secreto único.
5. Na barra de funções do editor, selecione `setup` e clique em Executar uma vez — isso
   cria as abas `Abastecimentos` e `Cadastros` com os cabeçalhos certos.
6. Preencha a aba `Cadastros` com as colunas `FAZENDA | MAQUINARIO | PLACA | OPERADOR`,
   uma linha para cada combinação existente em cada fazenda (é dessa aba que o app
   carrega os menus suspensos).
7. Clique em **Implantar > Nova implantação**:
   - Tipo: **Aplicativo da Web**
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
8. Copie a URL gerada (termina em `/exec`) — vai usar no passo 2.

## Passo 2 — Configurar o app

1. Entre em `web/` e copie `.env.example` para `.env`.
2. Preencha `VITE_APPS_SCRIPT_URL` com a URL do passo 1 e `VITE_API_TOKEN` com o mesmo
   token usado no `Code.js`.
3. Edite [`web/src/data/fazendas.js`](web/src/data/fazendas.js) com o nome real das
   fazendas (precisa ser idêntico ao usado na coluna `FAZENDA` da aba `Cadastros`).
4. Instale as dependências e rode localmente:
   ```
   cd web
   npm install
   npm run dev
   ```
5. Teste no navegador: configure o aparelho como "Responsável", escolha uma fazenda,
   registre um abastecimento e confirme que a linha aparece na planilha. Depois configure
   outro navegador/aba como "Analista" e confirme que o lançamento aparece na lista.
6. Para testar o modo offline: com o app aberto, ative o modo avião (ou desligue o Wi-Fi),
   registre um abastecimento (deve aparecer "aguardando envio"), reative a internet e
   confirme que ele sincroniza sozinho.

## Passo 3 — Publicar (GitHub Pages)

1. Se o repositório for publicado em `https://SEU_USUARIO.github.io/biomassa-comboio/`,
   ajuste `base` em [`web/vite.config.js`](web/vite.config.js) para `'/biomassa-comboio/'`.
2. Gere o build:
   ```
   cd web
   npm run build
   ```
3. Publique a pasta `web/dist` no GitHub Pages (ex: branch `gh-pages`, ou GitHub Actions).
4. No celular, abra o link no Chrome e use "Adicionar à tela inicial" para instalar o PWA.
   Repita a configuração inicial (perfil/fazenda) em cada aparelho.

## Limitações conhecidas (MVP)

- Não há login individual — cada aparelho é configurado uma vez com fazenda/nome/perfil.
- A visão do analista atualiza por consulta periódica (polling a cada 20s), não é push
  instantâneo. Para isso, seria necessário migrar de Google Sheets para algo como Firebase.
- Cadastro de maquinário/placa/operador é feito direto na planilha (aba `Cadastros`), sem
  tela própria no app.
- Os ícones em `web/public/icons/icon.svg` são um placeholder — troque pela logo real da
  Biomassa Chaparini quando tiver o arquivo.
