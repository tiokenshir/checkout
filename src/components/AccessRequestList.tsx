import { useState, useEffect } from 'react'
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Button,
  Text,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Textarea,
  useDisclosure,
} from '@chakra-ui/react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '../lib/supabase'
import { approveAccess, rejectAccess } from '../utils/driveAccess'

type AccessRequest = {
  id: string
  created_at: string
  status: 'pending' | 'approved' | 'rejected'
  order_id: string
  customer: {
    name: string
    email: string
  }
  product: {
    name: string
  }
}

export function AccessRequestList() {
  const [requests, setRequests] = useState<AccessRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const { isOpen, onOpen, onClose } = useDisclosure()
  const toast = useToast()

  useEffect(() => {
    fetchRequests()
  }, [])

  async function fetchRequests() {
    try {
      const { data, error } = await supabase
        .from('access_requests')
        .select(`
          *,
          customer:customers (
            name,
            email
          ),
          order:orders (
            product:products (
              name
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setRequests(data)
    } catch (error) {
      console.error('Error loading access requests:', error)
      toast({
        title: 'Erro',
        description: 'Falha ao carregar solicitações',
        status: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(request: AccessRequest) {
    try {
      await approveAccess(request.id)
      toast({
        title: 'Sucesso',
        description: 'Acesso aprovado com sucesso',
        status: 'success',
      })
      fetchRequests()
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao aprovar acesso',
        status: 'error',
      })
    }
  }

  async function handleReject() {
    if (!selectedRequest) return

    try {
      await rejectAccess(selectedRequest.id, rejectReason)
      toast({
        title: 'Sucesso',
        description: 'Acesso negado com sucesso',
        status: 'success',
      })
      onClose()
      fetchRequests()
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao negar acesso',
        status: 'error',
      })
    }
  }

  function openRejectModal(request: AccessRequest) {
    setSelectedRequest(request)
    setRejectReason('')
    onOpen()
  }

  return (
    <Box>
      <Table>
        <Thead>
          <Tr>
            <Th>Data</Th>
            <Th>Cliente</Th>
            <Th>Produto</Th>
            <Th>Status</Th>
            <Th>Ações</Th>
          </Tr>
        </Thead>
        <Tbody>
          {requests.map((request) => (
            <Tr key={request.id}>
              <Td>
                {format(new Date(request.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </Td>
              <Td>
                <Text fontWeight="medium">{request.customer.name}</Text>
                <Text fontSize="sm" color="gray.600">{request.customer.email}</Text>
              </Td>
              <Td>{request.product.name}</Td>
              <Td>
                <Badge
                  colorScheme={
                    request.status === 'approved' ? 'green' :
                    request.status === 'rejected' ? 'red' :
                    'yellow'
                  }
                >
                  {request.status === 'approved' ? 'Aprovado' :
                   request.status === 'rejected' ? 'Negado' :
                   'Pendente'}
                </Badge>
              </Td>
              <Td>
                {request.status === 'pending' && (
                  <>
                    <Button
                      size="sm"
                      colorScheme="green"
                      mr={2}
                      onClick={() => handleApprove(request)}
                    >
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      colorScheme="red"
                      onClick={() => openRejectModal(request)}
                    >
                      Negar
                    </Button>
                  </>
                )}
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Negar Acesso</ModalHeader>
          <ModalBody>
            <FormControl>
              <FormLabel>Motivo</FormLabel>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Informe o motivo da negação"
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancelar
            </Button>
            <Button
              colorScheme="red"
              onClick={handleReject}
              isDisabled={!rejectReason.trim()}
            >
              Confirmar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  )
}