import { useState, useEffect } from 'react'
import {
  Box,
  VStack,
  Text,
  Button,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Progress,
  Badge,
  Card,
  CardBody,
  Divider,
} from '@chakra-ui/react'
import { QRCodeSVG } from 'qrcode.react'
import { Copy, RefreshCw } from 'lucide-react'
import { checkPaymentStatus } from '../utils/payment'
import { CountdownTimer } from './CountdownTimer'

type PaymentQRCodeProps = {
  orderId: string
  qrCodeData: string
  paymentCode: string
  expiresAt: string
  onPaymentSuccess?: () => void
  onPaymentExpired?: () => void
}

export function PaymentQRCode({
  orderId,
  qrCodeData,
  paymentCode,
  expiresAt,
  onPaymentSuccess,
  onPaymentExpired,
}: PaymentQRCodeProps) {
  const [status, setStatus] = useState<'pending' | 'paid' | 'expired'>('pending')
  const [loading, setLoading] = useState(false)
  const [checkCount, setCheckCount] = useState(0)
  const toast = useToast()

  useEffect(() => {
    const checkStatus = async () => {
      setLoading(true)
      try {
        const currentStatus = await checkPaymentStatus(orderId)
        setStatus(currentStatus)

        if (currentStatus === 'paid') {
          onPaymentSuccess?.()
        } else if (currentStatus === 'expired') {
          onPaymentExpired?.()
        }
      } catch (error) {
        console.error('Error checking payment status:', error)
      } finally {
        setLoading(false)
        setCheckCount(prev => prev + 1)
      }
    }

    // Verificar status inicial
    checkStatus()

    // Verificar status a cada 5 segundos
    const interval = setInterval(checkStatus, 5000)

    return () => clearInterval(interval)
  }, [orderId])

  function copyToClipboard() {
    navigator.clipboard.writeText(paymentCode)
    toast({
      title: 'Código copiado!',
      status: 'success',
      duration: 2000,
    })
  }

  if (status === 'paid') {
    return (
      <Alert
        status="success"
        variant="subtle"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        textAlign="center"
        height="200px"
        borderRadius="lg"
      >
        <AlertIcon boxSize="40px" mr={0} />
        <AlertTitle mt={4} mb={1} fontSize="lg">
          Pagamento Confirmado!
        </AlertTitle>
        <AlertDescription maxWidth="sm">
          Seu pagamento foi confirmado com sucesso. Você será redirecionado em instantes...
        </AlertDescription>
      </Alert>
    )
  }

  if (status === 'expired') {
    return (
      <Alert
        status="error"
        variant="subtle"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        textAlign="center"
        height="200px"
        borderRadius="lg"
      >
        <AlertIcon boxSize="40px" mr={0} />
        <AlertTitle mt={4} mb={1} fontSize="lg">
          Pagamento Expirado
        </AlertTitle>
        <AlertDescription maxWidth="sm">
          O tempo para pagamento expirou. Por favor, gere um novo QR Code para continuar.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <VStack spacing={6} align="center" w="full">
      {/* Timer */}
      <Box textAlign="center">
        <CountdownTimer
          expiresAt={expiresAt}
          onExpire={onPaymentExpired}
        />
        <Text fontSize="sm" color="gray.600" mt={1}>
          Após este período, o QR Code será invalidado
        </Text>
      </Box>

      {/* QR Code */}
      <Card w="full">
        <CardBody>
          <VStack spacing={4}>
            <Box
              p={6}
              bg="gray.50"
              borderRadius="lg"
              position="relative"
            >
              <QRCodeSVG
                value={qrCodeData}
                size={200}
                level="H"
                includeMargin
              />
              {loading && (
                <Box
                  position="absolute"
                  top={0}
                  left={0}
                  right={0}
                  bottom={0}
                  bg="blackAlpha.50"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  borderRadius="lg"
                >
                  <Spinner color="brand.500" />
                </Box>
              )}
            </Box>

            <Divider />

            {/* Código PIX */}
            <Box w="full">
              <Text fontWeight="bold" mb={2}>Código PIX:</Text>
              <Box
                p={3}
                bg="gray.50"
                borderRadius="md"
                display="flex"
                alignItems="center"
                gap={4}
              >
                <Text
                  fontFamily="mono"
                  fontSize="sm"
                  flex={1}
                  overflow="hidden"
                  textOverflow="ellipsis"
                  whiteSpace="nowrap"
                >
                  {paymentCode}
                </Text>
                <Button
                  size="sm"
                  leftIcon={<Copy size={16} />}
                  onClick={copyToClipboard}
                  variant="ghost"
                >
                  Copiar
                </Button>
              </Box>
            </Box>
          </VStack>
        </CardBody>
      </Card>

      {/* Status */}
      <Box w="full">
        <Progress
          value={(checkCount % 20) * 5}
          size="xs"
          colorScheme="brand"
          isIndeterminate={loading}
          mb={2}
        />
        <Text fontSize="sm" color="gray.600" textAlign="center">
          Aguardando pagamento...
        </Text>
      </Box>

      {/* Ajuda */}
      <Alert status="info" borderRadius="lg">
        <AlertIcon />
        <Box>
          <AlertTitle>Como pagar?</AlertTitle>
          <AlertDescription>
            1. Abra o app do seu banco<br />
            2. Escolha pagar via PIX<br />
            3. Escaneie o QR Code ou cole o código
          </AlertDescription>
        </Box>
      </Alert>
    </VStack>
  )
}