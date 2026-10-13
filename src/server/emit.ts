import { emitSnapshot } from "./auction-engine";
import type { SocketEvent } from "@/types/auction";
export const emit = (roomId: string, event: SocketEvent, payload: object = {}) => emitSnapshot(roomId, event, payload);
