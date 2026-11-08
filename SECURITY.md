# Segurança

Nesta preparação, a linha 1.0.x é a única versão mantida. Não há compromisso de suporte para versões antigas ou esquemas privados do X.

Não publique credenciais, conteúdo privado ou provas de exploração em uma Issue aberta. Após criar o repositório no GitHub, o mantenedor deve ativar **Private vulnerability reporting**; utilize a aba Security para relatos privados quando o recurso estiver disponível. Se não houver canal privado configurado, abra apenas uma Issue pedindo um canal seguro, sem detalhes exploráveis.

O código trata respostas e textos do site como dados não confiáveis, escapa HTML, restringe hosts de mídia e usa CSP nos arquivos exportados. O componente FFmpeg é de terceiros, executa em WebAssembly local e tem licença própria. A auditoria npm do projeto não cobre vulnerabilidades do binário WebAssembly baixado; atualizações desse componente exigem revisão independente.

O scanner de publicação é uma barreira adicional, não uma garantia de ausência de segredos. Revise o diff e o conteúdo do ZIP antes de qualquer push ou release.
