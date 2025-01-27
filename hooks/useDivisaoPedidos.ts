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
  nome: string
  unidade: string
  valorUnitario: number
  recursosElegiveis: string[]
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

const RECURSOS_PRIORITARIOS = ["cozinha", "casa", "abrigo"]

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
    console.log("Iniciando cálculo da divisão")
    if (!contratoSelecionado) {
      console.error("Nenhum contrato selecionado")
      return
    }

    const itensComQuantidade = itensPedido.filter((ip) => ip.quantidade > 0)
    if (itensComQuantidade.length === 0) {
      console.error("Nenhum item com quantidade")
      setDivisaoResultado(null)
      return
    }

    if (recursosSelecionados.length === 0) {
      console.error("Nenhum recurso selecionado")
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
        console.error(`Item não encontrado: ${ip.itemId}`)
        return
      }

      console.log(`Processando item: ${item.nome}`)
      console.log(`Quantidade total: ${ip.quantidade}`)
      console.log(`Recursos elegíveis: ${item.recursosElegiveis}`)

      const recursosElegiveisDisponiveis = recursosSelecionados.filter((recursoId) =>
        item.recursosElegiveis.includes(recursoId),
      )

      if (recursosElegiveisDisponiveis.length === 0) {
        console.warn(`Nenhum recurso elegível disponível para o item: ${item.nome}`)
        return
      }

      // Separar recursos prioritários e não prioritários
      const recursosPrioritarios = recursosElegiveisDisponiveis.filter((r) => RECURSOS_PRIORITARIOS.includes(r))
      const recursosNaoPrioritarios = recursosElegiveisDisponiveis.filter((r) => !RECURSOS_PRIORITARIOS.includes(r))

      const quantidadeTotal = ip.quantidade
      let quantidadeRestante = quantidadeTotal

      // Distribuir 70% para recursos prioritários, se houver
      if (recursosPrioritarios.length > 0) {
        const quantidadePrioritaria = Math.floor(quantidadeTotal * 0.7)
        const quantidadePorRecursoPrioritario = Math.floor(quantidadePrioritaria / recursosPrioritarios.length)
        let restantePrioritario = quantidadePrioritaria % recursosPrioritarios.length

        recursosPrioritarios.forEach((recursoId) => {
          const quantidadeAtribuida = quantidadePorRecursoPrioritario + (restantePrioritario > 0 ? 1 : 0)
          if (restantePrioritario > 0) restantePrioritario--

          if (quantidadeAtribuida > 0) {
            const valorTotalItem = Number((quantidadeAtribuida * item.valorUnitario).toFixed(2))

            if (!divisao[recursoId].itens[ip.itemId]) {
              divisao[recursoId].itens[ip.itemId] = {
                quantidade: 0,
                valorTotal: 0,
                nome: item.nome,
                unidade: item.unidade,
                valorUnitario: item.valorUnitario,
                recursosElegiveis: item.recursosElegiveis,
              }
            }

            divisao[recursoId].itens[ip.itemId].quantidade += quantidadeAtribuida
            divisao[recursoId].itens[ip.itemId].valorTotal = Number(
              (divisao[recursoId].itens[ip.itemId].quantidade * item.valorUnitario).toFixed(2),
            )
            divisao[recursoId].valorTotal = Number((divisao[recursoId].valorTotal + valorTotalItem).toFixed(2))

            quantidadeRestante -= quantidadeAtribuida
          }
        })
      }

      // Distribuir o restante para recursos não prioritários
      if (recursosNaoPrioritarios.length > 0 && quantidadeRestante > 0) {
        const quantidadePorRecurso = Math.floor(quantidadeRestante / recursosNaoPrioritarios.length)
        let restante = quantidadeRestante % recursosNaoPrioritarios.length

        recursosNaoPrioritarios.forEach((recursoId) => {
          const quantidadeAtribuida = quantidadePorRecurso + (restante > 0 ? 1 : 0)
          if (restante > 0) restante--

          if (quantidadeAtribuida > 0) {
            const valorTotalItem = Number((quantidadeAtribuida * item.valorUnitario).toFixed(2))

            if (!divisao[recursoId].itens[ip.itemId]) {
              divisao[recursoId].itens[ip.itemId] = {
                quantidade: 0,
                valorTotal: 0,
                nome: item.nome,
                unidade: item.unidade,
                valorUnitario: item.valorUnitario,
                recursosElegiveis: item.recursosElegiveis,
              }
            }

            divisao[recursoId].itens[ip.itemId].quantidade += quantidadeAtribuida
            divisao[recursoId].itens[ip.itemId].valorTotal = Number(
              (divisao[recursoId].itens[ip.itemId].quantidade * item.valorUnitario).toFixed(2),
            )
            divisao[recursoId].valorTotal = Number((divisao[recursoId].valorTotal + valorTotalItem).toFixed(2))
          }
        })
      }
    })

    console.log("Resultado final da divisão:", divisao)
    setDivisaoResultado(divisao)
  }, [contratoSelecionado, itensPedido, recursosSelecionados])

  const transferirItem = useCallback(
    (itemId: string, quantidade: number, recursoOrigemId: string, recursoDestinoId: string) => {
      console.log("Iniciando transferência:", {
        itemId,
        quantidade,
        recursoOrigemId,
        recursoDestinoId,
      })

      setDivisaoResultado((prevDivisao) => {
        if (!prevDivisao || !contratoSelecionado) {
          console.error("Não há resultado de divisão ou contrato selecionado")
          return prevDivisao
        }

        const novoResultado = JSON.parse(JSON.stringify(prevDivisao))

        // Verificar se o item existe no recurso de origem
        if (!novoResultado[recursoOrigemId]?.itens[itemId]) {
          console.error("Item não encontrado no recurso de origem:", itemId)
          return prevDivisao
        }

        const itemOrigem = novoResultado[recursoOrigemId].itens[itemId]

        // Verificar quantidade disponível
        if (itemOrigem.quantidade < quantidade) {
          console.error("Quantidade insuficiente para transferência")
          return prevDivisao
        }

        // Verificar elegibilidade do recurso de destino
        if (!itemOrigem.recursosElegiveis.includes(recursoDestinoId)) {
          console.error("Recurso de destino não é elegível para este item")
          return prevDivisao
        }

        const valorUnitario = itemOrigem.valorUnitario
        const valorTransferencia = Number((quantidade * valorUnitario).toFixed(2))

        // Atualizar recurso de origem
        itemOrigem.quantidade -= quantidade
        itemOrigem.valorTotal = Number((itemOrigem.quantidade * valorUnitario).toFixed(2))
        novoResultado[recursoOrigemId].valorTotal = Number(
          (novoResultado[recursoOrigemId].valorTotal - valorTransferencia).toFixed(2),
        )

        // Remover o item se a quantidade chegou a zero
        if (itemOrigem.quantidade === 0) {
          delete novoResultado[recursoOrigemId].itens[itemId]
        }

        // Inicializar recurso de destino se necessário
        if (!novoResultado[recursoDestinoId]) {
          novoResultado[recursoDestinoId] = {
            itens: {},
            valorTotal: 0,
          }
        }

        // Atualizar recurso de destino
        if (!novoResultado[recursoDestinoId].itens[itemId]) {
          novoResultado[recursoDestinoId].itens[itemId] = {
            ...itemOrigem,
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

        console.log("Novo resultado após transferência:", novoResultado)
        return novoResultado
      })
    },
    [contratoSelecionado],
  )

  const exportarParaPlanilha = () => {
    if (!divisaoResultado || !contratoSelecionado) return

    const wb = XLSX.utils.book_new()

    // Criar uma planilha para cada recurso
    Object.entries(divisaoResultado).forEach(([recursoId, dados]) => {
      const recursoNome = RECURSOS_PREDEFINIDOS.find((r) => r.id === recursoId)?.nome

      // Preparar os dados com todas as informações solicitadas
      const dadosRecurso = Object.entries(dados.itens).map(([itemId, itemDados], index) => ({
        ITEM: index + 1,
        "ITEM DESCRIÇÃO": itemDados.nome,
        UNIDADE: itemDados.unidade,
        QUANTIDADE: itemDados.quantidade,
        "VALOR UNI.": itemDados.valorUnitario,
        "VALOR TOTAL": itemDados.valorTotal,
      }))

      // Adicionar linha em branco antes do total
      dadosRecurso.push({
        ITEM: "",
        "ITEM DESCRIÇÃO": "",
        UNIDADE: "",
        QUANTIDADE: "",
        "VALOR UNI.": "",
        "VALOR TOTAL": "",
      })

      // Adicionar linha de total
      dadosRecurso.push({
        ITEM: "",
        "ITEM DESCRIÇÃO": "TOTAL",
        UNIDADE: "",
        QUANTIDADE: "",
        "VALOR UNI.": "",
        "VALOR TOTAL": dados.valorTotal,
      })

      // Criar e formatar a planilha
      const ws = XLSX.utils.json_to_sheet(dadosRecurso)

      // Configurar a mesclagem de células
      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }, // Mesclar A1:B1
        { s: { r: 3, c: 1 }, e: { r: 3, c: 4 } }  // Mesclar B4:E4
      ];

      // Aplicar alinhamento ao centro mesmo sem valores
      ws["A1"] = { s: { alignment: { horizontal: "center", vertical: "center" } } };
      ws["B4"] = { s: { alignment: { horizontal: "center", vertical: "center" } } };

      // Ajustar largura das colunas
      const colunas = ["A", "B", "C", "D", "E", "F"]
      const larguras = [5, 35, 15, 15, 20, 20]
      ws["!cols"] = larguras.map((w) => ({ wch: w }))

      // Adicionar estilos
      const range = XLSX.utils.decode_range(ws["!ref"]!)
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cell_address = { c: C, r: R }
          const cell_ref = XLSX.utils.encode_cell(cell_address)
          if (!ws[cell_ref]) continue

          // Estilo para cabeçalho
          if (R === 0) {
            ws[cell_ref].s = {
              font: { bold: true, color: { rgb: "000000" } },
              alignment: { horizontal: "center", vertical: "center", wrapText: true },
              border: {
                top: { style: "medium", color: { rgb: "000000" } },
                bottom: { style: "medium", color: { rgb: "000000" } },
                left: { style: "medium", color: { rgb: "000000" } },
                right: { style: "medium", color: { rgb: "000000" } },
              },
            }
          }
          // Estilo para células normais
          else {
            ws[cell_ref].s = {
              font: { color: { rgb: "000000" } },
              alignment: { horizontal: C === 0 ? "center" : "left", vertical: "center", wrapText: true },
              border: {
                top: { style: "thin", color: { rgb: "000000" } },
                bottom: { style: "thin", color: { rgb: "000000" } },
                left: { style: "thin", color: { rgb: "000000" } },
                right: { style: "thin", color: { rgb: "000000" } },
              },
            }
          }

          // Estilo para linha de total
          if (R === 0) {
            ws[cell_ref].s = {
              font: { bold: true }, // Texto em negrito
              alignment: { horizontal: "center", vertical: "center" }, // Alinhamento centralizado
            }
          }

          // Formatar células de valor como moeda
          if (C === 4 || C === 5) {
            ws[cell_ref].z = '"R$"#,##0.00'
          }
        }
      }

      // Adicionar a planilha ao workbook
      XLSX.utils.book_append_sheet(wb, ws, recursoNome || recursoId)
    })

    // Gerar nome do arquivo com mês e ano
    const mesReferencia = new Date().toLocaleString("pt-BR", { month: "long", year: "numeric" }).toUpperCase()
    const nomeArquivo = `PEDIDOS ${contratoSelecionado.nome.toUpperCase()} - ${mesReferencia} - CONFERIR.xlsx`

    // Exportar o arquivo
    XLSX.writeFile(wb, nomeArquivo)
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
    RECURSOS_PRIORITARIOS,
  }
}

