/**
 * Operational Chat Screen (Phase 5 Part 2)
 * Phone & Tablet responsive operational comms, pinned directives,
 * @mentions, shared mapped cards, recoverable send failures, and channel switching.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Header, Avatar, Input, Button, Badge, Card, Modal } from '../../components/ui';
import {
  Send,
  Pin,
  MapPin,
  Paperclip,
  MessageSquare,
  AlertTriangle,
  ShoppingBag,
  AtSign,
  ChevronLeft,
  Users,
  RefreshCw,
  Info,
} from 'lucide-react';
import { ChatChannel, ChatMessage } from '../../types';
import { ChatRepository, BusinessRepository } from '../../db';

export const ChatScreen: React.FC = () => {
  const {
    currentUser,
    isOffline,
    toggleOffline,
    syncStatus,
    pendingSyncCount,
    unreadNotifsCount,
    navigateTo,
  } = useApp();

  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>('chn_team_alpha_01');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [recentBusinesses, setRecentBusinesses] = useState<any[]>([]);
  const [sendError, setSendError] = useState<string | null>(null);
  const [failedMessage, setFailedMessage] = useState<string | null>(null);

  // Phone responsive state: mobileListView vs conversationView
  const [showMobileList, setShowMobileList] = useState(false);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load Channels & Messages
  const loadChatData = useCallback(async () => {
    try {
      const chns = await ChatRepository.getAllChannels();
      setChannels(chns);
      const targetChnId = activeChannelId || (chns[0]?.id ?? 'chn_team_alpha_01');
      const msgs = await ChatRepository.getMessages(targetChnId);
      setMessages(msgs);

      const bizes = await BusinessRepository.getAll();
      setRecentBusinesses(bizes.slice(0, 10));
    } catch (err) {
      console.error('Failed loading chat data:', err);
    }
  }, [activeChannelId]);

  useEffect(() => {
    loadChatData();
  }, [loadChatData]);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeChannel = channels.find((c) => c.id === activeChannelId) || channels[0] || {
    id: 'chn_team_alpha_01',
    name: 'Lagos West Alpha Channel',
    channelType: 'team',
    description: 'Main operational team channel',
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textToSend = (messageText || failedMessage || '').trim();
    if (!textToSend) return;

    setMessageText('');
    setSendError(null);
    setFailedMessage(null);

    try {
      await ChatRepository.sendMessage({
        channelId: activeChannel.id,
        senderId: currentUser.id,
        senderName: currentUser.fullName,
        senderRole: currentUser.role,
        text: textToSend,
      });
      await loadChatData();
    } catch (err) {
      console.error('Failed sending chat message:', err);
      setSendError('CHAT SEND FAILED — Message retained locally for retry.');
      setFailedMessage(textToSend);
    }
  };

  // Share GPS Location
  const handleShareLocation = async () => {
    await ChatRepository.sendMessage({
      channelId: activeChannel.id,
      senderId: currentUser.id,
      senderName: currentUser.fullName,
      senderRole: currentUser.role,
      text: '📍 Shared current GPS survey waypoint in Line A corridor.',
      sharedLocation: {
        latitude: 6.4528,
        longitude: 3.1904,
        label: 'Line A (Inverters & Solar) Sector 1',
      },
    });
    setShowAttachModal(false);
    await loadChatData();
  };

  // Share Stall Card
  const handleShareBusiness = async (biz: any) => {
    await ChatRepository.sendMessage({
      channelId: activeChannel.id,
      senderId: currentUser.id,
      senderName: currentUser.fullName,
      senderRole: currentUser.role,
      text: `🏪 Mapped business record: ${biz.name} (${biz.operationalLabel || 'Stall'})`,
      linkedBusinessId: biz.id,
      linkedBusinessName: `${biz.name} (${biz.operationalLabel || 'Stall'})`,
    });
    setShowAttachModal(false);
    await loadChatData();
  };

  // Share Hazard Notice
  const handleShareHazard = async () => {
    await ChatRepository.sendMessage({
      channelId: activeChannel.id,
      senderId: currentUser.id,
      senderName: currentUser.fullName,
      senderRole: currentUser.role,
      text: '⚠️ Roadblock Alert: Gate 3 Access Road undergoing heavy machinery grading.',
      linkedIssueTitle: 'Gate 3 Road Grading & Drainage Work',
    });
    setShowAttachModal(false);
    await loadChatData();
  };

  // Mention User in Composer
  const handleMentionUser = (userName: string) => {
    setMessageText((prev) => `${prev} @${userName} `);
  };

  const pinnedMessages = messages.filter((m) => m.isPinned);

  return (
    <div className="flex flex-col grow h-full overflow-hidden">
      <Header
        title={activeChannel.name}
        subtitle="Operational Comms & Team Chat"
        isOffline={isOffline}
        onToggleOffline={toggleOffline}
        syncStatus={syncStatus}
        pendingSyncCount={pendingSyncCount}
        unreadNotifsCount={unreadNotifsCount}
        onPressNotifications={() => navigateTo('notifications')}
      />

      {/* TABLET RESPONSIVE SPLIT LAYOUT (5AX) */}
      <div className="grow grid grid-cols-1 md:grid-cols-12 max-w-7xl w-full mx-auto h-full overflow-hidden bg-white">
        {/* LEFT COLUMN: CHANNELS / GROUP LIST (4 cols on MD+) */}
        <div
          className={`${
            showMobileList ? 'block' : 'hidden'
          } md:block md:col-span-4 border-r border-zinc-200 bg-zinc-50/60 p-3 overflow-y-auto space-y-2`}
        >
          <div className="flex items-center justify-between pb-2 border-b border-zinc-200 px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-700" /> Operational Groups
            </span>
            <Badge variant="neutral" size="sm">{channels.length} Channels</Badge>
          </div>

          <div className="space-y-1">
            {channels.map((ch) => {
              const isActive = ch.id === activeChannel.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => {
                    setActiveChannelId(ch.id);
                    setShowMobileList(false);
                  }}
                  className={`w-full p-3 rounded-xl text-left transition-all flex items-start gap-3 border ${
                    isActive
                      ? 'bg-emerald-800 text-white border-emerald-800 shadow-sm'
                      : 'bg-white text-zinc-900 border-zinc-200 hover:bg-zinc-100'
                  }`}
                >
                  <MessageSquare className={`w-4 h-4 shrink-0 mt-0.5 ${isActive ? 'text-emerald-200' : 'text-emerald-700'}`} />
                  <div className="min-w-0 grow">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs truncate">{ch.name}</span>
                      <span className={`text-[10px] ${isActive ? 'text-emerald-200' : 'text-zinc-400'}`}>
                        12m
                      </span>
                    </div>
                    <p className={`text-[11px] truncate mt-0.5 ${isActive ? 'text-emerald-100' : 'text-zinc-500'}`}>
                      {ch.description || 'Active field team discussion'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: CONVERSATION THREAD & COMPOSER (8 cols on MD+) */}
        <div
          className={`${
            showMobileList ? 'hidden' : 'flex'
          } md:flex md:col-span-8 flex-col h-full overflow-hidden bg-white`}
        >
          {/* Channel Header Bar */}
          <div className="p-3 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/50 shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowMobileList(true)}
                className="md:hidden p-1.5 rounded-lg text-zinc-600 hover:bg-zinc-200"
                title="View Channels"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 className="font-bold text-sm text-zinc-900">{activeChannel.name}</h3>
                <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                  <Users className="w-3 h-3 text-emerald-700" /> Team Crew Online • Encrypted Local Storage
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGroupInfoModal(true)}
                icon={<Info className="w-3.5 h-3.5 text-zinc-700" />}
              >
                Group Info
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAttachModal(true)}
                icon={<Paperclip className="w-3.5 h-3.5 text-emerald-700" />}
              >
                Share Waypoint
              </Button>
            </div>
          </div>

          {/* Pinned Operational Notice Banner */}
          {pinnedMessages.length > 0 && (
            <div className="p-3 bg-amber-50 border-b border-amber-200 flex items-start gap-2.5 text-xs text-amber-950 shrink-0">
              <Pin className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="font-bold block uppercase tracking-wider text-[10px] text-amber-800">
                  Pinned Lead Directive
                </span>
                <p className="text-xs text-amber-900 mt-0.5 font-medium">
                  {pinnedMessages[pinnedMessages.length - 1].text}
                </p>
              </div>
            </div>
          )}

          {/* Recoverable Send Failure Alert (5BE) */}
          {sendError && (
            <div className="p-3 bg-red-50 border-b border-red-200 flex items-center justify-between text-xs text-red-900 shrink-0">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
                <span>{sendError}</span>
              </div>
              <Button variant="primary" size="sm" onClick={() => handleSendMessage()}>
                Retry Send
              </Button>
            </div>
          )}

          {/* Message Thread */}
          <div className="grow overflow-y-auto p-4 space-y-3.5">
            {/* Empty State for Chat (5BC) */}
            {messages.length === 0 && (
              <div className="text-center py-16 text-zinc-400 text-xs">
                <MessageSquare className="w-8 h-8 mx-auto text-zinc-300 mb-2" />
                Start the operational conversation.
              </div>
            )}

            {messages.map((msg) => {
              const isMe = msg.senderId === currentUser.id;
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {!isMe && <Avatar name={msg.senderName} size="sm" status="online" />}

                  {/* Bubble width constrained for tablet (5AX) */}
                  <div
                    className={`max-w-xs sm:max-w-md md:max-w-lg p-3 rounded-2xl text-xs space-y-1.5 ${
                      isMe
                        ? 'bg-emerald-800 text-white rounded-tr-xs shadow-xs'
                        : 'bg-zinc-100 border border-zinc-200 text-zinc-900 rounded-tl-xs shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold ${isMe ? 'text-emerald-100' : 'text-zinc-800'}`}>
                          {isMe ? 'You' : msg.senderName}
                        </span>
                        {msg.senderRole && (
                          <span
                            className={`text-[9px] px-1 py-0.2 rounded font-semibold uppercase ${
                              msg.senderRole === 'team_lead'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-zinc-200 text-zinc-700'
                            }`}
                          >
                            {msg.senderRole.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={isMe ? 'text-emerald-200' : 'text-zinc-400'}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {!isMe && (
                          <button
                            onClick={() => handleMentionUser(msg.senderName)}
                            className="text-zinc-400 hover:text-emerald-700"
                            title="Reply / Mention"
                          >
                            <AtSign className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                    {/* Shared Location Card */}
                    {msg.sharedLocation && (
                      <div
                        onClick={() => navigateTo('map')}
                        className="mt-1.5 p-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-900 flex items-center justify-between text-xs cursor-pointer hover:bg-zinc-50 transition-all shadow-2xs"
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
                          <div>
                            <span className="font-bold block text-[11px]">{msg.sharedLocation.label}</span>
                            <span className="text-[10px] text-zinc-500">
                              {msg.sharedLocation.latitude.toFixed(4)}, {msg.sharedLocation.longitude.toFixed(4)}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-800">View Map →</span>
                      </div>
                    )}

                    {/* Linked Business Card */}
                    {msg.linkedBusinessName && (
                      <div
                        onClick={() => navigateTo('businesses')}
                        className="mt-1.5 p-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-900 flex items-center justify-between text-xs cursor-pointer hover:bg-zinc-50 transition-all shadow-2xs"
                      >
                        <div className="flex items-center gap-2">
                          <ShoppingBag className="w-4 h-4 text-emerald-700 shrink-0" />
                          <div>
                            <span className="font-bold block text-[11px]">{msg.linkedBusinessName}</span>
                            <span className="text-[10px] text-zinc-500">Verified offline store</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-800">Details →</span>
                      </div>
                    )}

                    {/* Linked Issue Card */}
                    {msg.linkedIssueTitle && (
                      <div
                        onClick={() => navigateTo('missions')}
                        className="mt-1.5 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 flex items-center justify-between text-xs cursor-pointer hover:bg-amber-100 transition-all shadow-2xs"
                      >
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                          <div>
                            <span className="font-bold block text-[11px]">{msg.linkedIssueTitle}</span>
                            <span className="text-[10px] text-amber-800">Field Hazard</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-amber-900">Missions →</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Sticky Message Composer (5AW) */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 border-t border-zinc-200 bg-zinc-50 flex items-center gap-2 shrink-0"
          >
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setShowAttachModal(true)}
              icon={<Paperclip className="w-4 h-4 text-zinc-700" />}
              title="Attach Waypoint or Business Card"
            />

            <Input
              placeholder="Type operational field update or use @Name..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="grow"
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              icon={<Send className="w-4 h-4" />}
            >
              Send
            </Button>
          </form>
        </div>
      </div>

      {/* Modal: Attach Operational Entity */}
      {showAttachModal && (
        <Modal
          isOpen={showAttachModal}
          onClose={() => setShowAttachModal(false)}
          title="Attach Field Entity to Message"
        >
          <div className="space-y-3">
            <p className="text-xs text-zinc-600">
              Quickly share verified waypoints, stalls, or hazard alerts with your survey crew:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Button
                variant="outline"
                size="md"
                onClick={handleShareLocation}
                icon={<MapPin className="w-4 h-4 text-emerald-700" />}
                className="justify-start text-xs font-semibold"
              >
                Share GPS Waypoint
              </Button>

              <Button
                variant="outline"
                size="md"
                onClick={handleShareHazard}
                icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
                className="justify-start text-xs font-semibold"
              >
                Share Hazard Notice
              </Button>
            </div>

            {recentBusinesses.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-zinc-200">
                <span className="text-xs font-bold text-zinc-700 block">
                  Attach Recent Mapped Stall:
                </span>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {recentBusinesses.slice(0, 5).map((b) => (
                    <div
                      key={b.id}
                      onClick={() => handleShareBusiness(b)}
                      className="p-2 rounded-lg border border-zinc-200 hover:border-emerald-500 hover:bg-emerald-50/50 cursor-pointer flex items-center justify-between text-xs transition-all"
                    >
                      <div>
                        <span className="font-semibold text-zinc-900 block">{b.name}</span>
                        <span className="text-[10px] text-zinc-500">
                          Label: {b.operationalLabel || 'B001'} • Area: {b.marketSector || 'General'}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-800">Attach +</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
      {/* Modal: Group Info */}
      {showGroupInfoModal && (
        <Modal
          isOpen={showGroupInfoModal}
          onClose={() => setShowGroupInfoModal(false)}
          title={`Group Info: ${activeChannel.name}`}
        >
          <div className="space-y-3.5">
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1 text-xs">
              <span className="font-bold text-zinc-900 block">{activeChannel.name}</span>
              <p className="text-zinc-600">{activeChannel.description || 'Main team operational coordination channel.'}</p>
              <div className="flex gap-2 pt-1 text-[11px] text-emerald-800">
                <Badge variant="accent" size="sm">Operational Group</Badge>
                <Badge variant="neutral" size="sm">Local Encrypted Cache</Badge>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Assigned Team Members ({2})
              </h4>
              <div className="space-y-1.5">
                <div className="p-2.5 rounded-lg border border-zinc-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Avatar name="Ibrahim Danladi" size="sm" status="online" />
                    <div>
                      <span className="font-bold text-zinc-900 block">Ibrahim Danladi</span>
                      <span className="text-[10px] text-zinc-500">Assigned Area: Sector 1 Corridor</span>
                    </div>
                  </div>
                  <Badge variant="warning" size="sm">TEAM LEAD</Badge>
                </div>
                <div className="p-2.5 rounded-lg border border-zinc-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Avatar name="Chioma Adebayo" size="sm" status="online" />
                    <div>
                      <span className="font-bold text-zinc-900 block">Chioma Adebayo</span>
                      <span className="text-[10px] text-zinc-500">Assigned Area: Line A Inverter Section</span>
                    </div>
                  </div>
                  <Badge variant="neutral" size="sm">MAPPER</Badge>
                </div>
              </div>
            </div>

            {pinnedMessages.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-zinc-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1">
                  <Pin className="w-3.5 h-3.5 text-amber-700" /> Pinned Directives ({pinnedMessages.length})
                </h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {pinnedMessages.map((pm) => (
                    <div key={pm.id} className="p-2 bg-amber-50 rounded-lg text-xs text-amber-950 border border-amber-200">
                      <p className="font-medium">{pm.text}</p>
                      <span className="text-[10px] text-amber-700 block mt-0.5">By {pm.senderName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-zinc-200">
              <Button variant="primary" size="sm" onClick={() => setShowGroupInfoModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
