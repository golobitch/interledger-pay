import { Button } from "~/components/ui/button";
import { DialPad } from "~/components/dialpad";
import { Header } from "~/components/header";
import { Link, useLoaderData } from "@remix-run/react";
import { useDialPadContext } from "~/lib/context/dialpad";
import { BackNav } from "~/components/icons";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { getSession } from "~/session";
import { useEffect } from "react";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const walletAddressInfo = session.get("wallet-address");

  if (walletAddressInfo === undefined) {
    throw new Error("Payment session expired.");
  }
  return json({
    assetCode: walletAddressInfo.walletAddress.assetCode,
  } as const);
}

export default function Ilpay() {
  const data = useLoaderData<typeof loader>();
  const { amountValue, setAssetCode } = useDialPadContext();

  useEffect(() => {
    setAssetCode(data.assetCode);
  });

  return (
    <>
      <Header />
      <Link to="/" className="flex gap-2 items-center justify-end">
        <BackNav />
        <span className="hover:text-green-1">Home</span>
      </Link>
      <div className="flex justify-center items-center flex-col h-full px-5">
        <div className="h-2/3 items-center justify-center flex flex-col gap-10 w-full max-w-sm">
          <DialPad />
          <div className="flex gap-2">
            <Link to={`/request`}>
              <Button
                aria-label="request"
                variant="outline"
                size="sm"
                disabled={Number(amountValue) === 0}
              >
                Request
              </Button>
            </Link>
            <Link to={`/pay`}>
              <Button
                aria-label="pay"
                size={"sm"}
                disabled={Number(amountValue) === 0}
              >
                Pay
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
