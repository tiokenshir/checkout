import { useState } from 'react'
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Progress,
  Text,
  useToast,
  IconButton,
  Stack,
  FormHelperText,
} from '@chakra-ui/react'
import { Upload, X } from 'lucide-react'
import { uploadFile, type FileMetadata } from '../utils/storage'

interface FileUploadProps {
  bucket: string
  onUploadComplete: (url: string) => void
  metadata?: FileMetadata
  accept?: string
  maxSize?: number // in bytes
  label?: string
  helperText?: string
}

export function FileUpload({
  bucket,
  onUploadComplete,
  metadata,
  accept = '*/*',
  maxSize = 5 * 1024 * 1024, // 5MB default
  label = 'Upload File',
  helperText,
}: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const toast = useToast()

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size
    if (file.size > maxSize) {
      toast({
        title: 'Error',
        description: `File size must be less than ${maxSize / 1024 / 1024}MB`,
        status: 'error',
      })
      return
    }

    setSelectedFile(file)
  }

  async function handleUpload() {
    if (!selectedFile) return

    try {
      setUploading(true)
      
      // Simulate upload progress
      const interval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90))
      }, 100)

      const url = await uploadFile(selectedFile, bucket, metadata)
      
      clearInterval(interval)
      setProgress(100)
      
      onUploadComplete(url)
      toast({
        title: 'Success',
        description: 'File uploaded successfully',
        status: 'success',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to upload file',
        status: 'error',
      })
    } finally {
      setUploading(false)
      setSelectedFile(null)
      setProgress(0)
    }
  }

  function handleClear() {
    setSelectedFile(null)
    setProgress(0)
  }

  return (
    <Box>
      <FormControl>
        <FormLabel>{label}</FormLabel>
        {helperText && (
          <FormHelperText mb={2}>{helperText}</FormHelperText>
        )}
        <Stack spacing={4}>
          <Box
            position="relative"
            border="2px dashed"
            borderColor="gray.200"
            borderRadius="md"
            p={4}
            textAlign="center"
            _hover={{ borderColor: 'gray.300' }}
          >
            <Input
              type="file"
              height="100%"
              width="100%"
              position="absolute"
              top="0"
              left="0"
              opacity="0"
              aria-hidden="true"
              accept={accept}
              onChange={handleFileSelect}
              disabled={uploading}
            />
            <Stack spacing={2} alignItems="center">
              <Upload size={24} />
              <Text>
                {selectedFile
                  ? selectedFile.name
                  : 'Drag and drop or click to select'}
              </Text>
              {selectedFile && (
                <Text fontSize="sm" color="gray.500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)}MB
                </Text>
              )}
            </Stack>
          </Box>

          {selectedFile && (
            <Stack direction="row" spacing={2}>
              <Button
                onClick={handleUpload}
                isLoading={uploading}
                loadingText="Uploading..."
                flex={1}
              >
                Upload
              </Button>
              <IconButton
                aria-label="Clear selection"
                icon={<X size={20} />}
                onClick={handleClear}
                disabled={uploading}
              />
            </Stack>
          )}

          {uploading && <Progress value={progress} size="sm" colorScheme="brand" />}
        </Stack>
      </FormControl>
    </Box>
  )
}