// ============================================================================
// LAYOUT & CONFIG
// ============================================================================
export interface LayoutItem {
  i: string;      // widget_key
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  static?: boolean;
}

export interface GlobalFilters {
  startDate: string;   // YYYY-MM-DD
  endDate: string;     // YYYY-MM-DD
  warehouseId: number | null;
}

export interface WidgetDefinition {
  widget_key: string;
  display_name: string;
  description: string;
  required_permission: string | null;
  default_w: number;
  default_h: number;
  min_w: number;
  min_h: number;
}

export interface DashboardConfig {
  layout: LayoutItem[];
  savedFilters: GlobalFilters;
  widgetCatalog: WidgetDefinition[];
  source: 'user' | 'role_template' | 'default';
}

// ============================================================================
// WIDGET DATA SHAPES
// ============================================================================
export interface KPIData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  outstandingDebt: number;
  activeRentalsCount: number;
  revenueTrend: { date: string; revenue: number }[];
}

export interface SparklinePoint {
  date: string;
  rented: number;
  utilization: number;
}

export interface UtilizationData {
  sparklineData: SparklinePoint[];
  currentRate: number;
  totalOwned: number;
}

export interface ReturnItem {
  line_id: number;
  invoice_id: number;
  first_name: string;
  last_name: string;
  company_name: string | null;
  customer_type: 'Individual' | 'Business';
  phone_number: string;
  equipment_name: string;
  expected_return_date: string;
  borrow_quantity: number;
  days_overdue: number;
}

export interface ReturnsData {
  items: ReturnItem[];
  total: number;
  overdueCount: number;
}

export interface MaintenanceItem {
  log_id: number;
  defective_quantity: number;
  pending_quantity: number;
  repaired_quantity: number;
  repair_status: 'Pending Assignment' | 'In Repair' | 'Partially Resolved';
  reported_date: string;
  defect_description: string | null;
  equipment_name: string;
  serial_number: string;
  category_name: string;
  tech_first_name: string | null;
  tech_last_name: string | null;
}

export interface MaintenanceQueueData {
  items: MaintenanceItem[];
  total: number;
  pendingCount: number;
}

// ============================================================================
// TEMPLATES
// ============================================================================
export interface DashboardTemplate {
  template_id: number;
  template_name: string;
  role_id: number | null;
  layout_json: LayoutItem[];
  is_active: boolean;
  Role?: { role_id: number; role_name: string };
  Creator?: { user_id: number; first_name: string; last_name: string };
}
