import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  VStack,
  Icon,
  useColorModeValue,
} from '@chakra-ui/react'
import { XCircle, ArrowLeft, RefreshCcw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { CheckoutLayout } from '../components/layouts/CheckoutLayout'

export function ExpiredPage() {
  const navigate = useNavigate()
  const bgColor = useColorModeValue('white', 'gray.800')
  const textColor = useColorModeValue('gray.600', 'gray.300')

  return (
    <CheckoutLayout>
      <Container maxW="container.sm" py={20}>
        <Box
          bg={bgColor}
          p={12}
          borderRadius="xl"
          boxShadow="xl"
          textAlign="center"
        >
          <Icon
            as={XCircle}
            w={24}
            h={24}
            color="red.500"
            mb={8}
          />
          
          <Heading size="xl" mb={4}>
            Link Expirado
          </Heading>
          
          <Text fontSize="lg" color={textColor} mb={12}>
            Este link de pagamento já expirou ou foi utilizado.
            Por favor, solicite um novo link para continuar com a compra.
          </Text>

          <VStack spacing={4}>
            <Button
              leftIcon={<RefreshCcw size={20} />}
              size="lg"
              width="full"
              colorScheme="brand"
              onClick={() => window.location.reload()}
            >
              Tentar Novamente
            </Button>

            <Button
              variant="ghost"
              leftIcon={<ArrowLeft size={20} />}
              size="lg"
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