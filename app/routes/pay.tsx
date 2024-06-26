import { conform, useForm } from "@conform-to/react";
import { getFieldsetConstraint, parse } from "@conform-to/zod";
import { type WalletAddress } from "@interledger/open-payments";
import { json, redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData } from "@remix-run/react";
import { z } from "zod";
import { AmountDisplay } from "~/components/dialpad";
import { Header } from "~/components/header";
import { BackNav } from "~/components/icons";
import { Button } from "~/components/ui/button";
import { Field } from "~/components/ui/form/form";
import { useDialogContext } from "~/lib/context/dialog";
import { useDialPadContext } from "~/lib/context/dialpad";
import { fetchQuote } from "~/lib/open-payments.server";
import { getValidWalletAddress } from "~/lib/validators.server";
import { commitSession, getSession } from "~/session";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const walletAddressInfo = session.get("wallet-address");

  if (walletAddressInfo === undefined) {
    throw new Error("Payment session expired.");
  }

  return json({
    walletAddress: walletAddressInfo.walletAddress.id,
  } as const);
}

const schema = z.object({
  walletAddress: z.string(),
  receiver: z
    .string()
    .transform((val) => val.replace("$", "https://"))
    .pipe(z.string().url({ message: "Invalid wallet address." })),
  amount: z.coerce.number(),
  note: z.string().optional(),
});

export default function Pay() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const { amountValue } = useDialPadContext();
  const { setOpen } = useDialogContext();
  const [form, fields] = useForm({
    id: "pay-form",
    constraint: getFieldsetConstraint(schema),
    lastSubmission: actionData,
    shouldRevalidate: "onSubmit",
  });

  return (
    <>
      <Header />
      <Link to="/ilpay" className="flex gap-2 items-center justify-end">
        <BackNav />
        <span className="hover:text-green-1">Amount</span>
      </Link>
      <div className="flex h-full flex-col justify-center gap-10">
        <AmountDisplay />
        <div className="mx-auto w-full max-w-sm">
          <Form method="POST" {...form.props}>
            <div className="flex flex-col gap-4">
              <Field
                type="text"
                label="Pay from"
                variant="highlight"
                {...conform.input(fields.walletAddress)}
                value={data.walletAddress}
                readOnly
              />
              <Field
                label="Pay into"
                placeholder="Enter receiver wallet address"
                autoFocus={true}
                {...conform.input(fields.receiver)}
                errors={fields.receiver.errors}
              />
              <Field
                label="Payment note"
                placeholder="Note"
                {...conform.input(fields.note)}
                errors={fields.note.errors}
              />
              <input
                type="hidden"
                {...conform.input(fields.amount)}
                value={Number(amountValue)}
              />
              <Button
                aria-label="pay"
                type="submit"
                size="xl"
                onClick={() => setOpen(true)}
              >
                Pay with Interledger Pay
              </Button>
            </div>
          </Form>
        </div>
      </div>
    </>
  );
}

export async function action({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));

  let receiver = {} as WalletAddress;

  const formData = await request.formData();
  const submission = await parse(formData, {
    schema: schema.superRefine(async (data, context) => {
      try {
        receiver = await getValidWalletAddress(data.receiver);
      } catch (error) {
        context.addIssue({
          path: ["receiver"],
          code: z.ZodIssueCode.custom,
          message: "Receiver wallet address is not valid.",
        });
      }
    }),
    async: true,
  });

  if (!submission.value || submission.intent !== "submit") {
    return json(submission);
  }

  const quote = await fetchQuote(submission.value, receiver);
  session.set("quote", quote);

  return redirect(`/quote`, {
    headers: { "Set-Cookie": await commitSession(session) },
  });
}
