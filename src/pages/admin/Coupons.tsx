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
  useDisclosure,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Switch,
  Card,
  CardBody,
} from '@chakra-ui/react'
import { Plus, MoreVertical, Copy, Archive } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'

type Coupon = {
  id: string
  code: string
  type: 'percentage' | 'fixed'
  value: number
  starts_at: string
  expires_at: string | null
  max_uses: number | null
  current_uses: number
  min_purchase_amount: number | null
  product_id: string | null
  active: boolean
  created_at: string
  products?: {
    name: string
  }
}

export function Coupons() {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    type: 'percentage',
    value: 0,
    starts_at: new Date().toISOString().split('T')[0],
    expires_at: '',
    max_uses: null as number | null,
    min_purchase_amount: null as number | null,
    product_id: null as string | null,
    active: true,
  })
  const toast = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      // Buscar cupons
      const { data: couponsData, error: couponsError } = await supabase
        .from('coupons')
        .select(`
          *,
          products (
            name
          )
        `)
        .order('created_at', { ascending: false })

      if (couponsError) throw couponsError
      setCoupons(couponsData)

      // Buscar produtos
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name')
        .eq('active', true)
        .order('name')

      if (productsError) throw productsError
      setProducts(productsData)
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
    if (!newCoupon.code) {
      toast({
        title: 'Erro',
        description: 'Código do cupom é obrigatório',
        status: 'error',
      })
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('coupons')
        .insert({
          ...newCoupon,
          created_by: supabase.auth.user()?.id,
        })

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: 'Cupom criado com sucesso',
        status: 'success',
      })

      onClose()
      fetchData()
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Falha ao criar cupom',
        status: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  async function toggleCoupon(id: string, active: boolean) {
    try {
      const { error } = await supabase
        .from('coupons')
        .update({ active: !active })
        .eq('id', id)

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: `Cupom ${active ? 'desativado' : 'ativado'}`,
        status: 'success',
      })

      fetchData()
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar cupom',
        status: 'error',
      })
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
    toast({
      title: 'Código copiado!',
      status: 'success',
      duration: 2000,
    })
  }

  return (
    <Container maxW="container.xl" py={8}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={6}>
        <Heading size="lg">Cupons de Desconto</Heading>
        <Button leftIcon={<Plus size={20} />} onClick={onOpen}>
          Novo Cupom
        </Button>
      </Box>

      <Card>
        <CardBody>
          <Table>
            <Thead>
              <Tr>
                <Th>Código</Th>
                <Th>Tipo</Th>
                <Th>Valor</Th>
                <Th>Usos</Th>
                <Th>Validade</Th>
                <Th>Status</Th>
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
              ) : coupons.length === 0 ? (
                <Tr>
                  <Td colSpan={7} textAlign="center" py={8}>
                    Nenhum cupom encontrado
                  </Td>
                </Tr>
              ) : (
                coupons.map((coupon) => (
                  <Tr key={coupon.id}>
                    <Td>
                      <Text fontWeight="medium">{coupon.code}</Text>
                      {coupon.product_id && (
                        <Text fontSize="sm" color="gray.600">
                          {coupon.products?.name}
                        </Text>
                      )}
                    </Td>
                    <Td>
                      {coupon.type === 'percentage' ? 'Porcentagem' : 'Valor Fixo'}
                    </Td>
                    <Td>
                      {coupon.type === 'percentage'
                        ? `${coupon.value}%`
                        : `R$ ${coupon.value.toFixed(2)}`}
                    </Td>
                    <Td>
                      {coupon.max_uses
                        ? `${coupon.current_uses}/${coupon.max_uses}`
                        : coupon.current_uses}
                    </Td>
                    <Td>
                      {coupon.expires_at
                        ? format(new Date(coupon.expires_at), 'dd/MM/yyyy', { locale: ptBR })
                        : 'Sem validade'}
                    </Td>
                    <Td>
                      <Badge
                        colorScheme={
                          !coupon.active ? 'gray' :
                          coupon.expires_at && new Date(coupon.expires_at) < new Date() ? 'red' :
                          coupon.max_uses && coupon.current_uses >= coupon.max_uses ? 'yellow' :
                          'green'
                        }
                      >
                        {!coupon.active ? 'Inativo' :
                         coupon.expires_at && new Date(coupon.expires_at) < new Date() ? 'Expirado' :
                         coupon.max_uses && coupon.current_uses >= coupon.max_uses ? 'Esgotado' :
                         'Ativo'}
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
                            icon={<Copy size={16} />}
                            onClick={() => copyCode(coupon.code)}
                          >
                            Copiar Código
                          </MenuItem>
                          <MenuItem
                            icon={<Archive size={16} />}
                            onClick={() => toggleCoupon(coupon.id, coupon.active)}
                          >
                            {coupon.active ? 'Desativar' : 'Ativar'}
                          </MenuItem>
                        </MenuList>
                      </Menu>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </CardBody>
      </Card>

      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Novo Cupom</ModalHeader>
          <ModalBody>
            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Código</FormLabel>
                <Input
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon({
                    ...newCoupon,
                    code: e.target.value.toUpperCase(),
                  })}
                  placeholder="Ex: DESCONTO20"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Tipo de Desconto</FormLabel>
                <Select
                  value={newCoupon.type}
                  onChange={(e) => setNewCoupon({
                    ...newCoupon,
                    type: e.target.value as 'percentage' | 'fixed',
                  })}
                >
                  <option value="percentage">Porcentagem</option>
                  <option value="fixed">Valor Fixo</option>
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>
                  {newCoupon.type === 'percentage' ? 'Porcentagem' : 'Valor'}
                </FormLabel>
                <NumberInput
                  value={newCoupon.value}
                  onChange={(value) => setNewCoupon({
                    ...newCoupon,
                    value: Number(value),
                  })}
                  min={0}
                  max={newCoupon.type === 'percentage' ? 100 : undefined}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>

              <FormControl>
                <FormLabel>Data de Expiração</FormLabel>
                <Input
                  type="date"
                  value={newCoupon.expires_at}
                  onChange={(e) => setNewCoupon({
                    ...newCoupon,
                    expires_at: e.target.value,
                  })}
                  min={new Date().toISOString().split('T')[0]}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Limite de Usos</FormLabel>
                <NumberInput
                  value={newCoupon.max_uses ?? ''}
                  onChange={(value) => setNewCoupon({
                    ...newCoupon,
                    max_uses: value ? Number(value) : null,
                  })}
                  min={1}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>

              <FormControl>
                <FormLabel>Valor Mínimo da Compra</FormLabel>
                <NumberInput
                  value={newCoupon.min_purchase_amount ?? ''}
                  onChange={(value) => setNewCoupon({
                    ...newCoupon,
                    min_purchase_amount: value ? Number(value) : null,
                  })}
                  min={0}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>

              <FormControl>
                <FormLabel>Produto Específico</FormLabel>
                <Select
                  value={newCoupon.product_id ?? ''}
                  onChange={(e) => setNewCoupon({
                    ...newCoupon,
                    product_id: e.target.value || null,
                  })}
                >
                  <option value="">Todos os produtos</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0}>Ativo</FormLabel>
                <Switch
                  isChecked={newCoupon.active}
                  onChange={(e) => setNewCoupon({
                    ...newCoupon,
                    active: e.target.checked,
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
              onClick={handleSubmit}
              isLoading={loading}
            >
              Criar Cupom
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  )
}