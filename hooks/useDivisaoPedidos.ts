import { useState, useEffect, useCallback } from "react"
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

  const carregarContratos = useCallback(async () => {
    try {
      const { data: contratosData, error: contratosError } = await supabase.from("contratos").select("*")

      if (contratosError) throw contratosError

      const contratosComItens = await Promise.all(
        contratosData.map(async (contrato) => {
          const { data: itensData, error: itensError } = await supabase
            .from("itens")
            .select("*")
            .eq("contrato_id", contrato.id)

          if (itensError) throw itensError

          const itens = itensData.map((item) => ({
            id: item.id,
            nome: item.nome,
            unidade: item.unidade,
            valorUnitario: Number(item.valor_unitario),
            recursosElegiveis: item.recursos_elegiveis ? item.recursos_elegiveis.split(",") : [],
          }))

          return {
            id: contrato.id,
            nome: contrato.nome,
            itens,
          }
        }),
      )

      setContratos(contratosComItens)
    } catch (error) {
      console.error("Erro ao carregar contratos:", error)
    }
  }, [])

  useEffect(() => {
    carregarContratos()
  }, [carregarContratos])

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
    console.log("Selecionando contrato:", contrato)

    setContratoSelecionado(contrato || null)
    setItensPedido(contrato ? contrato.itens.map((item) => ({ itemId: item.id, quantidade: 0 })) : [])
    setRecursosSelecionados([])
    setDivisaoResultado(null)
  }

  const atualizarQuantidadeItem = (itemId: string, quantidade: number) => {
    console.log("Atualizando quantidade:", { itemId, quantidade })
    setItensPedido((prev) => prev.map((ip) => (ip.itemId === itemId ? { ...ip, quantidade } : ip)))
  }

  const toggleRecursoSelecionado = (recursoId: string) => {
    console.log("Toggle recurso:", recursoId)
    setRecursosSelecionados((prev) =>
      prev.includes(recursoId) ? prev.filter((id) => id !== recursoId) : [...prev, recursoId],
    )
  }

  const calcularDivisao = useCallback(() => {
    if (!contratoSelecionado) {
      console.log("Nenhum contrato selecionado")
      return
    }

    console.log("Calculando divisão para:", {
      contratoSelecionado,
      itensPedido,
      recursosSelecionados,
    })

    const itensComQuantidade = itensPedido.filter((ip) => ip.quantidade > 0)
    if (itensComQuantidade.length === 0 || recursosSelecionados.length === 0) {
      console.log("Sem itens com quantidade ou recursos selecionados")
      setDivisaoResultado(null)
      return
    }

    const divisao: DivisaoResultado = {}

    recursosSelecionados.forEach((recursoId) => {
      divisao[recursoId] = {
        itens: {},
        valorTotal: 0,
      }
    })

    itensComQuantidade.forEach((ip) => {
      const item = contratoSelecionado.itens.find((i) => i.id === ip.itemId)
      if (!item) {
        console.log("Item não encontrado:", ip.itemId)
        return
      }

      console.log("Processando item:", {
        item,
        quantidade: ip.quantidade,
        recursosElegiveis: item.recursosElegiveis,
      })

      const recursosElegiveis = recursosSelecionados.filter((recursoId) => item.recursosElegiveis.includes(recursoId))

      if (recursosElegiveis.length === 0) {
        console.log("Nenhum recurso elegível selecionado para o item:", item.nome)
        return
      }

      const quantidadePorRecurso = Math.floor(ip.quantidade / recursosElegiveis.length)
      let restante = ip.quantidade % recursosElegiveis.length

      recursosElegiveis.forEach((recursoId) => {
        const quantidadeAtribuida = quantidadePorRecurso + (restante > 0 ? 1 : 0)
        const valorTotalItem = Number((quantidadeAtribuida * item.valorUnitario).toFixed(2))

        divisao[recursoId].itens[ip.itemId] = {
          quantidade: quantidadeAtribuida,
          valorTotal: valorTotalItem,
        }

        divisao[recursoId].valorTotal = Number((divisao[recursoId].valorTotal + valorTotalItem).toFixed(2))

        if (restante > 0) restante--
      })
    })

    console.log("Resultado da divisão:", divisao)
    setDivisaoResultado(divisao)
  }, [contratoSelecionado, itensPedido, recursosSelecionados])

  const transferirItem = (itemId: string, quantidade: number, recursoOrigemId: string, recursoDestinoId: string) => {
    if (!divisaoResultado || !contratoSelecionado) return

    const novoResultado = JSON.parse(JSON.stringify(divisaoResultado))
    const item = contratoSelecionado.itens.find((i) => i.id === itemId)
    if (!item) return

    if (
      !novoResultado[recursoOrigemId]?.itens[itemId] ||
      novoResultado[recursoOrigemId].itens[itemId].quantidade < quantidade
    ) {
      return
    }

    const valorUnitario = Number(item.valorUnitario)
    const valorTransferencia = Number((quantidade * valorUnitario).toFixed(2))

    const quantidadeRestanteOrigem = novoResultado[recursoOrigemId].itens[itemId].quantidade - quantidade

    if (quantidadeRestanteOrigem > 0) {
      novoResultado[recursoOrigemId].itens[itemId] = {
        quantidade: quantidadeRestanteOrigem,
        valorTotal: Number((quantidadeRestanteOrigem * valorUnitario).toFixed(2)),
      }
    } else {
      delete novoResultado[recursoOrigemId].itens[itemId]
    }

    novoResultado[recursoOrigemId].valorTotal = Number(
      (novoResultado[recursoOrigemId].valorTotal - valorTransferencia).toFixed(2),
    )

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

  useEffect(() => {
    console.log("Estado atualizado - divisaoResultado:", divisaoResultado)
  }, [divisaoResultado])

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

