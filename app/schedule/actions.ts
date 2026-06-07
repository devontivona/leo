"use server";

// Thin Server Action wrappers. All validation, authorization, and SQL live in the
// server-only DAL (data/events.ts); these just cross the client→server boundary.
// No revalidateTag here — the client tree holds events in useState and refetches
// after each mutation (revalidation wouldn't update client state).

import {
  createDiaper,
  createTimedEvent,
  deleteEvent,
  getActiveEvents,
  listEvents,
  startTimedEvent,
  stopTimedEvent,
  type CreateDiaperInput,
  type CreateTimedInput,
  type StartTimedInput,
} from "@/data/events";

export async function listEventsAction(opts?: { limit?: number }) {
  return listEvents(opts);
}

export async function getActiveEventsAction() {
  return getActiveEvents();
}

export async function startTimedAction(input: StartTimedInput) {
  return startTimedEvent(input);
}

export async function stopTimedAction(input: { id: string }) {
  return stopTimedEvent(input);
}

export async function createTimedAction(input: CreateTimedInput) {
  return createTimedEvent(input);
}

export async function createDiaperAction(input: CreateDiaperInput) {
  return createDiaper(input);
}

export async function deleteEventAction(input: { id: string }) {
  return deleteEvent(input);
}
