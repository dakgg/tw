// The UI consumes the API contract directly; this import is erased at build time.
export type {
  Activity, Channel, ChannelConnection, Claim, CleaningTask, ConsoleSnapshot,
  ConsoleStore, DailyRate, Evidence, Guest, InventoryDay, Message, Property,
  Reservation, ReservationStatus, Room, RoomIssue, WorkStatus,
} from '../../../api/src/types';
export type { PublicUser } from '../../../api/src/auth.types';
