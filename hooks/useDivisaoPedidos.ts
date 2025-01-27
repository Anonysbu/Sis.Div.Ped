const exportarParaPlanilha = () => {
  if (!divisaoResultado || !contratoSelecionado) return

  const wb = XLSX.utils.book_new()

  // Criar uma planilha para cada recurso
  Object.entries(divisaoResultado).forEach(([recursoId, dados]) => {
    const recursoNome = RECURSOS_PREDEFINIDOS.find((r) => r.id === recursoId)?.nome

    // Preparar os dados com todas as informações solicitadas
    const dadosRecurso = [
      [
        { v: recursoNome, t: "s" },
        { v: "", t: "s" },
        { v: "", t: "s" },
        { v: "", t: "s" },
        { v: "", t: "s" },
        { v: "", t: "s" },
      ],
      ["#", "Item", "Unidade", "Quantidade", "Valor Unitário", "Valor Total"],
      ...Object.entries(dados.itens).map(([itemId, itemDados], index) => [
        index + 1,
        itemDados.nome,
        itemDados.unidade,
        itemDados.quantidade,
        itemDados.valorUnitario,
        itemDados.valorTotal,
      ]),
      ["", "", "", "", "", ""], // Linha em branco
      ["", "TOTAL", "", "", "", dados.valorTotal],
    ]

    // Criar e formatar a planilha
    const ws = XLSX.utils.aoa_to_sheet(dadosRecurso)

    // Mesclar células do título
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }, // Mesclar A1:B1
    ]

    // Ajustar largura das colunas
    const colunas = ["A", "B", "C", "D", "E", "F"]
    const larguras = [5, 40, 15, 15, 20, 20]
    ws["!cols"] = larguras.map((w) => ({ wch: w }))

    // Adicionar estilos
    for (let R = 0; R <= dadosRecurso.length; R++) {
      for (let C = 0; C < 6; C++) {
        const cell_address = { c: C, r: R }
        const cell_ref = XLSX.utils.encode_cell(cell_address)
        if (!ws[cell_ref]) continue

        // Estilo para título (primeira linha)
        if (R === 0) {
          ws[cell_ref].s = {
            font: { bold: true, color: { rgb: "000000" }, sz: 14 },
            fill: { fgColor: { rgb: "E8EAF6" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: {
              top: { style: "medium", color: { rgb: "000000" } },
              bottom: { style: "medium", color: { rgb: "000000" } },
              left: { style: "medium", color: { rgb: "000000" } },
              right: { style: "medium", color: { rgb: "000000" } },
            },
          }
        }
        // Estilo para cabeçalho (segunda linha)
        else if (R === 1) {
          ws[cell_ref].s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "3B82F6" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: {
              top: { style: "medium", color: { rgb: "000000" } },
              bottom: { style: "medium", color: { rgb: "000000" } },
              left: { style: "thin", color: { rgb: "000000" } },
              right: { style: "thin", color: { rgb: "000000" } },
            },
          }
        }
        // Estilo para células normais
        else if (R < dadosRecurso.length - 2) {
          ws[cell_ref].s = {
            font: { color: { rgb: "000000" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: {
              top: { style: "thin", color: { rgb: "000000" } },
              bottom: { style: "thin", color: { rgb: "000000" } },
              left: { style: "thin", color: { rgb: "000000" } },
              right: { style: "thin", color: { rgb: "000000" } },
            },
          }
        }
        // Estilo para linha de total
        else if (R === dadosRecurso.length - 1) {
          ws[cell_ref].s = {
            font: { bold: true, color: { rgb: "000000" } },
            fill: { fgColor: { rgb: "F3F4F6" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: {
              top: { style: "medium", color: { rgb: "000000" } },
              bottom: { style: "medium", color: { rgb: "000000" } },
              left: { style: "thin", color: { rgb: "000000" } },
              right: { style: "thin", color: { rgb: "000000" } },
            },
          }
        }

        // Formatar células de valor como moeda
        if ((C === 4 || C === 5) && R > 0) {
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

