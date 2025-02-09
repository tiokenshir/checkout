import { supabase } from '../lib/supabase'

type StorageProvider = 'google_drive' | 'aws_s3'
type FileMetadata = Record<string, any>

export async function connectStorageProvider(
  provider: StorageProvider,
  credentials: {
    accessToken: string
    refreshToken: string
    expiresAt?: string
  }
) {
  try {
    const { error } = await supabase
      .from('storage_integrations')
      .insert({
        provider,
        credentials,
        settings: {
          autoSync: true,
          syncInterval: 'daily',
          includeTypes: ['documents', 'images'],
        },
      })

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error connecting storage provider:', error)
    throw error
  }
}

export async function syncStorage(integrationId: string) {
  try {
    // Get integration details
    const { data: integration, error: integrationError } = await supabase
      .from('storage_integrations')
      .select()
      .eq('id', integrationId)
      .single()

    if (integrationError) throw integrationError

    // Get files to sync
    const { data: files, error: filesError } = await supabase
      .from('drive_files')
      .select()
      .eq('provider', integration.provider)

    if (filesError) throw filesError

    // Sync files
    let filesSynced = 0
    let totalSize = 0

    for (const file of files) {
      try {
        if (integration.provider === 'google_drive') {
          await syncToGoogleDrive(file, integration.credentials)
        } else {
          await syncToS3(file, integration.credentials)
        }
        filesSynced++
        totalSize += file.size
      } catch (error) {
        console.error(`Error syncing file ${file.id}:`, error)
      }
    }

    // Log sync result
    const { error: logError } = await supabase
      .from('storage_sync_logs')
      .insert({
        integration_id: integrationId,
        status: 'success',
        files_synced: filesSynced,
        total_size: totalSize,
      })

    if (logError) throw logError

    return {
      filesSynced,
      totalSize,
    }
  } catch (error) {
    // Log sync error
    await supabase
      .from('storage_sync_logs')
      .insert({
        integration_id: integrationId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      })

    throw error
  }
}

export async function uploadFile(
  file: File,
  provider: StorageProvider,
  metadata?: FileMetadata
) {
  try {
    // Get storage settings
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('storage_settings')
      .single()

    if (settingsError) throw settingsError

    // Upload to provider
    let fileUrl: string
    if (provider === 'google_drive') {
      fileUrl = await uploadToGoogleDrive(file, settings.storage_settings.google_drive, metadata)
    } else {
      fileUrl = await uploadToS3(file, settings.storage_settings.aws_s3, metadata)
    }

    // Record in database
    const { error: dbError } = await supabase
      .from('drive_files')
      .insert({
        name: file.name,
        mime_type: file.type,
        size: file.size,
        provider,
        provider_file_id: fileUrl,
        metadata,
      })

    if (dbError) throw dbError

    return fileUrl
  } catch (error) {
    console.error('Error uploading file:', error)
    throw error
  }
}

async function uploadToGoogleDrive(
  file: File,
  settings: any,
  metadata?: FileMetadata
): Promise<string> {
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('metadata', JSON.stringify(metadata))

    const response = await fetch(`${settings.api_url}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.access_token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      throw new Error('Failed to upload to Google Drive')
    }

    const data = await response.json()
    return data.webViewLink
  } catch (error) {
    console.error('Error uploading to Google Drive:', error)
    throw error
  }
}

async function uploadToS3(
  file: File,
  settings: any,
  metadata?: FileMetadata
): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from(settings.bucket)
      .upload(`${metadata?.path || ''}/${file.name}`, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (error) throw error

    const { data: { publicUrl } } = supabase.storage
      .from(settings.bucket)
      .getPublicUrl(data.path)

    return publicUrl
  } catch (error) {
    console.error('Error uploading to S3:', error)
    throw error
  }
}

async function syncToGoogleDrive(file: any, credentials: any) {
  // Implement Google Drive sync logic
  console.log('Syncing to Google Drive:', file.id)
}

async function syncToS3(file: any, credentials: any) {
  // Implement S3 sync logic
  console.log('Syncing to S3:', file.id)
}

export async function deleteFile(fileId: string) {
  try {
    const { data: file, error: fileError } = await supabase
      .from('drive_files')
      .select()
      .eq('id', fileId)
      .single()

    if (fileError) throw fileError

    // Delete from provider
    if (file.provider === 'google_drive') {
      await deleteFromGoogleDrive(file.provider_file_id)
    } else {
      await deleteFromS3(file.provider_file_id)
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('drive_files')
      .delete()
      .eq('id', fileId)

    if (dbError) throw dbError
  } catch (error) {
    console.error('Error deleting file:', error)
    throw error
  }
}

async function deleteFromGoogleDrive(fileId: string) {
  try {
    const { data: settings } = await supabase
      .from('settings')
      .select('storage_settings')
      .single()

    const response = await fetch(`${settings.storage_settings.google_drive.api_url}/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${settings.storage_settings.google_drive.access_token}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to delete from Google Drive')
    }
  } catch (error) {
    console.error('Error deleting from Google Drive:', error)
    throw error
  }
}

async function deleteFromS3(path: string) {
  try {
    const { error } = await supabase.storage
      .from('files')
      .remove([path])

    if (error) throw error
  } catch (error) {
    console.error('Error deleting from S3:', error)
    throw error
  }
}

export async function getFileUrl(fileId: string): Promise<string> {
  try {
    const { data: file, error } = await supabase
      .from('drive_files')
      .select()
      .eq('id', fileId)
      .single()

    if (error) throw error
    return file.provider_file_id
  } catch (error) {
    console.error('Error getting file URL:', error)
    throw error
  }
}