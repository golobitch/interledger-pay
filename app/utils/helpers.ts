import { type Amount } from "~/lib/open-payments.server";

export const getCurrencySymbol = (assetCode: string): string => {
  return new Intl.NumberFormat("en-US", {
    currency: assetCode,
    style: "currency",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  })
    .format(0)
    .replace(/0/g, "")
    .trim();
};

type FormatDateArgs = {
  date: string;
  time?: boolean;
  month?: Intl.DateTimeFormatOptions["month"];
};
export const formatDate = ({
  date,
  time = true,
  month = "short",
}: FormatDateArgs): string => {
  return new Date(date).toLocaleDateString("default", {
    day: "2-digit",
    month,
    year: "numeric",
    ...(time && { hour: "2-digit", minute: "2-digit" }),
  });
};

export type FormattedAmount = {
  amount: number;
  amountWithCurrency: string;
  symbol: string;
};

type FormatAmountArgs = Amount & {
  value: string;
};

export const formatAmount = (args: FormatAmountArgs): FormattedAmount => {
  const { value, assetCode, assetScale } = args;
  const formatterWithCurrency = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: assetCode,
    maximumFractionDigits: assetScale,
    minimumFractionDigits: assetScale,
  });
  const formatter = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: assetScale,
    minimumFractionDigits: assetScale,
  });

  const amount = Number(formatter.format(Number(`${value}e-${assetScale}`)));
  const amountWithCurrency = formatterWithCurrency.format(
    Number(`${value}e-${assetScale}`)
  );
  const symbol = getCurrencySymbol(assetCode);

  return {
    amount,
    amountWithCurrency,
    symbol,
  };
};
