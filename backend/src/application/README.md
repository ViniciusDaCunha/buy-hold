# Aplicação

`simulateContribution` é o caso de uso compartilhado por CLI e navegador. Ele
recebe o snapshot validado e um gerador de identidade injetado, compõe qualidade,
valuation, alocação e explicações e retorna um `SimulationResult` congelado.

O hash fica no adaptador Web Crypto. Duração e falhas operacionais pertencem ao
diagnóstico e não alteram a identidade financeira. Veja `docs/CASO_USO_T09.md`.
