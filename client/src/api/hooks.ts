/**
 * Hook lấy dữ liệu dùng TanStack Query.
 * Mọi truy vấn tự gắn chi nhánh đang chọn (?branch=) và có queryKey riêng
 * theo chi nhánh để đổi chi nhánh là dữ liệu tải lại đúng.
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { api, type Params } from './client';
import { useAuth } from '../context/AuthContext';

/** Chu kỳ tự làm mới cho dữ liệu "thời gian thực" trên dashboard. */
export const LIVE_REFETCH_MS = 30_000;

export function useGet<T>(
  path: string | null,
  params?: Params,
  opts?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>,
) {
  const { branchId, user } = useAuth();
  return useQuery<T>({
    queryKey: [path, params ?? {}, branchId],
    queryFn: () => api.get<T>(path!, { ...params, branch: branchId }),
    enabled: !!path && !!user,
    // Giữ dữ liệu cũ khi đổi bộ lọc -> không nháy skeleton, không nhảy layout
    placeholderData: keepPreviousData,
    ...opts,
  });
}

/** Mutation + tự làm mới các truy vấn liên quan sau khi thành công. */
export function useApiMutation<TBody, TRes = unknown>(
  fn: (body: TBody) => Promise<TRes>,
  invalidate: string[] = [],
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      for (const prefix of invalidate) {
        qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === 'string' && (q.queryKey[0] as string).startsWith(prefix) });
      }
    },
  });
}
