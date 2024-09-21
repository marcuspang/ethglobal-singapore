import { toast } from "@/components/ui/use-toast";
import { Balance, BalancesKey, TokenId } from "@proto-kit/library";
import { PendingTransaction } from "@proto-kit/sequencer";
import { useMutation } from "@tanstack/react-query";
import { PublicKey } from "o1js";
import { useEffect } from "react";
import { create } from "zustand";
import { useChainStore } from "./chain";
import { Client, useClientStore } from "./client";
import { useWalletStore } from "./wallet";
import { isPendingTransaction } from "../utils";
import { persist } from "zustand/middleware";

export interface BalancesState {
  loading: boolean;
  balances: Record<string, string>; // TokenId - balance
  lastTokenId: string;
  loadBalance: (
    client: Client,
    tokenId: TokenId,
    address: string,
  ) => Promise<void>;
  loadAllBalances: (client: Client, address: string) => Promise<void>;
  addBalance: (
    client: Client,
    tokenId: TokenId,
    sender: PublicKey,
    amount: Balance,
  ) => Promise<PendingTransaction>;
}

export const useBalancesStore = create<BalancesState>()(
  persist(
    (set, get) => ({
      loading: Boolean(false),
      balances: {},
      totalSupply: {},
      lastTokenId: TokenId.from(1).toString(),
      async loadBalance(client: Client, tokenId: TokenId, address: string) {
        set((state) => {
          state.loading = true;
          return state;
        });

        const key = BalancesKey.from(tokenId, PublicKey.fromBase58(address));
        const balance = await client.query.runtime.Balances.balances.get(key);

        set((state) => {
          state.loading = false;
          state.balances[tokenId.toString()] = balance?.toString() ?? "0";
          return state;
        });
      },
      async loadAllBalances(client: Client, address: string) {
        set((state) => {
          state.loading = true;
          return state;
        });
        const lastTokenId =
          (await client.query.runtime.TokenRegistry.lastTokenIdId.get()) ??
          TokenId.from(1);
        const lastTokenIdNumber = +lastTokenId.toString();

        const balances: Record<string, string> = {};
        for (let i = 0; i < lastTokenIdNumber; i++) {
          // const tokenId = await client.query.runtime.TokenRegistry.tokenIds.get(
          //   TokenIdId.from(i),
          // );
          const tokenId = TokenId.from(i);
          const key = BalancesKey.from(tokenId, PublicKey.fromBase58(address));
          const balance = await client.query.runtime.Balances.balances.get(key);
          if (balance !== undefined) {
            balances[tokenId.toString()] = balance.toString();
          }
        }
        set((state) => {
          state.balances = balances;
          state.lastTokenId = lastTokenId.toString();
          return state;
        });
      },
      async addBalance(
        client: Client,
        tokenId: TokenId,
        sender: PublicKey,
        amount: Balance,
      ) {
        const balances = client.runtime.resolve("Balances");

        const tx = await client.transaction(sender, async () => {
          await balances.addBalance(tokenId, sender, amount);
        });

        await tx.sign();
        await tx.send();

        isPendingTransaction(tx.transaction);
        return tx.transaction;
      },
    }),
    {
      name: "balances",
    },
  ),
);

export const useAddBalance = () => {
  const client = useClientStore();
  const balances = useBalancesStore();
  const wallet = useWalletStore();

  return useMutation({
    mutationFn: async ({
      tokenId,
      amount,
    }: {
      tokenId: TokenId;
      amount: Balance;
    }) => {
      if (!client.client || !wallet.wallet) return;

      const pendingTransaction = await balances.addBalance(
        client.client,
        tokenId,
        PublicKey.fromBase58(wallet.wallet),
        amount,
      );

      wallet.addPendingTransaction(pendingTransaction);
      return pendingTransaction;
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useLoadAllBalances = () => {
  const client = useClientStore();
  const balances = useBalancesStore();
  const wallet = useWalletStore();
  const chain = useChainStore();

  useEffect(() => {
    if (!client.client || !wallet.wallet) return;

    if (chain.block?.height) {
      balances.loadAllBalances(client.client, wallet.wallet);
    }
  }, [chain.block?.height]);
};
