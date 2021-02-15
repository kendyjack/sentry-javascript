import { Severity } from './severity';

export interface Breadcrumb {
  type?: string;
  level?: Severity;
  event_id?: string;
  category?: string;
  message?: string;
  data?: { [key: string]: any };
  timestamp?: number;
}

export interface BreadcrumbHint {
  [key: string]: any;
}
