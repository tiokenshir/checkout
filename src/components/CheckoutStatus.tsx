import { Box, Text, Progress, HStack, Icon, useColorModeValue } from '@chakra-ui/react'
import { CheckCircle, Clock, AlertCircle } from 'lucide-react'

type CheckoutStatus = 'pending' | 'processing' | 'paid' | 'expired' | 'failed'

type CheckoutStatusProps = {
  status: CheckoutStatus
  expiresAt?: string
}

const STATUS_CONFIG = {
  pending: {
    color: 'yellow',
    icon: Clock,
    label: 'Aguardando Pagamento',
    progress: 33,
  },
  processing: {
    color: 'blue',
    icon: Clock,
    label: 'Processando Pagamento',
    progress: 66,
  },
  paid: {
    color: 'green',
    icon: CheckCircle,
    label: 'Pagamento Confirmado',
    progress: 100,
  },
  expired: {
    color: 'red',
    icon: AlertCircle,
    label: 'Pagamento Expirado',
    progress: 100,
  },
  failed: {
    color: 'red',
    icon: AlertCircle,
    label: 'Falha no Pagamento',
    progress: 100,
  },
}

export function CheckoutStatus({ status, expiresAt }: CheckoutStatusProps) {
  const config = STATUS_CONFIG[status]
  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')

  return (
    <Box
      bg={bgColor}
      border="1px"
      borderColor={borderColor}
      borderRadius="lg"
      p={4}
    >
      <HStack spacing={4} mb={4}>
        <Icon
          as={config.icon}
          color={`${config.color}.500`}
          boxSize={6}
        />
        <Text fontWeight="medium">
          {config.label}
        </Text>
      </HStack>

      <Progress
        value={config.progress}
        colorScheme={config.color}
        size="sm"
        borderRadius="full"
        mb={2}
      />

      {expiresAt && status === 'pending' && (
        <Text fontSize="sm" color="gray.500" textAlign="center">
          Expira em {new Date(expiresAt).toLocaleTimeString()}
        </Text>
      )}
    </Box>
  )
}