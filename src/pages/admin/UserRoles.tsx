import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Grid,
  Heading,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useDisclosure,
  useToast,
  Text,
  Stack,
  Checkbox,
} from '@chakra-ui/react'
import { Plus, UserPlus } from 'lucide-react'
import { supabase } from '../../lib/supabase'

type UserRole = Database['public']['Tables']['user_roles']['Row'] & {
  users: {
    email: string
  }
}

const ROLES = {
  admin: 'Administrador',
  manager: 'Gerente',
  sales: 'Vendedor',
}

const PERMISSIONS = {
  view_dashboard: 'Visualizar Dashboard',
  manage_products: 'Gerenciar Produtos',
  manage_orders: 'Gerenciar Pedidos',
  create_payment_links: 'Criar Links de Pagamento',
  view_reports: 'Visualizar Relatórios',
}

const ROLE_PERMISSIONS = {
  admin: Object.keys(PERMISSIONS),
  manager: ['view_dashboard', 'manage_products', 'manage_orders', 'create_payment_links', 'view_reports'],
  sales: ['view_dashboard', 'create_payment_links'],
}

export function UserRoles() {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const toast = useToast()
  
  const [users, setUsers] = useState<any[]>([])
  const [userRoles, setUserRoles] = useState<UserRole[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedRole, setSelectedRole] = useState<keyof typeof ROLES>('sales')
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (selectedRole) {
      setSelectedPermissions(ROLE_PERMISSIONS[selectedRole])
    }
  }, [selectedRole])

  async function fetchData() {
    setLoading(true)
    try {
      // Buscar usuários
      const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()

      if (usersError) throw usersError
      setUsers(users)

      // Buscar funções
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select(`
          *,
          users:user_id (
            email
          )
        `)
        .order('created_at', { ascending: false })

      if (rolesError) throw rolesError
      setUserRoles(rolesData)
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

  async function handleSubmit() {
    if (!selectedUser || !selectedRole) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos',
        status: 'error',
      })
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: selectedUser,
          role: selectedRole,
          permissions: selectedPermissions,
        })

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: 'Função atribuída com sucesso',
        status: 'success',
      })

      onClose()
      fetchData()
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Falha ao atribuir função',
        status: 'error',
      })
    } finally {
      setLoading(false)
      setSelectedUser('')
      setSelectedRole('sales')
    }
  }

  return (
    <Container maxW="container.xl" py={8}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={6}>
        <Heading>Funções de Usuário</Heading>
        <Button leftIcon={<UserPlus size={20} />} onClick={onOpen}>
          Atribuir Função
        </Button>
      </Box>
      
      <Box bg="white" borderRadius="lg" boxShadow="sm">
        <Table>
          <Thead>
            <Tr>
              <Th>Usuário</Th>
              <Th>Função</Th>
              <Th>Permissões</Th>
            </Tr>
          </Thead>
          <Tbody>
            {loading ? (
              <Tr>
                <Td colSpan={3} textAlign="center" py={8}>
                  Carregando...
                </Td>
              </Tr>
            ) : userRoles.length === 0 ? (
              <Tr>
                <Td colSpan={3} textAlign="center" py={8}>
                  Nenhuma função atribuída
                </Td>
              </Tr>
            ) : (
              userRoles.map((userRole) => (
                <Tr key={userRole.id}>
                  <Td>{userRole.users.email}</Td>
                  <Td>{ROLES[userRole.role]}</Td>
                  <Td>
                    <Stack direction="row" flexWrap="wrap" gap={2}>
                      {userRole.permissions.map((permission) => (
                        <Box
                          key={permission}
                          px={2}
                          py={1}
                          bg="gray.100"
                          borderRadius="md"
                          fontSize="sm"
                        >
                          {PERMISSIONS[permission]}
                        </Box>
                      ))}
                    </Stack>
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </Box>

      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Atribuir Função</ModalHeader>
          <ModalCloseButton />
          
          <ModalBody>
            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Usuário</FormLabel>
                <Select
                  placeholder="Selecione um usuário"
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                >
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.email}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Função</FormLabel>
                <Select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as keyof typeof ROLES)}
                >
                  {Object.entries(ROLES).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Permissões</FormLabel>
                <Stack spacing={2}>
                  {Object.entries(PERMISSIONS).map(([value, label]) => (
                    <Checkbox
                      key={value}
                      isChecked={selectedPermissions.includes(value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPermissions([...selectedPermissions, value])
                        } else {
                          setSelectedPermissions(selectedPermissions.filter(p => p !== value))
                        }
                      }}
                      isDisabled={selectedRole === 'admin'}
                    >
                      {label}
                    </Checkbox>
                  ))}
                </Stack>
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
              Salvar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  )
}