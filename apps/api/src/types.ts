export type Channel = 'direct' | 'airbnb' | 'booking' | 'trip' | 'expedia' | 'agoda';
export type ReservationStatus = 'confirmed' | 'checked-in' | 'checked-out' | 'cancelled';
export type WorkStatus = 'todo' | 'in-progress' | 'done';
export type Property = { id: string; name: string; address: string };
export type Room = { id: string; propertyId: string; name: string; type: string; capacity: number; baseRate: number };
export type Guest = { id: string; propertyId: string; name: string; email: string; note: string };
export type Reservation = {
  id: string; propertyId: string; roomId: string; guestId: string; channel: Channel;
  checkIn: string; checkOut: string; guests: number; total: number; commission: number;
  settled: boolean; status: ReservationStatus; note: string; createdAt: string;
};
export type CleaningTask = {
  id: string; propertyId: string; roomId: string; reservationId?: string;
  date: string; assignee: string; status: WorkStatus; note: string;
};
export type RoomIssue = {
  id: string; propertyId: string; roomId: string; title: string; description: string;
  priority: 'normal' | 'urgent'; status: WorkStatus; createdAt: string;
};
export type Message = {
  id: string; propertyId: string; reservationId: string; text: string;
  direction: 'inbound' | 'draft'; read: boolean; createdAt: string;
};
export type Evidence = { id: string; name: string; dataUrl: string; createdAt: string };
export type Claim = {
  id: string; propertyId: string; reservationId: string; title: string; description: string;
  amount: number; status: 'collecting' | 'ready' | 'closed'; evidence: Evidence[]; createdAt: string;
};
export type DailyRate = { roomId: string; date: string; price: number; closed: boolean };
export type ChannelConnection = {
  id: string; propertyId: string; channel: Exclude<Channel, 'direct'>;
  externalId: string; status: 'not-connected' | 'setup-saved'; updatedAt: string | null;
};
export type Activity = { id: string; propertyId: string; text: string; createdAt: string };
export type ConsoleStore = {
  version: 1; mode: 'demo' | 'local'; properties: Property[]; rooms: Room[]; guests: Guest[];
  reservations: Reservation[]; cleaning: CleaningTask[]; issues: RoomIssue[]; messages: Message[];
  claims: Claim[]; rates: DailyRate[]; connections: ChannelConnection[]; activity: Activity[];
};
export type ConsoleSnapshot = ConsoleStore & { today: string; integration: 'unavailable' };
export type InventoryDay = { roomId: string; date: string; price: number; available: boolean; closed: boolean; reservationId: string | null };
