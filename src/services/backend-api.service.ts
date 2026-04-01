import { Injectable, inject } from '@angular/core';
import { ApiClientService } from './api-client.service';

@Injectable({ providedIn: 'root' })
export class BackendApiService {
  private api = inject(ApiClientService);

  root() { return this.api.get<string>('/', { auth: false }); }
  healthLive() { return this.api.get<any>('/health/live', { auth: false }); }
  healthReady() { return this.api.get<any>('/health/ready', { auth: false }); }

  login(body: any) { return this.api.post<any>('/auth/login', body, { auth: false }); }
  refreshToken(body: { refreshToken: string }) { return this.api.post<any>('/auth/refresh-token', body, { auth: false }); }
  me() { return this.api.get<any>('/auth/me'); }
  logout() { return this.api.post('/auth/logout', {}); }
  logoutAll() { return this.api.post('/auth/logout-all', {}); }
  getSessions() { return this.api.get<any[]>('/auth/sessions'); }
  revokeSession(id: string) { return this.api.delete(`/auth/sessions/${id}`); }

  getUsers() { return this.api.get<any[]>('/users'); }
  getUser(id: string) { return this.api.get<any>(`/users/${id}`); }
  identifyOperatorByDni(body: { dni: string }) { return this.api.post<any>('/users/operator-identification', body); }
  createUser(body: any) { return this.api.post<any>('/users', body); }
  updateUser(id: string, body: any) { return this.api.put<any>(`/users/${id}`, body); }
  deleteUser(id: string) { return this.api.delete(`/users/${id}`); }
  assignUserArea(userId: string, body: any) { return this.api.post(`/users/${userId}/areas`, body); }
  unassignUserArea(userId: string, areaId: string) { return this.api.delete(`/users/${userId}/areas/${areaId}`); }

  getRoles() { return this.api.get<any[]>('/roles'); }
  getRole(id: string) { return this.api.get<any>(`/roles/${id}`); }
  createRole(body: any) { return this.api.post<any>('/roles', body); }
  updateRole(id: string, body: any) { return this.api.put<any>(`/roles/${id}`, body); }
  deleteRole(id: string) { return this.api.delete(`/roles/${id}`); }
  getPermissions() { return this.api.get<any[]>('/permissions'); }
  getPermission(id: string) { return this.api.get<any>(`/permissions/${id}`); }

  getAreas() { return this.api.get<any[]>('/areas'); }
  getArea(id: string) { return this.api.get<any>(`/areas/${id}`); }
  createArea(body: any) { return this.api.post<any>('/areas', body); }
  updateArea(id: string, body: any) { return this.api.put<any>(`/areas/${id}`, body); }
  deleteArea(id: string) { return this.api.delete(`/areas/${id}`); }

  getShifts() { return this.api.get<any[]>('/shifts'); }
  getShift(id: string) { return this.api.get<any>(`/shifts/${id}`); }
  createShift(body: any) { return this.api.post<any>('/shifts', body); }
  updateShift(id: string, body: any) { return this.api.put<any>(`/shifts/${id}`, body); }
  deleteShift(id: string) { return this.api.delete(`/shifts/${id}`); }

  getMachines() { return this.api.get<any[]>('/machines'); }
  getMachine(id: string) { return this.api.get<any>(`/machines/${id}`); }
  createMachine(body: any) { return this.api.post<any>('/machines', body); }
  updateMachine(id: string, body: any) { return this.api.put<any>(`/machines/${id}`, body); }
  deleteMachine(id: string) { return this.api.delete(`/machines/${id}`); }

  getSystemConfig() { return this.api.get<any>('/system-config'); }
  updateSystemConfig(body: any) { return this.api.put<any>('/system-config', body); }

  getWorkOrders(query?: any) { return this.api.get<any>('/work-orders', { query }); }
  getManagementWorkOrders() { return this.api.get<any[]>('/work-orders/management'); }
  getWorkOrder(id: string) { return this.api.get<any>(`/work-orders/${id}`); }
  createWorkOrder(body: any) { return this.api.post<any>('/work-orders', body); }
  bulkUpsertWorkOrders(body: any) { return this.api.post<any>('/work-orders/bulk-upsert', body); }
  updateWorkOrder(id: string, body: any) { return this.api.put<any>(`/work-orders/${id}`, body); }
  updateWorkOrderStatus(id: string, body: any) { return this.api.patch<any>(`/work-orders/${id}/status`, body); }
  enterWorkOrderManagement(id: string) { return this.api.post<any>(`/work-orders/${id}/management/enter`, {}); }
  exitWorkOrderManagement(id: string, body: any) { return this.api.post<any>(`/work-orders/${id}/management/exit`, body); }
  deleteWorkOrder(id: string) { return this.api.delete(`/work-orders/${id}`); }

  getPlanningSchedules(query: any) { return this.api.get<any[]>('/planning/schedules', { query }); }
  createPlanningSchedule(body: any) { return this.api.post<any>('/planning/schedules', body); }
  updatePlanningSchedule(id: string, body: any) { return this.api.put<any>(`/planning/schedules/${id}`, body); }
  deletePlanningSchedule(id: string) { return this.api.delete(`/planning/schedules/${id}`); }

  getClises(query?: any) { return this.api.get<any>('/inventory/clises', { query }); }
  getClise(id: string) { return this.api.get<any>(`/inventory/clises/${id}`); }
  createClise(body: any) { return this.api.post<any>('/inventory/clises', body); }
  bulkUpsertClises(body: any) { return this.api.post<any>('/inventory/clises/bulk-upsert', body); }
  updateClise(id: string, body: any) { return this.api.put<any>(`/inventory/clises/${id}`, body); }
  deleteClise(id: string) { return this.api.delete(`/inventory/clises/${id}`); }

  getDies(query?: any) { return this.api.get<any>('/inventory/dies', { query }); }
  getDie(id: string) { return this.api.get<any>(`/inventory/dies/${id}`); }
  createDie(body: any) { return this.api.post<any>('/inventory/dies', body); }
  bulkUpsertDies(body: any) { return this.api.post<any>('/inventory/dies/bulk-upsert', body); }
  updateDie(id: string, body: any) { return this.api.put<any>(`/inventory/dies/${id}`, body); }
  deleteDie(id: string) { return this.api.delete(`/inventory/dies/${id}`); }

  getRackConfigs() { return this.api.get<any[]>('/inventory/racks'); }
  getRackConfig(id: string) { return this.api.get<any>(`/inventory/racks/${id}`); }
  createRackConfig(body: any) { return this.api.post<any>('/inventory/racks', body); }
  updateRackConfig(id: string, body: any) { return this.api.put<any>(`/inventory/racks/${id}`, body); }
  deleteRackConfig(id: string) { return this.api.delete(`/inventory/racks/${id}`); }

  linkCliseDie(body: any) { return this.api.post<any>('/inventory/relations/clise-die', body); }
  unlinkCliseDie(cliseId: string, dieId: string) { return this.api.delete(`/inventory/relations/clise-die/${cliseId}/${dieId}`); }
  getCliseDies(id: string) { return this.api.get<any[]>(`/inventory/relations/clise/${id}/dies`); }
  getDieClises(id: string) { return this.api.get<any[]>(`/inventory/relations/die/${id}/clises`); }

  getStockItems(query?: any) { return this.api.get<any>('/inventory/stock', { query }); }
  getStockItem(id: string) { return this.api.get<any>(`/inventory/stock/${id}`); }
  createStockItem(body: any) { return this.api.post<any>('/inventory/stock', body); }
  bulkCreateStockItems(body: any) { return this.api.post<any>('/inventory/stock/bulk-create', body); }
  updateStockItem(id: string, body: any) { return this.api.put<any>(`/inventory/stock/${id}`, body); }
  updateStockStatus(id: string, body: any) { return this.api.patch<any>(`/inventory/stock/${id}/status`, body); }
  deleteStockItem(id: string) { return this.api.delete(`/inventory/stock/${id}`); }

  getIncidents(query?: any) { return this.api.get<any>('/quality/incidents', { query }); }
  getIncident(id: string) { return this.api.get<any>(`/quality/incidents/${id}`); }
  createIncident(body: any) { return this.api.post<any>('/quality/incidents', body); }
  updateIncidentStatus(id: string, body: any) { return this.api.patch<any>(`/quality/incidents/${id}/status`, body); }
  updateIncidentRootCause(id: string, body: any) { return this.api.patch<any>(`/quality/incidents/${id}/root-cause`, body); }
  addCapaAction(id: string, body: any) { return this.api.post<any>(`/quality/incidents/${id}/capa`, body); }
  completeCapaAction(id: string) { return this.api.patch<any>(`/quality/capa-actions/${id}/complete`, {}); }

  getPrintReports(query?: any) { return this.api.get<any>('/production/printing/reports', { query }); }
  getPrintReport(id: string) { return this.api.get<any>(`/production/printing/reports/${id}`); }
  createPrintReport(body: any) { return this.api.post<any>('/production/printing/reports', body); }
  updatePrintReportStatus(id: string, body: any) { return this.api.patch<any>(`/production/printing/reports/${id}/status`, body); }
  lockPrintReport(id: string) { return this.api.post<any>(`/production/printing/reports/${id}/lock`, {}); }
  unlockPrintReport(id: string) { return this.api.post<any>(`/production/printing/reports/${id}/unlock`, {}); }

  getDiecutReports(query?: any) { return this.api.get<any>('/production/diecutting/reports', { query }); }
  getDiecutReport(id: string) { return this.api.get<any>(`/production/diecutting/reports/${id}`); }
  createDiecutReport(body: any) { return this.api.post<any>('/production/diecutting/reports', body); }
  updateDiecutReportStatus(id: string, body: any) { return this.api.patch<any>(`/production/diecutting/reports/${id}/status`, body); }
  lockDiecutReport(id: string) { return this.api.post<any>(`/production/diecutting/reports/${id}/lock`, {}); }
  unlockDiecutReport(id: string) { return this.api.post<any>(`/production/diecutting/reports/${id}/unlock`, {}); }

  getRewindReports(query?: any) { return this.api.get<any>('/production/rewinding/reports', { query }); }
  getRewindReport(id: string) { return this.api.get<any>(`/production/rewinding/reports/${id}`); }
  createRewindReport(body: any) { return this.api.post<any>('/production/rewinding/reports', body); }

  getPackagingReports(query?: any) { return this.api.get<any>('/production/packaging/reports', { query }); }
  getPackagingReport(id: string) { return this.api.get<any>(`/production/packaging/reports/${id}`); }
  createPackagingReport(body: any) { return this.api.post<any>('/production/packaging/reports', body); }
  updatePackagingReport(id: string, body: any) { return this.api.put<any>(`/production/packaging/reports/${id}`, body); }

  getAnalyticsOee(query?: any) { return this.api.get<any>('/analytics/oee', { query }); }
  getAnalyticsWaste(query?: any) { return this.api.get<any>('/analytics/waste', { query }); }
  getAnalyticsDowntime(query?: any) { return this.api.get<any>('/analytics/downtime', { query }); }
  consolidateAnalytics(body: any) { return this.api.post<any>('/analytics/consolidate', body); }

  getAuditLogs(query?: any) { return this.api.get<any>('/audit/logs', { query }); }

  syncPull(query?: any) { return this.api.get<any>('/sync/pull', { query }); }
  getSyncStatus() { return this.api.get<any>('/sync/status'); }
  syncPush(body: any) { return this.api.post<any>('/sync/push', body); }

  createImport(body: any) { return this.api.post<any>('/imports', body); }
  getImport(id: string) { return this.api.get<any>(`/imports/${id}`); }
  confirmImport(id: string) { return this.api.post<any>(`/imports/${id}/confirm`, {}); }
  getImportResults(id: string) { return this.api.get<any>(`/imports/${id}/results`); }
  downloadImportErrors(id: string) { return this.api.get<any>(`/imports/${id}/errors/csv`); }
  getImportRows(id: string) { return this.api.get<any[]>(`/imports/${id}/rows`); }

  createStagingJob(body: any) { return this.api.post<any>('/staging/jobs', body); }
  getStagingJob(id: string) { return this.api.get<any>(`/staging/jobs/${id}`); }
  uploadStagingFile(id: string, formData: FormData) { return this.api.upload<any>(`/staging/jobs/${id}/upload`, formData); }

  requestExport(body: any) { return this.api.post<any>('/exports/request', body); }
  getExportStatus(jobId: string) { return this.api.get<any>(`/exports/status/${jobId}`); }

  uploadFile(formData: FormData) { return this.api.upload<any>('/files/upload', formData); }
  getFileMetadata(id: string) { return this.api.get<any>(`/files/${id}`); }
  downloadFile(id: string) { return this.api.download(`/files/${id}/download`); }
  deleteFile(id: string) { return this.api.delete(`/files/${id}`); }
}
