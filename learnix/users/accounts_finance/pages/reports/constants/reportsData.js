export const REPORT_STATS = [
  { id: 'cashIn', label: 'Cash In (Month)', value: '₹38.6 L', icon: 'arrow-down-circle', color: '#059669' },
  { id: 'cashOut', label: 'Cash Out (Month)', value: '₹18.2 L', icon: 'arrow-up-circle', color: '#dc2626' },
  { id: 'netFlow', label: 'Net Cash Flow', value: '+₹20.4 L', icon: 'trending-up', color: '#2563eb' },
  { id: 'recovery', label: 'Fee Recovery', value: '91%', icon: 'checkmark-circle', color: '#0284c7' },
];

export const CASH_FLOW = [
  { id: 'CF1', month: 'Jul', inflow: 32, outflow: 18, color: '#2563eb' },
  { id: 'CF2', month: 'Aug', inflow: 38, outflow: 20, color: '#059669' },
  { id: 'CF3', month: 'Sep', inflow: 41, outflow: 19, color: '#d97706' },
  { id: 'CF4', month: 'Oct', inflow: 36, outflow: 22, color: '#0284c7' },
  { id: 'CF5', month: 'Nov', inflow: 44, outflow: 21, color: '#4f46e5' },
  { id: 'CF6', month: 'Dec', inflow: 39, outflow: 18, color: '#0891b2' },
];

export const REPORT_TYPES = [
  { id: 'RT1', name: 'Fee Collection Report', desc: 'Program-wise collections & recovery rates', icon: 'cash-outline', color: '#2563eb' },
  { id: 'RT2', name: 'Dues & Defaulters', desc: 'Outstanding dues by age and program', icon: 'alert-circle-outline', color: '#dc2626' },
  { id: 'RT3', name: 'Payroll Summary', desc: 'Monthly payroll, deductions & TDS', icon: 'card-outline', color: '#d97706' },
  { id: 'RT4', name: 'Expense Ledger', desc: 'All expenses & vendor payments', icon: 'receipt-outline', color: '#0284c7' },
  { id: 'RT5', name: 'Scholarship Disbursals', desc: 'Awards given & amounts disbursed', icon: 'school-outline', color: '#059669' },
  { id: 'RT6', name: 'Budget vs Actual', desc: 'Budget utilization per department', icon: 'pie-chart-outline', color: '#4f46e5' },
];