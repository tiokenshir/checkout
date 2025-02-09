import { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Heading,
  Button,
  Stack,
  useToast,
  Tabs,
  TabList,
  TabPanels,
  TabPanel,
  Tab,
  FormControl,
  FormLabel,
  Input,
  Switch,
  Card,
  CardHeader,
  CardBody,
  Select,
  InputGroup,
  InputRightElement,
  IconButton,
  Divider,
  Textarea,
} from '@chakra-ui/react'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../../lib/supabase'

type Settings = {
  whatsapp_settings: {
    enabled: boolean
    api_key: string
    instance_id: string
    webhook_url: string
    default_message: string
    notification_types: {
      order_confirmation: boolean
      payment_received: boolean
      payment_expired: boolean
      access_granted: boolean
      daily_summary: boolean
      weekly_report: boolean
    }
    templates: {
      order_confirmation: string
      payment_received: string
      payment_expired: string
      access_granted: string
      daily_summary: string
      weekly_report: string
    }
  }
  notification_settings: {
    email_notifications: boolean
    payment_confirmation: boolean
    payment_expiration: boolean
    new_order: boolean
    daily_summary: boolean
    weekly_report: boolean
    send_copy_to: string[]
  }
  integration_settings: {
    webhook_url: string
    api_key: string
    notification_url: string
    success_url: string
    cancel_url: string
  }
  checkout_settings: {
    auto_expire_time: number
    pix_key: string
    pix_key_type: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random'
  }
}

const defaultSettings: Settings = {
  whatsapp_settings: {
    enabled: false,
    api_key: '',
    instance_id: '',
    webhook_url: '',
    default_message: 'Olá {customer_name}, ',
    notification_types: {
      order_confirmation: true,
      payment_received: true,
      payment_expired: true,
      access_granted: true,
      daily_summary: false,
      weekly_report: false,
    },
    templates: {
      order_confirmation: 'Olá {customer_name}, seu pedido #{order_id} foi confirmado! Valor: R$ {amount}',
      payment_received: 'Olá {customer_name}, recebemos seu pagamento de R$ {amount} para o pedido #{order_id}',
      payment_expired: 'Olá {customer_name}, o pagamento do pedido #{order_id} expirou. Gere um novo link para continuar.',
      access_granted: 'Olá {customer_name}, seu acesso ao produto {product_name} foi liberado!',
      daily_summary: 'Resumo diário:\nPedidos: {orders_count}\nVendas: R$ {total_sales}',
      weekly_report: 'Relatório semanal:\nPedidos: {orders_count}\nVendas: R$ {total_sales}\nConversão: {conversion_rate}%',
    },
  },
  notification_settings: {
    email_notifications: true,
    payment_confirmation: true,
    payment_expiration: true,
    new_order: true,
    daily_summary: false,
    weekly_report: true,
    send_copy_to: [],
  },
  integration_settings: {
    webhook_url: '',
    api_key: '',
    notification_url: '',
    success_url: '',
    cancel_url: '',
  },
  checkout_settings: {
    auto_expire_time: 30,
    pix_key: '',
    pix_key_type: 'cpf',
  },
}

export function Settings() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSecrets, setShowSecrets] = useState(false)
  const [settings, setSettings] = useState<Settings>(defaultSettings)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('settings')
        .select()
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        setSettings({
          whatsapp_settings: {
            ...defaultSettings.whatsapp_settings,
            ...(data.whatsapp_settings || {}),
          },
          notification_settings: {
            ...defaultSettings.notification_settings,
            ...(data.notification_settings || {}),
          },
          integration_settings: {
            ...defaultSettings.integration_settings,
            ...(data.integration_settings || {}),
          },
          checkout_settings: {
            ...defaultSettings.checkout_settings,
            ...(data.checkout_settings || {}),
          },
        })
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      toast({
        title: 'Erro',
        description: 'Falha ao carregar configurações',
        status: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  async function saveSettings() {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('settings')
        .upsert(settings)

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: 'Configurações salvas com sucesso',
        status: 'success',
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Falha ao salvar configurações',
        status: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container maxW="container.xl" py={8}>
      <Heading mb={6}>Configurações</Heading>

      <Box bg="white" borderRadius="lg" boxShadow="sm">
        <Tabs>
          <TabList px={4}>
            <Tab>WhatsApp</Tab>
            <Tab>Notificações</Tab>
            <Tab>Integrações</Tab>
            <Tab>Checkout</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <Stack spacing={6}>
                <Card>
                  <CardHeader>
                    <Heading size="md">Configurações do WhatsApp</Heading>
                  </CardHeader>
                  <CardBody>
                    <Stack spacing={4}>
                      <FormControl display="flex" alignItems="center">
                        <FormLabel mb={0}>Ativar WhatsApp</FormLabel>
                        <Switch
                          isChecked={settings.whatsapp_settings.enabled}
                          onChange={(e) => setSettings({
                            ...settings,
                            whatsapp_settings: {
                              ...settings.whatsapp_settings,
                              enabled: e.target.checked,
                            },
                          })}
                        />
                      </FormControl>

                      <FormControl>
                        <FormLabel>API Key</FormLabel>
                        <InputGroup>
                          <Input
                            type={showSecrets ? 'text' : 'password'}
                            value={settings.whatsapp_settings.api_key}
                            onChange={(e) => setSettings({
                              ...settings,
                              whatsapp_settings: {
                                ...settings.whatsapp_settings,
                                api_key: e.target.value,
                              },
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
                        <FormLabel>ID da Instância</FormLabel>
                        <Input
                          value={settings.whatsapp_settings.instance_id}
                          onChange={(e) => setSettings({
                            ...settings,
                            whatsapp_settings: {
                              ...settings.whatsapp_settings,
                              instance_id: e.target.value,
                            },
                          })}
                        />
                      </FormControl>

                      <FormControl>
                        <FormLabel>URL do Webhook</FormLabel>
                        <Input
                          value={settings.whatsapp_settings.webhook_url}
                          onChange={(e) => setSettings({
                            ...settings,
                            whatsapp_settings: {
                              ...settings.whatsapp_settings,
                              webhook_url: e.target.value,
                            },
                          })}
                        />
                      </FormControl>

                      <Divider />

                      <Heading size="sm">Tipos de Notificação</Heading>

                      {/* Confirmação de Pedido */}
                      <FormControl>
                        <FormLabel>Confirmação de Pedido</FormLabel>
                        <Stack spacing={2}>
                          <Switch
                            isChecked={settings.whatsapp_settings.notification_types.order_confirmation}
                            onChange={(e) => setSettings({
                              ...settings,
                              whatsapp_settings: {
                                ...settings.whatsapp_settings,
                                notification_types: {
                                  ...settings.whatsapp_settings.notification_types,
                                  order_confirmation: e.target.checked,
                                },
                              },
                            })}
                          />
                          <Textarea
                            value={settings.whatsapp_settings.templates.order_confirmation}
                            onChange={(e) => setSettings({
                              ...settings,
                              whatsapp_settings: {
                                ...settings.whatsapp_settings,
                                templates: {
                                  ...settings.whatsapp_settings.templates,
                                  order_confirmation: e.target.value,
                                },
                              },
                            })}
                            placeholder="Template da mensagem"
                          />
                        </Stack>
                      </FormControl>

                      {/* Pagamento Recebido */}
                      <FormControl>
                        <FormLabel>Pagamento Recebido</FormLabel>
                        <Stack spacing={2}>
                          <Switch
                            isChecked={settings.whatsapp_settings.notification_types.payment_received}
                            onChange={(e) => setSettings({
                              ...settings,
                              whatsapp_settings: {
                                ...settings.whatsapp_settings,
                                notification_types: {
                                  ...settings.whatsapp_settings.notification_types,
                                  payment_received: e.target.checked,
                                },
                              },
                            })}
                          />
                          <Textarea
                            value={settings.whatsapp_settings.templates.payment_received}
                            onChange={(e) => setSettings({
                              ...settings,
                              whatsapp_settings: {
                                ...settings.whatsapp_settings,
                                templates: {
                                  ...settings.whatsapp_settings.templates,
                                  payment_received: e.target.value,
                                },
                              },
                            })}
                            placeholder="Template da mensagem"
                          />
                        </Stack>
                      </FormControl>

                      {/* Pagamento Expirado */}
                      <FormControl>
                        <FormLabel>Pagamento Expirado</FormLabel>
                        <Stack spacing={2}>
                          <Switch
                            isChecked={settings.whatsapp_settings.notification_types.payment_expired}
                            onChange={(e) => setSettings({
                              ...settings,
                              whatsapp_settings: {
                                ...settings.whatsapp_settings,
                                notification_types: {
                                  ...settings.whatsapp_settings.notification_types,
                                  payment_expired: e.target.checked,
                                },
                              },
                            })}
                          />
                          <Textarea
                            value={settings.whatsapp_settings.templates.payment_expired}
                            onChange={(e) => setSettings({
                              ...settings,
                              whatsapp_settings: {
                                ...settings.whatsapp_settings,
                                templates: {
                                  ...settings.whatsapp_settings.templates,
                                  payment_expired: e.target.value,
                                },
                              },
                            })}
                            placeholder="Template da mensagem"
                          />
                        </Stack>
                      </FormControl>

                      {/* Acesso Liberado */}
                      <FormControl>
                        <FormLabel>Acesso Liberado</FormLabel>
                        <Stack spacing={2}>
                          <Switch
                            isChecked={settings.whatsapp_settings.notification_types.access_granted}
                            onChange={(e) => setSettings({
                              ...settings,
                              whatsapp_settings: {
                                ...settings.whatsapp_settings,
                                notification_types: {
                                  ...settings.whatsapp_settings.notification_types,
                                  access_granted: e.target.checked,
                                },
                              },
                            })}
                          />
                          <Textarea
                            value={settings.whatsapp_settings.templates.access_granted}
                            onChange={(e) => setSettings({
                              ...settings,
                              whatsapp_settings: {
                                ...settings.whatsapp_settings,
                                templates: {
                                  ...settings.whatsapp_settings.templates,
                                  access_granted: e.target.value,
                                },
                              },
                            })}
                            placeholder="Template da mensagem"
                          />
                        </Stack>
                      </FormControl>

                      {/* Resumo Diário */}
                      <FormControl>
                        <FormLabel>Resumo Diário</FormLabel>
                        <Stack spacing={2}>
                          <Switch
                            isChecked={settings.whatsapp_settings.notification_types.daily_summary}
                            onChange={(e) => setSettings({
                              ...settings,
                              whatsapp_settings: {
                                ...settings.whatsapp_settings,
                                notification_types: {
                                  ...settings.whatsapp_settings.notification_types,
                                  daily_summary: e.target.checked,
                                },
                              },
                            })}
                          />
                          <Textarea
                            value={settings.whatsapp_settings.templates.daily_summary}
                            onChange={(e) => setSettings({
                              ...settings,
                              whatsapp_settings: {
                                ...settings.whatsapp_settings,
                                templates: {
                                  ...settings.whatsapp_settings.templates,
                                  daily_summary: e.target.value,
                                },
                              },
                            })}
                            placeholder="Template da mensagem"
                          />
                        </Stack>
                      </FormControl>

                      {/* Relatório Semanal */}
                      <FormControl>
                        <FormLabel>Relatório Semanal</FormLabel>
                        <Stack spacing={2}>
                          <Switch
                            isChecked={settings.whatsapp_settings.notification_types.weekly_report}
                            onChange={(e) => setSettings({
                              ...settings,
                              whatsapp_settings: {
                                ...settings.whatsapp_settings,
                                notification_types: {
                                  ...settings.whatsapp_settings.notification_types,
                                  weekly_report: e.target.checked,
                                },
                              },
                            })}
                          />
                          <Textarea
                            value={settings.whatsapp_settings.templates.weekly_report}
                            onChange={(e) => setSettings({
                              ...settings,
                              whatsapp_settings: {
                                ...settings.whatsapp_settings,
                                templates: {
                                  ...settings.whatsapp_settings.templates,
                                  weekly_report: e.target.value,
                                },
                              },
                            })}
                            placeholder="Template da mensagem"
                          />
                        </Stack>
                      </FormControl>
                    </Stack>
                  </CardBody>
                </Card>
              </Stack>
            </TabPanel>

            <TabPanel>
              <Stack spacing={6}>
                <Card>
                  <CardHeader>
                    <Heading size="md">Configurações de Notificação</Heading>
                  </CardHeader>
                  <CardBody>
                    <Stack spacing={4}>
                      <FormControl display="flex" alignItems="center">
                        <FormLabel mb={0}>Notificações por Email</FormLabel>
                        <Switch
                          isChecked={settings.notification_settings.email_notifications}
                          onChange={(e) => setSettings({
                            ...settings,
                            notification_settings: {
                              ...settings.notification_settings,
                              email_notifications: e.target.checked,
                            },
                          })}
                        />
                      </FormControl>

                      <FormControl display="flex" alignItems="center">
                        <FormLabel mb={0}>Confirmação de Pagamento</FormLabel>
                        <Switch
                          isChecked={settings.notification_settings.payment_confirmation}
                          onChange={(e) => setSettings({
                            ...settings,
                            notification_settings: {
                              ...settings.notification_settings,
                              payment_confirmation: e.target.checked,
                            },
                          })}
                        />
                      </FormControl>

                      <FormControl display="flex" alignItems="center">
                        <FormLabel mb={0}>Expiração de Pagamento</FormLabel>
                        <Switch
                          isChecked={settings.notification_settings.payment_expiration}
                          onChange={(e) => setSettings({
                            ...settings,
                            notification_settings: {
                              ...settings.notification_settings,
                              payment_expiration: e.target.checked,
                            },
                          })}
                        />
                      </FormControl>

                      <FormControl display="flex" alignItems="center">
                        <FormLabel mb={0}>Novo Pedido</FormLabel>
                        <Switch
                          isChecked={settings.notification_settings.new_order}
                          onChange={(e) => setSettings({
                            ...settings,
                            notification_settings: {
                              ...settings.notification_settings,
                              new_order: e.target.checked,
                            },
                          })}
                        />
                      </FormControl>

                      <FormControl display="flex" alignItems="center">
                        <FormLabel mb={0}>Resumo Diário</FormLabel>
                        <Switch
                          isChecked={settings.notification_settings.daily_summary}
                          onChange={(e) => setSettings({
                            ...settings,
                            notification_settings: {
                              ...settings.notification_settings,
                              daily_summary: e.target.checked,
                            },
                          })}
                        />
                      </FormControl>

                      <FormControl display="flex" alignItems="center">
                        <FormLabel mb={0}>Relatório Semanal</FormLabel>
                        <Switch
                          isChecked={settings.notification_settings.weekly_report}
                          onChange={(e) => setSettings({
                            ...settings,
                            notification_settings: {
                              ...settings.notification_settings,
                              weekly_report: e.target.checked,
                            },
                          })}
                        />
                      </FormControl>

                      <FormControl>
                        <FormLabel>Enviar Cópia Para</FormLabel>
                        <Input
                          placeholder="email1@exemplo.com, email2@exemplo.com"
                          value={settings.notification_settings.send_copy_to.join(', ')}
                          onChange={(e) => setSettings({
                            ...settings,
                            notification_settings: {
                              ...settings.notification_settings,
                              send_copy_to: e.target.value.split(',').map(email => email.trim()),
                            },
                          })}
                        />
                      </FormControl>
                    </Stack>
                  </CardBody>
                </Card>
              </Stack>
            </TabPanel>

            <TabPanel>
              <Stack spacing={6}>
                <Card>
                  <CardHeader>
                    <Heading size="md">Configurações de Integração</Heading>
                  </CardHeader>
                  <CardBody>
                    <Stack spacing={4}>
                      <FormControl>
                        <FormLabel>URL do Webhook</FormLabel>
                        <Input
                          value={settings.integration_settings.webhook_url}
                          onChange={(e) => setSettings({
                            ...settings,
                            integration_settings: {
                              ...settings.integration_settings,
                              webhook_url: e.target.value,
                            },
                          })}
                        />
                      </FormControl>

                      <FormControl>
                        <FormLabel>API Key</FormLabel>
                        <InputGroup>
                          <Input
                            type={showSecrets ? 'text' : 'password'}
                            value={settings.integration_settings.api_key}
                            onChange={(e) => setSettings({
                              ...settings,
                              integration_settings: {
                                ...settings.integration_settings,
                                api_key: e.target.value,
                              },
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
                        <FormLabel>URL de Notificação</FormLabel>
                        <Input
                          value={settings.integration_settings.notification_url}
                          onChange={(e) => setSettings({
                            ...settings,
                            integration_settings: {
                              ...settings.integration_settings,
                              notification_url: e.target.value,
                            },
                          })}
                        />
                      </FormControl>

                      <FormControl>
                        <FormLabel>URL de Sucesso</FormLabel>
                        <Input
                          value={settings.integration_settings.success_url}
                          onChange={(e) => setSettings({
                            ...settings,
                            integration_settings: {
                              ...settings.integration_settings,
                              success_url: e.target.value,
                            },
                          })}
                        />
                      </FormControl>

                      <FormControl>
                        <FormLabel>URL de Cancelamento</FormLabel>
                        <Input
                          value={settings.integration_settings.cancel_url}
                          onChange={(e) => setSettings({
                            ...settings,
                            integration_settings: {
                              ...settings.integration_settings,
                              cancel_url: e.target.value,
                            },
                          })}
                        />
                      </FormControl>
                    </Stack>
                  </CardBody>
                </Card>
              </Stack>
            </TabPanel>

            <TabPanel>
              <Stack spacing={6}>
                <Card>
                  <CardHeader>
                    <Heading size="md">Configurações de Checkout</Heading>
                  </CardHeader>
                  <CardBody>
                    <Stack spacing={4}>
                      <FormControl>
                        <FormLabel>Tempo de Expiração (minutos)</FormLabel>
                        <Input
                          type="number"
                          value={settings.checkout_settings.auto_expire_time}
                          onChange={(e) => setSettings({
                            ...settings,
                            checkout_settings: {
                              ...settings.checkout_settings,
                              auto_expire_time: parseInt(e.target.value),
                            },
                          })}
                        />
                      </FormControl>

                      <Divider />

                      <Heading size="sm">Configurações PIX</Heading>

                      <FormControl>
                        <FormLabel>Chave PIX</FormLabel>
                        <Input
                          value={settings.checkout_settings.pix_key}
                          onChange={(e) => setSettings({
                            ...settings,
                            checkout_settings: {
                              ...settings.checkout_settings,
                              pix_key: e.target.value,
                            },
                          })}
                        />
                      </FormControl>

                      <FormControl>
                        <FormLabel>Tipo de Chave PIX</FormLabel>
                        <Select
                          value={settings.checkout_settings.pix_key_type}
                          onChange={(e) => setSettings({
                            ...settings,
                            checkout_settings: {
                              ...settings.checkout_settings,
                              pix_key_type: e.target.value as any,
                            },
                          })}
                        >
                          <option value="cpf">CPF</option>
                          <option value="cnpj">CNPJ</option>
                          <option value="email">Email</option>
                          <option value="phone">Telefone</option>
                          <option value="random">Aleatória</option>
                        </Select>
                      </FormControl>
                    </Stack>
                  </CardBody>
                </Card>
              </Stack>
            </TabPanel>
          </TabPanels>
        </Tabs>

        <Box p={4} borderTop="1px" borderColor="gray.200">
          <Button
            colorScheme="brand"
            onClick={saveSettings}
            isLoading={saving}
          >
            Salvar Configurações
          </Button>
        </Box>
      </Box>
    </Container>
  )
}