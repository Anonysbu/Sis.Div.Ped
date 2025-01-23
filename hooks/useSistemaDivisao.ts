import { useState } from "react"

type Item = {
  id: string
  nome: string
  unidade: string
  valorUnitario: number
}

type Contrato = {
  id: string
  nome: string
  itens: Item[]
}

type Recurso = {
  id: string
  nome: string
  valorSugerido: number
}

type ItemPedido = {
  item: Item
  quantidade: number
}

type Divisao = {
  [recursoId: string]: {
    valorTotal: number
    itens: {
      [itemId: string]: {
        quantidade: number
        valorTotal: number
      }
    }
  }
}

export function useSistemaDivisao() {
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [recursos, setRecursos] = useState<Recurso[]>([])
  const [contratoSelecionado, setContratoSelecionado] = useState<Contrato | null>(null)
  const [itensPedido, setItensPedido] = useState<ItemPedido[]>([])
  const [recursosSelecionados, setRecursosSelecionados] = useState<Recurso[]>([])

  const adicionarContrato = (contrato: Contrato) => {
    setContratos([...contratos, contrato])
  }

  const adicionarRecurso = (recurso: Recurso) => {
    setRecursos([...recursos, recurso])
  }

  const selecionarContrato = (contratoId: string) => {
    const contrato = contratos.find((c) => c.id === contratoId)
    setContratoSelecionado(contrato || null)
    setItensPedido(contrato ? contrato.itens.map((item) => ({ item, quantidade: 0 })) : [])
  }

  const atualizarQuantidadeItem = (itemId: string, quantidade: number) => {
    setItensPedido(itensPedido.map((ip) => (ip.item.id === itemId ? { ...ip, quantidade } : ip)))
  }

  const toggleRecursoSelecionado = (recursoId: string) => {
    const recurso = recursos.find((r) => r.id === recursoId)
    if (recurso) {
      setRecursosSelecionados((prev) =>
        prev.some((r) => r.id === recursoId) ? prev.filter((r) => r.id !== recursoId) : [...prev, recurso],
      )
    }
  }

  const atualizarValorSugeridoRecurso = (recursoId: string, valor: number) => {
    setRecursosSelecionados((prev) => prev.map((r) => (r.id === recursoId ? { ...r, valorSugerido: valor } : r)))
  }

  const calcularDivisao = (): Divisao => {
    const divisao: Divisao = {}
    const valorTotalPedido = itensPedido.reduce((total, ip) => total + ip.quantidade * ip.item.valorUnitario, 0)
    const valorTotalSugerido = recursosSelecionados.reduce((total, r) => total + r.valorSugerido, 0)

    recursosSelecionados.forEach((recurso) => {
      const proporcao = recurso.valorSugerido / valorTotalSugerido
      divisao[recurso.id] = {
        valorTotal: recurso.valorSugerido,
        itens: {},
      }

      itensPedido.forEach((ip) => {
        const quantidadeRecurso = Math.round(ip.quantidade * proporcao)
        const valorTotalItem = quantidadeRecurso * ip.item.valorUnitario
        divisao[recurso.id].itens[ip.item.id] = {
          quantidade: quantidadeRecurso,
          valorTotal: valorTotalItem,
        }
      })
    })

    return divisao
  }

  return {
    contratos,
    recursos,
    contratoSelecionado,
    itensPedido,
    recursosSelecionados,
    adicionarContrato,
    adicionarRecurso,
    selecionarContrato,
    atualizarQuantidadeItem,
    toggleRecursoSelecionado,
    atualizarValorSugeridoRecurso,
    calcularDivisao,
  }
}

