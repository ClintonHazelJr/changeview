import { supabase } from './supabase';
import { parseDbError } from './constants';

const BUCKET = 'attachments';

function sanitizeFileName(name) {
  return String(name || 'file').replace(/[^\w.\-()+ ]+/g, '_').slice(0, 180);
}

export async function uploadAttachment({
  accountId,
  workspaceId,
  folder, // e.g. `impacts/${impactId}` or `learning-needs/${id}`
  file,
}) {
  const safeName = sanitizeFileName(file.name);
  const storagePath = `${accountId}/${workspaceId}/${folder}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw new Error(parseDbError(error));
  return {
    storagePath,
    fileName: file.name,
    contentType: file.type || null,
    fileSize: file.size ?? null,
  };
}

export async function removeStorageObject(storagePath) {
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (error) throw new Error(parseDbError(error));
}

export async function downloadAttachment(storagePath, fileName) {
  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
  if (error) throw new Error(parseDbError(error));
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || 'download';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function listImpactAttachments(impactId) {
  const { data, error } = await supabase
    .from('impact_attachments')
    .select('*')
    .eq('impact_id', impactId)
    .order('uploaded_at');
  if (error) throw new Error(parseDbError(error));
  return data || [];
}

export async function insertImpactAttachmentRow({
  accountId, workspaceId, impactId, field, fileName, storagePath, contentType, fileSize,
}) {
  const { data, error } = await supabase
    .from('impact_attachments')
    .insert({
      account_id: accountId,
      workspace_id: workspaceId,
      impact_id: impactId,
      field,
      file_name: fileName,
      storage_path: storagePath,
      content_type: contentType,
      file_size: fileSize,
    })
    .select()
    .single();
  if (error) throw new Error(parseDbError(error));
  return data;
}

export async function deleteImpactAttachmentRow(row) {
  await removeStorageObject(row.storage_path);
  const { error } = await supabase.from('impact_attachments').delete().eq('id', row.id);
  if (error) throw new Error(parseDbError(error));
}

export async function listLearningNeedAttachments(learningNeedId) {
  const { data, error } = await supabase
    .from('learning_need_attachments')
    .select('*')
    .eq('learning_need_id', learningNeedId)
    .order('uploaded_at');
  if (error) throw new Error(parseDbError(error));
  return data || [];
}

export async function insertLearningNeedAttachmentRow({
  accountId, workspaceId, learningNeedId, fileName, storagePath, contentType, fileSize,
}) {
  const { data, error } = await supabase
    .from('learning_need_attachments')
    .insert({
      account_id: accountId,
      workspace_id: workspaceId,
      learning_need_id: learningNeedId,
      file_name: fileName,
      storage_path: storagePath,
      content_type: contentType,
      file_size: fileSize,
    })
    .select()
    .single();
  if (error) throw new Error(parseDbError(error));
  return data;
}

export async function deleteLearningNeedAttachmentRow(row) {
  await removeStorageObject(row.storage_path);
  const { error } = await supabase.from('learning_need_attachments').delete().eq('id', row.id);
  if (error) throw new Error(parseDbError(error));
}
