# Abastecimento — Biomassa Chaparini

App (PWA) para registrar abastecimento de maquinários e caminhões na fazenda e ver os
lançamentos em tempo quase real no escritório, usando Google Sheets como banco de dados.

App publicado em: **https://sistemasbiomassa-blip.github.io/biomassa-comboio/**
(deploy automático via GitHub Actions a cada push na branch `main`).

## Como funciona

- `apps-script/` — código do Google Apps Script, publicado como Web App. É a API que lê e
  grava na planilha do Google Sheets.
- `web/` — o aplicativo (PWA), instalável no celular sem loja de app. Tem dois perfis:
  - **Responsável** (fazenda): preenche o formulário de abastecimento. Funciona offline —
    o registro fica salvo no aparelho e é enviado sozinho quando a internet voltar. Pode
    imprimir um recibo automaticamente (via app RawBT) e ler etiquetas NFC coladas nas
    máquinas para pré-preencher o maquinário.
  - **Analista** (escritório): vê a lista de abastecimentos recentes, atualizando sozinha
    a cada ~20 segundos.
  - Ações administrativas ("Gravar etiqueta NFC", "Trocar configuração do aparelho") pedem
    um PIN antes de abrir (ver `web/src/lib/admin.js`).

## Passo 1 — Planilha e Apps Script

1. Crie uma planilha nova no Google Sheets (ex: "Abastecimentos Biomassa Chaparini").
2. Nela, abra **Extensões > Apps Script**.
3. Apague o conteúdo padrão e cole o conteúdo de [`apps-script/Code.js`](apps-script/Code.js).
   Copie também o [`apps-script/appsscript.json`](apps-script/appsscript.json) (no editor
   do Apps Script, ative "Mostrar arquivo de manifesto" nas configurações do projeto).
4. Troque a constante `TOKEN` no topo do `Code.js` por um valor secreto único.
5. Na barra de funções do editor, selecione `setup` e clique em Executar uma vez — isso
   cria as abas `Abastecimentos`, `Maquinarios` e `Pessoas` com os cabeçalhos certos.
6. Preencha as duas abas de cadastro:
   - **`Maquinarios`**: colunas `FAZENDA | MAQUINARIO | PLACA` — uma linha por máquina ou
     caminhão de cada fazenda. Deixe `PLACA` em branco para maquinário que não tem placa
     (trator, skidder etc) — nesse caso o app mostra o nome (ex: `SKIDDER 01`). Para
     caminhão, preencha os dois campos (pode repetir o mesmo texto em `MAQUINARIO` e
     `PLACA` se não tiver um nome/modelo separado) — o app mostra só a placa na lista,
     já que é o jeito mais rápido de identificar o caminhão.
   - **`Pessoas`**: colunas `FAZENDA | NOME | FUNCAO` — uma linha por pessoa, com `FUNCAO`
     igual a `MOTORISTA` (dirige veículo com placa) ou `OPERADOR` (opera maquinário sem
     placa). O app mostra automaticamente só a lista certa dependendo do veículo escolhido
     no formulário — não precisa vincular pessoa a máquina fixa, qualquer motorista/operador
     do turno pode ser escolhido a cada abastecimento.
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
   fazendas (precisa ser idêntico ao usado na coluna `FAZENDA` das abas `Maquinarios`/`Pessoas`).
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

## Passo 3 — Publicar (já configurado)

O repositório já tem um workflow (`.github/workflows/deploy.yml`) que builda e publica
automaticamente no GitHub Pages a cada `git push` na branch `main`. Falta só configurar os
segredos do repositório (Settings → Secrets and variables → Actions) com os valores reais:

- `VITE_APPS_SCRIPT_URL`
- `VITE_API_TOKEN`

Depois de configurados, qualquer push refaz o build já com esses valores embutidos. No
celular, abra o link publicado no Chrome e use "Adicionar à tela inicial" para instalar o
PWA. Repita a configuração inicial (perfil/fazenda) em cada aparelho.

**Atenção ao Service Worker**: depois de publicar uma atualização, o app instalado só pega
a nova versão depois de ser fechado por completo (não só minimizado) e reaberto.

## Limitações conhecidas (MVP)

- Não há login individual — cada aparelho é configurado uma vez com fazenda/nome/perfil. O
  PIN em `web/src/lib/admin.js` protege só as ações administrativas, não é autenticação real.
- A visão do analista atualiza por consulta periódica (polling a cada 20s), não é push
  instantâneo. Para isso, seria necessário migrar de Google Sheets para algo como Firebase.
- Cadastro de maquinário/placa/pessoas é feito direto na planilha (abas `Maquinarios` e
  `Pessoas`), sem tela própria no app.
- Impressão automática de recibo depende do app **RawBT** (Play Store) instalado e da
  impressora pareada nele — só funciona em Android/Chrome, não em iOS.
- Gravação de etiquetas NFC (tela "Gravar etiqueta NFC") só funciona em Chrome Android.
