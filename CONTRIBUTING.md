# Contribuir

Use Node 24. Rode `npm ci --ignore-scripts`, `npm run vendor`, `npm test` e `npm run build`. Não é necessário configurar chaves, cookies, contas de teste compartilhadas ou serviços externos.

Abra uma Issue descrevendo o problema ou envie um pull request com a alteração e a verificação executada. Para correções de conteúdo, inclua um caso fictício que reproduza a estrutura relevante e preserve a cobertura existente. Nunca inclua capturas GraphQL reais, tokens, cookies, diagnósticos brutos, imagens de perfis ou arquivos pessoais.

Mantenha as permissões mínimas, o funcionamento local e o salvamento manual. Mudanças de acesso a hosts, armazenamento, licenças ou tratamento de dados devem atualizar a documentação correspondente. Não adicione código remoto em tempo de execução.

Antes de enviar:

```sh
npm test
npm run audit:public
npm run build
```

Ao enviar uma contribuição de código, você concorda em licenciá-la sob a MIT do projeto e confirma ter o direito de enviá-la. Preserve o crédito de criador original e os avisos de terceiros.
