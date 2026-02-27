import { firestore } from "@/lib/index.js";
import type {
  Employee,
  EmployeeSourceType,
  EmploymentStatus,
} from "@klayim/shared/types";

const COLLECTION = "employees";

/**
 * Repository for managing employee records
 * All queries are scoped by organizationId for multi-tenant isolation
 */
export class EmployeeRepository {
  private collection = firestore.collection(COLLECTION);

  /**
   * Create a new employee record
   */
  async create(employee: Omit<Employee, "id" | "createdAt" | "updatedAt">): Promise<Employee> {
    const doc = this.collection.doc();
    const now = new Date().toISOString();
    const data = {
      ...employee,
      createdAt: now,
      updatedAt: now,
    };

    // Remove undefined values (Firestore doesn't accept undefined)
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined)
    );

    await doc.set(cleanData);
    return { id: doc.id, ...data } as Employee;
  }

  /**
   * Find employee by ID
   */
  async findById(id: string): Promise<Employee | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return this.mapToEmployee(doc.id, doc.data()!);
  }

  /**
   * Find all employees for an organization (multi-tenant scoped)
   */
  async findByOrganization(organizationId: string): Promise<Employee[]> {
    const snapshot = await this.collection
      .where("organizationId", "==", organizationId)
      .get();
    return snapshot.docs.map((doc) => this.mapToEmployee(doc.id, doc.data()));
  }

  /**
   * Find employee by email within an organization
   * Used for matching meeting attendees to employee records
   */
  async findByEmail(organizationId: string, email: string): Promise<Employee | null> {
    const snapshot = await this.collection
      .where("organizationId", "==", organizationId)
      .where("email", "==", email.toLowerCase())
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return this.mapToEmployee(snapshot.docs[0].id, snapshot.docs[0].data());
  }

  /**
   * Find employee by external source ID (for HRIS sync deduplication)
   */
  async findBySourceId(
    organizationId: string,
    sourceType: EmployeeSourceType,
    sourceId: string
  ): Promise<Employee | null> {
    const snapshot = await this.collection
      .where("organizationId", "==", organizationId)
      .where("sourceType", "==", sourceType)
      .where("sourceId", "==", sourceId)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return this.mapToEmployee(snapshot.docs[0].id, snapshot.docs[0].data());
  }

  /**
   * Update employee record
   */
  async update(id: string, data: Partial<Omit<Employee, "id" | "createdAt">>): Promise<void> {
    const updateData = {
      ...data,
      updatedAt: new Date().toISOString(),
    };
    // Remove undefined values
    const cleanData = Object.fromEntries(
      Object.entries(updateData).filter(([, v]) => v !== undefined)
    );
    await this.collection.doc(id).update(cleanData);
  }

  /**
   * Upsert employee by source ID (for HRIS sync)
   * HRIS is source of truth - always overwrite on sync
   */
  async upsertBySourceId(
    organizationId: string,
    sourceType: EmployeeSourceType,
    sourceId: string,
    data: Omit<Employee, "id" | "createdAt" | "updatedAt" | "organizationId" | "sourceType" | "sourceId">
  ): Promise<Employee> {
    const existing = await this.findBySourceId(organizationId, sourceType, sourceId);

    if (existing) {
      await this.update(existing.id, {
        ...data,
        lastSyncedAt: new Date().toISOString(),
      });
      return { ...existing, ...data, updatedAt: new Date().toISOString() };
    }

    return this.create({
      ...data,
      organizationId,
      sourceType,
      sourceId,
      lastSyncedAt: new Date().toISOString(),
    });
  }

  /**
   * Delete employee record
   */
  async delete(id: string): Promise<void> {
    await this.collection.doc(id).delete();
  }

  /**
   * Delete employee by source ID (for HRIS sync - hard delete when removed from HRIS)
   */
  async deleteBySourceId(
    organizationId: string,
    sourceType: EmployeeSourceType,
    sourceId: string
  ): Promise<void> {
    const employee = await this.findBySourceId(organizationId, sourceType, sourceId);
    if (employee) {
      await this.delete(employee.id);
    }
  }

  /**
   * Get unique departments for an organization (for filtering UI)
   * Uses on-demand aggregation (small dataset, infrequent changes)
   */
  async getUniqueDepartments(organizationId: string): Promise<string[]> {
    const employees = await this.findByOrganization(organizationId);
    const departments = employees
      .map((e) => e.department)
      .filter((d): d is string => Boolean(d));
    return [...new Set(departments)].sort();
  }

  /**
   * Get unique roles for an organization (for filtering UI)
   * Uses on-demand aggregation (small dataset, infrequent changes)
   */
  async getUniqueRoles(organizationId: string): Promise<string[]> {
    const employees = await this.findByOrganization(organizationId);
    const roles = employees
      .map((e) => e.role)
      .filter((r): r is string => Boolean(r));
    return [...new Set(roles)].sort();
  }

  /**
   * Get employee count by employment status for an organization
   */
  async getCountByStatus(
    organizationId: string
  ): Promise<Record<EmploymentStatus, number>> {
    const employees = await this.findByOrganization(organizationId);
    const counts: Record<EmploymentStatus, number> = {
      fullTime: 0,
      partTime: 0,
      contractor: 0,
      inactive: 0,
    };

    for (const employee of employees) {
      counts[employee.employmentStatus]++;
    }

    return counts;
  }

  /**
   * Find multiple employees by emails (for bulk meeting attendee lookup)
   */
  async findByEmails(organizationId: string, emails: string[]): Promise<Employee[]> {
    if (emails.length === 0) return [];

    // Firestore 'in' queries are limited to 30 items
    const chunks: string[][] = [];
    const normalizedEmails = emails.map((e) => e.toLowerCase());

    for (let i = 0; i < normalizedEmails.length; i += 30) {
      chunks.push(normalizedEmails.slice(i, i + 30));
    }

    const results: Employee[] = [];
    for (const chunk of chunks) {
      const snapshot = await this.collection
        .where("organizationId", "==", organizationId)
        .where("email", "in", chunk)
        .get();
      results.push(...snapshot.docs.map((doc) => this.mapToEmployee(doc.id, doc.data())));
    }

    return results;
  }

  private mapToEmployee(id: string, data: FirebaseFirestore.DocumentData): Employee {
    return {
      id,
      organizationId: data.organizationId,
      name: data.name,
      email: data.email,
      role: data.role,
      department: data.department,
      hourlyRateCents: data.hourlyRateCents,
      employmentStatus: data.employmentStatus,
      sourceType: data.sourceType,
      sourceId: data.sourceId,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      lastSyncedAt: data.lastSyncedAt,
    };
  }
}

export const employeeRepository = new EmployeeRepository();
