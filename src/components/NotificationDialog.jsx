import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from 'date-fns';
import { notificationService } from '@/services/notificationService';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const NotificationDialog = ({ open, onOpenChange, notifications: initialNotifications, onNotificationRead }) => {
  const [readIds, setReadIds] = useState(new Set());
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let unsubscribe;

    const connectToWebSocket = async () => {
      if (!open) return;
      
      setIsConnecting(true);
      try {
        await notificationService.connect();
        
        // Subscribe to real-time notifications
        unsubscribe = notificationService.subscribe((newNotification) => {
          setNotifications(prev => {
            // Check if notification already exists
            if (prev.some(n => n.id === newNotification.id)) {
              return prev;
            }
            // Add new notification at the beginning of the array
            return [newNotification, ...prev];
          });
          
          // Show toast for new notification
          toast({
            title: "New Notification",
            description: newNotification.message,
            duration: 5000
          });
        });

        // Initial fetch
        const fetchedNotifications = await notificationService.fetchNotifications();
        setNotifications(fetchedNotifications);
      } catch (error) {
        console.error('Failed to connect to notifications:', error);
        toast({
          variant: "destructive",
          title: "Connection Error",
          description: "Failed to connect to notification service"
        });
      } finally {
        setIsConnecting(false);
      }
    };

    connectToWebSocket();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      notificationService.disconnect();
    };
  }, [open, toast]);

  // Update local notifications when initialNotifications changes
  useEffect(() => {
    setNotifications(initialNotifications);
  }, [initialNotifications]);

  const handleMarkAllAsRead = async () => {
    if (isMarkingRead) return;

    const unreadNotifications = notifications.filter(n => !n.readFlag && !readIds.has(n.id));
    if (unreadNotifications.length === 0) return;

    setIsMarkingRead(true);
    try {
      const unreadIds = unreadNotifications.map(n => n.id);
      await notificationService.markNotificationsAsRead(unreadIds);
      
      // Update local state
      setReadIds(prev => new Set([...prev, ...unreadIds]));
      
      // Notify parent component
      unreadIds.forEach(id => {
        if (onNotificationRead) {
          onNotificationRead(id);
        }
      });

      toast({
        title: "Success",
        description: "All notifications marked as read"
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to mark notifications as read"
      });
    } finally {
      setIsMarkingRead(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <DialogTitle>Notifications</DialogTitle>
            {notifications.some(n => !n.readFlag && !readIds.has(n.id)) && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={isMarkingRead}
                className={cn(
                  "text-xs text-primary hover:text-primary/80 transition-colors",
                  "underline underline-offset-4",
                  isMarkingRead && "opacity-50 cursor-not-allowed"
                )}
              >
                {isMarkingRead && <Loader2 className="h-3 w-3 animate-spin" />}
                {isMarkingRead ? "Marking as read..." : "Mark all as read"}
              </button>
            )}
          </div>
          <DialogDescription>
            Your recent notifications and updates
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[400px] overflow-y-auto pr-4">
          <div className="space-y-4">
            {isConnecting ? (
              <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-8 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting to notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
                No notifications to display
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {notifications.map((notification, index) => (
                    <motion.div
                      layout
                      key={notification.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ duration: 0.2 }}
                      onClick={async () => {
                        if (!readIds.has(notification.id) && !notification.readFlag) {
                          try {
                            await notificationService.markNotificationsAsRead([notification.id]);
                            setReadIds(prev => new Set([...prev, notification.id]));
                            if (onNotificationRead) {
                              onNotificationRead(notification.id);
                            }
                          } catch (error) {
                            toast({
                              variant: "destructive",
                              title: "Error",
                              description: "Failed to mark notification as read"
                            });
                          }
                        }
                      }}
                      className={cn(
                        "p-4 rounded-lg border cursor-pointer",
                        "bg-white dark:bg-gray-800",
                        "shadow-sm hover:shadow-md transition-shadow",
                        "border-gray-200 dark:border-gray-700",
                        (notification.readFlag || readIds.has(notification.id)) ? "opacity-70" : ""
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="text-sm text-gray-800 dark:text-gray-200">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        <span className={cn(
                          "px-2 py-1 text-xs rounded-full",
                          "bg-primary/10 text-primary"
                        )}>
                          {notification.type}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationDialog;