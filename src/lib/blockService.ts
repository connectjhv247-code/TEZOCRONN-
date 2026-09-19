import { 
  doc, 
  setDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { sendNotification } from './notificationService';

export interface UserBlock {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: string;
}

/**
 * Block a user securely in Firestore.
 * 1. Saves block record in `/blocks/{blockerId}_{blockedId}`.
 * 2. Cleans up any existing relate relationships in both directions.
 * 3. Sends an 'Interaction Restricted' notification to the blocked user.
 */
export async function blockUser(
  blockerUid: string,
  blockedUid: string
): Promise<boolean> {
  if (!blockerUid || !blockedUid || blockerUid === blockedUid) return false;

  const blockDocId = `${blockerUid}_${blockedUid}`;

  try {
    // 1. Save block record in Firestore
    await setDoc(doc(db, 'blocks', blockDocId), {
      id: blockDocId,
      blockerId: blockerUid,
      blockedId: blockedUid,
      createdAt: new Date().toISOString(),
    });

    // 2. Remove relationship in both directions if any exists
    const relId1 = `${blockerUid}_${blockedUid}`;
    const relId2 = `${blockedUid}_${blockerUid}`;
    await Promise.allSettled([
      deleteDoc(doc(db, 'relationships', relId1)),
      deleteDoc(doc(db, 'relationships', relId2)),
    ]);

    // 3. Send notification to the blocked user
    await sendNotification({
      recipientUid: blockedUid,
      senderUid: blockerUid,
      senderName: 'TEZOCRON Security',
      type: 'system',
      title: 'Interaction Restricted',
      body: 'An account has restricted your access and interactions on TEZOCRON. Direct messaging and relate connections with this user are now restricted.',
      targetUid: blockerUid,
      customId: `block_${blockerUid}_${blockedUid}`,
    }).catch(err => console.warn('Block notification warning:', err));

    return true;
  } catch (error) {
    console.error('Error blocking user:', error);
    handleFirestoreError(error, OperationType.CREATE, `blocks/${blockDocId}`);
    return false;
  }
}

/**
 * Unblock a user securely in Firestore.
 * Deletes doc from `/blocks/{blockerId}_{blockedId}`.
 * Does NOT create fake notifications.
 */
export async function unblockUser(
  blockerUid: string,
  blockedUid: string
): Promise<boolean> {
  if (!blockerUid || !blockedUid) return false;

  const blockDocId = `${blockerUid}_${blockedUid}`;

  try {
    await deleteDoc(doc(db, 'blocks', blockDocId));
    return true;
  } catch (error) {
    console.error('Error unblocking user:', error);
    handleFirestoreError(error, OperationType.DELETE, `blocks/${blockDocId}`);
    return false;
  }
}

/**
 * Subscribe to real-time block state for current user.
 * Returns both `blockedUids` (users current user has blocked)
 * and `blockedByUids` (users who have blocked current user).
 */
export function subscribeToUserBlocks(
  userId: string,
  onUpdate: (blocks: { blockedUids: string[]; blockedByUids: string[] }) => void,
  onError?: (err: unknown) => void
) {
  if (!userId || !auth.currentUser) {
    onUpdate({ blockedUids: [], blockedByUids: [] });
    return () => {};
  }

  let blockedUids: string[] = [];
  let blockedByUids: string[] = [];

  const updateAndNotify = () => {
    onUpdate({ blockedUids, blockedByUids });
  };

  // Query 1: Blocks created BY current user
  const blockerQuery = query(
    collection(db, 'blocks'),
    where('blockerId', '==', auth.currentUser.uid)
  );

  const unsubBlocker = onSnapshot(
    blockerQuery,
    (snapshot) => {
      blockedUids = snapshot.docs.map((d) => d.data().blockedId as string);
      updateAndNotify();
    },
    (err) => {
      console.warn('Blocker snapshot warning:', err);
      if (onError) onError(err);
    }
  );

  // Query 2: Blocks where current user is the TARGET (blocked by another user)
  const blockedQuery = query(
    collection(db, 'blocks'),
    where('blockedId', '==', auth.currentUser.uid)
  );

  const unsubBlocked = onSnapshot(
    blockedQuery,
    (snapshot) => {
      blockedByUids = snapshot.docs.map((d) => d.data().blockerId as string);
      updateAndNotify();
    },
    (err) => {
      console.warn('Blocked snapshot warning:', err);
      if (onError) onError(err);
    }
  );

  return () => {
    unsubBlocker();
    unsubBlocked();
  };
}
