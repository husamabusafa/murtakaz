export type ActionValidationIssue = {
  path: (string | number)[];
  message: string;
  params?: Record<string, string | number>;
};

export type ActionResponse<T = any> = 
  | { success: true; data?: T; [key: string]: any }
  | { success: false; error: string; issues?: ActionValidationIssue[]; [key: string]: any };
