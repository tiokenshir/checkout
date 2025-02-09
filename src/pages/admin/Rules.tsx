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
  Textarea,
  Stack,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Switch,
  useToast,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react'
import { Plus, MoreVertical, Play, Pause } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { createRule } from '../../utils/automation'

type Rule = {
  id: string
  name: string
  description: string
  priority: number
  active: boolean
  created_at: string
}

export function Rules() {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    conditions: [],
    actions: [],
    priority: 0,
  })
  const toast = useToast()

  useEffect(() => {
    fetchRules()
  }, [])

  async function fetchRules() {
    try {
      const { data, error } = await supabase
        .from('automation_rules')
        .select()
        .order('priority', { ascending: false })

      if (error) throw error
      setRules(data)
    } catch (error) {
      console.error('Error loading rules:', error)
      toast({
        title: 'Erro',
        description: 'Falha ao carregar regras',
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
      await createRule(newRule)

      toast({
        title: 'Sucesso',
        description: 'Regra criada com sucesso',
        status: 'success',
      })

      onClose()
      fetchRules()
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao criar regra',
        status: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  async function toggleRule(id: string, active: boolean) {
    try {
      const { error } = await supabase
        .from('automation_rules')
        .update({ active: !active })
        .eq('id', id)

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: `Regra ${active ? 'pausada' : 'ativada'}`,
        status: 'success',
      })

      fetchRules()
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar regra',
        status: 'error',
      })
    }
  }

  return (
    <Container maxW="container.xl" py={8}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={6}>
        <Heading size="lg">Regras de Automação</Heading>
        <Button leftIcon={<Plus size={20} />} onClick={onOpen}>
          Nova Regra
        </Button>
      </Box>

      <Box bg="white" borderRadius="lg" boxShadow="sm">
        <Table>
          <Thead>
            <Tr>
              <Th>Nome</Th>
              <Th>Prioridade</Th>
              <Th>Status</Th>
              <Th>Última Execução</Th>
              <Th>Ações</Th>
            </Tr>
          </Thead>
          <Tbody>
            {rules.map((rule) => (
              <Tr key={rule.id}>
                <Td>
                  <Box>
                    <Text fontWeight="medium">{rule.name}</Text>
                    <Text fontSize="sm" color="gray.600">
                      {rule.description}
                    </Text>
                  </Box>
                </Td>
                <Td>{rule.priority}</Td>
                <Td>
                  <Badge
                    colorScheme={rule.active ? 'green' : 'gray'}
                  >
                    {rule.active ? 'Ativa' : 'Pausada'}
                  </Badge>
                </Td>
                <Td>
                  {new Date(rule.created_at).toLocaleString()}
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
                        icon={rule.active ? <Pause size={16} /> : <Play size={16} />}
                        onClick={() => toggleRule(rule.id, rule.active)}
                      >
                        {rule.active ? 'Pausar' : 'Ativar'}
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
            <ModalHeader>Nova Regra</ModalHeader>
            <ModalBody>
              <Stack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Nome</FormLabel>
                  <Input
                    value={newRule.name}
                    onChange={(e) => setNewRule({
                      ...newRule,
                      name: e.target.value,
                    })}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Descrição</FormLabel>
                  <Textarea
                    value={newRule.description}
                    onChange={(e) => setNewRule({
                      ...newRule,
                      description: e.target.value,
                    })}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Prioridade</FormLabel>
                  <NumberInput
                    value={newRule.priority}
                    onChange={(value) => setNewRule({
                      ...newRule,
                      priority: parseInt(value),
                    })}
                    min={0}
                    max={100}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
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
                Criar Regra
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </Container>
  )
}