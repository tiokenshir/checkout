import { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Heading,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  IconButton,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  Stack,
  Switch,
  useToast,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Text,
} from '@chakra-ui/react'
import { Plus, MoreVertical, Play, Pause } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { createWorkflow } from '../../utils/automation'

type Workflow = {
  id: string
  name: string
  description: string
  trigger_type: string
  active: boolean
  created_at: string
}

export function Workflows() {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    triggerType: 'schedule',
    triggerConfig: {},
    actions: [],
  })
  const toast = useToast()

  useEffect(() => {
    fetchWorkflows()
  }, [])

  async function fetchWorkflows() {
    try {
      const { data, error } = await supabase
        .from('automation_workflows')
        .select()
        .order('created_at', { ascending: false })

      if (error) throw error
      setWorkflows(data)
    } catch (error) {
      console.error('Error loading workflows:', error)
      toast({
        title: 'Erro',
        description: 'Falha ao carregar workflows',
        status: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      await createWorkflow(newWorkflow)

      toast({
        title: 'Sucesso',
        description: 'Workflow criado com sucesso',
        status: 'success',
      })

      onClose()
      fetchWorkflows()
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao criar workflow',
        status: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  async function toggleWorkflow(id: string, active: boolean) {
    try {
      const { error } = await supabase
        .from('automation_workflows')
        .update({ active: !active })
        .eq('id', id)

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: `Workflow ${active ? 'pausado' : 'ativado'}`,
        status: 'success',
      })

      fetchWorkflows()
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar workflow',
        status: 'error',
      })
    }
  }

  return (
    <Container maxW="container.xl" py={8}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={6}>
        <Heading size="lg">Workflows</Heading>
        <Button leftIcon={<Plus size={20} />} onClick={onOpen}>
          Novo Workflow
        </Button>
      </Box>

      <Box bg="white" borderRadius="lg" boxShadow="sm">
        <Table>
          <Thead>
            <Tr>
              <Th>Nome</Th>
              <Th>Trigger</Th>
              <Th>Status</Th>
              <Th>Última Execução</Th>
              <Th>Ações</Th>
            </Tr>
          </Thead>
          <Tbody>
            {workflows.map((workflow) => (
              <Tr key={workflow.id}>
                <Td>
                  <Box>
                    <Text fontWeight="medium">{workflow.name}</Text>
                    <Text fontSize="sm" color="gray.600">
                      {workflow.description}
                    </Text>
                  </Box>
                </Td>
                <Td>{workflow.trigger_type}</Td>
                <Td>
                  <Badge
                    colorScheme={workflow.active ? 'green' : 'gray'}
                  >
                    {workflow.active ? 'Ativo' : 'Pausado'}
                  </Badge>
                </Td>
                <Td>
                  {new Date(workflow.created_at).toLocaleString()}
                </Td>
                <Td>
                  <Menu>
                    <MenuButton
                      as={IconButton}
                      icon={<MoreVertical size={16} />}
                      variant="ghost"
                      size="sm"
                    />
                    <MenuList>
                      <MenuItem
                        icon={workflow.active ? <Pause size={16} /> : <Play size={16} />}
                        onClick={() => toggleWorkflow(workflow.id, workflow.active)}
                      >
                        {workflow.active ? 'Pausar' : 'Ativar'}
                      </MenuItem>
                    </MenuList>
                  </Menu>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <form onSubmit={handleSubmit}>
            <ModalHeader>Novo Workflow</ModalHeader>
            <ModalBody>
              <Stack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Nome</FormLabel>
                  <Input
                    value={newWorkflow.name}
                    onChange={(e) => setNewWorkflow({
                      ...newWorkflow,
                      name: e.target.value,
                    })}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Descrição</FormLabel>
                  <Textarea
                    value={newWorkflow.description}
                    onChange={(e) => setNewWorkflow({
                      ...newWorkflow,
                      description: e.target.value,
                    })}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Tipo de Trigger</FormLabel>
                  <Select
                    value={newWorkflow.triggerType}
                    onChange={(e) => setNewWorkflow({
                      ...newWorkflow,
                      triggerType: e.target.value,
                    })}
                  >
                    <option value="schedule">Agendamento</option>
                    <option value="event">Evento</option>
                    <option value="webhook">Webhook</option>
                  </Select>
                </FormControl>
              </Stack>
            </ModalBody>

            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                isLoading={saving}
              >
                Criar Workflow
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </Container>
  )
}