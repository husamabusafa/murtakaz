export type ActionValidationIssue = {
  path: (string | number)[];
  message: string;
  params?: Record<string, string | number>;
};

export type ActionResponse<T = unknown> =
  | ({ success: true; data?: T } & Record<string, unknown>)
  | ({ success: false; error: string; issues?: ActionValidationIssue[] } & Record<string, unknown>);
