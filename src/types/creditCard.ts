export type CreditCardBrand =
  | "nubank" | "itau" | "inter" | "c6" | "bb" | "santander" | "caixa" | "picpay" | "outro";

export interface CreditCard {
  id: string;
  userId: string;
  brand: CreditCardBrand;
  nick: string;
  last4: string;
  limitCents: number;
  invoiceCents: number;
  closingDay: number;
  dueDay: number;
  bestDay: number;
  face?: string | null;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
}

export type CreateCreditCard = Omit<CreditCard, "id" | "userId" | "invoiceCents" | "createdAtUtc" | "updatedAtUtc">;

export interface CreditCardTransaction {
  id: string;
  creditCardId: string;
  title: string;
  category: string;
  amountCents: number;
  dateISO: string;
  type: "in" | "out";
}

export interface AddExpenseData {
  title: string;
  category: string;
  amountCents: number;
}
