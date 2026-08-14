/**
 * Wipe all workspace content for an account.
 * Cascades via workspaces → child tables. Clears default_workspace_id first
 * so FK constraints cannot block the delete.
 */
export async function wipeAccountWorkspaces(admin, accountId) {
  const { error: clearErr } = await admin
    .from('users')
    .update({ default_workspace_id: null })
    .eq('account_id', accountId);
  if (clearErr) throw new Error(clearErr.message || 'Could not clear default workspaces');

  const { error: wipeErr } = await admin
    .from('workspaces')
    .delete()
    .eq('account_id', accountId);
  if (wipeErr) throw new Error(wipeErr.message || 'Could not delete workspaces');
}
