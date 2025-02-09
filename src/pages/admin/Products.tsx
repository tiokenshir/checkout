import { useState, useEffect } from 'react'
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Grid,
  Heading,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Stack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useDisclosure,
  useToast,
  Image,
} from '@chakra-ui/react'
import { Plus, Pencil, Link as LinkIcon } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { FileUpload } from '../../components/FileUpload'

type Product = {
  id: string
  name: string
  description: string
  price: number
  image_url: string
  type: 'product' | 'service'
  active: boolean
}

export function AdminProducts() {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const toast = useToast()
  
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [productInput, setProductInput] = useState<Omit<Product, 'id'>>({
    name: '',
    description: '',
    price: 0,
    type: 'product',
    image_url: '',
    active: true,
  })

  useEffect(() => {
    fetchProducts()
  }, [])

  async function fetchProducts() {
    const { data, error } = await supabase
      .from('products')
      .select()
      .order('created_at', { ascending: false })

    if (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao carregar produtos',
        status: 'error',
      })
      return
    }

    setProducts(data)
  }

  function handleEdit(product: Product) {
    setSelectedProduct(product)
    setProductInput(product)
    onOpen()
  }

  function handleNew() {
    setSelectedProduct(null)
    setProductInput({
      name: '',
      description: '',
      price: 0,
      type: 'product',
      image_url: '',
      active: true,
    })
    onOpen()
  }

  function handlePriceChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    // Remove non-numeric characters except decimal point
    const cleanValue = value.replace(/[^\d.]/g, '')
    // Ensure only one decimal point
    const parts = cleanValue.split('.')
    const formattedValue = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleanValue
    // Convert to number with 2 decimal places
    const numericValue = parseFloat(formattedValue) || 0
    setProductInput({ ...productInput, price: Number(numericValue.toFixed(2)) })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      if (selectedProduct) {
        const { error } = await supabase
          .from('products')
          .update(productInput)
          .eq('id', selectedProduct.id)

        if (error) throw error

        toast({
          title: 'Sucesso',
          description: 'Produto atualizado',
          status: 'success',
        })
      } else {
        const { error } = await supabase
          .from('products')
          .insert(productInput)

        if (error) throw error

        toast({
          title: 'Sucesso',
          description: 'Produto criado',
          status: 'success',
        })
      }

      onClose()
      fetchProducts()
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Falha ao salvar produto',
        status: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  function copyCheckoutLink(productId: string) {
    const url = `${window.location.origin}/checkout/${productId}`
    navigator.clipboard.writeText(url)
    toast({
      title: 'Link copiado!',
      status: 'success',
      duration: 2000,
    })
  }

  function handleImageUpload(url: string) {
    setProductInput(prev => ({ ...prev, image_url: url }))
  }

  return (
    <Container maxW="container.xl" py={8}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={6}>
        <Heading>Produtos</Heading>
        <Button leftIcon={<Plus size={20} />} onClick={handleNew}>
          Adicionar Produto
        </Button>
      </Box>
      
      <Box bg="white" borderRadius="lg" boxShadow="sm">
        <Table>
          <Thead>
            <Tr>
              <Th>Imagem</Th>
              <Th>Nome</Th>
              <Th>Tipo</Th>
              <Th isNumeric>Preço</Th>
              <Th>Status</Th>
              <Th>Ações</Th>
            </Tr>
          </Thead>
          <Tbody>
            {products.length === 0 ? (
              <Tr>
                <Td colSpan={6} textAlign="center" py={8}>
                  Nenhum produto encontrado
                </Td>
              </Tr>
            ) : (
              products.map((product) => (
                <Tr key={product.id}>
                  <Td>
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      boxSize="50px"
                      objectFit="cover"
                      borderRadius="md"
                    />
                  </Td>
                  <Td>{product.name}</Td>
                  <Td>{product.type === 'product' ? 'Produto' : 'Serviço'}</Td>
                  <Td isNumeric>R$ {product.price.toFixed(2)}</Td>
                  <Td>{product.active ? 'Ativo' : 'Inativo'}</Td>
                  <Td>
                    <Grid templateColumns="repeat(2, auto)" gap={2}>
                      <Button
                        size="sm"
                        leftIcon={<Pencil size={16} />}
                        onClick={() => handleEdit(product)}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        leftIcon={<LinkIcon size={16} />}
                        onClick={() => copyCheckoutLink(product.id)}
                      >
                        Link
                      </Button>
                    </Grid>
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </Box>

      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent as="form" onSubmit={handleSubmit}>
          <ModalHeader>
            {selectedProduct ? 'Editar Produto' : 'Novo Produto'}
          </ModalHeader>
          <ModalCloseButton />
          
          <ModalBody>
            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Nome</FormLabel>
                <Input
                  value={productInput.name}
                  onChange={(e) => setProductInput({ ...productInput, name: e.target.value })}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Descrição</FormLabel>
                <Input
                  value={productInput.description}
                  onChange={(e) => setProductInput({ ...productInput, description: e.target.value })}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Preço</FormLabel>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={productInput.price}
                  onChange={handlePriceChange}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Tipo</FormLabel>
                <Select
                  value={productInput.type}
                  onChange={(e) => setProductInput({ ...productInput, type: e.target.value as 'product' | 'service' })}
                >
                  <option value="product">Produto</option>
                  <option value="service">Serviço</option>
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Imagem</FormLabel>
                {productInput.image_url && (
                  <Box mb={4}>
                    <Image
                      src={productInput.image_url}
                      alt="Preview"
                      maxH="200px"
                      borderRadius="md"
                    />
                  </Box>
                )}
                <FileUpload
                  bucket="products"
                  accept="image/*"
                  maxSize={2 * 1024 * 1024} // 2MB
                  onUploadComplete={handleImageUpload}
                  metadata={{
                    relatedType: 'products',
                    relatedId: selectedProduct?.id,
                  }}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Status</FormLabel>
                <Select
                  value={productInput.active ? 'true' : 'false'}
                  onChange={(e) => setProductInput({ ...productInput, active: e.target.value === 'true' })}
                >
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </Select>
              </FormControl>
            </Stack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={loading}>
              Salvar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  )
}