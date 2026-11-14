import { Account, Book, Category, Transaction } from '../types';
import { resolveAccountName } from './balanceEngine';
import { formatFriendlyDate, formatFriendlyTime } from './dateUtils';

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3/files';

export interface LiveSyncResult {
  success: boolean;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  rowsSynced?: number;
  message: string;
}

/**
 * Searches user's Google Drive for existing monthly spreadsheet 'Expense_Report_YYYY_MM'.
 * If not found, creates it via Google Sheets API.
 */
export async function getOrCreateMonthlySpreadsheet(
  accessToken: string,
  year: number,
  month: number // 1-12
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const monthStr = String(month).padStart(2, '0');
  const title = `Expense_Report_${year}_${monthStr}`;

  // 1. Search Google Drive
  try {
    const query = encodeURIComponent(`name = '${title}' and trashed = false`);
    const searchRes = await fetch(
      `${DRIVE_API_BASE}?q=${query}&fields=files(id,name,webViewLink)`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        const file = data.files[0];
        return {
          spreadsheetId: file.id,
          spreadsheetUrl:
            file.webViewLink ||
            `https://docs.google.com/spreadsheets/d/${file.id}/edit`,
        };
      }
    }
  } catch (err) {
    console.warn('Drive search error, proceeding to create:', err);
  }

  // 2. File doesn't exist, create it with Sheets API
  const createRes = await fetch(SHEETS_API_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
      sheets: [
        {
          properties: {
            title: 'Transactions',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
        {
          properties: {
            title: 'Expense Dashboard',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    throw new Error(`Failed to create Google Sheet: ${errorText}`);
  }

  const newSheet = await createRes.json();
  return {
    spreadsheetId: newSheet.spreadsheetId,
    spreadsheetUrl:
      newSheet.spreadsheetUrl ||
      `https://docs.google.com/spreadsheets/d/${newSheet.spreadsheetId}/edit`,
  };
}

/**
 * Pushes all transactions for the target month to Tab 1 ("Transactions")
 * and computes formulas for Tab 2 ("Expense Dashboard").
 */
export async function pushTransactionsToGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  year: number,
  monthIndex: number, // 0-11
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[],
  books: Book[],
  currencySymbol: string
): Promise<LiveSyncResult> {
  const monthTxList = transactions.filter((tx) => {
    const txDate = new Date(tx.dateTime);
    return txDate.getFullYear() === year && txDate.getMonth() === monthIndex;
  });

  // Headers
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
      Number(tx.amount.toFixed(2)),
      tx.mode,
      sourceName,
      destName,
      book?.name || 'Personal',
      tx.skipBalanceUpdate ? 'TRUE' : 'FALSE',
      tx.remark || '',
    ];
  });

  // 1. Clear Tab 1 before full refresh
  try {
    await fetch(
      `${SHEETS_API_BASE}/${spreadsheetId}/values/Transactions!A1:Z1000:clear`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
  } catch (err) {
    console.warn('Could not clear Transactions sheet:', err);
  }

  // 2. Write Tab 1 ("Transactions")
  const txValues = [transactionHeaders, ...transactionRows];
  const writeTxRes = await fetch(
    `${SHEETS_API_BASE}/${spreadsheetId}/values/Transactions!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: 'Transactions!A1',
        majorDimension: 'ROWS',
        values: txValues,
      }),
    }
  );

  if (!writeTxRes.ok) {
    const errorText = await writeTxRes.text();
    throw new Error(`Failed to write Transactions: ${errorText}`);
  }

  // 3. Prepare Tab 2 ("Expense Dashboard") Formulas & Categories
  const uniqueCategories = Array.from(
    new Set(
      monthTxList
        .filter((t) => t.type === 'EXPENSE')
        .map((t) => {
          const cat = categories.find((c) => c.id === t.categoryId);
          return cat?.name || 'Other';
        })
    )
  );

  const dashboardValues = [
    ['Metric', 'Value', 'Formula / Note', '', 'Category', 'Expense Total', 'Share'],
    [
      'Total Monthly Income',
      '=SUMIFS(Transactions!G:G, Transactions!D:D, "INCOME")',
      'Evaluates all INCOME rows',
      '',
      uniqueCategories[0] || 'Food & Dining',
      uniqueCategories[0] ? `=SUMIFS(Transactions!G:G, Transactions!E:E, E2, Transactions!D:D, "EXPENSE")` : 0,
      uniqueCategories[0] ? `=IF($B$3>0, F2/$B$3, 0)` : '0%',
    ],
    [
      'Total Monthly Expenses',
      '=SUMIFS(Transactions!G:G, Transactions!D:D, "EXPENSE")',
      'Evaluates all EXPENSE rows',
      '',
      uniqueCategories[1] || 'Housing & Utilities',
      uniqueCategories[1] ? `=SUMIFS(Transactions!G:G, Transactions!E:E, E3, Transactions!D:D, "EXPENSE")` : 0,
      uniqueCategories[1] ? `=IF($B$3>0, F3/$B$3, 0)` : '0%',
    ],
    [
      'Net Monthly Savings',
      '=B2 - B3',
      'Income minus Expenses',
      '',
      uniqueCategories[2] || 'Transportation',
      uniqueCategories[2] ? `=SUMIFS(Transactions!G:G, Transactions!E:E, E4, Transactions!D:D, "EXPENSE")` : 0,
      uniqueCategories[2] ? `=IF($B$3>0, F4/$B$3, 0)` : '0%',
    ],
    [
      'Savings Rate',
      '=IF(B2>0, (B2-B3)/B2, 0)',
      'Savings divided by Income',
      '',
      uniqueCategories[3] || 'Shopping',
      uniqueCategories[3] ? `=SUMIFS(Transactions!G:G, Transactions!E:E, E5, Transactions!D:D, "EXPENSE")` : 0,
      uniqueCategories[3] ? `=IF($B$3>0, F5/$B$3, 0)` : '0%',
    ],
  ];

  // Append remaining categories if any
  for (let i = 4; i < uniqueCategories.length; i++) {
    const catName = uniqueCategories[i];
    const rowIdx = i + 2;
    dashboardValues.push([
      '',
      '',
      '',
      '',
      catName,
      `=SUMIFS(Transactions!G:G, Transactions!E:E, E${rowIdx}, Transactions!D:D, "EXPENSE")`,
      `=IF($B$3>0, F${rowIdx}/$B$3, 0)`,
    ]);
  }

  // 4. Write Tab 2 ("Expense Dashboard")
  await fetch(
    `${SHEETS_API_BASE}/${spreadsheetId}/values/'Expense Dashboard'!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: "'Expense Dashboard'!A1",
        majorDimension: 'ROWS',
        values: dashboardValues,
      }),
    }
  );

  return {
    success: true,
    spreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    rowsSynced: transactionRows.length,
    message: `Successfully synchronized ${transactionRows.length} transactions to Google Sheet.`,
  };
}
