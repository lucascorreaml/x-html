# Permissões e finalidade única

Finalidade única: exportar manualmente posts, artigos e mídias do X para arquivos locais.

| Permissão | Uso |
|---|---|
| `storage` | Preferências, cache e estado dos trabalhos no navegador |
| `downloads` | Iniciar exportações, definir o nome e acompanhar o resultado real |
| `offscreen` | Preparar Blobs e executar o worker de mídia com o popup fechado |
| `contextMenus` | Ação de salvar sobre um link de post |
| `alarms` | Verificar trabalhos pendentes e retomar processamento elegível |
| `https://x.com/*` | Scripts de captura de conteúdo e botão de salvar no X |
| `https://pbs.twimg.com/*` | Obter imagens de conteúdo e avatares para o arquivo |
| `https://video.twimg.com/*` | Obter vídeos e segmentos HLS disponíveis |
| `https://*.video.pscp.tv/*` — opcional | Tentativa de acesso a mídia de gravações somente após consentimento; não representa suporte completo a Spaces |

Não são solicitadas permissões para cookies, histórico geral de navegação ou acesso irrestrito a todos os sites. A leitura se limita à origem X configurada e aos hosts de mídia listados. O código de execução, inclusive FFmpeg, fica empacotado localmente.
