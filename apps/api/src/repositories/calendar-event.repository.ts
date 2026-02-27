import { firestore } from "@/lib/index.js";
import type { CalendarEvent } from "@klayim/shared/types";

const COLLECTION = "calendar_events";

/**
 * Repository for managing calendar events synced from providers
 * All queries include organizationId for multi-tenant isolation
 */
export class CalendarEventRepository {
  private collection = firestore.collection(COLLECTION);

  /**
   * Create a new calendar event
   */
  async create(
    event: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">
  ): Promise<CalendarEvent> {
    const doc = this.collection.doc();
    const now = new Date().toISOString();
    const data: Omit<CalendarEvent, "id"> = {
      ...event,
      createdAt: now,
      updatedAt: now,
    };

    await doc.set(data);
    return { id: doc.id, ...data };
  }

  /**
   * Find calendar event by ID
   */
  async findById(id: string): Promise<CalendarEvent | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return this.mapToCalendarEvent(doc.id, doc.data()!);
  }

  /**
   * Find all calendar events for an organization (multi-tenant scoped)
   * @param organizationId - Organization to filter by
   * @param limit - Maximum number of events to return (default 100)
   */
  async findByOrganization(
    organizationId: string,
    limit: number = 100
  ): Promise<CalendarEvent[]> {
    const snapshot = await this.collection
      .where("organizationId", "==", organizationId)
      .orderBy("startTime", "desc")
      .limit(limit)
      .get();
    return snapshot.docs.map((doc) => this.mapToCalendarEvent(doc.id, doc.data()));
  }

  /**
   * Find all calendar events for a specific integration
   * @param integrationId - Integration ID to filter by
   */
  async findByIntegration(integrationId: string): Promise<CalendarEvent[]> {
    const snapshot = await this.collection
      .where("integrationId", "==", integrationId)
      .orderBy("startTime", "desc")
      .get();
    return snapshot.docs.map((doc) => this.mapToCalendarEvent(doc.id, doc.data()));
  }

  /**
   * Find calendar event by external ID (provider's event ID)
   * Used for idempotent sync to check if event already exists
   *
   * @param integrationId - Integration ID
   * @param externalId - Provider's event ID
   */
  async findByExternalId(
    integrationId: string,
    externalId: string
  ): Promise<CalendarEvent | null> {
    const snapshot = await this.collection
      .where("integrationId", "==", integrationId)
      .where("externalId", "==", externalId)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return this.mapToCalendarEvent(doc.id, doc.data());
  }

  /**
   * Upsert calendar event by external ID
   * Creates if not exists, updates if exists (for idempotent sync)
   *
   * @param integrationId - Integration ID
   * @param externalId - Provider's event ID
   * @param data - Event data (partial for updates)
   */
  async upsertByExternalId(
    integrationId: string,
    externalId: string,
    data: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">
  ): Promise<CalendarEvent> {
    const existing = await this.findByExternalId(integrationId, externalId);
    const now = new Date().toISOString();

    if (existing) {
      // Update existing event
      const updateData = {
        ...data,
        updatedAt: now,
      };
      await this.collection.doc(existing.id).update(updateData);
      return { ...existing, ...updateData };
    } else {
      // Create new event
      const doc = this.collection.doc();
      const newData: Omit<CalendarEvent, "id"> = {
        ...data,
        createdAt: now,
        updatedAt: now,
      };
      await doc.set(newData);
      return { id: doc.id, ...newData };
    }
  }

  /**
   * Delete all calendar events for an integration (bulk delete on disconnect)
   * @param integrationId - Integration ID
   * @returns Number of deleted events
   */
  async deleteByIntegration(integrationId: string): Promise<number> {
    const snapshot = await this.collection
      .where("integrationId", "==", integrationId)
      .get();

    if (snapshot.empty) return 0;

    const batch = firestore.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    return snapshot.size;
  }

  /**
   * Delete cancelled events for an integration (clean up cancelled events)
   * @param integrationId - Integration ID
   * @returns Number of deleted events
   */
  async deleteCancelled(integrationId: string): Promise<number> {
    const snapshot = await this.collection
      .where("integrationId", "==", integrationId)
      .where("status", "==", "cancelled")
      .get();

    if (snapshot.empty) return 0;

    const batch = firestore.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    return snapshot.size;
  }

  /**
   * Update a calendar event
   */
  async update(
    id: string,
    data: Partial<Omit<CalendarEvent, "id" | "createdAt">>
  ): Promise<void> {
    const updateData = {
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await this.collection.doc(id).update(updateData);
  }

  /**
   * Delete a calendar event
   */
  async delete(id: string): Promise<void> {
    await this.collection.doc(id).delete();
  }

  private mapToCalendarEvent(
    id: string,
    data: FirebaseFirestore.DocumentData
  ): CalendarEvent {
    return {
      id,
      organizationId: data.organizationId,
      integrationId: data.integrationId,
      externalId: data.externalId,
      provider: data.provider,
      title: data.title,
      startTime: data.startTime,
      endTime: data.endTime,
      durationMinutes: data.durationMinutes,
      isAllDay: data.isAllDay,
      organizerEmail: data.organizerEmail,
      attendees: data.attendees || [],
      recurringEventId: data.recurringEventId,
      status: data.status,
      calculatedCostCents: data.calculatedCostCents,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}

export const calendarEventRepository = new CalendarEventRepository();
