import { useState, useEffect } from 'react'
import {
  Box,
  Button,
  Container,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useToast,
  Text,
  Stack,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  FormControl,
  FormLabel,
  Input,
  Select,
  Checkbox,
  VStack,
  IconButton,
  Badge,
  Tooltip,
  Tabs,
  TabList,
  TabPanels,
  TabPanel,
  Tab,
  Alert,
  AlertIcon,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react'
import { Plus, MoreVertical, Eye, Pause, Play, RefreshCw, Send, Calendar } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'

type ReportSchedule = {
  id: string
  name: string
  type: 'sales' | 'products' | 'customers'
  format: 'pdf' | 'excel'
  frequency: 'daily' | 'weekly' | 'monthly'
  recipients: string[]
  active: boolean
  created_at: string
  last_run?: string
  next_run?: string
  settings: {
    filters?: Record<string, any>
    sections?: string[]
    charts?: boolean
    tables?: boolean
  }
}

type ReportLog = {
  id: string
  schedule_id: string
  created_at: string
  status: 'success' | 'failed'
  recipients: string[]
  file_url?: string
  error?: string
}

export function ScheduledReports() {
  const toast = useToast()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [loading, setLoading] = useState(false)
  const [schedules, setSchedules] = useState<ReportSchedule[]>([])
  const [logs, setLogs] = useState<ReportLog[]>([])
  const [selectedSchedule, setSelectedSchedule] = useState<ReportSchedule | null>(null)
  const [newSchedule, setNewSchedule] = useState<Partial<ReportSchedule>>({
    type: 'sales',
    format: 'pdf',
    frequency: 'monthly',
    recipients: [],
    active: true,
    settings: {
      charts: true,
      tables: true,
    },
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      // Buscar agendamentos
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('report_schedules')
        .select()
        .order('created_at', { ascending: false })

      if (schedulesError) throw schedulesError
      setSchedules(schedulesData)

      // Buscar logs
      const { data: logsData, error: logsError } = await supabase
        .from('report_logs')
        .select()
        .order('created_at', { ascending: false })
        .limit(50)

      if (logsError) throw logsError
      setLogs(logsData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast({
        title: 'Erro',
        description: 'Falha ao carregar dados',
        status: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit() {
    if (!newSchedule.name || !newSchedule.recipients?.length) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
        status: 'error',
      })
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('report_schedules')
        .insert(newSchedule)

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: 'Relatório agendado com sucesso',
        status: 'success',
      })

      onClose()
      fetchData()
    } catch (error) {
      console.error('Erro ao criar agendamento:', error)
      toast({
        title: 'Erro',
        description: 'Falha ao criar agendamento',
        status: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  async function toggleSchedule(schedule: ReportSchedule) {
    try {
      const { error } = await supabase
        .from('report_schedules')
        .update({ active: !schedule.active })
        .eq('id', schedule.id)

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: `Agendamento ${schedule.active ? 'pausado' : 'ativado'}`,
        status: 'success',
      })

      fetchData()
    } catch (error) {
      console.error('Erro ao atualizar agendamento:', error)
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar agendamento',
        status: 'error',
      })
    }
  }

  async function runNow(schedule: ReportSchedule) {
    try {
      const { error } = await supabase.functions.invoke('generate-report', {
        body: { scheduleId: schedule.id },
      })

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: 'Relatório em geração',
        status: 'success',
      })

      fetchData()
    } catch (error) {
      console.error('Erro ao gerar relatório:', error)
      toast({
        title: 'Erro',
        description: 'Falha ao gerar relatório',
        status: 'error',
      })
    }
  }

  return (
    <Container maxW="container.xl" py={8}>
      <Tabs>
        <TabList mb={6}>
          <Tab>Agendamentos</Tab>
          <Tab>Histórico</Tab>
        </TabList>

        <TabPanels>
          <TabPanel px={0}>
            <Stack spacing={6}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Heading size="lg">Relatórios Agendados</Heading>
                <Stack direction="row" spacing={4}>
                  <IconButton
                    aria-label="Atualizar"
                    icon={<RefreshCw size={20} />}
                    onClick={fetchData}
                  />
                  <Button
                    leftIcon={<Plus size={20} />}
                    onClick={onOpen}
                  >
                    Novo Agendamento
                  </Button>
                </Stack>
              </Box>

              {schedules.length === 0 ? (
                <Alert status="info">
                  <AlertIcon />
                  Nenhum relatório agendado
                </Alert>
              ) : (
                <Box overflowX="auto">
                  <Table>
                    <Thead>
                      <Tr>
                        <Th>Nome</Th>
                        <Th>Tipo</Th>
                        <Th>Frequência</Th>
                        <Th>Destinatários</Th>
                        <Th>Próximo Envio</Th>
                        <Th>Status</Th>
                        <Th>Ações</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {schedules.map((schedule) => (
                        <Tr key={schedule.id}>
                          <Td>{schedule.name}</Td>
                          <Td>
                            <Badge>
                              {schedule.type === 'sales' ? 'Vendas' :
                               schedule.type === 'products' ? 'Produtos' :
                               'Clientes'}
                            </Badge>
                          </Td>
                          <Td>
                            {schedule.frequency === 'daily' ? 'Diário' :
                             schedule.frequency === 'weekly' ? 'Semanal' :
                             'Mensal'}
                          </Td>
                          <Td>
                            <Tooltip
                              label={schedule.recipients.join('\n')}
                              placement="top"
                              hasArrow
                            >
                              <Text>
                                {schedule.recipients.length} destinatário(s)
                              </Text>
                            </Tooltip>
                          </Td>
                          <Td>
                            {schedule.next_run ? (
                              <Tooltip
                                label={format(
                                  parseISO(schedule.next_run),
                                  "dd/MM/yyyy 'às' HH:mm",
                                  { locale: ptBR }
                                )}
                              >
                                <Text>
                                  {format(parseISO(schedule.next_run), "dd/MM 'às' HH:mm")}
                                </Text>
                              </Tooltip>
                            ) : '-'}
                          </Td>
                          <Td>
                            <Badge
                              colorScheme={schedule.active ? 'green' : 'gray'}
                            >
                              {schedule.active ? 'Ativo' : 'Pausado'}
                            </Badge>
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
                                  icon={<Eye size={16} />}
                                  onClick={() => setSelectedSchedule(schedule)}
                                >
                                  Ver Detalhes
                                </MenuItem>
                                <MenuItem
                                  icon={schedule.active ? <Pause size={16} /> : <Play size={16} />}
                                  onClick={() => toggleSchedule(schedule)}
                                >
                                  {schedule.active ? 'Pausar' : 'Ativar'}
                                </MenuItem>
                                <MenuItem
                                  icon={<Send size={16} />}
                                  onClick={() => runNow(schedule)}
                                >
                                  Executar Agora
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
          </TabPanel>

          <TabPanel px={0}>
            <Stack spacing={6}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Heading size="lg">Histórico de Envios</Heading>
                <IconButton
                  aria-label="Atualizar"
                  icon={<RefreshCw size={20} />}
                  onClick={fetchData}
                />
              </Box>

              {logs.length === 0 ? (
                <Alert status="info">
                  <AlertIcon />
                  Nenhum relatório enviado
                </Alert>
              ) : (
                <Box overflowX="auto">
                  <Table>
                    <Thead>
                      <Tr>
                        <Th>Data</Th>
                        <Th>Agendamento</Th>
                        <Th>Status</Th>
                        <Th>Destinatários</Th>
                        <Th>Arquivo</Th>
                        <Th>Erro</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {logs.map((log) => (
                        <Tr key={log.id}>
                          <Td whiteSpace="nowrap">
                            {format(parseISO(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </Td>
                          <Td>
                            {schedules.find(s => s.id === log.schedule_id)?.name || log.schedule_id}
                          </Td>
                          <Td>
                            <Badge
                              colorScheme={log.status === 'success' ? 'green' : 'red'}
                            >
                              {log.status === 'success' ? 'Sucesso' : 'Falha'}
                            </Badge>
                          </Td>
                          <Td>
                            <Tooltip
                              label={log.recipients.join('\n')}
                              placement="top"
                              hasArrow
                            >
                              <Text>
                                {log.recipients.length} destinatário(s)
                              </Text>
                            </Tooltip>
                          </Td>
                          <Td>
                            {log.file_url ? (
                              <Button
                                as="a"
                                href={log.file_url}
                                target="_blank"
                                size="sm"
                                variant="ghost"
                                leftIcon={<Eye size={16} />}
                              >
                                Visualizar
                              </Button>
                            ) : '-'}
                          </Td>
                          <Td>
                            {log.error && (
                              <Tooltip label={log.error}>
                                <Text color="red.500" cursor="help">
                                  Ver erro
                                </Text>
                              </Tooltip>
                            )}
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              )}
            </Stack>
          </TabPanel>
        </TabPanels>
      </Tabs>

      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Novo Agendamento</ModalHeader>
          
          <ModalBody>
            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Nome</FormLabel>
                <Input
                  value={newSchedule.name || ''}
                  onChange={(e) => setNewSchedule({
                    ...newSchedule,
                    name: e.target.value,
                  })}
                  placeholder="Ex: Relatório Mensal de Vendas"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Tipo de Relatório</FormLabel>
                <Select
                  value={newSchedule.type}
                  onChange={(e) => setNewSchedule({
                    ...newSchedule,
                    type: e.target.value as any,
                  })}
                >
                  <option value="sales">Vendas</option>
                  <option value="products">Produtos</option>
                  <option value="customers">Clientes</option>
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Formato</FormLabel>
                <Select
                  value={newSchedule.format}
                  onChange={(e) => setNewSchedule({
                    ...newSchedule,
                    format: e.target.value as any,
                  })}
                >
                  <option value="pdf">PDF</option>
                  <option value="excel">Excel</option>
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Frequência</FormLabel>
                <Select
                  value={newSchedule.frequency}
                  onChange={(e) => setNewSchedule({
                    ...newSchedule,
                    frequency: e.target.value as any,
                  })}
                >
                  <option value="daily">Diário</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensal</option>
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Destinatários</FormLabel>
                <Input
                  placeholder="email1@exemplo.com, email2@exemplo.com"
                  value={newSchedule.recipients?.join(', ') || ''}
                  onChange={(e) => setNewSchedule({
                    ...newSchedule,
                    recipients: e.target.value.split(',').map(email => email.trim()),
                  })}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Configurações</FormLabel>
                <VStack align="start" spacing={2}>
                  <Checkbox
                    isChecked={newSchedule.settings?.charts}
                    onChange={(e) => setNewSchedule({
                      ...newSchedule,
                      settings: {
                        ...newSchedule.settings,
                        charts: e.target.checked,
                      },
                    })}
                  >
                    Incluir Gráficos
                  </Checkbox>
                  <Checkbox
                    isChecked={newSchedule.settings?.tables}
                    onChange={(e) => setNewSchedule({
                      ...newSchedule,
                      settings: {
                        ...newSchedule.settings,
                        tables: e.target.checked,
                      },
                    })}
                  >
                    Incluir Tabelas
                  </Checkbox>
                </VStack>
              </FormControl>
            </Stack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              isLoading={loading}
            >
              Criar Agendamento
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  )
}