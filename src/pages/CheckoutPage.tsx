import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  Stack,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  useToast,
  Stepper,
  Step,
  StepIndicator,
  StepStatus,
  StepIcon,
  StepNumber,
  StepTitle,
  StepDescription,
  StepSeparator,
  useSteps,
  Image,
  Grid,
  Card,
  CardBody,
  Divider,
  InputGroup,
  InputRightElement,
  IconButton,
  Alert,
  AlertIcon,
  Flex,
} from '@chakra-ui/react'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { CheckoutLayout } from '../components/layouts/CheckoutLayout'
import { PaymentQRCode } from '../components/PaymentQRCode'
import { PaymentSimulator } from '../components/PaymentSimulator'
import { validateDocument, formatDocument, formatPhone, validatePhone, validateEmail, checkRateLimit, detectFraud } from '../utils/validations'
import { validateCoupon, recordCouponUse } from '../utils/security'

type Product = {
  id: string
  name: string
  description: string
  price: number
  image_url: string
  type: 'product' | 'service'
}

type CustomerData = {
  name: string
  email: string
  document: string
  phone: string
}

type FormErrors = {
  name?: string
  email?: string
  document?: string
  phone?: string
}

const steps = [
  { title: 'Produto', description: 'Detalhes do produto' },
  { title: 'Dados Pessoais', description: 'Suas informações' },
  { title: 'Revisão', description: 'Confirme seus dados' },
  { title: 'Pagamento', description: 'Pague via Pix' },
]

export function CheckoutPage() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const { activeStep, setActiveStep } = useSteps({
    index: 0,
    count: steps.length,
  })
  const toast = useToast()

  const [product, setProduct] = useState<Product | null>(null)
  const [customerData, setCustomerData] = useState<CustomerData>({
    name: '',
    email: '',
    document: '',
    phone: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [order, setOrder] = useState<any>(null)
  const [couponCode, setCouponCode] = useState('')
  const [couponError, setCouponError] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: string
    discountAmount: number
  } | null>(null)
  const [finalAmount, setFinalAmount] = useState(0)

  useEffect(() => {
    fetchProduct()
  }, [productId])

  useEffect(() => {
    if (product) {
      setFinalAmount(appliedCoupon 
        ? product.price - appliedCoupon.discountAmount
        : product.price
      )
    }
  }, [product, appliedCoupon])

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
    }
  }

  function validateStep(): boolean {
    const newErrors: FormErrors = {}

    switch (activeStep) {
      case 0:
        if (!product) {
          toast({
            title: 'Erro',
            description: 'Produto não encontrado',
            status: 'error',
          })
          return false
        }
        return true

      case 1:
        if (!customerData.name.trim()) {
          newErrors.name = 'Nome é obrigatório'
        }

        if (!customerData.email.trim()) {
          newErrors.email = 'Email é obrigatório'
        } else if (!validateEmail(customerData.email)) {
          newErrors.email = 'Email inválido'
        }

        if (!customerData.document.trim()) {
          newErrors.document = 'CPF/CNPJ é obrigatório'
        } else if (!validateDocument(customerData.document)) {
          newErrors.document = 'CPF/CNPJ inválido'
        }

        if (!customerData.phone.trim()) {
          newErrors.phone = 'Telefone é obrigatório'
        } else if (!validatePhone(customerData.phone)) {
          newErrors.phone = 'Telefone inválido'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0

      default:
        return true
    }
  }

  function nextStep() {
    if (validateStep()) {
      setActiveStep(activeStep + 1)
    }
  }

  async function handleApplyCoupon() {
    if (!couponCode.trim() || !product) return

    try {
      setCouponError('')
      const result = await validateCoupon(
        couponCode,
        product.price,
        product.id
      )

      setAppliedCoupon(result)
      toast({
        title: 'Cupom aplicado!',
        description: `Desconto de R$ ${result.discountAmount.toFixed(2)}`,
        status: 'success',
      })
    } catch (error) {
      setCouponError(error instanceof Error ? error.message : 'Cupom inválido')
      setAppliedCoupon(null)
    }
  }

  function removeCoupon() {
    setCouponCode('')
    setCouponError('')
    setAppliedCoupon(null)
  }

  async function createOrder() {
    if (!product || !validateStep()) return

    setLoading(true)

    try {
      // Validar rate limit
      const ipAddress = window.location.hostname
      if (!checkRateLimit(`${ipAddress}_order`, 5, 60 * 1000)) {
        throw new Error('Muitas tentativas. Por favor, aguarde alguns minutos.')
      }

      // Verificar fraude
      const fraudCheck = detectFraud({
        email: customerData.email,
        document: customerData.document,
        ip: ipAddress,
        userAgent: navigator.userAgent,
      })

      if (fraudCheck.isSuspicious) {
        throw new Error(`Não foi possível processar o pedido: ${fraudCheck.reason}`)
      }

      // Check if customer already exists
      const { data: existingCustomer, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('email', customerData.email)
        .single()

      let customerId: string

      if (existingCustomer) {
        // Update existing customer
        const { error: updateError } = await supabase
          .from('customers')
          .update({
            name: customerData.name,
            phone: customerData.phone,
            cpf: customerData.document,
          })
          .eq('id', existingCustomer.id)

        if (updateError) throw updateError
        customerId = existingCustomer.id
      } else {
        // Create new customer
        const { data: newCustomer, error: createError } = await supabase
          .from('customers')
          .insert({
            name: customerData.name,
            email: customerData.email,
            cpf: customerData.document,
            phone: customerData.phone,
          })
          .select()
          .single()

        if (createError) throw createError
        customerId = newCustomer.id
      }

      // Generate payment QR Code
      const { data: payment, error: paymentError } = await supabase.functions.invoke('generate-payment', {
        body: {
          amount: finalAmount,
          description: product.name,
          customer: {
            name: customerData.name,
            email: customerData.email,
            document: customerData.document,
          },
        },
      })

      if (paymentError) throw paymentError

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: customerId,
          product_id: product.id,
          total_amount: finalAmount,
          payment_qr_code: payment.qrCode,
          payment_code: payment.paymentCode,
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          coupon_id: appliedCoupon?.id,
          discount_amount: appliedCoupon?.discountAmount || 0,
        })
        .select()
        .single()

      if (orderError) throw orderError

      if (appliedCoupon) {
        await recordCouponUse(appliedCoupon.id, order.id)
      }

      setOrder(order)
      setActiveStep(3)
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Falha ao criar pedido',
        status: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  function handlePaymentSuccess() {
    navigate(`/success/${order?.id}`)
  }

  function handlePaymentExpired() {
    navigate('/expired')
  }

  function renderStepContent() {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Box mb={6} position="relative" borderRadius="lg" overflow="hidden">
              <Image
                src={product?.image_url}
                alt={product?.name}
                width="100%"
                height="300px"
                objectFit="cover"
              />
            </Box>
            
            <Heading size="md" mb={4}>
              {product?.name}
            </Heading>
            <Text mb={4}>{product?.description}</Text>
            <Text fontSize="2xl" fontWeight="bold" color="brand.500">
              R$ {product?.price.toFixed(2)}
            </Text>
            <Button
              mt={4}
              size="lg"
              width="full"
              onClick={nextStep}
            >
              Continuar
            </Button>
          </Box>
        )

      case 1:
        return (
          <Stack spacing={4}>
            <FormControl isRequired isInvalid={!!errors.name}>
              <FormLabel>Nome Completo</FormLabel>
              <Input
                value={customerData.name}
                onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
              />
              <FormErrorMessage>{errors.name}</FormErrorMessage>
            </FormControl>

            <FormControl isRequired isInvalid={!!errors.email}>
              <FormLabel>Email</FormLabel>
              <Input
                type="email"
                value={customerData.email}
                onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
              />
              <FormErrorMessage>{errors.email}</FormErrorMessage>
            </FormControl>

            <FormControl isRequired isInvalid={!!errors.document}>
              <FormLabel>CPF/CNPJ</FormLabel>
              <Input
                value={customerData.document}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '')
                  setCustomerData({ ...customerData, document: formatDocument(value) })
                }}
                maxLength={18}
              />
              <FormErrorMessage>{errors.document}</FormErrorMessage>
            </FormControl>

            <FormControl isRequired isInvalid={!!errors.phone}>
              <FormLabel>Telefone</FormLabel>
              <Input
                value={customerData.phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '')
                  setCustomerData({ ...customerData, phone: formatPhone(value) })
                }}
                maxLength={15}
              />
              <FormErrorMessage>{errors.phone}</FormErrorMessage>
            </FormControl>

            <Button
              size="lg"
              width="full"
              onClick={nextStep}
            >
              Continuar
            </Button>
          </Stack>
        )

      case 2:
        return (
          <Stack spacing={6}>
            <Box>
              <Heading size="sm" mb={2}>Produto</Heading>
              <Text>{product?.name}</Text>
              <Text fontWeight="bold" color="brand.500">
                R$ {product?.price.toFixed(2)}
              </Text>
            </Box>

            <Box>
              <Heading size="sm" mb={2}>Seus Dados</Heading>
              <Grid templateColumns="auto 1fr" gap={2}>
                <Text fontWeight="bold">Nome:</Text>
                <Text>{customerData.name}</Text>
                <Text fontWeight="bold">Email:</Text>
                <Text>{customerData.email}</Text>
                <Text fontWeight="bold">Documento:</Text>
                <Text>{customerData.document}</Text>
                <Text fontWeight="bold">Telefone:</Text>
                <Text>{customerData.phone}</Text>
              </Grid>
            </Box>

            <Box>
              <Heading size="sm" mb={2}>Cupom de Desconto</Heading>
              <Stack spacing={2}>
                <InputGroup>
                  <Input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Digite seu cupom"
                    isDisabled={!!appliedCoupon}
                  />
                  <InputRightElement width="4.5rem">
                    {appliedCoupon ? (
                      <IconButton
                        aria-label="Remover cupom"
                        icon={<X size={16} />}
                        size="sm"
                        onClick={removeCoupon}
                      />
                    ) : (
                      <Button
                        size="sm"
                        onClick={handleApplyCoupon}
                        isDisabled={!couponCode.trim()}
                      >
                        Aplicar
                      </Button>
                    )}
                  </InputRightElement>
                </InputGroup>
                {couponError && (
                  <Text color="red.500" fontSize="sm">
                    {couponError}
                  </Text>
                )}
                {appliedCoupon && (
                  <Alert status="success" size="sm">
                    <AlertIcon />
                    Cupom aplicado: -R$ {appliedCoupon.discountAmount.toFixed(2)}
                  </Alert>
                )}
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Stack spacing={2}>
                <Flex justify="space-between">
                  <Text>Subtotal:</Text>
                  <Text>R$ {product?.price.toFixed(2)}</Text>
                </Flex>
                {appliedCoupon && (
                  <Flex justify="space-between" color="green.500">
                    <Text>Desconto:</Text>
                    <Text>-R$ {appliedCoupon.discountAmount.toFixed(2)}</Text>
                  </Flex>
                )}
                <Flex justify="space-between" fontWeight="bold">
                  <Text>Total:</Text>
                  <Text>R$ {finalAmount.toFixed(2)}</Text>
                </Flex>
              </Stack>
            </Box>

            <Button
              size="lg"
              width="full"
              onClick={createOrder}
              isLoading={loading}
            >
              Confirmar e Pagar
            </Button>
          </Stack>
        )

      case 3:
        if (!order) return null

        return (
          <Stack spacing={6}>
            <Heading size="md" textAlign="center">
              Escaneie o QR Code para pagar
            </Heading>

            <PaymentQRCode
              orderId={order.id}
              qrCodeData={order.payment_qr_code}
              paymentCode={order.payment_code}
              expiresAt={order.expires_at}
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentExpired={handlePaymentExpired}
            />

            {process.env.NODE_ENV === 'development' && (
              <PaymentSimulator orderId={order.id} />
            )}
          </Stack>
        )

      default:
        return null
    }
  }

  return (
    <CheckoutLayout>
      <Container maxW="container.lg" py={10}>
        <Heading mb={8} textAlign="center">Checkout</Heading>
        
        <Stepper index={activeStep} mb={8}>
          {steps.map((step, index) => (
            <Step key={index}>
              <StepIndicator>
                <StepStatus
                  complete={<StepIcon />}
                  incomplete={<StepNumber />}
                  active={<StepNumber />}
                />
              </StepIndicator>

              <Box flexShrink='0'>
                <StepTitle>{step.title}</StepTitle>
                <StepDescription>{step.description}</StepDescription>
              </Box>

              <StepSeparator />
            </Step>
          ))}
        </Stepper>
        
        <Card>
          <CardBody>
            {renderStepContent()}
          </CardBody>
        </Card>
      </Container>
    </CheckoutLayout>
  )
}