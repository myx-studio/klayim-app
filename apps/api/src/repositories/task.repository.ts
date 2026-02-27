import { firestore } from "@/lib/index.js";
import type { Task, TaskSyncState, TaskProvider } from "@klayim/shared/types";

const TASKS_COLLECTION = "tasks";
const TASK_SYNC_STATES_COLLECTION = "taskSyncStates";

/**
 * Repository for managing task records synced from task management providers
 * All queries are scoped by organizationId for multi-tenant isolation
 */
export class TaskRepository {
  private collection = firestore.collection(TASKS_COLLECTION);
  private syncStatesCollection = firestore.collection(TASK_SYNC_STATES_COLLECTION);

  /**
   * Upsert a task by externalId (idempotent)
   * If task with same provider + externalId exists, update it; otherwise create
   */
  async upsertTask(task: Omit<Task, "id">): Promise<Task> {
    // Find existing by provider + externalId
    const existingQuery = this.collection
      .where("organizationId", "==", task.organizationId)
      .where("provider", "==", task.provider)
      .where("externalId", "==", task.externalId)
      .limit(1);

    const existing = await existingQuery.get();

    let taskId: string;
    if (!existing.empty) {
      taskId = existing.docs[0].id;
    } else {
      taskId = this.collection.doc().id;
    }

    const taskDoc: Task = {
      ...task,
      id: taskId,
    };

    // Remove undefined values (Firestore doesn't accept undefined)
    const cleanData = Object.fromEntries(
      Object.entries(taskDoc).filter(([, v]) => v !== undefined)
    );

    await this.collection.doc(taskId).set(cleanData);
    return taskDoc;
  }

  /**
   * Bulk upsert tasks (more efficient for initial sync)
   * Uses batched writes for better performance
   */
  async bulkUpsertTasks(tasks: Omit<Task, "id">[]): Promise<number> {
    if (tasks.length === 0) return 0;

    let count = 0;
    let batch = firestore.batch();
    let batchCount = 0;

    for (const task of tasks) {
      // Find existing
      const existingQuery = this.collection
        .where("organizationId", "==", task.organizationId)
        .where("provider", "==", task.provider)
        .where("externalId", "==", task.externalId)
        .limit(1);

      const existing = await existingQuery.get();

      let taskId: string;
      if (!existing.empty) {
        taskId = existing.docs[0].id;
      } else {
        taskId = this.collection.doc().id;
      }

      const taskDoc: Task = { ...task, id: taskId };

      // Remove undefined values
      const cleanData = Object.fromEntries(
        Object.entries(taskDoc).filter(([, v]) => v !== undefined)
      );

      batch.set(this.collection.doc(taskId), cleanData);
      count++;
      batchCount++;

      // Firestore batch limit is 500
      if (batchCount >= 400) {
        await batch.commit();
        batch = firestore.batch();
        batchCount = 0;
      }
    }

    // Commit remaining items
    if (batchCount > 0) {
      await batch.commit();
    }

    return count;
  }

  /**
   * Get all tasks for an organization
   */
  async findByOrganization(organizationId: string): Promise<Task[]> {
    const snapshot = await this.collection
      .where("organizationId", "==", organizationId)
      .get();
    return snapshot.docs.map((doc) => this.mapToTask(doc.id, doc.data()));
  }

  /**
   * Get tasks by integration
   */
  async findByIntegration(integrationId: string): Promise<Task[]> {
    const snapshot = await this.collection
      .where("integrationId", "==", integrationId)
      .get();
    return snapshot.docs.map((doc) => this.mapToTask(doc.id, doc.data()));
  }

  /**
   * Delete tasks for an integration (on disconnect)
   */
  async deleteByIntegration(integrationId: string): Promise<number> {
    const tasks = await this.findByIntegration(integrationId);

    if (tasks.length === 0) return 0;

    let batch = firestore.batch();
    let batchCount = 0;

    for (const task of tasks) {
      batch.delete(this.collection.doc(task.id));
      batchCount++;

      // Firestore batch limit is 500
      if (batchCount >= 400) {
        await batch.commit();
        batch = firestore.batch();
        batchCount = 0;
      }
    }

    // Commit remaining
    if (batchCount > 0) {
      await batch.commit();
    }

    return tasks.length;
  }

  /**
   * Get sync state for an integration
   */
  async getSyncState(integrationId: string): Promise<TaskSyncState | null> {
    const doc = await this.syncStatesCollection.doc(integrationId).get();
    if (!doc.exists) return null;
    return doc.data() as TaskSyncState;
  }

  /**
   * Update sync state
   * Uses integrationId as document ID for 1:1 mapping
   */
  async updateSyncState(state: TaskSyncState): Promise<void> {
    // Remove undefined values
    const cleanData = Object.fromEntries(
      Object.entries(state).filter(([, v]) => v !== undefined)
    );
    await this.syncStatesCollection.doc(state.integrationId).set(cleanData);
  }

  /**
   * Delete sync state for an integration
   */
  async deleteSyncState(integrationId: string): Promise<void> {
    await this.syncStatesCollection.doc(integrationId).delete();
  }

  /**
   * Find task by external ID (for webhook updates)
   */
  async findByExternalId(
    organizationId: string,
    provider: TaskProvider,
    externalId: string
  ): Promise<Task | null> {
    const snapshot = await this.collection
      .where("organizationId", "==", organizationId)
      .where("provider", "==", provider)
      .where("externalId", "==", externalId)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return this.mapToTask(snapshot.docs[0].id, snapshot.docs[0].data());
  }

  private mapToTask(id: string, data: FirebaseFirestore.DocumentData): Task {
    return {
      id,
      organizationId: data.organizationId,
      integrationId: data.integrationId,
      provider: data.provider,
      externalId: data.externalId,
      title: data.title,
      description: data.description,
      status: data.status,
      assigneeEmail: data.assigneeEmail,
      assigneeExternalId: data.assigneeExternalId,
      assigneeName: data.assigneeName,
      createdAt: data.createdAt,
      completedAt: data.completedAt,
      dueAt: data.dueAt,
      timeSpentMinutes: data.timeSpentMinutes,
      timeEstimateMinutes: data.timeEstimateMinutes,
      estimatePoints: data.estimatePoints,
      projectId: data.projectId,
      projectName: data.projectName,
      workspaceId: data.workspaceId,
      syncedAt: data.syncedAt,
      updatedAt: data.updatedAt,
    };
  }
}

export const taskRepository = new TaskRepository();
