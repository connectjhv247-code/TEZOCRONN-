import { 
  collection, 
  addDoc, 
  setDoc,
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { AppNotification, NotificationType } from '../types';

/**
 * Creates and sends a real notification to a specific authenticated recipient user.
 */
export async function sendNotification({
  recipientUid,
  senderUid,
  senderName = 'TEZOCRON Member',
  type,
  title,
  body,
  targetUid,
  customId,
}: {
  recipientUid: string;
  senderUid: string;
  senderName?: string;
  type: NotificationType;
  title: string;
  body: string;
  targetUid?: string;
  customId?: string;
}): Promise<string | null> {
  // Prevent sending notification to oneself
  if (!recipientUid || recipientUid === senderUid) {
    return null;
  }

  try {
    const payload = {
      recipientUid,
      senderUid,
      senderName,
      type,
      title,
      body,
      createdAt: new Date().toISOString(),
      read: false,
      ...(targetUid ? { targetUid } : {}),
    };

    if (customId) {
      await setDoc(doc(db, 'notifications', customId), payload);
      return customId;
    } else {
      const docRef = await addDoc(collection(db, 'notifications'), payload);
      return docRef.id;
    }
  } catch (error) {
    console.warn('Failed to send notification doc:', error);
    return null;
  }
}

/**
 * Subscribes to real-time notifications belonging strictly to the current authenticated user.
 */
export function subscribeToUserNotifications(
  recipientUid: string,
  onNotifications: (notifications: AppNotification[]) => void,
  onError?: (err: unknown) => void
) {
  const currentUid = auth.currentUser?.uid || recipientUid;
  if (!currentUid || !auth.currentUser) {
    onNotifications([]);
    return () => {};
  }

  const q = query(
    collection(db, 'notifications'),
    where('recipientUid', '==', auth.currentUser.uid)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: AppNotification[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          recipientUid: data.recipientUid,
          senderUid: data.senderUid,
          senderName: data.senderName || 'Member',
          type: data.type || 'system',
          title: data.title || 'Notification',
          body: data.body || '',
          createdAt: data.createdAt || new Date().toISOString(),
          read: Boolean(data.read),
          targetUid: data.targetUid,
        };
      });

      // Sort client-side by createdAt descending to avoid composite index requirements
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      onNotifications(items);
    },
    (err) => {
      console.error('Error fetching real user notifications:', err);
      if (onError) onError(err);
      handleFirestoreError(err, OperationType.GET, `notifications?recipientUid=${recipientUid}`);
    }
  );
}

/**
 * Marks a single notification document as read.
 */
export async function markNotificationAsRead(notificationId: string) {
  try {
    const notifRef = doc(db, 'notifications', notificationId);
    await updateDoc(notifRef, { read: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `notifications/${notificationId}`);
  }
}

/**
 * Marks all unread notifications for a user as read.
 */
export async function markAllNotificationsAsRead(notifications: AppNotification[]) {
  const unreadList = notifications.filter((n) => !n.read);
  if (unreadList.length === 0) return;

  try {
    const batch = writeBatch(db);
    unreadList.forEach((n) => {
      const notifRef = doc(db, 'notifications', n.id);
      batch.update(notifRef, { read: true });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'notifications/batch-read');
  }
}

/**
 * Deletes a notification document.
 */
export async function deleteNotificationDoc(notificationId: string) {
  try {
    const notifRef = doc(db, 'notifications', notificationId);
    await deleteDoc(notifRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `notifications/${notificationId}`);
  }
}
