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
  Alert,
  AlertIcon,
  Progress,
  Badge,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  FormControl,
  FormLabel,
  Checkbox,
  VStack,
  Tabs,
  TabList,
  TabPanels,
  TabPanel,
  Tab,
  IconButton,
  Tooltip,
} from '@chakra-ui/react'
import { Download, Upload, Archive, AlertTriangle, RefreshCw, Eye } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'

type BackupOptions = {
  products: boolean
  customers: boolean
  orders: boolean
  settings: boolean
  files: boolean
}

type BackupLog = {
  id: string
  created_at: string
  type: 'backup' | 'restore'
  status: 'success' | 'failed'
  file_name: string
  file_size: number
  tables: string[]
  error?: string
  created_by: string
}

export function Backup() {
  const toast = useToast()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState<BackupLog[]>([])
  const [backupOptions, setBackupOptions] = useState<BackupOptions>({
    products: true,
    customers: true,
    orders: true,
    settings: true,
    files: true,
  })

  useEffect(() => {
    fetchLogs()
  }, [])

  async function fetchLogs() {
    try {
      const { data, error } = await supabase
        .from('backup_logs')
        .select()
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setLogs(data)
    } catch (error) {
      console.error('Erro ao carregar logs:', error)
    }
  }

  async function generateBackup() {
    setLoading(true)
    setProgress(0)

    try {
      const backup: Record<string, any> = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        data: {},
      }

      // Função auxiliar para buscar dados
      async function fetchTableData(table: string) {
        const { data, error } = await supabase
          .from(table)
          .select()
          .order('created_at', { ascending: true })

        if (error) throw error
        return data
      }

      const selectedTables: string[] = []

      // Produtos
      if (backupOptions.products) {
        setProgress(20)
        backup.data.products = await fetchTableData('products')
        selectedTables.push('products')
      }

      // Clientes
      if (backupOptions.customers) {
        setProgress(40)
        backup.data.customers = await fetchTableData('customers')
        selectedTables.push('customers')
      }

      // Pedidos
      if (backupOptions.orders) {
        setProgress(60)
        backup.data.orders = await fetchTableData('orders')
        selectedTables.push('orders')
      }

      // Configurações
      if (backupOptions.settings) {
        setProgress(80)
        backup.data.settings = await fetchTableData('settings')
        selectedTables.push('settings')
      }

      // Arquivos
      if (backupOptions.files) {
        setProgress(90)
        backup.data.files = await fetchTableData('files')
        selectedTables.push('files')
      }

      setProgress(95)

      // Gerar arquivo de backup
      const backupStr = JSON.stringify(backup, null, 2)
      const blob = new Blob([backupStr], { type: 'application/json' })
      const fileName = `backup-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.json`

      // Registrar log
      const { error: logError } = await supabase
        .from('backup_logs')
        .insert({
          type: 'backup',
          status: 'success',
          file_name: fileName,
          file_size: blob.size,
          tables: selectedTables,
        })

      if (logError) throw logError

      setProgress(100)

      // Download do arquivo
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: 'Backup gerado com sucesso',
        status: 'success',
      })

      fetchLogs()
    } catch (error) {
      console.error('Erro ao gerar backup:', error)

      // Registrar erro
      await supabase
        .from('backup_logs')
        .insert({
          type: 'backup',
          status: 'failed',
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          tables: Object.entries(backupOptions)
            .filter(([_, value]) => value)
            .map(([key]) => key),
        })

      toast({
        title: 'Erro ao gerar backup',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        status: 'error',
      })
    } finally {
      setLoading(false)
      onClose()
    }
  }

  async function restoreBackup(file: File) {
    setLoading(true)
    setProgress(0)

    try {
      // Ler arquivo
      const content = await file.text()
      const backup = JSON.parse(content)

      // Validar versão
      if (!backup.version || !backup.timestamp || !backup.data) {
        throw new Error('Arquivo de backup inválido')
      }

      // Confirmar restauração
      if (!window.confirm('ATENÇÃO: A restauração irá substituir todos os dados existentes. Deseja continuar?')) {
        return
      }

      const restoredTables: string[] = []

      // Restaurar dados
      for (const [table, data] of Object.entries(backup.data)) {
        if (!Array.isArray(data)) continue

        // Limpar tabela
        const { error: deleteError } = await supabase
          .from(table)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000')

        if (deleteError) throw deleteError

        // Inserir dados
        if (data.length > 0) {
          const { error: insertError } = await supabase
            .from(table)
            .insert(data)

          if (insertError) throw insertError
        }

        restoredTables.push(table)
        setProgress(prev => prev + (100 / Object.keys(backup.data).length))
      }

      // Registrar log
      const { error: logError } = await supabase
        .from('backup_logs')
        .insert({
          type: 'restore',
          status: 'success',
          file_name: file.name,
          file_size: file.size,
          tables: restoredTables,
        })

      if (logError) throw logError

      toast({
        title: 'Backup restaurado com sucesso',
        status: 'success',
      })

      fetchLogs()
    } catch (error) {
      console.error('Erro ao restaurar backup:', error)

      // Registrar erro
      await supabase
        .from('backup_logs')
        .insert({
          type: 'restore',
          status: 'failed',
          file_name: file.name,
          file_size: file.size,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        })

      toast({
        title: 'Erro ao restaurar backup',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        status: 'error',
      })
    } finally {
      setLoading(false)
      setProgress(0)
      fetchLogs()
    }
  }

  return (
    <Container maxW="container.xl" py={8}>
      <Tabs>
        <TabList mb={6}>
          <Tab>Backup e Restauração</Tab>
          <Tab>Histórico</Tab>
        </TabList>

        <TabPanels>
          <TabPanel px={0}>
            <Stack spacing={6}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Heading size="lg">Backup e Restauração</Heading>
                <Stack direction="row" spacing={4}>
                  <Button
                    leftIcon={<Archive size={20} />}
                    onClick={onOpen}
                    isLoading={loading}
                  >
                    Gerar Backup
                  </Button>
                  <Button
                    as="label"
                    leftIcon={<Upload size={20} />}
                    htmlFor="restore-file"
                    cursor="pointer"
                    isLoading={loading}
                  >
                    Restaurar Backup
                    <input
                      id="restore-file"
                      type="file"
                      accept=".json"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          restoreBackup(file)
                        }
                      }}
                    />
                  </Button>
                </Stack>
              </Box>

              <Alert status="warning">
                <AlertIcon />
                <Stack>
                  <Text fontWeight="bold">
                    Importante:
                  </Text>
                  <Text>
                    • Faça backup regularmente para evitar perda de dados
                  </Text>
                  <Text>
                    • A restauração irá substituir todos os dados existentes
                  </Text>
                  <Text>
                    • Mantenha os arquivos de backup em local seguro
                  </Text>
                </Stack>
              </Alert>

              {loading && (
                <Box>
                  <Text mb={2}>Processando... {progress.toFixed(0)}%</Text>
                  <Progress value={progress} size="sm" colorScheme="brand" />
                </Box>
              )}
            </Stack>
          </TabPanel>

          <TabPanel px={0}>
            <Stack spacing={6}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Heading size="lg">Histórico de Backups</Heading>
                <IconButton
                  aria-label="Atualizar"
                  icon={<RefreshCw size={20} />}
                  onClick={fetchLogs}
                  isLoading={loading}
                />
              </Box>

              <Box overflowX="auto">
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Data</Th>
                      <Th>Tipo</Th>
                      <Th>Status</Th>
                      <Th>Arquivo</Th>
                      <Th>Tamanho</Th>
                      <Th>Tabelas</Th>
                      <Th>Erro</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {logs.map((log) => (
                      <Tr key={log.id}>
                        <Td whiteSpace="nowrap">
                          <Tooltip
                            label={format(
                              new Date(log.created_at),
                              "dd/MM/yyyy 'às' HH:mm",
                              { locale: ptBR }
                            )}
                          >
                            <Text>
                              {formatDistanceToNow(new Date(log.created_at), {
                                locale: ptBR,
                                addSuffix: true,
                              })}
                            </Text>
                          </Tooltip>
                        </Td>
                        <Td>
                          <Badge colorScheme={log.type === 'backup' ? 'blue' : 'purple'}>
                            {log.type === 'backup' ? 'Backup' : 'Restauração'}
                          </Badge>
                        </Td>
                        <Td>
                          <Badge
                            colorScheme={log.status === 'success' ? 'green' : 'red'}
                          >
                            {log.status === 'success' ? 'Sucesso' : 'Falha'}
                          </Badge>
                        </Td>
                        <Td>{log.file_name}</Td>
                        <Td>
                          {log.file_size
                            ? `${(log.file_size / 1024 / 1024).toFixed(2)} MB`
                            : '-'}
                        </Td>
                        <Td>
                          <Tooltip
                            label={log.tables?.join(', ')}
                            placement="top"
                            hasArrow
                          >
                            <Text>
                              {log.tables?.length ?? 0} tabelas
                            </Text>
                          </Tooltip>
                        </Td>
                        <Td>
                          {log.error && (
                            <Tooltip label={log.error}>
                              <Box color="red.500" cursor="help">
                                <Eye size={16} />
                              </Box>
                            </Tooltip>
                          )}
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </Stack>
          </TabPanel>
        </TabPanels>
      </Tabs>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Opções de Backup</ModalHeader>
          
          <ModalBody>
            <VStack align="stretch" spacing={4}>
              <FormControl>
                <Checkbox
                  isChecked={backupOptions.products}
                  onChange={(e) => setBackupOptions({
                    ...backupOptions,
                    products: e.target.checked,
                  })}
                >
                  Produtos
                </Checkbox>
              </FormControl>

              <FormControl>
                <Checkbox
                  isChecked={backupOptions.customers}
                  onChange={(e) => setBackupOptions({
                    ...backupOptions,
                    customers: e.target.checked,
                  })}
                >
                  Clientes
                </Checkbox>
              </FormControl>

              <FormControl>
                <Checkbox
                  isChecked={backupOptions.orders}
                  onChange={(e) => setBackupOptions({
                    ...backupOptions,
                    orders: e.target.checked,
                  })}
                >
                  Pedidos
                </Checkbox>
              </FormControl>

              <FormControl>
                <Checkbox
                  isChecked={backupOptions.settings}
                  onChange={(e) => setBackupOptions({
                    ...backupOptions,
                    settings: e.target.checked,
                  })}
                >
                  Configurações
                </Checkbox>
              </FormControl>

              <FormControl>
                <Checkbox
                  isChecked={backupOptions.files}
                  onChange={(e) => setBackupOptions({
                    ...backupOptions,
                    files: e.target.checked,
                  })}
                >
                  Arquivos
                </Checkbox>
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={generateBackup}
              isLoading={loading}
              isDisabled={!Object.values(backupOptions).some(Boolean)}
            >
              Gerar Backup
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  )
}