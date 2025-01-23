"use client"

import { useState } from "react"
import { useDivisaoPedidos } from "../hooks/useDivisaoPedidos"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Download, ArrowRightLeft, Plus, Minus, Trash2 } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"

export default function DivisaoPedidos() {
  const {
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
  } = useDivisaoPedidos()

  const [novoContrato, setNovoContrato] = useState({ nome: "", itens: [] })
  const [novoItem, setNovoItem] = useState({ nome: "", unidade: "", valorUnitario: 0, recursosElegiveis: [] })
  const [quantidadeTransferencia, setQuantidadeTransferencia] = useState<{ [key: string]: number }>({})
  const [recursoDestino, setRecursoDestino] = useState<{ [key: string]: string }>({})
  const [todosRecursosSelecionados, setTodosRecursosSelecionados] = useState(false)

  const handleAdicionarItemAoContrato = () => {
    setNovoContrato((prev) => ({
      ...prev,
      itens: [...prev.itens, { ...novoItem, id: Date.now().toString() }],
    }))
    setNovoItem({ nome: "", unidade: "", valorUnitario: 0, recursosElegiveis: [] })
  }

  const handleAdicionarContrato = async () => {
    await adicionarContrato({
      id: Date.now().toString(),
      nome: novoContrato.nome,
      itens: novoContrato.itens,
    })
    setNovoContrato({ nome: "", itens: [] })
  }

  const handleTransferirItem = (itemId: string, recursoOrigemId: string) => {
    const quantidade = quantidadeTransferencia[`${itemId}-${recursoOrigemId}`] || 0
    const destino = recursoDestino[`${itemId}-${recursoOrigemId}`]
    if (destino && quantidade > 0) {
      transferirItem(itemId, quantidade, recursoOrigemId, destino)
      setQuantidadeTransferencia((prev) => ({ ...prev, [`${itemId}-${recursoOrigemId}`]: 0 }))
      setRecursoDestino((prev) => ({ ...prev, [`${itemId}-${recursoOrigemId}`]: "" }))
    }
  }

  const toggleRecursoElegivel = (recursoId: string) => {
    setNovoItem((prev) => ({
      ...prev,
      recursosElegiveis: prev.recursosElegiveis.includes(recursoId)
        ? prev.recursosElegiveis.filter((id) => id !== recursoId)
        : [...prev.recursosElegiveis, recursoId],
    }))
  }

  const handleToggleTodosRecursos = () => {
    setTodosRecursosSelecionados(!todosRecursosSelecionados)
    if (!todosRecursosSelecionados) {
      RECURSOS_PREDEFINIDOS.forEach((recurso) => {
        if (!recursosSelecionados.includes(recurso.id)) {
          toggleRecursoSelecionado(recurso.id)
        }
      })
    } else {
      recursosSelecionados.forEach((recursoId) => {
        toggleRecursoSelecionado(recursoId)
      })
    }
  }

  return (
    <div className="container mx-auto p-4 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-center text-blue-600">Sistema de Divisão de Pedidos</h1>

      <Accordion type="single" collapsible className="mb-6">
        <AccordionItem value="novo-contrato">
          <AccordionTrigger className="text-lg font-semibold">Adicionar Novo Contrato</AccordionTrigger>
          <AccordionContent>
            <Card className="bg-white shadow-md">
              <CardContent className="space-y-4 p-4">
                <div>
                  <Label htmlFor="nomeContrato" className="text-sm font-medium text-gray-700">
                    Nome do Contrato
                  </Label>
                  <Input
                    id="nomeContrato"
                    value={novoContrato.nome}
                    onChange={(e) => setNovoContrato((prev) => ({ ...prev, nome: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="nomeItem" className="text-sm font-medium text-gray-700">
                    Nome do Item
                  </Label>
                  <Input
                    id="nomeItem"
                    value={novoItem.nome}
                    onChange={(e) => setNovoItem((prev) => ({ ...prev, nome: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="unidadeItem" className="text-sm font-medium text-gray-700">
                    Unidade
                  </Label>
                  <Input
                    id="unidadeItem"
                    value={novoItem.unidade}
                    onChange={(e) => setNovoItem((prev) => ({ ...prev, unidade: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="valorUnitarioItem" className="text-sm font-medium text-gray-700">
                    Valor Unitário
                  </Label>
                  <Input
                    id="valorUnitarioItem"
                    type="number"
                    value={novoItem.valorUnitario}
                    onChange={(e) => setNovoItem((prev) => ({ ...prev, valorUnitario: Number(e.target.value) }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Recursos Elegíveis</Label>
                  <div className="space-y-2 mt-1">
                    {RECURSOS_PREDEFINIDOS.map((recurso) => (
                      <div key={recurso.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`recurso-${recurso.id}`}
                          checked={novoItem.recursosElegiveis.includes(recurso.id)}
                          onCheckedChange={() => toggleRecursoElegivel(recurso.id)}
                        />
                        <Label htmlFor={`recurso-${recurso.id}`} className="text-sm text-gray-600">
                          {recurso.nome}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <Button onClick={handleAdicionarItemAoContrato} className="mt-2">
                  Adicionar Item ao Contrato
                </Button>
                <div>
                  <h3 className="font-bold mb-2 text-sm text-gray-700">Itens do Contrato</h3>
                  {novoContrato.itens.map((item, index) => (
                    <div key={index} className="mb-2 text-sm text-gray-600">
                      {item.nome} - {item.unidade} - R$ {item.valorUnitario.toFixed(2)}
                    </div>
                  ))}
                </div>
                <Button onClick={handleAdicionarContrato} className="w-full">
                  Salvar Contrato
                </Button>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Card className="mb-6 bg-white shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-blue-600">Selecionar Contrato e Itens</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Select onValueChange={(value) => selecionarContrato(value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um contrato" />
              </SelectTrigger>
              <SelectContent>
                {contratos.map((contrato) => (
                  <SelectItem key={contrato.id} value={contrato.id}>
                    {contrato.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {contratoSelecionado && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-sm text-gray-700">Itens do Contrato</h3>
                  <Button
                    onClick={async () => {
                      if (contratoSelecionado) {
                        await excluirContrato(contratoSelecionado.id)
                      }
                    }}
                    variant="destructive"
                    size="sm"
                    className="flex items-center"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir Contrato
                  </Button>
                </div>
                {itensPedido.map((itemPedido) => {
                  const item = contratoSelecionado.itens.find((i) => i.id === itemPedido.itemId)
                  return (
                    <div key={itemPedido.itemId} className="flex items-center space-x-2 mb-2">
                      <span className="text-sm text-gray-600">{item?.nome}</span>
                      <Input
                        type="number"
                        placeholder="Quantidade"
                        value={itemPedido.quantidade}
                        onChange={(e) => atualizarQuantidadeItem(itemPedido.itemId, Number(e.target.value))}
                        className="w-24"
                      />
                      <span className="text-sm text-gray-600">{item?.unidade}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6 bg-white shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-blue-600">Selecionar Recursos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="todos-recursos"
                checked={todosRecursosSelecionados}
                onCheckedChange={handleToggleTodosRecursos}
              />
              <Label htmlFor="todos-recursos" className="text-sm font-medium text-gray-700">
                Selecionar Todos
              </Label>
            </div>
            {RECURSOS_PREDEFINIDOS.map((recurso) => (
              <div key={recurso.id} className="flex items-center space-x-2">
                <Checkbox
                  id={recurso.id}
                  checked={recursosSelecionados.includes(recurso.id)}
                  onCheckedChange={() => toggleRecursoSelecionado(recurso.id)}
                />
                <Label htmlFor={recurso.id} className="text-sm text-gray-600">
                  {recurso.nome}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex space-x-2 mb-6">
        <Button onClick={calcularDivisao} className="bg-blue-600 hover:bg-blue-700 text-white">
          Calcular Divisão
        </Button>
        {divisaoResultado && (
          <Button
            onClick={exportarParaPlanilha}
            className="flex items-center bg-green-600 hover:bg-green-700 text-white"
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar para Excel
          </Button>
        )}
      </div>

      {divisaoResultado && (
        <Card className="bg-white shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-blue-600">Resultado da Divisão</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {recursosSelecionados.map((recursoId) => {
                const dados = divisaoResultado[recursoId]
                return (
                  <Accordion type="single" collapsible className="mb-4" key={recursoId}>
                    <AccordionItem value={recursoId}>
                      <AccordionTrigger className="text-sm font-medium text-gray-700">
                        {RECURSOS_PREDEFINIDOS.find((r) => r.id === recursoId)?.nome} - R$ {dados.valorTotal.toFixed(2)}
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul>
                          {Object.entries(dados.itens).map(([itemId, itemDados]) => {
                            const item = contratoSelecionado?.itens.find((i) => i.id === itemId)
                            return (
                              <li key={itemId} className="mb-2 p-2 border rounded">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600">
                                    {item?.nome}: {itemDados.quantidade} {item?.unidade} - R${" "}
                                    {itemDados.valorTotal.toFixed(2)}
                                  </span>
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button variant="outline" size="sm" className="text-blue-600 border-blue-600">
                                        <ArrowRightLeft className="mr-2 h-4 w-4" />
                                        Transferir
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle className="text-lg font-semibold text-blue-600">
                                          Transferir Item
                                        </DialogTitle>
                                        <DialogDescription>
                                          Transferir {item?.nome} de{" "}
                                          {RECURSOS_PREDEFINIDOS.find((r) => r.id === recursoId)?.nome}
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="flex items-center space-x-2">
                                        <Input
                                          type="number"
                                          placeholder="Quantidade"
                                          value={quantidadeTransferencia[`${itemId}-${recursoId}`] || ""}
                                          onChange={(e) =>
                                            setQuantidadeTransferencia((prev) => ({
                                              ...prev,
                                              [`${itemId}-${recursoId}`]: Number(e.target.value),
                                            }))
                                          }
                                          className="w-24"
                                        />
                                        <Select
                                          value={recursoDestino[`${itemId}-${recursoId}`] || ""}
                                          onValueChange={(value) =>
                                            setRecursoDestino((prev) => ({
                                              ...prev,
                                              [`${itemId}-${recursoId}`]: value,
                                            }))
                                          }
                                        >
                                          <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Selecione o destino" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {recursosSelecionados
                                              .filter((id) => id !== recursoId && item?.recursosElegiveis.includes(id))
                                              .map((id) => (
                                                <SelectItem key={id} value={id}>
                                                  {RECURSOS_PREDEFINIDOS.find((r) => r.id === id)?.nome}
                                                </SelectItem>
                                              ))}
                                          </SelectContent>
                                        </Select>
                                        <Button
                                          onClick={() => handleTransferirItem(itemId, recursoId)}
                                          className="bg-blue-600 hover:bg-blue-700 text-white"
                                        >
                                          Transferir
                                        </Button>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )
              })}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

