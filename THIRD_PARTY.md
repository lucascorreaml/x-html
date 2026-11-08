# Dependências de terceiros

O repositório de fonte não inclui o diretório `extension/vendor/` nem distribui os binários compilados do FFmpeg. `npm run vendor` baixa os pacotes oficiais e verifica os hashes SHA-512 de `extension/vendor-lock.json` para uso no build local. Não há dependências npm executáveis instaladas no projeto raiz.

| Componente | Versão | Licença declarada pelo pacote |
|---|---|---|
| `@ffmpeg/ffmpeg` — wrapper JavaScript | 0.12.15 | MIT |
| `@ffmpeg/core` — core JavaScript/WebAssembly | 0.12.10 | GPL-2.0-or-later |

Textos das licenças e avisos de autoria ficam em `licenses/` e devem acompanhar os builds. Autores de componentes de terceiros são mantidos nos seus avisos de copyright; esses créditos não identificam o usuário que desenvolveu esta extensão.

## Fontes e procedência

- [Repositório oficial ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm)
- [Snapshot upstream que declara core 0.12.10 e contém o Dockerfile e os scripts de build](https://github.com/ffmpegwasm/ffmpeg.wasm/tree/71aa99d37c02a7b4c435275ca9ef50e612f6efa1)
- [Pacote oficial core 0.12.10](https://www.npmjs.com/package/@ffmpeg/core/v/0.12.10)
- [Licença do wrapper upstream](https://github.com/ffmpegwasm/ffmpeg.wasm/blob/71aa99d37c02a7b4c435275ca9ef50e612f6efa1/LICENSE)

O Dockerfile upstream inclui FFmpeg n5.1.4 e outras bibliotecas com licenças próprias. O hash do pacote comprova integridade da cópia npm, não comprova por si só a correspondência exata entre um snapshot de fontes e o binário publicado. Os hashes fixados não são uma auditoria de vulnerabilidades.

## Antes de distribuir o binário compilado

A licença MIT do wrapper não substitui a GPL do core. Não anuncie o build binário inteiro como MIT, proprietário ou sem obrigações só porque o wrapper é MIT. Antes de publicar um ZIP com o core, o responsável pela distribuição deve definir termos compatíveis e disponibilizar o código-fonte correspondente completo, incluindo os componentes e scripts necessários, conforme a licença aplicável. Um link genérico para o projeto upstream não deve ser tratado como prova de que essa obrigação foi cumprida.

Nesta etapa, a publicação preparada é do código-fonte da extensão sem o runtime de terceiros. A licença MIT e o crédito do código original já estão definidos. A distribuição pública de builds binários e a submissão na loja ficam pendentes da preparação do código-fonte correspondente ao runtime de terceiros, da revisão dos avisos e das informações exigidas pela loja. Nenhuma oferta de fornecimento de fontes foi feita em nome do titular.
