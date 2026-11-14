import { Account, Book, Category, Transaction } from '../types';
import { resolveAccountName } from './balanceEngine';
import { formatFriendlyDate, formatFriendlyTime } from './dateUtils';

export interface GeneratedMonthlySheet {
  spreadsheetTitle: string;
  monthKey: string; // "2026-10"
  sheets: {
    transactionsTab: {
      title: string;
      headers: string[];
      rows: string[][];
    };
    dashboardTab: {
      title: string;
      kpis: { label: string; formula: string; evaluatedValue: string }[];
      categoryBreakdown: { category: string; amount: number; percentage: string }[];
      charts: { type: string; title: string; range: string }[];
    };
  };
}

/**
 * Builds the structure for a monthly Google Sheet file.
 */
export function buildMonthlyGoogleSheetData(
  monthDate: Date,
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[],
  books: Book[],
  currencySymbol: string
): GeneratedMonthlySheet {
  const year = monthDate.getFullYear();
  const month = String(monthDate.getMonth() + 1).padStart(2, '0');
  const monthKey = `${year}-${month}`;
  const spreadsheetTitle = `Expense_Report_${year}_${month}`;

  // Filter transactions belonging to this month
  const monthTxList = transactions.filter((tx) => {
    const txDate = new Date(tx.dateTime);
    return (
      txDate.getFullYear() === year &&
      txDate.getMonth() === monthDate.getMonth()
    );
  });

  // Tab 1: "Transactions"
  const transactionHeaders = [
    'Transaction ID',
    'Date',
    'Time',
    'Type',
    'Category',
    'Subcategory',
    'Amount',
    'Mode',
    'Account / Bank',
    'Destination Account',
    'Book',
    'Skip Balance',
    'Remarks',
  ];

  const transactionRows = monthTxList.map((tx) => {
    const category = categories.find((c) => c.id === tx.categoryId);
    const subcategory = category?.subcategories.find(
      (s) => s.id === tx.subcategoryId
    );
    const book = books.find((b) => b.id === tx.bookId);

    const sourceName = resolveAccountName(tx.sourceAccountId, accounts).name;
    const destName = tx.destinationAccountId
      ? resolveAccountName(tx.destinationAccountId, accounts).name
      : '-';

    return [
      tx.id,
      formatFriendlyDate(tx.dateTime),
      formatFriendlyTime(tx.dateTime),
      tx.type,
      category?.name || 'Uncategorised',
      subcategory?.name || 'General',
      `${currencySymbol}${tx.amount.toFixed(2)}`,
      tx.mode,
      sourceName,
      destName,
      book?.name || 'Personal',
      tx.skipBalanceUpdate ? 'TRUE' : 'FALSE',
      tx.remark || '',
    ];
  });

  // Tab 2: "Expense Dashboard"
  let totalIncome = 0;
  let totalExpense = 0;
  const categorySpendingMap: Record<string, number> = {};

  monthTxList.forEach((tx) => {
    if (tx.type === 'INCOME') {
      totalIncome += tx.amount;
    } else if (tx.type === 'EXPENSE') {
      totalExpense += tx.amount;
      const cat = categories.find((c) => c.id === tx.categoryId);
      const catName = cat?.name || 'Other';
      categorySpendingMap[catName] = (categorySpendingMap[catName] || 0) + tx.amount;
    }
  });

  const netSavings = totalIncome - totalExpense;

  const kpis = [
    {
      label: 'Total Monthly Income',
      formula: '=SUMIFS(Transactions!G:G, Transactions!D:D, "INCOME")',
      evaluatedValue: `${currencySymbol}${totalIncome.toLocaleString()}`,
    },
    {
      label: 'Total Monthly Expenses',
      formula: '=SUMIFS(Transactions!G:G, Transactions!D:D, "EXPENSE")',
      evaluatedValue: `${currencySymbol}${totalExpense.toLocaleString()}`,
    },
    {
      label: 'Net Monthly Savings',
      formula: '=B2 - B3',
      evaluatedValue: `${currencySymbol}${netSavings.toLocaleString()}`,
    },
    {
      label: 'Savings Rate',
      formula: '=IF(B2>0, (B2-B3)/B2, 0)',
      evaluatedValue: totalIncome > 0 ? `${Math.round((netSavings / totalIncome) * 100)}%` : '0%',
    },
  ];

  const categoryBreakdown = Object.entries(categorySpendingMap).map(
    ([category, amount]) => ({
      category,
      amount,
      percentage:
        totalExpense > 0
          ? `${Math.round((amount / totalExpense) * 100)}%`
          : '0%',
    })
  );

  const charts = [
    {
      type: 'DoughnutChart',
      title: 'Expense Distribution by Category',
      range: 'Expense Dashboard!D2:E10',
    },
    {
      type: 'ColumnChart',
      title: 'Daily Spending Trajectory',
      range: 'Transactions!B2:G100',
    },
  ];

  return {
    spreadsheetTitle,
    monthKey,
    sheets: {
      transactionsTab: {
        title: 'Transactions',
        headers: transactionHeaders,
        rows: transactionRows,
      },
      dashboardTab: {
        title: 'Expense Dashboard',
        kpis,
        categoryBreakdown,
        charts,
      },
    },
  };
}
