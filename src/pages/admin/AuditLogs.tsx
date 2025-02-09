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
  Text,
  Select,
  Stack,
  Input,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Code,
  useDisclosure,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Flex,
  Badge,
  Tooltip,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Divider,
  Alert,
  AlertIcon,
  useToast,
  SimpleGrid,
} from '@chakra-ui/react'
import { format, parseISO, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'
import { Download, Filter, MoreVertical, RefreshCw, Search, X } from 'lucide-react'

type AuditLog = {
  id: string
  created_at: string
  user_id: string
  action: string
  table_name: string
  record_id: string
  old_data: any
  new_data: any
  ip_address?: string
  user_agent?: string
  metadata?: Record<string, any>
}

const TABLE_NAMES = {
  orders: 'Pedidos',
  products: 'Produtos',
  customers: 'Clientes',
  payment_links: 'Links de Pagamento',
  user_roles: 'Funções de Usuário',
  settings: 'Configurações',
  files: 'Arquivos',
  backup_logs: 'Logs de Backup',
  whatsapp_logs: 'Logs do WhatsApp',
  email_logs: 'Logs de Email',
}

const ACTIONS = {
  INSERT: 'Criação',
  UPDATE: 'Atualização',
  DELETE: 'Exclusão',
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  BACKUP: 'Backup',
  RESTORE: 'Restauração',
}

export function AuditLogs() {
  const toast = useToast()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [filters, setFilters] = useState({
    table: '',
    action: '',
    userId: '',
    search: '',
    startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  })

  useEffect(() => {
    fetchLogs()
  }, [filters])

  async function fetchLogs() {
    setLoading(true)
    try {
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          users:user_id (
            email
          )
        `)
        .order('created_at', { ascending: false })

      if (filters.table) {
        query = query.eq('table_name', filters.table)
      }

      if (filters.action) {
        query = query.eq('action', filters.action)
      }

      if (filters.userId) {
        query = query.eq('user_id', filters.userId)
      }

      if (filters.startDate) {
        query = query.gte('created_at', `${filters.startDate}T00:00:00`)
      }

      if (filters.endDate) {
        query = query.lte('created_at', `${filters.endDate}T23:59:59`)
      }

      if (filters.search) {
        query = query.or(`
          record_id.ilike.%${filters.search}%,
          old_data->>'name'.ilike.%${filters.search}%,
          new_data->>'name'.ilike.%${filters.search}%
        `)
      }

      const { data, error } = await query

      if (error) throw error
      setLogs(data)
    } catch (error) {
      console.error('Erro ao carregar logs:', error)
      toast({
        title: 'Erro',
        description: 'Falha ao carregar logs de auditoria',
        status: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  function handleViewDetails(log: AuditLog) {
    setSelectedLog(log)
    onOpen()
  }

  function exportToCSV() {
    try {
      const csvData = logs.map(log => ({
        'Data': format(parseISO(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }),
        'Usuário': log.users?.email || log.user_id,
        'Tabela': TABLE_NAMES[log.table_name] || log.table_name,
        'Ação': ACTIONS[log.action] || log.action,
        'ID do Registro': log.record_id,
        'IP': log.ip_address || '-',
        'Navegador': log.user_agent || '-',
      }))

      const headers = Object.keys(csvData[0])
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => 
          headers.map(header => 
            `"${String(row[header]).replace(/"/g, '""')}"`
          ).join(',')
        )
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.csv`
      link.click()

      toast({
        title: 'Sucesso',
        description: 'Logs exportados com sucesso',
        status: 'success',
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao exportar logs',
        status: 'error',
      })
    }
  }

  function resetFilters() {
    setFilters({
      table: '',
      action: '',
      userId: '',
      search: '',
      startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
    })
  }

  function renderDiff(oldData: any, newData: any) {
    const allKeys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})])
    
    return Array.from(allKeys).map(key => {
      const oldValue = oldData?.[key]
      const newValue = newData?.[key]
      const hasChanged = oldValue !== newValue

      if (!hasChanged) return null

      return (
        <Box key={key} mb={4} p={3} bg="gray.50" borderRadius="md">
          <Text fontWeight="medium" mb={2}>{key}:</Text>
          <Stack direction="row" spacing={4}>
            {oldValue !== undefined && (
              <Box flex={1}>
                <Badge colorScheme="red" mb={1}>Anterior</Badge>
                <Code display="block" p={2} borderRadius="md" whiteSpace="pre-wrap">
                  {JSON.stringify(oldValue, null, 2)}
                </Code>
              </Box>
            )}
            {newValue !== undefined && (
              <Box flex={1}>
                <Badge colorScheme="green" mb={1}>Novo</Badge>
                <Code display="block" p={2} borderRadius="md" whiteSpace="pre-wrap">
                  {JSON.stringify(newValue, null, 2)}
                </Code>
              </Box>
            )}
          </Stack>
        </Box>
      )
    }).filter(Boolean)
  }

  return (
    <Container maxW="container.xl" py={8}>
      <Stack spacing={6}>
        <Flex justify="space-between" align="center">
          <Heading>Logs de Auditoria</Heading>
          <Stack direction="row" spacing={4}>
            <IconButton
              aria-label="Atualizar"
              icon={<RefreshCw size={20} />}
              onClick={fetchLogs}
            />
            <Button
              leftIcon={<Download size={20} />}
              onClick={exportToCSV}
              isDisabled={logs.length === 0}
            >
              Exportar CSV
            </Button>
          </Stack>
        </Flex>

        <Box bg="white" p={4} borderRadius="lg" boxShadow="sm">
          <Stack spacing={4}>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={4}>
              <Select
                placeholder="Todas as tabelas"
                value={filters.table}
                onChange={(e) => setFilters({ ...filters, table: e.target.value })}
              >
                {Object.entries(TABLE_NAMES).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>

              <Select
                placeholder="Todas as ações"
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              >
                {Object.entries(ACTIONS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>

              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />

              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </SimpleGrid>

            <Flex gap={4}>
              <Input
                flex={1}
                placeholder="Buscar por ID, nome ou conteúdo..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
              <Button
                leftIcon={<X size={20} />}
                onClick={resetFilters}
              >
                Limpar Filtros
              </Button>
            </Flex>
          </Stack>
        </Box>

        {loading ? (
          <Alert status="info">
            <AlertIcon />
            Carregando logs...
          </Alert>
        ) : logs.length === 0 ? (
          <Alert status="info">
            <AlertIcon />
            Nenhum log encontrado
          </Alert>
        ) : (
          <Box bg="white" borderRadius="lg" boxShadow="sm" overflowX="auto">
            <Table>
              <Thead>
                <Tr>
                  <Th>Data</Th>
                  <Th>Usuário</Th>
                  <Th>Tabela</Th>
                  <Th>Ação</Th>
                  <Th>ID do Registro</Th>
                  <Th>IP</Th>
                  <Th>Ações</Th>
                </Tr>
              </Thead>
              <Tbody>
                {logs.map((log) => (
                  <Tr key={log.id}>
                    <Td whiteSpace="nowrap">
                      {format(parseISO(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </Td>
                    <Td>
                      <Tooltip label={log.user_id}>
                        <Text>{log.users?.email || log.user_id}</Text>
                      </Tooltip>
                    </Td>
                    <Td>{TABLE_NAMES[log.table_name] || log.table_name}</Td>
                    <Td>
                      <Badge
                        colorScheme={
                          log.action === 'INSERT' ? 'green' :
                          log.action === 'UPDATE' ? 'blue' :
                          log.action === 'DELETE' ? 'red' :
                          'gray'
                        }
                      >
                        {ACTIONS[log.action] || log.action}
                      </Badge>
                    </Td>
                    <Td>
                      <Code>{log.record_id}</Code>
                    </Td>
                    <Td>
                      {log.ip_address ? (
                        <Tooltip label={log.user_agent}>
                          <Text>{log.ip_address}</Text>
                        </Tooltip>
                      ) : '-'}
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
                          <MenuItem
                            icon={<Search size={16} />}
                            onClick={() => handleViewDetails(log)}
                          >
                            Ver Detalhes
                          </MenuItem>
                        </MenuList>
                      </Menu>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
      </Stack>

      <Modal isOpen={isOpen} onClose={onClose} size="4xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Detalhes do Log</ModalHeader>
          <ModalCloseButton />
          
          <ModalBody pb={6}>
            {selectedLog && (
              <Tabs>
                <TabList>
                  <Tab>Visão Geral</Tab>
                  <Tab>Alterações</Tab>
                  <Tab>Metadados</Tab>
                </TabList>

                <TabPanels>
                  <TabPanel>
                    <Stack spacing={4}>
                      <Box>
                        <Text fontWeight="bold" mb={1}>Data e Hora</Text>
                        <Text>
                          {format(parseISO(selectedLog.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                        </Text>
                      </Box>

                      <Box>
                        <Text fontWeight="bold" mb={1}>Usuário</Text>
                        <Text>{selectedLog.users?.email || selectedLog.user_id}</Text>
                      </Box>

                      <Box>
                        <Text fontWeight="bold" mb={1}>Tabela</Text>
                        <Text>{TABLE_NAMES[selectedLog.table_name] || selectedLog.table_name}</Text>
                      </Box>

                      <Box>
                        <Text fontWeight="bold" mb={1}>Ação</Text>
                        <Badge
                          colorScheme={
                            selectedLog.action === 'INSERT' ? 'green' :
                            selectedLog.action === 'UPDATE' ? 'blue' :
                            selectedLog.action === 'DELETE' ? 'red' :
                            'gray'
                          }
                        >
                          {ACTIONS[selectedLog.action] || selectedLog.action}
                        </Badge>
                      </Box>

                      <Box>
                        <Text fontWeight="bold" mb={1}>ID do Registro</Text>
                        <Code>{selectedLog.record_id}</Code>
                      </Box>

                      {selectedLog.ip_address && (
                        <Box>
                          <Text fontWeight="bold" mb={1}>Endereço IP</Text>
                          <Text>{selectedLog.ip_address}</Text>
                        </Box>
                      )}

                      {selectedLog.user_agent && (
                        <Box>
                          <Text fontWeight="bold" mb={1}>Navegador</Text>
                          <Text>{selectedLog.user_agent}</Text>
                        </Box>
                      )}
                    </Stack>
                  </TabPanel>

                  <TabPanel>
                    {renderDiff(selectedLog.old_data, selectedLog.new_data)}
                  </TabPanel>

                  <TabPanel>
                    <Box>
                      <Text fontWeight="bold" mb={2}>Metadados Adicionais</Text>
                      {selectedLog.metadata ? (
                        <Code
                          display="block"
                          whiteSpace="pre"
                          p={4}
                          borderRadius="md"
                          overflowX="auto"
                        >
                          {JSON.stringify(selectedLog.metadata, null, 2)}
                        </Code>
                      ) : (
                        <Text color="gray.500">Nenhum metadado adicional</Text>
                      )}
                    </Box>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Container>
  )
}