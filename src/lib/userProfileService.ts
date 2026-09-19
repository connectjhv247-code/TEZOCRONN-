import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  getDocs, 
  writeBatch 
} from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage';
import { db, auth, storage, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, UserPrivacySettings } from '../types';

/**
 * Sanitizes user profile fields according to the owner's privacy settings.
 * Ensures private information (e.g. email, bio) is protected from non-permitted viewers.
 */
export function getSanitizedUserProfile(
  viewerUid: string,
  targetProfile: UserProfile,
  isRelated: boolean = false
): UserProfile {
  // Owner always sees their own complete profile information
  if (viewerUid && viewerUid === targetProfile.uid) {
    return targetProfile;
  }

  const settings: UserPrivacySettings = targetProfile.privacySettings || {
    emailVisibility: 'related',
    bioVisibility: 'public',
    showRelateStatus: true,
  };

  // 1. Sanitize Email Visibility
  let sanitizedEmail = targetProfile.email;
  if (settings.emailVisibility === 'private') {
    sanitizedEmail = 'Private';
  } else if (settings.emailVisibility === 'related') {
    sanitizedEmail = isRelated ? targetProfile.email : 'Private (Relates only)';
  }

  // 2. Sanitize Bio Visibility
  let sanitizedBio = targetProfile.bio;
  if (settings.bioVisibility === 'private') {
    sanitizedBio = 'This member has set their bio to private.';
  } else if (settings.bioVisibility === 'related') {
    sanitizedBio = isRelated 
      ? targetProfile.bio 
      : 'This bio is visible to Relate connections only.';
  }

  return {
    ...targetProfile,
    email: sanitizedEmail,
    bio: sanitizedBio,
  };
}

/**
 * Database Function: Saves user profile changes to Firestore and updates Auth state.
 * Propagates public display name & avatar changes across user content in Firestore.
 */
export async function saveUserProfileInDb(
  userId: string,
  updates: Partial<UserProfile>
): Promise<UserProfile> {
  if (!userId) {
    throw new Error('User ID is required to save profile changes.');
  }

  try {
    const userDocRef = doc(db, 'users', userId);
    let finalPhotoURL = updates.photoURL;

    // 1. If photoURL is a base64 data URL, upload to Firebase Storage to obtain a concise HTTPS URL
    if (finalPhotoURL && finalPhotoURL.startsWith('data:image/')) {
      try {
        const avatarRef = storageRef(storage, `avatars/${userId}_${Date.now()}.jpg`);
        const uploadResult = await uploadString(avatarRef, finalPhotoURL, 'data_url');
        finalPhotoURL = await getDownloadURL(uploadResult.ref);
      } catch (storageErr) {
        console.warn('Firebase Storage avatar upload notice (using Firestore inline image):', storageErr);
        // If storage upload fails, retain dataURL for Firestore document storage
      }
    }

    const docUpdates = {
      ...updates,
      ...(finalPhotoURL !== undefined ? { photoURL: finalPhotoURL } : {}),
      updatedAt: new Date().toISOString(),
    };

    // 2. Save or merge changes directly in Firestore database
    await setDoc(userDocRef, docUpdates, { merge: true });

    // 3. If updating current logged-in user, update Firebase Auth profile safely
    if (auth.currentUser && auth.currentUser.uid === userId) {
      const authUpdates: { displayName?: string; photoURL?: string | null } = {};
      
      if (updates.displayName !== undefined) {
        authUpdates.displayName = updates.displayName.trim();
      }

      // Firebase Auth updateProfile accepts photoURL only if < 2048 chars and not a raw base64 data URL
      if (finalPhotoURL !== undefined) {
        const trimmedPhoto = finalPhotoURL.trim();
        if (trimmedPhoto && !trimmedPhoto.startsWith('data:') && trimmedPhoto.length < 1800) {
          authUpdates.photoURL = trimmedPhoto;
        } else if (!trimmedPhoto) {
          authUpdates.photoURL = null;
        }
      }

      if (Object.keys(authUpdates).length > 0) {
        try {
          await updateProfile(auth.currentUser, authUpdates);
        } catch (authErr) {
          console.warn('Firebase Auth updateProfile non-critical notice (skipping invalid auth photoURL attribute):', authErr);
        }
      }
    }

    // 4. Propagate updated display name & photoURL to user's public social chat posts in Firestore
    if (updates.displayName !== undefined || finalPhotoURL !== undefined) {
      try {
        const postsQuery = query(collection(db, 'posts'), where('userId', '==', userId));
        const postsSnap = await getDocs(postsQuery);
        if (!postsSnap.empty) {
          const batch = writeBatch(db);
          const postUpdates: Record<string, any> = {};
          if (updates.displayName !== undefined) postUpdates.authorName = updates.displayName.trim();
          if (finalPhotoURL !== undefined) postUpdates.authorPhotoURL = finalPhotoURL.trim();
          postsSnap.docs.forEach((postDoc) => {
            batch.update(postDoc.ref, postUpdates);
          });
          await batch.commit();
        }
      } catch (propagateErr) {
        console.warn('Post author updates propagation notice:', propagateErr);
      }
    }

    // Fetch and return the updated profile
    const updatedSnap = await getDoc(userDocRef);
    if (updatedSnap.exists()) {
      return updatedSnap.data() as UserProfile;
    }

    throw new Error('Failed to retrieve updated profile from Firestore.');
  } catch (error) {
    console.error('Error saving user profile in database function:', error);
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    throw error;
  }
}

/**
 * Real-time Database Function: Subscribes to a target user's profile and relationship state,
 * automatically applying privacy filters to non-public information.
 */
export function subscribeToUserProfileDb(
  viewerUid: string,
  targetUserId: string,
  onCallback: (profile: UserProfile, isRelated: boolean, error?: string) => void
): () => void {
  let latestProfile: UserProfile | null = null;
  let isRelated = false;

  const userDocRef = doc(db, 'users', targetUserId);
  const relationshipDocId = `${viewerUid}_${targetUserId}`;
  const relDocRef = doc(db, 'relationships', relationshipDocId);

  const notify = () => {
    if (!latestProfile) return;
    const sanitized = getSanitizedUserProfile(viewerUid, latestProfile, isRelated);
    onCallback(sanitized, isRelated);
  };

  // 1. Subscribe to Target User Profile Document
  const unsubUser = onSnapshot(
    userDocRef,
    (snap) => {
      if (snap.exists()) {
        latestProfile = snap.data() as UserProfile;
        notify();
      } else {
        onCallback(
          {
            uid: targetUserId,
            email: 'Private',
            displayName: 'Member',
            createdAt: new Date().toISOString(),
            role: 'Member',
          },
          false,
          'User profile not found.'
        );
      }
    },
    (err) => {
      console.error('Firestore user profile snapshot error:', err);
      onCallback(
        {
          uid: targetUserId,
          email: 'Private',
          displayName: 'Member',
          createdAt: new Date().toISOString(),
          role: 'Member',
        },
        false,
        'Failed to load profile.'
      );
    }
  );

  // 2. Subscribe to Relationship Document (to determine if viewer is a Relate connection)
  const unsubRel = viewerUid && viewerUid !== targetUserId
    ? onSnapshot(
        relDocRef,
        (relSnap) => {
          isRelated = relSnap.exists();
          notify();
        },
        (relErr) => {
          console.warn('Relationship snapshot error:', relErr);
          isRelated = false;
          notify();
        }
      )
    : () => {};

  return () => {
    unsubUser();
    unsubRel();
  };
}
