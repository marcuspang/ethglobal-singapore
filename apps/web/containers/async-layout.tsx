import Header from "@/components/header";
import { Toaster } from "@/components/ui/sonner";
import { useChainStore, usePollBlockHeight } from "@/lib/stores/chain";
import { useClientStore } from "@/lib/stores/client";
import { useNotifyTransactions, useWalletStore } from "@/lib/stores/wallet";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useEffect } from "react";
import { toast } from "sonner";
const queryClient = new QueryClient();

export default function AsyncLayout({ children }: { children: ReactNode }) {
  const wallet = useWalletStore();
  const client = useClientStore();
  const chain = useChainStore();

  usePollBlockHeight();
  useNotifyTransactions();

  useEffect(() => {
    client.start();
  }, []);

  useEffect(() => {
    wallet.initializeWallet();
    wallet.observeWalletChange();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Header
        loading={client.loading}
        wallet={wallet.wallet}
        onConnectWallet={wallet.connectWallet}
        onCopyToClipboard={() => {
          navigator.clipboard.writeText(wallet.wallet ?? "");
          toast.info("Copied to clipboard", {
            description:
              "Your wallet address has been copied to your clipboard",
          });
        }}
        blockHeight={chain.block?.height ?? "-"}
      />
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
