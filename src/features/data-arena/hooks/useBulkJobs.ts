import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  listBulkJobs,
  getBulkJob,
  cancelBulkJob,
  createExportJob,
  createImportJob,
  listDownloads,
  BulkJobMode,
  BulkJobStatus,
} from "../api/bulkJobs.api";
import { getSocket } from "@/lib/socket";

export const useBulkJobsList = (filters?: {
  status?: BulkJobStatus;
  entity?: string;
  mode?: BulkJobMode;
  page?: number;
  limit?: number;
}) => {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["bulk-jobs", filters],
    queryFn: () => listBulkJobs(filters),
    placeholderData: keepPreviousData,
    refetchInterval: (q) => {
      // Auto-refresh while any job in the snapshot is still in-flight.
      const data: any = q.state.data;
      if (!data?.jobs) return false;
      const live = data.jobs.some(
        (j: any) => j.status === "queued" || j.status === "processing",
      );
      return live ? 3000 : false;
    },
  });

  // Invalidate cache when socket says a job moved.
  useEffect(() => {
    const socket = getSocket();
    const onChange = () => qc.invalidateQueries({ queryKey: ["bulk-jobs"] });
    socket.on("bulkJob:update", onChange);
    socket.on("bulkJob:complete", onChange);
    return () => {
      socket.off("bulkJob:update", onChange);
      socket.off("bulkJob:complete", onChange);
    };
  }, [qc]);

  return query;
};

export const useBulkJob = (id: number | null) =>
  useQuery({
    queryKey: ["bulk-job", id],
    queryFn: () => getBulkJob(id as number),
    enabled: id != null,
  });

export const useCancelJob = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => cancelBulkJob(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bulk-jobs"] }),
  });
};

export const useStartExport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      entity,
      format,
      filters,
    }: {
      entity: string;
      format?: "xlsx" | "csv" | "pdf";
      filters?: Record<string, any>;
    }) => createExportJob(entity, { format, filters }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bulk-jobs"] });
      qc.invalidateQueries({ queryKey: ["downloads"] });
    },
  });
};

export const useStartImport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entity, file }: { entity: string; file: File }) =>
      createImportJob(entity, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bulk-jobs"] }),
  });
};

export const useDownloads = () => {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["downloads"],
    queryFn: () => listDownloads(),
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    const socket = getSocket();
    const onChange = () => qc.invalidateQueries({ queryKey: ["downloads"] });
    socket.on("bulkJob:complete", onChange);
    return () => {
      socket.off("bulkJob:complete", onChange);
    };
  }, [qc]);

  return query;
};
