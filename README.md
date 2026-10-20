# Garantias API

Express 5 / Mongoose 9, Node.js 24 LTS. Hospedagem: Vercel. Banco: MongoDB Atlas.

## Desenvolvimento e testes
Use `.nvmrc`, execute `npm ci` e configure o ambiente conforme `.env.example`.
No Windows com NVM, execute `nvm install 24.22.0` e `nvm use 24.22.0`.
Confirme que `node --version` retorna `v24.22.0` antes de iniciar: `.nvmrc` não troca
a versão automaticamente. `npm run dev` e `npm start` verificam o runtime antes de carregar a API.
`npm run dev` inicia o servidor local. `npm test` usa MongoDB 8 temporário, sem carregar `.env`.
A rede externa fica bloqueada; os serviços externos são simulados. O primeiro uso baixa o MongoDB.
`npm run coverage` gera cobertura. A CI antecipa o download e roda testes em Node 24.

## Vercel
Importe este repositório como projeto separado do frontend, com Node 24.x e `vercel.json`.
A entrada `api/index.js` encaminha para `src/serverless.js`, que aguarda e reutiliza a conexão Atlas.
Use Install Command `npm ci` e Build Command `npm run build`; a Function tem duração máxima configurada de 60 segundos.
Configure `NODE_ENV=production`,
`MONGODB_URL`, `JWT_SECRET`, `CORS_ORIGIN` e as variáveis SMTP, Twilio, Blob e tema de
`src/config/config.js` nas configurações do projeto. O Atlas deve permitir a conectividade da Vercel.
Não há migração de dados nem criação automática de índices em produção. Atlas verificado: 8.0.34;
MongoDB dos testes: 8.0.16. Nenhuma escrita de produção é necessária para executar a suíte.
Uploads HTTP estão sujeitos ao limite das Functions; arquivos grandes precisam de upload direto ao Blob.
Geração de PDF e upload são aguardados antes de encerrar a requisição.

Antes de promover o Preview, valide login, permissões, cadastro/ativação, QR/PDF, upload e mensagens
com contas de homologação. Em caso de regressão, restaure o deployment anterior na Vercel.
Esta migração local não publica o projeto nem modifica dados do Atlas.

## Limites conhecidos
Os testes não verificam credenciais/disponibilidade dos serviços reais. Rotas administrativas exigem
sessão e papel apropriado: ADMIN gerencia usuários, SKUs e lotes; ADMIN/QA executam atribuição e inspeção.
Consultas pessoais validam titularidade; o cadastro impede apropriação concorrente de uma garantia.
São aceitos tokens de acesso Bearer e o refresh token legado, cuja validade é conferida no banco.
Webhooks de WhatsApp e chamadas validam a assinatura Twilio: configure a URL pública HTTPS exata no provedor.
`CORS_ORIGIN` deve conter a origem exata do frontend, sem barra final.
O limitador de login é por instância; limitação global requer armazenamento compartilhado.
