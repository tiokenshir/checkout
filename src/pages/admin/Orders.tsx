import { useEffect, useState } from 'react'
import {
  Box,
  Container,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Button,
  Select,
  Input,
  Stack,
  useToast,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Grid,
  FormControl,
  FormLabel,
  Textarea,
  IconButton,
  Tooltip,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Flex,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverArrow,
  PopoverCloseButton,
} from '@chakra-ui/react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Eye, Download, Calendar, Search, X, MoreVertical, MessageSquare } from 'lucide-react'
import { supabase } from '../../lib/supabase'

type Order = Database['public']['Tables']['orders']['Row'] & {
  customers: Database['public']['Tables']['customers']['Row']
  products: Database['public']['Tables']['products']['Row']
  notes?: {
    id: string
    content: string
    created_at: string
    created_by: string
  }[]
}

const STATUS_COLORS = {
  pending: 'yellow',
  paid: 'green',
  expired: 'red',
  cancelled: 'gray',
}

const STATUS_LABELS = {
  pending: 'Pendente',
  paid: 'Pago',
  expired: 'Expirado',
  cancelled: 'Cancelado',
}

export function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [noteContent, setNoteContent] = useState('')
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    startDate: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    minAmount: '',
    maxAmount: '',
    paymentMethod: '',
    productType: '',
  })
  const { isOpen, onOpen, onClose } = useDisclosure()
  const toast = useToast()

  useEffect(() => {
    fetchOrders()

    const channel = supabase
      .channel('order-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_updates',
        },
        (payload) => {
          fetchOrders()
          
          toast({
            title: 'Pedido Atualizado',
            description: `Pedido ${payload.new.order_id} foi ${
              payload.new.status === 'paid' ? 'pago' : 'cancelado'
            }`,
            status: payload.new.status === 'paid' ? 'success' : 'error',
            duration: 5000,
            isClosable: true,
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchOrders() {
    setLoading(true)
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          customers (*),
          products (*),
          notes:order_notes (
            id,
            content,
            created_at,
            created_by
          )
        `)
        .order('created_at', { ascending: false })

      // Aplicar filtros
      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      if (filters.startDate) {
        query = query.gte('created_at', `${filters.startDate}T00:00:00`)
      }

      if (filters.endDate) {
        query = query.lte('created_at', `${filters.endDate}T23:59:59`)
      }

      if (filters.minAmount) {
        query = query.gte('total_amount', parseFloat(filters.minAmount))
      }

      if (filters.maxAmount) {
        query = query.lte('total_amount', parseFloat(filters.maxAmount))
      }

      if (filters.paymentMethod) {
        query = query.eq('payment_method', filters.paymentMethod)
      }

      if (filters.productType) {
        query = query.eq('products.type', filters.productType)
      }

      if (filters.search) {
        query = query.or(`
          customers.name.ilike.%${filters.search}%,
          customers.email.ilike.%${filters.search}%,
          customers.cpf.ilike.%${filters.search}%,
          products.name.ilike.%${filters.search}%
        `)
      }

      const { data, error } = await query

      if (error) throw error
      setOrders(data)
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error)
      toast({
        title: 'Erro',
        description: 'Falha ao carregar pedidos',
        status: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  async function addNote() {
    if (!selectedOrder || !noteContent.trim()) return

    try {
      const { error } = await supabase
        .from('order_notes')
        .insert({
          order_id: selectedOrder.id,
          content: noteContent,
          created_by: 'admin', // Idealmente, usar o ID do usuário logado
        })

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: 'Nota adicionada com sucesso',
        status: 'success',
      })

      setNoteContent('')
      fetchOrders()
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao adicionar nota',
        status: 'error',
      })
    }
  }

  function handleViewOrder(order: Order) {
    setSelectedOrder(order)
    onOpen()
  }

  function handleExportCSV() {
    try {
      // Preparar dados para exportação
      const csvData = filteredOrders.map(order => ({
        'Data do Pedido': format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
        'Nome do Cliente': order.customers.name,
        'Email': order.customers.email,
        'CPF': order.customers.cpf,
        'Telefone': order.customers.phone,
        'Produto': order.products.name,
        'Tipo': order.products.type === 'product' ? 'Produto' : 'Serviço',
        'Valor': `R$ ${order.total_amount.toFixed(2)}`,
        'Status': STATUS_LABELS[order.status],
        'Método de Pagamento': order.payment_method || '-',
        'Data do Pagamento': order.paid_at 
          ? format(new Date(order.paid_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })
          : '-',
        'ID da Transação': order.transaction_id || '-',
        'Notas': order.notes?.map(note => note.content).join(' | ') || '-',
      }))

      // Converter para CSV
      const headers = Object.keys(csvData[0])
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => 
          headers.map(header => 
            `"${String(row[header]).replace(/"/g, '""')}"`
          ).join(',')
        )
      ].join('\n')

      // Criar e baixar arquivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `pedidos_${format(new Date(), 'dd-MM-yyyy')}.csv`
      link.click()

      toast({
        title: 'Sucesso',
        description: 'Arquivo CSV gerado com sucesso',
        status: 'success',
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao gerar arquivo CSV',
        status: 'error',
      })
    }
  }

  function resetFilters() {
    setFilters({
      status: '',
      search: '',
      startDate: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      minAmount: '',
      maxAmount: '',
      paymentMethod: '',
      productType: '',
    })
  }

  const filteredOrders = orders

  return (
    <Container maxW="container.xl" py={8}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={6}>
        <Heading>Pedidos</Heading>
        <Button
          leftIcon={<Download size={20} />}
          onClick={handleExportCSV}
          isDisabled={filteredOrders.length === 0}
        >
          Exportar CSV
        </Button>
      </Box>
      
      <Box bg="white" p={4} borderRadius="lg" boxShadow="sm" mb={6}>
        <Stack spacing={4}>
          <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
            <FormControl>
              <FormLabel>Status</FormLabel>
              <Select
                placeholder="Todos os status"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="pending">Pendentes</option>
                <option value="paid">Pagos</option>
                <option value="expired">Expirados</option>
                <option value="cancelled">Cancelados</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Data Inicial</FormLabel>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Data Final</FormLabel>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Valor Mínimo</FormLabel>
              <NumberInput
                min={0}
                value={filters.minAmount}
                onChange={(value) => setFilters({ ...filters, minAmount: value })}
              >
                <NumberInputField placeholder="R$ 0,00" />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>

            <FormControl>
              <FormLabel>Valor Máximo</FormLabel>
              <NumberInput
                min={0}
                value={filters.maxAmount}
                onChange={(value) => setFilters({ ...filters, maxAmount: value })}
              >
                <NumberInputField placeholder="R$ 0,00" />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>

            <FormControl>
              <FormLabel>Método de Pagamento</FormLabel>
              <Select
                placeholder="Todos os métodos"
                value={filters.paymentMethod}
                onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
              >
                <option value="pix">PIX</option>
                <option value="credit_card">Cartão de Crédito</option>
                <option value="bank_slip">Boleto</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Tipo de Produto</FormLabel>
              <Select
                placeholder="Todos os tipos"
                value={filters.productType}
                onChange={(e) => setFilters({ ...filters, productType: e.target.value })}
              >
                <option value="product">Produto</option>
                <option value="service">Serviço</option>
              </Select>
            </FormControl>
          </Grid>

          <Stack direction="row" spacing={4}>
            <Input
              placeholder="Buscar por cliente, email, CPF ou produto..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
            <Button onClick={resetFilters} leftIcon={<X size={20} />}>
              Limpar Filtros
            </Button>
          </Stack>
        </Stack>
      </Box>
      
      <Box bg="white" borderRadius="lg" boxShadow="sm" overflowX="auto">
        <Table>
          <Thead>
            <Tr>
              <Th>Data</Th>
              <Th>Cliente</Th>
              <Th>Produto</Th>
              <Th isNumeric>Valor</Th>
              <Th>Status</Th>
              <Th>Notas</Th>
              <Th>Ações</Th>
            </Tr>
          </Thead>
          <Tbody>
            {loading ? (
              <Tr>
                <Td colSpan={7} textAlign="center" py={8}>
                  Carregando...
                </Td>
              </Tr>
            ) : filteredOrders.length === 0 ? (
              <Tr>
                <Td colSpan={7} textAlign="center" py={8}>
                  Nenhum pedido encontrado
                </Td>
              </Tr>
            ) : (
              filteredOrders.map((order) => (
                <Tr key={order.id}>
                  <Td whiteSpace="nowrap">
                    {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </Td>
                  <Td>
                    <Text fontWeight="medium">{order.customers.name}</Text>
                    <Text fontSize="sm" color="gray.600">{order.customers.email}</Text>
                  </Td>
                  <Td>{order.products.name}</Td>
                  <Td isNumeric>R$ {order.total_amount.toFixed(2)}</Td>
                  <Td>
                    <Badge colorScheme={STATUS_COLORS[order.status]}>
                      {STATUS_LABELS[order.status]}
                    </Badge>
                  </Td>
                  <Td>
                    {order.notes && order.notes.length > 0 && (
                      <Popover>
                        <PopoverTrigger>
                          <IconButton
                            aria-label="Ver notas"
                            icon={<MessageSquare size={16} />}
                            size="sm"
                            variant="ghost"
                          />
                        </PopoverTrigger>
                        <PopoverContent>
                          <PopoverArrow />
                          <PopoverCloseButton />
                          <PopoverHeader>Notas do Pedido</PopoverHeader>
                          <PopoverBody>
                            <Stack spacing={2}>
                              {order.notes.map((note) => (
                                <Box key={note.id} p={2} bg="gray.50" borderRadius="md">
                                  <Text fontSize="sm">{note.content}</Text>
                                  <Text fontSize="xs" color="gray.500">
                                    {format(parseISO(note.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                  </Text>
                                </Box>
                              ))}
                            </Stack>
                          </PopoverBody>
                        </PopoverContent>
                      </Popover>
                    )}
                  </Td>
                  <Td>
                    <Menu>
                      <MenuButton
                        as={IconButton}
                        icon={<MoreVertical size={16} />}
                        variant="ghost"
                        size="sm"
                      />
                      <MenuList>
                        <MenuItem icon={<Eye size={16} />} onClick={() => handleViewOrder(order)}>
                          Ver Detalhes
                        </MenuItem>
                        <MenuItem icon={<MessageSquare size={16} />} onClick={() => {
                          setSelectedOrder(order)
                          onOpen()
                        }}>
                          Adicionar Nota
                        </MenuItem>
                      </MenuList>
                    </Menu>
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </Box>

      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Detalhes do Pedido</ModalHeader>
          <ModalCloseButton />
          
          <ModalBody pb={6}>
            {selectedOrder && (
              <Stack spacing={4}>
                <Box>
                  <Text fontWeight="bold" mb={1}>Data do Pedido</Text>
                  <Text>
                    {format(new Date(selectedOrder.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </Text>
                </Box>

                <Box>
                  <Text fontWeight="bold" mb={1}>Cliente</Text>
                  <Text>{selectedOrder.customers.name}</Text>
                  <Text color="gray.600">Email: {selectedOrder.customers.email}</Text>
                  <Text color="gray.600">CPF: {selectedOrder.customers.cpf}</Text>
                  <Text color="gray.600">Telefone: {selectedOrder.customers.phone}</Text>
                </Box>

                <Box>
                  <Text fontWeight="bold" mb={1}>Produto</Text>
                  <Text>{selectedOrder.products.name}</Text>
                  <Text color="gray.600">{selectedOrder.products.description}</Text>
                </Box>

                <Box>
                  <Text fontWeight="bold" mb={1}>Pagamento</Text>
                  <Stack direction="row" spacing={4}>
                    <Box>
                      <Text color="gray.600">Status:</Text>
                      <Badge colorScheme={STATUS_COLORS[selectedOrder.status]}>
                        {STATUS_LABELS[selectedOrder.status]}
                      </Badge>
                    </Box>
                    <Box>
                      <Text color="gray.600">Valor:</Text>
                      <Text fontWeight="bold">R$ {selectedOrder.total_amount.toFixed(2)}</Text>
                    </Box>
                  </Stack>
                </Box>

                {selectedOrder.paid_at && (
                  <Box>
                    <Text fontWeight="bold" mb={1}>Data do Pagamento</Text>
                    <Text>
                      {format(new Date(selectedOrder.paid_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </Text>
                  </Box>
                )}

                {selectedOrder.transaction_id && (
                  <Box>
                    <Text fontWeight="bold" mb={1}>ID da Transação</Text>
                    <Text fontFamily="mono">{selectedOrder.transaction_id}</Text>
                  </Box>
                )}

                <Box>
                  <Text fontWeight="bold" mb={2}>Notas</Text>
                  <Stack spacing={2}>
                    {selectedOrder.notes?.map((note) => (
                      <Box key={note.id} p={2} bg="gray.50" borderRadius="md">
                        <Text fontSize="sm">{note.content}</Text>
                        <Text fontSize="xs" color="gray.500">
                          {format(parseISO(note.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </Text>
                      </Box>
                    ))}
                  </Stack>

                  <Box mt={4}>
                    <FormControl>
                      <FormLabel>Adicionar Nota</FormLabel>
                      <Textarea
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        placeholder="Digite uma nota sobre o pedido..."
                      />
                    </FormControl>
                    <Button
                      mt={2}
                      size="sm"
                      onClick={addNote}
                      isDisabled={!noteContent.trim()}
                    >
                      Adicionar Nota
                    </Button>
                  </Box>
                </Box>
              </Stack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Container>
  )
}