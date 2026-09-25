# Testes de integração

`file-export.test.ts` usa diretórios temporários e o filesystem real para provar
publicação completa, rejeição de destino existente, disputa concorrente com um
único vencedor e limpeza de temporários. A garantia não é substituída por mock.
