export const USERS = ['Amal', 'Vani'];

export const CURRENCIES = {
  GBP: { symbol: '£', name: 'British Pound', locale: 'en-GB' },
  INR: { symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
  EUR: { symbol: '€', name: 'Euro', locale: 'en-IE' },
};

export const DEFAULT_RATES = { GBP: 1, INR: 110, EUR: 1.16 }; // units per 1 GBP (editable in Settings)

export const EXPENSE_ICONS = {
  'Food & Dining': '🍽️',
  Groceries: '🛒',
  Transport: '🚌',
  Fuel: '⛽',
  'Bills & Utilities': '💡',
  'Rent / Mortgage': '🏠',
  Shopping: '🛍️',
  Health: '💊',
  Entertainment: '🎬',
  Travel: '✈️',
  Kids: '🧸',
  Education: '📚',
  Subscriptions: '🔁',
  'Family & Gifts': '🎁',
  'Fees & Charges': '🏦',
  Other: '✨',
};
export const DEFAULT_EXPENSE_CATS = Object.keys(EXPENSE_ICONS);

export const INCOME_ICONS = {
  Salary: '💼',
  Locum: '🩺',
  Bonus: '🎉',
  Gift: '🎁',
  Interest: '📈',
  Refund: '↩️',
  Rental: '🏘️',
  Other: '✨',
};
export const DEFAULT_INCOME_CATS = Object.keys(INCOME_ICONS);

export const ACCOUNT_TYPES = [
  { id: 'bank', label: 'Bank account', icon: '🏦' },
  { id: 'credit', label: 'Credit card', icon: '💳' },
  { id: 'cash', label: 'Cash', icon: '💷' },
  { id: 'wallet', label: 'Wallet / e-money', icon: '📱' },
];

export const INVEST_TYPES = [
  { id: 'savings', label: 'Savings account', icon: '🐖' },
  { id: 'fd', label: 'Fixed deposit', icon: '🔒' },
  { id: 'lic', label: 'LIC / Insurance', icon: '🛡️' },
  { id: 'lent', label: 'Lent money', icon: '🤝' },
  { id: 'mf', label: 'Mutual funds', icon: '📊' },
  { id: 'stocks', label: 'Stocks / ISA', icon: '📈' },
  { id: 'pension', label: 'Pension / PF', icon: '🏛️' },
  { id: 'gold', label: 'Gold', icon: '🪙' },
  { id: 'property', label: 'Property', icon: '🏡' },
  { id: 'other', label: 'Other', icon: '✨' },
];
