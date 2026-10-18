export function findVenueVendorConversation(conversations, venueId, playerUserId, vendorUserId) {
  return conversations.find(item => item.kind === 'venue-vendor'
    && item.venueId === venueId
    && item.playerUserId === playerUserId
    && item.vendorUserId === vendorUserId);
}

export function createVenueVendorConversation({ id, currentUser, venue, vendorProfile, createdAt = new Date().toISOString() }) {
  const vendorUserId = vendorProfile?.ownerUserId;
  if (!id || !currentUser?.id || !venue?.id || !vendorUserId) return null;
  return {
    id,
    kind: 'venue-vendor',
    venueId: venue.id,
    venueName: venue.name,
    vendorId: venue.vendorId,
    vendorUserId,
    playerUserId: currentUser.id,
    playerName: currentUser.name,
    title: venue.name,
    subtitle: `${currentUser.name} · ${venue.name}`,
    participantIds: [currentUser.id, vendorUserId],
    unreadByUser: { [currentUser.id]: 0, [vendorUserId]: 0 },
    lastMessage: 'Conversation started. Send a message to the vendor.',
    lastAt: createdAt,
    createdAt,
  };
}
