import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  Stack,
  Badge,
  useToast,
  Grid,
  Image,
  Card,
  CardBody,
  Divider,
  List,
  ListItem,
  ListIcon,
  Icon,
} from '@chakra-ui/react'
import { CheckCircle, Package, Clock, Shield } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { CheckoutLayout } from '../components/layouts/CheckoutLayout'

type Product = {
  id: string
  name: string
  description: string
  price: number
  image_url: string
  type: 'product' | 'service'
}

export function ProductPage() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProduct()
  }, [productId])

  async function fetchProduct() {
    if (!productId) {
      navigate('/')
      return
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select()
        .eq('id', productId)
        .eq('active', true)
        .single()

      if (error || !data) {
        throw new Error('Produto não encontrado ou indisponível')
      }

      setProduct(data)
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Falha ao carregar produto',
        status: 'error',
      })
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  if (loading || !product) {
    return null
  }

  return (
    <CheckoutLayout>
      <Container maxW="container.lg" py={10}>
        <Grid
          templateColumns={{ base: '1fr', lg: '3fr 2fr' }}
          gap={8}
        >
          {/* Product Image and Details */}
          <Box>
            <Card overflow="hidden" mb={6}>
              <Image
                src={product.image_url}
                alt={product.name}
                height="400px"
                objectFit="cover"
              />
              <CardBody>
                <Stack spacing={4}>
                  <Box>
                    <Badge
                      colorScheme={product.type === 'product' ? 'blue' : 'purple'}
                      mb={2}
                    >
                      {product.type === 'product' ? 'Produto' : 'Serviço'}
                    </Badge>
                    <Heading size="lg">{product.name}</Heading>
                    <Text fontSize="2xl" fontWeight="bold" color="brand.500" mt={2}>
                      R$ {product.price.toFixed(2)}
                    </Text>
                  </Box>

                  <Divider />

                  <Text color="gray.600">
                    {product.description}
                  </Text>
                </Stack>
              </CardBody>
            </Card>

            {/* Features/Benefits */}
            <Card>
              <CardBody>
                <Heading size="md" mb={4}>Benefícios</Heading>
                <List spacing={3}>
                  <ListItem display="flex" alignItems="center">
                    <ListIcon as={Clock} color="brand.500" />
                    Acesso imediato após confirmação do pagamento
                  </ListItem>
                  <ListItem display="flex" alignItems="center">
                    <ListIcon as={Shield} color="brand.500" />
                    Pagamento 100% seguro via Pix
                  </ListItem>
                  <ListItem display="flex" alignItems="center">
                    <ListIcon as={Package} color="brand.500" />
                    Suporte prioritário
                  </ListItem>
                  <ListItem display="flex" alignItems="center">
                    <ListIcon as={CheckCircle} color="brand.500" />
                    Garantia de satisfação
                  </ListItem>
                </List>
              </CardBody>
            </Card>
          </Box>

          {/* Checkout Card */}
          <Box>
            <Card position="sticky" top="100px">
              <CardBody>
                <Stack spacing={6}>
                  <Box>
                    <Text fontSize="sm" color="gray.600" mb={1}>
                      Valor Total:
                    </Text>
                    <Text fontSize="3xl" fontWeight="bold" color="brand.500">
                      R$ {product.price.toFixed(2)}
                    </Text>
                  </Box>

                  <Divider />

                  <Stack spacing={4}>
                    <Button
                      size="lg"
                      colorScheme="brand"
                      onClick={() => navigate(`/checkout/${productId}`)}
                      leftIcon={<Icon as={Package} />}
                    >
                      Comprar Agora
                    </Button>

                    <Text fontSize="sm" color="gray.600" textAlign="center">
                      Pagamento rápido e seguro via Pix
                    </Text>
                  </Stack>

                  {/* Trust Indicators */}
                  <Stack spacing={3} pt={4}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Icon as={Shield} color="green.500" />
                      <Text fontSize="sm">Pagamento Seguro</Text>
                    </Box>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Icon as={Clock} color="green.500" />
                      <Text fontSize="sm">Acesso Imediato</Text>
                    </Box>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Icon as={CheckCircle} color="green.500" />
                      <Text fontSize="sm">Garantia de Satisfação</Text>
                    </Box>
                  </Stack>
                </Stack>
              </CardBody>
            </Card>
          </Box>
        </Grid>
      </Container>
    </CheckoutLayout>
  )
}