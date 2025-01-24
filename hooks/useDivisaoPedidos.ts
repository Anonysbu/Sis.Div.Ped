const transferirItem = (itemId: string, quantidade: number, recursoOrigemId: string, recursoDestinoId: string) => {
  if (!divisaoResultado || !contratoSelecionado) return

  const novoResultado = JSON.parse(JSON.stringify(divisaoResultado))
  const item = contratoSelecionado.itens.find((i) => i.id === itemId)
  if (!item) return

  const itemOrigem = novoResultado[recursoOrigemId]?.itens[itemId]
  if (!itemOrigem || itemOrigem.quantidade < quantidade) return

  // Calcular valores
  const valorUnitario = item.valorUnitario
  const valorTransferencia = quantidade * valorUnitario

  // Atualizar origem
  itemOrigem.quantidade -= quantidade
  itemOrigem.valorTotal -= valorTransferencia
  novoResultado[recursoOrigemId].valorTotal -= valorTransferencia

  // Remover item se quantidade chegou a zero
  if (itemOrigem.quantidade === 0) {
    delete novoResultado[recursoOrigemId].itens[itemId]
  }

  // Atualizar destino
  if (!novoResultado[recursoDestinoId].itens[itemId]) {
    novoResultado[recursoDestinoId].itens[itemId] = {
      quantidade: 0,
      valorTotal: 0,
    }
  }

  novoResultado[recursoDestinoId].itens[itemId].quantidade += quantidade
  novoResultado[recursoDestinoId].itens[itemId].valorTotal += valorTransferencia
  novoResultado[recursoDestinoId].valorTotal += valorTransferencia

  setDivisaoResultado(novoResultado)
}

