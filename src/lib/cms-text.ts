// Resolução de texto vindo do Payload contra um piso em código.
//
// Existe porque ler cópia do CMS **inverte o risco** de conteúdo em falta.
// Enquanto o texto estava no JSX, estar lá era a garantia de que aparecia;
// depois de vir do banco, um campo esvaziado no admin apaga-o do ecrã. Um botão
// sem rótulo é regressão pior que um botão em inglês numa página em português.
//
// `?? piso` não basta: o Payload grava **string vazia**, não `null`, quando um
// campo de texto é limpo no admin, e `"" ?? x` devolve `""`. Só-espaços conta
// como vazio pela mesma razão. O valor é devolvido intacto quando há conteúdo —
// sem trim, para não comer espaçamento intencional.
export function textOr(
  value: string | null | undefined,
  fallback: string,
): string {
  return value?.trim() ? value : fallback;
}

// NOTA DE DÍVIDA: `src/components/Footer/index.tsx` tem uma cópia local desta
// mesma função, com o mesmo comentário. Não foi migrada de propósito — a
// mudança `finish-footer-implementation` estava em curso sobre aquele ficheiro
// e extrair de lá criaria conflito. Quando ela fechar, o footer passa a
// importar daqui e a cópia local desaparece.
