import { useState, useEffect } from "react"
import * as XLSX from "xlsx"
import { supabase } from "../lib/supabase"

type Item = {
  id: string
  nome: string
  unidade: string
  valorUnitario: number
  recursosElegiveis: string[]
}

type Contrato = {
  id: string
  nome: string
  itens: Item[]
}

type Recurso = {
  id: string
  nome: string
}

type ItemPedido = {
  itemId: string
  quantidade: number
}

type DivisaoItem = {
  quantidade: number
  valorTotal: number
}

type DivisaoResultado = {
  [recursoId: string]: {
    itens: {
      [itemId: string]: DivisaoItem
    }
    valorTotal: number
  }
}

const RECURSOS_PREDEFINIDOS: Recurso[] = [
  { id: "cozinha", nome: "COZINHA COMUNITÁRIA" },
  { id: "casa", nome: "CASA DE APOIO" },
  { id: "abrigo", nome: "ABRIGO" },
  { id: "cras", nome: "CRAS" },
  { id: "creas", nome: "CREAS" },
  { id: "scfv", nome: "SCFV" },
  { id: "igd", nome: "IGD" },
  { id: "crianca", nome: "CRIANÇA FELIZ" },
]

export function useDivisaoPedidos() {
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [contratoSelecionado, setContratoSelecionado] = useState<Contrato | null>(null)
  const [itensPedido, setItensPedido] = useState<ItemPedido[]>([])
  const [recursosSelecionados, setRecursosSelecionados] = useState<string[]>([])
  const [divisaoResultado, setDivisaoResultado] = useState<DivisaoResultado | null>(null)

  useEffect(() => {
    carregarContratos()
  }, [])

  const carregarContratos = async () => {
    try {
      const { data, error } = await supabase.from("contratos").select("*")

      if (error) throw error

      const contratosComItens = await Promise.all(
        data.map(async (contrato) => {
          const { data: itens, error: itensError } = await supabase
            .from("itens")
            .select("*")
            .eq("contrato_id", contrato.id)

          if (itensError) throw itensError

          return {
            ...contrato,
            itens: itens.map((item) => ({
              ...item,
              recursosElegiveis: item.recursos_elegiveis.split(","),
            })),
          }
        }),
      )

      setContratos(contratosComItens)
    } catch (error) {
      console.error("Erro ao carregar contratos:", error)
    }
  }

  const adicionarContrato = async (novoContrato: Contrato) => {
    try {
      const { data, error } = await supabase.from("contratos").insert({ nome: novoContrato.nome }).select()

      if (error) throw error

      const contratoId = data[0].id

      for (const item of novoContrato.itens) {
        const { error: itemError } = await supabase.from("itens").insert({
          contrato_id: contratoId,
          nome: item.nome,
          unidade: item.unidade,
          valor_unitario: item.valorUnitario,
          recursos_elegiveis: item.recursosElegiveis.join(","),
        })

        if (itemError) throw itemError
      }

      await carregarContratos()
    } catch (error) {
      console.error("Erro ao adicionar contrato:", error)
    }
  }

  const excluirContrato = async (contratoId: string) => {
    try {
      const { error: itensError } = await supabase.from("itens").delete().eq("contrato_id", contratoId)

      if (itensError) throw itensError

      const { error: contratoError } = await supabase.from("contratos").delete().eq("id", contratoId)

      if (contratoError) throw contratoError

      await carregarContratos()
      if (contratoSelecionado?.id === contratoId) {
        setContratoSelecionado(null)
        setItensPedido([])
      }
    } catch (error) {
      console.error("Erro ao excluir contrato:", error)
    }
  }

  const selecionarContrato = (contratoId: string) => {
    const contrato = contratos.find((c) => c.id === contratoId)
    setContratoSelecionado(contrato || null)
    setItensPedido(contrato ? contrato.itens.map((item) => ({ itemId: item.id, quantidade: 0 })) : [])
    // Resetar recursos selecionados quando um novo contrato é selecionado
    setRecursosSelecionados([])
  }

  const atualizarQuantidadeItem = (itemId: string, quantidade: number) => {
    setItensPedido(itensPedido.map((ip) => (ip.itemId === itemId ? { ...ip, quantidade } : ip)))
  }

  const toggleRecursoSelecionado = (recursoId: string) => {
    setRecursosSelecionados((prev) =>
      prev.includes(recursoId) ? prev.filter((id) => id !== recursoId) : [...prev, recursoId],
    )
  }

  const calcularDivisao = () => {
    if (!contratoSelecionado) return null

    // Verificar se há itens com quantidade maior que zero
    const itensComQuantidade = itensPedido.filter((ip) => ip.quantidade > 0)
    if (itensComQuantidade.length === 0 || recursosSelecionados.length === 0) {
      setDivisaoResultado(null)
      return
    }

    const divisao: DivisaoResultado = {}

    // Inicializar a estrutura de divisão para todos os recursos selecionados
    recursosSelecionados.forEach((recursoId) => {
      divisao[recursoId] = {
        itens: {},
        valorTotal: 0,
      }
    })

    // Para cada item com quantidade > 0
    itensComQuantidade.forEach((ip) => {
      const item = contratoSelecionado.itens.find((i) => i.id === ip.itemId)
      if (!item) return

      // Converter string de recursos elegíveis para array
      const recursosElegiveisArray = item.recursosElegiveis || []

      // Filtrar apenas recursos elegíveis que foram selecionados
      const recursosElegiveis = recursosSelecionados.filter((r) => recursosElegiveisArray.includes(r))

      if (recursosElegiveis.length === 0) return

      const quantidadeTotal = Math.max(0, Number.parseInt(String(ip.quantidade)) || 0)
      const valorUnitario = Number.parseFloat(String(item.valorUnitario)) || 0

      // Calcular a quantidade base e o resto
      const quantidadePorRecurso = Math.floor(quantidadeTotal / recursosElegiveis.length)
      let restante = quantidadeTotal % recursosElegiveis.length

      // Distribuir os itens entre os recursos elegíveis
      recursosElegiveis.forEach((recursoId) => {
        // Adicionar um item extra se ainda houver restante
        const quantidadeAtribuida = quantidadePorRecurso + (restante > 0 ? 1 : 0)

        if (quantidadeAtribuida > 0) {
          const valorTotalItem = Number((quantidadeAtribuida * valorUnitario).toFixed(2))

          divisao[recursoId].itens[ip.itemId] = {
            quantidade: quantidadeAtribuida,
            valorTotal: valorTotalItem,
          }

          // Atualizar o valor total do recurso
          divisao[recursoId].valorTotal = Number((divisao[recursoId].valorTotal + valorTotalItem).toFixed(2))
        }

        if (restante > 0) restante--
      })
    })

    setDivisaoResultado(divisao)
  }

  const transferirItem = (itemId: string, quantidade: number, recursoOrigemId: string, recursoDestinoId: string) => {
    if (!divisaoResultado || !contratoSelecionado) return

    const novoResultado = JSON.parse(JSON.stringify(divisaoResultado))
    const item = contratoSelecionado.itens.find((i) => i.id === itemId)
    if (!item) return

    // Verificar se o item existe no recurso de origem e se há quantidade suficiente
    if (
      !novoResultado[recursoOrigemId]?.itens[itemId] ||
      novoResultado[recursoOrigemId].itens[itemId].quantidade < quantidade
    ) {
      return
    }

    // Converter valores para números e fixar precisão
    const valorUnitario = Number(item.valorUnitario)
    const valorTransferencia = Number((quantidade * valorUnitario).toFixed(2))

    // Atualizar recurso de origem
    const quantidadeRestanteOrigem = novoResultado[recursoOrigemId].itens[itemId].quantidade - quantidade

    if (quantidadeRestanteOrigem > 0) {
      novoResultado[recursoOrigemId].itens[itemId] = {
        quantidade: quantidadeRestanteOrigem,
        valorTotal: Number((quantidadeRestanteOrigem * valorUnitario).toFixed(2)),
      }
    } else {
      delete novoResultado[recursoOrigemId].itens[itemId]
    }

    // Atualizar o valor total do recurso de origem
    novoResultado[recursoOrigemId].valorTotal = Number(
      (novoResultado[recursoOrigemId].valorTotal - valorTransferencia).toFixed(2),
    )

    // Inicializar ou atualizar o item no recurso de destino
    if (!novoResultado[recursoDestinoId].itens[itemId]) {
      novoResultado[recursoDestinoId].itens[itemId] = {
        quantidade: 0,
        valorTotal: 0,
      }
    }

    novoResultado[recursoDestinoId].itens[itemId].quantidade += quantidade
    novoResultado[recursoDestinoId].itens[itemId].valorTotal = Number(
      (novoResultado[recursoDestinoId].itens[itemId].quantidade * valorUnitario).toFixed(2),
    )

    // Atualizar o valor total do recurso de destino
    novoResultado[recursoDestinoId].valorTotal = Number(
      (novoResultado[recursoDestinoId].valorTotal + valorTransferencia).toFixed(2),
    )

    setDivisaoResultado(novoResultado)
  }

  const exportarParaPlanilha = () => {
    if (!divisaoResultado || !contratoSelecionado) return

    const wb = XLSX.utils.book_new()

    Object.entries(divisaoResultado).forEach(([recursoId, dados]) => {
      const recursoNome = RECURSOS_PREDEFINIDOS.find((r) => r.id === recursoId)?.nome
      const dadosRecurso = Object.entries(dados.itens).map(([itemId, itemDados]) => {
        const item = contratoSelecionado.itens.find((i) => i.id === itemId)
        return {
          Item: item?.nome,
          Quantidade: itemDados.quantidade,
          Unidade: item?.unidade,
          "Valor Unitário": item?.valorUnitario.toFixed(2),
          "Valor Total": itemDados.valorTotal.toFixed(2),
        }
      })

      dadosRecurso.push({
        Item: "TOTAL",
        Quantidade: "",
        Unidade: "",
        "Valor Unitário": "",
        "Valor Total": dados.valorTotal.toFixed(2),
      })

      const ws = XLSX.utils.json_to_sheet(dadosRecurso)
      XLSX.utils.book_append_sheet(wb, ws, recursoNome || recursoId)
    })

    const mesReferencia = new Date().toLocaleString("pt-BR", { month: "long", year: "numeric" }).toUpperCase()
    const nomeArquivo = `PEDIDOS ${contratoSelecionado.nome.toUpperCase()} - ${mesReferencia} - CONFERIR.xlsx`

    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })
    const blob = new Blob([wbout], { type: "application/octet-stream" })

    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = nomeArquivo
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return {
    contratos,
    contratoSelecionado,
    itensPedido,
    recursosSelecionados,
    divisaoResultado,
    adicionarContrato,
    excluirContrato,
    selecionarContrato,
    atualizarQuantidadeItem,
    toggleRecursoSelecionado,
    calcularDivisao,
    transferirItem,
    exportarParaPlanilha,
    RECURSOS_PREDEFINIDOS,
  }
}

