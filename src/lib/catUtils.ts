export const CATS: Record<string, string> = {
  alimenta:"🍔", mercado:"🛒", transporte:"🚗", saude:"💊", saúde:"💊",
  lazer:"🎮", educa:"📚", moradia:"🏠", roupa:"👕", viagem:"✈️",
  salario:"💼", salário:"💼", investimento:"📈",
};

export function catIcon(cat: string): string {
  const k = cat.toLowerCase();
  for (const [key, icon] of Object.entries(CATS)) if (k.includes(key)) return icon;
  return "📦";
}
