import { useState } from 'react'
import {
  Box,
  Button,
  Text,
  VStack,
  useToast,
} from '@chakra-ui/react'
import { simulatePayment } from '../utils/payment'

type PaymentSimulatorProps = {
  orderId: string
}

export function PaymentSimulator({ orderId }: PaymentSimulatorProps) {
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  async function handleSimulatePayment() {
    setLoading(true)
    try {
      const success = await simulatePayment(orderId)
      
      if (success) {
        toast({
          title: 'Pagamento simulado com sucesso',
          status: 'success',
        })
      } else {
        throw new Error('Falha ao simular pagamento')
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Falha ao simular pagamento',
        status: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box p={4} bg="gray.50" borderRadius="lg">
      <VStack spacing={4}>
        <Text fontWeight="bold" color="red.500">
          Ambiente de Desenvolvimento
        </Text>
        <Button
          onClick={handleSimulatePayment}
          isLoading={loading}
          colorScheme="blue"
        >
          Simular Pagamento
        </Button>
      </VStack>
    </Box>
  )
}