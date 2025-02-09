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
  Tooltip,
} from '@chakra-ui/react'
import { Plus, Copy, ExternalLink, MoreVertical } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'

type PaymentLink = {
  id: string
  created_at: string
  product_id: string
  status: 'active' | 'expired' | 'used'
  url_token: string
  products: {
    name: string
    price: number
  }
}

export function PaymentLinks() {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [products, setProducts] = useState<any[]>([])
  const [links, setLinks] = useState<PaymentLink[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState('')
  const toast = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      // Buscar produtos
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select()
        .eq('active', true)
        .order('name')

      if (productsError) throw productsError
      setProducts(productsData)

      // Buscar links
      const { data: linksData, error: linksError } = await supabase
        .from('payment_links')
        .select(`
          *,
          products (
            name,
            price
          )
        `)
        .order('created_at', { ascending: false })

      if (linksError) throw linksError
      setLinks(linksData)
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
    if (!selectedProduct) {
      toast({
        title: 'Erro',
        description: 'Selecione um produto',
        status: 'error',
      })
      return
    }

    setLoading(true)
    try {
      // Gerar token único
      const urlToken = crypto.randomUUID()

      // Criar link
      const { error } = await supabase
        .from('payment_links')
        .insert({
          product_id: selectedProduct,
          url_token: urlToken,
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutos
          created_by: supabase.auth.user()?.id,
        })

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: 'Link de pagamento criado',
        status: 'success',
      })

      onClose()
      fetchData()
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Falha ao criar link',
        status: 'error',
      })
    } finally {
      setLoading(false)
      setSelectedProduct('')
    }
  }

  function copyLink(urlToken: string) {
    const url = `${window.location.origin}/p/${urlToken}`
    navigator.clipboard.writeText(url)
    toast({
      title: 'Link copiado!',
      status: 'success',
      duration: 2000,
    })
  }

  return (
    <Container maxW="container.xl" py={8}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={6}>
        <Heading>Links de Pagamento</Heading>
        <Button leftIcon={<Plus size={20} />} onClick={onOpen}>
          Novo Link
        </Button>
      </Box>

      <Box bg="white" borderRadius="lg" boxShadow="sm">
        <Table>
          <Thead>
            <Tr>
              <Th>Data</Th>
              <Th>Produto</Th>
              <Th>Status</Th>
              <Th>Ações</Th>
            </Tr>
          </Thead>
          <Tbody>
            {loading ? (
              <Tr>
                <Td colSpan={4} textAlign="center" py={8}>
                  Carregando...
                </Td>
              </Tr>
            ) : links.length === 0 ? (
              <Tr>
                <Td colSpan={4} textAlign="center" py={8}>
                  Nenhum link encontrado
                </Td>
              </Tr>
            ) : (
              links.map((link) => (
                <Tr key={link.id}>
                  <Td whiteSpace="nowrap">
                    {format(new Date(link.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </Td>
                  <Td>
                    <Text fontWeight="medium">{link.products.name}</Text>
                    <Text fontSize="sm" color="gray.600">
                      R$ {link.products.price.toFixed(2)}
                    </Text>
                  </Td>
                  <Td>
                    <Badge
                      colorScheme={
                        link.status === 'active' ? 'green' :
                        link.status === 'used' ? 'blue' :
                        'red'
                      }
                    >
                      {link.status === 'active' ? 'Ativo' :
                       link.status === 'used' ? 'Utilizado' :
                       'Expirado'}
                    </Badge>
                  </Td>
                  <Td>
                    <Stack direction="row" spacing={2}>
                      <Tooltip label="Copiar Link">
                        <IconButton
                          aria-label="Copiar Link"
                          icon={<Copy size={16} />}
                          size="sm"
                          onClick={() => copyLink(link.url_token)}
                          isDisabled={link.status !== 'active'}
                        />
                      </Tooltip>
                      <Tooltip label="Abrir Link">
                        <IconButton
                          as="a"
                          href={`/p/${link.url_token}`}
                          target="_blank"
                          aria-label="Abrir Link"
                          icon={<ExternalLink size={16} />}
                          size="sm"
                          isDisabled={link.status !== 'active'}
                        />
                      </Tooltip>
                    </Stack>
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </Box>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Novo Link de Pagamento</ModalHeader>
          
          <ModalBody>
            <FormControl isRequired>
              <FormLabel>Produto</FormLabel>
              <Select
                placeholder="Selecione um produto"
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
              >
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} - R$ {product.price.toFixed(2)}
                  </option>
                ))}
              </Select>
            </FormControl>

            <Text mt={4} fontSize="sm" color="gray.600">
              O link expirará automaticamente após 30 minutos.
            </Text>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              isLoading={loading}
            >
              Criar Link
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  )
}