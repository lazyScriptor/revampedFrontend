import { api } from "@/lib/api";

export type BulkJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "awaiting_confirmation";

export type BulkJobMode = "import" | "export" | "bulk_action" | "preview";

export interface BulkJob {
  job_id: number;
  user_id: number;
  operation: string;
  entity: string | null;
  mode: BulkJobMode;
  status: BulkJobStatus;
  progress: number;
  total_count: number | null;
  processed_count: number;
  error_count: number;
  params: any;
  result_payload: any;
  error_message: string | null;
  input_file_path: string | null;
  output_file_path: string | null;
  started_at: string | null;
  finished_at: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DownloadRow {
  job_id: number;
  operation: string;
  entity: string | null;
  file_size_bytes: number;
  created_at: string;
  finished_at: string | null;
  download_url: string;
}

const unwrap = (res: any) => res?.data ?? res;

export const listBulkJobs = async (params?: {
  status?: BulkJobStatus;
  entity?: string;
  mode?: BulkJobMode;
  page?: number;
  limit?: number;
}) => {
  const res = await api.get("/bulk-jobs", { params });
  return unwrap(res) as {
    jobs: BulkJob[];
    total: number;
    page: number;
    limit: number;
  };
};

export const getBulkJob = async (id: number) => {
  const res = await api.get(`/bulk-jobs/${id}`);
  return unwrap(res).job as BulkJob;
};

export const cancelBulkJob = async (id: number) => {
  const res = await api.post(`/bulk-jobs/${id}/cancel`);
  return unwrap(res).job as BulkJob;
};

export const createExportJob = async (
  entity: string,
  body: { format?: "xlsx" | "csv" | "pdf"; filters?: Record<string, any> } = {},
) => {
  const res = await api.post(`/bulk-jobs/export/${entity}`, body);
  return unwrap(res).job as BulkJob;
};

export const createImportJob = async (entity: string, file: File) => {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post(`/bulk-jobs/import/${entity}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return unwrap(res).job as BulkJob;
};

export const listDownloads = async () => {
  const res = await api.get("/bulk-jobs/downloads");
  return unwrap(res).downloads as DownloadRow[];
};

export const downloadJobUrl = (jobId: number) => {
  const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
  const base = apiUrl?.replace(/\/api\/?$/, "") || "";
  return `${base}/api/bulk-jobs/${jobId}/download`;
};
