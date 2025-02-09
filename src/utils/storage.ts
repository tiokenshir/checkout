import { supabase } from '../lib/supabase'

export type FileMetadata = {
  originalName: string
  description?: string
  tags?: string[]
  relatedId?: string
  relatedType?: string
}

export async function uploadFile(
  file: File,
  bucket: string,
  metadata?: FileMetadata
): Promise<string> {
  try {
    // Generate a unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${crypto.randomUUID()}.${fileExt}`
    const path = metadata?.relatedType 
      ? `${metadata.relatedType}/${fileName}`
      : fileName

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file)

    if (error) throw error

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path)

    // Record file metadata
    const { error: metadataError } = await supabase
      .from('files')
      .insert({
        bucket,
        path: data.path,
        size: file.size,
        mime_type: file.type,
        metadata: {
          ...metadata,
          originalName: file.name,
        },
      })

    if (metadataError) throw metadataError

    return publicUrl
  } catch (error) {
    console.error('Error uploading file:', error)
    throw error
  }
}

export async function deleteFile(path: string, bucket: string): Promise<void> {
  try {
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(bucket)
      .remove([path])

    if (storageError) throw storageError

    // Delete metadata
    const { error: dbError } = await supabase
      .from('files')
      .delete()
      .match({ bucket, path })

    if (dbError) throw dbError
  } catch (error) {
    console.error('Error deleting file:', error)
    throw error
  }
}

export async function getFileUrl(path: string, bucket: string): Promise<string> {
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(path)

  return publicUrl
}

export async function listFiles(
  bucket: string,
  options?: {
    prefix?: string
    relatedId?: string
    relatedType?: string
    tags?: string[]
  }
): Promise<any[]> {
  try {
    let query = supabase
      .from('files')
      .select()
      .eq('bucket', bucket)

    if (options?.prefix) {
      query = query.ilike('path', `${options.prefix}%`)
    }

    if (options?.relatedId) {
      query = query.contains('metadata', { relatedId: options.relatedId })
    }

    if (options?.relatedType) {
      query = query.contains('metadata', { relatedType: options.relatedType })
    }

    if (options?.tags) {
      query = query.contains('metadata', { tags: options.tags })
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error listing files:', error)
    throw error
  }
}

export async function updateFileMetadata(
  id: string,
  metadata: Partial<FileMetadata>
): Promise<void> {
  try {
    const { error } = await supabase
      .from('files')
      .update({
        metadata: metadata,
      })
      .eq('id', id)

    if (error) throw error
  } catch (error) {
    console.error('Error updating file metadata:', error)
    throw error
  }
}