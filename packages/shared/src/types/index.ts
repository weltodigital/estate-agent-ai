export type Uuid = string;
export type IsoDateString = string;

export type ApiError = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
