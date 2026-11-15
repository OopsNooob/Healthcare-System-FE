import {
  normalizePaginatedList,
  webAdminApi,
  type BlacklistKeywordsCheckContentRequest,
  type PaginatedResult,
} from "@/lib/api";

export interface ApiKeywordReceiver {
  id: string;
  keyword: string;
  createdAt?: string;
}

export interface ApiKeywordList {
  keywordList: ApiKeywordReceiver[];
  total: number;
  page: number;
  totalPages: number;
}

type RawKeyword = Record<string, unknown>;

function mapKeyword(obj: RawKeyword): ApiKeywordReceiver | null {
  const id =
    typeof obj._id === "string"
      ? obj._id
      : typeof obj.id === "string"
        ? obj.id
        : "";
  const keyword = typeof obj.keyword === "string" ? obj.keyword : "";
  if (!id || !keyword) return null;
  return {
    id,
    keyword,
    createdAt: typeof obj.createdAt === "string" ? obj.createdAt : undefined,
  };
}

export async function getKeywordList(params: {
  page?: number;
  limit?: number;
  search?: string;
} = {}): Promise<ApiKeywordList> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 100;
  const raw = await webAdminApi.blacklistKeywordsGetAll({
    query: {
      page,
      limit,
      search: params.search?.trim() || undefined,
      sortBy: "createdAt",
      sortOrder: -1,
    },
  });

  const normalized: PaginatedResult<RawKeyword> = normalizePaginatedList<RawKeyword>(
    raw,
    page,
    limit,
  );
  const keywordList = normalized.items
    .map(mapKeyword)
    .filter((item): item is ApiKeywordReceiver => item !== null);

  return {
    keywordList,
    total: normalized.total,
    page: normalized.page,
    totalPages: normalized.totalPages,
  };
}

export async function getKeywordById(id: string) {
  return webAdminApi.blacklistKeywordsGetKeyword({ params: { id } });
}

export async function addKeyword(newKeyword: string) {
  return webAdminApi.blacklistKeywordsCreate({ keyword: newKeyword });
}

export async function updateKeyword(id: string, newKeyword: string) {
  return webAdminApi.blacklistKeywordsUpdateKeyword({
    params: { id },
    body: { keyword: newKeyword },
  });
}

export async function deleteKeyword(id: string) {
  return webAdminApi.blacklistKeywordsDeleteKeyword({ params: { id } });
}

export async function checkBlacklistContent(content: string) {
  return webAdminApi.blacklistKeywordsCheckContent({
    body: { content },
  } as unknown as BlacklistKeywordsCheckContentRequest);
}
