import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  VStack,
  Icon,
  useToast,
} from '@chakra-ui/react'
import { CheckCircle, Download, ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { CheckoutLayout } from '../components/layouts/CheckoutLayout'
import { generateReceipt } from '../utils/pdf'

type Order = {
  id: string
  created_at: string
  total_amount: number
  status: string
  payment_method: string
  transaction_id: string
  customers: {
    name: string
    email: string
    document: string
  }
  products: {
    name: string
    type: 'product' | 'service'
  }
}

export function SuccessPage() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  useEffect(() => {
    fetchOrder()
  }, [orderId])

  async function fetchOrder() {
    if (!orderId) {
      navigate('/')
      return
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customers (*),
          products (*)
        `)
        .eq('id', orderId)
        .single()

      if (error || !data) {
        throw new Error('Pedido não encontrado')
      }

      setOrder(data)
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Pedido não encontrado',
        status: 'error',
      })
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  async function handleDownloadReceipt() {
    if (!order) return

    try {
      setDownloadingPdf(true)
      
      // Gerar PDF
      const pdfDataUri = generateReceipt(order)

      // Criar link para download
      const link = document.createElement('a')
      link.href = pdfDataUri
      link.download = `comprovante-${order.id}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: 'Sucesso',
        description: 'Comprovante baixado com sucesso',
        status: 'success',
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao gerar comprovante',
        status: 'error',
      })
    } finally {
      setDownloadingPdf(false)
    }
  }

  if (loading) {
    return null
  }

  return (
    <CheckoutLayout>
      <Container maxW="container.sm" py={10}>
        <Box
          bg="white"
          p={8}
          borderRadius="lg"
          boxShadow="sm"
          textAlign="center"
        >
          <Icon
            as={CheckCircle}
            w={16}
            h={16}
            color="green.500"
            mb={6}
          />
          
          <Heading size="lg" mb={2}>
            Pagamento Confirmado!
          </Heading>
          
          <Text color="gray.600" mb={8}>
            {order?.products.type === 'product'
              ? 'Seu pedido foi confirmado com sucesso.'
              : 'Agradecemos pela contratação do serviço.'}
          </Text>

          <VStack spacing={4}>
            <Button
              leftIcon={<Download size={20} />}
              width="full"
              onClick={handleDownloadReceipt}
              isLoading={downloadingPdf}
            >
              Baixar Comprovante
            </Button>

            <Button
              variant="ghost"
              leftIcon={<ArrowLeft size={20} />}
              width="full"
              onClick={() => navigate('/')}
            >
              Voltar ao Início
            </Button>
          </VStack>
        </Box>
      </Container>
    </CheckoutLayout>
  )
}