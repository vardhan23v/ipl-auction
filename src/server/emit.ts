import { emitSnapshot } from "./auction-engine";
import type { SocketEvent } from "@/types/auction";
export const emit = (event: SocketEvent, payload: object = {}) => emitSnapshot(event, payload);
