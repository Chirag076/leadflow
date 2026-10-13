"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { api } from "./api";
import type { LeadDetail, LeadFilters, LeadList, LeadStatus, LeadSummary, NewDiscussion, NewLead } from "./types";

export const leadKeys = {
  all: ["leads"] as const,
  lists: () => [...leadKeys.all, "list"] as const,
  list: (filters: LeadFilters) => [...leadKeys.lists(), filters] as const,
  detail: (id: number) => [...leadKeys.all, "detail", id] as const,
};

/** Swap one lead's summary into every cached list, so the list changes the moment the API answers. */
function patchLists(client: QueryClient, summary: Partial<LeadSummary> & { id: number }) {
  client.setQueriesData<LeadList>({ queryKey: leadKeys.lists() }, (list) =>
    list && { ...list, items: list.items.map((item) => (item.id === summary.id ? { ...item, ...summary } : item)) },
  );
}

export function useLeads(filters: LeadFilters) {
  return useQuery({
    queryKey: leadKeys.list(filters),
    queryFn: () => api.listLeads(filters),
    placeholderData: keepPreviousData, // keep showing the old list while a new filter loads
  });
}

export function useLead(id: number | null) {
  return useQuery({
    queryKey: leadKeys.detail(id ?? -1),
    queryFn: () => api.getLead(id!),
    enabled: id !== null,
  });
}

export function useCreateLead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: NewLead) => api.createLead(data),
    onSuccess: async (lead) => {
      client.setQueryData(leadKeys.detail(lead.id), lead);
      // Wait for the refetch so the dialog closes onto a list that already has the new lead.
      await client.invalidateQueries({ queryKey: leadKeys.lists() });
    },
  });
}

export function useAddDiscussion(leadId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: NewDiscussion) => api.addDiscussion(leadId, data),
    onSuccess: ({ discussion, lead }) => {
      client.setQueryData<LeadDetail>(leadKeys.detail(leadId), (detail) =>
        detail && { ...detail, ...lead, discussions: [discussion, ...detail.discussions] },
      );
      patchLists(client, lead);
      void client.invalidateQueries({ queryKey: leadKeys.lists() }); // re-sort by activity
    },
  });
}

export function useUpdateStatus(leadId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (status: LeadStatus) => api.updateLead(leadId, { status }),
    // Optimistic: the badge changes on click and rolls back if the API refuses.
    onMutate: async (status) => {
      await client.cancelQueries({ queryKey: leadKeys.all });
      const previousDetail = client.getQueryData<LeadDetail>(leadKeys.detail(leadId));
      const previousLists = client.getQueriesData<LeadList>({ queryKey: leadKeys.lists() });
      client.setQueryData<LeadDetail>(leadKeys.detail(leadId), (detail) => detail && { ...detail, status });
      patchLists(client, { id: leadId, status });
      return { previousDetail, previousLists };
    },
    onError: (_error, _status, context) => {
      if (!context) return;
      client.setQueryData(leadKeys.detail(leadId), context.previousDetail);
      for (const [key, list] of context.previousLists) client.setQueryData(key, list);
    },
    onSuccess: (detail) => client.setQueryData(leadKeys.detail(leadId), detail),
    onSettled: () => client.invalidateQueries({ queryKey: leadKeys.lists() }), // counts per status
  });
}
