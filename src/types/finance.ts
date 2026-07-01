export type BankAccount = {
  id: string;
  userId: string;
  nick: string;
  bank: string;
  accountType: string;
  last4: string;
  balanceCents: number;
  face?: string | null;
};

export type FinanceCategoryOption = {
  id: string;
  type: "RECEITA" | "DESPESA";
  name: string;
  icon: string;
  color: string;
  parentId?: string | null;
  level?: number;
  fullPath?: string;
};

export type FinanceItem = {
  id: string;
  type: "RECEITA" | "DESPESA";
  title: string;
  category: string;
  amountCents: number;
  dateISO: string;
  paymentType: string;
  status: string;
  accountId?: string;
  note?: string;
  tags?: string;
  recurringGroupId?: string;
  recurringKind?: string;
  recurringTotal?: number;
  recurringStartDate?: string;
  ignoreInReports?: boolean;
};
