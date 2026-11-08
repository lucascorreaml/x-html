# X-HTML

![Ícone X-HTML](extension/icons/icon-128.png)

Extensão Chrome Manifest V3 para salvar manualmente conteúdo que você abriu no X. O processamento acontece no navegador; os arquivos ficam na pasta de downloads configurada no Chrome, dentro de `X/`.

O projeto é independente e não tem afiliação com X Corp. Use a extensão apenas para conteúdo que você pode acessar e arquivar. Os direitos sobre os conteúdos continuam com seus respectivos titulares.

## Recursos

- **HTML único:** texto, imagens e vídeos disponíveis incorporados, sem carregar recursos externos ao abrir o arquivo. Links externos continuam clicáveis.
- **Markdown:** metadados YAML e mídias em uma pasta relativa ao documento.
- **Só mídias:** arquivos de imagem, GIF em MP4 e vídeos disponíveis.
- Artigos com títulos, listas, estilos, links, códigos, divisórias e posts incorporados já carregados pelo X.
- Ações por botão junto ao post, popup, menu de contexto e atalho `Alt+Shift+S`.
- Nomes legíveis, controle de colisões e substituição por identidade do post.

## Instalar a partir do código

Requisitos: **Node.js 24**, npm e Chrome **116 ou superior**. O comando de preparação baixa dependências oficiais com versão fixada e confere SHA-512; não executa scripts dos pacotes.

```sh
npm ci --ignore-scripts
npm run vendor
npm test
npm run build
```

1. Abra `chrome://extensions` no Chrome.
2. Ative **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação** e selecione `dist/extension`.
4. Recarregue a aba do X.

Para atualizar uma instalação local, reconstrua a pasta, clique em **Recarregar** na extensão e recarregue a aba do X. Não há versão publicada na Chrome Web Store vinculada a este repositório nesta etapa.

## Usar

Abra o post ou artigo no X e aguarde carregar. Escolha o formato no popup e use **Salvar post atual** ou o botão **Salvar** junto ao post. O atalho pode ser alterado em `chrome://extensions/shortcuts`.

O destino usa a pasta de downloads do seu Chrome: `X/autor_titulo.html`, `X/autor_titulo.md` e, no Markdown, `X/autor_titulo_midias/`. Não há caminho de usuário fixo. A preferência do Chrome para perguntar onde salvar pode prevalecer. O caminho efetivo é conferido após o Chrome informar o destino; caminhos com mais de 240 caracteres são sinalizados como falha.

O salvamento é sempre manual. Não há biblioteca, serviço em nuvem, conta própria da extensão ou exportação de listas em lote.

## Privacidade

A extensão observa respostas de conteúdo que o próprio X já carregou. Mantém cache local de até 2.000 posts, arquivos temporários de mídia, nomes e estado dos trabalhos para preparar e acompanhar as exportações. Não envia esses dados ao desenvolvedor, não usa analytics e não lê cookies ou cabeçalhos de autenticação. Ao buscar mídias, o navegador se conecta aos servidores de mídia autorizados.

Leia a [política de privacidade](PRIVACY.md), a [justificativa das permissões](docs/PERMISSOES.md) e as [limitações](docs/LIMITACOES.md). Diagnósticos são locais: revise-os antes de compartilhá-los. Remover a extensão elimina seus dados de armazenamento no Chrome; os arquivos baixados precisam ser apagados separadamente.

## Desenvolvimento e distribuição

```sh
npm test                 # testes offline com dados fictícios
npm run audit:public     # verificações automatizadas do conteúdo público
npm run release:source   # ZIP de fonte com lista explícita de inclusão
```

O ZIP de fonte fica em `release/`. Ele inclui código, testes e documentação; não inclui dependências baixadas, capturas de sessão, artigos reais ou dados pessoais de desenvolvimento. O build da extensão fica separado em `dist/extension`.

- [Arquitetura e build](docs/DESENVOLVIMENTO.md)
- [Como contribuir](CONTRIBUTING.md)
- [Segurança](SECURITY.md)
- [Histórico de alterações](CHANGELOG.md)
- [Dependências e licenças](THIRD_PARTY.md)
- [Preparar o repositório no GitHub](docs/GITHUB.md)

## Autoria e licença

Criado originalmente por [lucascorreaml](https://github.com/lucascorreaml). O código original do X-HTML está sob a [licença MIT](LICENSE). Cópias e redistribuições devem preservar o aviso de copyright e o texto da licença.

Componentes de terceiros mantêm suas próprias licenças. Em particular, a MIT do X-HTML não substitui a GPL do core FFmpeg obtido no build. Veja [THIRD_PARTY.md](THIRD_PARTY.md).
