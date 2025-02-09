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
  Tabs,
  TabList,
  TabPanels,
  TabPanel,
  Tab,
  Code,
  Alert,
  AlertIcon,
  Card,
  CardHeader,
  CardBody,
  Switch,
  InputGroup,
  InputRightElement,
  Divider,
} from '@chakra-ui/react'
import { Plus, MoreVertical, Play, Pause, Key, Webhook, Eye, EyeOff, CreditCard } from 'lucide-react'
import { supabase } from '../../lib/supabase'

type Integration = {
  id: string
  name: string
  type: string
  endpoint: string
  api_key: string
  active: boolean
  created_at: string
  last_call?: {
    status: string
    timestamp: string
  }
}

export function Integrations() {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [showSecrets, setShowSecrets] = useState(false)
  const [primepagSettings, setPrimepagSettings] = useState({
    token: '',
    webhook_secret: '',
    api_url: 'https://api.primepag.com.br/v1',
    pix_key: '',
    pix_key_type: 'cpf',
    auto_expire_time: 30,
    allow_partial_payments: false,
    min_installment_value: 10,
    max_installments: 12,
  })
  const toast = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      // Buscar integrações
      const { data: integrationsData, error: integrationsError } = await supabase
        .from('external_integrations')
        .select()
        .order('created_at', { ascending: false })

      if (integrationsError) throw integrationsError
      setIntegrations(integrationsData)

      // Buscar configurações da PrimePag
      const { data: settings, error: settingsError } = await supabase
        .from('settings')
        .select('payment_settings')
        .single()

      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError

      if (settings?.payment_settings) {
        setPrimepagSettings(settings.payment_settings)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: 'Erro',
        description: 'Falha ao carregar dados',
        status: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  async function savePrimepagSettings() {
    try {
      setLoading(true)

      const { error } = await supabase
        .from('settings')
        .update({
          payment_settings: primepagSettings,
        })
        .eq('id', 1) // Assumindo que existe um registro com ID 1

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: 'Configurações da PrimePag salvas com sucesso',
        status: 'success',
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao salvar configurações',
        status: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  async function testPrimepagConnection() {
    try {
      setLoading(true)

      const response = await fetch(`${primepagSettings.api_url}/test`, {
        headers: {
          'Authorization': `Bearer ${primepagSettings.token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Falha ao conectar com PrimePag')
      }

      toast({
        title: 'Sucesso',
        description: 'Conexão com PrimePag estabelecida',
        status: 'success',
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Falha ao testar conexão',
        status: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxW="container.xl" py={8}>
      <Tabs>
        <TabList>
          <Tab>Integrações</Tab>
          <Tab>PrimePag</Tab>
          <Tab>Documentação</Tab>
        </TabList>

        <TabPanels>
          <TabPanel px={0}>
            <Stack spacing={6}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Heading size="lg">APIs Externas</Heading>
                <Button leftIcon={<Plus size={20} />} onClick={onOpen}>
                  Nova Integração
                </Button>
              </Box>

              <Box bg="white" borderRadius="lg" boxShadow="sm">
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Nome</Th>
                      <Th>Tipo</Th>
                      <Th>Endpoint</Th>
                      <Th>Status</Th>
                      <Th>Última Chamada</Th>
                      <Th>Ações</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {integrations.map((integration) => (
                      <Tr key={integration.id}>
                        <Td>
                          <Text fontWeight="medium">{integration.name}</Text>
                        </Td>
                        <Td>
                          <Badge>
                            {integration.type === 'webhook' ? 'Webhook' : 'API'}
                          </Badge>
                        </Td>
                        <Td>
                          <Code fontSize="sm">{integration.endpoint}</Code>
                        </Td>
                        <Td>
                          <Badge
                            colorScheme={integration.active ? 'green' : 'gray'}
                          >
                            {integration.active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </Td>
                        <Td>
                          {integration.last_call ? (
                            <Stack spacing={1}>
                              <Badge
                                colorScheme={
                                  integration.last_call.status === 'success' ? 'green' : 'red'
                                }
                              >
                                {integration.last_call.status === 'success' ? 'Sucesso' : 'Falha'}
                              </Badge>
                              <Text fontSize="sm" color="gray.600">
                                {new Date(integration.last_call.timestamp).toLocaleString()}
                              </Text>
                            </Stack>
                          ) : (
                            'Nunca'
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
                              <MenuItem
                                icon={integration.active ? <Pause size={16} /> : <Play size={16} />}
                                onClick={() => {/* Toggle integration */}}
                              >
                                {integration.active ? 'Pausar' : 'Ativar'}
                              </MenuItem>
                              <MenuItem
                                icon={<Key size={16} />}
                                onClick={() => {/* Copy API Key */}}
                              >
                                Copiar API Key
                              </MenuItem>
                            </MenuList>
                          </Menu>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </Stack>
          </TabPanel>

          <TabPanel px={0}>
            <Stack spacing={6}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Heading size="lg">Integração PrimePag</Heading>
                <Button
                  leftIcon={<CreditCard size={20} />}
                  onClick={testPrimepagConnection}
                  isLoading={loading}
                >
                  Testar Conexão
                </Button>
              </Box>

              <Card>
                <CardHeader>
                  <Heading size="md">Configurações da API</Heading>
                </CardHeader>
                <CardBody>
                  <Stack spacing={4}>
                    <FormControl>
                      <FormLabel>API Token</FormLabel>
                      <InputGroup>
                        <Input
                          type={showSecrets ? 'text' : 'password'}
                          value={primepagSettings.token}
                          onChange={(e) => setPrimepagSettings({
                            ...primepagSettings,
                            token: e.target.value,
                          })}
                        />
                        <InputRightElement>
                          <IconButton
                            aria-label="Toggle secret visibility"
                            icon={showSecrets ? <EyeOff size={20} /> : <Eye size={20} />}
                            variant="ghost"
                            onClick={() => setShowSecrets(!showSecrets)}
                          />
                        </InputRightElement>
                      </InputGroup>
                    </FormControl>

                    <FormControl>
                      <FormLabel>Webhook Secret</FormLabel>
                      <InputGroup>
                        <Input
                          type={showSecrets ? 'text' : 'password'}
                          value={primepagSettings.webhook_secret}
                          onChange={(e) => setPrimepagSettings({
                            ...primepagSettings,
                            webhook_secret: e.target.value,
                          })}
                        />
                        <InputRightElement>
                          <IconButton
                            aria-label="Toggle secret visibility"
                            icon={showSecrets ? <EyeOff size={20} /> : <Eye size={20} />}
                            variant="ghost"
                            onClick={() => setShowSecrets(!showSecrets)}
                          />
                        </InputRightElement>
                      </InputGroup>
                    </FormControl>

                    <FormControl>
                      <FormLabel>API URL</FormLabel>
                      <Input
                        value={primepagSettings.api_url}
                        onChange={(e) => setPrimepagSettings({
                          ...primepagSettings,
                          api_url: e.target.value,
                        })}
                      />
                    </FormControl>

                    <Divider />

                    <Heading size="sm">Configurações PIX</Heading>

                    <FormControl>
                      <FormLabel>Chave PIX</FormLabel>
                      <Input
                        value={primepagSettings.pix_key}
                        onChange={(e) => setPrimepagSettings({
                          ...primepagSettings,
                          pix_key: e.target.value,
                        })}
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel>Tipo de Chave PIX</FormLabel>
                      <Select
                        value={primepagSettings.pix_key_type}
                        onChange={(e) => setPrimepagSettings({
                          ...primepagSettings,
                          pix_key_type: e.target.value as any,
                        })}
                      >
                        <option value="cpf">CPF</option>
                        <option value="cnpj">CNPJ</option>
                        <option value="email">Email</option>
                        <option value="phone">Telefone</option>
                        <option value="random">Aleatória</option>
                      </Select>
                    </FormControl>

                    <FormControl>
                      <FormLabel>Tempo de Expiração (minutos)</FormLabel>
                      <Input
                        type="number"
                        value={primepagSettings.auto_expire_time}
                        onChange={(e) => setPrimepagSettings({
                          ...primepagSettings,
                          auto_expire_time: parseInt(e.target.value),
                        })}
                      />
                    </FormControl>

                    <Divider />

                    <Heading size="sm">Configurações de Pagamento</Heading>

                    <FormControl>
                      <FormLabel>Permitir Pagamentos Parciais</FormLabel>
                      <Switch
                        isChecked={primepagSettings.allow_partial_payments}
                        onChange={(e) => setPrimepagSettings({
                          ...primepagSettings,
                          allow_partial_payments: e.target.checked,
                        })}
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel>Valor Mínimo da Parcela</FormLabel>
                      <Input
                        type="number"
                        value={primepagSettings.min_installment_value}
                        onChange={(e) => setPrimepagSettings({
                          ...primepagSettings,
                          min_installment_value: parseFloat(e.target.value),
                        })}
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel>Máximo de Parcelas</FormLabel>
                      <Input
                        type="number"
                        value={primepagSettings.max_installments}
                        onChange={(e) => setPrimepagSettings({
                          ...primepagSettings,
                          max_installments: parseInt(e.target.value),
                        })}
                      />
                    </FormControl>

                    <Button
                      colorScheme="brand"
                      onClick={savePrimepagSettings}
                      isLoading={loading}
                    >
                      Salvar Configurações
                    </Button>
                  </Stack>
                </CardBody>
              </Card>
            </Stack>
          </TabPanel>

          <TabPanel px={0}>
            <Stack spacing={6}>
              <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
                <Heading size="md" mb={4}>Webhooks</Heading>
                <Text mb={4}>
                  Webhooks permitem que você receba notificações em tempo real sobre eventos do sistema.
                </Text>
                <Alert status="info" mb={4}>
                  <AlertIcon />
                  Todos os webhooks são enviados com um cabeçalho de autenticação contendo sua API Key.
                </Alert>
                <Code p={4} borderRadius="md" display="block" whiteSpace="pre">
{`POST /webhook
Content-Type: application/json
X-API-Key: sua-api-key

{
  "event": "order.created",
  "data": {
    "order_id": "123",
    "status": "pending",
    "amount": 99.90
  }
}`}
                </Code>
              </Box>

              <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
                <Heading size="md" mb={4}>API REST</Heading>
                <Text mb={4}>
                  Nossa API REST permite que você integre suas aplicações com nosso sistema.
                </Text>
                <Stack spacing={4}>
                  <Box>
                    <Heading size="sm" mb={2}>Autenticação</Heading>
                    <Code p={4} borderRadius="md" display="block">
                      Authorization: Bearer sua-api-key
                    </Code>
                  </Box>
                  <Box>
                    <Heading size="sm" mb={2}>Endpoints</Heading>
                    <Code p={4} borderRadius="md" display="block" whiteSpace="pre">
{`GET /api/v1/orders
GET /api/v1/orders/:id
POST /api/v1/orders
PUT /api/v1/orders/:id
DELETE /api/v1/orders/:id`}
                    </Code>
                  </Box>
                </Stack>
              </Box>
            </Stack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Container>
  )
}