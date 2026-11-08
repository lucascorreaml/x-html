# Política de privacidade

Versão referente à extensão 1.0.4. Projeto independente de exportação local de posts e artigos do X.

## Finalidade e dados tratados

A extensão prepara arquivos locais a pedido do usuário. Para isso, observa respostas de conteúdo recebidas pela página do X e processa texto, autores e nomes de perfil, identificadores de posts, datas, links, métricas, artigos, mídias, texto alternativo e relações entre posts. Esses dados podem conter informações pessoais presentes nas publicações.

O armazenamento local do Chrome mantém cache de até 2.000 posts observados, mídias temporárias de exportação, nomes de arquivos, preferências, estado dos trabalhos e diagnósticos técnicos. O limite de quantidade do cache não representa um prazo de expiração. Mídias e histórico de trabalhos podem permanecer até a limpeza dos dados da extensão ou sua remoção.

## Rede e compartilhamento

Não há servidor próprio, telemetria, publicidade, venda de dados, sincronização da extensão ou envio de conteúdo ao desenvolvedor. Não lemos cookies, senhas nem cabeçalhos de autenticação. A extensão não repete chamadas à API do X para procurar conteúdo adicional.

O X recebe as requisições normais feitas pela página. Para obter as mídias, o navegador acessa os hosts `pbs.twimg.com` e `video.twimg.com`, com credenciais omitidas nas requisições feitas pela extensão. Hosts sob `video.pscp.tv` só podem ser utilizados após permissão opcional concedida pelo usuário. Esses serviços podem receber os dados técnicos normais de conexão, como IP e recurso solicitado; suas próprias políticas continuam aplicáveis.

Nenhum dado é transmitido ao desenvolvedor automaticamente. Se o usuário optar por compartilhar um diagnóstico ou um arquivo exportado, o compartilhamento é uma ação própria, fora da coleta automática da extensão.

## Arquivos exportados

HTML incorpora as mídias obtidas e bloqueia conexões externas ao abrir o documento. Clicar voluntariamente em um link externo abre o destino. Markdown referencia arquivos locais relativos. Os arquivos podem conter informações pessoais do conteúdo escolhido e ficam sob controle do usuário na pasta de downloads.

## Exclusão e controle

O usuário pode revogar a permissão opcional, desativar o acesso ao X ou remover a extensão em `chrome://extensions`. Remover a extensão elimina seu armazenamento no perfil Chrome. Isso não apaga arquivos que já foram baixados; eles devem ser excluídos pelo usuário no sistema de arquivos.

## Alterações e contato

Mudanças no tratamento de dados devem atualizar esta política e o histórico de versões. Para contato, use as [Issues do repositório](https://github.com/lucascorreaml/x-html/issues). Não publique dados pessoais ou credenciais em Issues. Problemas de segurança devem seguir [SECURITY.md](SECURITY.md).
