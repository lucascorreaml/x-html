# Limitações conhecidas

- A extensão depende dos formatos internos de conteúdo do X, que podem mudar sem aviso.
- Salva dados já carregados pelo site. Abra o conteúdo no X antes de tentar salvar. Um post incorporado que não tenha sido carregado pode aparecer como ausente.
- Threads preservam a cadeia de respostas observada do mesmo autor. O fim da thread não é considerado comprovado sem evidência terminal; o HTML informa essa condição.
- Conteúdo indisponível, removido ou protegido não é contornado. Não há promessa de captura de tudo que existe na conta.
- MP4 usa a variante disponível de maior bitrate. HLS VOD tenta escolher a maior resolução e o áudio associado, com remux local. Playlists criptografadas, ao vivo ou incompletas são rejeitadas. Legendas HLS, Spaces e broadcasts não são funcionalidades completas anunciadas nesta versão.
- FFmpeg WebAssembly, Blobs e IndexedDB têm limites de memória e espaço. Não há garantia para arquivos de 1 GB ou maiores.
- O Chrome pode perguntar onde salvar de acordo com suas preferências. Nomes ou destinos alterados e caminhos acima de 240 caracteres são sinalizados. Antes de o Chrome retornar o destino, a extensão conhece apenas o caminho relativo.
- HTML bloqueia recursos externos e incorpora as mídias capturadas; clicar em um link externo é uma ação voluntária. O arquivo não promete uma cópia pixel a pixel da interface do X.
- A loja do Chrome não foi submetida nem aprovou este projeto. A publicação será uma etapa separada, após preparar a distribuição do runtime de terceiros, revisar os avisos, publicar a política de privacidade e preencher as informações exigidas pela loja.
