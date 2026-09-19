import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  HeartHandshake, 
  MessageSquare, 
  Sparkles, 
  CheckCheck, 
  Trash2,
  Check,
  User,
  Inbox,
  Send,
  Loader2
} from 'lucide-react';
import { AppNotification, NotificationType } from '../types';
import { 
  subscribeToUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  deleteNotificationDoc 
} from '../lib/notificationService';
import { PageTransition } from './PageTransition';

interface NotificationsViewProps {
  currentUserId: string;
  onNavigateToDM?: (recipientUid: string) => void;
  onOpenProfile?: (userId: string) => void;
  onNavigateToRelate?: () => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  currentUserId,
  onNavigateToDM,
  onOpenProfile,
  onNavigateToRelate,
}) => {
  const [filter, setFilter] = useState<'all' | 'relate' | 'dm' | 'system'>('all');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToUserNotifications(
      currentUserId,
      (items) => {
        setNotifications(items);
        setLoading(false);
      },
      (err) => {
        console.error('Error in notifications subscription:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUserId]);

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead(notifications);
  };

  const handleMarkRead = async (id: string) => {
    await markNotificationAsRead(id);
  };

  const handleDelete = async (id: string) => {
    await deleteNotificationDoc(id);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications = notifications.filter((item) => {
    if (filter === 'all') return true;
    return item.type === filter;
  });

  return (
    <PageTransition keyId="notifications-screen">
      <div className="max-w-3xl mx-auto space-y-5">
        
        {/* Header Card with TEZOCRON Blue, White, and Pink Theme */}
        <div className="bg-white/95 dark:bg-zinc-900/90 rounded-3xl p-6 border border-zinc-200/80 dark:border-zinc-800 shadow-xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-pink-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                    Notifications
                  </h2>
                  {unreadCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-pink-500 text-white shadow-xs">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Real-time alerts for direct messages, relate connections, and updates
                </p>
              </div>
            </div>

            {notifications.length > 0 && unreadCount > 0 && (
              <button
                type="button"
                id="btn-mark-all-read"
                onClick={handleMarkAllRead}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/80 border border-blue-100 dark:border-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold transition cursor-pointer shrink-0"
                title="Mark all as read"
              >
                <CheckCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Mark All Read</span>
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 pt-5 border-t border-zinc-100 dark:border-zinc-800/80 mt-5 overflow-x-auto no-scrollbar">
            {(['all', 'dm', 'relate', 'system'] as const).map((tab) => {
              const labelMap: Record<string, string> = {
                all: 'All Notifications',
                dm: 'Direct Messages',
                relate: 'Relate Connections',
                system: 'System Alerts',
              };
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilter(tab)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                    filter === tab
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  {labelMap[tab]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notifications Body List */}
        {loading ? (
          <div className="bg-white/95 dark:bg-zinc-900/90 rounded-3xl p-12 border border-zinc-200/80 dark:border-zinc-800 text-center space-y-3 shadow-sm">
            <Loader2 className="w-7 h-7 text-blue-600 animate-spin mx-auto" />
            <p className="text-xs font-semibold text-zinc-500">Loading your notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          /* Clean Empty State Message - Strictly No Fake/Sample Data */
          <div className="bg-white/95 dark:bg-zinc-900/90 rounded-3xl p-10 sm:p-12 border border-zinc-200/80 dark:border-zinc-800 text-center space-y-4 shadow-md">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-50 to-pink-50 dark:from-zinc-800 dark:to-zinc-800 text-blue-600 dark:text-pink-400 mx-auto flex items-center justify-center border border-zinc-200/60 dark:border-zinc-700">
              <Inbox className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-zinc-800 dark:text-zinc-100 tracking-tight">
                No notifications yet
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                When other TEZOCRON members send you direct messages or connect with you on Relate, your real-time alerts will appear right here.
              </p>
            </div>
            {onNavigateToRelate && (
              <button
                type="button"
                onClick={onNavigateToRelate}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-blue-600 to-pink-600 text-white text-xs font-bold hover:opacity-90 transition shadow-md shadow-blue-500/15 cursor-pointer mt-2"
              >
                <HeartHandshake className="w-4 h-4" />
                <span>Explore Relate Community</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((item) => {
              const isUnread = !item.read;

              return (
                <div
                  key={item.id}
                  className={`p-4.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4 shadow-xs ${
                    isUnread
                      ? 'bg-gradient-to-r from-blue-50/80 via-white to-pink-50/60 dark:from-blue-950/40 dark:via-zinc-900 dark:to-pink-950/30 border-blue-200/90 dark:border-blue-800/80'
                      : 'bg-white dark:bg-zinc-900/80 border-zinc-200/80 dark:border-zinc-800/80 opacity-90'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    {/* Event Icon Badge */}
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-bold shadow-xs ${
                      item.type === 'relate' 
                        ? 'bg-pink-100 text-pink-600 dark:bg-pink-950/80 dark:text-pink-400' 
                        : item.type === 'dm'
                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-950/80 dark:text-blue-400'
                        : 'bg-purple-100 text-purple-600 dark:bg-purple-950/80 dark:text-purple-400'
                    }`}>
                      {item.type === 'relate' && <HeartHandshake className="w-5 h-5" />}
                      {item.type === 'dm' && <MessageSquare className="w-5 h-5" />}
                      {item.type === 'system' && <Sparkles className="w-5 h-5" />}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                          {item.title}
                        </h4>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-pink-500 shrink-0" title="Unread" />
                        )}
                        <span className="text-[10px] font-semibold text-zinc-400 ml-auto sm:ml-0">
                          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed break-words">
                        {item.body}
                      </p>

                      {/* Action Links */}
                      {(item.senderUid || item.targetUid) && (
                        <div className="flex items-center gap-2 pt-2 mt-1">
                          {onNavigateToDM && (item.senderUid || item.targetUid) && (
                            <button
                              type="button"
                              onClick={() => onNavigateToDM((item.senderUid || item.targetUid)!)}
                              className="px-3 py-1 rounded-xl bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700 transition cursor-pointer flex items-center gap-1 shadow-xs"
                            >
                              <Send className="w-3 h-3" />
                              <span>Open DM</span>
                            </button>
                          )}
                          {onOpenProfile && item.senderUid && (
                            <button
                              type="button"
                              onClick={() => onOpenProfile(item.senderUid)}
                              className="px-3 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-[11px] font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer flex items-center gap-1"
                            >
                              <User className="w-3 h-3" />
                              <span>View Profile</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Controls: Mark Read & Delete */}
                  <div className="flex items-center gap-1 self-end sm:self-start shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-zinc-100 dark:border-zinc-800 w-full sm:w-auto justify-end">
                    {isUnread && (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(item.id)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition cursor-pointer"
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                      title="Delete notification"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageTransition>
  );
};
