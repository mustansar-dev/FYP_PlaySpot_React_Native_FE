import { toLocalDateKey } from '../utils/booking';

function dateAfter(days) {
  const now = new Date();
  return toLocalDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, 12));
}

export function createDemoCommunityState() {
  const tomorrow = dateAfter(1);
  const weekend = dateAfter(2);
  const followingDay = dateAfter(3);
  const rooms = [
    {
      id: 'room-demo-gulberg-futsal',
      title: 'Gulberg evening futsal',
      sport: 'Futsal',
      location: 'Gulberg III, Lahore',
      date: tomorrow,
      startTime: '19:00',
      visibility: 'public',
      joinCode: '',
      capacity: 8,
      costPerParticipantPKR: 900,
      status: 'open',
      createdBy: 'demo-player-001',
      createdByName: 'Amina Shah',
      members: [
        { userId: 'demo-player-001', name: 'Amina Shah', joinedAt: '2026-10-16T09:00:00.000Z' },
        { userId: 'demo-player-002', name: 'Hamza R.', joinedAt: '2026-10-16T09:10:00.000Z' },
        { userId: 'demo-player-003', name: 'Mariam N.', joinedAt: '2026-10-16T09:20:00.000Z' },
      ],
      createdAt: '2026-10-16T08:30:00.000Z',
    },
    {
      id: 'room-demo-model-badminton',
      title: 'Saturday badminton doubles',
      sport: 'Badminton',
      location: 'Model Town, Lahore',
      date: weekend,
      startTime: '17:30',
      visibility: 'public',
      joinCode: '',
      capacity: 4,
      costPerParticipantPKR: 600,
      status: 'open',
      createdBy: 'demo-player-004',
      createdByName: 'Zoya M.',
      members: [
        { userId: 'demo-player-004', name: 'Zoya M.', joinedAt: '2026-10-16T08:45:00.000Z' },
        { userId: 'demo-player-005', name: 'Aliya S.', joinedAt: '2026-10-16T08:50:00.000Z' },
      ],
      createdAt: '2026-10-16T08:40:00.000Z',
    },
    {
      id: 'room-demo-dha-padel-private',
      title: 'DHA padel group',
      sport: 'Padel',
      location: 'DHA Phase 5, Lahore',
      date: followingDay,
      startTime: '20:00',
      visibility: 'private',
      joinCode: 'PADEL24',
      capacity: 6,
      costPerParticipantPKR: 1100,
      status: 'open',
      createdBy: 'demo-player-006',
      createdByName: 'Bilal H.',
      members: [
        { userId: 'demo-player-006', name: 'Bilal H.', joinedAt: '2026-10-16T10:00:00.000Z' },
        { userId: 'demo-player-007', name: 'Sana K.', joinedAt: '2026-10-16T10:10:00.000Z' },
      ],
      createdAt: '2026-10-16T09:55:00.000Z',
    },
  ];

  const conversations = [
    {
      id: 'conversation-demo-venue',
      kind: 'venue-vendor',
      venueId: 'venue-demo-gulberg',
      venueName: 'Greenline Futsal Club',
      vendorId: 'vendor-demo-gulberg',
      vendorUserId: 'demo-vendor-001',
      playerUserId: 'demo-player-001',
      playerName: 'Amina Shah',
      title: 'Greenline Futsal Club',
      subtitle: 'Venue provider · local demo',
      participantIds: ['demo-player-001', 'demo-vendor-001'],
      unreadByUser: { 'demo-player-001': 1, 'demo-vendor-001': 0 },
      lastMessage: 'The evening court is ready for your group.',
      lastAt: '2026-10-16T11:40:00.000Z',
      createdAt: '2026-10-16T11:20:00.000Z',
    },
    {
      id: 'conversation-demo-team',
      title: 'DHA Futsal Squad',
      subtitle: 'Game room players · local demo',
      participantIds: ['demo-player-001', 'demo-player-002', 'demo-player-003'],
      unreadByUser: { 'demo-player-001': 0, 'demo-player-002': 1, 'demo-player-003': 0 },
      lastMessage: 'I can bring an extra ball.',
      lastAt: '2026-10-16T10:15:00.000Z',
      createdAt: '2026-10-16T10:00:00.000Z',
    },
    {
      id: 'conversation-demo-support',
      title: 'PlaySpot venue team',
      subtitle: 'Demo conversation · local only',
      participantIds: ['demo-player-001', 'demo-vendor-001'],
      unreadByUser: { 'demo-player-001': 0, 'demo-vendor-001': 1 },
      lastMessage: 'You can ask about the sample venue details here.',
      lastAt: '2026-10-15T14:10:00.000Z',
      createdAt: '2026-10-15T14:00:00.000Z',
    },
  ];

  const messages = [
    { id: 'message-demo-venue-1', conversationId: 'conversation-demo-venue', senderId: 'demo-player-001', senderName: 'Amina Shah', body: 'Is the 7 PM futsal slot available?', createdAt: '2026-10-16T11:25:00.000Z' },
    { id: 'message-demo-venue-2', conversationId: 'conversation-demo-venue', senderId: 'demo-vendor-001', senderName: 'Bilal Ahmed', body: 'The evening court is ready for your group.', createdAt: '2026-10-16T11:40:00.000Z' },
    { id: 'message-demo-team-1', conversationId: 'conversation-demo-team', senderId: 'demo-player-002', senderName: 'Hamza R.', body: 'I can bring an extra ball.', createdAt: '2026-10-16T10:15:00.000Z' },
    { id: 'message-demo-support-1', conversationId: 'conversation-demo-support', senderId: 'demo-vendor-001', senderName: 'Bilal Ahmed', body: 'You can ask about the sample venue details here.', createdAt: '2026-10-15T14:10:00.000Z' },
  ];

  const tournaments = [
    {
      id: 'tournament-demo-futsal-cup',
      title: 'Lahore Weekend Futsal Cup',
      sport: 'Futsal',
      location: 'Greenline Futsal Club · Gulberg III',
      date: weekend,
      startTime: '16:00',
      capacity: 16,
      status: 'upcoming',
      demoEntryFeePKR: 500,
      createdBy: 'demo-player-001',
      participants: [
        { userId: 'demo-player-001', name: 'Amina Shah', joinedAt: '2026-10-16T09:00:00.000Z' },
        { userId: 'demo-player-002', name: 'Hamza R.', joinedAt: '2026-10-16T09:10:00.000Z' },
        { userId: 'demo-player-003', name: 'Mariam N.', joinedAt: '2026-10-16T09:20:00.000Z' },
      ],
      createdAt: '2026-10-16T08:55:00.000Z',
    },
    {
      id: 'tournament-demo-badminton-open',
      title: 'Model Town Badminton Open',
      sport: 'Badminton',
      location: 'Model Town Badminton Hall',
      date: followingDay,
      startTime: '10:00',
      capacity: 12,
      status: 'upcoming',
      demoEntryFeePKR: 350,
      createdBy: 'demo-player-004',
      participants: [
        { userId: 'demo-player-004', name: 'Zoya M.', joinedAt: '2026-10-16T09:15:00.000Z' },
        { userId: 'demo-player-005', name: 'Aliya S.', joinedAt: '2026-10-16T09:30:00.000Z' },
      ],
      createdAt: '2026-10-16T09:00:00.000Z',
    },
  ];

  const leaderboard = [
    { id: 'rank-demo-adeel', name: 'Adeel Khan', sport: 'Futsal', points: 1840, wins: 22 },
    { id: 'rank-demo-ibrahim', name: 'Ibrahim Sattar', sport: 'Futsal', points: 1715, wins: 19 },
    { id: 'rank-demo-mustansar', name: 'Mustansar A.', sport: 'Futsal', points: 1650, wins: 18 },
    { id: 'rank-demo-hasham', name: 'Hasham N.', sport: 'Futsal', points: 1510, wins: 16 },
    { id: 'rank-demo-zoya', name: 'Zoya M.', sport: 'Badminton', points: 1430, wins: 17 },
    { id: 'rank-demo-aliyan', name: 'Aliyan R.', sport: 'Badminton', points: 1320, wins: 14 },
    { id: 'rank-demo-sana', name: 'Sana K.', sport: 'Padel', points: 1280, wins: 13 },
  ];

  return { rooms, conversations, messages, tournaments, leaderboard, splits: [] };
}
