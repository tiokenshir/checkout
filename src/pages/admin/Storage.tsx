import { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Heading,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  IconButton,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Input,
  Select,
  Stack,
  useToast,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Text,
  Progress,
  Alert,
  AlertIcon,
} from '@chakra-ui/react'
import { Plus, MoreVertical, RefreshCw, Link as LinkIcon } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { connectStorageProvider, syncStorage } from '../../utils/cloudStorage'

type StorageIntegration = {
  id: string
  provider: string
  active: boolean
  created_at: string
  last_sync?: {
    status: string
    files_synced: number
    total_size: number
  }
}

export function Storage() {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [integrations, setIntegrations] = useState<StorageIntegration[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [newIntegration, setNewIntegration] = useState({
    provider: 'google_drive',
    credentials: {
      accessToken: '',
      refreshToken: '',
    },
  })
  const toast = useToast()

  useEffect(() => {
    fetchIntegrations()
  }, [])

  async function fetchIntegrations() {
    try {
      const { data, error } = await supabase
        .from('storage_integrations')
        .select(`
          *,
          storage_sync_logs (
            status,
            files_synced,
            total_size
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setIntegrations(data)
    } catch (error) {
      console.error('Error loading integrations:', error)
      toast({
        title: 'Erro',
        description: 'Falha ao carregar integrações',
        status: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      await connectStorageProvider(
        newIntegration.provider as any,
        newIntegration.credentials
      )

      toast({
        title: 'Sucesso',
        description: 'Integração criada com sucesso',
        status: 'success',
      })

      onClose()
      fetchIntegrations()
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao criar integração',
        status: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleSync(integrationId: string) {
    setSyncing(true)

    try {
      await syncStorage(integrationId)

      toast({
        title: 'Sucesso',
        description: 'Sincronização concluída',
        status: 'success',
      })

      fetchIntegrations()
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao sincronizar',
        status: 'error',
      })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Container maxW="container.xl" py={8}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={6}>
        <Heading size="lg">Armazenamento</Heading>
        <Button leftIcon={<Plus size={20} />} onClick={onOpen}>
          Nova Integração
        </Button>
      </Box>

      <Box bg="white" borderRadius="lg" boxShadow="sm">
        <Table>
          <Thead>
            <Tr>
              <Th>Provedor</Th>
              <Th>Status</Th>
              <Th>Última Sincronização</Th>
              <Th>Arquivos</Th>
              <Th>Ações</Th>
            </Tr>
          </Thead>
          <Tbody>
            {integrations.map((integration) => (
              <Tr key={integration.id}>
                <Td>
                  <Text fontWeight="medium">
                    {integration.provider === 'google_drive' ? 'Google Drive' :
                     integration.provider === 'dropbox' ? 'Dropbox' :
                     'OneDrive'}
                  </Text>
                </Td>
                <Td>
                  <Badge
                    colorScheme={integration.active ? 'green' : 'gray'}
                  >
                    {integration.active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </Td>
                <Td>
                  {integration.last_sync ? (
                    <Stack spacing={1}>
                      <Badge
                        colorScheme={
                          integration.last_sync.status === 'success' ? 'green' : 'red'
                        }
                      >
                        {integration.last_sync.status === 'success' ? 'Sucesso' : 'Falha'}
                      </Badge>
                      <Text fontSize="sm" color="gray.600">
                        {integration.last_sync.files_synced} arquivos
                        ({(integration.last_sync.total_size / 1024 / 1024).toFixed(2)} MB)
                      </Text>
                    </Stack>
                  ) : (
                    'Nunca'
                  )}
                </Td>
                <Td>
                  {integration.last_sync?.files_synced || 0} arquivos
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
                        icon={<RefreshCw size={16} />}
                        onClick={() => handleSync(integration.id)}
                        isDisabled={syncing}
                      >
                        Sincronizar
                      </MenuItem>
                      <MenuItem
                        icon={<LinkIcon size={16} />}
                        onClick={() => window.open(integration.provider_url, '_blank')}
                      >
                        Abrir no Drive
                      </MenuItem>
                    </MenuList>
                  </Menu>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <form onSubmit={handleSubmit}>
            <ModalHeader>Nova Integração</ModalHeader>
            <ModalBody>
              <Stack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Provedor</FormLabel>
                  <Select
                    value={newIntegration.provider}
                    onChange={(e) => setNewIntegration({
                      ...newIntegration,
                      provider: e.target.value,
                    })}
                  >
                    <option value="google_drive">Google Drive</option>
                    <option value="dropbox">Dropbox</option>
                    <option value="onedrive">OneDrive</option>
                  </Select>
                </FormControl>

                <Alert status="info">
                  <AlertIcon />
                  Configure as credenciais de acesso no painel do provedor
                </Alert>

                <FormControl isRequired>
                  <FormLabel>Access Token</FormLabel>
                  <Input
                    value={newIntegration.credentials.accessToken}
                    onChange={(e) => setNewIntegration({
                      ...newIntegration,
                      credentials: {
                        ...newIntegration.credentials,
                        accessToken: e.target.value,
                      },
                    })}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Refresh Token</FormLabel>
                  <Input
                    value={newIntegration.credentials.refreshToken}
                    onChange={(e) => setNewIntegration({
                      ...newIntegration,
                      credentials: {
                        ...newIntegration.credentials,
                        refreshToken: e.target.value,
                      },
                    })}
                  />
                </FormControl>
              </Stack>
            </ModalBody>

            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                isLoading={loading}
              >
                Conectar
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </Container>
  )
}