import React, { useState, useEffect, useRef } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  markNotificationRead,
  deleteNotification,
  deleteExpiredNotifications
} from '../firebase/notifications';
import { formatFirestoreDate } from '../utils/formatFirestoreDate';
import notifIcon from '../assets/notification.svg';
import closeIcon from '../assets/close.svg';
import '../css/shared/notifications.css';

export default function NotificationBell({ user }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);
  const uid = user?.uid || null;

  useEffect(() => {
    if (!uid) return;

    let unsub = null;
    let cancelled = false;

    (async () => {
      try {
        await deleteExpiredNotifications(uid);
      } catch (err) {
        console.error('Notification retention cleanup error:', err);
      }

      if (cancelled) return;

      const q = query(
        collection(db, 'users', uid, 'notifications'),
        orderBy('createdAt', 'desc')
      );

      unsub = onSnapshot(
        q,
        (snap) => {
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setNotifications(data);
          setLoading(false);
        },
        (err) => {
          console.error('Notifications listener error:', err);
          setLoading(false);
        }
      );
    })();

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [uid]);

  /* Close dropdown when clicking outside */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkRead = async (e, id) => {
    e.stopPropagation();
    if (!uid) return;
    await markNotificationRead(uid, id);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!uid) return;
    await deleteNotification(uid, id);
  };

  const handleMarkAllRead = async () => {
    if (!uid) return;
    const unread = notifications.filter(n => !n.read);
    await Promise.all(
      unread.map(n => updateDoc(doc(db, 'users', uid, 'notifications', n.id), { read: true }))
    );
  };

  return (
    <div className="notification-bell-wrapper" ref={dropdownRef}>
      <button
        className="notification-bell-btn"
        onClick={() => setOpen(prev => !prev)}
        title="Notifications"
      >
        <img
          src={notifIcon}
          alt="Notifications"
          width="25"
          height="25"
          className="white-filter"
        />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button className="mark-all-read-btn" onClick={handleMarkAllRead}>
                Mark all as read
              </button>
            )}
          </div>

          <div className="notification-dropdown-body">
            {loading ? (
              <p className="notification-empty">Loading...</p>
            ) : notifications.length === 0 ? (
              <p className="notification-empty">No notifications</p>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`notification-item ${n.read ? 'read' : 'unread'}`}
                >
                  <div className="notification-dot">
                    {!n.read && <span className="unread-dot" />}
                  </div>
                  <div className="notification-content">
                    <p className="notification-title">{n.title}</p>
                    <p className="notification-message">{n.message}</p>
                    <p className="notification-time">
                      {formatFirestoreDate(n.createdAt, { includeTime: true })}
                    </p>
                  </div>
                  <div className="notification-actions">
                    {!n.read && (
                      <button
                        className="notif-action-btn mark-read"
                        onClick={(e) => handleMarkRead(e, n.id)}
                        title="Mark as read"
                      >
                        &#10003;
                      </button>
                    )}
                    <button
                      className="notif-action-btn delete"
                      onClick={(e) => handleDelete(e, n.id)}
                      title="Delete"
                    >
                      <img src={closeIcon} alt="Delete" width="14" height="14" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
