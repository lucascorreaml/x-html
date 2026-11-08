# Repositório no GitHub

Repositório oficial: [lucascorreaml/x-html](https://github.com/lucascorreaml/x-html). O nome público do projeto é **X-HTML**; o código original é MIT, com crédito a `lucascorreaml`.

## Conteúdo publicado

O repositório contém o código-fonte, testes com dados fictícios, documentação, CI e gabaritos HTML. Capturas privadas, cache, dependências baixadas e builds locais não fazem parte do repositório.

Para obter uma cópia:

```sh
git clone https://github.com/lucascorreaml/x-html.git
cd x-html
npm ci --ignore-scripts
npm run vendor
npm test
npm run build
```

O comando `npm run vendor` baixa os componentes oficiais usando versões e hashes fixos. Veja [THIRD_PARTY.md](../THIRD_PARTY.md) antes de redistribuir builds com FFmpeg.

## Manutenção

- Mantenha Actions habilitado para executar `.github/workflows/ci.yml`.
- Habilite Private vulnerability reporting, alertas de segurança e secret scanning quando disponíveis.
- Configure um endereço de commit `noreply` se quiser evitar expor seu email. O projeto não embute identidade Git de mantenedor.
- Use tags e atualize o [changelog](../CHANGELOG.md) em novas versões. Não publique capturas reais, diagnósticos ou dados de usuários.
- Antes de distribuir um build com FFmpeg ou submetê-lo à Chrome Web Store, cumpra as condições de licença e de código-fonte correspondente descritas em [THIRD_PARTY.md](../THIRD_PARTY.md).

A Chrome Web Store não foi submetida nem aprovou este projeto. Essa etapa requer revisar os dados de privacidade, imagens e informações do publicador. Consulte as fontes oficiais sobre [publicação](https://developer.chrome.com/docs/webstore/publish), [tratamento local de dados](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq) e [imagens da loja](https://developer.chrome.com/docs/webstore/images).
