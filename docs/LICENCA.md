# Licença e autoria

O nome é **X-HTML**. A licença escolhida para o código original é **MIT**, com `Copyright (c) 2026 lucascorreaml`. O aviso identifica o criador original e deve acompanhar as cópias e redistribuições, junto com o texto da licença.

## O que a escolha significa

MIT permite uso, modificação, distribuição e uso comercial, preservando o aviso de copyright e a licença. Permite forks e não exige que os forks mostrem o nome do autor em toda tela; o requisito de preservação é o dos avisos da licença. Não concede direitos sobre marcas ou conteúdos de terceiros arquivados com a extensão.

A MIT do código original não elimina a GPL do core FFmpeg nem permite anunciar o binário combinado inteiro como MIT. Créditos e licenças dos componentes de terceiros devem ser preservados. A compatibilidade e as obrigações de distribuição do build devem ser tratadas antes de publicar binários.

## Separação da etapa atual

O ZIP preparado para o GitHub contém somente o código-fonte da extensão, documentação e exemplos fictícios, sem o runtime FFmpeg baixado. O comando de build permite obter os componentes diretamente do upstream, com integridade fixada.

A distribuição pública de um pacote que inclua FFmpeg, inclusive na Chrome Web Store, requer cumprir as condições aplicáveis ao binário e disponibilizar o código-fonte correspondente exigido pela licença. Essa distribuição fica para a etapa da loja. Veja [THIRD_PARTY.md](../THIRD_PARTY.md).

Referências primárias: [licença declarada de @ffmpeg/core](https://www.npmjs.com/package/@ffmpeg/core/v/0.12.10), [fonte e build upstream](https://github.com/ffmpegwasm/ffmpeg.wasm/tree/71aa99d37c02a7b4c435275ca9ef50e612f6efa1), e o [texto GPL incluído](../licenses/GPL-2.0-or-later.txt).
