import { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Heading,
  Card,
  CardHeader,
  CardBody,
  Stack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Button,
  Text,
  useToast,
  Alert,
  AlertIcon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Input,
  useDisclosure,
  Tabs,
  TabList,
  TabPanels,
  TabPanel,
  Tab,
  VStack,
  HStack,
  IconButton,
  Tooltip,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react'
import { Shield, Key, Lock, Unlock, MoreVertical, RefreshCw, Ban } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'
import QRCode from 'qrcode.react'

export function Security() {
  const toast = useToast()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [loading, setLoading] = useState(false)
  const [loginAttempts, setLoginAttempts] = useState<any[]>([])
  const [blockedIPs, setBlockedIPs] = useState<any[]>([])
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [twoFactorSecret, setTwoFactorSecret] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [newBlockedIP, setNewBlockedIP] = useState({
    ip_address: '',
    reason: '',
    expires_at: '',
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      // Buscar tentativas de login
      const { data: attempts, error: attemptsError } = await supabase
        .from('login_attempts')
        .select()
        .order('created_at', { ascending: false })
        .limit(50)

      if (attemptsError) throw attemptsError
      setLoginAttempts(attempts)

      // Buscar IPs bloqueados
      const { data: blocked, error: blockedError } = await supabase
        .from('blocked_ips')
        .select()
        .order('created_at', { ascending: false })

      if (blockedError) throw blockedError
      setBlockedIPs(blocked)

      // Verificar status do 2FA
      const { data: user } = await supabase.auth.getUser()
      setTwoFactorEnabled(!!user.user?.user_metadata?.two_factor_enabled)
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao carregar dados',
        status: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleBlockIP() {
    try {
      const { error } = await supabase
        .from('blocked_ips')
        .insert({
          ...newBlockedIP,
          created_by: supabase.auth.user()?.id,
        })

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: 'IP bloqueado com sucesso',
        status: 'success',
      })

      onClose()
      fetchData()
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao bloquear IP',
        status: 'error',
      })
    }
  }

  async function handleUnblockIP(id: string) {
    try {
      const { error } = await supabase
        .from('blocked_ips')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: 'IP desbloqueado com sucesso',
        status: 'success',
      })

      fetchData()
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao desbloquear IP',
        status: 'error',
      })
    }
  }

  async function setupTwoFactor() {
    try {
      setLoading(true)

      // Gerar segredo TOTP
      const secret = crypto.randomUUID()
      const otpAuthUrl = `otpauth://totp/CheckoutSystem:${supabase.auth.user()?.email}?secret=${secret}&issuer=CheckoutSystem`

      setTwoFactorSecret(secret)
      setTwoFactorEnabled(false)

      toast({
        title: 'Importante',
        description: 'Escaneie o QR Code com seu app de autenticação',
        status: 'info',
        duration: null,
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao configurar 2FA',
        status: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  async function verifyAndEnableTwoFactor() {
    try {
      // Verificar código TOTP
      // Na implementação real, você deve usar uma biblioteca TOTP
      if (verificationCode !== '123456') {
        throw new Error('Código inválido')
      }

      // Atualizar metadados do usuário
      const { error } = await supabase.auth.updateUser({
        data: {
          two_factor_enabled: true,
          two_factor_secret: twoFactorSecret,
        },
      })

      if (error) throw error

      setTwoFactorEnabled(true)
      setTwoFactorSecret('')
      setVerificationCode('')

      toast({
        title: 'Sucesso',
        description: 'Autenticação em dois fatores ativada',
        status: 'success',
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Falha ao verificar código',
        status: 'error',
      })
    }
  }

  async function disableTwoFactor() {
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          two_factor_enabled: false,
          two_factor_secret: null,
        },
      })

      if (error) throw error

      setTwoFactorEnabled(false)
      toast({
        title: 'Sucesso',
        description: 'Autenticação em dois fatores desativada',
        status: 'success',
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao desativar 2FA',
        status: 'error',
      })
    }
  }

  return (
    <Container maxW="container.xl" py={8}>
      <Stack spacing={6}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Heading size="lg">Segurança</Heading>
          <IconButton
            aria-label="Atualizar"
            icon={<RefreshCw size={20} />}
            onClick={fetchData}
          />
        </Box>

        <Tabs>
          <TabList>
            <Tab>Visão Geral</Tab>
            <Tab>Tentativas de Login</Tab>
            <Tab>IPs Bloqueados</Tab>
          </TabList>

          <TabPanels>
            <TabPanel px={0}>
              <Stack spacing={6}>
                {/* Two-Factor Authentication */}
                <Card>
                  <CardHeader>
                    <HStack spacing={4}>
                      <Icon as={Key} boxSize={6} color="brand.500" />
                      <Heading size="md">Autenticação em Dois Fatores</Heading>
                    </HStack>
                  </CardHeader>
                  <CardBody>
                    {twoFactorEnabled ? (
                      <VStack spacing={4} align="start">
                        <Alert status="success">
                          <AlertIcon />
                          2FA está ativo em sua conta
                        </Alert>
                        <Button
                          leftIcon={<Lock size={16} />}
                          colorScheme="red"
                          variant="outline"
                          onClick={disableTwoFactor}
                        >
                          Desativar 2FA
                        </Button>
                      </VStack>
                    ) : twoFactorSecret ? (
                      <VStack spacing={6} align="center">
                        <Text>
                          Escaneie o QR Code abaixo com seu app de autenticação
                          (Google Authenticator, Authy, etc)
                        </Text>
                        
                        <Box p={4} bg="white" borderRadius="lg">
                          <QRCode
                            value={`otpauth://totp/CheckoutSystem:${supabase.auth.user()?.email}?secret=${twoFactorSecret}&issuer=CheckoutSystem`}
                            size={200}
                          />
                        </Box>

                        <FormControl>
                          <FormLabel>Código de Verificação</FormLabel>
                          <HStack>
                            <Input
                              value={verificationCode}
                              onChange={(e) => setVerificationCode(e.target.value)}
                              placeholder="Digite o código"
                              maxLength={6}
                            />
                            <Button
                              onClick={verifyAndEnableTwoFactor}
                              isDisabled={verificationCode.length !== 6}
                            >
                              Verificar
                            </Button>
                          </HStack>
                        </FormControl>
                      </VStack>
                    ) : (
                      <VStack spacing={4} align="start">
                        <Text>
                          A autenticação em dois fatores adiciona uma camada extra de
                          segurança à sua conta.
                        </Text>
                        <Button
                          leftIcon={<Shield size={16} />}
                          onClick={setupTwoFactor}
                          isLoading={loading}
                        >
                          Ativar 2FA
                        </Button>
                      </VStack>
                    )}
                  </CardBody>
                </Card>

                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <HStack spacing={4}>
                      <Icon as={Shield} boxSize={6} color="brand.500" />
                      <Heading size="md">Atividade Recente</Heading>
                    </HStack>
                  </CardHeader>
                  <CardBody>
                    <Table>
                      <Thead>
                        <Tr>
                          <Th>Data</Th>
                          <Th>IP</Th>
                          <Th>Status</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {loginAttempts.slice(0, 5).map((attempt) => (
                          <Tr key={attempt.id}>
                            <Td>
                              {format(new Date(attempt.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </Td>
                            <Td>{attempt.ip_address}</Td>
                            <Td>
                              <Badge colorScheme={attempt.success ? 'green' : 'red'}>
                                {attempt.success ? 'Sucesso' : 'Falha'}
                              </Badge>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </CardBody>
                </Card>
              </Stack>
            </TabPanel>

            <TabPanel px={0}>
              <Card>
                <CardBody>
                  <Table>
                    <Thead>
                      <Tr>
                        <Th>Data</Th>
                        <Th>Email</Th>
                        <Th>IP</Th>
                        <Th>Navegador</Th>
                        <Th>Status</Th>
                        <Th>Ações</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {loginAttempts.map((attempt) => (
                        <Tr key={attempt.id}>
                          <Td>
                            {format(new Date(attempt.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </Td>
                          <Td>{attempt.email}</Td>
                          <Td>{attempt.ip_address}</Td>
                          <Td>
                            <Text noOfLines={1}>
                              {attempt.user_agent}
                            </Text>
                          </Td>
                          <Td>
                            <Badge colorScheme={attempt.success ? 'green' : 'red'}>
                              {attempt.success ? 'Sucesso' : 'Falha'}
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
                                  icon={<Ban size={16} />}
                                  onClick={() => {
                                    setNewBlockedIP({
                                      ...newBlockedIP,
                                      ip_address: attempt.ip_address,
                                    })
                                    onOpen()
                                  }}
                                >
                                  Bloquear IP
                                </MenuItem>
                              </MenuList>
                            </Menu>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </CardBody>
              </Card>
            </TabPanel>

            <TabPanel px={0}>
              <Stack spacing={4}>
                <Box display="flex" justifyContent="flex-end">
                  <Button
                    leftIcon={<Ban size={20} />}
                    onClick={() => {
                      setNewBlockedIP({
                        ip_address: '',
                        reason: '',
                        expires_at: '',
                      })
                      onOpen()
                    }}
                  >
                    Bloquear IP
                  </Button>
                </Box>

                <Card>
                  <CardBody>
                    <Table>
                      <Thead>
                        <Tr>
                          <Th>IP</Th>
                          <Th>Motivo</Th>
                          <Th>Expira em</Th>
                          <Th>Ações</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {blockedIPs.map((blocked) => (
                          <Tr key={blocked.id}>
                            <Td>{blocked.ip_address}</Td>
                            <Td>{blocked.reason}</Td>
                            <Td>
                              {blocked.expires_at
                                ? format(new Date(blocked.expires_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                                : 'Permanente'}
                            </Td>
                            <Td>
                              <Tooltip label="Desbloquear IP">
                                <IconButton
                                  aria-label="Desbloquear IP"
                                  icon={<Unlock size={16} />}
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUnblockIP(blocked.id)}
                                />
                              </Tooltip>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </CardBody>
                </Card>
              </Stack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Stack>

      {/* Modal para bloquear IP */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Bloquear IP</ModalHeader>
          <ModalBody>
            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Endereço IP</FormLabel>
                <Input
                  value={newBlockedIP.ip_address}
                  onChange={(e) => setNewBlockedIP({
                    ...newBlockedIP,
                    ip_address: e.target.value,
                  })}
                  placeholder="Ex: 192.168.1.1"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Motivo</FormLabel>
                <Input
                  value={newBlockedIP.reason}
                  onChange={(e) => setNewBlockedIP({
                    ...newBlockedIP,
                    reason: e.target.value,
                  })}
                  placeholder="Ex: Tentativas suspeitas de login"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Data de Expiração</FormLabel>
                <Input
                  type="datetime-local"
                  value={newBlockedIP.expires_at}
                  onChange={(e) => setNewBlockedIP({
                    ...newBlockedIP,
                    expires_at: e.target.value,
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
              colorScheme="red"
              onClick={handleBlockIP}
              isLoading={loading}
            >
              Bloquear
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  )
}