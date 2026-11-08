# Arquitetura e build

## Fluxo

1. `extension/main.js`, no contexto MAIN, observa respostas de operações de conteúdo feitas pela página do X. Não inicia chamadas próprias à API do site.
2. `content.js`, no contexto isolado, encaminha os dados e fornece as ações manuais.
3. `background.js` normaliza conteúdo, persiste trabalhos e acompanha os downloads.
4. `offscreen.js` obtém as mídias permitidas, prepara HTML/Markdown e, quando aplicável, executa o remux local em worker.
5. `core/` reúne normalização, renderização, IndexedDB, nomes, segurança e HLS.

Nenhum backend é necessário. O armazenamento do navegador é específico da instalação, não acompanha o código-fonte e não é uma biblioteca pública.

## Preparação

Node 24 e npm são necessários. A preparação extrai os arquivos sem comandos externos ou scripts dos pacotes.

```sh
npm ci --ignore-scripts
npm run vendor
npm test
npm run build
```

`vendor` baixa os arquivos oficiais indicados em `extension/vendor-lock.json`, verifica SHA-512 e extrai apenas nomes de runtime explicitamente permitidos. O script não executa comandos ou scripts dos pacotes. A rede é necessária nessa preparação, não nos testes. Os arquivos baixados ficam em `extension/vendor/`, ignorada pelo Git.

O build usa os arquivos locais preparados e copia o runtime para `dist/extension`. O manifesto deve ficar diretamente nessa pasta. O comando não instala nem publica a extensão.

## Testes

As fixtures de `tests/fixtures/` são escritas do zero e são inteiramente fictícias. Exercitam artigos com 15 blocos de código, 11 divisórias e estrutura de 202 blocos, além de vídeos, embeds, textos longos, wrappers, edições, enquetes, notas e GIF. Não são dumps de respostas reais.

Testes de parser/renderização não comprovam sozinhos as APIs do Chrome, o comportamento de todas as variantes do X ou o remux com todo arquivo possível. Registre separadamente verificações no navegador e mantenha os limites publicados.

## ZIP de fonte

```sh
npm run audit:public
npm run release:source
```

O arquivo usa uma lista de inclusão definida em `scripts/public-files.mjs`, ordenação estável e timestamps fixos no ZIP. Ele não inclui o runtime de terceiros baixado, perfis de navegador, caches de sessão ou binários da extensão. O hash SHA-256 acompanha o ZIP.

O scanner detecta alguns padrões de caminho pessoal, URL real de post e credenciais. Não substitui a revisão humana. Alterações à lista de inclusão e ao scanner também devem ser revisadas.
