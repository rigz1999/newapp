// ============================================
// Error Message Formatter
// Path: src/utils/errorMessages.ts
// ============================================

/**
 * Formats technical error messages into user-friendly French messages
 * @param error - Error object from Supabase or other sources
 * @returns User-friendly error message in French
 */
export function formatErrorMessage(error: any): string {
  if (!error) {
    return 'Une erreur inattendue s\'est produite';
  }

  const message = error.message || error.error_description || String(error);
  const code = error.code || error.status;

  // Authentication errors
  if (message.includes('Invalid login credentials') || message.includes('invalid_credentials')) {
    return 'Email ou mot de passe incorrect';
  }

  if (message.includes('Email not confirmed')) {
    return 'Veuillez confirmer votre email avant de vous connecter';
  }

  if (message.includes('User already registered') || message.includes('already registered')) {
    return 'Un compte existe déjà avec cet email';
  }

  if (message.includes('Password should be at least')) {
    return 'Le mot de passe doit contenir au moins 6 caractères';
  }

  if (message.includes('Unable to validate email address')) {
    return 'Adresse email invalide';
  }

  if (message.includes('Email rate limit exceeded')) {
    return 'Trop de tentatives. Veuillez réessayer dans quelques minutes';
  }

  // Database errors
  if (message.includes('duplicate key value violates unique constraint')) {
    if (message.includes('email')) {
      return 'Cet email est déjà utilisé';
    }
    if (message.includes('siren')) {
      return 'Ce numéro SIREN est déjà enregistré';
    }
    return 'Cette entrée existe déjà dans la base de données';
  }

  if (message.includes('violates foreign key constraint')) {
    return 'Impossible de supprimer cet élément car il est utilisé ailleurs';
  }

  if (message.includes('violates not-null constraint')) {
    return 'Tous les champs obligatoires doivent être remplis';
  }

  if (message.includes('Row-level security policy violation') || message.includes('new row violates row-level security policy')) {
    return 'Vous n\'avez pas les permissions nécessaires pour effectuer cette action';
  }

  if (message.includes('permission denied')) {
    return 'Accès refusé. Vous n\'avez pas les droits nécessaires';
  }

  // Edge Function errors
  if (message.includes('not found') || message.includes('FunctionsRelayError') || message.includes('Function not found')) {
    return 'Service indisponible. La fonction demandée n\'est pas déployée. Veuillez contacter l\'administrateur';
  }

  if (message.includes('FunctionsHttpError')) {
    return 'Erreur du service. Veuillez réessayer ou contacter le support';
  }

  // Network errors
  if (message.includes('Failed to fetch') || message.includes('Network request failed')) {
    return 'Erreur de connexion. Vérifiez votre connexion internet';
  }

  if (message.includes('timeout') || code === 'ETIMEDOUT') {
    return 'La requête a pris trop de temps. Veuillez réessayer';
  }

  // File upload errors
  if (message.includes('File size too large')) {
    return 'Le fichier est trop volumineux';
  }

  if (message.includes('Invalid file type')) {
    return 'Type de fichier non autorisé';
  }

  // Token/Session errors
  if (message.includes('JWT expired') || message.includes('token expired')) {
    return 'Votre session a expiré. Veuillez vous reconnecter';
  }

  if (message.includes('Invalid token') || message.includes('invalid_token')) {
    return 'Lien invalide ou expiré';
  }

  // Validation errors
  if (message.includes('invalid input syntax for type uuid')) {
    return 'Identifiant invalide';
  }

  if (message.includes('invalid input syntax for type integer')) {
    return 'Veuillez entrer un nombre valide';
  }

  if (message.includes('value too long')) {
    return 'Le texte saisi est trop long';
  }

  // Rate limiting
  if (code === 429 || message.includes('rate limit')) {
    return 'Trop de requêtes. Veuillez patienter quelques instants';
  }

  // Server errors
  if (code >= 500 || message.includes('Internal server error')) {
    return 'Erreur du serveur. Veuillez réessayer plus tard';
  }

  // Default fallback - return original message if no match
  // But clean it up a bit
  const cleanMessage = message
    .replace(/^Error:\s*/i, '')
    .replace(/^Database error:\s*/i, '')
    .trim();

  // If message is too technical (contains SQL, code patterns), return generic message
  if (
    cleanMessage.includes('SELECT') ||
    cleanMessage.includes('INSERT') ||
    cleanMessage.includes('UPDATE') ||
    cleanMessage.includes('DELETE') ||
    cleanMessage.includes('pg_') ||
    cleanMessage.includes('supabase_') ||
    cleanMessage.length > 150
  ) {
    return 'Une erreur s\'est produite. Veuillez réessayer ou contacter le support';
  }

  return cleanMessage;
}

/**
 * Gets a user-friendly error message for specific contexts
 */
export const errorMessages = {
  // Authentication
  loginFailed: 'Impossible de se connecter. Vérifiez vos identifiants',
  signupFailed: 'Impossible de créer le compte. Veuillez réessayer',
  logoutFailed: 'Erreur lors de la déconnexion',

  // Data operations
  loadFailed: 'Impossible de charger les données',
  saveFailed: 'Impossible de sauvegarder les modifications',
  deleteFailed: 'Impossible de supprimer cet élément',
  updateFailed: 'Impossible de mettre à jour',

  // Invitations
  invitationSendFailed: 'Impossible d\'envoyer l\'invitation',
  invitationInvalid: 'Invitation invalide ou expirée',
  invitationAcceptFailed: 'Impossible d\'accepter l\'invitation',

  // File operations
  uploadFailed: 'Échec du téléversement du fichier',
  downloadFailed: 'Impossible de télécharger le fichier',

  // Generic
  genericError: 'Une erreur s\'est produite',
  networkError: 'Erreur de connexion',
  permissionDenied: 'Accès refusé',
};
