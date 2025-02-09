import { useState, useEffect } from 'react'
import {
  Box,
  Button,
  Text,
  VStack,
  useToast,
  Alert,
  AlertIcon,
  Spinner,
  Card,
  CardHeader,
  CardBody,
  Stack,
  Badge,
  Icon,
  Divider,
} from '@chakra-ui/react'
import { Download, Eye, FileText, Shield } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { logAccess, requestAccess } from '../utils/driveAccess'

type FileViewerProps = {
  productId: string
  orderId: string
}

export function FileViewer({ productId, orderId }: FileViewerProps) {
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [accessRequest, setAccessRequest] = useState<any>(null)
  const toast = useToast()

  useEffect(() => {
    fetchFiles()
  }, [productId])

  async function fetchFiles() {
    try {
      // Verificar solicitação de acesso
      const { data: request, error: requestError } = await supabase
        .from('access_requests')
        .select()
        .eq('order_id', orderId)
        .single()

      if (requestError && requestError.code !== 'PGRST116') throw requestError
      setAccessRequest(request)

      if (request?.status === 'approved') {
        // Buscar arquivos
        const { data: files, error: filesError } = await supabase
          .from('drive_files')
          .select()
          .eq('product_id', productId)

        if (filesError) throw filesError
        setFiles(files)
      }
    } catch (error) {
      console.error('Error loading files:', error)
      toast({
        title: 'Erro',
        description: 'Falha ao carregar arquivos',
        status: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleRequestAccess() {
    try {
      const { data: customer, error: customerError } = await supabase
        .from('orders')
        .select('customer_id')
        .eq('id', orderId)
        .single()

      if (customerError) throw customerError

      const result = await requestAccess({
        order_id: orderId,
        customer_id: customer.customer_id,
      })

      if (result.success) {
        toast({
          title: 'Sucesso',
          description: 'Solicitação enviada com sucesso',
          status: 'success',
        })
      } else {
        toast({
          title: 'Aviso',
          description: result.message,
          status: 'warning',
        })
      }

      fetchFiles()
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao solicitar acesso',
        status: 'error',
      })
    }
  }

  async function handleView(fileId: string) {
    try {
      await logAccess(accessRequest.id, fileId, 'view')
      window.open(files.find(f => f.id === fileId).web_view_link, '_blank')
    } catch (error) {
      console.error('Error viewing file:', error)
    }
  }

  async function handleDownload(fileId: string) {
    try {
      await logAccess(accessRequest.id, fileId, 'download')
      window.open(files.find(f => f.id === fileId).download_link, '_blank')
    } catch (error) {
      console.error('Error downloading file:', error)
    }
  }

  if (loading) {
    return (
      <Box textAlign="center" py={8}>
        <Spinner size="xl" color="brand.500" />
      </Box>
    )
  }

  if (!accessRequest) {
    return (
      <Card>
        <CardBody>
          <VStack spacing={6} align="center" py={8}>
            <Icon as={Shield} boxSize={12} color="brand.500" />
            <Text fontSize="lg" fontWeight="medium" textAlign="center">
              Para acessar o conteúdo, você precisa solicitar acesso.
            </Text>
            <Text color="gray.600" textAlign="center">
              Após a aprovação, você terá acesso aos arquivos por 30 dias.
            </Text>
            <Button
              leftIcon={<FileText size={20} />}
              onClick={handleRequestAccess}
              size="lg"
            >
              Solicitar Acesso
            </Button>
          </VStack>
        </CardBody>
      </Card>
    )
  }

  if (accessRequest.status === 'pending') {
    return (
      <Alert status="info">
        <AlertIcon />
        <Stack>
          <Text fontWeight="medium">Solicitação em Análise</Text>
          <Text>
            Sua solicitação de acesso está sendo analisada. 
            Você receberá uma notificação assim que for aprovada.
          </Text>
        </Stack>
      </Alert>
    )
  }

  if (accessRequest.status === 'rejected') {
    return (
      <Alert status="error">
        <AlertIcon />
        <Stack>
          <Text fontWeight="medium">Acesso Negado</Text>
          <Text>
            Sua solicitação de acesso foi negada.
            {accessRequest.metadata?.reason && (
              <Text mt={2}>Motivo: {accessRequest.metadata.reason}</Text>
            )}
          </Text>
        </Stack>
      </Alert>
    )
  }

  return (
    <VStack spacing={4} align="stretch">
      {files.map((file) => (
        <Card key={file.id}>
          <CardHeader>
            <Stack direction="row" justify="space-between" align="center">
              <Box>
                <Text fontWeight="medium">{file.name}</Text>
                <Text fontSize="sm" color="gray.600">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </Text>
              </Box>
              <Stack direction="row" spacing={2}>
                <Button
                  leftIcon={<Eye size={16} />}
                  size="sm"
                  onClick={() => handleView(file.id)}
                >
                  Visualizar
                </Button>
                <Button
                  leftIcon={<Download size={16} />}
                  size="sm"
                  onClick={() => handleDownload(file.id)}
                >
                  Download
                </Button>
              </Stack>
            </Stack>
          </CardHeader>
        </Card>
      ))}

      {files.length === 0 && (
        <Alert status="info">
          <AlertIcon />
          Nenhum arquivo disponível no momento.
        </Alert>
      )}
    </VStack>
  )
}