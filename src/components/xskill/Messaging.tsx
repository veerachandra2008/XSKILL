'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from './AuthContext';
import {
  MessageSquare,
  Send,
  Search,
  Phone,
  PhoneOff,
  Video,
  MoreVertical,
  Paperclip,
  Smile,
  CheckCheck,
  Check,
  Pencil,
  Trash2,
  Users,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { motion } from 'framer-motion';
import { buildApiUrl, createAuthHeaders, getApiBaseUrl, getToken } from '@/lib/xskill-api';

interface Contact {
  id: number;
  name: string;
  email: string;
  role: 'client' | 'student' | 'admin';
  avatar?: string;
}

interface ApiMessage {
  id: number;
  sender_id: number;
  receiver_id: number;
  trial_id?: number | null;
  message: string;
  created_at: string;
  edited_at?: string | null;
  seen_at?: string | null;
}

interface IncomingCallState {
  callerId: string;
  callerName: string;
  channel: string;
}

export default function Messaging() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeletingMessageId, setIsDeletingMessageId] = useState<number | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallState | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const selectedContactIdRef = useRef<number | null>(null);
  const contactsRef = useRef<Contact[]>([]);

  const selectedContact = contacts.find((contact) => contact.id === selectedContactId) || null;
  const currentUserId = String(user?.id || '');
  const selectedUserId = String(selectedContactId || '');

  const filteredContacts = useMemo(
    () =>
      contacts.filter((contact) => {
        const term = searchQuery.toLowerCase();
        return (
          contact.name.toLowerCase().includes(term) ||
          contact.email.toLowerCase().includes(term) ||
          contact.role.toLowerCase().includes(term)
        );
      }),
    [contacts, searchQuery]
  );

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const buildChannelName = (firstUserId: string, secondUserId: string) =>
    [firstUserId, secondUserId].filter(Boolean).sort().join('_');

  const normalizeMessageTimestamp = (value: string) => {
    const rawValue = (value || '').trim();
    if (!rawValue) return new Date().toISOString();

    const normalized = rawValue.replace(' ', 'T');
    const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(normalized);
    return hasTimezone ? normalized : `${normalized}+05:30`;
  };

  const normalizeOptionalTimestamp = (value?: string | null) => {
    if (!value) return null;
    return normalizeMessageTimestamp(value);
  };

  const normalizeIncomingMessage = (message: ApiMessage): ApiMessage => ({
    ...message,
    id: Number(message.id),
    sender_id: Number(message.sender_id),
    receiver_id: Number(message.receiver_id),
    created_at: normalizeMessageTimestamp(message.created_at),
    edited_at: normalizeOptionalTimestamp(message.edited_at),
    seen_at: normalizeOptionalTimestamp(message.seen_at),
  });

  const upsertMessage = (prev: ApiMessage[], nextMessage: ApiMessage) => {
    const normalized = normalizeIncomingMessage(nextMessage);
    const index = prev.findIndex((item) => Number(item.id) === Number(normalized.id));
    if (index === -1) {
      return [...prev, normalized];
    }
    const copy = [...prev];
    copy[index] = { ...copy[index], ...normalized };
    return copy;
  };

  const formatMessageTime = (value: string) => {
    const parsed = new Date(normalizeMessageTimestamp(value));
    if (Number.isNaN(parsed.getTime())) return '--:--';

    return parsed.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!user) return;

    const loadContacts = async () => {
      setIsLoadingContacts(true);
      try {
        const res = await fetch(buildApiUrl('/api/contacts'), {
          headers: createAuthHeaders(false),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load contacts');
        }

        setContacts(data.contacts || []);
        if ((data.contacts || []).length > 0) {
          setSelectedContactId((current) => current ?? data.contacts[0].id);
        }
      } catch (error) {
        console.error(error);
        setContacts([]);
      } finally {
        setIsLoadingContacts(false);
      }
    };

    loadContacts();
  }, [user]);

  useEffect(() => {
    contactsRef.current = contacts;
  }, [contacts]);

  useEffect(() => {
    selectedContactIdRef.current = selectedContactId;
  }, [selectedContactId]);

  useEffect(() => {
    const token = getToken();
    if (!user || !token) return;

    const socket = io(getApiBaseUrl(), {
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join', { token });
    });

    socket.on('incoming_call', (data: { from?: number | string; channel?: string }) => {
      if (!data.channel) return;

      const fromContact = contactsRef.current.find((contact) => String(contact.id) === String(data.from));
      const callerName = fromContact?.name || 'Incoming caller';
      setIncomingCall({
        callerId: String(data.from || ''),
        callerName,
        channel: data.channel,
      });
    });

    socket.on('receive_message', (incoming: ApiMessage) => {
      const normalizedIncoming = normalizeIncomingMessage(incoming);

      const receiverId = Number(incoming.receiver_id);
      const senderId = Number(incoming.sender_id);
      const me = Number(user.id);

      if (receiverId !== me && senderId !== me) return;

      const otherUserId = senderId === me ? receiverId : senderId;

      if (selectedContactIdRef.current && Number(selectedContactIdRef.current) === Number(otherUserId)) {
        if (receiverId === me) {
          // Mark seen immediately when active conversation is open.
          void fetch(buildApiUrl(`/api/messages?user_id=${otherUserId}`), {
            headers: createAuthHeaders(false),
          })
            .then((res) => res.json())
            .then((data) => {
              if (Array.isArray(data.messages)) {
                setMessages(data.messages.map((message: ApiMessage) => normalizeIncomingMessage(message)));
              } else {
                setMessages((prev) => upsertMessage(prev, normalizedIncoming));
              }
            })
            .catch(() => {
              setMessages((prev) => upsertMessage(prev, normalizedIncoming));
            });
        } else {
          setMessages((prev) => upsertMessage(prev, normalizedIncoming));
        }
        return;
      }
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection failed', error);
    });

    return () => {
      socket.off('incoming_call');
      socket.off('receive_message');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  useEffect(() => {
    if (!selectedContactId) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      setIsLoadingMessages(true);
      try {
        const res = await fetch(buildApiUrl(`/api/messages?user_id=${selectedContactId}`), {
          headers: createAuthHeaders(false),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load messages');
        }

        setMessages(
          (data.messages || []).map((message: ApiMessage) => normalizeIncomingMessage(message))
        );
      } catch (error) {
        console.error(error);
        setMessages([]);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    loadMessages();
  }, [selectedContactId]);

  const handleSendMessage = async () => {
    if (!selectedContactId || !messageInput.trim()) return;

    setIsSending(true);
    const outgoingText = messageInput.trim();

    try {
      const res = await fetch(buildApiUrl('/api/messages'), {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify({
          receiver_id: selectedContactId,
          message: outgoingText,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      // Add response message once; socket echo will upsert by id and not duplicate.
      setMessages((prev) =>
        upsertMessage(prev, {
          id: Number(data.data?.id || Date.now()),
          sender_id: Number(user?.id),
          receiver_id: selectedContactId,
          trial_id: null,
          message: outgoingText,
          created_at: data.data?.created_at || new Date().toISOString(),
          edited_at: data.data?.edited_at || null,
          seen_at: data.data?.seen_at || null,
        })
      );
      setMessageInput('');
    } catch (error) {
      console.error(error);
    } finally {
      setIsSending(false);
    }
  };

  const startEditMessage = (message: ApiMessage) => {
    setEditingMessageId(message.id);
    setEditingValue(message.message);
  };

  const cancelEditMessage = () => {
    setEditingMessageId(null);
    setEditingValue('');
  };

  const saveEditedMessage = async (messageId: number) => {
    const nextText = editingValue.trim();
    if (!nextText) return;

    setIsSavingEdit(true);
    try {
      const res = await fetch(buildApiUrl(`/api/messages/${messageId}`), {
        method: 'PUT',
        headers: createAuthHeaders(),
        body: JSON.stringify({ message: nextText }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to edit message');
      }

      const updatedMessage = data.data as ApiMessage;
      setMessages((prev) =>
        prev.map((message) =>
          message.id === messageId
            ? {
                ...message,
                message: updatedMessage.message,
                edited_at: normalizeOptionalTimestamp(updatedMessage.edited_at),
              }
            : message
        )
      );
      cancelEditMessage();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const deleteMessage = async (messageId: number) => {
    setIsDeletingMessageId(messageId);
    try {
      const res = await fetch(buildApiUrl(`/api/messages/${messageId}`), {
        method: 'DELETE',
        headers: createAuthHeaders(false),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete message');
      }

      setMessages((prev) => prev.filter((message) => message.id !== messageId));
      if (editingMessageId === messageId) {
        cancelEditMessage();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeletingMessageId(null);
    }
  };

  const startCall = () => {
    if (!currentUserId || !selectedUserId || !selectedContact) return;

    const channelName = buildChannelName(currentUserId, selectedUserId);
    socketRef.current?.emit('call_user', {
      token: getToken(),
      to: Number(selectedUserId),
      channel: channelName,
    });

    const params = new URLSearchParams({
      channel: channelName,
      name: selectedContact.name,
      role: 'outgoing',
    });
    window.open(`/call?${params.toString()}`, '_blank');
  };

  const acceptIncomingCall = () => {
    if (!incomingCall) return;

    const params = new URLSearchParams({
      channel: incomingCall.channel,
      name: incomingCall.callerName,
      role: 'incoming',
    });
    window.open(`/call?${params.toString()}`, '_blank');
    setIncomingCall(null);
  };

  const rejectIncomingCall = () => {
    setIncomingCall(null);
  };

  const memberCountLabel =
    user?.role === 'student'
      ? `${contacts.length} client members`
      : user?.role === 'client'
        ? `${contacts.length} student members`
        : `${contacts.length} members`;

  return (
    <motion.div
      className="h-[calc(100vh-8rem)]"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35 }}
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground dark:text-white">Messages</h1>
          <p className="text-muted-foreground mt-1">
            Message only authenticated {user?.role === 'student' ? 'clients' : user?.role === 'client' ? 'students' : 'members'} on the platform.
          </p>
        </div>
        <Badge variant="outline" className="border-border dark:border-slate-700 gap-2 px-3 py-1.5">
          <Users className="w-4 h-4" />
          {memberCountLabel}
        </Badge>
      </div>

      <div className="h-[calc(100%-5rem)] grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-4">
        <Card className="pro-card overflow-hidden flex flex-col">
          <CardHeader className="border-b border-border dark:border-slate-800 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-foreground dark:text-white text-lg">Chat Members</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Left side shows all available members you can message.
                </CardDescription>
              </div>
              <Badge variant="outline" className="border-border dark:border-slate-700 gap-1">
                <Users className="w-3 h-3" />
                {contacts.length}
              </Badge>
            </div>
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background/50 border-border dark:border-slate-700 text-foreground dark:text-white"
              />
            </div>
          </CardHeader>

          <CardContent className="flex-1 p-0 min-h-0">
            <ScrollArea className="h-full">
              <div className="p-2 space-y-1">
              {isLoadingContacts && (
                <div className="p-4 text-sm text-muted-foreground">Loading members...</div>
              )}

              {!isLoadingContacts && filteredContacts.length === 0 && (
                <div className="p-6 text-center">
                  <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No chat members found</p>
                </div>
              )}

              {filteredContacts.map((contact) => {
                return (
                  <button
                    key={contact.id}
                    onClick={() => setSelectedContactId(contact.id)}
                    className={`w-full rounded-xl px-3 py-3 text-left transition-colors ${
                      selectedContactId === contact.id
                        ? 'bg-primary/15 border border-primary/30'
                        : 'hover:bg-accent/50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-11 h-11 border border-border dark:border-slate-700">
                        <AvatarImage src={contact.avatar} />
                        <AvatarFallback className="bg-theme-gradient-br text-white text-sm">
                          {getInitials(contact.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-foreground dark:text-white truncate">{contact.name}</p>
                          <Badge variant="outline" className="text-[10px] capitalize border-border dark:border-slate-700">
                            {contact.role}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {contact.email}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="pro-card overflow-hidden flex flex-col min-h-0">
          {selectedContact ? (
            <>
              <CardHeader className="border-b border-border dark:border-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="w-11 h-11 border border-border dark:border-slate-700">
                      <AvatarImage src={selectedContact.avatar} />
                      <AvatarFallback className="bg-theme-gradient text-white text-sm font-bold">
                        {getInitials(selectedContact.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <CardTitle className="text-foreground dark:text-white text-lg truncate">{selectedContact.name}</CardTitle>
                      <CardDescription className="text-muted-foreground truncate">
                        {selectedContact.email} • {selectedContact.role}
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={startCall}
                    >
                      <Phone className="w-5 h-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={startCall}
                    >
                      <Video className="w-5 h-5" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                          <MoreVertical className="w-5 h-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-popover border-border dark:border-slate-700">
                        <DropdownMenuItem className="text-popover-foreground focus:bg-accent">
                          View Member
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-popover-foreground focus:bg-accent">
                          Refresh Chat
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 p-0 min-h-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.08),_transparent_35%)]">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-4">
                  {isLoadingMessages && (
                    <p className="text-sm text-muted-foreground">Loading messages...</p>
                  )}

                  {!isLoadingMessages && messages.length === 0 && (
                    <div className="text-center py-10">
                      <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground">No messages yet. Start the conversation.</p>
                    </div>
                  )}

                  {messages.map((message) => {
                    const isMine = message.sender_id === Number(user?.id);
                    const canDelete = isMine && !message.seen_at;
                    return (
                      <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[72%] rounded-2xl px-4 py-2 ${
                            isMine
                              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white'
                              : 'bg-accent text-foreground'
                          }`}
                        >
                          {editingMessageId === message.id ? (
                            <div className="space-y-2">
                              <Input
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                className="h-8 bg-white/90 text-slate-900 border-white/60"
                              />
                              <div className="flex justify-end gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  className="h-7 px-2 text-xs"
                                  onClick={cancelEditMessage}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  disabled={!editingValue.trim() || isSavingEdit}
                                  onClick={() => saveEditedMessage(message.id)}
                                >
                                  Save
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm">{message.message}</p>
                          )}
                          <div className={`flex items-center justify-end gap-1 mt-1 ${
                            isMine ? 'text-violet-200' : 'text-muted-foreground'
                          }`}>
                            <span className="text-xs">{formatMessageTime(message.created_at)}</span>
                            {message.edited_at && <span className="text-xs opacity-80">(edited)</span>}
                            {isMine && (message.seen_at ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />)}
                            {isMine && editingMessageId !== message.id && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 text-current hover:text-current hover:bg-white/10"
                                  >
                                    <MoreVertical className="w-3.5 h-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-popover border-border dark:border-slate-700">
                                  <DropdownMenuItem
                                    className="text-popover-foreground focus:bg-accent"
                                    onClick={() => startEditMessage(message)}
                                  >
                                    <Pencil className="mr-2 h-3.5 w-3.5" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-popover-foreground focus:bg-accent"
                                    disabled={!canDelete || isDeletingMessageId === message.id}
                                    onClick={() => deleteMessage(message.id)}
                                  >
                                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                                    {canDelete ? 'Delete' : 'Delete (Seen)'}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              </CardContent>

              <div className="p-4 border-t border-border dark:border-slate-800 bg-background/80 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground shrink-0">
                    <Paperclip className="w-5 h-5" />
                  </Button>
                  <Input
                    placeholder={`Message ${selectedContact.name}...`}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1 bg-background/50 border-border dark:border-slate-700 text-foreground dark:text-white"
                  />
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground shrink-0">
                    <Smile className="w-5 h-5" />
                  </Button>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim() || isSending}
                    className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shrink-0 disabled:opacity-50"
                    size="icon"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Choose a member from the left panel to start chatting</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {incomingCall && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 p-4 sm:items-center">
          <div className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-[28px] border border-emerald-400/25 bg-[#111b21] text-white shadow-2xl shadow-black/40">
            <div className="bg-[linear-gradient(180deg,rgba(34,197,94,0.16),rgba(17,27,33,0.96))] px-6 py-6">
              <p className="text-xs uppercase tracking-[0.28em] text-emerald-200/80">Incoming call</p>
              <div className="mt-4 flex items-center gap-4">
                <Avatar className="h-16 w-16 border border-white/10">
                  <AvatarFallback className="bg-emerald-500 text-lg font-semibold text-white">
                    {getInitials(incomingCall.callerName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-2xl font-semibold">{incomingCall.callerName}</p>
                  <p className="mt-1 text-sm text-slate-300">Video call</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 px-6 py-5">
              <Button
                type="button"
                onClick={rejectIncomingCall}
                className="h-14 flex-1 rounded-full bg-rose-500 text-white hover:bg-rose-600"
              >
                <PhoneOff className="mr-2 h-5 w-5" />
                Reject
              </Button>
              <Button
                type="button"
                onClick={acceptIncomingCall}
                className="h-14 flex-1 rounded-full bg-emerald-500 text-white hover:bg-emerald-600"
              >
                <Phone className="mr-2 h-5 w-5" />
                Accept
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
